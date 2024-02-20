const response = await fetch("/api/routes");
const routes = await response.json();
routes.sort((a, b) => a.route_id - b.route_id);
let output = "";
routes.forEach((route) => {
  if (route.route_type !== 3) return; // bus
  if (route.route_color === "636466")
    output += "case RouteId.ROUTE_" + route.route_short_name + ":\n";
});
output += "  return BusRouteType.PEAK_EXPRESS_EXTENDED;\n";
console.log(output);
