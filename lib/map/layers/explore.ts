import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { ExploreFeature, ExploreStyle } from "@/lib/admin/explore/types";
import type { MapLayer } from "./types";

/**
 * Kartlaget i Utforsk data (admin): flater og punkter fra datasettet som er søkt opp.
 *
 * Ett lag for alle datasett. Hvordan et objekt tegnes, styres av `style` på objektet; en ny
 * objekttype trenger bare en farge her. Flatene er klikkbare som flater, punktene som markører.
 */
export const EXPLORE_COLOR: Record<ExploreStyle, string> = {
  // Kartlagt sone: varm og tydelig. Utredet uten fare: dempet grønn — ikke samme signal.
  kvikkleire_sone: "#b45309",
  kvikkleire_uten_fare: "#4d7c0f",
  datasenter: "#334155",
};

const SOURCE = "explore";
const FILL = "explore-fill";
const LINE = "explore-line";
const POINT = "explore-point";

const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
const erFlate: ExpressionSpecification = ["==", ["geometry-type"], "Polygon"];
const erPunkt: ExpressionSpecification = ["==", ["geometry-type"], "Point"];

export const exploreLayer: MapLayer<readonly ExploreFeature[]> = {
  id: "explore",
  interactiveLayerIds: [POINT, FILL],
  markerLayerIds: [POINT],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data), promoteId: "featureId" });
    map.addLayer({
      id: FILL,
      type: "fill",
      source: SOURCE,
      filter: erFlate,
      paint: { "fill-color": ["get", "farge"], "fill-opacity": ["case", selected, 0.5, 0.22] },
    });
    map.addLayer({
      id: LINE,
      type: "line",
      source: SOURCE,
      filter: erFlate,
      paint: { "line-color": ["get", "farge"], "line-width": ["case", selected, 3, 1.2], "line-opacity": 0.95 },
    });
    map.addLayer({
      id: POINT,
      type: "circle",
      source: SOURCE,
      filter: erPunkt,
      paint: {
        "circle-radius": ["case", selected, 10, 6.5],
        "circle-color": ["get", "farge"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["case", selected, 3, 2],
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

function collection(features: readonly ExploreFeature[]) {
  return {
    type: "FeatureCollection" as const,
    features: features.map((feature) => ({
      type: "Feature" as const,
      properties: { featureId: feature.id, farge: EXPLORE_COLOR[feature.style] },
      geometry: feature.geometry,
    })),
  };
}

function setState(map: MapLibreMap, id: string, selected: boolean) {
  if (map.getSource(SOURCE)) map.setFeatureState({ source: SOURCE, id }, { selected });
}
