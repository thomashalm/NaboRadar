import "server-only";
import { z } from "zod";
import { getDbMode, getReadDb } from "@/lib/db";
import { DatabaseQueryError } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HUT_ACCESS_STATUSES, HUT_OVERNIGHT, HUT_OWNER_KINDS, HUT_TYPES, type HutOwnerKind, type HutType } from "./types";

/**
 * Lesing av hytter og koier. Alt går gjennom huts_*-funksjonene i databasen.
 *
 * Kallet gjøres med brukerens egen sesjon, ikke med den anonyme klienten resten av
 * områdesiden bruker. Grunnen er pilotfasen: funksjonene svarer bare når kategorien er
 * publisert — eller når kalleren er admin. Slik kan en innlogget admin se og kontrollere
 * hyttene på de vanlige sidene før noen andre gjør det, uten en egen admin-visning.
 */

const rowSchema = z.object({
  id: z.string(),
  name: z.string(),
  hut_type: z.enum(HUT_TYPES),
  owner_kind: z.enum(HUT_OWNER_KINDS),
  manager_name: z.string().nullable(),
  access_status: z.enum(HUT_ACCESS_STATUSES),
  locked: z.boolean().nullable(),
  overnight: z.enum(HUT_OVERNIGHT),
  beds: z.number().nullable(),
  booking_url: z.string().nullable(),
  info_url: z.string().nullable(),
  municipality_number: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  source_updated_at: z.string().nullable(),
  last_seen_at: z.string(),
  sources: z.array(z.string()),
  distance_m: z.number().optional(),
  total: z.coerce.number().optional(),
});

export interface Hut {
  id: string;
  name: string;
  type: HutType;
  ownerKind: HutOwnerKind;
  managerName: string | null;
  accessStatus: (typeof HUT_ACCESS_STATUSES)[number];
  locked: boolean | null;
  overnight: (typeof HUT_OVERNIGHT)[number];
  beds: number | null;
  bookingUrl: string | null;
  infoUrl: string | null;
  municipalityNumber: string | null;
  lat: number;
  lng: number;
  sourceUpdatedAt: string | null;
  /** Avstand fra søkepunktet. Bare satt av radiusspørringen. */
  distanceM: number | null;
}

function toHut(row: z.infer<typeof rowSchema>): Hut {
  return {
    id: row.id,
    name: row.name,
    type: row.hut_type,
    ownerKind: row.owner_kind,
    managerName: row.manager_name,
    accessStatus: row.access_status,
    locked: row.locked,
    overnight: row.overnight,
    beds: row.beds,
    bookingUrl: row.booking_url,
    infoUrl: row.info_url,
    municipalityNumber: row.municipality_number,
    lat: row.latitude,
    lng: row.longitude,
    sourceUpdatedAt: row.source_updated_at,
    distanceM: row.distance_m ?? null,
  };
}

async function hutRpc(fn: string, args: Record<string, unknown>): Promise<unknown[] | null> {
  if (getDbMode() === "supabase") {
    const client = await createSupabaseServerClient();
    if (!client) return null;
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new DatabaseQueryError(fn, error.message);
    return (data as unknown[] | null) ?? [];
  }
  const db = await getReadDb();
  return db ? db.rpc<unknown>(fn, args) : null;
}

export interface HutFilters {
  types?: readonly HutType[];
  owners?: readonly HutOwnerKind[];
}

const filterArgs = (filters: HutFilters = {}) => ({
  types: filters.types && filters.types.length > 0 ? [...filters.types] : null,
  owners: filters.owners && filters.owners.length > 0 ? [...filters.owners] : null,
});

/**
 * «I nærheten» for hytter.
 *
 * Hytter er ikke butikker: de nærmeste ligger ofte en mil unna, og det er fortsatt lokalt.
 * Samtidig skal ikke halve fylket telle. Regelen er derfor en trapp: 10 km først, så 20 km,
 * så 30 km — og den stopper på første trinn som gir minst tre treff. Aldri lenger enn 30 km.
 *
 * Trappen er satt etter kontroll mot tolv adresser i og rundt Oslomarka (docs/data-roadmap.md):
 * i Oslo, Bærum, Asker og Nittedal gir 10 km sju til ti hytter; i Lillestrøm, Ski, Hønefoss og
 * Drøbak gir 10 km null til to, og 20 km sju til seksten. Med 15 km som første trinn fikk Oslo
 * sentrum 21 treff, som er marka og ikke nabolaget.
 */
export const HUT_NEARBY = {
  radiusStepsM: [10_000, 20_000, 30_000],
  /** Færre treff enn dette utløser neste trinn. */
  minHits: 3,
  /** Kort som vises på områdesiden. */
  maxCards: 4,
  /** Rader hentet per oppslag. Treffer vi taket, sier teksten «over». */
  fetchLimit: 100,
} as const;

/** Velger radius og kort fra en avstandssortert liste. Ren funksjon, slik at regelen kan testes. */
export function selectNearbyHuts(huts: readonly Hut[], fetchLimit: number = HUT_NEARBY.fetchLimit) {
  const innen = (radiusM: number) => huts.filter((hut) => (hut.distanceM ?? Infinity) <= radiusM);
  const steps = HUT_NEARBY.radiusStepsM;
  const radiusM = steps.find((step) => innen(step).length >= HUT_NEARBY.minHits) ?? steps[steps.length - 1]!;
  const bruk = innen(radiusM);
  return {
    radiusM,
    count: bruk.length,
    /** Sant når oppslaget traff radgrensen, og antallet derfor er et minimum. */
    capped: huts.length >= fetchLimit && bruk.length === huts.length,
    cards: bruk.slice(0, HUT_NEARBY.maxCards),
  };
}

export type NearbyHutsResult =
  | { status: "ok"; radiusM: number; count: number; capped: boolean; cards: Hut[] }
  | { status: "unavailable" };

export async function getHutsNear(params: { lat: number; lng: number }): Promise<NearbyHutsResult> {
  try {
    const rows = await hutRpc("huts_near", {
      lat: params.lat,
      lng: params.lng,
      radius_m: HUT_NEARBY.radiusStepsM[HUT_NEARBY.radiusStepsM.length - 1],
      max_results: HUT_NEARBY.fetchLimit,
    });
    if (rows === null) return { status: "unavailable" };
    return { status: "ok", ...selectNearbyHuts(z.array(rowSchema).parse(rows).map(toHut)) };
  } catch (error) {
    console.error("[hytter] huts_near feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "unavailable" };
  }
}

export interface HutBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type HutListResult =
  | { status: "ok"; huts: Hut[]; total: number; truncated: boolean }
  | { status: "unavailable" };

/** Hytter i et kartutsnitt. `total` er antallet i utsnittet, også når listen er kuttet. */
export async function getHutsInBbox(bbox: HutBbox, filters?: HutFilters, limit = 2000): Promise<HutListResult> {
  try {
    const rows = await hutRpc("huts_in_bbox", {
      min_lng: bbox.minLng,
      min_lat: bbox.minLat,
      max_lng: bbox.maxLng,
      max_lat: bbox.maxLat,
      ...filterArgs(filters),
      max_results: limit,
    });
    if (rows === null) return { status: "unavailable" };
    const parsed = z.array(rowSchema).parse(rows);
    const total = parsed[0]?.total ?? 0;
    return { status: "ok", huts: parsed.map(toHut), total, truncated: total > parsed.length };
  } catch (error) {
    console.error("[hytter] huts_in_bbox feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "unavailable" };
  }
}

export async function getHutsInMunicipality(municipalityNumber: string, filters?: HutFilters): Promise<HutListResult> {
  try {
    const rows = await hutRpc("huts_in_municipality", { p_municipality_number: municipalityNumber, ...filterArgs(filters) });
    if (rows === null) return { status: "unavailable" };
    const huts = z.array(rowSchema).parse(rows).map(toHut);
    return { status: "ok", huts, total: huts.length, truncated: false };
  } catch (error) {
    console.error("[hytter] huts_in_municipality feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "unavailable" };
  }
}

const searchRowSchema = rowSchema.pick({
  id: true,
  name: true,
  hut_type: true,
  owner_kind: true,
  manager_name: true,
  municipality_number: true,
  latitude: true,
  longitude: true,
});

export interface HutSearchHit {
  id: string;
  name: string;
  type: HutType;
  ownerKind: HutOwnerKind;
  municipalityNumber: string | null;
  lat: number;
  lng: number;
}

export async function searchHuts(q: string): Promise<HutSearchHit[] | null> {
  try {
    const rows = await hutRpc("huts_search", { q, max_results: 20 });
    if (rows === null) return null;
    return z.array(searchRowSchema).parse(rows).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.hut_type,
      ownerKind: row.owner_kind,
      municipalityNumber: row.municipality_number,
      lat: row.latitude,
      lng: row.longitude,
    }));
  } catch (error) {
    console.error("[hytter] huts_search feilet:", error instanceof Error ? error.name : "ukjent");
    return null;
  }
}
