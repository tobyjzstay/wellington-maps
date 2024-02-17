// @refresh reset
"use client";

import {
  BicyclingLayer,
  GoogleMap,
  TrafficLayer,
  TransitLayer
} from "@react-google-maps/api";
import React from "react";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Stop } from "./api/stops/route";
import { Trip } from "./api/trips/route";
import { Entity, VehiclePositions } from "./api/vehiclepositions/route";
import { Point } from "./point";
import { RouteType, getRouteColor } from "./util";

const UPDATE_INTERVAL = 5000;
const WELLINGTON = {
  lat: -41.2529601,
  lng: 174.7542577,
};
let Z_INDEX_BUFFER = 0;

function Maps() {
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

  const polylines = React.useRef<google.maps.Polyline[]>([]);

  React.useEffect(() => {
    getRouteMap().then(setRouteMap);
    getStopMap().then(setStopMap);
    getShapeMap().then(setShapeMap);
    getTripMap().then(setTripMap);
  }, []);

  React.useEffect(() => {
    if (routeMap === null || shapeMap === null || tripMap === null) return;
    const drawnShapes: string[] = [];
    Array.from(tripMap.values()).forEach((trip) => {
      const { id, route_id, shape_id } = trip;
      const route = routeMap.get(route_id);
      if (!route || drawnShapes.indexOf(shape_id) >= 0) return;
      if (route.route_type === RouteType.SCHOOL_BUS) return;
      const shapes = shapeMap.get(shape_id);
      if (!shapes) return;
      const { strokeColor } = getRouteColor(route);
      const path = shapes.map((shape) => ({
        lat: shape.shape_pt_lat,
        lng: shape.shape_pt_lon,
      }));
      const onClick = () => {
        polylines.current?.forEach((polyline) => polyline.setMap(null));
        // outline
        polylines.current[1] = new google.maps.Polyline({
          path,
          strokeColor: "#ffffff",
          strokeWeight: 9,
          zIndex: Z_INDEX_BUFFER * 2 - id,
        });
        // fill
        polylines.current[0] = new google.maps.Polyline({
          path,
          strokeColor,
          strokeWeight: 6,
          zIndex: Z_INDEX_BUFFER * 2 - id + 1,
        });
        polylines.current?.forEach((polyline) => polyline.setMap(map));
      };
      const outline = new google.maps.Polyline({
        map,
        clickable: true,
        path,
        strokeColor: "#ffffff",
        strokeWeight: 3,
        zIndex: Z_INDEX_BUFFER - id,
      });
      outline.addListener("click", onClick);
      const fill = new google.maps.Polyline({
        map,
        path,
        strokeColor,
        strokeWeight: 2,
        zIndex: Z_INDEX_BUFFER - id + 1,
      });
      fill.addListener("click", onClick);
      drawnShapes.push(shape_id);
    });
  }, [map, routeMap, shapeMap, tripMap]);

  React.useEffect(() => {
    async function update() {
      if (routeMap === null || shapeMap === null || tripMap === null) return;
      const response = await fetch("/api/vehiclepositions");
      const vehiclepositions: VehiclePositions = await response.json();
      const { entity } = vehiclepositions;
      const markers = entity.map((entity: Entity, index: number) => {
        const { vehicle } = entity;
        const route = routeMap.get(vehicle.trip.route_id);
        if (!route) return null;
        const { id } = route;
        const { strokeColor } = getRouteColor(route);
        return (
          <Point
            key={vehicle.vehicle.id}
            onClick={() => {
              polylines.current?.forEach((polyline) => polyline.setMap(null));
              const trip_id = vehicle.trip.trip_id;
              const trip = tripMap.get(trip_id);
              if (!trip) return;
              const { shape_id } = trip;
              let shapes = shapeMap.get(shape_id);
              if (!shapes) return;
              const path = shapes.map((shape) => ({
                lat: shape.shape_pt_lat,
                lng: shape.shape_pt_lon,
              }));
              // outline
              polylines.current[1] = new google.maps.Polyline({
                path,
                strokeColor: "#ffffff",
                strokeWeight: 9,
                zIndex: Z_INDEX_BUFFER * 2 - id,
              });
              // fill
              polylines.current[0] = new google.maps.Polyline({
                path,
                strokeColor,
                strokeWeight: 6,
                zIndex: Z_INDEX_BUFFER * 2 - id + 1,
              });
              polylines.current?.forEach((polyline) => polyline.setMap(map));
            }}
            route={route}
            vehicle={vehicle}
            zIndex={index * Z_INDEX_BUFFER * 2 + 1}
          />
        );
      });
      setMarkers(markers);
    }

    (async () => {
      update();
      const interval = setInterval(update, UPDATE_INTERVAL);
      return () => clearInterval(interval);
    })();
  }, [map, polylines, routeMap, shapeMap, tripMap]);

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
        disableDefaultUI: true,
        keyboardShortcuts: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "transit.line",
            elementType: "all",
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
    const route_id = parseInt(route.route_id);
    routeMap.set(route_id, route);
    if (Z_INDEX_BUFFER < route_id) Z_INDEX_BUFFER = route_id;
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

export default Maps;
