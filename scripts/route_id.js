const response = await fetch("/api/routes");
const routes = await response.json();
routes.sort((a, b) => a.route_id - b.route_id);
let output = "export enum MetlinkRouteId {\n";
routes.forEach((route) => {
  output +=
    "  ROUTE_" + route.route_short_name + " = \"" + route.route_id + "\",\n";
});
output += "}";
console.log(output);
