"use server";

import { RouteId, RouteType } from "@/app/util";
import { Cache, cacheRequest } from "../util";

const routes: Cache<Route> = Object.create(null);

export type Route = {
  id: number;
  route_id: RouteId;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc: string;
  route_type: RouteType;
  route_color: string;
  route_text_color: string;
  route_url: string;
};

export async function GET(request: Request) {
  if (!process.env.METLINK_API_KEY) return new Response(null, { status: 503 });

  await cacheRequest(
    routes,
    "https://api.opendata.metlink.org.nz/v1/gtfs/routes",
    86400,
    (response): Promise<Route[]> => {
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
  return new Response(routes.body, { headers });
}
