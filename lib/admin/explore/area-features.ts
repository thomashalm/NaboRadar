import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LineString, MultiLineString, MultiPolygon, Point, Polygon } from "geojson";
import type { ExploreArea } from "./types";

/**
 * Felles lesing for datasett som ligger i `area_features`: kvikkleire, kraftnett, forurenset
 * grunn. Alle går gjennom `explore_area_features`, som krever admin og alltid er avgrenset.
 */
export interface AreaFeatureRad {
  id: string;
  external_id: string;
  title: string;
  subtype: string;
  attributes: Record<string, string | number | boolean | null>;
  source_url: string | null;
  source_updated_at: string | null;
  geometry: Polygon | MultiPolygon | Point | LineString | MultiLineString;
  center: Point;
  total: number;
}

/** Taket per kall. Nås det, sier siden fra — se `ExploreResult.total`. */
export const AREA_FEATURE_LIMIT = 1500;

export async function hentAreaFeatures(
  client: SupabaseClient,
  providerId: string,
  area: ExploreArea,
): Promise<{ rader: AreaFeatureRad[]; total: number; error: string | null }> {
  const { data, error } = await client.rpc("explore_area_features", {
    p_provider_id: providerId,
    p_min_lng: area.box.minLng,
    p_min_lat: area.box.minLat,
    p_max_lng: area.box.maxLng,
    p_max_lat: area.box.maxLat,
    p_area: area.polygon,
    p_limit: AREA_FEATURE_LIMIT,
  });
  if (error) return { rader: [], total: 0, error: error.message };
  const rader = (data ?? []) as AreaFeatureRad[];
  return { rader, total: Number(rader[0]?.total ?? 0), error: null };
}

export const tekst = (verdi: unknown): string | null => (typeof verdi === "string" && verdi.trim() ? verdi.trim() : null);
export const tall = (verdi: unknown): number | null => (typeof verdi === "number" && Number.isFinite(verdi) ? verdi : null);
export const dato = (verdi: string | null | undefined): string | null =>
  verdi ? new Date(verdi).toLocaleDateString("nb-NO", { dateStyle: "medium" }) : null;

/** Fjerner tomme rader fra et detaljpanel. */
export const rader = (liste: ({ label: string; value: string } | null | false | undefined)[]) =>
  liste.filter((rad): rad is { label: string; value: string } => !!rad);
