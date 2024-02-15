"use server";

import { Cache, cacheRequest } from "../util";

const stops: Cache<Stop> = Object.create(null);

export type Stop = {
  id: number;
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  zone_id: string;
  stop_lat: number;
  stop_lon: number;
  location_type: number;
  parent_station: string;
  stop_url: string;
  stop_timezone: string;
};

export async function GET(request: Request) {
  if (process.env.METLINK_API_KEY == null)
    return new Response(null, { status: 503 });

  await cacheRequest(
    stops,
    "https://api.opendata.metlink.org.nz/v1/gtfs/stops",
    86400,
    (response): Promise<Stop[]> => {
      return response.json();
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.METLINK_API_KEY,
      },
    }
  );

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  return new Response(stops.body, { headers });
}
