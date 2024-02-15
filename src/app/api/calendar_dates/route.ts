"use server";

import { Cache, cacheRequest } from "../util";

const calendar_dates: Cache<CalendarDate> = Object.create(null);

export type CalendarDate = {
  id: number;
  service_id: string;
  date: string;
  exception_type: number;
};

export async function GET(request: Request) {
  if (process.env.METLINK_API_KEY == null)
    return new Response(null, { status: 503 });

  await cacheRequest(
    calendar_dates,
    "https://api.opendata.metlink.org.nz/v1/gtfs/calendar_dates",
    86400,
    (response): Promise<CalendarDate[]> => {
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
  return new Response(calendar_dates.body, { headers });
}
