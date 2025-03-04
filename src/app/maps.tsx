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
import {
  Entity,
  Vehicle,
  VehiclePositions,
} from "./api/vehiclepositions/route";
import styles from "./maps.module.css";
import { Point } from "./point";
import {
  BusRouteType,
  getBusRouteType,
  getRouteColor,
  getRouteMap,
  getShapeMap,
  getTripMap,
  getZIndex,
  RouteId,
  RouteType,
  ZIndexLayer,
} from "./util";

const CENTER = { lat: -41.2529601, lng: 174.7542577 };
const MARKER_ANIMATION_DURATION = 1000;
const MIN_PIXEL_MOVEMENT = 5;
const UPDATE_INTERVAL = 1000;
const ZOOM = 12;
const ZOOM_DEBOUNCE = 1000;

export const MapContext = React.createContext<google.maps.Map | null>(null);
export const MarkersMapContext = React.createContext<
  Map<String, google.maps.Marker[]>
>(new Map());

const routeIdValues = Object.values(RouteId);

function Maps() {
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = React.useState(ZOOM);
  const zoomTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const onMapLoad = (map: google.maps.Map) => {
    map.setOptions({
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

  const vehicleMapRef = React.useRef<Map<String, Vehicle>>(new Map());

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
      const { strokeColor } = getRouteColor(route);
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
          strokeColor,
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
        strokeColor,
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

  const markersMap = React.useContext(MarkersMapContext);
  const [markerElements, setMarkerElements] = React.useState<
    Map<String, JSX.Element>
  >(new Map());
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
      if (!map || !routeMap || !shapesMap || !tripMap) return;

      const bounds = map.getBounds();
      if (!bounds) return;

      const projection = map.getProjection();
      if (!projection) return;

      const zoom = map.getZoom();
      if (!zoom) return;

      const response = await fetch("/api/vehiclepositions");
      const vehiclepositions: VehiclePositions = await response.json();
      vehicleMapRef.current = new Map(
        vehiclepositions.entity.map((entity) => [
          entity.vehicle.vehicle.id,
          entity.vehicle,
        ])
      );
      const { entity } = vehiclepositions;
      const newMarkerElements: Map<string, JSX.Element> = new Map();

      entity.forEach((entity: Entity) => {
        const { vehicle } = entity;
        const endLat = vehicle.position.latitude;
        const endLng = vehicle.position.longitude;
        if (!endLat && !endLng) return; // null island
        const endLatLng = new google.maps.LatLng(endLat, endLng);
        const vehicleMarkers = markersMap.get(vehicle.vehicle.id);
        if (vehicleMarkers) {
          const startLatLng = vehicleMarkers[0].getPosition()!;

          const startLat = startLatLng.lat();
          const startLng = startLatLng.lng();

          if (startLatLng) {
            const minLat = Math.min(startLat, endLat);
            const maxLat = Math.max(startLat, endLat);
            const minLng = Math.min(startLng, endLng);
            const maxLng = Math.max(startLng, endLng);

            const movementBounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(minLat, minLng),
              new google.maps.LatLng(maxLat, maxLng)
            );

            if (!bounds.intersects(movementBounds)) {
              vehicleMarkers.forEach((marker) => marker.setPosition(endLatLng));
              return;
            }

            const startPoint = projection.fromLatLngToPoint(startLatLng);
            const endPoint = projection.fromLatLngToPoint(endLatLng);

            if (!startPoint || !endPoint) return;

            const deltaX =
              Math.abs(endPoint.x - startPoint.x) * Math.pow(2, zoom);
            const deltaY =
              Math.abs(endPoint.y - startPoint.y) * Math.pow(2, zoom);
            const movementDistance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

            if (movementDistance >= MIN_PIXEL_MOVEMENT)
              vehicleMarkers.forEach((marker, i) => {
                animateMarker(
                  marker,
                  endLatLng,
                  i === 1 ? vehicle.position.bearing : undefined
                );
              });
            else
              vehicleMarkers.forEach((marker) => marker.setPosition(endLatLng));
          }
          return;
        }

        const route = routeMap.get(vehicle.trip.route_id);
        if (!route) return null;
        const { strokeColor } = getRouteColor(route);
        const { route_id, route_type } = route;
        const busRouteType = getBusRouteType(route_id)!;
        newMarkerElements.set(
          vehicle.vehicle.id,
          <Point
            key={vehicle.vehicle.id}
            onClick={() => {
              if (!map) return;

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
      setMarkerElements((prevMarkerElements) => {
        const updatedMarkers = new Map(prevMarkerElements);
        newMarkerElements.forEach((value, key) => {
          updatedMarkers.set(key, value);
        });
        return updatedMarkers;
      });
      markersMap.forEach((vehicleMarkers, vehicleId) => {
        if (!vehicleMapRef.current.has(vehicleId)) {
          vehicleMarkers.forEach((marker) => marker.setMap(null));
          markersMap.delete(vehicleId);
        } else {
          vehicleMarkers.forEach((marker) => marker.setMap(map));
        }
      });
    }
  }, [
    map,
    routeMap,
    shapesMap,
    tripMap,
    vehicleType,
    getVisibility,
    markersMap,
  ]);

  React.useEffect(() => {
    if (!routeMap || !vehicleMapRef.current) return;
    markersMap.forEach((vehicleMarkers, vehicleId) => {
      vehicleMarkers.forEach((marker, index) => {
        const vehicle = vehicleMapRef.current.get(vehicleId);
        if (!vehicle) return;
        const { trip } = vehicle;
        const { route_id: trip_route_id } = trip;
        const route = routeMap.get(trip_route_id);
        if (!route) return;
        const { route_id, route_type } = route;
        const busRouteType = getBusRouteType(route_id)!;
        marker.setVisible(
          vehicleType || (index <= 1 && getVisibility(route_type, busRouteType))
        );
      });
    });
  }, [getVisibility, markersMap, routeMap, vehicleType]);

  function animateMarker(
    marker: google.maps.Marker,
    endPosition: google.maps.LatLng,
    endBearing?: number
  ) {
    const startPosition = marker.getPosition();
    if (!startPosition) return;

    const startLat = startPosition.lat();
    const startLng = startPosition.lng();

    const startTime = performance.now();

    function easeInOutQuad(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    const icon = marker.getIcon() as google.maps.Symbol;
    const startBearing = (icon.rotation ?? 0) % 360;

    function animateStep(timestamp: number) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / MARKER_ANIMATION_DURATION, 1);
      const easedProgress = easeInOutQuad(progress);

      const lat = startLat + (endPosition.lat() - startLat) * easedProgress;
      const lng = startLng + (endPosition.lng() - startLng) * easedProgress;

      let newBearing = startBearing;
      if (endBearing !== undefined) {
        const delta = ((endBearing - startBearing + 540) % 360) - 180;
        newBearing = startBearing + delta * easedProgress;
      }

      marker.setPosition(new google.maps.LatLng(lat, lng));

      if (endBearing !== undefined) {
        marker.setIcon({
          ...icon,
          rotation: newBearing,
        });
      }

      if (progress < 1) requestAnimationFrame(animateStep);
    }

    requestAnimationFrame(animateStep);
  }

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
          <MarkersMapContext.Provider value={markersMap}>
            <div className={styles["maps-map"]} />
            {Array.from(markerElements.values())}
          </MarkersMapContext.Provider>
        </MapContext.Provider>
      </div>
    </GoogleMap>
  );
}

export default Maps;
