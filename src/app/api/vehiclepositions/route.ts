"use server";

import { fetchMetlink } from "../util";

export async function GET() {
  return fetchMetlink("/gtfs-rt/vehiclepositions", {
    revalidate: 5, // seconds
  });
}
