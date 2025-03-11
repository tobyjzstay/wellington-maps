"use server";

import { RouteId, RouteType } from "@/app/util";
import { Agency } from "../agency/route";
import { getMetlinkData } from "../util";

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

export async function GET(request: Request) {
  return getMetlinkData(request);
}
