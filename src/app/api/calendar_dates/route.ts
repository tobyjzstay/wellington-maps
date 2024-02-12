"use server";

import { fetchMetlinkFull } from "../util";

export async function GET(request: Request) {
  const full = await fetchMetlinkFull();
  const { calendar_dates } = full;

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(calendar_dates), { headers });
}
