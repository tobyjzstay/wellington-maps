"use server";

import JSZip from "jszip";
import cache from "memory-cache";
import { promisify } from "util";
import zlib from "zlib";
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
    const files = zip.file(/\.txt$/);
    const fullData = Object.create(null);
    for (const file of files) {
      const text = await file.async("text");
      let headers: string[] | null = null;
      let dataKey = file.name.slice(0, ".txt".length * -1) as keyof Full;
      const data: Full[typeof dataKey] = [];
      for (const line of text.split("\n")) {
        if (headers === null) {
          headers = line.split(",");
          continue;
        }
        const datum = Object.create(null);
        const values = line.split(",");
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          let value: any = values[i];
          switch (dataKey) {
            case "agency":
              switch (header) {
                case "id":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            case "calendar":
              switch (header) {
                case "id":
                case "monday":
                case "tuesday":
                case "wednesday":
                case "thursday":
                case "friday":
                case "saturday":
                case "sunday":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
            case "calendar_dates":
              switch (header) {
                case "id":
                case "exception_type":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            case "feed_info":
              switch (header) {
                case "id":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            case "routes":
              switch (header) {
                case "id":
                case "route_type":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            case "shapes":
              switch (header) {
                case "id":
                case "shape_pt_sequence":
                case "shape_dist_traveled":
                  value = parseInt(value);
                case "shape_pt_lat":
                case "shape_pt_lon":
                  value = parseFloat(value);
                  break;
                default:
                  break;
              }
              break;
            case "stop_times":
              switch (header) {
                case "id":
                case "stop_sequence":
                case "shape_dist_traveled":
                case "pickup_type":
                case "drop_off_type":
                  value = parseInt(value);
                  break;
                default:
                  break;
              }
              break;
            case "stops":
              switch (header) {
                case "id":
                case "stop_code":
                case "location_type":
                case "parent_station":
                  value = parseInt(value);
                  break;
                case "stop_lat":
                case "stop_lon":
                  value = parseFloat(value);
                  break;
                default:
                  break;
              }
              break;
            case "transfers":
              switch (header) {
                case "id":
                  value = parseInt(value);
                default:
                  break;
              }
              break;
            case "trips":
              switch (header) {
                case "id":
                case "route_id":
                case "direction_id":
                case "wheelchair_accessible":
                case "bikes_allowed":
                  value = parseInt(value);
                default:
                  break;
              }
              break;
            default:
              break;
          }
          datum[header] = value;
        }
        data.push(datum);
      }
      fullData[dataKey] = data;
      const body = JSON.stringify(data);
      const compressed = await gzip(body);
      cache.put(dataKey, compressed, 86400000);
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

function getKey(urlString: string) {
  const url = new URL(urlString);
  const pathParts = url.pathname.split("/").filter(Boolean);
  return pathParts[pathParts.length - 1];
}

const response = (body: BodyInit) =>
  new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
    },
  });

export async function fetchMetlinkData(
  key: string,
  path: string,
  revalidate: number
) {
  if (!process.env.METLINK_API_KEY) {
    console.error(getTimestamp(), "No Metlink API key provided.");
    return new Response(null, { status: 500 });
  }

  const cachedData = cache.get(key);
  if (cachedData)
    return new Response(cachedData.body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

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

  try {
    const json = await response.json();
    const body = JSON.stringify(json, null, 2);
    cache.put(key, { body }, revalidate);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(getTimestamp(), "Failed to fetch Metlink data.", error);
    return new Response(null, { status: 500 });
  }
}

function getTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}
