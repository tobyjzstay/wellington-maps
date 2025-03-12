"use server";

import { Stop } from "../stops/route";
import { Trip } from "../trips/route";
import { getMetlinkData } from "../util";

/**
 * Represents a transfer between two nodes.
 *
 * @see https://gtfs.org/documentation/schedule/reference/#transferstxt
 */
export type Transfer = {
  from_stop_id?: Stop["stop_id"];
  to_stop_id?: Stop["stop_id"];
  from_trip_id?: Trip["trip_id"];
  to_trip_id?: Trip["trip_id"];
  transfer_type: TransferType;
  min_transfer_time?: number;
};

enum TransferType {
  RECOMMENDED = 0,
  TIMED = 1,
  MINIMUM_TIME = 2,
  NO_TRANSFER = 3,
  IN_SEAT_TRANSFER = 4,
  NO_IN_SEAT_TRANSFER = 5,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
