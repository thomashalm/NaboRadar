import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { MapLayer } from "./types";

/**
 * Research-funn på det nasjonale admin-kartet, med klynging.
 *
 * Klynging er nødvendig: på Norge-nivå ligger anleggene tett i Oslo og Rogaland og ville blitt
 * én grøt av overlappende markører. Klyngene viser antall og zoomer inn ved klikk — de åpner
 * aldri et tilfeldig funn, for da ville et klikk gitt et vilkårlig av femten treff.
 *
 * Enkeltpunktene bruker samme rolige uttrykk som de interne markørene i adressevisningen: hul
 * ring med kjerne, i grått. Interessenivået styrer størrelsen, ikke fargen — et regnbuekart
 * gjør det vanskeligere å se hva som er valgt.
 */

export interface Researchpunkt {
  id: string;
  lng: number;
  lat: number;
  /** Styrer markørstørrelsen: høy interesse er større, ikke en annen farge. */
  interest: "low" | "medium" | "high";
}

export const PUNKT_FARGE = "#334155";
export const VALGT_FARGE = "#0f172a";

const SOURCE = "research-punkter";
const KLYNGE = "research-klynge";
const KLYNGETALL = "research-klyngetall";
const RING = "research-ring";
const KJERNE = "research-kjerne";

export const researchPointsLayer: MapLayer<readonly Researchpunkt[]> = {
  id: "research-points",
  // Bare enkeltpunkter er valgbare. Klyngene håndteres av sitt eget klikk, under.
  interactiveLayerIds: [RING],
  markerLayerIds: [RING],
  idFromFeature: (p) => (typeof p.featureId === "string" ? p.featureId : null),

  mount(map, data) {
    map.addSource(SOURCE, {
      type: "geojson",
      data: collection(data),
      promoteId: "featureId",
      cluster: true,
      clusterRadius: 48,
      // Over dette nivået er punktene langt nok fra hverandre til å stå for seg.
      clusterMaxZoom: 11,
    });

    map.addLayer({
      id: KLYNGE,
      type: "circle",
      source: SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 50, 24],
        "circle-color": PUNKT_FARGE,
        "circle-opacity": 0.85,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: KLYNGETALL,
      type: "symbol",
      source: SOURCE,
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
      paint: { "text-color": "#ffffff" },
    });

    const valgt: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
    const stor: ExpressionSpecification = ["==", ["get", "interest"], "high"];
    map.addLayer({
      id: RING,
      type: "circle",
      source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": ["case", valgt, 13, stor, 9, 7],
        "circle-color": "#ffffff",
        "circle-opacity": 0.65,
        "circle-stroke-color": ["case", valgt, VALGT_FARGE, PUNKT_FARGE],
        "circle-stroke-width": ["case", valgt, 4, 2.5],
      },
    });
    map.addLayer({
      id: KJERNE,
      type: "circle",
      source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": ["case", valgt, 4, 2.5],
        "circle-color": ["case", valgt, VALGT_FARGE, PUNKT_FARGE],
      },
    });

    // Klikk på en klynge zoomer inn til den sprer seg, i stedet for å velge et vilkårlig funn.
    map.on("click", KLYNGE, (event) => {
      const treff = map.queryRenderedFeatures(event.point, { layers: [KLYNGE] });
      const id = treff[0]?.properties?.cluster_id;
      if (id === undefined) return;
      const kilde = map.getSource(SOURCE) as GeoJSONSource | undefined;
      const geometri = treff[0]!.geometry;
      if (geometri.type !== "Point") return;
      const senter = geometri.coordinates as [number, number];
      void kilde?.getClusterExpansionZoom(Number(id)).then((zoom) => map.easeTo({ center: senter, zoom }));
    });
    map.on("mouseenter", KLYNGE, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", KLYNGE, () => (map.getCanvas().style.cursor = ""));
  },

  update(map, data) {
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(collection(data));
  },

  setSelected(map, id, previousId) {
    if (previousId && previousId !== id) tilstand(map, previousId, false);
    if (id) tilstand(map, id, true);
  },
};

function collection(punkter: readonly Researchpunkt[]) {
  return {
    type: "FeatureCollection" as const,
    features: punkter.map((p) => ({
      type: "Feature" as const,
      properties: { featureId: p.id, interest: p.interest },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

function tilstand(map: MapLibreMap, id: string, selected: boolean) {
  // Klyngede kilder tåler setFeatureState på id-en, men bare når punktet er utenfor en klynge.
  if (map.getSource(SOURCE)) {
    try {
      map.setFeatureState({ source: SOURCE, id }, { selected });
    } catch {
      // Punktet ligger i en klynge akkurat nå; markeringen settes når klyngen sprer seg.
    }
  }
}
