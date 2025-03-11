"use server";

import { getMetlinkData } from "../util";

export async function GET(request: Request) {
  return getMetlinkData(request);
}
