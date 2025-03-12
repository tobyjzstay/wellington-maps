import React from "react";
import { Stop } from "./api/stops/route";
import { MapContext } from "./maps";
import styles from "./stops.module.css";
import { ZIndexLayer } from "./util";

export function Stops({
  map,
  stopMap,
}: {
  map: google.maps.Map | null;
  stopMap: Map<string, Stop> | null;
}) {
  if (!map || !stopMap) return null;

  return (
    <>
      {Array.from(stopMap).map(([stopId, stop]) => (
        <Marker key={stopId} stop={stop} />
      ))}
    </>
  );
}

function Marker({ stop }: { stop: Stop }) {
  const { map } = React.useContext(MapContext);

  const markerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  if (!map) return;

  if (markerRef.current) {
    const zoom = map.getZoom();
    if (!zoom) return;
    markerRef.current.map = zoom >= 15 ? map : null;
    return;
  }

  const { stop_lat, stop_lon, stop_name } = stop;

  if (!stop_lat || !stop_lon) return;
  const position: google.maps.LatLngLiteral = {
    lat: stop_lat,
    lng: stop_lon,
  };

  if (position.lat === 0 && position.lng === 0) return; // null island

  const markerContent = document.createElement("div");
  markerContent.className = styles["stops-stop-icon"];

  markerRef.current = new google.maps.marker.AdvancedMarkerElement({
    content: markerContent,
    map,
    position,
    title: stop_name,
    zIndex: ZIndexLayer.STOP * 10000,
  });

  return null;
}
