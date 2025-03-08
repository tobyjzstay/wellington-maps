"use server";

import { fetchMetlink } from "../util";

export type Transfer = {
  id: number;
  from_stop_id: string;
  to_stop_id: string;
  transfer_type: string;
  min_transfer_time: string;
  from_trip_id: string;
  to_trip_id: string;
};

export async function GET(_request: Request) {
  return fetchMetlink("/gtfs/transfers", 86400);
}
