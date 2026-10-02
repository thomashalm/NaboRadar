import type { ExpressionSpecification, GeoJSONSource } from "maplibre-gl";
import type { MapLayer } from "./types";

/** Det kartlaget trenger om en hytte. Resten hentes fra listen når hytta velges. */
export interface HutMapFeature {
  id: string;
  type: string;
  lng: number;
  lat: number;
}

/** Dempet skoggrønn: dette er steder å dra til, ikke varsler. */
export const HUT_COLOR = "#2f6b4f";
/** Rastebuer er noe annet enn overnattingshytter, og skal kunne skilles på avstand. */
export const HUT_REST_COLOR = "#8a6d3b";

const SOURCE = "huts";
const FOCUS_SOURCE = "hut-focus";

const TYPE_COLOR: ExpressionSpecification = ["match", ["get", "hutType"], "rest_cabin", HUT_REST_COLOR, HUT_COLOR];

/**
 * Hytter og koier som selvstendig kartlag.
 *
 * Laget klynger punktene selv (MapLibre), slik at det samme laget fungerer fra ett kartutsnitt
 * i marka til hele landet. Klyngene har ingen tallmerkelapp: bakgrunnskartet er rasterfliser
 * uten skrifttyper, så størrelsen på sirkelen er det som sier hvor mange det er.
 */
export const hutsLayer: MapLayer<HutMapFeature[]> = {
  id: "huts",
  interactiveLayerIds: ["huts-dot"],
  markerLayerIds: ["huts-dot"],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, {
      type: "geojson",
      data: collection(data),
      promoteId: "featureId",
      cluster: true,
      clusterRadius: 36,
      // Fra zoom 8 vises hver hytte for seg. Det er nivået et utsnitt på 10–20 km får på en
      // telefon, og der skal en valgt hytte kunne ses som et eget punkt.
      clusterMaxZoom: 7,
    });
    map.addLayer({
      id: "huts-cluster",
      type: "circle",
      source: SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": HUT_COLOR,
        "circle-opacity": 0.75,
        "circle-radius": ["step", ["get", "point_count"], 10, 10, 14, 50, 19, 200, 25],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "huts-dot",
      type: "circle",
      source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 7,
        "circle-color": TYPE_COLOR,
        "circle-opacity": 0.95,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  },

  update(map, data) {
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(collection(data));
  },
};

/**
 * Den ene hytta kartet handler om: den valgte i hyttekartet, eller hytta på en hytteside.
 *
 * Egen kilde uten klynging, tegnet over alt annet. Slik er den alltid synlig som et eget punkt —
 * også på zoomnivåer der naboene ligger i klynger — og den skiller seg fra dem med størrelse
 * og mørk ring, ikke bare farge.
 */
export const hutFocusLayer: MapLayer<HutMapFeature | null> = {
  id: "hut-focus",
  interactiveLayerIds: ["hut-focus-dot"],
  markerLayerIds: ["hut-focus-dot"],
  idFromFeature: (properties) => (typeof properties.featureId === "string" ? properties.featureId : null),

  mount(map, data) {
    map.addSource(FOCUS_SOURCE, { type: "geojson", data: collection(data ? [data] : []) });
    map.addLayer({
      id: "hut-focus-halo",
      type: "circle",
      source: FOCUS_SOURCE,
      paint: { "circle-radius": 17, "circle-color": "#ffffff", "circle-opacity": 0.85 },
    });
    map.addLayer({
      id: "hut-focus-dot",
      type: "circle",
      source: FOCUS_SOURCE,
      paint: {
        "circle-radius": 10,
        "circle-color": TYPE_COLOR,
        "circle-stroke-color": "#15171b",
        "circle-stroke-width": 3,
      },
    });
  },

  update(map, data) {
    (map.getSource(FOCUS_SOURCE) as GeoJSONSource | undefined)?.setData(collection(data ? [data] : []));
  },
};

function collection(huts: HutMapFeature[]) {
  return {
    type: "FeatureCollection" as const,
    features: huts.map((hut) => ({
      type: "Feature" as const,
      properties: { featureId: hut.id, hutType: hut.type },
      geometry: { type: "Point" as const, coordinates: [hut.lng, hut.lat] },
    })),
  };
}
