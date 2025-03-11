"use server";

import { getMetlinkData } from "../util";

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

export enum Availability {
  NOT_AVAILABLE = 0,
  AVAILABLE = 1,
}

export async function GET(request: Request) {
  return getMetlinkData(request);
}
