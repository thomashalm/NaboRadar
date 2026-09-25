import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AreaMapFeature } from "@/lib/facts/queries";
import type { MapLayer } from "./types";

export const PLACE_COLOR = "#6b5bd2";
/** Én farge per hovedtype, alle i samme dempede register: dette er steder, ikke varsler. */
export const OPPVEKST_COLOR = "#0d7a6b";
export const HELSE_COLOR = "#2563a8";
export const SERVERING_COLOR = "#b4622a";
/** Omsorgstilbud: tydelig, men rolig — og forskjellig fra sykehus, skole og servering. */
export const OMSORG_COLOR = "#8c5570";
/**
 * Tilfluktsrom. Bevisst en dempet grå-blå i samme register som resten, ikke rødt eller
 * militært: dette er referanseinformasjon om beredskap, ikke et varsel.
 */
export const TILFLUKTSROM_COLOR = "#4a5568";

const SOURCE = "nearby-places";

/**
 * Punkter i «Nærområdet»: anlegg, skoler og barnehager, sykehus og skjenkesteder.
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
        // Skjenkesteder er mange og små; de skal kunne trykkes, men ikke dominere kartet.
        "circle-radius": ["case", selected, 9, ["==", ["get", "category"], "servering"], 5, 6.5],
        "circle-color": [
          "match",
          ["get", "category"],
          "oppvekst",
          OPPVEKST_COLOR,
          "helse",
          HELSE_COLOR,
          "omsorg",
          OMSORG_COLOR,
          "servering",
          SERVERING_COLOR,
          "tilfluktsrom",
          TILFLUKTSROM_COLOR,
          PLACE_COLOR,
        ],
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
