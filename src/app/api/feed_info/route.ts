"use server";

import { Cache, cacheRequest } from "../util";

const feed_info: Cache<FeedInfo> = Object.create(null);

export type FeedInfo = {
  id: number;
  feed_publisher_name: string;
  feed_publisher_url: string;
  feed_lang: string;
  feed_start_date: string;
  feed_end_date: string;
  feed_version: string;
};

export async function GET(request: Request) {
  if (process.env.METLINK_API_KEY == null)
    return new Response(null, { status: 503 });

  await cacheRequest(
    feed_info,
    "https://api.opendata.metlink.org.nz/v1/gtfs/feed_info",
    86400,
    (response): Promise<FeedInfo[]> => {
      return response.json();
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.METLINK_API_KEY,
      },
    }
  );

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  return new Response(feed_info.body, { headers });
}
