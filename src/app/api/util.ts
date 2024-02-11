"use server";

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
