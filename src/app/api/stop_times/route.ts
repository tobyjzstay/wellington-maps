"use server";

import { fetchMetlink } from "../util";

type StopTime = {
  id: number;
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
  shape_dist_traveled: number;
  stop_headsign: string;
  pickup_type: number;
  drop_off_type: number;
  timepoint: string;
};

export async function GET(_request: Request) {
  return fetchMetlink("/gtfs/stop_times", 86400);
}
