"use server";

import { getMetlinkData } from "../util";

/**
 * Represents a service calendar date.
 *
 * @see https://gtfs.org/documentation/schedule/reference/#calendar_datestxt
 */
export type CalendarDate = {
  service_id: string;
  date: Date;
  exception_type: ExceptionType;
};

enum ExceptionType {
  ADDED = 1,
  REMOVED = 2,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
