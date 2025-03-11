"use server";

import { Calendar } from "../calendar/route";
import { CalendarDate } from "../calendar_dates/route";
import { Route } from "../routes/route";
import { Shape } from "../shapes/route";
import { getMetlinkData } from "../util";

export type Trip = {
  route_id: Route["route_id"];
  service_id: Calendar["service_id"] | CalendarDate["service_id"];
  trip_id: string;
  trip_headsign?: string;
  direction_id?: Direction;
  block_id?: string;
  shape_id?: Shape["shape_id"];
  wheelchair_accessible?: WheelchairAccessible;
  bikes_allowed?: BikesAllowed;
};

enum Direction {
  OUTBOUND = 0,
  INBOUND = 1,
}

enum WheelchairAccessible {
  NO_INFORMATION = 0,
  ACCESSIBLE = 1,
  NOT_ACCESSIBLE = 2,
}

enum BikesAllowed {
  NO_INFORMATION = 0,
  ALLOWED = 1,
  NOT_ALLOWED = 2,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
