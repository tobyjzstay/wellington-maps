"use server";

import { getMetlinkData } from "../util";

/**
 * Represents a stop.
 *
 * @see https://gtfs.org/documentation/schedule/reference/#stopstxt
 */
export type Stop = {
  stop_id: string;
  stop_code?: string;
  stop_name?: string;
  stop_desc?: string;
  stop_lat?: number;
  stop_lon?: number;
  zone_id?: string;
  stop_url?: URL;
  location_type?: LocationType;
  parent_station?: Stop["stop_id"];
  stop_timezone?: string;
};

enum LocationType {
  STOP = 0,
  STATION = 1,
  ENTRANCE_EXIT = 2,
  GENERIC_NODE = 3,
  BOARDING_AREA = 4,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
