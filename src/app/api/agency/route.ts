"use server";

import { Cache, cacheRequest } from "../util";

const agency: Cache<Agency> = Object.create(null);

export type Agency = {
  id: number;
  agency_id: string;
  agency_name: string;
  agency_timezone: string;
  agency_url: string;
  agency_lang: string;
  agency_phone: string;
  agency_fare_url: string;
};

export async function GET(request: Request) {
  if (process.env.METLINK_API_KEY == null)
    return new Response(null, { status: 503 });

  await cacheRequest(
    agency,
    "https://api.opendata.metlink.org.nz/v1/gtfs/agency",
    86400,
    (response): Promise<Agency[]> => {
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
  return new Response(agency.body, { headers });
}
