import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AreaMapFeature } from "@/lib/facts/queries";
import type { MapTone } from "@/lib/map/presentation";
import type { PlanAreaData } from "./plan-areas";
import { planAreasLayer } from "./plan-areas";
import type { MapLayer } from "./types";

export interface AreaShapesData {
  shapes: readonly AreaMapFeature[];
  tone: MapTone;
}

const SOURCE = "area-shapes";
const SELECTED = "area-shapes-selected";
const FLATE: ExpressionSpecification = ["==", ["geometry-type"], "Polygon"];

/**
 * Flater og linjer som hører til et tema: kvikkleiresoner (naturfare) og kraftlinjer
 * (infrastruktur). Svake og nøytrale i oversikten, i temafargen når temaet er valgt. Valgt
 * objekt tegnes fra en egen kilde, med kraftigere strek.
 */
export const areaShapesLayer: MapLayer<AreaShapesData> = {
  id: "area-shapes",
  interactiveLayerIds: ["area-shapes-fill", "area-shapes-line"],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data.shapes) });
    map.addSource(SELECTED, { type: "geojson", data: collection([]) });
    map.addLayer({ id: "area-shapes-fill", type: "fill", source: SOURCE, filter: FLATE, paint: {} });
    map.addLayer({ id: "area-shapes-line", type: "line", source: SOURCE, layout: { "line-cap": "round", "line-join": "round" }, paint: {} });
    map.addLayer({ id: "area-shapes-selected-fill", type: "fill", source: SELECTED, filter: FLATE, paint: { "fill-opacity": 0.3 } });
    map.addLayer({ id: "area-shapes-selected-line", type: "line", source: SELECTED, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": 4 } });
    state.set(map, { shapes: data.shapes, selectedId: null });
    applyTone(map, data.tone);
  },

  update(map, data) {
    const s = state.get(map);
    if (s) s.shapes = data.shapes;
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(collection(data.shapes));
    applyTone(map, data.tone);
    showSelected(map);
  },

  setSelected(map, id) {
    const s = state.get(map);
    if (s) s.selectedId = id;
    showSelected(map);
  },
};

const state = new WeakMap<MapLibreMap, { shapes: readonly AreaMapFeature[]; selectedId: string | null }>();

function collection(shapes: readonly AreaMapFeature[]) {
  return {
    type: "FeatureCollection" as const,
    features: shapes.map((shape) => ({ type: "Feature" as const, properties: { featureId: shape.id }, geometry: shape.geometry })),
  };
}

function applyTone(map: MapLibreMap, tone: MapTone) {
  if (!map.getLayer("area-shapes-fill")) return;
  const tema = tone.mode === "theme";
  map.setPaintProperty("area-shapes-fill", "fill-color", tone.color);
  map.setPaintProperty("area-shapes-fill", "fill-opacity", tema ? 0.16 : 0.06);
  map.setPaintProperty("area-shapes-line", "line-color", tone.color);
  map.setPaintProperty("area-shapes-line", "line-width", tema ? 2.25 : 1);
  map.setPaintProperty("area-shapes-line", "line-opacity", tema ? 0.95 : 0.45);
  map.setPaintProperty("area-shapes-selected-fill", "fill-color", tone.color);
  map.setPaintProperty("area-shapes-selected-line", "line-color", tone.color);
}

function showSelected(map: MapLibreMap) {
  const s = state.get(map);
  const valgt = s?.selectedId ? s.shapes.filter((shape) => shape.id === s.selectedId) : [];
  (map.getSource(SELECTED) as GeoJSONSource | undefined)?.setData(collection(valgt));
}

// ---------------------------------------------------------------------------------------------
// Planområder med samme regel
// ---------------------------------------------------------------------------------------------

export interface PlanAreasTonedData {
  events: PlanAreaData;
  tone: MapTone;
}

/**
 * Planområdene (lib/map/layers/plan-areas.ts) med resultatsidens regel: svake og nøytrale i
 * oversikten, blå når temaet «Planer» er valgt. Polygonene og valglogikken er de samme.
 */
export const planAreasTonedLayer: MapLayer<PlanAreasTonedData> = {
  id: "plan-areas-toned",
  interactiveLayerIds: planAreasLayer.interactiveLayerIds,
  markerLayerIds: planAreasLayer.markerLayerIds,
  idFromFeature: planAreasLayer.idFromFeature,
  mount(map, data) {
    planAreasLayer.mount(map, data.events);
    applyPlanTone(map, data.tone);
  },
  update(map, data) {
    planAreasLayer.update(map, data.events);
    applyPlanTone(map, data.tone);
  },
  setSelected: (map, id, previousId) => planAreasLayer.setSelected?.(map, id, previousId),
};

function applyPlanTone(map: MapLibreMap, tone: MapTone) {
  if (!map.getLayer("plan-areas-fill")) return;
  const tema = tone.mode === "theme";
  const valgt: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
  map.setPaintProperty("plan-areas-fill", "fill-color", tone.color);
  map.setPaintProperty("plan-areas-fill", "fill-opacity", ["case", valgt, 0.38, tema ? 0.16 : 0.06]);
  map.setPaintProperty("plan-areas-line", "line-color", tone.color);
  map.setPaintProperty("plan-areas-line", "line-width", ["case", valgt, 3.5, tema ? 1.75 : 1]);
  map.setPaintProperty("plan-areas-line", "line-opacity", tema ? 0.95 : 0.5);
  map.setPaintProperty("plan-points", "circle-color", tone.color);
  map.setPaintProperty("plan-points", "circle-radius", ["case", valgt, 8, tema ? 5.5 : 3.5]);
  map.setPaintProperty("plan-points", "circle-opacity", tema ? 1 : 0.8);
}
