"use server";

import { getMetlinkData } from "../util";

export type Trip = {
  id: number;
  route_id: number;
  service_id: string;
  trip_id: string;
  trip_headsign: string;
  direction_id: number;
  block_id: string;
  shape_id: string;
  wheelchair_accessible: number;
  bikes_allowed: number;
};

export async function GET(request: Request) {
  return getMetlinkData(request);
}
