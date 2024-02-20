"use server";

import { Cache, cacheRequest } from "../util";

const stop_time: Cache<StopTime> = Object.create(null);

type StopTime = {
  id: number;
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
  shape_dist_traveled: number;
  stop_headsign: string;
  pickup_type: number;
  drop_off_type: number;
  timepoint: string;
};

export async function GET(request: Request) {
  if (!process.env.METLINK_API_KEY) return new Response(null, { status: 503 });

  await cacheRequest(
    stop_time,
    "https://api.opendata.metlink.org.nz/v1/gtfs/stop_times",
    86400,
    (response): Promise<StopTime[]> => {
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
  return new Response(stop_time.body, { headers });
}
