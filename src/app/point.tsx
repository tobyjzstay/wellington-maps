import { Marker } from "@react-google-maps/api";
import React from "react";
import { Route } from "./api/routes/route";
import { Vehicle } from "./api/vehiclepositions/route";

const TYPE_MARKER_SCALE = 1;
const TYPE_ICON_SCALE = 5;

export function Point({
  onClick,
  route,
  vehicle,
  zIndex,
}: {
  onClick: () => void;
  route: Route;
  vehicle: Vehicle;
  zIndex: number;
}) {
  const [marker, setMarker] = React.useState<Marker | null>(null);
  const [typeMarker, setTypeMarker] = React.useState<Marker | null>(null);
  const [typeIconMarker, setTypeIconMarker] = React.useState<Marker | null>(
    null
  );

  const {
    route_id,
    route_short_name,
    route_long_name,
    route_type,
    route_color,
    route_text_color,
  } = route;
  const { bearing, latitude, longitude } = vehicle.position;
  const vehicle_id = vehicle.vehicle.id;

  const { color, fillColor, strokeColor, typePath, typeFillColor } =
    React.useMemo(() => {
      let color = "#" + route_text_color;
      let fillColor = "#" + route_color;
      let strokeColor = "#" + route_color;

      let typePath = "";
      let typeFillColor;

      switch (route_type) {
        case 2: // train
          color = "#ffffff";
          // TODO: the path is missing the headlights
          typePath =
            "M26.67 6.273a2.273 2.273 0 1 1-4.545 0 2.273 2.273 0 0 1 4.545 0M33.057 6.273a2.273 2.273 0 1 1-4.546 0 2.273 2.273 0 0 1 4.546 0M43.795 62.443l-6.818-9.227a2.01 2.01 0 1 0-3.25 2.364l.489.659H21.477l.489-.66a1.982 1.982 0 1 0-3.182-2.363l-6.818 9.227a1.989 1.989 0 0 0 3.182 2.375l3.409-4.613h18.58l3.408 4.613a1.989 1.989 0 0 0 2.773.41 2 2 0 0 0 .41-2.785M39.045 9.682h-22.59A5.455 5.455 0 0 0 11 15.148V45.34a5.455 5.455 0 0 0 5.455 5.454h22.59a5.455 5.455 0 0 0 5.455-5.454V15.148a5.455 5.455 0 0 0-5.455-5.466Zm-24.25 7.466a3.273 3.273 0 0 1 3.273-3.273h19.318a3.273 3.273 0 0 1 3.273 3.273V31.92a3.273 3.273 0 0 1-3.273 3.273H18.068a3.273 3.273 0 0 1-3.273-3.273V17.148Z";
          typeFillColor = "#784e90";
          break;
        case 3: // bus
          typePath =
            "M45.912 33.59a56.39 56.39 0 0 0-2.66-16.5c-.67-1.76-3.6-2.09-4.5-2.09h-22c-.91 0-3.83.33-4.5 2.09a56.27 56.27 0 0 0-2.64 16.5c-.1 7.41-.97 15.41 4.39 16.26v2.4c0 1.22.52 2.21 1.16 2.21h2.35c.64 0 1.16-1 1.16-2.21v-2.33h18.16v2.33c0 1.22.52 2.21 1.16 2.21h2.38c.64 0 1.16-1 1.16-2.21V49.9c5.36-.9 4.46-8.9 4.38-16.31Zm-30.18 13.68a1.73 1.73 0 1 1 1.78-1.72 1.72 1.72 0 0 1-1.73 1.72h-.05Zm24.12 0a1.73 1.73 0 1 1 1.66-1.72 1.73 1.73 0 0 1-1.73 1.72h.07Zm3.5-15.27c0 2.28-7 4.13-15.59 4.14-8.59.01-15.58-1.91-15.58-4.14 0-.44.06-.93.11-1.49.81-9 1.51-9.73 2.79-10.86 2.16-2 12.68-1.65 12.68-1.65s10.52-.35 12.75 1.6c1.28 1.13 2 1.89 2.79 10.86 0 .56.08 1.05.1 1.49l-.05.05Z M31.97 18.57H23.5a.89.89 0 0 0 0 1.77h8.43a.89.89 0 0 0 0-1.77";
          typeFillColor = "#4e801f";
          switch (route_id) {
            // frequent
            case "7": // AX
            case "10": // 1
            case "20": // 2
            case "30": // 3
            case "40": // 4
            case "70": // 7
            case "210": // 21
            case "220": // 22
            case "1100": // 110
            case "1200": // 120
            case "1300": // 130
            case "2200": // 220
              color = "#ffffff";
              break;
            // midnight
            case "9911": // N1
            case "9912": // N2
            case "9913": // N3
            case "9914": // N4
            case "9915": // N5
            case "9916": // N6
            case "9918": // N8
            case "9922": // N22
            case "9966": // N66
            case "9988": // N88
              color = "#fff200";
              fillColor = "#3d3d3d";
              strokeColor = "#3d3d3d";
              break;
            default:
              color = "#" + route_color;
              fillColor = "#ffffff";
              break;
          }
          break;
        case 4: // ferry
          color = "#ffffff";
          typePath =
            "M 28 21.531 L 40.5 26.479 V 20.719 A 0.958 0.958 0 0 0 39.458 19.76 H 37.468 V 17.27 A 0.969 0.969 0 0 0 36.5 16.302 H 28.552 V 10.448 A 0.969 0.969 0 0 0 27.583 9.479 H 27.385 A 0.969 0.969 0 0 0 26.417 10.448 V 16.302 H 18.469 A 0.969 0.969 0 0 0 17.5 17.271 V 19.761 H 15.5 C 14.97 19.761 14.542 20.189 14.542 20.719 V 26.479 L 27.042 21.531 A 1.469 1.469 0 0 1 28.083 21.531 M 10.02 37.177 L 12.573 45.625 A 6.854 6.854 0 0 1 15.406 45.073 A 7.52 7.52 0 0 1 17.437 45.333 L 18.25 40.875 H 36.698 L 37.562 45.552 A 7.615 7.615 0 0 1 42.448 45.406 L 44.875 37.438 L 46.24 32.073 A 1.427 1.427 0 0 0 45.375 30.375 L 28 23.469 A 1.375 1.375 0 0 0 26.958 23.469 L 9.583 30.375 A 1.448 1.448 0 0 0 8.719 32.073 L 10.021 37.177 Z M 48.51 48.26 A 3.542 3.542 0 0 1 44.344 48.26 A 7.385 7.385 0 0 0 36.094 48.26 A 3.531 3.531 0 0 1 31.927 48.26 A 7.385 7.385 0 0 0 23.677 48.26 A 3.25 3.25 0 0 1 21.594 48.938 A 3.198 3.198 0 0 1 19.51 48.26 A 7.042 7.042 0 0 0 15.344 47 A 7.042 7.042 0 0 0 11.177 48.26 A 3.24 3.24 0 0 1 9.094 48.938 A 3.25 3.25 0 0 1 7.01 48.26 A 7.042 7.042 0 0 0 3 46.98 V 50.844 A 3.25 3.25 0 0 1 5.083 51.521 A 7.052 7.052 0 0 0 9.25 52.781 A 7.031 7.031 0 0 0 13.417 51.521 A 3.302 3.302 0 0 1 15.5 50.844 A 3.25 3.25 0 0 1 17.583 51.521 C 18.804 52.371 20.263 52.811 21.75 52.781 A 7.042 7.042 0 0 0 25.917 51.521 A 3.531 3.531 0 0 1 30.083 51.521 A 7.385 7.385 0 0 0 38.333 51.521 A 3.542 3.542 0 0 1 42.5 51.521 A 7.385 7.385 0 0 0 50.75 51.521 A 3.302 3.302 0 0 1 52.833 50.844 V 46.979 A 7.042 7.042 0 0 0 48.667 48.239 M 46.427 56.219 A 3.302 3.302 0 0 1 44.344 55.542 A 7.375 7.375 0 0 0 36.094 55.542 A 3.302 3.302 0 0 1 34.01 56.219 A 3.25 3.25 0 0 1 31.927 55.542 A 7.385 7.385 0 0 0 23.677 55.542 A 3.531 3.531 0 0 1 19.51 55.542 A 7.042 7.042 0 0 0 15.344 54.282 A 7.042 7.042 0 0 0 11.177 55.542 A 3.302 3.302 0 0 1 9.094 56.219 A 3.302 3.302 0 0 1 7.01 55.542 A 7.042 7.042 0 0 0 3 54.27 V 58.134 A 3.25 3.25 0 0 1 5.083 58.812 C 6.304 59.662 7.763 60.102 9.25 60.072 A 7.042 7.042 0 0 0 13.417 58.812 A 3.302 3.302 0 0 1 15.5 58.134 A 3.25 3.25 0 0 1 17.583 58.812 C 18.804 59.662 20.263 60.102 21.75 60.072 A 7.042 7.042 0 0 0 25.917 58.812 A 3.531 3.531 0 0 1 30.083 58.812 A 7.385 7.385 0 0 0 38.333 58.812 A 3.542 3.542 0 0 1 42.5 58.812 A 7.385 7.385 0 0 0 50.75 58.812 A 3.302 3.302 0 0 1 52.833 58.134 V 54.27 A 7.042 7.042 0 0 0 48.667 55.53 A 3.302 3.302 0 0 1 46.583 56.207";
          typeFillColor = "#0093b2";
          break;
        case 5: // cable car
          typePath =
            "M48 39.28c0 .78-.61 1.72-1.4 1.47l-4.75-1.62V23.75l4.75 1.63c.85.29 1.4.63 1.4 1.4ZM9 27V14.56c0-.78.37-1.71 1.42-1.42l4.73 1.57v15.41l-4.76-1.61C9.48 28.19 9 27.8 9 27Zm24.63-6.08L39.8 23v15.41l-6.19-2.09Zm-10.25 12-6.19-2.08V15.39l6.19 2.09Zm2-14.72 6.18 2.1v15.34l-6.18-2.06Zm21.42 4.18L10.17 10.1c-2.29-.76-3.85 1.76-3.85 3.9v21.79c0 2.17 1.51 3.12 3.85 3.93L46.83 52c2.27.74 3.85-1.75 3.85-3.93v-21.8c0-2.16-1.37-3-3.85-3.92ZM51.81 60 4.09 44a1.65 1.65 0 1 1 1.1-3.11l47.72 15.94a1.65 1.65 0 0 1-.55 3.17 1.81 1.81 0 0 1-.55-.09";
          break;
        case 712: // school
          typePath =
            "M29.086 15c.883 0 3.721.339 4.368 2.112.648 1.775 2.507 8.79 2.591 16.728.011 1.032.036 2.075.058 3.11l1.764-1.322c.677-.501.895-.583 1.681-.583h1.125c.21 0 .491.04.793.134a1.7 1.7 0 0 1-.96-1.533c0-.945.762-1.705 1.707-1.705a1.7 1.7 0 0 1 1.704 1.705 1.7 1.7 0 0 1-2.137 1.65c.196.084.393.192.58.328l3.642 2.708c.99.736.085 2.03-.84 1.392l-2.382-1.649s-1.576 3.52-.985 5.161c.018.058.034.109.032.148l1.532 4.25a.772.772 0 0 1 .71-.42h2.805c.561 0 .561-1.17.561-1.757 0-2.34 1.119-4.685 2.243-4.685l.715.001a1.702 1.702 0 0 1-.791-1.443c0-.946.762-1.704 1.705-1.704.944 0 1.706.758 1.706 1.704 0 .719-.44 1.33-1.064 1.582.207.108.365.272.531.444l2.382 2.49c.307.319.426.607.426 1.028 0 .581-.861.862-1.334.361l-2.033-2.12c-1.123 0-1.543 2.929-1.123 4.099l1.682 4.685c.462 1.297-1.282 1.695-1.68.585l-1.683-4.681s-.56 1.17-1.681 1.17H44.07c-.093 0-.168-.027-.246-.05l.457 1.268c.28.786-.262 1.255-.81 1.244-.357-.003-.699-.223-.874-.659l-3.049-7.539s-.558 3.514-2.803 3.515H35.43c-.608 1.935-1.703 3.263-3.646 3.574v2.43c0 1.239-.502 2.244-1.125 2.244h-2.306c-.62 0-1.125-1.005-1.125-2.244V50.4H9.623v2.355C9.623 53.995 9.12 55 8.5 55H6.193c-.62 0-1.123-1.005-1.123-2.244v-2.373l.002-.057C-.134 49.496.736 41.366.813 33.84c.082-7.937 1.943-14.953 2.589-16.728C4.05 15.337 6.886 15 7.769 15Zm1.025 29.21c-.928 0-1.678.786-1.678 1.754 0 .97.75 1.755 1.678 1.755.923 0 1.674-.788 1.674-1.755 0-.968-.749-1.755-1.674-1.755Zm-23.365 0c-.926 0-1.676.786-1.676 1.754 0 .97.75 1.755 1.676 1.755.926 0 1.677-.788 1.677-1.755 0-.968-.751-1.755-1.677-1.755Zm31.683-6.824-2.292 1.595c.023 2.179-.025 4.247-.311 6.015h.358c1.112 0 1.128-1.611 1.124-2.683v-.246c0-1.752 1.121-4.681 1.121-4.681ZM14.446 18.073l-.085.003c-3.101.092-7.045.441-8.283 1.581-1.242 1.147-1.918 1.919-2.708 11.01a47.295 47.295 0 0 0-.1 1.517h.034c0 2.31 6.764 4.182 15.124 4.195 8.36-.013 15.125-1.888 15.125-4.195h.031a32.362 32.362 0 0 0-.107-1.516c-.781-9.092-1.457-9.864-2.704-11.01-1.122-1.036-4.476-1.42-7.405-1.55.054.228.084.485.084.758 0 .937-.354 1.705-.79 1.705h-7.523c-.433 0-.783-.768-.783-1.705 0-.286.032-.556.09-.793Z";
          break;
        default:
          break;
      }
      return {
        color,
        fillColor,
        strokeColor,
        typePath,
        typeFillColor,
      };
    }, [route_color, route_id, route_text_color, route_type]);

  React.useEffect(() => {
    if (!marker || !typeMarker || !typeIconMarker) return;
    marker.marker?.setPosition({
      lat: vehicle.position.latitude,
      lng: vehicle.position.longitude,
    });
    typeMarker.marker?.setPosition({
      lat: vehicle.position.latitude,
      lng: vehicle.position.longitude,
    });
    typeIconMarker.marker?.setPosition({
      lat: vehicle.position.latitude,
      lng: vehicle.position.longitude,
    });
  }, [
    marker,
    typeMarker,
    typeIconMarker,
    vehicle.position.latitude,
    vehicle.position.longitude,
  ]);

  const point = React.useMemo(() => {
    return (
      <Marker
        key={vehicle_id}
        onClick={onClick}
        options={{
          icon: {
            fillOpacity: 1,
            fillColor,
            path: "M 0 0 m -16 0 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0", // circle
            rotation: bearing,
            strokeColor,
            strokeWeight: 1,
          },
          label: {
            color,
            fontFamily: "roboto, sans-serif",
            fontSize: 13 + "px",
            fontWeight: "700",
            text: route_short_name,
          },
          title: route_long_name,
          zIndex, // prevent flickering
        }}
        position={{
          lat: latitude,
          lng: longitude,
        }}
        ref={setMarker}
      >
        <Marker
          // onClick={onClick}
          options={{
            icon: {
              path: "M 0 0 m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0", // circle
              fillColor: typeFillColor,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 1,
              anchor: new google.maps.Point(-12, -12),
              scale: TYPE_MARKER_SCALE,
            },
            // title: route_long_name,
            zIndex: zIndex + 1,
          }}
          position={{
            lat: latitude,
            lng: longitude,
          }}
          ref={setTypeMarker}
        >
          <Marker
            onClick={onClick}
            options={{
              icon: {
                path: typePath,
                fillColor: "#ffffff",
                fillOpacity: 1,
                strokeWeight: 0,
                anchor: new window.google.maps.Point(
                  27.762 -
                    ((12 * TYPE_MARKER_SCALE) / TYPE_MARKER_SCALE) *
                      TYPE_ICON_SCALE,
                  36.14 -
                    ((12 * TYPE_MARKER_SCALE) / TYPE_MARKER_SCALE) *
                      TYPE_ICON_SCALE
                ),
                scale: (1 / TYPE_ICON_SCALE) * TYPE_MARKER_SCALE,
              },
              title: route_long_name,
              zIndex: zIndex + 2,
            }}
            position={{
              lat: latitude,
              lng: longitude,
            }}
            ref={setTypeIconMarker}
          />
        </Marker>
      </Marker>
    );
  }, [
    onClick,
    fillColor,
    bearing,
    strokeColor,
    color,
    route_short_name,
    route_long_name,
    zIndex,
    latitude,
    longitude,
    typeFillColor,
    vehicle_id,
    typePath,
  ]);

  if (latitude === 0 && longitude === 0) return null; // null island
  return point;
}
