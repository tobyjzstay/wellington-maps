"use server";

import { fetchMetlink } from "../util";

export type Stop = {
  id: number;
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  zone_id: string;
  stop_lat: number;
  stop_lon: number;
  location_type: number;
  parent_station: string;
  stop_url: string;
  stop_timezone: string;
};

export async function GET(_request: Request) {
  return fetchMetlink("/gtfs/stops", 86400);
}
