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
import { GoogleMap } from "@react-google-maps/api";
import React from "react";
import simplify from "simplify-js";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Trip } from "./api/trips/route";
import { Vehicle, VehiclePositions } from "./api/vehiclepositions/route";
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

const CENTER = { lat: -41.2529601, lng: 174.7542577 };
const UPDATE_INTERVAL = 5000;
const ZOOM = 12;
const ZOOM_DEBOUNCE = 1000;

export const MapContext = React.createContext<google.maps.Map | null>(null);
export const MarkersMapContext = React.createContext<React.MutableRefObject<
  Map<string, google.maps.marker.AdvancedMarkerElement[]>
> | null>(null);

const routeIdValues = Object.values(RouteId);

function Maps() {
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = React.useState(ZOOM);
  const zoomTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const onMapLoad = (map: google.maps.Map) => {
    map.setOptions({
      center: CENTER,
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      keyboardShortcuts: false,
      zoom: ZOOM,
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

  const [selectedPolylines, setSelectedPolylines] = React.useState<
    google.maps.Polyline[]
  >([]);

  React.useEffect(() => {
    if (!map) return;
    map.addListener("click", () => {
      selectedPolylines.forEach((polyline) => polyline.setMap(null));
      setSelectedPolylines([]);
    });
  }, [map, selectedPolylines]);

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
        setRouteMap(routes);
        setShapesMap(shapes);
        setTripMap(trips);
      }
    );
  }, []);

  const [vehicleMap, setVehicleMap] = React.useState<Map<string, Vehicle>>(
    new Map()
  );

  const [rail, setRail] = React.useState(true);
  const [frequent, setFrequent] = React.useState(true);
  const [standard, setStandard] = React.useState(true);
  const [peakExpressExtended, setPeakExpressExtended] = React.useState(true);
  const [midnight, setMidnight] = React.useState(false);
  const [ferry, setFerry] = React.useState(true);
  const [cableCar, setCableCar] = React.useState(true);
  const [schoolBus, setSchoolBus] = React.useState(false);

  const getVisibility = React.useCallback(
    (routeType: RouteType, busRouteType?: BusRouteType | null) => {
      const visibilityMap = {
        [RouteType.RAIL]: rail,
        [RouteType.FERRY]: ferry,
        [RouteType.CABLE_CAR]: cableCar,
        [RouteType.SCHOOL_BUS]: schoolBus,
        [RouteType.BUS]: {
          [BusRouteType.FREQUENT]: frequent,
          [BusRouteType.STANDARD]: standard,
          [BusRouteType.PEAK_EXPRESS_EXTENDED]: peakExpressExtended,
          [BusRouteType.MIDNIGHT]: midnight,
        },
      };

      return routeType === RouteType.BUS
        ? visibilityMap[RouteType.BUS][busRouteType!] ?? false
        : visibilityMap[routeType] ?? false;
    },
    [
      rail,
      ferry,
      cableCar,
      schoolBus,
      frequent,
      standard,
      peakExpressExtended,
      midnight,
    ]
  );
  const [polylinesCounter, setPolylinesCounter] = React.useState(0);
  const busRoutePolylinesRef = React.useRef<
    Map<BusRouteType, google.maps.Polyline[]>
  >(new Map());
  const routePolylinesRef = React.useRef<
    Map<RouteType, google.maps.Polyline[]>
  >(new Map());

  React.useEffect(() => {
    if (!map || !routeMap || !shapesMap || !tripMap) return;
    const drawnShapeIds: string[] = [];

    [busRoutePolylinesRef, routePolylinesRef].forEach((polylinesRef) => {
      polylinesRef.current.forEach((polylines) =>
        polylines.forEach((polyline) => polyline.setMap(null))
      );
      polylinesRef.current.clear();
    });

    tripMap.forEach((trip) => {
      const { id, route_id: trip_route_id, shape_id } = trip;
      if (drawnShapeIds.includes(shape_id)) return;
      const route = routeMap.get(trip_route_id);
      if (!route) {
        console.warn("Route not found:", trip_route_id);
        return;
      }
      const { route_id, route_type } = route;
      const shapes = shapesMap.get(shape_id);
      if (!shapes) return;
      const { polylineColor } = getRouteColors(route);
      let path = shapes.map((shape) => ({
        lat: shape.shape_pt_lat,
        lng: shape.shape_pt_lon,
      }));

      const tolerance = 0.0001 * Math.pow(2, 12 - zoom);
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
      simplifiedPath.forEach((point) => bounds.extend(point));
      const onClick = () => {
        const zIndex = getZIndex(id, ZIndexLayer.POLYLINE_SELECTED);
        const outline = new google.maps.Polyline({
          path,
          strokeColor: "#ffffff",
          strokeWeight: 9,
          zIndex: zIndex - 1,
        });
        const fill = new google.maps.Polyline({
          path,
          strokeColor: polylineColor,
          strokeWeight: 6,
          zIndex: zIndex,
        });
        setSelectedPolylines([outline, fill]);
        map.fitBounds(bounds);
      };
      const zIndex = getZIndex(
        routeIdValues.indexOf(route_id),
        ZIndexLayer.POLYLINE
      );
      const busRouteType = getBusRouteType(route_id);
      if (route_type === RouteType.BUS && busRouteType === null) {
        console.warn("Bus route type not found:", route_id);
        return;
      }
      const outline = new google.maps.Polyline({
        path: simplifiedPath,
        strokeColor: "#ffffff",
        strokeWeight: 3,
        visible: getVisibility(route_type, busRouteType),
        zIndex: zIndex - 1,
      });
      outline.addListener("click", onClick);
      const fill = new google.maps.Polyline({
        path: simplifiedPath,
        strokeColor: polylineColor,
        strokeWeight: 2,
        visible: getVisibility(route_type, busRouteType),
        zIndex: zIndex,
      });
      fill.addListener("click", onClick);

      drawnShapeIds.push(shape_id);

      if (route_type === RouteType.BUS) {
        if (!busRoutePolylinesRef.current.has(busRouteType!))
          busRoutePolylinesRef.current.set(busRouteType!, []);
        const busRoutePolylines = busRoutePolylinesRef.current.get(
          busRouteType!
        );
        if (!busRoutePolylines) {
          console.warn("Bus route polylines not found:", busRouteType);
          return;
        }
        busRoutePolylines.push(outline, fill);
      } else {
        if (!routePolylinesRef.current.has(route_type))
          routePolylinesRef.current.set(route_type, []);
        const routePolylines = routePolylinesRef.current.get(route_type);
        if (!routePolylines) {
          console.warn("Route polylines not found:", route_type);
          return;
        }
        routePolylines.push(outline, fill);
      }
    });
    setPolylinesCounter((prev) => prev + 1);
  }, [getVisibility, map, routeMap, shapesMap, tripMap, zoom]);

  React.useEffect(() => {
    if (!map) return;
    routePolylinesRef.current.forEach((polylines, routeType) => {
      const isVisible = getVisibility(routeType);
      polylines.forEach((polyline) => polyline.setMap(isVisible ? map : null));
    });
    busRoutePolylinesRef.current.forEach((polylines, routeType) => {
      const isVisible = getVisibility(RouteType.BUS, routeType);
      polylines.forEach((polyline) => polyline.setMap(isVisible ? map : null));
    });
  }, [getVisibility, map, polylinesCounter]);

  React.useEffect(() => {
    if (!map) return;
    selectedPolylines.forEach((polyline) => polyline.setMap(map));
    return () => {
      selectedPolylines.forEach((polyline) => polyline.setMap(null));
    };
  }, [selectedPolylines, map]);

  const markersMapRef = React.useRef(
    new Map<string, google.maps.marker.AdvancedMarkerElement[]>()
  );
  const [vehicleType, setVehicleType] = React.useState(false);
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
    }
  }, [routeMap, shapesMap, tripMap, getVisibility]);

  return (
    <GoogleMap onLoad={onMapLoad}>
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
                    onChange={() =>
                      setPeakExpressExtended(!peakExpressExtended)
                    }
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
        <MapContext.Provider value={map}>
          <MarkersMapContext.Provider value={markersMapRef}>
            <div className={styles["maps-map"]} />
            <>
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

                      console.log("clicked", vehicle);

                      const bounds = new google.maps.LatLngBounds();
                      path.forEach((point) => bounds.extend(point));

                      const zIndex = getZIndex(
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
                        strokeColor: polylineColor,
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
              })}
            </>
          </MarkersMapContext.Provider>
        </MapContext.Provider>
      </div>
    </GoogleMap>
  );
}

export default Maps;
