"use server";

import { getMetlinkData } from "../util";

export type CalendarDate = {
  service_id: string;
  date: Date;
  exception_type: ExceptionType;
};

export enum ExceptionType {
  ADDED = 1,
  REMOVED = 2,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
