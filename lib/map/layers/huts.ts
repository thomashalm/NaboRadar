import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
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
      // Fra zoom 9 vises hver hytte for seg: da er avstanden mellom dem større enn markøren.
      clusterMaxZoom: 8,
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
    const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
    map.addLayer({
      id: "huts-dot",
      type: "circle",
      source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": ["case", selected, 10, 7],
        "circle-color": ["match", ["get", "hutType"], "rest_cabin", HUT_REST_COLOR, HUT_COLOR],
        "circle-opacity": 0.95,
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

function setState(map: MapLibreMap, id: string, selected: boolean) {
  if (map.getSource(SOURCE)) map.setFeatureState({ source: SOURCE, id }, { selected });
}
