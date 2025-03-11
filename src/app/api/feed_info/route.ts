"use server";

import { getMetlinkData } from "../util";

/**
 * Represents feed information.
 *
 * @see https://gtfs.org/documentation/schedule/reference/#feed_infotxt
 */
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
