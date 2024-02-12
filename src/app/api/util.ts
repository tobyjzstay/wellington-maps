"use server";

import JSZip from "jszip";

export async function fetchMetlink(
  path: string,
  next?: NextFetchRequestConfig
) {
  if (process.env.METLINK_API_KEY == null)
    return new Response(null, { status: 503 });

  return await fetch("https://api.opendata.metlink.org.nz/v1" + path, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.METLINK_API_KEY,
    },
    next,
  });
}

const full: {
  timestamp: number;
} & {
  [key: string]: any;
} = Object.create(null);

export async function fetchMetlinkFull() {
  const timestamp = new Date().getTime();
  if (full && timestamp - full.timestamp < 86400000) return full;
  full.timestamp = timestamp;
  const response = await fetch(
    "https://static.opendata.metlink.org.nz/v1/gtfs/full.zip",
    {
      cache: "no-cache",
    }
  );
  const buffer = await response.arrayBuffer();
  const zip = new JSZip();
  await zip.loadAsync(buffer);
  const files = zip.file(/\.txt$/);
  for (const file of files) {
    const text = await file.async("text");
    let headers: string[] | null = null;
    const data = [];
    for (const line of text.split("\n")) {
      if (headers == null) {
        headers = line.split(",");
        continue;
      }
      const datum = Object.create(null);
      const values = line.split(",");
      for (let i = 0; i < headers.length; i++) {
        datum[headers[i]] = values[i];
      }
      data.push(datum);
    }
    const name = file.name.slice(0, ".txt".length * -1);
    full[name] = data;
  }
  return full;
}
