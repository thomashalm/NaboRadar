import type { AreaGeometry } from "@/types/area-feature";

/**
 * Eiendomsdata fra åpne kilder.
 *
 * Hvert datapunkt bærer sin egen kilde. Det er med vilje: kortet skal senere kunne utvides med
 * byggeår, bruksareal, siste salg eller hjemmelshaver fra andre kilder med andre vilkår, og da
 * må vi vite hvor hvert felt kommer fra — og kunne vise det.
 */
export type PropertySourceId = "matrikkel-teig" | "matrikkel-bygningspunkt" | "kartverket-adresse";

export const PROPERTY_SOURCES: Record<PropertySourceId, { name: string; owner: string; licenseName: string }> = {
  "matrikkel-teig": { name: "Matrikkelen – Eiendomskart Teig", owner: "Kartverket", licenseName: "CC BY 4.0" },
  "matrikkel-bygningspunkt": { name: "Matrikkelen – Bygningspunkt", owner: "Kartverket", licenseName: "CC BY 4.0" },
  "kartverket-adresse": { name: "Matrikkelen – Adresse", owner: "Kartverket", licenseName: "CC BY 4.0" },
};

/** En verdi vi vet opphavet til. */
export interface Sourced<T> {
  value: T;
  source: PropertySourceId;
}

export interface PropertyBuilding {
  bygningsnummer: string | null;
  /** Kildens kode (NS 3457), f.eks. «143». */
  typeCode: string | null;
  /** Kodet type oversatt til tekst. null når vi ikke kjenner koden. */
  typeLabel: string | null;
}

export interface PropertyDetails {
  /** Kildens id for teigen. Brukes som valgt-nøkkel i kartet. */
  id: string;
  matrikkelnummer: Sourced<string>;
  kommune: Sourced<string> | null;
  /** Tomteareal i m², slik kilden har beregnet det. */
  tomteareal: Sourced<number> | null;
  matrikkelenhetstype: Sourced<string> | null;
  adresse: Sourced<string> | null;
  bygg: Sourced<PropertyBuilding[]>;
  /** Matrikkelflagg vi kan forklare korrekt, f.eks. registrert forurensning i grunnen. */
  flagg: Sourced<string>[];
  geometry: AreaGeometry;
  /** Punkt til å plassere kortet/popup. */
  center: [number, number];
}

export type PropertyLookupResult =
  | { status: "ok"; property: PropertyDetails }
  | { status: "not-found" }
  | { status: "error"; message: string };
