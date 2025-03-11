"use server";

import { getMetlinkData } from "../util";

/**
 * Represents a shape.
 *
 * @see https://gtfs.org/documentation/schedule/reference/#shapestxt
 */

export type Shape = {
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
  shape_dist_traveled?: number;
};

export async function GET(request: Request) {
  return getMetlinkData(request);
}
