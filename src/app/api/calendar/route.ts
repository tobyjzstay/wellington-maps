"use server";

import { getMetlinkData } from "../util";

/**
 * Represents a service calendar.
 *
 * @see https://gtfs.org/documentation/schedule/reference/#calendartxt
 */
export type Calendar = {
  service_id: string;
  monday: Availability;
  tuesday: Availability;
  wednesday: Availability;
  thursday: Availability;
  friday: Availability;
  saturday: Availability;
  sunday: Availability;
  start_date: Date;
  end_date: Date;
};

enum Availability {
  NOT_AVAILABLE = 0,
  AVAILABLE = 1,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
