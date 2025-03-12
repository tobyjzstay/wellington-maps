// @refresh reset
"use client";

import { GoogleMap } from "@react-google-maps/api";
import React from "react";
import simplify from "simplify-js";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Stop } from "./api/stops/route";
import { Transfer } from "./api/transfers/route";
import { Trip } from "./api/trips/route";
import {
  VehiclePosition,
  VehiclePositions,
} from "./api/vehiclepositions/route";
import { Filters, Visibility } from "./filters";
import { Information } from "./information";
import styles from "./maps.module.css";
import { Stops } from "./stops";
import {
  BusRouteType,
  getBusRouteType,
  getRouteColors,
  getRouteMap,
  getShapeMap,
  getStopMap,
  getTransferMap,
  getTripMap,
  getZIndex,
  RouteId,
  RouteType,
  ZIndexLayer,
} from "./util";
import { Vehicles } from "./vehicles";

const CENTER = { lat: -41.25, lng: 174.85 };
const UPDATE_INTERVAL = 5000;
const ZOOM = 12;
const ZOOM_DEBOUNCE = 1000;

export type Selected = {
  polylines: google.maps.Polyline[];
  trip: Trip | null;
};

export const MapContext = React.createContext<{
  map: google.maps.Map | null;
  routeMap: Map<RouteId, Route> | null;
  shapesMap: Map<Shape["shape_id"], Shape[]> | null;
  tripMap: Map<Trip["trip_id"], Trip> | null;
  transferMap: Map<
    Transfer["from_stop_id"] | Transfer["to_stop_id"],
    Transfer[]
  > | null;
  visibility: Visibility;
  getVisibility: (
    routeType: RouteType,
    busRouteType?: BusRouteType | null
  ) => boolean;
  setVisibility: React.Dispatch<React.SetStateAction<Visibility>>;
  selected: Selected;
  setSelected: React.Dispatch<React.SetStateAction<Selected>>;
}>(Object.create(null));
export const MarkersMapContext = React.createContext<React.MutableRefObject<
  Map<string, google.maps.marker.AdvancedMarkerElement[]>
> | null>(null);

const routeIdValues = Object.values(RouteId);

function Maps() {
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [selected, setSelected] = React.useState<Selected>({
    polylines: [],
    trip: null,
  });
  const [zoom, setZoom] = React.useState(ZOOM);
  const zoomTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const onMapLoad = (map: google.maps.Map) => {
    map.setOptions({
      center: CENTER,
      clickableIcons: false,
      disableDefaultUI: true,
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      scaleControl: true,
      zoom: ZOOM,
      zoomControl: true,
    });
    setMap(map);
  };

  const updateZoom = React.useCallback(() => {
    if (map) setZoom(map.getZoom()!);
  }, [map]);

  React.useEffect(() => {
    if (!map) return;
    map.addListener("zoom_changed", () => {
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
      zoomTimeoutRef.current = setTimeout(() => {
        updateZoom();
      }, ZOOM_DEBOUNCE);
    });
  }, [map, updateZoom]);

  React.useEffect(() => {
    if (!map) return;
    map.addListener("click", () => {
      setSelected((prev) => {
        prev.polylines.forEach((polyline) => polyline.setMap(null));
        return { polylines: [], trip: null };
      });
    });
  }, [map, selected]);

  const [routeMap, setRouteMap] = React.useState<Map<RouteId, Route> | null>(
    null
  );
  const [shapesMap, setShapesMap] = React.useState<Map<
    Shape["shape_id"],
    Shape[]
  > | null>(null);
  const [tripMap, setTripMap] = React.useState<Map<
    Trip["trip_id"],
    Trip
  > | null>(null);
  const [stopMap, setStopMap] = React.useState<Map<
    Stop["stop_id"],
    Stop
  > | null>(null);
  const [transferMap, setTransferMap] = React.useState<Map<
    Transfer["from_stop_id"] | Transfer["to_stop_id"],
    Transfer[]
  > | null>(null);
  React.useEffect(() => {
    Promise.all([
      getRouteMap(),
      getShapeMap(),
      getStopMap(),
      getTripMap(),
      getTransferMap(),
    ]).then(([routes, shapes, stops, trips, transfers]) => {
      // TODO: handle null
      setRouteMap(routes);
      setShapesMap(shapes);
      setStopMap(stops);
      setTripMap(trips);
      setTransferMap(transfers);
    });
  }, []);

  const [vehicleMap, setVehicleMap] = React.useState<
    Map<string, VehiclePosition>
  >(new Map());

  const [visibility, setVisibility] = React.useState<Visibility>({
    rail: true,
    frequent: true,
    standard: true,
    peakExpressExtended: true,
    midnight: false,
    ferry: true,
    cableCar: true,
    schoolBus: false,
    vehicleType: false,
  });

  const getVisibility = React.useCallback(
    (routeType: RouteType, busRouteType?: BusRouteType | null) => {
      const visibilityMap = {
        [RouteType.RAIL]: visibility.rail,
        [RouteType.FERRY]: visibility.ferry,
        [RouteType.CABLE_CAR]: visibility.cableCar,
        [RouteType.SCHOOL_BUS]: visibility.schoolBus,
        [RouteType.BUS]: {
          [BusRouteType.FREQUENT]: visibility.frequent,
          [BusRouteType.STANDARD]: visibility.standard,
          [BusRouteType.PEAK_EXPRESS_EXTENDED]: visibility.peakExpressExtended,
          [BusRouteType.MIDNIGHT]: visibility.midnight,
        },
      };

      return routeType === RouteType.BUS
        ? visibilityMap[RouteType.BUS][busRouteType!] ?? false
        : visibilityMap[routeType] ?? false;
    },
    [visibility]
  );

  const busRoutePolylinesRef = React.useRef<
    Map<BusRouteType, google.maps.Polyline[]>
  >(new Map());
  const routePolylinesRef = React.useRef<
    Map<RouteType, google.maps.Polyline[]>
  >(new Map());

  React.useEffect(() => {
    if (!map || !routeMap || !shapesMap || !tripMap) return;
    const drawnShapeIds: string[] = [];

    const strokeWeight = (index: number) => {
      return 2 * Math.pow(1.2, zoom - ZOOM) * (1 + 0.5 * index);
    };

    if (busRoutePolylinesRef.current.size !== 0)
      [busRoutePolylinesRef, routePolylinesRef].forEach((polylinesRef) => {
        polylinesRef.current.forEach((polylines) => {
          polylines.forEach((polyline, index) => {
            const trip_id = (polyline as any).id;
            const trip = tripMap.get(trip_id);
            const { route_id, shape_id } = trip!;
            const route = routeMap.get(route_id);
            const { route_type } = route!;
            const busRouteType = getBusRouteType(route_id);
            if (!shape_id) return;
            const shapes = shapesMap.get(shape_id);
            const visible = getVisibility(route_type, busRouteType);
            if (!shapes) {
              if (process.env.NODE_ENV === "development")
                console.warn("Shape not found:", shape_id);
              return;
            }

            const path = shapes.map(({ shape_pt_lat, shape_pt_lon }) => ({
              lat: shape_pt_lat,
              lng: shape_pt_lon,
            }));
            const tolerance = 0.0001 * Math.pow(2, ZOOM - zoom);
            const simplifiedPoints = simplify(
              path.map((point) => ({ x: point.lng, y: point.lat })),
              tolerance,
              true
            );
            const simplifiedPath = simplifiedPoints.map((point) => ({
              lat: point.y,
              lng: point.x,
            }));

            polyline.setOptions({
              path: simplifiedPath,
              strokeWeight: strokeWeight(index % 2),
              visible,
            });
          });
        });
      });
    else
      tripMap.forEach((trip) => {
        const { trip_id, route_id, shape_id } = trip;

        if (!shape_id || drawnShapeIds.includes(shape_id)) return;
        else drawnShapeIds.push(shape_id);

        const route = routeMap.get(route_id);
        if (!route) {
          if (process.env.NODE_ENV === "development")
            console.warn("Route not found:", route_id);
          return;
        }

        const { route_type } = route;
        const shapes = shapesMap.get(shape_id);
        if (!shapes) {
          if (process.env.NODE_ENV === "development")
            console.warn("Shape not found:", shape_id);
          return;
        }

        const path = shapes.map((shape) => ({
          lat: shape.shape_pt_lat,
          lng: shape.shape_pt_lon,
        }));
        const tolerance = 0.0001 * Math.pow(2, ZOOM - zoom);
        const simplifiedPoints = simplify(
          path.map((point) => ({ x: point.lng, y: point.lat })),
          tolerance,
          true
        );
        const simplifiedPath = simplifiedPoints.map((point) => ({
          lat: point.y,
          lng: point.x,
        }));
        const bounds = new google.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));

        const id = routeIdValues.indexOf(route_id);
        if (id === -1) {
          if (process.env.NODE_ENV === "development")
            console.warn("Route ID not found:", route_id);
          return;
        }
        const zIndex = getZIndex(id, ZIndexLayer.POLYLINE);
        const busRouteType = getBusRouteType(route_id);
        if (route_type === RouteType.BUS && busRouteType === null) {
          if (process.env.NODE_ENV === "development")
            console.warn("Bus route type not found:", route_id);
          return;
        }
        const strokeColor = "#ffffff";
        const strokeWeight = 2 * Math.pow(1.2, zoom - ZOOM);
        const { polylineColor } = getRouteColors(route);
        const visible = getVisibility(route_type, busRouteType);
        const onClick = () => {
          const zIndex = getZIndex(id, ZIndexLayer.POLYLINE_SELECTED);
          const fill = new google.maps.Polyline({
            id: trip_id,
            map,
            path,
            strokeColor: polylineColor,
            strokeWeight: strokeWeight * 3,
            zIndex,
          } as any);
          const stroke = new google.maps.Polyline({
            id: trip_id,
            map,
            path,
            strokeColor,
            strokeWeight: strokeWeight * 1.5 * 3,
            zIndex: zIndex - 1,
          } as any);
          setSelected((prev) => {
            prev.polylines.forEach((polyline) => polyline.setMap(null));
            return { polylines: [fill, stroke], trip: null };
          });
          map.fitBounds(bounds);
        };

        const fill = new google.maps.Polyline({
          map,
          path: simplifiedPath,
          strokeColor: polylineColor,
          strokeWeight,
          visible,
          zIndex,
        });
        const stroke = new google.maps.Polyline({
          map,
          path: simplifiedPath,
          strokeColor,
          strokeWeight: strokeWeight * 1.5,
          visible,
          zIndex: zIndex - 1,
        });
        (stroke as any).id = trip_id;
        (fill as any).id = trip_id;
        const polylines = [fill, stroke];
        polylines.forEach((polyline) => polyline.addListener("click", onClick));

        if (route_type === RouteType.BUS) {
          const busRoutePolylines =
            busRoutePolylinesRef.current.get(busRouteType!) ??
            busRoutePolylinesRef.current
              .set(busRouteType!, [])
              .get(busRouteType!)!;
          busRoutePolylines.push(...polylines);
        } else {
          const routePolylines =
            routePolylinesRef.current.get(route_type) ??
            routePolylinesRef.current.set(route_type, []).get(route_type)!;
          routePolylines.push(...polylines);
        }
      });
  }, [getVisibility, map, routeMap, shapesMap, tripMap, zoom]);

  const markersMapRef = React.useRef(
    new Map<string, google.maps.marker.AdvancedMarkerElement[]>()
  );
  React.useEffect(() => {
    if (!routeMap || !shapesMap || !tripMap) return;
    let interval: NodeJS.Timeout;
    (async () => {
      update();
      interval = setInterval(update, UPDATE_INTERVAL);
    })();
    return () => clearInterval(interval);

    async function update() {
      const response = await fetch("/api/vehiclepositions");
      try {
        const vehiclepositions: VehiclePositions = await response.json();

        // TODO: fix triggering twice
        setVehicleMap((prevVehicleMap) => {
          const updatedVehicleIds = new Set<string>();
          const newVehicleMap = new Map(prevVehicleMap);
          vehiclepositions.entity?.forEach((entity) => {
            const { vehicle } = entity;
            const vehicleId = vehicle.vehicle?.id;
            if (!vehicleId) return;
            newVehicleMap.set(vehicleId, vehicle);
            updatedVehicleIds.add(vehicleId);
          });
          prevVehicleMap.forEach((_, vehicleId) => {
            if (!updatedVehicleIds.has(vehicleId)) {
              newVehicleMap.delete(vehicleId);
              const markers = markersMapRef.current.get(vehicleId);
              if (markers) {
                markers.forEach((marker) => (marker.map = null));
                markersMapRef.current.delete(vehicleId);
              }
            }
          });
          return newVehicleMap;
        });
      } catch (error) {}
    }
  }, [routeMap, shapesMap, tripMap]);

  return (
    <div className={styles["maps-container"]}>
      <MapContext.Provider
        value={{
          map,
          routeMap,
          shapesMap,
          tripMap,
          transferMap,
          visibility,
          getVisibility,
          setVisibility,
          selected,
          setSelected,
        }}
      >
        <Filters />
        <Information />
        <MarkersMapContext.Provider value={markersMapRef}>
          <div className={styles["maps-map"]}>
            <GoogleMap onLoad={onMapLoad}>
              <Vehicles
                map={map}
                routeMap={routeMap}
                shapesMap={shapesMap}
                tripMap={tripMap}
                vehicleMap={vehicleMap}
                getVisibility={getVisibility}
                setSelected={setSelected}
                visibility={visibility}
              />
              <Stops map={map} stopMap={stopMap} transferMap={transferMap} />
            </GoogleMap>
          </div>
        </MarkersMapContext.Provider>
      </MapContext.Provider>
    </div>
  );
}

export default Maps;
