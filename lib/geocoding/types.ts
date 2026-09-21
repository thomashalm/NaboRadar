/**
 * Normalisert søketreff fra geokoding. Implementasjon (fase 3): Kartverket Adresse-API + Stedsnavn-API.
 *
 * Personvern: søk logges ikke og lagres ikke. Et valgt treff blir kun til lat/lng i URL-en.
 */
export type SearchLocationType = "address" | "place";

export interface SearchLocation {
  /** Stabil innenfor kilden, f.eks. "address:0301-13729-60" / "place:308554". */
  id: string;
  /** Primærtekst, f.eks. «Kirkeveien 60» eller «Sognsvann». */
  label: string;
  /** Sekundærtekst, f.eks. «0368 Oslo» eller «Vann · Oslo». */
  subtitle: string;
  type: SearchLocationType;
  latitude: number;
  longitude: number;
  municipalityName: string | null;
  municipalityNumber: string | null;
}

export interface GeocodingSearchOptions {
  limit?: number;
  signal?: AbortSignal;
}

export interface GeocodingProvider {
  readonly id: string;
  search(query: string, options?: GeocodingSearchOptions): Promise<SearchLocation[]>;
}

/**
 * Regel for sammenslåing av flere kilder:
 * 1. adresser før stedsnavn ved tilsvarende relevans
 * 2. eksakt navnetreff på stedsnavn (f.eks. «Sognsvann») løftes over svake adressetreff
 * 3. dedupe på label + koordinat avrundet til ~10 m
 * Implementeres i lib/geocoding/merge.ts i fase 3.
 */
export type MergeGeocodingResults = (
  addresses: SearchLocation[],
  places: SearchLocation[],
  query: string,
  limit: number,
) => SearchLocation[];
