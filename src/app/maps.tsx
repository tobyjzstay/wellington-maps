// @refresh reset
"use client";

import { GoogleMap } from "@react-google-maps/api";
import React from "react";
import simplify from "simplify-js";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Trip } from "./api/trips/route";
import { Vehicle, VehiclePositions } from "./api/vehiclepositions/route";
import { Filters, Visibility } from "./filters";
import { Information } from "./information";
import styles from "./maps.module.css";
import { Point } from "./point";
import {
  BusRouteType,
  getBusRouteType,
  getRouteColors,
  getRouteMap,
  getShapeMap,
  getTripMap,
  getZIndex,
  RouteId,
  RouteType,
  ZIndexLayer,
} from "./util";

const CENTER = { lat: -41.25, lng: 174.85 };
const UPDATE_INTERVAL = 5000;
const ZOOM = 12;
const ZOOM_DEBOUNCE = 1000;

type Selected = {
  polylines: google.maps.Polyline[];
  trip: Trip | null;
};

export const MapContext = React.createContext<{
  map: google.maps.Map | null;
  routeMap: Map<number, Route> | null;
  shapesMap: Map<string, Shape[]> | null;
  tripMap: Map<string, Trip> | null;
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
  const [selected, setSelected] = React.useState<Selected>(Object.create(null));
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

  const [routeMap, setRouteMap] = React.useState<Map<number, Route> | null>(
    null
  );
  const [shapesMap, setShapesMap] = React.useState<Map<string, Shape[]> | null>(
    null
  );
  const [tripMap, setTripMap] = React.useState<Map<string, Trip> | null>(null);
  React.useEffect(() => {
    Promise.all([getRouteMap(), getShapeMap(), getTripMap()]).then(
      ([routes, shapes, trips]) => {
        // TODO: handle null
        setRouteMap(routes);
        setShapesMap(shapes);
        setTripMap(trips);
      }
    );
  }, []);

  const [vehicleMap, setVehicleMap] = React.useState<Map<string, Vehicle>>(
    new Map()
  );

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
            const { route_id: trip_route_id, shape_id } = trip!;
            const route = routeMap.get(trip_route_id);
            const { route_id, route_type } = route!;
            const busRouteType = getBusRouteType(route_id);
            const shapes = shapesMap.get(shape_id);
            const visible = getVisibility(route_type, busRouteType);
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
        const { trip_id, route_id: trip_route_id, shape_id } = trip;

        if (drawnShapeIds.includes(shape_id)) return;
        else drawnShapeIds.push(shape_id);

        const route = routeMap.get(trip_route_id);
        if (!route) {
          if (process.env.NODE_ENV === "development")
            console.warn("Route not found:", trip_route_id);
          return;
        }

        const { route_id, route_type } = route;
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
          strokeOpacity: 0.5,
          strokeWeight,
          visible,
          zIndex,
        });
        const stroke = new google.maps.Polyline({
          map,
          path: simplifiedPath,
          strokeColor,
          strokeOpacity: 0.5,
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
          vehiclepositions.entity.forEach((entity) => {
            const { vehicle } = entity;
            const vehicleId = vehicle.vehicle.id;
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
  }, [routeMap, shapesMap, tripMap, getVisibility]);

  return (
    <div className={styles["maps-container"]}>
      <MapContext.Provider
        value={{
          map,
          routeMap,
          shapesMap,
          tripMap,
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
              {Array.from(vehicleMap).map(([vehicleId, vehicle]) => {
                if (!map || !routeMap || !shapesMap || !tripMap) return;
                const route = routeMap.get(vehicle.trip.route_id);
                if (!route) return null;
                const { polylineColor } = getRouteColors(route);
                const { route_id, route_type } = route;
                const busRouteType = getBusRouteType(route_id)!;
                return (
                  <Point
                    key={vehicleId}
                    onClick={() => {
                      if (!map || !tripMap || !shapesMap || !routeMap) return;
                      const trip_id = vehicle.trip.trip_id;
                      const trip = tripMap.get(trip_id);
                      if (!trip) return;

                      const { shape_id } = trip;
                      let shapes = shapesMap.get(shape_id);
                      if (!shapes) return;

                      const path = shapes.map((shape) => ({
                        lat: shape.shape_pt_lat,
                        lng: shape.shape_pt_lon,
                      }));

                      const bounds = new google.maps.LatLngBounds();
                      path.forEach((point) => bounds.extend(point));

                      const zIndex = getZIndex(
                        parseInt(vehicle.vehicle.id),
                        ZIndexLayer.POLYLINE_SELECTED
                      );

                      const fill = new google.maps.Polyline({
                        map,
                        path,
                        strokeColor: polylineColor,
                        strokeWeight: 6,
                        zIndex: zIndex,
                      });
                      const outline = new google.maps.Polyline({
                        map,
                        path,
                        strokeColor: "#ffffff",
                        strokeWeight: 9,
                        zIndex: zIndex - 1,
                      });
                      setSelected({ polylines: [fill, outline], trip });
                      map.fitBounds(bounds);
                    }}
                    route={route}
                    vehicle={vehicle}
                    vehicleType={visibility.vehicleType}
                    visible={getVisibility(route_type, busRouteType)}
                  />
                );
              })}
            </GoogleMap>
          </div>
        </MarkersMapContext.Provider>
      </MapContext.Provider>
    </div>
  );
}

export default Maps;
