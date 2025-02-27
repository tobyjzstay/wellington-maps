const response = await fetch("/api/routes");
const routes = await response.json();
routes.sort((a, b) => {
  if (a.route_type !== b.route_type) {
    return a.route_type - b.route_type;
  } else if (a.route_type === 3 && b.route_type === 3) {
    const aBusType = getBusRouteType(a);
    const bBusType = getBusRouteType(b);
    const busTypeDiff = aBusType - bBusType;
    if (busTypeDiff !== 0) return busTypeDiff;
  }
  return a.route_id - b.route_id;
});
let output = "export enum RouteId {\n";
routes.forEach((route) => {
  output +=
    "  ROUTE_" + route.route_short_name + ' = "' + route.route_id + '",\n';
});
output += "}";
console.log(output);

function getBusRouteType(route) {
  if (route.route_color === "308ad9") {
    return 2; // standard
  } else if (route.route_color === "636466") {
    return 3; // peak, express, extended
  } else if (route.route_short_name.startsWith("N")) {
    return 4; // midnight
  } else {
    return 1; // frequent
  }
}
