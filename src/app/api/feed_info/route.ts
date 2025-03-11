"use server";

import { getMetlinkData } from "../util";

export type FeedInfo = {
  feed_publisher_name: string;
  feed_publisher_url: URL;
  feed_lang: string;
  feed_start_date: Date;
  feed_end_date: Date;
  feed_version: string;
};

export async function GET(request: Request) {
  return getMetlinkData(request);
}
