import { z } from "zod";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M, type RadiusOptionM } from "@/lib/geo/constants";
import type { AreaSort } from "@/types/event";

/** Fastlands-Norge (samme grenser som watched_areas-constraint i databasen). */
export const NORWAY_BOUNDS = { minLat: 57, maxLat: 72, minLng: 4, maxLng: 32 } as const;

export function isWithinNorway(lat: number, lng: number): boolean {
  return (
    lat >= NORWAY_BOUNDS.minLat &&
    lat <= NORWAY_BOUNDS.maxLat &&
    lng >= NORWAY_BOUNDS.minLng &&
    lng <= NORWAY_BOUNDS.maxLng
  );
}

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

/**
 * Sidene som kan vise en søkekontekst. Resultatvisningen finnes på to steder — den offentlige
 * `/omrade` og driftens `/admin/adresse` — og all navigasjon inne i den (radius, sortering, endre
 * sted, tilbake fra en sak) må bli liggende der brukeren er. Uten dette blir en admin sendt ut på
 * den offentlige siden ved første klikk, og mister den interne delen av resultatet.
 *
 * Listen er en allowlist, ikke en gjetning: basestien kommer fra en URL-parameter, og en åpen
 * sti derfra ville vært en lenke vi ikke kontrollerer.
 */
export const AREA_BASE_PATHS = ["/omrade", "/admin/adresse"] as const;
export type AreaBasePath = (typeof AREA_BASE_PATHS)[number];
export const DEFAULT_BASE_PATH: AreaBasePath = "/omrade";

export function resolveBasePath(value: unknown): AreaBasePath {
  const first = firstValue(value);
  return (AREA_BASE_PATHS as readonly string[]).includes(String(first))
    ? (first as AreaBasePath)
    : DEFAULT_BASE_PATH;
}

const coordinate = (min: number, max: number) =>
  z.preprocess(
    firstValue,
    z
      .string()
      .trim()
      .regex(/^-?\d{1,3}(\.\d+)?$/)
      .transform(Number)
      .pipe(z.number().min(min).max(max))
      .transform((n) => Math.round(n * 1e5) / 1e5),
  );

export function isRadiusOption(value: number): value is RadiusOptionM {
  return (RADIUS_OPTIONS_M as readonly number[]).includes(value);
}

/**
 * Validerer query-parametre for /omrade.
 * - lat/lng er påkrevd og må ligge i Norge → ellers feilside
 * - ugyldig/manglende radius faller tilbake til standard (trygg tilstand)
 * - label er valgfri visningstekst; kontrolltegn fjernes, maks 120 tegn
 */
export const areaParamsSchema = z.object({
  lat: coordinate(NORWAY_BOUNDS.minLat, NORWAY_BOUNDS.maxLat),
  lng: coordinate(NORWAY_BOUNDS.minLng, NORWAY_BOUNDS.maxLng),
  radius: z
    .preprocess(
      firstValue,
      z.coerce.number().refine(isRadiusOption).transform((n) => n as RadiusOptionM),
    )
    .catch(DEFAULT_RADIUS_M),
  label: z
    .preprocess(
      firstValue,
      z
        .string()
        .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").trim())
        .pipe(z.string().min(1).max(120))
        .optional(),
    )
    .catch(undefined),
  /** URL: sortering=nyeste. Alt annet → nærmest først. */
  sortering: z
    .preprocess(firstValue, z.string().optional())
    .transform((v): AreaSort => (v === "nyeste" ? "newest" : "distance"))
    .catch("distance" as const),
  /** URL: fra=/admin/adresse. Hvilken resultatvisning konteksten hører til. */
  fra: z.preprocess(firstValue, z.unknown()).transform(resolveBasePath).catch(DEFAULT_BASE_PATH),
});

export type AreaParams = z.infer<typeof areaParamsSchema>;

export interface AreaContext {
  lat: number;
  lng: number;
  radius: number;
  label?: string | null;
  sort?: AreaSort;
  /**
   * Hvilken resultatvisning konteksten hører til. Standard er den offentlige siden, så
   * offentlige URL-er ser uendret ut — parameteren dukker bare opp der den faktisk trengs.
   */
  basePath?: AreaBasePath;
}

function contextSearch(params: AreaContext): URLSearchParams {
  const search = new URLSearchParams({
    lat: params.lat.toFixed(5),
    lng: params.lng.toFixed(5),
    radius: String(params.radius),
  });
  if (params.label) search.set("label", params.label);
  if (params.sort === "newest") search.set("sortering", "nyeste");
  return search;
}

export function buildAreaHref(params: AreaContext): string {
  return `${params.basePath ?? DEFAULT_BASE_PATH}?${contextSearch(params).toString()}`;
}

/**
 * Detaljside med søkekonteksten, slik at avstand og «tilbake» kan vises.
 *
 * `fra` følger med når konteksten ikke kommer fra den offentlige siden, slik at «tilbake» går
 * dit brukeren faktisk var. Den utelates for /omrade, så offentlige lenker er uendret.
 */
export function buildEventHref(id: string, context?: AreaContext): string {
  if (!context) return `/sak/${id}`;
  const search = contextSearch(context);
  if (context.basePath && context.basePath !== DEFAULT_BASE_PATH) search.set("fra", context.basePath);
  return `/sak/${id}?${search.toString()}`;
}
