"use server";

import { getMetlinkData } from "../util";

export type CalendarDate = {
  id: number;
  service_id: string;
  date: string;
  exception_type: number;
};

export async function GET(request: Request) {
  return getMetlinkData(request);
}
