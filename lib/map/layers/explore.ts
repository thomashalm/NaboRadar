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
  // Web-spor: lilla, stiplet sirkel. Verken farge eller form ligner et registrert funn.
  multe_webspor: "#a21caf",
  myr: "#0891b2",
  // Tyttebær: rød, tydelig forskjellig fra multefunnene når de to vises sammen.
  tyttebaerfunn: "#be123c",
  // Kantarell: gul. Mørk nok til å synes mot det lyse kartet.
  kantarellfunn: "#ca8a04",
  // Steinsopp: brun, så den skiller seg fra kantarell når de to vises sammen.
  steinsoppfunn: "#78350f",
};

const SOURCE = "explore";
const FILL = "explore-fill";
const LINE = "explore-line";
/** Stiplet kant for omtrentlige områder (web-spor): flaten er ikke en kartlagt grense. */
const DASH = "explore-dash";
const WIRE = "explore-wire";
/** Bred, usynlig linje over ledningen: en to piksler bred strek er ikke til å treffe. */
const WIRE_HIT = "explore-wire-hit";
const POINT = "explore-point";
/** Åpen ring over omtrentlige områder når kartet er zoomet ut og sirkelen blir for liten å se. */
const RING = "explore-ring";
/** Fra dette zoomnivået er sirkelen selv stor nok. */
const RING_MAXZOOM = 11.5;

const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
/** Referanselaget i «Finn overlapp»: synlig som kontekst, men bak hovedlagets treff. */
const dempet: ExpressionSpecification = ["boolean", ["get", "dempet"], false];
const erFlate: ExpressionSpecification = ["==", ["geometry-type"], "Polygon"];
const erLinje: ExpressionSpecification = ["==", ["geometry-type"], "LineString"];
/** Flater som ikke er en kartlagt grense, men et omtrentlig område rundt et stedsnavn. */
const omtrentlig: ExpressionSpecification = ["boolean", ["get", "omtrentlig"], false];
const erRing: ExpressionSpecification = ["boolean", ["get", "ring"], false];
const erPunkt: ExpressionSpecification = ["all", ["==", ["geometry-type"], "Point"], ["!", erRing]];

export const exploreLayer: MapLayer<readonly ExploreFeature[]> = {
  id: "explore",
  interactiveLayerIds: [POINT, RING, WIRE_HIT, FILL],
  markerLayerIds: [POINT, RING],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data), promoteId: "featureId" });
    map.addLayer({
      id: FILL,
      type: "fill",
      source: SOURCE,
      filter: erFlate,
      // Lavt fyll og tydelig kant: to flatelag oppå hverandre skal begge kunne ses. Omtrentlige
      // områder er enda lysere, også når de er valgt: myrene og funnene under skal synes.
      paint: { "fill-color": ["get", "farge"], "fill-opacity": ["case", ["all", selected, omtrentlig], 0.2, selected, 0.45, dempet, 0.07, omtrentlig, 0.08, 0.16] },
    });
    map.addLayer({
      id: LINE,
      type: "line",
      source: SOURCE,
      filter: ["all", erFlate, ["!", omtrentlig]],
      paint: { "line-color": ["get", "farge"], "line-width": ["case", selected, 3, 1.4], "line-opacity": ["case", selected, 0.95, dempet, 0.5, 0.95] },
    });
    map.addLayer({
      id: DASH,
      type: "line",
      source: SOURCE,
      filter: ["all", erFlate, omtrentlig],
      paint: { "line-color": ["get", "farge"], "line-width": ["case", selected, 3.5, 2], "line-dasharray": [2, 2], "line-opacity": ["case", selected, 1, dempet, 0.5, 0.95] },
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
    // Åpen ring, ikke fylt prikk: et omtrentlig område skal ikke kunne forveksles med et funn.
    map.addLayer({
      id: RING,
      type: "circle",
      source: SOURCE,
      filter: erRing,
      maxzoom: RING_MAXZOOM,
      paint: {
        "circle-radius": ["case", selected, 13, 10],
        "circle-color": ["get", "farge"],
        "circle-opacity": 0.12,
        "circle-stroke-color": ["get", "farge"],
        "circle-stroke-width": ["case", selected, 3.5, 2.5],
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
    // Omtrentlige områder nederst: en myr eller et funn inni sirkelen skal kunne treffes.
    features: [
      ...[...features.filter((f) => f.style === "multe_webspor"), ...features.filter((f) => f.style !== "multe_webspor")].map((feature) => ({
        type: "Feature" as const,
        properties: { featureId: feature.id, farge: EXPLORE_COLOR[feature.style], dempet: feature.muted === true, omtrentlig: feature.style === "multe_webspor" },
        geometry: feature.geometry,
      })),
      ...ringer(features),
    ],
  };
}

/** Senterpunktet for hvert omtrentlige område, til ringen som vises når kartet er zoomet ut. */
function ringer(features: readonly ExploreFeature[]) {
  return features
    .filter((f) => f.style === "multe_webspor")
    .map((feature) => ({
      type: "Feature" as const,
      properties: { featureId: feature.id, farge: EXPLORE_COLOR[feature.style], dempet: feature.muted === true, ring: true },
      geometry: { type: "Point" as const, coordinates: feature.center },
    }));
}

function setState(map: MapLibreMap, id: string, selected: boolean) {
  if (map.getSource(SOURCE)) map.setFeatureState({ source: SOURCE, id }, { selected });
}
