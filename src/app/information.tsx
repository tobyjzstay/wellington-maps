import { Paper } from "@mui/material";
import React from "react";
import styles from "./information.module.css";
import { MapContext } from "./maps";
import { getRouteColors } from "./util";

export function Information() {
  const { selected, routeMap, shapesMap, tripMap } =
    React.useContext(MapContext);
  if (!selected || !routeMap || !shapesMap || !tripMap) return null;
  const { polylines, trip: _trip } = selected;
  const trip =
    _trip ?? (polylines?.length && tripMap.get((polylines[0] as any).id));
  if (!trip) return null;
  const route = routeMap.get(trip.route_id);
  if (!route) return null;

  const { backgroundColor, polylineColor, strokeColor, textColor, typeColor } =
    getRouteColors(route);

  return (
    <Paper className={styles["information-paper"]}>
      <div className={styles["information-summary"]}>
        <div
          className={styles["information-marker-icon"]}
          style={{ backgroundColor, borderColor: strokeColor }}
        >
          <div
            className={styles["information-marker-label"]}
            style={{ color: textColor }}
          >
            {route.route_short_name}
          </div>
        </div>
        <div className={styles["information-destination"]}>
          {route.route_long_name}
        </div>
      </div>
    </Paper>
  );
}
