"use server";

import { getMetlinkData } from "../util";

export type Agency = {
  id: number;
  agency_id: string;
  agency_name: string;
  agency_timezone: string;
  agency_url: string;
  agency_lang: string;
  agency_phone: string;
  agency_fare_url: string;
};

export async function GET(request: Request) {
  return getMetlinkData(request);
}
