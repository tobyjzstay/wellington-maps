"use server";

import JSZip from "jszip";
import cache from "memory-cache";
import { Agency } from "./agency/route";
import { Calendar } from "./calendar/route";
import { CalendarDate } from "./calendar_dates/route";
import { FeedInfo } from "./feed_info/route";
import { Route } from "./routes/route";
import { Shape } from "./shapes/route";
import { Stop } from "./stops/route";
import { Transfer } from "./transfers/route";
import { Trip } from "./trips/route";

export async function fetchMetlink(path: string, revalidate: number) {
  if (!process.env.METLINK_API_KEY) {
    console.error(getTimestamp(), "No Metlink API key provided");
    return new Response(null, { status: 503 });
  }

  const input = "https://api.opendata.metlink.org.nz/v1" + path;

  const cachedData = cache.get(input);
  if (cachedData)
    return new Response(cachedData.body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

  const method = "GET";
  const response = await fetch(input, {
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.METLINK_API_KEY,
    },
    method,
  });
  console.debug(getTimestamp(), method, response.status, input);

  try {
    const json = await response.json();
    const body = JSON.stringify(json, null, 2);
    cache.put(input, { body }, revalidate);
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(getTimestamp(), "Failed to fetch Metlink data:");
    console.error(error);
  }

  return new Response(null, { status: 503 });
}

export type Cache<T> = {
  body: string;
  data: T | T[];
  timestamp: number;
};

const full: Cache<Full> = Object.create(null);

type Full = {
  agency: Agency[];
  calendar: Calendar[];
  calendar_dates: CalendarDate[];
  feed_info: FeedInfo[];
  routes: Route[];
  shapes: Shape[];
  stop_pattern_trips: any[];
  stop_patterns: any[];
  stop_times: any[];
  stops: Stop[];
  transfers: Transfer[];
  trips: Trip[];
};

export async function fetchMetlinkFull() {
  if (!process.env.METLINK_API_KEY) return null;

  await cacheRequest(
    full,
    "https://static.opendata.metlink.org.nz/v1/gtfs/full.zip",
    86400,
    async (response) => {
      const buffer = await response.arrayBuffer();
      const zip = new JSZip();
      await zip.loadAsync(buffer);
      const files = zip.file(/\.txt$/);
      for (const file of files) {
        const text = await file.async("text");
        let headers: string[] | null = null;
        let name = file.name.slice(0, ".txt".length * -1) as keyof Full;
        const data: Full[typeof name] = [];
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
            switch (name) {
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
        if (!full.data) full.data = Object.create(null);
        full.data = { ...full.data, [name]: data };
      }
      return full.data;
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.METLINK_API_KEY,
      },
    }
  );

  return (full.data || {}) as Full;
}

export async function cacheRequest<T>(
  cache: Cache<T>,
  input: string,
  revalidate: number,
  handleResponse: (response: Response) => Promise<T | T[]>,
  init?: RequestInit | undefined
) {
  const date = new Date();
  const timestamp = date.getTime();

  if (!cache.timestamp || timestamp - cache.timestamp >= revalidate * 1000) {
    const response = await fetch(input, { ...init, cache: "no-cache" });

    if (!response.ok) return;

    const data = await handleResponse(response);
    cache.timestamp = timestamp;
    cache.data = data;
    cache.body = JSON.stringify(data, null, 2);
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
