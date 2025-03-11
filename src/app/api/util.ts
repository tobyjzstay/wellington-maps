"use server";

import JSZip from "jszip";
import cache from "memory-cache";
import { promisify } from "util";
import zlib from "zlib";
import { getKey, getTimestamp } from "../util";
import { Agency } from "./agency/route";
import { Calendar } from "./calendar/route";
import { CalendarDate } from "./calendar_dates/route";
import { FeedInfo } from "./feed_info/route";
import { Route } from "./routes/route";
import { Shape } from "./shapes/route";
import { StopTime } from "./stop_times/route";
import { Stop } from "./stops/route";
import { Transfer } from "./transfers/route";
import { Trip } from "./trips/route";

const gzip = promisify(zlib.gzip);

export type Full = {
  agency: Agency[];
  calendar: Calendar[];
  calendar_dates: CalendarDate[];
  feed_info: FeedInfo[];
  routes: Route[];
  shapes: Shape[];
  stop_pattern_trips: any[];
  stop_patterns: any[];
  stop_times: StopTime[];
  stops: Stop[];
  transfers: Transfer[];
  trips: Trip[];
};

const key = "full";
const path = "https://static.opendata.metlink.org.nz/v1/gtfs/full.zip";

let pending: Promise<Full> | null = null;

export async function getMetlinkFullData(
  fullDataKey: keyof Full
): Promise<Buffer> {
  if (pending) {
    await pending;
    return cache.get(fullDataKey);
  }

  pending = (async () => {
    const method = "GET";
    const response = await fetch(path, {
      cache: "no-cache",
      method,
    });
    console.info(getTimestamp(), method, response.status, path);

    const buffer = await response.arrayBuffer();
    const bufferCopy = new Uint8Array(buffer.slice(0));
    cache.put(key, bufferCopy, 86400000);

    const zip = new JSZip();
    await zip.loadAsync(buffer);
    const fullData = Object.create(null);
    const files = zip.file(/\.txt$/);
    for (const file of files) {
      const text = await file.async("text");
      let fileName = file.name.slice(0, ".txt".length * -1);
      let headers: (string | null)[] | null = null;
      const fileData: Full[] = [];
      for (const line of text.split("\n")) {
        if (headers === null) {
          headers = line.split(",").map((header) => header.trim());
          continue;
        }
        const datum = Object.create(null);
        const values = parseCsvLine(line);
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          if (!header) continue;
          let value: any = values[i];
          switch (fileName) {
            case "agency":
              switch (header as keyof Agency) {
                case "agency_url":
                case "agency_fare_url":
                  value = parseUrl(value);
                  break;
                default:
                  break;
              }
              break;
            case "calendar":
              switch (header as keyof Calendar) {
                case "monday":
                case "tuesday":
                case "wednesday":
                case "thursday":
                case "friday":
                case "saturday":
                case "sunday":
                  value = parseInt(value);
                  break;
                case "start_date":
                case "end_date":
                  value = parseDate(value);
                  break;
                default:
                  break;
              }
              break;
            case "calendar_dates":
              switch (header as keyof CalendarDate) {
                case "date":
                  value = parseDate(value);
                  break;
                case "exception_type":
                  value = parseInt(value);
                default:
                  break;
              }
              break;
            case "feed_info":
              switch (header as keyof FeedInfo) {
                case "feed_publisher_url":
                  value = parseUrl(value);
                  break;
                case "feed_start_date":
                case "feed_end_date":
                  value = parseDate(value);
                  break;
                default:
                  break;
              }
              break;
            case "routes":
              switch (header as keyof Route) {
                case "route_type":
                case "route_sort_order":
                  value = parseInt(value);
                  break;
                case "route_url":
                  value = parseUrl(value);
                  break;
                default:
                  break;
              }
              break;
            case "shapes":
              switch (header as keyof Shape) {
                case "shape_pt_lat":
                case "shape_pt_lon":
                case "shape_dist_traveled":
                  value = parseFloat(value);
                  break;
                case "shape_pt_sequence":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            case "stop_times":
              switch (header as keyof StopTime) {
                case "stop_sequence":
                case "pickup_type":
                case "drop_off_type":
                case "timepoint":
                  value = parseInt(value);
                  break;
                case "shape_dist_traveled":
                  value = parseFloat(value);
                  break;
                default:
                  break;
              }
              break;
            case "stops":
              switch (header as keyof Stop) {
                case "stop_lat":
                case "stop_lon":
                  value = parseFloat(value);
                  break;
                case "stop_url":
                  value = parseUrl(value);
                  break;
                case "location_type":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            case "transfers":
              switch (header as keyof Transfer) {
                case "transfer_type":
                  value = parseInt(value);
                  break;
                case "min_transfer_time":
                  value = parseInt(value);
                default:
                  break;
              }
              break;
            case "trips":
              switch (header as keyof Trip) {
                case "direction_id":
                case "wheelchair_accessible":
                case "bikes_allowed":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            default:
              break;
          }
          datum[header] = value;
        }
        fileData.push(datum);
      }
      fullData[fileName] = fileData;
      const body = JSON.stringify(fileData);
      const compressed = await gzip(body);
      cache.put(fileName, compressed, 86400000);
    }
    return fullData as Full;
  })();

  await pending;
  return cache.get(fullDataKey);
}

export async function getMetlinkData(request: Request) {
  const key = getKey(request.url) as keyof Full;
  let data = cache.get(key) || (await getMetlinkFullData(key));
  const _response = response(data);
  console.info(getTimestamp(), request.method, _response.status, request.url);
  return _response;
}

const response = (body: BodyInit) =>
  new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
    },
  });

export async function fetchMetlinkData(path: string) {
  if (!process.env.METLINK_API_KEY) {
    console.error(getTimestamp(), "No Metlink API key provided.");
    return new Response(null, { status: 500 });
  }

  const method = "GET";
  const response = await fetch(path, {
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.METLINK_API_KEY,
    },
    method,
  });
  console.info(getTimestamp(), method, response.status, path);

  return response;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        currentField += '"';
        i++;
      } else insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(currentField.trim());
      currentField = "";
    } else currentField += char;
  }

  result.push(currentField.trim());

  return result;
}

function parseUrl(urlString: string) {
  if (!urlString) return undefined;
  try {
    return new URL(urlString);
  } catch (error) {
    console.warn(getTimestamp(), "Failed to parse URL.", error);
    return undefined;
  }
}

function parseDate(dateString: string) {
  if (!dateString) return undefined;
  try {
    const year = parseInt(dateString.slice(0, 4), 10);
    const month = parseInt(dateString.slice(4, 6), 10) - 1;
    const day = parseInt(dateString.slice(6, 8), 10);

    return new Date(year, month, day);
  } catch (error) {
    console.warn(getTimestamp(), "Failed to parse date.", error);
    return undefined;
  }
}
