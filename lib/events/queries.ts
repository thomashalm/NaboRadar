import { z } from "zod";
import { getDbMode, getReadDb } from "@/lib/db";
import { DEFAULT_ANNOUNCED_WITHIN_MONTHS } from "@/lib/geo/constants";
import type { EventDocumentView } from "@/types/document";
import type { AreaEvent, AreaSort } from "@/types/event";
import { EVENT_TYPES } from "@/types/event";

/**
 * Lesespørringer for sidene. Validerer radene fra databasen med Zod (defensivt — schemaet
 * kan være migrert i utakt med koden) og mapper til camelCase-visningstyper.
 */

const geoJsonGeometry = z
  .object({ type: z.enum(["Polygon", "MultiPolygon", "Point"]), coordinates: z.array(z.unknown()) })
  .transform((g) => g as unknown as AreaEvent["geometry"]);
const pointGeometry = z
  .object({ type: z.literal("Point"), coordinates: z.tuple([z.number(), z.number()]) })
  .transform((g) => g as AreaEvent["centroid"]);

const areaRowSchema = z.object({
  id: z.string(),
  type: z.enum(EVENT_TYPES),
  title: z.string(),
  announced_at: z.string().nullable(),
  source_updated_at: z.string().nullable(),
  distance_m: z.number(),
  computed_area_m2: z.number().nullable(),
  centroid: pointGeometry,
  geometry: geoJsonGeometry,
  municipality_number: z.string().nullable(),
  source_url: z.string().nullable(),
  source_url_type: z.enum(["municipal", "provider_page", "document"]).nullable(),
  attributes: z.record(z.string(), z.string().nullable()),
});

function toAreaEvent(row: z.infer<typeof areaRowSchema>): AreaEvent {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    announcedAt: row.announced_at,
    sourceUpdatedAt: row.source_updated_at,
    distanceM: row.distance_m,
    computedAreaM2: row.computed_area_m2,
    centroid: row.centroid,
    geometry: row.geometry,
    municipalityNumber: row.municipality_number,
    sourceUrl: row.source_url,
    sourceUrlType: row.source_url_type,
    attributes: row.attributes,
  };
}

export type QueryFailure = {
  status: "unavailable";
  /** Kun for utviklere (vises bare i development). */
  devReason: string;
};

export type AreaEventsResult =
  | {
      status: "ok";
      events: AreaEvent[];
      announcedSince: string;
      /** Når aktiv kilde sist ble hentet. null = aldri synkronisert. */
      dataUpdatedAt: string | null;
    }
  | QueryFailure;

/** Dato N måneder tilbake (YYYY-MM-DD, UTC). */
export function monthsAgo(months: number, now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

function unavailable(error: unknown): QueryFailure {
  const devReason =
    getDbMode() === "none"
      ? "Ingen database konfigurert (sett Supabase-variabler eller LOCAL_DATABASE=pglite i .env.local)."
      : error instanceof Error
        ? `${error.name}: ${error.message}`.slice(0, 300)
        : "Ukjent feil";
  console.error("[events] databasefeil:", devReason);
  return { status: "unavailable", devReason };
}

export async function getAreaEvents(params: {
  lat: number;
  lng: number;
  radius: number;
  sort: AreaSort;
  withinMonths?: number;
}): Promise<AreaEventsResult> {
  const announcedSince = monthsAgo(params.withinMonths ?? DEFAULT_ANNOUNCED_WITHIN_MONTHS);
  try {
    const db = await getReadDb();
    if (!db) return unavailable(null);
    const [rows, status] = await Promise.all([
      db.rpc<unknown>("events_within", {
        lat: params.lat,
        lng: params.lng,
        radius_m: params.radius,
        announced_since: announcedSince,
        sort: params.sort,
      }),
      db.rpc<{ provider_id: string; last_success_at: string | null }>("data_status"),
    ]);
    const events = z.array(areaRowSchema).parse(rows).map(toAreaEvent);
    const dataUpdatedAt =
      status.map((s) => s.last_success_at).filter((d): d is string => d !== null).sort().at(-1) ?? null;
    return { status: "ok", events, announcedSince, dataUpdatedAt };
  } catch (error) {
    return unavailable(error);
  }
}

const documentSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  url: z.string(),
  mime_type: z.string().nullable(),
  document_date: z.string().nullable(),
});

const detailRowSchema = areaRowSchema.omit({ distance_m: true }).extend({
  provider_id: z.string(),
  synced_at: z.string(),
  removed_from_source_at: z.string().nullable(),
  distance_m: z.number().nullable(),
  municipality_name: z.string().nullable(),
  documents: z.array(documentSchema),
});

export interface EventDetail extends Omit<AreaEvent, "distanceM"> {
  providerId: string;
  syncedAt: string;
  removedFromSourceAt: string | null;
  /** Avstand fra søkepunktet i konteksten — null når siden åpnes uten kontekst. */
  distanceM: number | null;
  municipalityName: string | null;
  documents: EventDocumentView[];
}

export type EventDetailResult = { status: "ok"; event: EventDetail } | { status: "not_found" } | QueryFailure;

const uuidSchema = z.uuid();

export async function getEventDetail(
  id: string,
  origin?: { lat: number; lng: number },
): Promise<EventDetailResult> {
  if (!uuidSchema.safeParse(id).success) return { status: "not_found" };
  try {
    const db = await getReadDb();
    if (!db) return unavailable(null);
    const rows = await db.rpc<unknown>("get_event", {
      event_id: id,
      lat: origin?.lat ?? null,
      lng: origin?.lng ?? null,
    });
    if (rows.length === 0) return { status: "not_found" };
    const row = detailRowSchema.parse(rows[0]);
    const { distance_m, ...rest } = row;
    const base = toAreaEvent({ ...rest, distance_m: 0 });
    return {
      status: "ok",
      event: {
        ...base,
        distanceM: distance_m,
        providerId: row.provider_id,
        syncedAt: row.synced_at,
        removedFromSourceAt: row.removed_from_source_at,
        municipalityName: row.municipality_name,
        documents: row.documents.map((d) => ({
          id: d.id,
          type: d.type,
          title: d.title,
          url: d.url,
          mimeType: d.mime_type,
          documentDate: d.document_date,
        })),
      },
    };
  } catch (error) {
    return unavailable(error);
  }
}

