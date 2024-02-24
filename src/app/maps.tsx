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

  const [markers, setMarkers] = React.useState<JSX.Element[]>([]);

  const polylines = React.useRef<google.maps.Polyline[]>([]);
  const railPolylines = React.useRef<google.maps.Polyline[]>([]);
  const frequentPolylines = React.useRef<google.maps.Polyline[]>([]);
  const standardPolylines = React.useRef<google.maps.Polyline[]>([]);
  const peakExpressExtendedPolylines = React.useRef<google.maps.Polyline[]>([]);
  const midnightPolylines = React.useRef<google.maps.Polyline[]>([]);
  const ferryPolylines = React.useRef<google.maps.Polyline[]>([]);
  const cableCarPolylines = React.useRef<google.maps.Polyline[]>([]);
  const schoolBusPolylines = React.useRef<google.maps.Polyline[]>([]);

  const [rail, setRail] = React.useState(true);
  const [frequent, setFrequent] = React.useState(true);
  const [standard, setStandard] = React.useState(true);
  const [peakExpressExtended, setPeakExpressExtended] = React.useState(true);
  const [midnight, setMidnight] = React.useState(true);
  const [ferry, setFerry] = React.useState(true);
  const [cableCar, setCableCar] = React.useState(true);
  const [schoolBus, setSchoolBus] = React.useState(true);

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
    if (mapElement === null) return null;
    return new google.maps.Map(document.getElementById("map")!, {
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
        polylines.current?.forEach((polyline) => polyline.setMap(map));
      };
      const zIndex = zIndexGen(trip_route_id, ZIndexLayer.POLYLINE);
      const outline = new google.maps.Polyline({
        map,
        path,
        strokeColor: "#ffffff",
        strokeWeight: 3,
        zIndex: zIndex - 1,
      });
      outline.addListener("click", onClick);
      const fill = new google.maps.Polyline({
        map,
        path,
        strokeColor,
        strokeWeight: 2,
        zIndex: zIndex,
      });
      fill.addListener("click", onClick);
      switch (route_type) {
        case RouteType.RAIL:
          railPolylines.current.push(outline, fill);
          break;
        case RouteType.BUS:
          switch (getBusRouteType(route_id)) {
            case BusRouteType.FREQUENT:
              frequentPolylines.current.push(outline, fill);
              break;
            case BusRouteType.STANDARD:
              standardPolylines.current.push(outline, fill);
              break;
            case BusRouteType.PEAK_EXPRESS_EXTENDED:
              peakExpressExtendedPolylines.current.push(outline, fill);
              break;
            case BusRouteType.MIDNIGHT:
              midnightPolylines.current.push(outline, fill);
              break;
            default:
              break;
          }
          break;
        case RouteType.FERRY:
          ferryPolylines.current.push(outline, fill);
          break;
        case RouteType.CABLE_CAR:
          cableCarPolylines.current.push(outline, fill);
          break;
        case RouteType.SCHOOL_BUS:
          schoolBusPolylines.current.push(outline, fill);
          break;
        default:
          break;
      }
      drawnShapes.push(shape_id);
    });
  }, [map, routeMap, shapeMap, tripMap]);

  React.useEffect(() => {
    if (rail) railPolylines.current.forEach((polyline) => polyline.setMap(map));
    else railPolylines.current.forEach((polyline) => polyline.setMap(null));
  }, [map, rail]);

  React.useEffect(() => {
    if (frequent)
      frequentPolylines.current.forEach((polyline) => polyline.setMap(map));
    else frequentPolylines.current.forEach((polyline) => polyline.setMap(null));
  }, [map, frequent]);

  React.useEffect(() => {
    if (standard)
      standardPolylines.current.forEach((polyline) => polyline.setMap(map));
    else standardPolylines.current.forEach((polyline) => polyline.setMap(null));
  }, [map, standard]);

  React.useEffect(() => {
    if (peakExpressExtended)
      peakExpressExtendedPolylines.current.forEach((polyline) =>
        polyline.setMap(map)
      );
    else
      peakExpressExtendedPolylines.current.forEach((polyline) =>
        polyline.setMap(null)
      );
  }, [map, peakExpressExtended]);

  React.useEffect(() => {
    if (midnight)
      midnightPolylines.current.forEach((polyline) => polyline.setMap(map));
    else midnightPolylines.current.forEach((polyline) => polyline.setMap(null));
  }, [map, midnight]);

  React.useEffect(() => {
    if (ferry)
      ferryPolylines.current.forEach((polyline) => polyline.setMap(map));
    else ferryPolylines.current.forEach((polyline) => polyline.setMap(null));
  }, [map, ferry]);

  React.useEffect(() => {
    if (cableCar)
      cableCarPolylines.current.forEach((polyline) => polyline.setMap(map));
    else cableCarPolylines.current.forEach((polyline) => polyline.setMap(null));
  }, [map, cableCar]);

  React.useEffect(() => {
    if (schoolBus)
      schoolBusPolylines.current.forEach((polyline) => polyline.setMap(map));
    else
      schoolBusPolylines.current.forEach((polyline) => polyline.setMap(null));
  }, [map, schoolBus]);

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
              polylines.current?.forEach((polyline) => polyline.setMap(map));
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
                  frequent && standard && peakExpressExtended && midnight
                }
                indeterminate={
                  (frequent || standard || peakExpressExtended || midnight) &&
                  !(frequent && standard && peakExpressExtended && midnight)
                }
                onChange={() => {
                  const state =
                    frequent || standard || peakExpressExtended || midnight;
                  setFrequent(!state);
                  setStandard(!state);
                  setPeakExpressExtended(!state);
                  setMidnight(!state);
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
          <FormControlLabel
            control={
              <Checkbox
                checked={schoolBus}
                onChange={() => setSchoolBus(!schoolBus)}
                size="small"
              />
            }
            label="School Bus"
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
