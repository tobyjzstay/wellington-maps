"use server";

import { Cache, cacheRequest } from "../util";

const trips: Cache<Trip> = Object.create(null);

export type Trip = {
  id: number;
  route_id: number;
  service_id: string;
  trip_id: string;
  trip_headsign: string;
  direction_id: number;
  block_id: string;
  shape_id: string;
  wheelchair_accessible: number;
  bikes_allowed: number;
};

export async function GET(request: Request) {
  if (process.env.METLINK_API_KEY == null)
    return new Response(null, { status: 503 });

  await cacheRequest(
    trips,
    "https://api.opendata.metlink.org.nz/v1/gtfs/transfers",
    86400,
    (response): Promise<Trip[]> => {
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
  return new Response(trips.body, { headers });
}
