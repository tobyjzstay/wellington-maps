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
  const [markers, setMarkers] = React.useState<(React.JSX.Element | null)[]>(
    []
  );

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  React.useEffect(() => {
    if (!isLoaded || routeMap !== null) return;
    (async () => {
      const response = await fetch("/api/routes");
      const routes = await response.json();
      const routeMap = new Map<number, Route>();
      for (const route of routes) {
        routeMap.set(parseInt(route.route_id), route);
      }
      setRouteMap(routeMap);
    })();
  }, [isLoaded, routeMap]);

  React.useEffect(() => {
    async function update() {
      const response = await fetch("/api/vehiclepositions");
      const vehiclepositions: VehiclePositions = await response.json();
      const { entity, header } = vehiclepositions;
      const markers = entity.map((entity: Entity, index: number) => {
        const { vehicle } = entity;
        const route = routeMap!.get(vehicle.trip.route_id);
        if (!route) return null;
        return (
          <Point
            key={vehicle.vehicle.id}
            route={route}
            vehicle={vehicle}
            zIndex={index * 10}
          />
        );
      });
      setMarkers(markers);
    }

    if (!isLoaded || routeMap === null) return;
    (async () => {
      update();
      const interval = setInterval(update, UPDATE_INTERVAL);
      return () => clearInterval(interval);
    })();
  }, [isLoaded, routeMap]);

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

export default App;
