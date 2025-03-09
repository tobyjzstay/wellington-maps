"use server";

import { fetchMetlinkData } from "../util";

export type VehiclePositions = {
  entity: Entity[];
  header: Header;
};

type Header = {
  gtfsRealtimeVersion: string;
  incrementality: number;
  timestamp: number;
};

export type Entity = {
  id: string;
  vehicle: Vehicle;
};

export type Vehicle = {
  trip: Trip;
  position: Position;
  vehicle: {
    id: string;
  };
  timestamp: number;
};

type Trip = {
  start_time: string;
  trip_id: string;
  direction_id: number;
  route_id: number;
  schedule_relationship: number;
  start_date: string;
};

type Position = {
  bearing: number;
  latitude: number;
  longitude: number;
};

const key = "vehiclepositions";
const path = "https://api.opendata.metlink.org.nz/v1/gtfs-rt/vehiclepositions";

export async function GET() {
  return fetchMetlinkData(key, path, 5000);
}
