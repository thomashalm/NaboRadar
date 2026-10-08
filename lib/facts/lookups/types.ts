import type { AreaAttributes, AreaCategory } from "@/types/area-feature";

/**
 * Direkte oppslag mot kilder som ikke synkes (for store, eller kun spørrbare per punkt).
 * De svarer på «ligger punktet innenfor?» eller «hva er nærmeste objekt?».
 */
export interface LookupContext {
  lat: number;
  lng: number;
  radiusM: number;
  signal?: AbortSignal;
  /**
   * Kilden feilet nettopp og har pause. Et oppslag med langlivet cache svarer da fra cachen uten
   * å spørre kilden, eller kaster når det ikke har noe lagret.
   */
  skipSource?: boolean;
}

export interface LookupHit {
  /** Nøkkel i formuleringsregisteret (lib/facts/wording.ts). */
  subtype: string;
  title: string;
  attributes: AreaAttributes;
  /** null når kilden bare svarer innenfor/utenfor. */
  distanceM: number | null;
  contains: boolean;
  sourceUrl?: string | null;
  sourceUpdatedAt?: string | null;
}

/**
 * Et svar med opphav. Bare oppslag med langlivet cache trenger dette (lib/facts/noise-cache.ts).
 *
 * `fetchedAt` er når NaboRadar hentet svaret fra kilden — ikke når kildens data gjelder.
 * `stale-cache` betyr at kilden ikke svarte nå, og at svaret er det sist lagrede.
 */
export interface DetailedLookupOutcome {
  hits: LookupHit[];
  fetchedAt: string;
  origin: "source" | "cache" | "stale-cache";
}

export interface AreaLookup {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly category: AreaCategory;
  run(context: LookupContext): Promise<LookupHit[]>;
  /** Valgfri: som `run`, men sier også hvor svaret kom fra. */
  runDetailed?(context: LookupContext): Promise<DetailedLookupOutcome>;
}
