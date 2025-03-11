"use server";

import { Stop } from "../stops/route";
import { Trip } from "../trips/route";
import { getMetlinkData } from "../util";

export type StopTime = {
  trip_id: Trip["trip_id"];
  arrival_time?: string;
  departure_time?: string;
  stop_id?: Stop["stop_id"];
  stop_sequence: number;
  stop_headsign?: string;
  pickup_type?: StopType;
  drop_off_type?: StopType;
  shape_dist_traveled?: number;
  timepoint?: Timepoint;
};

export enum StopType {
  REGULAR = 0,
  NOT_AVAILABLE = 1,
  PHONE_AGENCY = 2,
  COORDINATE_WITH_DRIVER = 3,
}

export enum Timepoint {
  APPROXIMATE = 0,
  EXACT = 1,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
