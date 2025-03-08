"use server";

import { fetchMetlink } from "../util";

export type CalendarDate = {
  id: number;
  service_id: string;
  date: string;
  exception_type: number;
};

export async function GET(_request: Request) {
  fetchMetlink("/gtfs/calendar_dates", 86400);
}
