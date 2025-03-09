"use server";

import { RouteId, RouteType } from "@/app/util";
import { getMetlinkData } from "../util";

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

export async function GET(request: Request) {
  return getMetlinkData(request);
}
