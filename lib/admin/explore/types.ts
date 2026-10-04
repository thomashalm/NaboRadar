import type { SupabaseClient } from "@supabase/supabase-js";
import type { MultiPolygon, Point, Polygon } from "geojson";

/**
 * Utforsk data: typene datasettene og siden deler.
 *
 * Et datasett er en adapter (se registry.ts): den vet hvordan den henter sine objekter innenfor
 * et område, og hvordan ett objekt beskrives i listen og i detaljpanelet. Siden og kartet kjenner
 * bare `ExploreFeature` — ikke hvor dataene kommer fra.
 */

/** Hvordan objektet tegnes. Fargene bor i kartlaget (lib/map/layers/explore.ts). */
export type ExploreStyle = "kvikkleire_sone" | "kvikkleire_uten_fare" | "datasenter";

export interface ExploreFeature {
  id: string;
  title: string;
  /** «Kartlagt kvikkleiresone», «Datasenter». Aldri en type kilden ikke oppgir. */
  kind: string;
  style: ExploreStyle;
  geometry: Polygon | MultiPolygon | Point;
  /** Punkt å fokusere på. */
  center: [number, number];
  /** Kommune eller sted, når vi har det. */
  place: string | null;
  /** Én kort linje til listen: det viktigste ved objektet. */
  summary: string | null;
  /** Rader i detaljpanelet, i visningsrekkefølge. */
  details: { label: string; value: string }[];
  /** Kort forklaring av hva typen betyr. */
  explanation: string | null;
  /** Merknad som skal stå tydelig i panelet, f.eks. at dette er et internt research-funn. */
  notice: string | null;
  sourceName: string;
  sourceUrl: string | null;
  /** Intern lenke for mer, f.eks. research-funnet. */
  href: string | null;
  hrefLabel: string | null;
}

export interface LngLatBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Området søket gjelder: en kommune eller et fylke med flate, eller bare et kartutsnitt. */
export interface ExploreArea {
  kind: "kommune" | "fylke" | "utsnitt";
  /** Kommune- eller fylkesnavn. Null for et rent utsnitt. */
  name: string | null;
  /** Fylket kommunen ligger i. */
  county: string | null;
  box: LngLatBox;
  /** Grenseflaten fra Kartverket. Null for utsnitt. */
  polygon: Polygon | MultiPolygon | null;
}

export interface ExploreResult {
  features: ExploreFeature[];
  /** Hvor mange som finnes i området. Større enn `features.length` når svaret er kuttet. */
  total: number;
  /** Satt når noe gikk galt. Da er `features` tom, og dette er ikke «ingen treff». */
  error: string | null;
}

export interface ExploreDataset {
  id: string;
  /** Navnet i overskrifter og forslag. */
  label: string;
  /** «områder», «datasentre» — til tellingen. */
  unit: { one: string; many: string };
  /** Ord som velger datasettet, i små bokstaver. Eksplisitt liste, ingen tolkning. */
  aliases: readonly string[];
  /**
   * Om datasettet er for stort til å vises for hele landet. Da må søket ha et sted, eller
   * brukeren må zoome inn og søke i kartutsnittet.
   */
  needsArea: boolean;
  /** Én linje om hva datasettet er og ikke er. */
  description: string;
  load(client: SupabaseClient, area: ExploreArea | null): Promise<ExploreResult>;
}
