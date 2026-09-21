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

/** Et normalisert treff med kildespesifikk vekt (f.eks. stedstype), brukt til rangering. */
export interface ScoredLocation {
  location: SearchLocation;
  /** Tillegg fra kilden: stedsnavn av relevante typer (Vann, Stasjon, Bydel …) får positiv vekt. */
  boost: number;
}

/**
 * Regel for sammenslåing av flere kilder (implementert i lib/geocoding/merge.ts):
 * 1. tekstrelevans mot søket: eksakt > starter med > et ord starter med > øvrige
 * 2. adresser får et lite tillegg, så de rangeres foran stedsnavn ved tilsvarende relevans
 * 3. kildens boost (stedstype, språk)
 * 4. dedupe på label + koordinat avrundet til ~10 m
 */
export type MergeGeocodingResults = (
  addresses: ScoredLocation[],
  places: ScoredLocation[],
  query: string,
  limit: number,
) => SearchLocation[];

export class GeocodingUnavailableError extends Error {
  constructor(message = "Ingen geokodingstjenester svarte") {
    super(message);
    this.name = "GeocodingUnavailableError";
  }
}
