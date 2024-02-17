"use client";

import {
  BicyclingLayer,
  GoogleMap,
  TrafficLayer,
  TransitLayer,
  useLoadScript,
} from "@react-google-maps/api";
import React from "react";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Stop } from "./api/stops/route";
import { Trip } from "./api/trips/route";
import { Entity, VehiclePositions } from "./api/vehiclepositions/route";
import { Point } from "./point";

const UPDATE_INTERVAL = 5000;
const WELLINGTON = {
  lat: -41.2529601,
  lng: 174.7542577,
};

function App() {
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [routeMap, setRouteMap] = React.useState<Map<number, Route> | null>(
    null
  );
  const [stopMap, setStopMap] = React.useState<Map<number, Stop> | null>(null);
  const [shapeMap, setShapeMap] = React.useState<Map<string, Shape[]> | null>(
    null
  );
  const [tripMap, setTripMap] = React.useState<Map<string, Trip> | null>(null);
  const [markers, setMarkers] = React.useState<(React.JSX.Element | null)[]>(
    []
  );

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const polylines = React.useRef<google.maps.Polyline[]>([]);

  React.useEffect(() => {
    if (!isLoaded) return;
    getRouteMap().then(setRouteMap);
    getStopMap().then(setStopMap);
    getShapeMap().then(setShapeMap);
    getTripMap().then(setTripMap);
  }, [isLoaded]);

  React.useEffect(() => {
    async function update() {
      const response = await fetch("/api/vehiclepositions");
      const vehiclepositions: VehiclePositions = await response.json();
      const { entity } = vehiclepositions;
      const markers = entity.map((entity: Entity, index: number) => {
        const { vehicle } = entity;
        const route = routeMap!.get(vehicle.trip.route_id);
        if (!route) return null;
        return (
          <Point
            key={vehicle.vehicle.id}
            onClick={() => {
              polylines.current?.forEach((polyline) => polyline.setMap(null));
              // shape data for trains is not as accurate as Google's
              if (route.route_type === 2) return;
              const trip_id = vehicle.trip.trip_id;
              const trip = tripMap!.get(trip_id);
              if (!trip) return;
              const { shape_id } = trip;
              let shapes = shapeMap!.get(shape_id);
              if (!shapes) return;
              const path = shapes!.map((shape) => ({
                lat: shape.shape_pt_lat,
                lng: shape.shape_pt_lon,
              }));
              // fill
              polylines.current[1] = new google.maps.Polyline({
                path,
                strokeColor: "#ffffff",
                strokeWeight: 4,
              });
              // outline
              polylines.current[0] = new google.maps.Polyline({
                path,
                strokeColor: "#" + route.route_color,
                strokeWeight: 2,
                zIndex: 1,
              });
              polylines.current?.forEach((polyline) => polyline.setMap(map));
            }}
            route={route}
            vehicle={vehicle}
            zIndex={index + 1 * 10}
          />
        );
      });
      setMarkers(markers);
    }

    if (routeMap === null || shapeMap === null || tripMap === null) return;
    (async () => {
      update();
      const interval = setInterval(update, UPDATE_INTERVAL);
      return () => clearInterval(interval);
    })();
  }, [isLoaded, map, polylines, routeMap, shapeMap, tripMap]);

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps</div>;
  }

  return (
    <GoogleMap
      center={WELLINGTON}
      mapContainerStyle={{
        width: "100vw",
        height: "100vh",
      }}
      mapTypeId={google.maps.MapTypeId.ROADMAP}
      onClick={() => {
        polylines.current?.forEach((polyline) => polyline.setMap(null));
      }}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      }}
      ref={(ref) => {
        setMap(ref?.state.map || null);
      }}
      zoom={12}
    >
      <TrafficLayer />
      <TransitLayer />
      <BicyclingLayer />
      {markers}
    </GoogleMap>
  );
}

async function getRouteMap() {
  const response = await fetch("/api/routes");
  const routes: Route[] = await response.json();
  const routeMap = new Map<number, Route>();
  for (const route of routes) {
    routeMap.set(parseInt(route.route_id), route);
  }
  return routeMap;
}

async function getStopMap() {
  const response = await fetch("/api/stops");
  const stops: Stop[] = await response.json();
  const stopMap = new Map<number, Stop>();
  for (const stop of stops) {
    stopMap.set(parseInt(stop.stop_id), stop);
  }
  return stopMap;
}

async function getShapeMap() {
  const response = await fetch("/api/shapes");
  const shapes: Shape[] = await response.json();
  const shapeMap = new Map<string, Shape[]>();
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    const { shape_id } = shape;
    if (!shapeMap.has(shape_id)) shapeMap.set(shape_id, []);
    shapeMap.get(shape_id)!.push(shape);
  }
  return shapeMap;
}

async function getTripMap() {
  const response = await fetch("/api/trips");
  const trips: Trip[] = await response.json();
  const tripMap = new Map<string, Trip>();
  for (const trip of trips) {
    tripMap.set(trip.trip_id, trip);
  }
  return tripMap;
}

export default App;
