"use server";

import { fetchMetlinkFull } from "../util";

export async function GET(request: Request) {
  const full = await fetchMetlinkFull();
  if (full == null) return new Response(null, { status: 503 });
  const { stop_patterns } = full;

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(stop_patterns, null, 2), { headers });
}
