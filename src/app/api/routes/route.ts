"use server";

import { RouteId, RouteType } from "@/app/util";
import { fetchMetlinkData } from "../util";

export type Route = {
  id: number;
  route_id: RouteId;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc: string;
  route_type: RouteType;
  route_color: string;
  route_text_color: string;
  route_url: string;
};

const key = "routes";
const path = "https://api.opendata.metlink.org.nz/v1/gtfs/routes";

export async function GET() {
  return fetchMetlinkData(key, path, 86400000);
}
