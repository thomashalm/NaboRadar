import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AreaMapFeature } from "@/lib/facts/queries";
import type { MapLayer } from "./types";

export const PLACE_COLOR = "#6b5bd2";
/** Skoler og barnehager skiller seg fra anleggene, men i samme dempede register. */
export const OPPVEKST_COLOR = "#0d7a6b";

const SOURCE = "nearby-places";

/**
 * Punkter i «Nærområdet» — i dag anlegg med utslippstillatelse.
 *
 * Bevisst rolig markør: dette er steder som finnes, ikke varsler. Laget tar imot punkter fra
 * hvilken som helst kategori, så en ny type (sykehus, sykehjem) bare krever at den kommer med
 * i dataene — ikke et nytt kartlag.
 */
export const nearbyPlacesLayer: MapLayer<AreaMapFeature[]> = {
  id: "nearby-places",
  interactiveLayerIds: ["nearby-places-dot"],
  markerLayerIds: ["nearby-places-dot"],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data), promoteId: "featureId" });
    const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
    map.addLayer({
      id: "nearby-places-dot",
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["case", selected, 9, 6.5],
        "circle-color": ["match", ["get", "category"], "oppvekst", OPPVEKST_COLOR, PLACE_COLOR],
        "circle-opacity": 0.9,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
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

function collection(places: AreaMapFeature[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((place) => ({
      type: "Feature" as const,
      properties: { featureId: place.id, category: place.category },
      // Punktkilder kan ha flate i databasen; i kartet holder det med ett punkt.
      geometry: { type: "Point" as const, coordinates: place.center },
    })),
  };
}

function setState(map: MapLibreMap, id: string, selected: boolean) {
  if (map.getSource(SOURCE)) map.setFeatureState({ source: SOURCE, id }, { selected });
}
