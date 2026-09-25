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
});

export type AreaParams = z.infer<typeof areaParamsSchema>;

interface AreaContext {
  lat: number;
  lng: number;
  radius: number;
  label?: string | null;
  sort?: AreaSort;
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

export function buildAreaHref(params: AreaContext, basePath = "/omrade"): string {
  return `${basePath}?${contextSearch(params).toString()}`;
}

/** Detaljside med søkekonteksten, slik at avstand og «tilbake» kan vises. */
export function buildEventHref(id: string, context?: AreaContext): string {
  return context ? `/sak/${id}?${contextSearch(context).toString()}` : `/sak/${id}`;
}
