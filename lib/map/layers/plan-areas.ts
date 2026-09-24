import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AreaEvent } from "@/types/event";
import type { MapLayer } from "./types";

export const PLAN_COLOR = "#c2410c";

export type PlanAreaData = Pick<AreaEvent, "id" | "title" | "geometry" | "centroid">[];

const SOURCE_AREAS = "plan-areas";
const SOURCE_POINTS = "plan-points";

function areasCollection(events: PlanAreaData) {
  return {
    type: "FeatureCollection" as const,
    features: events.map((e) => ({ type: "Feature" as const, properties: { eventId: e.id, title: e.title }, geometry: e.geometry })),
  };
}

/** Punkt per plan, slik at små områder også er synlige og klikkbare ved lav zoom. */
function pointsCollection(events: PlanAreaData) {
  return {
    type: "FeatureCollection" as const,
    features: events.map((e) => ({ type: "Feature" as const, properties: { eventId: e.id }, geometry: e.centroid })),
  };
}

function setState(map: MapLibreMap, id: string, selected: boolean) {
  for (const source of [SOURCE_AREAS, SOURCE_POINTS]) {
    if (map.getSource(source)) map.setFeatureState({ source, id }, { selected });
  }
}

/** Planområder (ekte polygoner fra kilden) med valgt-tilstand. */
export const planAreasLayer: MapLayer<PlanAreaData> = {
  id: "plan-areas",
  interactiveLayerIds: ["plan-areas-fill", "plan-points"],
  markerLayerIds: ["plan-points"],
  idFromFeature: (properties) => (typeof properties.eventId === "string" ? properties.eventId : null),

  mount(map, data) {
    map.addSource(SOURCE_AREAS, { type: "geojson", data: areasCollection(data), promoteId: "eventId" });
    map.addSource(SOURCE_POINTS, { type: "geojson", data: pointsCollection(data), promoteId: "eventId" });
    const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
    map.addLayer({
      id: "plan-areas-fill",
      type: "fill",
      source: SOURCE_AREAS,
      paint: { "fill-color": PLAN_COLOR, "fill-opacity": ["case", selected, 0.4, 0.2] },
    });
    map.addLayer({
      id: "plan-areas-line",
      type: "line",
      source: SOURCE_AREAS,
      paint: { "line-color": PLAN_COLOR, "line-width": ["case", selected, 3, 1.5], "line-opacity": 0.95 },
    });
    // Punktene vises bare når polygonet er for lite til å se (lav zoom).
    map.addLayer({
      id: "plan-points",
      type: "circle",
      source: SOURCE_POINTS,
      maxzoom: 14,
      paint: {
        "circle-radius": ["case", selected, 7, 5],
        "circle-color": PLAN_COLOR,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  },

  update(map, data) {
    (map.getSource(SOURCE_AREAS) as GeoJSONSource | undefined)?.setData(areasCollection(data));
    (map.getSource(SOURCE_POINTS) as GeoJSONSource | undefined)?.setData(pointsCollection(data));
  },

  setSelected(map, id, previousId) {
    if (previousId && previousId !== id) setState(map, previousId, false);
    if (id) setState(map, id, true);
  },
};
