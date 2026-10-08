import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { circlePolygon } from "@/lib/geo/radius";
import type { MapLayer } from "./types";

/**
 * Radien tegnes i NaboRadars grønne — den er det tjenesten måler innenfor. Søkepunktet er
 * nøytralt mørkt: alle funn i kartet har farge etter type, og punktet de måles fra skal ikke
 * kunne forveksles med noen av dem.
 */
export const RADIUS_COLOR = "#1e5a4b";
export const CENTER_COLOR = "#14171a";
/**
 * Radien er en hjelpelinje, ikke et funn: tynn, stiplet og halvt gjennomsiktig, med en nesten
 * usynlig flate. Den skal kunne finnes når man ser etter den, og ellers ikke konkurrere med
 * dataene. Justert opp ett hakk 2026-10-08: på 0,45 forsvant den i tette bykart.
 */
const RADIUS_LINE = 0.62;
const RADIUS_FILL = 0.03;

export interface RadiusLayerData {
  lat: number;
  lng: number;
  radiusM: number;
}

function radiusFeature({ lat, lng, radiusM }: RadiusLayerData) {
  return { type: "Feature" as const, properties: {}, geometry: circlePolygon(lat, lng, radiusM) };
}

function centerFeature({ lat, lng }: RadiusLayerData) {
  return { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [lng, lat] } };
}

/** Søkepunkt + geodetisk radiussirkel. radiusM = 0 viser bare punktet. */
export const radiusLayer: MapLayer<RadiusLayerData> = {
  id: "search-radius",
  mount(map, data) {
    map.addSource("search-radius", { type: "geojson", data: radiusFeature(data) });
    map.addSource("search-center", { type: "geojson", data: centerFeature(data) });
    map.addLayer({
      id: "search-radius-fill",
      type: "fill",
      source: "search-radius",
      paint: { "fill-color": RADIUS_COLOR, "fill-opacity": data.radiusM > 0 ? RADIUS_FILL : 0 },
    });
    map.addLayer({
      id: "search-radius-line",
      type: "line",
      source: "search-radius",
      paint: { "line-color": RADIUS_COLOR, "line-width": 1.4, "line-opacity": data.radiusM > 0 ? RADIUS_LINE : 0, "line-dasharray": [4, 3] },
    });
    map.addLayer({
      id: "search-center-halo",
      type: "circle",
      source: "search-center",
      paint: { "circle-radius": 15, "circle-color": CENTER_COLOR, "circle-opacity": 0.14 },
    });
    void addSearchMarker(map, data);
    map.addLayer({
      id: "search-center-dot",
      type: "circle",
      source: "search-center",
      paint: { "circle-radius": 7, "circle-color": CENTER_COLOR, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
    });
  },
  update(map, data) {
    markers.get(map)?.setLngLat([data.lng, data.lat]);
    (map.getSource("search-radius") as GeoJSONSource | undefined)?.setData(radiusFeature(data));
    (map.getSource("search-center") as GeoJSONSource | undefined)?.setData(centerFeature(data));
    map.setPaintProperty("search-radius-fill", "fill-opacity", data.radiusM > 0 ? RADIUS_FILL : 0);
    map.setPaintProperty("search-radius-line", "line-opacity", data.radiusM > 0 ? RADIUS_LINE : 0);
  },
};

/**
 * Søkepunktet som HTML-merke, i tillegg til punktet i kartbildet.
 *
 * Klynger og andre merker på resultatsiden er HTML-elementer og ligger alltid over kartbildet.
 * Søkepunktet er det viktigste i kartet og skal aldri havne under en klynge, så det får sitt
 * eget merke øverst. Punktet i kartbildet beholdes som reserve til merket er lastet.
 */
const markers = new WeakMap<MapLibreMap, Marker>();

async function addSearchMarker(map: MapLibreMap, data: RadiusLayerData) {
  const { Marker: MarkerClass } = await import("maplibre-gl");
  if (markers.has(map)) return;
  const element = document.createElement("div");
  element.className = "naboradar-searchpoint";
  element.setAttribute("aria-hidden", "true");
  markers.set(map, new MarkerClass({ element }).setLngLat([data.lng, data.lat]).addTo(map));
}
