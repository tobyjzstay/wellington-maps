"use server";

import { fetchMetlinkFull } from "../util";

export type Shape = {
  id: number;
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
  shape_dist_traveled: number;
};

export async function GET(request: Request) {
  const full = await fetchMetlinkFull();
  if (!full) return new Response(null, { status: 503 });
  const { shapes } = full;

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(shapes, null, 2), { headers });
}
