"use server";

import { fetchMetlink } from "../util";

export async function GET() {
  return fetchMetlink("/gtfs/routes", {
    revalidate: 86400, // seconds
  });
}
