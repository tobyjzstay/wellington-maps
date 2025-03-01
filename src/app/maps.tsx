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
import simplify from "simplify-js";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Trip } from "./api/trips/route";
import { Entity, VehiclePositions } from "./api/vehiclepositions/route";
import styles from "./maps.module.css";
import { Point } from "./point";
import {
  BusRouteType,
  RouteId,
  RouteType,
  getBusRouteType,
  getRouteColor,
} from "./util";

const CENTER = { lat: -41.2529601, lng: 174.7542577 };
const UPDATE_INTERVAL = 5000;
const Z_INDEX_BUFFER = 10000;

export enum ZIndexLayer {
  POLYLINE,
  POLYLINE_SELECTED,
  MARKER,
}

export const MapContext = React.createContext<google.maps.Map | null>(null);

const routeIdValues = Object.values(RouteId);

function Maps() {
  const [routeMap, setRouteMap] = React.useState<Map<number, Route> | null>(
    null
  );
  const [shapeMap, setShapeMap] = React.useState<Map<string, Shape[]> | null>(
    null
  );
  const [tripMap, setTripMap] = React.useState<Map<string, Trip> | null>(null);
  const [zoom, setZoom] = React.useState(12);
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
    const map = new google.maps.Map(mapElement, {
      center: CENTER,
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
      zoom,
    });

    map?.addListener("click", () => {
      setSelectedPolylines([]);
    });

    map.addListener("zoom_changed", () => {
      setZoom(map.getZoom()!);
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapElement]);

  const [selectedPolylines, setSelectedPolylines] = React.useState<
    google.maps.Polyline[]
  >([]);

  React.useEffect(() => {
    if (routeMap === null || shapeMap === null || tripMap === null) return;

    const drawnShapes: string[] = [];
    const newRoutePolylines = new Map<RouteType, google.maps.Polyline[]>();
    const newBusRoutePolylines = new Map<
      BusRouteType,
      google.maps.Polyline[]
    >();

    Array.from(tripMap.values()).forEach((trip) => {
      const { id, route_id: trip_route_id, shape_id } = trip;
      const route = routeMap.get(trip_route_id);
      if (!route || drawnShapes.includes(shape_id)) return;
      const { route_id, route_type } = route;
      const shapes = shapeMap.get(shape_id);
      if (!shapes) return;
      const { strokeColor } = getRouteColor(route);
      let path = shapes.map((shape) => ({
        lat: shape.shape_pt_lat,
        lng: shape.shape_pt_lon,
      }));

      const tolerance = 0.0001 * Math.pow(2, 12 - zoom);
      const simplifiedPath = simplify(
        path.map((point) => ({ x: point.lng, y: point.lat })),
        tolerance,
        true
      );
      path = simplifiedPath.map((point) => ({ lat: point.y, lng: point.x }));

      const bounds = new google.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(point));
      const onClick = () => {
        if (!map) return;
        const zIndex = zIndexGen(id, ZIndexLayer.POLYLINE_SELECTED);
        selectedPolylines.forEach((polyline) => polyline.setMap(null));
        const outline = new google.maps.Polyline({
          path,
          strokeColor: "#ffffff",
          strokeWeight: 9,
          zIndex: zIndex - 1,
        });
        const fill = new google.maps.Polyline({
          path,
          strokeColor,
          strokeWeight: 6,
          zIndex: zIndex,
        });
        setSelectedPolylines([outline, fill]);
        map.fitBounds(bounds);
      };
      const zIndex = zIndexGen(
        routeIdValues.indexOf(route_id),
        ZIndexLayer.POLYLINE
      );
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

      drawnShapes.push(shape_id);

      if (route_type === RouteType.BUS) {
        const busRouteType = getBusRouteType(route_id)!;
        if (!newBusRoutePolylines.has(busRouteType))
          newBusRoutePolylines.set(busRouteType, []);
        newBusRoutePolylines.get(busRouteType)!.push(outline, fill);
      } else {
        if (!newRoutePolylines.has(route_type))
          newRoutePolylines.set(route_type, []);
        newRoutePolylines.get(route_type)!.push(outline, fill);
      }
    });
    setBusRoutePolylines(newBusRoutePolylines);
    setRoutePolylines(newRoutePolylines);
    return () => {
      newRoutePolylines.forEach((polylines) =>
        polylines.forEach((polyline) => polyline.setMap(null))
      );
      newBusRoutePolylines.forEach((polylines) =>
        polylines.forEach((polyline) => polyline.setMap(null))
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routeMap, shapeMap, tripMap, zoom]);

  const [markers, setMarkers] = React.useState<JSX.Element[]>([]);

  const [routePolylines, setRoutePolylines] = React.useState<
    Map<RouteType, google.maps.Polyline[]>
  >(new Map());
  const [busRoutePolylines, setBusRoutePolylines] = React.useState<
    Map<BusRouteType, google.maps.Polyline[]>
  >(new Map());

  const [rail, setRail] = React.useState(true);
  const [frequent, setFrequent] = React.useState(true);
  const [standard, setStandard] = React.useState(true);
  const [peakExpressExtended, setPeakExpressExtended] = React.useState(true);
  const [midnight, setMidnight] = React.useState(false);
  const [ferry, setFerry] = React.useState(true);
  const [cableCar, setCableCar] = React.useState(true);
  const [schoolBus, setSchoolBus] = React.useState(false);

  const getVisibility = React.useCallback(
    (routeType: RouteType, busRouteType?: BusRouteType) => {
      switch (routeType) {
        case RouteType.RAIL:
          return rail;
        case RouteType.BUS:
          switch (busRouteType) {
            case BusRouteType.FREQUENT:
              return frequent;
            case BusRouteType.STANDARD:
              return standard;
            case BusRouteType.PEAK_EXPRESS_EXTENDED:
              return peakExpressExtended;
            case BusRouteType.MIDNIGHT:
              return midnight;
            default:
              return false;
          }
        case RouteType.FERRY:
          return ferry;
        case RouteType.CABLE_CAR:
          return cableCar;
        case RouteType.SCHOOL_BUS:
          return schoolBus;
        case RouteType.BUS:
        default:
          return false;
      }
    },
    [
      rail,
      frequent,
      standard,
      peakExpressExtended,
      midnight,
      ferry,
      cableCar,
      schoolBus,
    ]
  );

  React.useEffect(() => {
    if (!map) return;
    routePolylines.forEach((polylines, routeType) => {
      const isVisible = getVisibility(routeType);
      polylines.forEach((polyline) => polyline.setMap(isVisible ? map : null));
    });
    busRoutePolylines.forEach((polylines, routeType) => {
      const isVisible = getVisibility(RouteType.BUS, routeType);
      polylines.forEach((polyline) => polyline.setMap(isVisible ? map : null));
    });
  }, [map, routePolylines, busRoutePolylines, getVisibility]);

  React.useEffect(() => {
    if (!map) return;
    selectedPolylines.forEach((polyline) => polyline.setMap(map));
    return () => {
      selectedPolylines.forEach((polyline) => polyline.setMap(null));
    };
  }, [selectedPolylines, map]);

  const [vehicleType, setVehicleType] = React.useState(false);
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
        const { route_id, route_type } = route;
        const busRouteType = getBusRouteType(route_id)!;
        markers.push(
          <Point
            key={vehicle.vehicle.id}
            map={map}
            onClick={() => {
              if (!map) return;
              selectedPolylines.forEach((polyline) => polyline.setMap(null));

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
                parseInt(vehicle.vehicle.id),
                ZIndexLayer.POLYLINE_SELECTED
              );

              const outline = new google.maps.Polyline({
                path,
                strokeColor: "#ffffff",
                strokeWeight: 9,
                zIndex: zIndex - 1,
              });
              const fill = new google.maps.Polyline({
                path,
                strokeColor,
                strokeWeight: 6,
                zIndex: zIndex,
              });
              setSelectedPolylines([outline, fill]);
              map.fitBounds(bounds);
            }}
            route={route}
            vehicle={vehicle}
            vehicleType={vehicleType}
            visible={getVisibility(route_type, busRouteType)}
          />
        );
      });
      setMarkers(markers);
    }

    let interval: NodeJS.Timeout;
    (async () => {
      update();
      interval = setInterval(update, UPDATE_INTERVAL);
    })();
    return () => clearInterval(interval);
  }, [
    cableCar,
    ferry,
    frequent,
    map,
    midnight,
    peakExpressExtended,
    routePolylines,
    busRoutePolylines,
    rail,
    routeMap,
    schoolBus,
    shapeMap,
    standard,
    tripMap,
    vehicleType,
    selectedPolylines,
    getVisibility,
  ]);

  return (
    <div className={styles["maps-container"]}>
      <Drawer
        anchor="left"
        className={styles["maps-drawer"]}
        variant="permanent"
      >
        <Toolbar>
          <Typography variant="h6" noWrap>
            Wellington Maps
          </Typography>
        </Toolbar>
        <Divider />
        <FormGroup className={styles["maps-drawer-options"]}>
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
          <Box className={styles["maps-drawer-options-bus"]}>
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
          <FormControlLabel
            className={styles["maps-drawer-options-other"]}
            control={
              <Checkbox
                checked={vehicleType}
                onChange={() => setVehicleType(!vehicleType)}
                size="small"
              />
            }
            label="Vehicle Type"
          />
        </FormGroup>
      </Drawer>
      <div id="map" className={styles["maps-map"]} />
      {markers}
    </div>
  );
}

export function zIndexGen(id: number, layer: ZIndexLayer) {
  return Z_INDEX_BUFFER * (layer + 1) - id;
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
