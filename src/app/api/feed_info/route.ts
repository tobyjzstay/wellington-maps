"use server";

import { fetchMetlink } from "../util";

export type FeedInfo = {
  id: number;
  feed_publisher_name: string;
  feed_publisher_url: string;
  feed_lang: string;
  feed_start_date: string;
  feed_end_date: string;
  feed_version: string;
};

export async function GET(_request: Request) {
  return fetchMetlink("/gtfs/feed_info", 86400);
}
