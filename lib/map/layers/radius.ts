import type { GeoJSONSource } from "maplibre-gl";
import { circlePolygon } from "@/lib/geo/radius";
import type { MapLayer } from "./types";

/**
 * Radien tegnes i NaboRadars grønne — den er det tjenesten måler innenfor. Søkepunktet er
 * nøytralt mørkt: alle funn i kartet har farge etter type, og punktet de måles fra skal ikke
 * kunne forveksles med noen av dem.
 */
export const RADIUS_COLOR = "#1e5a4b";
export const CENTER_COLOR = "#14171a";

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
      paint: { "fill-color": RADIUS_COLOR, "fill-opacity": data.radiusM > 0 ? 0.05 : 0 },
    });
    map.addLayer({
      id: "search-radius-line",
      type: "line",
      source: "search-radius",
      paint: { "line-color": RADIUS_COLOR, "line-width": 1.75, "line-opacity": data.radiusM > 0 ? 0.75 : 0 },
    });
    map.addLayer({
      id: "search-center-halo",
      type: "circle",
      source: "search-center",
      paint: { "circle-radius": 15, "circle-color": CENTER_COLOR, "circle-opacity": 0.14 },
    });
    map.addLayer({
      id: "search-center-dot",
      type: "circle",
      source: "search-center",
      paint: { "circle-radius": 7, "circle-color": CENTER_COLOR, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
    });
  },
  update(map, data) {
    (map.getSource("search-radius") as GeoJSONSource | undefined)?.setData(radiusFeature(data));
    (map.getSource("search-center") as GeoJSONSource | undefined)?.setData(centerFeature(data));
    map.setPaintProperty("search-radius-fill", "fill-opacity", data.radiusM > 0 ? 0.05 : 0);
    map.setPaintProperty("search-radius-line", "line-opacity", data.radiusM > 0 ? 0.75 : 0);
  },
};
