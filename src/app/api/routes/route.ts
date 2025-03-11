"use server";

import { RouteId, RouteType } from "@/app/util";
import { Agency } from "../agency/route";
import { fetchMetlinkData } from "../util";

/**
 * Represents a transit route.
 *
 * @see https://gtfs.org/documentation/schedule/reference/#routestxt
 */
export type Route = {
  route_id: RouteId;
  agency_id?: Agency["agency_id"];
  route_short_name?: string;
  route_long_name?: string;
  route_des?: string;
  route_type: RouteType;
  route_url: URL;
  route_color: string;
  route_text_color: string;
  route_sort_order?: number;
};

const key = "routes";
const path = "https://api.opendata.metlink.org.nz/v1/gtfs/routes";

export async function GET() {
  return fetchMetlinkData(key, path, 86400000);
}
