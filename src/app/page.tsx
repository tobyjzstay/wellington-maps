"use client";

import {
  BicyclingLayer,
  GoogleMap,
  Libraries,
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

const libraries: Libraries = ["places"];

function App() {
  const [map, setMap] = React.useState<GoogleMap | null>(null);
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
    libraries,
  });

  const [path, setPath] = React.useState<google.maps.Polyline | null>(null);

  React.useEffect(() => {
    if (!isLoaded) return;
    const stopLocations: number[] = [];
    getRouteMap().then(setRouteMap);
    getStopMap(stopLocations).then(setStopMap);
    getShapeMap(stopLocations).then(setShapeMap);
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
              const trip_id = vehicle.trip.trip_id;
              const trip = tripMap!.get(trip_id);
              if (!trip) return;
              const { shape_id } = trip;
              let shapes = shapeMap!.get(shape_id);
              if (!shapes) return;
              console.log(path);
              path?.setMap(null);
              setPath(
                new google.maps.Polyline({
                  strokeColor: "#" + route.route_color,
                  path: shapes.map((shape) => ({
                    lat: shape.shape_pt_lat,
                    lng: shape.shape_pt_lon,
                  })),
                  map: map?.state.map,
                })
              );
            }}
            route={route}
            vehicle={vehicle}
            zIndex={index * 10}
          />
        );
      });
      setMarkers(markers);
    }

    if (!isLoaded || routeMap === null || shapeMap === null || tripMap === null)
      return;
    (async () => {
      update();
      const interval = setInterval(update, UPDATE_INTERVAL);
      return () => clearInterval(interval);
    })();
  }, [isLoaded, map?.state.map, path, routeMap, shapeMap, tripMap]);

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
      ref={(map) => setMap(map)}
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

async function getStopMap(stopLocations: number[]) {
  const response = await fetch("/api/stops");
  const stops: Stop[] = await response.json();
  const stopMap = new Map<number, Stop>();
  for (const stop of stops) {
    stopMap.set(parseInt(stop.stop_id), stop);
    stopLocations.push(stop.stop_lat, stop.stop_lon);
  }
  return stopMap;
}

async function getShapeMap(stopLocations: number[]) {
  const response = await fetch("/api/shapes");
  const shapes: Shape[] = await response.json();
  const shapeMap = new Map<string, Shape[]>();
  for (let i = 0; i < shapes.length; i++) {
    if (i === 0 || i === shapes.length - 1) continue;
    const shape = shapes[i];
    const penultimateShape = shapes[i - 2];
    const { shape_id, shape_pt_lat, shape_pt_lon } = shape;
    if (
      penultimateShape &&
      penultimateShape.shape_pt_lat === shape_pt_lat &&
      penultimateShape.shape_pt_lon === shape_pt_lon
    ) {
      shapeMap.get(shape_id)!.pop();
      continue;
    }
    for (let j = 0; j < stopLocations.length; j += 2) {
      if (
        stopLocations[j] === shape_pt_lat &&
        stopLocations[j + 1] === shape_pt_lon
      )
        continue;
    }
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
