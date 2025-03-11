import React from "react";
import { Route } from "./api/routes/route";
import { VehiclePosition } from "./api/vehiclepositions/route";
import { MapContext, MarkersMapContext } from "./maps";
import styles from "./point.module.css";
import {
  getRouteColors,
  getRouteTypeSvg,
  getZIndex,
  ZIndexLayer,
} from "./util";

const MARKER_ANIMATION_DURATION = 1000;
const MIN_PIXEL_MOVEMENT = 5;
const STALE_DURATION = 30;

export function Point({
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
      parseInt(vehicle_id) ?? parseInt(route_id),
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

    if (!markerRef.current) {
      const markerContent = document.createElement("div");
      markerContent.className = styles["point-marker"];
      markerContent.style.visibility = visible ? "visible" : "hidden";
      markerContent.style.opacity = stale ? "0.5" : "1";

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

      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        content: markerContent,
        map,
        position: { lat: latitude, lng: longitude },
        title: route_long_name,
        zIndex,
      });
      markerRef.current.addListener("gmp-click", onClick);
    } else
      updateMarker(map, markerRef.current, visible, stale, zIndex, newPosition);

    if (bearing !== undefined)
      if (!bearingMarkerRef.current) {
        const bearingContent = document.createElement("div");
        bearingContent.className = styles["point-bearing"];
        bearingContent.style.visibility = visible ? "visible" : "hidden";
        bearingContent.style.opacity = stale ? "0.5" : "1";

        const bearingRad = (bearing * Math.PI) / 180;
        const offsetX = 24 * Math.sin(bearingRad);
        const offsetY = -24 * Math.cos(bearingRad);
        bearingContent.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;

        const bearingSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11 -9 22 15" classname="${styles["point-bearing-svg"]}">
      <path d="M 0 -2 L 0 -2 L -7 5 L -10 2 L 0 -8 L 10 2 L 7 5 Z"  fill="${polylineColor}"/>
    </svg>
  `;
        bearingContent.innerHTML = bearingSvg;

        const bearingSvgElement = bearingContent.querySelector("svg")!;
        bearingSvgElement.classList.add(styles["point-bearing-svg"]);
        bearingSvgElement.style.transform = `rotate(${bearing}deg)`;

        bearingMarkerRef.current = new google.maps.marker.AdvancedMarkerElement(
          {
            content: bearingContent,
            map,
            position: { lat: latitude, lng: longitude },
            title: route_long_name,
            zIndex: zIndex + 2,
          }
        );
        bearingMarkerRef.current.addListener("gmp-click", onClick);
      } else
        updateMarker(
          map,
          bearingMarkerRef.current,
          visible,
          stale,
          zIndex + 2,
          newPosition,
          bearing
        );

    if (!typeMarkerRef.current) {
      const typeContent = document.createElement("div");
      typeContent.className = styles["point-type"];
      typeContent.style.visibility =
        visible && vehicleType ? "visible" : "hidden";
      typeContent.style.opacity = stale ? "0.5" : "1";

      const typeIcon = document.createElement("div");
      typeIcon.className = styles["point-type-icon"];
      typeIcon.style.backgroundColor = typeColor!;

      typeContent.appendChild(typeIcon);

      const typeIconSvg = getRouteTypeSvg(route_type)!;
      typeIcon.innerHTML = typeIconSvg;

      const typeIconSvgElement = typeIcon.querySelector("svg")!;
      typeIconSvgElement.classList.add(styles["point-type-icon-svg"]);

      typeMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        content: typeContent,
        map,
        position: { lat: latitude, lng: longitude },
        title: route_long_name,
        zIndex: zIndex + 1,
      });
      typeMarkerRef.current.addListener("gmp-click", onClick);
    } else
      updateMarker(
        map,
        typeMarkerRef.current,
        visible && vehicleType,
        stale,
        zIndex + 1,
        newPosition
      );

    const markers = [markerRef.current, typeMarkerRef.current];
    if (bearingMarkerRef.current) markers.push(bearingMarkerRef.current);
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
  const deltaX = Math.abs(endPoint.x - startPoint.x) * Math.pow(2, zoom);
  const deltaY = Math.abs(endPoint.y - startPoint.y) * Math.pow(2, zoom);
  const movementDistance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
  if (movementDistance < MIN_PIXEL_MOVEMENT) {
    marker.position = endPosition;
    return;
  }

  let startBearing: number | undefined;
  if (endBearing !== undefined) {
    const svgElement = marker.querySelector("svg");
    if (!svgElement) {
      marker.position = endPosition;
      return;
    }
    const transformValue = svgElement.style.transform;
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

    const bearingSvgElement = marker.querySelector("svg");
    if (bearingSvgElement) {
      const bearingRad = (newBearing * Math.PI) / 180;
      const offsetX = 24 * Math.sin(bearingRad);
      const offsetY = -24 * Math.cos(bearingRad);
      const markerContent = marker.content as HTMLElement;
      markerContent.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;
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
