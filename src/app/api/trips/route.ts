"use server";

import { Cache, fetchMetlink } from "../util";

const trips: Cache<Trip> = Object.create(null);

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
  return fetchMetlink("/gtfs/trips", 86400);
}
