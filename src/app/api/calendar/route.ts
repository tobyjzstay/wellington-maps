"use server";

import { fetchMetlink } from "../util";

export type Calendar = {
  id: number;
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
};

export async function GET(_request: Request) {
  return fetchMetlink("/gtfs/calendar", 86400);
}
