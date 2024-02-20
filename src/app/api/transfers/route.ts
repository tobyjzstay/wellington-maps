"use server";

import { Cache, cacheRequest } from "../util";

const transfers: Cache<Transfer> = Object.create(null);

export type Transfer = {
  id: number;
  from_stop_id: string;
  to_stop_id: string;
  transfer_type: string;
  min_transfer_time: string;
  from_trip_id: string;
  to_trip_id: string;
};

export async function GET(request: Request) {
  if (!process.env.METLINK_API_KEY) return new Response(null, { status: 503 });

  await cacheRequest(
    transfers,
    "https://api.opendata.metlink.org.nz/v1/gtfs/transfers",
    86400,
    (response): Promise<Transfer[]> => {
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
  return new Response(transfers.body, { headers });
}
