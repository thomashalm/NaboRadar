import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { CLUSTER, POINT_STYLE, type MapTone } from "@/lib/map/presentation";
import type { MapLayer } from "./types";

/** Ett punkt i kartet. Fargen kommer fra modusen, ikke fra punktet. */
export interface AreaPoint {
  id: string;
  center: [number, number];
}

export interface AreaPointsData {
  points: readonly AreaPoint[];
  tone: MapTone;
}

const SOURCE = "area-points";
const SELECTED = "area-points-selected";
const DOT = "area-points-dot";

/**
 * Punktene på resultatsiden: nøytrale i oversikten, i temafargen når et tema er valgt.
 *
 * - **Klynger** er HTML-merker med antall. Bakgrunnskartet er rasterfliser uten skrifttyper, så
 *   MapLibre kan ikke tegne tall selv. Et trykk på en klynge zoomer inn til den løser seg opp.
 * - **Valgt punkt** tegnes fra en egen kilde, ikke med feature-state: et valgt punkt skal synes
 *   også når det ligger inne i en klynge.
 */
export const areaPointsLayer: MapLayer<AreaPointsData> = {
  id: "area-points",
  interactiveLayerIds: [DOT],
  markerLayerIds: [DOT],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, {
      type: "geojson",
      data: collection(data.points),
      cluster: true,
      clusterRadius: CLUSTER.radius,
      clusterMaxZoom: CLUSTER.maxZoom,
    });
    map.addSource(SELECTED, { type: "geojson", data: collection([]) });
    map.addLayer({
      id: DOT,
      type: "circle",
      source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: { "circle-stroke-color": "#ffffff" },
    });
    map.addLayer({ id: "area-points-selected-halo", type: "circle", source: SELECTED, paint: { "circle-radius": POINT_STYLE.selected.halo, "circle-opacity": 0.22 } });
    map.addLayer({
      id: "area-points-selected-dot",
      type: "circle",
      source: SELECTED,
      paint: { "circle-radius": POINT_STYLE.selected.radius, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
    });
    state.set(map, { points: data.points, tone: data.tone, markers: new Map(), selectedId: null });
    applyTone(map, data.tone);

    const oppdater = () => void syncClusterMarkers(map);
    map.on("moveend", oppdater);
    map.on("sourcedata", (event) => {
      if ("sourceId" in event && event.sourceId === SOURCE && event.isSourceLoaded) oppdater();
    });
  },

  update(map, data) {
    const s = state.get(map);
    if (s) {
      s.points = data.points;
      s.tone = data.tone;
    }
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(collection(data.points));
    applyTone(map, data.tone);
    showSelected(map);
  },

  setSelected(map, id) {
    const s = state.get(map);
    if (s) s.selectedId = id;
    showSelected(map);
  },
};

interface LayerState {
  points: readonly AreaPoint[];
  tone: MapTone;
  markers: Map<number, Marker>;
  selectedId: string | null;
}
/** Tilstanden følger kartet, ikke modulen: flere kart kan leve samtidig. */
const state = new WeakMap<MapLibreMap, LayerState>();

function collection(points: readonly AreaPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      properties: { featureId: point.id },
      geometry: { type: "Point" as const, coordinates: point.center },
    })),
  };
}

function applyTone(map: MapLibreMap, tone: MapTone) {
  if (!map.getLayer(DOT)) return;
  const stil = POINT_STYLE[tone.mode];
  map.setPaintProperty(DOT, "circle-color", tone.color);
  map.setPaintProperty(DOT, "circle-radius", stil.radius);
  map.setPaintProperty(DOT, "circle-stroke-width", stil.stroke);
  map.setPaintProperty(DOT, "circle-opacity", stil.opacity);
  map.setPaintProperty("area-points-selected-halo", "circle-color", tone.color);
  map.setPaintProperty("area-points-selected-dot", "circle-color", tone.color);
  for (const marker of state.get(map)?.markers.values() ?? []) styleCluster(marker.getElement(), tone);
}

function showSelected(map: MapLibreMap) {
  const s = state.get(map);
  const valgt = s?.selectedId ? s.points.filter((p) => p.id === s.selectedId) : [];
  (map.getSource(SELECTED) as GeoJSONSource | undefined)?.setData(collection(valgt));
}

function styleCluster(element: HTMLElement, tone: MapTone) {
  element.style.background = tone.color;
}

/** Holder ett HTML-merke per synlig klynge. Kalles etter hver flytting og når kilden er lastet. */
async function syncClusterMarkers(map: MapLibreMap) {
  const s = state.get(map);
  if (!s || !map.getSource(SOURCE)) return;
  const { Marker: MarkerClass } = await import("maplibre-gl");
  const filter: ExpressionSpecification = ["has", "point_count"];
  const synlige = new Map<number, { coordinates: [number, number]; count: number }>();
  for (const feature of map.querySourceFeatures(SOURCE, { filter })) {
    const id = feature.properties?.cluster_id as number | undefined;
    if (id === undefined || feature.geometry.type !== "Point") continue;
    synlige.set(id, { coordinates: feature.geometry.coordinates as [number, number], count: Number(feature.properties?.point_count ?? 0) });
  }

  for (const [id, marker] of s.markers) {
    if (!synlige.has(id)) {
      marker.remove();
      s.markers.delete(id);
    }
  }
  for (const [id, klynge] of synlige) {
    if (s.markers.has(id)) continue;
    const element = document.createElement("button");
    element.type = "button";
    element.className = "naboradar-cluster";
    element.textContent = String(klynge.count);
    element.setAttribute("aria-label", `${klynge.count} steder. Zoom inn`);
    styleCluster(element, s.tone);
    // Trykket hører til klyngen, ikke til kartet under.
    for (const type of ["click", "mousedown", "touchstart"] as const) {
      element.addEventListener(type, (event) => event.stopPropagation());
    }
    element.addEventListener("click", async () => {
      const zoom = await (map.getSource(SOURCE) as GeoJSONSource).getClusterExpansionZoom(id);
      map.easeTo({ center: klynge.coordinates, zoom: Math.min(zoom, 17), duration: 350 });
    });
    s.markers.set(id, new MarkerClass({ element }).setLngLat(klynge.coordinates).addTo(map));
  }
}
