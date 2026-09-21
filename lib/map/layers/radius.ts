import type { GeoJSONSource } from "maplibre-gl";
import { circlePolygon } from "@/lib/geo/radius";
import type { MapLayer } from "./types";

export const RADIUS_COLOR = "#2447d4";

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
      paint: { "line-color": RADIUS_COLOR, "line-width": 2, "line-opacity": data.radiusM > 0 ? 0.8 : 0 },
    });
    map.addLayer({
      id: "search-center-halo",
      type: "circle",
      source: "search-center",
      paint: { "circle-radius": 13, "circle-color": RADIUS_COLOR, "circle-opacity": 0.15 },
    });
    map.addLayer({
      id: "search-center-dot",
      type: "circle",
      source: "search-center",
      paint: { "circle-radius": 6.5, "circle-color": RADIUS_COLOR, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 },
    });
  },
  update(map, data) {
    (map.getSource("search-radius") as GeoJSONSource | undefined)?.setData(radiusFeature(data));
    (map.getSource("search-center") as GeoJSONSource | undefined)?.setData(centerFeature(data));
    map.setPaintProperty("search-radius-fill", "fill-opacity", data.radiusM > 0 ? 0.05 : 0);
    map.setPaintProperty("search-radius-line", "line-opacity", data.radiusM > 0 ? 0.8 : 0);
  },
};
