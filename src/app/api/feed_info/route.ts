"use server";

import { fetchMetlinkFull } from "../util";

export async function GET(request: Request) {
  const full = await fetchMetlinkFull();
  const { feed_info } = full;

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(feed_info), { headers });
}
