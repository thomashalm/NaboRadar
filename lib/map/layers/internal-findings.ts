import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { MapLayer } from "./types";

/**
 * Interne research-funn i kartet.
 *
 * Bevisst en annen markørform enn alt annet: hul ring med en liten kjerne, i grått. Alle
 * offentlige kilder bruker fylte, fargede punkter, så en hul grå ring leses umiddelbart som
 * «ikke en av de publiserte». Den skal være synlig for den som ser etter den, og ellers holde
 * seg i bakgrunnen — et internt arbeidsnotat, ikke et funn vi står for overfor brukerne.
 *
 * Laget er montert kun i admin-visningen. Den offentlige /omrade sender aldri data hit.
 */

export interface InternalMapFeature {
  id: string;
  title: string;
  center: [number, number];
  /** Ferdig formulerte linjer til popupen. */
  lines: string[];
}

/** Dempet skifergrå. Ingen av de offentlige kategoriene bruker den. */
export const INTERNAL_COLOR = "#64748b";

const SOURCE = "internal-findings";

export const internalFindingsLayer: MapLayer<readonly InternalMapFeature[]> = {
  id: "internal-findings",
  interactiveLayerIds: ["internal-findings-ring"],
  markerLayerIds: ["internal-findings-ring"],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data), promoteId: "featureId" });
    const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
    map.addLayer({
      id: "internal-findings-ring",
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["case", selected, 10, 7.5],
        // Hul: bakgrunnen skinner gjennom, bare ringen tegnes.
        "circle-color": "#ffffff",
        "circle-opacity": 0.25,
        "circle-stroke-color": INTERNAL_COLOR,
        "circle-stroke-width": ["case", selected, 3, 2],
      },
    });
    map.addLayer({
      id: "internal-findings-core",
      type: "circle",
      source: SOURCE,
      paint: { "circle-radius": 2, "circle-color": INTERNAL_COLOR, "circle-opacity": 0.9 },
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

function collection(funn: readonly InternalMapFeature[]) {
  return {
    type: "FeatureCollection" as const,
    features: funn.map((f) => ({
      type: "Feature" as const,
      properties: { featureId: f.id },
      geometry: { type: "Point" as const, coordinates: f.center },
    })),
  };
}

function setState(map: MapLibreMap, id: string, selected: boolean) {
  if (map.getSource(SOURCE)) map.setFeatureState({ source: SOURCE, id }, { selected });
}
