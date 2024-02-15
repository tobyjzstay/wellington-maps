"use server";

import { Cache, cacheRequest } from "../util";

const calendar: Cache<Calendar> = Object.create(null);

export type Calendar = {
  id: number;
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
};

export async function GET(request: Request) {
  if (process.env.METLINK_API_KEY == null)
    return new Response(null, { status: 503 });

  await cacheRequest(
    calendar,
    "https://api.opendata.metlink.org.nz/v1/gtfs/calendar",
    86400,
    (response): Promise<Calendar[]> => {
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
  return new Response(calendar.body, { headers });
}
