import { Route } from "./api/routes/route";
import { Shape } from "./api/shapes/route";
import { Trip } from "./api/trips/route";
import bus from "./bus.svg";
import cableCar from "./cable-car.svg";
import ferry from "./ferry.svg";
import rail from "./rail.svg";
import schoolBus from "./school-bus.svg";

const Z_INDEX_BUFFER = 10000;

export enum RouteType {
  RAIL = 2,
  BUS = 3,
  FERRY = 4,
  CABLE_CAR = 5,
  SCHOOL_BUS = 712,
}

export enum BusRouteType {
  FREQUENT,
  STANDARD,
  PEAK_EXPRESS_EXTENDED,
  MIDNIGHT,
}

export enum RouteId {
  ROUTE_KPL = "2",
  ROUTE_MEL = "3",
  ROUTE_WRL = "4",
  ROUTE_HVL = "5",
  ROUTE_JVL = "6",
  ROUTE_AX = "7",
  ROUTE_1 = "10",
  ROUTE_2 = "20",
  ROUTE_3 = "30",
  ROUTE_4 = "40",
  ROUTE_7 = "70",
  ROUTE_21 = "210",
  ROUTE_22 = "220",
  ROUTE_110 = "1100",
  ROUTE_120 = "1200",
  ROUTE_130 = "1300",
  ROUTE_220 = "2200",
  ROUTE_14 = "140",
  ROUTE_17 = "170",
  ROUTE_18 = "180",
  ROUTE_19 = "190",
  ROUTE_20 = "200",
  ROUTE_23 = "230",
  ROUTE_24 = "240",
  ROUTE_25 = "250",
  ROUTE_27 = "270",
  ROUTE_29 = "290",
  ROUTE_52 = "520",
  ROUTE_60 = "600",
  ROUTE_83 = "830",
  ROUTE_111 = "1110",
  ROUTE_112 = "1120",
  ROUTE_114 = "1140",
  ROUTE_115 = "1150",
  ROUTE_121 = "1210",
  ROUTE_145 = "1450",
  ROUTE_149 = "1490",
  ROUTE_150 = "1500",
  ROUTE_154 = "1540",
  ROUTE_160 = "1600",
  ROUTE_170 = "1700",
  ROUTE_200 = "2000",
  ROUTE_210 = "2100",
  ROUTE_226 = "2260",
  ROUTE_230 = "2300",
  ROUTE_236 = "2360",
  ROUTE_250 = "2500",
  ROUTE_260 = "2600",
  ROUTE_261 = "2610",
  ROUTE_262 = "2620",
  ROUTE_280 = "2800",
  ROUTE_281 = "2810",
  ROUTE_290 = "2900",
  ROUTE_12e = "121",
  ROUTE_13 = "130",
  ROUTE_26 = "260",
  ROUTE_28 = "280",
  ROUTE_30x = "300",
  ROUTE_31x = "310",
  ROUTE_32x = "320",
  ROUTE_33 = "330",
  ROUTE_34 = "340",
  ROUTE_35 = "350",
  ROUTE_36 = "360",
  ROUTE_37 = "370",
  ROUTE_39 = "390",
  ROUTE_56 = "560",
  ROUTE_57 = "570",
  ROUTE_58 = "580",
  ROUTE_59 = "590",
  ROUTE_60e = "601",
  ROUTE_81 = "810",
  ROUTE_84 = "840",
  ROUTE_113 = "1130",
  ROUTE_201 = "2010",
  ROUTE_202 = "2020",
  ROUTE_203 = "2030",
  ROUTE_204 = "2040",
  ROUTE_206 = "2060",
  ROUTE_251 = "2510",
  ROUTE_264 = "2640",
  ROUTE_291 = "2910",
  ROUTE_300 = "3000",
  ROUTE_HX = "9900",
  ROUTE_N1 = "9911",
  ROUTE_N2 = "9912",
  ROUTE_N3 = "9913",
  ROUTE_N4 = "9914",
  ROUTE_N5 = "9915",
  ROUTE_N6 = "9916",
  ROUTE_N8 = "9918",
  ROUTE_N22 = "9922",
  ROUTE_N66 = "9966",
  ROUTE_N88 = "9988",
  ROUTE_QDF = "8",
  ROUTE_MIF = "14",
  ROUTE_CCL = "9",
  ROUTE_309 = "3090",
  ROUTE_313 = "3130",
  ROUTE_315 = "3150",
  ROUTE_366 = "3660",
  ROUTE_402 = "4020",
  ROUTE_421 = "4210",
  ROUTE_429 = "4290",
  ROUTE_430 = "4300",
  ROUTE_440 = "4400",
  ROUTE_441 = "4410",
  ROUTE_442 = "4420",
  ROUTE_444 = "4440",
  ROUTE_445 = "4450",
  ROUTE_460 = "4600",
  ROUTE_461 = "4610",
  ROUTE_465 = "4650",
  ROUTE_500 = "5000",
  ROUTE_501 = "5010",
  ROUTE_505 = "5050",
  ROUTE_507 = "5070",
  ROUTE_508 = "5080",
  ROUTE_509 = "5090",
  ROUTE_510 = "5100",
  ROUTE_512 = "5120",
  ROUTE_530 = "5300",
  ROUTE_611 = "6110",
  ROUTE_612 = "6120",
  ROUTE_614 = "6140",
  ROUTE_615 = "6150",
  ROUTE_616 = "6160",
  ROUTE_617 = "6170",
  ROUTE_619 = "6190",
  ROUTE_621 = "6210",
  ROUTE_623 = "6230",
  ROUTE_625 = "6250",
  ROUTE_627 = "6270",
  ROUTE_633 = "6330",
  ROUTE_634 = "6340",
  ROUTE_635 = "6350",
  ROUTE_646 = "6460",
  ROUTE_648 = "6480",
  ROUTE_654 = "6540",
  ROUTE_667 = "6670",
  ROUTE_673 = "6730",
  ROUTE_674 = "6740",
  ROUTE_677 = "6770",
  ROUTE_680 = "6800",
  ROUTE_681 = "6810",
  ROUTE_682 = "6820",
  ROUTE_685 = "6850",
  ROUTE_704 = "7040",
  ROUTE_711 = "7110",
  ROUTE_712 = "7120",
  ROUTE_715 = "7150",
  ROUTE_716 = "7160",
  ROUTE_717 = "7170",
  ROUTE_718 = "7180",
  ROUTE_719 = "7190",
  ROUTE_721 = "7210",
  ROUTE_722 = "7220",
  ROUTE_725 = "7250",
  ROUTE_726 = "7260",
  ROUTE_730 = "7300",
  ROUTE_731 = "7310",
  ROUTE_732 = "7320",
  ROUTE_734 = "7340",
  ROUTE_736 = "7360",
  ROUTE_737 = "7370",
  ROUTE_739 = "7390",
  ROUTE_740 = "7400",
  ROUTE_742 = "7420",
  ROUTE_743 = "7430",
  ROUTE_744 = "7440",
  ROUTE_745 = "7450",
  ROUTE_746 = "7460",
  ROUTE_751 = "7510",
  ROUTE_753 = "7530",
  ROUTE_754 = "7540",
  ROUTE_755 = "7550",
  ROUTE_758 = "7580",
  ROUTE_760 = "7600",
  ROUTE_762 = "7620",
  ROUTE_764 = "7640",
  ROUTE_767 = "7670",
  ROUTE_768 = "7680",
  ROUTE_769 = "7690",
  ROUTE_770 = "7700",
  ROUTE_774 = "7740",
  ROUTE_775 = "7750",
  ROUTE_776 = "7760",
  ROUTE_784 = "7840",
  ROUTE_791 = "7910",
  ROUTE_823 = "8230",
  ROUTE_825 = "8250",
  ROUTE_828 = "8280",
  ROUTE_842 = "8420",
  ROUTE_843 = "8430",
  ROUTE_848 = "8480",
  ROUTE_849 = "8490",
  ROUTE_852 = "8520",
  ROUTE_853 = "8530",
  ROUTE_854 = "8540",
  ROUTE_855 = "8550",
  ROUTE_860 = "8600",
  ROUTE_866 = "8660",
  ROUTE_868 = "8680",
  ROUTE_874 = "8740",
  ROUTE_886 = "8860",
  ROUTE_887 = "8870",
  ROUTE_888 = "8880",
  ROUTE_901 = "9010",
  ROUTE_906 = "9060",
  ROUTE_911 = "9110",
  ROUTE_915 = "9150",
  ROUTE_916 = "9160",
  ROUTE_929 = "9290",
  ROUTE_930 = "9300",
  ROUTE_931 = "9310",
  ROUTE_935 = "9350",
  ROUTE_951 = "9510",
  ROUTE_953 = "9530",
  ROUTE_955 = "9550",
}

export enum ZIndexLayer {
  POLYLINE,
  POLYLINE_SELECTED,
  MARKER_STALE,
  MARKER,
}

export function getBusRouteType(route_id: RouteId) {
  switch (route_id) {
    case RouteId.ROUTE_AX:
    case RouteId.ROUTE_1:
    case RouteId.ROUTE_2:
    case RouteId.ROUTE_3:
    case RouteId.ROUTE_4:
    case RouteId.ROUTE_7:
    case RouteId.ROUTE_21:
    case RouteId.ROUTE_22:
    case RouteId.ROUTE_110:
    case RouteId.ROUTE_120:
    case RouteId.ROUTE_130:
    case RouteId.ROUTE_220:
      return BusRouteType.FREQUENT;
    case RouteId.ROUTE_14:
    case RouteId.ROUTE_17:
    case RouteId.ROUTE_18:
    case RouteId.ROUTE_19:
    case RouteId.ROUTE_20:
    case RouteId.ROUTE_23:
    case RouteId.ROUTE_24:
    case RouteId.ROUTE_25:
    case RouteId.ROUTE_27:
    case RouteId.ROUTE_29:
    case RouteId.ROUTE_52:
    case RouteId.ROUTE_60:
    case RouteId.ROUTE_83:
    case RouteId.ROUTE_111:
    case RouteId.ROUTE_112:
    case RouteId.ROUTE_114:
    case RouteId.ROUTE_115:
    case RouteId.ROUTE_121:
    case RouteId.ROUTE_145:
    case RouteId.ROUTE_149:
    case RouteId.ROUTE_150:
    case RouteId.ROUTE_154:
    case RouteId.ROUTE_160:
    case RouteId.ROUTE_170:
    case RouteId.ROUTE_200:
    case RouteId.ROUTE_210:
    case RouteId.ROUTE_226:
    case RouteId.ROUTE_230:
    case RouteId.ROUTE_236:
    case RouteId.ROUTE_250:
    case RouteId.ROUTE_260:
    case RouteId.ROUTE_261:
    case RouteId.ROUTE_262:
    case RouteId.ROUTE_280:
    case RouteId.ROUTE_281:
    case RouteId.ROUTE_290:
      return BusRouteType.STANDARD;
    case RouteId.ROUTE_12e:
    case RouteId.ROUTE_13:
    case RouteId.ROUTE_26:
    case RouteId.ROUTE_28:
    case RouteId.ROUTE_30x:
    case RouteId.ROUTE_31x:
    case RouteId.ROUTE_32x:
    case RouteId.ROUTE_33:
    case RouteId.ROUTE_34:
    case RouteId.ROUTE_35:
    case RouteId.ROUTE_36:
    case RouteId.ROUTE_37:
    case RouteId.ROUTE_39:
    case RouteId.ROUTE_56:
    case RouteId.ROUTE_57:
    case RouteId.ROUTE_58:
    case RouteId.ROUTE_59:
    case RouteId.ROUTE_60e:
    case RouteId.ROUTE_81:
    case RouteId.ROUTE_84:
    case RouteId.ROUTE_113:
    case RouteId.ROUTE_201:
    case RouteId.ROUTE_202:
    case RouteId.ROUTE_203:
    case RouteId.ROUTE_204:
    case RouteId.ROUTE_206:
    case RouteId.ROUTE_251:
    case RouteId.ROUTE_264:
    case RouteId.ROUTE_291:
    case RouteId.ROUTE_300:
    case RouteId.ROUTE_HX:
      return BusRouteType.PEAK_EXPRESS_EXTENDED;
    case RouteId.ROUTE_N1:
    case RouteId.ROUTE_N2:
    case RouteId.ROUTE_N3:
    case RouteId.ROUTE_N4:
    case RouteId.ROUTE_N5:
    case RouteId.ROUTE_N6:
    case RouteId.ROUTE_N8:
    case RouteId.ROUTE_N22:
    case RouteId.ROUTE_N66:
    case RouteId.ROUTE_N88:
      return BusRouteType.MIDNIGHT;
    default:
      return null;
  }
}

export function getRouteColors(route: Route) {
  const { route_id, route_type, route_color, route_text_color } = route;

  const colors = Object.create({
    backgroundColor: "#" + route_color,
    bearingColor: "#" + route_color,
    polylineColor: "#" + route_color,
    strokeColor: "#" + route_color,
    textColor: "#" + route_text_color,
    typeColor: getRouteTypeColor(route_type),
  });

  switch (route_type) {
    case RouteType.RAIL:
      // override Metlink's rail color (#000000)
      colors.textColor = "#ffffff";
      break;
    case RouteType.BUS:
      switch (getBusRouteType(route_id)) {
        case BusRouteType.FREQUENT:
          colors.textColor = "#ffffff";
          break;
        case BusRouteType.STANDARD:
        case BusRouteType.PEAK_EXPRESS_EXTENDED:
          colors.backgroundColor = "#ffffff";
          colors.textColor = "#" + route_color;
          break;
        case BusRouteType.MIDNIGHT:
          colors.backgroundColor = "#3d3d3d";
          colors.polylineColor = "#3d3d3d";
          colors.strokeColor = "#3d3d3d";
          colors.textColor = "#fff200";
          break;
        default:
          break;
      }
      break;
    case RouteType.FERRY:
      colors.textColor = "#ffffff";
      break;
    case RouteType.CABLE_CAR:
    case RouteType.SCHOOL_BUS:
      break;
    default:
      break;
  }

  return colors;
}

export function getRouteTypeColor(route_type: RouteType) {
  switch (route_type) {
    case RouteType.RAIL:
      return "#784e90";
    case RouteType.BUS:
      return "#4e801f";
    case RouteType.FERRY:
      return "#0093b2";
    case RouteType.CABLE_CAR:
    case RouteType.SCHOOL_BUS:
    default:
      return null;
  }
}

export function getRouteTypeSvg(route_type: RouteType): string {
  switch (route_type) {
    case RouteType.RAIL:
      return rail;
    case RouteType.BUS:
      return bus;
    case RouteType.FERRY:
      return ferry;
    case RouteType.CABLE_CAR:
      return cableCar;
    case RouteType.SCHOOL_BUS:
      return schoolBus;
    default:
      return "";
  }
}

export async function getRouteMap() {
  const response = await fetch("/api/routes");
  if (!response.ok) return null;
  try {
    const routes: Route[] = await response.json();
    const routeMap = new Map<number, Route>();
    for (const route of routes) {
      const route_id = parseInt(route.route_id);
      routeMap.set(route_id, route);
    }
    return routeMap;
  } catch (error) {
    console.error("Unable to parse routes.", error);
    return null;
  }
}

export async function getShapeMap() {
  const response = await fetch("/api/shapes");
  if (!response.ok) return null;
  try {
    const shapes: Shape[] = await response.json();
    const shapeMap = new Map<string, Shape[]>();
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      const { shape_id } = shape;
      if (!shapeMap.has(shape_id)) shapeMap.set(shape_id, []);
      shapeMap.get(shape_id)!.push(shape);
    }
    return shapeMap;
  } catch (error) {
    console.error("Unable to parse shapes.", error);
    return null;
  }
}

export async function getTripMap() {
  const response = await fetch("/api/trips");
  if (!response.ok) return null;
  try {
    const trips: Trip[] = await response.json();
    const tripMap = new Map<string, Trip>();
    for (const trip of trips) {
      tripMap.set(trip.trip_id, trip);
    }
    return tripMap;
  } catch (error) {
    console.error("Unable to parse trips.", error);
    return null;
  }
}

export function getZIndex(id: number, layer: ZIndexLayer) {
  return Z_INDEX_BUFFER * (layer + 1) - id;
}
