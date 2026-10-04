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
  // Fargene må kunne leses to og to. Plansaker er blå og ligger øverst av flatene; de tre
  // «grunn»-lagene er varme eller grønne, så en plansak over en sone fortsatt ses som to ting.
  plansak: "#1d4ed8",
  // Kartlagt sone: varm og tydelig. Utredet uten fare: dempet grønn — ikke samme signal.
  kvikkleire_sone: "#b45309",
  kvikkleire_uten_fare: "#4d7c0f",
  forurenset_grunn: "#0f766e",
  // Kraftnettet: én farge for linje og stasjon. Tydelig, men smal nok til ikke å dominere.
  kraftledning: "#7c3aed",
  transformatorstasjon: "#7c3aed",
  datasenter: "#334155",
  // Multefunn og myr vises sammen: varme punkter mot kjølige flater.
  multefunn: "#ea580c",
  myr: "#0891b2",
  // Tyttebær: rød, tydelig forskjellig fra multefunnene når de to vises sammen.
  tyttebaerfunn: "#be123c",
};

const SOURCE = "explore";
const FILL = "explore-fill";
const LINE = "explore-line";
const WIRE = "explore-wire";
/** Bred, usynlig linje over ledningen: en to piksler bred strek er ikke til å treffe. */
const WIRE_HIT = "explore-wire-hit";
const POINT = "explore-point";

const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
/** Referanselaget i «Finn overlapp»: synlig som kontekst, men bak hovedlagets treff. */
const dempet: ExpressionSpecification = ["boolean", ["get", "dempet"], false];
const erFlate: ExpressionSpecification = ["==", ["geometry-type"], "Polygon"];
const erLinje: ExpressionSpecification = ["==", ["geometry-type"], "LineString"];
const erPunkt: ExpressionSpecification = ["==", ["geometry-type"], "Point"];

export const exploreLayer: MapLayer<readonly ExploreFeature[]> = {
  id: "explore",
  interactiveLayerIds: [POINT, WIRE_HIT, FILL],
  markerLayerIds: [POINT],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data), promoteId: "featureId" });
    map.addLayer({
      id: FILL,
      type: "fill",
      source: SOURCE,
      filter: erFlate,
      // Lavt fyll og tydelig kant: to flatelag oppå hverandre skal begge kunne ses.
      paint: { "fill-color": ["get", "farge"], "fill-opacity": ["case", selected, 0.45, dempet, 0.07, 0.16] },
    });
    map.addLayer({
      id: LINE,
      type: "line",
      source: SOURCE,
      filter: erFlate,
      paint: { "line-color": ["get", "farge"], "line-width": ["case", selected, 3, 1.4], "line-opacity": ["case", selected, 0.95, dempet, 0.5, 0.95] },
    });
    map.addLayer({
      id: WIRE,
      type: "line",
      source: SOURCE,
      filter: erLinje,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "farge"], "line-width": ["case", selected, 5, 2], "line-opacity": ["case", selected, 0.9, dempet, 0.45, 0.9] },
    });
    map.addLayer({
      id: WIRE_HIT,
      type: "line",
      source: SOURCE,
      filter: erLinje,
      paint: { "line-color": "#000000", "line-width": 14, "line-opacity": 0 },
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
        "circle-opacity": ["case", selected, 1, dempet, 0.45, 1],
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
      properties: { featureId: feature.id, farge: EXPLORE_COLOR[feature.style], dempet: feature.muted === true },
      geometry: feature.geometry,
    })),
  };
}

function setState(map: MapLibreMap, id: string, selected: boolean) {
  if (map.getSource(SOURCE)) map.setFeatureState({ source: SOURCE, id }, { selected });
}
