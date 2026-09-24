/**
 * Hvem vinner et klikk i kartet.
 *
 * Problemet: et planområde er en stor flate som dekker alle eiendommene inni seg. Uten en
 * prioritering fanget flaten klikket, og et hus inne i et planområde ble umulig å trykke på.
 *
 * Regelen når eiendomsoppslag er aktivt (zoomet inn nok):
 *   1. punktmarkører — brukeren har truffet et lite, tydelig objekt og mente det
 *   2. eiendom/teig — klikk i kartflaten slår opp eiendommen under punktet
 *   3. store flater (planområder, forurenset grunn) blokkerer ikke lenger
 *
 * Zoomet ut, der eiendomsoppslag ikke er aktivt, er flatene fortsatt primær klikkflate.
 */

export interface MapClickHit {
  layerId: string;
  /** Punktmarkør (liten, presis treffflate) eller stor bakgrunnsflate. */
  kind: "marker" | "area";
  /** Objektets id i laget. Null når laget ikke kjenner igjen objektet. */
  id: string | null;
}

export type MapClickAction =
  /** Velg objektet og vis popup. */
  | { type: "select"; id: string }
  /** Slå opp eiendommen under punktet. `covering` er flatene som lå over samme punkt. */
  | { type: "property"; covering: string[] }
  /** Tomt klikk: fjern valget. */
  | { type: "clear" };

/** Hits kommer i tegnerekkefølge fra MapLibre, øverste objekt først. */
export function resolveMapClick(input: {
  hits: readonly MapClickHit[];
  /** Om zoomnivået er høyt nok til at eiendomsoppslag er aktivt. */
  propertyLookupActive: boolean;
}): MapClickAction {
  const marker = input.hits.find((hit) => hit.kind === "marker" && hit.id !== null);
  if (marker?.id) return { type: "select", id: marker.id };

  if (input.propertyLookupActive) {
    return { type: "property", covering: input.hits.flatMap((hit) => (hit.id === null ? [] : [hit.id])) };
  }

  const area = input.hits.find((hit) => hit.id !== null);
  return area?.id ? { type: "select", id: area.id } : { type: "clear" };
}
