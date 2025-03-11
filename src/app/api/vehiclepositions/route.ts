"use server";

import { getKey, getTimestamp } from "@/app/util";
import cache from "memory-cache";
import { Route } from "../routes/route";
import { Trip } from "../trips/route";
import { fetchMetlinkData } from "../util";

export type VehiclePositions = {
  entity: FeedEntity[];
  header: FeedHeader;
};

type FeedHeader = {
  gtfs_realtime_version: string;
  incrementality: Incrementality;
  timestamp: number;
  feed_version?: string;
};

enum Incrementality {
  FULL_DATASET = 0,
  DIFFERENTIAL = 1,
}

export type FeedEntity = {
  id: string;
  vehicle: VehiclePosition;
};

export type VehiclePosition = {
  trip?: TripDescriptor;
  vehicle?: {
    id: string;
  };
  position?: Position;
  occupancy_status?: OccupancyStatus;
  timestamp: number;
};

enum OccupancyStatus {
  EMPTY = 0,
  MANY_SEATS_AVAILABLE = 1,
  FEW_SEATS_AVAILABLE = 2,
  STANDING_ROOM_ONLY = 3,
  CRUSHED_STANDING_ROOM_ONLY = 4,
  FULL = 5,
  NOT_ACCEPTING_PASSENGERS = 6,
  NO_DATA_AVAILABLE = 7,
  NOT_BOARDABLE = 8,
}

type TripDescriptor = {
  trip_id?: Trip["trip_id"];
  route_id?: Route["route_id"];
  direction_id: Trip["direction_id"];
  start_time?: string;
  start_date?: string;
  schedule_relationship: ScheduleRelationship;
};

enum ScheduleRelationship {
  SCHEDULED = 0,
  ADDED = 1,
  UNSCHEDULED = 2,
  CANCELED = 3,
  DUPLICATED = 4,
  DELETED = 5,
}

type Position = {
  latitude: number;
  longitude: number;
  bearing?: number;
};

const path = "https://api.opendata.metlink.org.nz/v1/gtfs-rt/vehiclepositions";

let pending: Promise<Response> | null = null;

export async function GET(request: Request) {
  if (pending) await pending;

  const key = getKey(request.url);
  const data = cache.get(key);
  if (data) {
    const response = _response(data.body);
    console.info(getTimestamp(), request.method, response.status, request.url);
    return response;
  }

  pending = (async () => {
    const response = await fetchMetlinkData(path);

    try {
      const json = await response.json();
      json.header.gtfs_realtime_version = json.header.gtfsRealtimeVersion;
      delete json.header.gtfsRealtimeVersion;
      json.entity.forEach((entity: any) => {
        entity.vehicle.trip.route_id = String(entity.vehicle.trip.route_id);
      });
      const body = JSON.stringify(json, null, 2);
      cache.put(key, { body }, 5000);
      return _response(body);
    } catch (error) {
      console.error(getTimestamp(), "Failed to parse Metlink data.", error);
      return new Response(null, { status: 500 });
    }
  })();

  return pending;
}

const _response = (body: BodyInit) =>
  new Response(body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
