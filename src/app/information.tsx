import { Paper } from "@mui/material";
import React from "react";
import styles from "./information.module.css";
import { MapContext } from "./maps";
import { getRouteColors } from "./util";

export function Information() {
  const { selected, routeMap, shapesMap, tripMap } =
    React.useContext(MapContext);
  if (!selected) return null;
  const { polylines, trip } = selected;
  if (!trip) return null;
  if (!routeMap || !shapesMap || !tripMap) return null;
  const route = routeMap.get(trip.route_id);
  if (!route) return null;

  const { backgroundColor, polylineColor, strokeColor, textColor, typeColor } =
    getRouteColors(route);

  return (
    <Paper className={styles["information-paper"]}>
      <div className={styles["information-summary"]}>
        <div
          className={styles["information-marker-icon"]}
          style={{ backgroundColor, border: `2px solid ${strokeColor}` }}
        >
          <div
            className={styles["information-marker-label"]}
            style={{ color: textColor }}
          >
            {route.route_short_name}
          </div>
        </div>
        <p className={styles["information-destination"]}>
          {route.route_long_name}
        </p>
      </div>
    </Paper>
  );
}
