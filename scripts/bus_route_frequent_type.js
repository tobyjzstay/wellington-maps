const response = await fetch("/api/routes");
const routes = await response.json();
routes.sort((a, b) => a.route_id - b.route_id);
let output = "";
routes.forEach((route) => {
  if (
    route.route_type !== 3 || // bus
    route.route_color === "308ad9" || // standard
    route.route_color === "636466" || // peak, express, extended
    route.route_short_name.startsWith("N") // midnight
  )
    return;
  output += "case RouteId.ROUTE_" + route.route_short_name + ":\n";
});
output += "  return BusRouteType.FREQUENT;\n";
console.log(output);
