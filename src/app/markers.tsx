import React from "react";
import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Trip } from "./api/trips/route";
import { VehiclePosition } from "./api/vehiclepositions/route";
import { Visibility } from "./filters";
import { MapContext, MarkersMapContext, Selected } from "./maps";
import styles from "./point.module.css";
import {
  BusRouteType,
  getBusRouteType,
  getRouteColors,
  getRouteTypeSvg,
  getZIndex,
  RouteType,
  ZIndexLayer,
} from "./util";

const MARKER_ANIMATION_DURATION = 1000;
const STALE_DURATION = 30;

export function Markers({
  map,
  routeMap,
  shapesMap,
  tripMap,
  vehicleMap,
  getVisibility,
  setSelected,
  visibility,
}: {
  map: google.maps.Map | null;
  routeMap: Map<string, Route> | null;
  shapesMap: Map<string, Shape[]> | null;
  tripMap: Map<string, Trip> | null;
  vehicleMap: Map<string, VehiclePosition>;
  getVisibility: (route_type: RouteType, busRouteType: BusRouteType) => boolean;
  setSelected: React.Dispatch<React.SetStateAction<Selected>>;
  visibility: Visibility;
}) {
  return (
    <>
      {Array.from(vehicleMap).map(([vehicleId, vehicle]) => {
        if (!map || !routeMap || !shapesMap || !tripMap) return;
        const routeId = vehicle.trip?.route_id;
        if (!routeId) return null;
        const route = routeMap.get(routeId);
        if (!route) return null;
        const { polylineColor } = getRouteColors(route);
        const { route_id, route_type } = route;
        const busRouteType = getBusRouteType(route_id)!;
        return (
          <Marker
            key={vehicleId}
            onClick={() => {
              if (!map || !tripMap || !shapesMap || !routeMap) return;
              const trip_id = vehicle.trip?.trip_id;
              if (!trip_id) return;
              const trip = tripMap.get(trip_id);
              if (!trip) return;

              const { shape_id } = trip;
              if (!shape_id) return;
              let shapes = shapesMap.get(shape_id);
              if (!shapes) return;

              const path = shapes.map((shape) => ({
                lat: shape.shape_pt_lat,
                lng: shape.shape_pt_lon,
              }));

              const bounds = new google.maps.LatLngBounds();
              path.forEach((point) => bounds.extend(point));

              const zIndex = getZIndex(
                parseInt(vehicleId) || parseInt(routeId),
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
              setSelected((prev) => {
                prev.polylines.forEach((polyline) => polyline.setMap(null));
                return { polylines: [fill, outline], trip };
              });
              map.fitBounds(bounds);
            }}
            route={route}
            vehicle={vehicle}
            vehicleType={visibility.vehicleType}
            visible={getVisibility(route_type, busRouteType)}
          />
        );
      })}
    </>
  );
}

function Marker({
  onClick,
  route,
  vehicle,
  vehicleType,
  visible,
}: {
  onClick: () => void;
  route: Route;
  vehicle: VehiclePosition;
  vehicleType: boolean;
  visible: boolean;
}) {
  const { map } = React.useContext(MapContext);
  const markersMap = React.useContext(MarkersMapContext);

  const markerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const bearingMarkerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const typeMarkerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const markerRefs = [markerRef, bearingMarkerRef, typeMarkerRef];

  const { route_id, route_short_name, route_long_name, route_type } = route;
  const { position, timestamp } = vehicle;
  const { latitude, longitude, bearing } = position || {};
  const vehicle_id = vehicle!.vehicle!.id;
  const stale = Math.floor(Date.now() / 1000) - timestamp > STALE_DURATION;

  const { backgroundColor, polylineColor, strokeColor, textColor, typeColor } =
    getRouteColors(route);

  const zIndex =
    getZIndex(
      parseInt(vehicle_id) || parseInt(route_id),
      stale ? ZIndexLayer.MARKER_STALE : ZIndexLayer.MARKER
    ) * markerRefs.length;

  React.useEffect(() => {
    if (
      !map ||
      !markersMap?.current ||
      latitude === undefined ||
      longitude === undefined
    )
      return;

    const newPosition: google.maps.LatLngLiteral = {
      lat: latitude,
      lng: longitude,
    };

    if (newPosition.lat === 0 && newPosition.lng === 0) return; // null island

    let markerContent = markerRef.current?.content as HTMLDivElement | null;
    if (!markerContent) {
      markerContent = document.createElement("div");
      markerContent.className = styles["point-marker"];

      const icon = document.createElement("div");
      icon.className = styles["point-marker-icon"];
      icon.style.backgroundColor = backgroundColor;
      icon.style.border = `1px solid ${strokeColor}`;
      markerContent.appendChild(icon);

      const label = document.createElement("div");
      label.className = styles["point-marker-label"];
      label.innerText = route_short_name ?? ""; // TODO: render placeholder
      label.style.color = textColor;
      markerContent.appendChild(label);
    }

    markerContent.style.visibility = visible ? "visible" : "hidden";
    markerContent.style.opacity = stale ? "0.5" : "1";

    if (bearing !== undefined) {
      let bearingElement = markerContent.querySelector(
        `.${styles["point-bearing"]}`
      ) as HTMLDivElement | null;
      let bearingSvgElement = bearingElement?.querySelector("svg");
      if (!bearingElement) {
        bearingElement = document.createElement("div");
        bearingElement.className = styles["point-bearing"];
        bearingElement.style.zIndex = `${zIndex + 2}`;

        const bearingSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11 -9 22 15" classname="${styles["point-bearing-svg"]}">
        <path d="M 0 -2 L 0 -2 L -7 5 L -10 2 L 0 -8 L 10 2 L 7 5 Z"  fill="${polylineColor}"/>
      </svg>
    `;
        bearingElement.innerHTML = bearingSvg;
        bearingSvgElement = bearingElement.querySelector("svg")!;
        bearingSvgElement.classList.add(styles["point-bearing-svg"])!;

        const bearingRad = (bearing * Math.PI) / 180;
        const offsetX = 24 * Math.sin(bearingRad);
        const offsetY = -24 * Math.cos(bearingRad);
        bearingElement.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;

        bearingSvgElement!.style.transform = `rotate(${bearing}deg)`;

        markerContent.appendChild(bearingElement);
      }
    }

    let typeElement = markerContent.querySelector(
      `.${styles["point-type"]}`
    ) as HTMLDivElement | null;
    if (!typeElement) {
      typeElement = document.createElement("div");
      typeElement.className = styles["point-type"];
      typeElement.style.zIndex = `${zIndex + 1}`;

      const typeIcon = document.createElement("div");
      typeIcon.className = styles["point-type-icon"];
      typeIcon.style.backgroundColor = typeColor;
      typeElement.appendChild(typeIcon);

      const typeIconSvg = getRouteTypeSvg(route_type);
      typeIcon.innerHTML = typeIconSvg;

      const typeIconSvgElement = typeIcon.querySelector("svg")!;
      typeIconSvgElement.classList.add(styles["point-type-icon-svg"]);
      markerContent.appendChild(typeElement);
    }
    typeElement.style.visibility =
      visible && vehicleType ? "visible" : "hidden";

    if (!markerRef.current) {
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        content: markerContent,
        map,
        position: { lat: latitude, lng: longitude },
        title: route_long_name,
        zIndex,
      });
      markerRef.current.addListener("gmp-click", onClick);
    } else {
      updateMarker(
        map,
        markerRef.current,
        visible,
        stale,
        zIndex,
        newPosition,
        bearing
      );
    }

    const markers = [markerRef.current];
    markersMap.current.set(vehicle_id, markers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bearing,
    latitude,
    longitude,
    map,
    markersMap,
    onClick,
    stale,
    vehicleType,
    visible,
    zIndex,
  ]);
  return null;
}

const updateMarker = (
  map: google.maps.Map,
  marker: google.maps.marker.AdvancedMarkerElement,
  visible: boolean,
  stale: boolean,
  zIndex: number,
  endPosition: google.maps.LatLngLiteral,
  endBearing?: number
) => {
  const markerContent = marker.content as HTMLElement;
  marker.zIndex = zIndex;
  const prevVisible = markerContent.style.visibility === "visible";
  markerContent.style.opacity = stale ? "0.5" : "1";
  markerContent.style.visibility = visible ? "visible" : "hidden";

  if (!visible) return;
  else if (!prevVisible) {
    marker.position = endPosition;
    return;
  }

  if (endPosition.lat === 0 && endPosition.lng === 0) return; // null island

  const startPosition = marker.position as google.maps.LatLngLiteral;
  if (
    startPosition.lat === endPosition.lat &&
    startPosition.lng === endPosition.lng
  )
    return; // no movement

  const startTime = performance.now();

  const minLat = Math.min(startPosition.lat, endPosition.lat);
  const maxLat = Math.max(startPosition.lat, endPosition.lat);
  const minLng = Math.min(startPosition.lng, endPosition.lng);
  const maxLng = Math.max(startPosition.lng, endPosition.lng);

  // check if the marker movement is within the map bounds
  const movementBounds = new google.maps.LatLngBounds(
    { lat: minLat, lng: minLng },
    { lat: maxLat, lng: maxLng }
  );
  const mapBounds = map.getBounds();
  if (!mapBounds || !mapBounds.intersects(movementBounds)) {
    marker.position = endPosition;
    return;
  }

  // check if the marker movement is significant
  const projection = map.getProjection();
  if (!projection) {
    marker.position = endPosition;
    return;
  }
  const startPoint = projection.fromLatLngToPoint(startPosition);
  const endPoint = projection.fromLatLngToPoint(endPosition);
  if (!startPoint || !endPoint) {
    marker.position = endPosition;
    return;
  }
  const zoom = map.getZoom();
  if (zoom === undefined) {
    marker.position = endPosition;
    return;
  }

  let startBearing: number | undefined;
  if (endBearing !== undefined) {
    const bearingElement = marker.querySelector(`.${styles["point-bearing"]}`)!;
    const bearingSvgElement = bearingElement.querySelector("svg");
    if (!bearingSvgElement) {
      marker.position = endPosition;
      return;
    }
    const transformValue = bearingSvgElement.style.transform;
    const match = transformValue.match(/rotate\((-?\d+\.?\d*)deg\)/);
    startBearing = match ? parseFloat(match[1]) : undefined;
  }

  requestAnimationFrame((timestamp) => {
    stepAnimationPosition(
      marker,
      startTime,
      timestamp,
      startPosition,
      endPosition,
      startBearing,
      endBearing
    );
  });
};

function stepAnimationPosition(
  marker: google.maps.marker.AdvancedMarkerElement,
  startTime: number,
  timestamp: number,
  startPosition: google.maps.LatLngLiteral,
  endPosition: google.maps.LatLngLiteral,
  startBearing?: number,
  endBearing?: number
) {
  const elapsed = timestamp - startTime;
  const progress = Math.min(elapsed / MARKER_ANIMATION_DURATION, 1);
  const easedProgress = easeInOutQuad(progress);

  const lat =
    startPosition.lat + (endPosition.lat - startPosition.lat) * easedProgress;
  const lng =
    startPosition.lng + (endPosition.lng - startPosition.lng) * easedProgress;
  marker.position = new google.maps.LatLng(lat, lng);

  if (startBearing !== undefined && endBearing !== undefined) {
    const delta = ((endBearing - startBearing + 540) % 360) - 180;
    const newBearing = startBearing + delta * easedProgress;

    const bearingElement = marker.querySelector(
      `.${styles["point-bearing"]}`
    )! as HTMLDivElement;
    const bearingSvgElement = bearingElement.querySelector("svg");
    if (bearingSvgElement) {
      const bearingRad = (newBearing * Math.PI) / 180;
      const offsetX = 24 * Math.sin(bearingRad);
      const offsetY = -24 * Math.cos(bearingRad);
      bearingElement.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;
      bearingSvgElement.style.transform = `rotate(${newBearing}deg)`;
    }
  }

  if (progress < 1)
    requestAnimationFrame((timestamp) =>
      stepAnimationPosition(
        marker,
        startTime,
        timestamp,
        startPosition,
        endPosition,
        startBearing,
        endBearing
      )
    );
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
