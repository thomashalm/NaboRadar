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

export interface AreaLookup {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly category: AreaCategory;
  run(context: LookupContext): Promise<LookupHit[]>;
}
