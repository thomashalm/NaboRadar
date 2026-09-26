import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { MapLayer } from "./types";

/**
 * Interne research-funn i kartet.
 *
 * Bevisst en annen *form* enn alt annet, ikke bare en annen farge: en ring med en kjerne, i
 * grått. Alle offentlige kilder bruker fylte, fargede punkter, så en grå smultring leses
 * umiddelbart som «ikke en av de publiserte» — også for den som ikke skiller fargene.
 *
 * Valgt funn får en glorie under ringen, tykkere strek og større kjerne. Glorien er et eget lag
 * som bare tegnes for det valgte punktet, slik at ett funn skiller seg fra de andre interne, ikke
 * bare fra de offentlige.
 *
 * Laget monteres bare i admin-visningen. Den offentlige /omrade sender aldri data hit.
 */

export interface InternalMapFeature {
  id: string;
  title: string;
  center: [number, number];
  /** Ferdig formulerte linjer til popupen. Kartet setter aldri sammen tekst selv. */
  lines: string[];
  /** Lenke i popupen, f.eks. til funnet i research-oversikten. */
  href?: string;
  linkLabel?: string;
}

/** Dempet skifergrå. Ingen av de offentlige kategoriene bruker den. */
export const INTERNAL_COLOR = "#334155";
/** Valgt funn: nesten svart, så det skiller seg fra de andre interne ringene. */
export const INTERNAL_SELECTED_COLOR = "#0f172a";

const SOURCE = "internal-findings";

export const internalFindingsLayer: MapLayer<readonly InternalMapFeature[]> = {
  id: "internal-findings",
  interactiveLayerIds: ["internal-findings-ring"],
  markerLayerIds: ["internal-findings-ring"],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data), promoteId: "featureId" });
    const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];

    // Glorie, kun for det valgte funnet. Radius 0 skjuler den for de andre.
    map.addLayer({
      id: "internal-findings-halo",
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["case", selected, 19, 0],
        "circle-color": INTERNAL_SELECTED_COLOR,
        "circle-opacity": 0.16,
      },
    });
    map.addLayer({
      id: "internal-findings-ring",
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["case", selected, 12, 8],
        // Lys kjerneflate slik at ringen leses mot både flyfoto og topografisk bakgrunn.
        "circle-color": "#ffffff",
        "circle-opacity": 0.6,
        "circle-stroke-color": ["case", selected, INTERNAL_SELECTED_COLOR, INTERNAL_COLOR],
        "circle-stroke-width": ["case", selected, 4, 2.5],
      },
    });
    map.addLayer({
      id: "internal-findings-core",
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["case", selected, 4, 2.5],
        "circle-color": ["case", selected, INTERNAL_SELECTED_COLOR, INTERNAL_COLOR],
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
