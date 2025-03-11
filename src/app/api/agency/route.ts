"use server";

import { getMetlinkData } from "../util";

export type Agency = {
  agency_id?: string;
  agency_name: string;
  agency_url: URL;
  agency_timezone: string;
  agency_lang?: string;
  agency_phone?: string;
  agency_fare_url?: URL;
};

export async function GET(request: Request) {
  return getMetlinkData(request);
}
