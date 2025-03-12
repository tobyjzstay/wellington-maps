import React from "react";
import { Stop } from "./api/stops/route";
import { Transfer } from "./api/transfers/route";
import { MapContext } from "./maps";
import styles from "./stops.module.css";
import { ZIndexLayer } from "./util";

export function Stops({
  map,
  stopMap,
  transferMap,
}: {
  map: google.maps.Map | null;
  stopMap: Map<string, Stop> | null;
  transferMap: Map<
    Transfer["from_stop_id"] | Transfer["to_stop_id"],
    Transfer[]
  > | null;
}) {
  if (!map || !stopMap) return null;

  return (
    <>
      {Array.from(stopMap).map(([stopId, stop]) => (
        <Marker key={stopId} stop={stop} transferMap={transferMap} />
      ))}
    </>
  );
}

function Marker({
  stop,
  transferMap,
}: {
  stop: Stop;
  transferMap: Map<
    Transfer["from_stop_id"] | Transfer["to_stop_id"],
    Transfer[]
  > | null;
}) {
  const { map } = React.useContext(MapContext);

  const markerRef =
    React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  if (!map || !transferMap) return;

  if (markerRef.current) {
    const zoom = map.getZoom();
    if (!zoom) return;
    markerRef.current.map =
      zoom >= (transferMap.has(stop.stop_id) ? 10 : 15) ? map : null;
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
  if (transferMap.has(stop.stop_id))
    markerContent.classList.add(styles["stops-transfer-icon"]);

  markerRef.current = new google.maps.marker.AdvancedMarkerElement({
    content: markerContent,
    map,
    position,
    title: stop_name,
    zIndex: ZIndexLayer.STOP * 10000,
  });

  return null;
}
