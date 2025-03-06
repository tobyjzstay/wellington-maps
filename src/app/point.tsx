import React from "react";
import { Route } from "./api/routes/route";
import { Vehicle } from "./api/vehiclepositions/route";
import { MapContext, MarkersMapContext } from "./maps";
import styles from "./point.module.css";
import { getRouteColor, getRouteTypeSvg, getZIndex, ZIndexLayer } from "./util";

const MARKER_ANIMATION_DURATION = 1000;
const MIN_PIXEL_MOVEMENT = 5;

export function Point({
  onClick,
  route,
  vehicle,
  vehicleType,
  visible,
}: {
  onClick: () => void;
  route: Route;
  vehicle: Vehicle;
  vehicleType: boolean;
  visible: boolean;
}) {
  const map = React.useContext(MapContext);
  const markersMap = React.useContext(MarkersMapContext);

  const markerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const bearingMarkerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const typeMarkerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const { id, route_id, route_short_name, route_long_name, route_type } = route;
  const { latitude, longitude, bearing } = vehicle.position;
  const vehicle_id = vehicle.vehicle.id;

  const { color, fillColor, strokeColor, typeFillColor } = getRouteColor(route);

  const zIndex = getZIndex(id, ZIndexLayer.MARKER) * 3;

  React.useEffect(() => {
    if (!map) return;

    const newPosition: google.maps.LatLngLiteral = {
      lat: latitude,
      lng: longitude,
    };

    if (!markerRef.current) {
      const markerContent = document.createElement("div");
      markerContent.className = styles["point-marker"];
      markerContent.style.visibility = visible ? "visible" : "hidden";

      const icon = document.createElement("div");
      icon.className = styles["point-marker-icon"];
      icon.style.backgroundColor = fillColor;
      icon.style.border = `1px solid ${strokeColor}`;
      markerContent.appendChild(icon);

      const label = document.createElement("div");
      label.className = styles["point-marker-label"];
      label.innerText = route_short_name;
      label.style.color = color;
      markerContent.appendChild(label);

      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        content: markerContent,
        map,
        position: { lat: latitude, lng: longitude },
        title: route_long_name,
        zIndex,
      });
    } else setMarkerPosition(map, markerRef.current, visible, newPosition);

    if (!bearingMarkerRef.current) {
      const bearingContent = document.createElement("div");
      bearingContent.className = styles["point-bearing"];
      bearingContent.style.visibility = visible ? "visible" : "hidden";

      const bearingRad = (bearing * Math.PI) / 180;
      const offsetX = 24 * Math.sin(bearingRad);
      const offsetY = -24 * Math.cos(bearingRad);
      bearingContent.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;

      const bearingSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11 -9 22 15" classname="${styles["point-bearing-svg"]}">
      <path d="M 0 -2 L 0 -2 L -7 5 L -10 2 L 0 -8 L 10 2 L 7 5 Z"  fill="${strokeColor}"/>
    </svg>
  `;
      bearingContent.innerHTML = bearingSvg;

      const bearingSvgElement = bearingContent.querySelector("svg")!;
      bearingSvgElement.classList.add(styles["point-bearing-svg"]);
      bearingSvgElement.style.transform = `rotate(${bearing}deg)`;

      bearingMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        content: bearingContent,
        map,
        position: { lat: latitude, lng: longitude },
        title: route_long_name,
        zIndex: zIndex + 2,
      });
    } else
      setMarkerPosition(
        map,
        bearingMarkerRef.current,
        visible,
        newPosition,
        bearing
      );

    if (!typeMarkerRef.current) {
      const typeContent = document.createElement("div");
      typeContent.className = styles["point-type"];
      typeContent.style.visibility =
        visible && vehicleType ? "visible" : "hidden";

      const typeIcon = document.createElement("div");
      typeIcon.className = styles["point-type-icon"];
      typeIcon.style.backgroundColor = typeFillColor!;

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
    } else
      setMarkerPosition(
        map,
        typeMarkerRef.current,
        visible && vehicleType,
        newPosition
      );

    const markers = [
      markerRef.current,
      bearingMarkerRef.current,
      typeMarkerRef.current,
    ];
    markers.forEach((marker) => marker.addListener("gmp-click", onClick));
    markersMap.set(vehicle_id, markers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bearing,
    latitude,
    longitude,
    map,
    markersMap,
    onClick,
    vehicleType,
    visible,
    zIndex,
  ]);
  return null;
}

const setMarkerPosition = (
  map: google.maps.Map,
  marker: google.maps.marker.AdvancedMarkerElement,
  visible: boolean,
  endPosition: google.maps.LatLngLiteral,
  endBearing?: number
) => {
  const markerContent = marker.content as HTMLElement;
  const prevVisible = markerContent.style.visibility === "visible";
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
