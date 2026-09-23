import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AreaMapFeature } from "@/lib/facts/queries";
import type { MapLayer } from "./types";

export const SITE_COLOR = "#0f766e";

const SOURCE = "contaminated-sites";

/**
 * Registrerte lokaliteter med forurenset grunn, tegnet som flater slik kilden har dem.
 * Flatene ligger under planområdene, som er hovedinnholdet i kartet.
 */
export const contaminatedSitesLayer: MapLayer<AreaMapFeature[]> = {
  id: "contaminated-sites",
  interactiveLayerIds: ["contaminated-sites-fill"],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data), promoteId: "featureId" });
    const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
    map.addLayer({
      id: "contaminated-sites-fill",
      type: "fill",
      source: SOURCE,
      paint: { "fill-color": SITE_COLOR, "fill-opacity": ["case", selected, 0.35, 0.16] },
    });
    map.addLayer({
      id: "contaminated-sites-line",
      type: "line",
      source: SOURCE,
      paint: {
        "line-color": SITE_COLOR,
        "line-width": ["case", selected, 2.5, 1.2],
        "line-opacity": 0.9,
        "line-dasharray": [3, 2],
      },
    });
  },

  update(map, data) {
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(collection(data));
  },

  setSelected(map, id, previousId) {
    if (previousId && previousId !== id) setState(map, previousId, false);
    if (id) setState(map, id, true);
  },
};

function collection(sites: AreaMapFeature[]) {
  return {
    type: "FeatureCollection" as const,
    features: sites.map((site) => ({
      type: "Feature" as const,
      properties: { featureId: site.id },
      geometry: site.geometry,
    })),
  };
}

function setState(map: MapLibreMap, id: string, selected: boolean) {
  if (map.getSource(SOURCE)) map.setFeatureState({ source: SOURCE, id }, { selected });
}
