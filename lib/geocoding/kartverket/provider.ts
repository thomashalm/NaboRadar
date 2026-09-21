import { TtlCache } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import { mergeGeocodingResults, normalizeForMatch } from "../merge";
import {
  GeocodingUnavailableError,
  type GeocodingProvider,
  type GeocodingSearchOptions,
  type ScoredLocation,
  type SearchLocation,
} from "../types";
import { normalizeAddressResponse, normalizePlaceResponse } from "./normalize";

export const KARTVERKET_ADDRESS_URL = "https://ws.geonorge.no/adresser/v1/sok";
export const KARTVERKET_PLACE_URL = "https://ws.geonorge.no/stedsnavn/v1/navn";

/** Kort timeout: autocomplete er verdiløs hvis den er treg. Ett nytt forsøk ved 5xx/nettverksfeil. */
const REQUEST_TIMEOUT_MS = 3_500;
const RETRIES = 1;
const PER_SOURCE_LIMIT = 10;
const DEFAULT_LIMIT = 8;

/** Kun vellykkede, komplette svar caches — aldri feil eller delvise svar. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

export type SourceStatus = "ok" | "error";

export interface DetailedSearchResult {
  results: SearchLocation[];
  sources: { address: SourceStatus; place: SourceStatus };
  cached: boolean;
}

/**
 * Bygger søkestreng. Slutter søket med et husnummer («Karl Johans gate 1») søkes eksakt,
 * ellers som prefiks («sognsv*»). Verifisert: prefiks på «Karl Johans gate 1*» gir ikke Oslo blant de 10 første.
 */
export function buildSearchTerm(query: string): string {
  const cleaned = query.replace(/[*?]/g, " ").replace(/\s+/g, " ").trim();
  const lastToken = cleaned.split(" ").at(-1) ?? "";
  return /\d/.test(lastToken) ? cleaned : `${cleaned}*`;
}

export class KartverketGeocodingProvider implements GeocodingProvider {
  readonly id = "kartverket";
  private readonly cache = new TtlCache<SearchLocation[]>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async search(query: string, options?: GeocodingSearchOptions): Promise<SearchLocation[]> {
    return (await this.searchDetailed(query, options)).results;
  }

  /**
   * Søker i Adresse- og Stedsnavn-API parallelt.
   * Feiler én kilde returneres treffene fra den andre. Feiler begge kastes GeocodingUnavailableError.
   */
  async searchDetailed(query: string, options: GeocodingSearchOptions = {}): Promise<DetailedSearchResult> {
    const limit = options.limit ?? DEFAULT_LIMIT;
    const cacheKey = `${normalizeForMatch(query)}|${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return { results: cached, sources: { address: "ok", place: "ok" }, cached: true };

    const term = encodeURIComponent(buildSearchTerm(query));
    const common = `treffPerSide=${PER_SOURCE_LIMIT}&utkoordsys=4258`;
    const request = { timeoutMs: REQUEST_TIMEOUT_MS, retries: RETRIES, signal: options.signal, fetchImpl: this.fetchImpl };

    const [addressResult, placeResult] = await Promise.allSettled([
      fetchJson(`${KARTVERKET_ADDRESS_URL}?sok=${term}&${common}`, request).then(normalizeAddressResponse),
      fetchJson(`${KARTVERKET_PLACE_URL}?sok=${term}&${common}`, request).then(normalizePlaceResponse),
    ]);

    if (options.signal?.aborted) throw options.signal.reason;

    const sources = {
      address: addressResult.status === "fulfilled" ? "ok" : "error",
      place: placeResult.status === "fulfilled" ? "ok" : "error",
    } as const;

    for (const [name, result] of [["adresse", addressResult], ["stedsnavn", placeResult]] as const) {
      // Logger feiltype, aldri søketeksten (personvern).
      if (result.status === "rejected") {
        console.warn(`[geocoding] Kartverket ${name} feilet: ${describeError(result.reason)}`);
      }
    }

    if (addressResult.status === "rejected" && placeResult.status === "rejected") {
      throw new GeocodingUnavailableError();
    }

    const addresses: ScoredLocation[] = addressResult.status === "fulfilled" ? addressResult.value : [];
    const places: ScoredLocation[] = placeResult.status === "fulfilled" ? placeResult.value : [];
    const results = mergeGeocodingResults(addresses, places, query, limit);

    if (sources.address === "ok" && sources.place === "ok") this.cache.set(cacheKey, results);
    return { results, sources, cached: false };
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 200);
  return "ukjent feil";
}
