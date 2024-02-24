// @refresh reset
"use client";

import {
  Box,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  FormGroup,
  Toolbar,
  Typography,
} from "@mui/material";
import React from "react";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Trip } from "./api/trips/route";
import { Entity, VehiclePositions } from "./api/vehiclepositions/route";
import styles from "./maps.module.css";
import { Point } from "./point";
import {
  BusRouteType,
  RouteType,
  getBusRouteType,
  getRouteColor,
} from "./util";

const UPDATE_INTERVAL = 5000;
const WELLINGTON = {
  lat: -41.2529601,
  lng: 174.7542577,
};

const Z_INDEX_BUFFER = 10000;
export enum ZIndexLayer {
  POLYLINE,
  POLYLINE_SELECTED,
  MARKER,
}

export const MapContext = React.createContext<google.maps.Map | null>(null);

function Maps() {
  const [routeMap, setRouteMap] = React.useState<Map<number, Route> | null>(
    null
  );
  const [shapeMap, setShapeMap] = React.useState<Map<string, Shape[]> | null>(
    null
  );
  const [tripMap, setTripMap] = React.useState<Map<string, Trip> | null>(null);
  const fetchingData = React.useRef(false);
  React.useEffect(() => {
    if (fetchingData.current) return;
    fetchingData.current = true;
    getRouteMap().then(setRouteMap);
    getShapeMap().then(setShapeMap);
    getTripMap().then(setTripMap);
  }, []);

  const mapElement = document.getElementById("map");
  const map = React.useMemo(() => {
    if (!mapElement) return null;
    return new google.maps.Map(mapElement, {
      center: WELLINGTON,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
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
      zoom: 12,
    });
  }, [mapElement]);
  map?.addListener("click", () =>
    polylines.current?.forEach((polyline) => polyline.setMap(null))
  );

  React.useEffect(() => {
    if (routeMap === null || shapeMap === null || tripMap === null) return;
    const drawnShapes: string[] = [];

    const railPolylines: google.maps.Polyline[] = [];
    const frequentPolylines: google.maps.Polyline[] = [];
    const standardPolylines: google.maps.Polyline[] = [];
    const peakExpressExtendedPolylines: google.maps.Polyline[] = [];
    const midnightPolylines: google.maps.Polyline[] = [];
    const ferryPolylines: google.maps.Polyline[] = [];
    const cableCarPolylines: google.maps.Polyline[] = [];
    const schoolBusPolylines: google.maps.Polyline[] = [];
    Array.from(tripMap.values()).forEach((trip) => {
      const { id, route_id: trip_route_id, shape_id } = trip;
      const route = routeMap.get(trip_route_id);
      if (!route || drawnShapes.indexOf(shape_id) >= 0) return;
      const { route_id, route_type } = route;
      const shapes = shapeMap.get(shape_id);
      if (!shapes) return;
      const { strokeColor } = getRouteColor(route);
      const path = shapes.map((shape) => ({
        lat: shape.shape_pt_lat,
        lng: shape.shape_pt_lon,
      }));
      const bounds = new google.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(point));
      const onClick = () => {
        const zIndex = zIndexGen(id, ZIndexLayer.POLYLINE_SELECTED);
        polylines.current?.forEach((polyline) => polyline.setMap(null));
        // outline
        polylines.current[1] = new google.maps.Polyline({
          path,
          strokeColor: "#ffffff",
          strokeWeight: 9,
          zIndex: zIndex - 1,
        });
        // fill
        polylines.current[0] = new google.maps.Polyline({
          path,
          strokeColor,
          strokeWeight: 6,
          zIndex: zIndex,
        });
        if (!map) return;
        polylines.current?.forEach((polyline) => polyline.setMap(map));
        map.fitBounds(bounds);
      };
      const zIndex = zIndexGen(trip_route_id, ZIndexLayer.POLYLINE);
      const outline = new google.maps.Polyline({
        path,
        strokeColor: "#ffffff",
        strokeWeight: 3,
        zIndex: zIndex - 1,
      });
      outline.addListener("click", onClick);
      const fill = new google.maps.Polyline({
        path,
        strokeColor,
        strokeWeight: 2,
        zIndex: zIndex,
      });
      fill.addListener("click", onClick);
      switch (route_type) {
        case RouteType.RAIL:
          railPolylines.push(outline, fill);
          break;
        case RouteType.BUS:
          switch (getBusRouteType(route_id)) {
            case BusRouteType.FREQUENT:
              frequentPolylines.push(outline, fill);
              break;
            case BusRouteType.STANDARD:
              standardPolylines.push(outline, fill);
              break;
            case BusRouteType.PEAK_EXPRESS_EXTENDED:
              peakExpressExtendedPolylines.push(outline, fill);
              break;
            case BusRouteType.MIDNIGHT:
              midnightPolylines.push(outline, fill);
              break;
            default:
              break;
          }
          break;
        case RouteType.FERRY:
          ferryPolylines.push(outline, fill);
          break;
        case RouteType.CABLE_CAR:
          cableCarPolylines.push(outline, fill);
          break;
        case RouteType.SCHOOL_BUS:
          schoolBusPolylines.push(outline, fill);
          break;
        default:
          break;
      }
      drawnShapes.push(shape_id);
    });
    setRailPolylines(railPolylines);
    setFrequentPolylines(frequentPolylines);
    setStandardPolylines(standardPolylines);
    setPeakExpressExtendedPolylines(peakExpressExtendedPolylines);
    setMidnightPolylines(midnightPolylines);
    setFerryPolylines(ferryPolylines);
    setCableCarPolylines(cableCarPolylines);
    setSchoolPolylines(schoolBusPolylines);
  }, [map, routeMap, shapeMap, tripMap]);

  const [markers, setMarkers] = React.useState<JSX.Element[]>([]);

  const polylines = React.useRef<google.maps.Polyline[]>([]);

  const [rail, setRail] = React.useState(true);
  const [railPolylines, setRailPolylines] = React.useState<
    google.maps.Polyline[] | null
  >(null);
  React.useEffect(() => {
    if (!railPolylines) return;
    if (rail) railPolylines.forEach((polyline) => polyline.setMap(map));
    else railPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, rail, railPolylines]);

  const [frequent, setFrequent] = React.useState(true);
  const [frequentPolylines, setFrequentPolylines] = React.useState<
    google.maps.Polyline[] | null
  >(null);
  React.useEffect(() => {
    if (!frequentPolylines) return;
    if (frequent) frequentPolylines.forEach((polyline) => polyline.setMap(map));
    else frequentPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, frequent, frequentPolylines]);

  const [standard, setStandard] = React.useState(true);
  const [standardPolylines, setStandardPolylines] = React.useState<
    google.maps.Polyline[] | null
  >(null);
  React.useEffect(() => {
    if (!standardPolylines) return;
    if (standard) standardPolylines.forEach((polyline) => polyline.setMap(map));
    else standardPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, standard, standardPolylines]);

  const [peakExpressExtended, setPeakExpressExtended] = React.useState(true);
  const [peakExpressExtendedPolylines, setPeakExpressExtendedPolylines] =
    React.useState<google.maps.Polyline[] | null>(null);
  React.useEffect(() => {
    if (!peakExpressExtendedPolylines) return;
    if (peakExpressExtended)
      peakExpressExtendedPolylines.forEach((polyline) => polyline.setMap(map));
    else
      peakExpressExtendedPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, peakExpressExtended, peakExpressExtendedPolylines]);

  const [midnight, setMidnight] = React.useState(false);
  const [midnightPolylines, setMidnightPolylines] = React.useState<
    google.maps.Polyline[] | null
  >(null);
  React.useEffect(() => {
    if (!midnightPolylines) return;
    if (midnight) midnightPolylines.forEach((polyline) => polyline.setMap(map));
    else midnightPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, midnight, midnightPolylines]);

  const [ferry, setFerry] = React.useState(true);
  const [ferryPolylines, setFerryPolylines] = React.useState<
    google.maps.Polyline[] | null
  >(null);
  React.useEffect(() => {
    if (!ferryPolylines) return;
    if (ferry) ferryPolylines.forEach((polyline) => polyline.setMap(map));
    else ferryPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, ferry, ferryPolylines]);

  const [cableCar, setCableCar] = React.useState(true);
  const [cableCarPolylines, setCableCarPolylines] = React.useState<
    google.maps.Polyline[] | null
  >(null);
  React.useEffect(() => {
    if (!cableCarPolylines) return;
    if (cableCar) cableCarPolylines.forEach((polyline) => polyline.setMap(map));
    else cableCarPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, cableCar, cableCarPolylines]);

  const [schoolBus, setSchoolBus] = React.useState(false);
  const [schoolBusPolylines, setSchoolPolylines] = React.useState<
    google.maps.Polyline[] | null
  >(null);
  React.useEffect(() => {
    if (!schoolBusPolylines) return;
    if (schoolBus)
      schoolBusPolylines.forEach((polyline) => polyline.setMap(map));
    else schoolBusPolylines.forEach((polyline) => polyline.setMap(null));
  }, [map, schoolBus, schoolBusPolylines]);

  React.useEffect(() => {
    async function update() {
      if (routeMap === null || shapeMap === null || tripMap === null) return;
      const response = await fetch("/api/vehiclepositions");
      const vehiclepositions: VehiclePositions = await response.json();
      const { entity } = vehiclepositions;
      const markers: JSX.Element[] = [];
      entity.forEach((entity: Entity) => {
        const { vehicle } = entity;
        const route = routeMap.get(vehicle.trip.route_id);
        if (!route) return null;
        const { strokeColor } = getRouteColor(route);
        markers.push(
          <Point
            key={vehicle.vehicle.id}
            map={map}
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
              const bounds = new google.maps.LatLngBounds();
              path.forEach((point) => bounds.extend(point));
              const zIndex = zIndexGen(
                vehicle.vehicle.id,
                ZIndexLayer.POLYLINE_SELECTED
              );
              // outline
              polylines.current[1] = new google.maps.Polyline({
                path,
                strokeColor: "#ffffff",
                strokeWeight: 9,
                zIndex: zIndex - 1,
              });
              // fill
              polylines.current[0] = new google.maps.Polyline({
                path,
                strokeColor,
                strokeWeight: 6,
                zIndex: zIndex,
              });
              if (!map) return;
              polylines.current?.forEach((polyline) => polyline.setMap(map));
              map.fitBounds(bounds);
            }}
            route={route}
            vehicle={vehicle}
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
    <div className={styles["maps-container"]}>
      <Drawer
        sx={{
          width: 300,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 300,
            boxSizing: "border-box",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar>
          <Typography variant="h6" noWrap>
            Wellington Maps
          </Typography>
        </Toolbar>
        <Divider />
        <FormGroup className={styles["maps-drawer"]}>
          <FormControlLabel
            control={
              <Checkbox
                checked={rail}
                onChange={() => setRail(!rail)}
                size="small"
              />
            }
            label="Rail"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={
                  frequent &&
                  standard &&
                  peakExpressExtended &&
                  midnight &&
                  schoolBus
                }
                indeterminate={
                  (frequent ||
                    standard ||
                    peakExpressExtended ||
                    midnight ||
                    schoolBus) &&
                  !(
                    frequent &&
                    standard &&
                    peakExpressExtended &&
                    midnight &&
                    schoolBus
                  )
                }
                onChange={() => {
                  const state =
                    frequent ||
                    standard ||
                    peakExpressExtended ||
                    midnight ||
                    schoolBus;
                  setFrequent(!state);
                  setStandard(!state);
                  setPeakExpressExtended(!state);
                  setMidnight(!state);
                  setSchoolBus(!state);
                }}
                size="small"
              />
            }
            label="Bus"
          />
          <Box sx={{ display: "flex", flexDirection: "column", ml: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={frequent}
                  onChange={() => setFrequent(!frequent)}
                  size="small"
                />
              }
              label="Frequent"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={standard}
                  onChange={() => setStandard(!standard)}
                  size="small"
                />
              }
              label="Standard"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={peakExpressExtended}
                  onChange={() => setPeakExpressExtended(!peakExpressExtended)}
                  size="small"
                />
              }
              label="Peak, Express, Extended"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={midnight}
                  onChange={() => setMidnight(!midnight)}
                  size="small"
                />
              }
              label="Midnight"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={schoolBus}
                  onChange={() => setSchoolBus(!schoolBus)}
                  size="small"
                />
              }
              label="School"
            />
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={ferry}
                onChange={() => setFerry(!ferry)}
                size="small"
              />
            }
            label="Ferry"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={cableCar}
                onChange={() => setCableCar(!cableCar)}
                size="small"
              />
            }
            label="Cable Car"
          />
        </FormGroup>
      </Drawer>
      <div id="map" className={styles["maps-map"]} />
      {markers}
    </div>
  );
}

export function zIndexGen(id: string | number, layer: ZIndexLayer) {
  return Z_INDEX_BUFFER * layer - parseInt(String(id));
}

async function getRouteMap() {
  const response = await fetch("/api/routes");
  if (!response.ok) return null;
  const routes: Route[] = await response.json();
  const routeMap = new Map<number, Route>();
  for (const route of routes) {
    const route_id = parseInt(route.route_id);
    routeMap.set(route_id, route);
  }
  return routeMap;
}

async function getShapeMap() {
  const response = await fetch("/api/shapes");
  if (!response.ok) return null;
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
  if (!response.ok) return null;
  const trips: Trip[] = await response.json();
  const tripMap = new Map<string, Trip>();
  for (const trip of trips) {
    tripMap.set(trip.trip_id, trip);
  }
  return tripMap;
}

export default Maps;
