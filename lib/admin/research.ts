import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  ITEM_TYPES,
  LEVELS,
  OPERATIONAL_STATUSES,
  RESEARCH_CATEGORIES,
  SENSITIVITIES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  type ResearchItem,
  type ResearchSource,
  type NearbyResearch,
} from "./research-types";

export * from "./research-types";

/**
 * Privat research-lag.
 *
 * Dette er interne arbeidsdata: leads, undersøkelser og funn som drift jobber med, med
 * provenance nok til at noen andre kan etterprøve dem senere. Ingenting her publiseres
 * automatisk. Skal et funn ut til brukerne, må det gå den vanlige veien — en provider med
 * lisens, en normalisering og en visningsregel i `area_features`.
 *
 * Alle kall bruker admins egen sesjon. Funksjonene i databasen håndhever `is_admin()` selv,
 * så dette laget er bekvemmelighet og typer — ikke sikkerhetsgrensen.
 */

/**
 * Skjema for skriving. Tomme strenger fra et HTML-skjema betyr «ingen verdi», ikke "".
 * `latitude`/`longitude` må settes eller droppes sammen — databasen krever det samme.
 */
const tom = z.literal("").transform(() => null);
const tekst = z.union([tom, z.string().trim().min(1)]).nullable().optional();

export const researchItemSchema = z
  .object({
    item_type: z.enum(ITEM_TYPES).optional(),
    category: z.enum(RESEARCH_CATEGORIES),
    subcategory: tekst,
    title: z.string().trim().min(1, "Tittel må fylles ut"),
    description: tekst,
    municipality: tekst,
    address: tekst,
    postal_code: z.union([tom, z.string().regex(/^\d{4}$/, "Postnummer må være fire siffer")]).nullable().optional(),
    city: tekst,
    latitude: z.union([tom, z.coerce.number().min(57).max(72)]).nullable().optional(),
    longitude: z.union([tom, z.coerce.number().min(4).max(32)]).nullable().optional(),
    verification_status: z.enum(VERIFICATION_STATUSES).optional(),
    operational_status: z.enum(OPERATIONAL_STATUSES).optional(),
    sensitivity: z.enum(SENSITIVITIES).optional(),
    reason_not_public: tekst,
    confidence: z.enum(LEVELS).optional(),
    interest_level: z.enum(LEVELS).optional(),
    why_interesting: tekst,
    notes: tekst,
  })
  .refine((v) => (v.latitude == null) === (v.longitude == null), {
    message: "Sett både breddegrad og lengdegrad, eller ingen av dem",
    path: ["latitude"],
  });

export const researchSourceSchema = z.object({
  source_name: z.string().trim().min(1, "Kilden må ha et navn"),
  source_url: z.union([tom, z.string().url().startsWith("http", "URL må starte med http")]).nullable().optional(),
  publisher: tekst,
  source_type: z.enum(SOURCE_TYPES).optional(),
  source_date: z.union([tom, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dato må være ÅÅÅÅ-MM-DD")]).nullable().optional(),
  primary_source: z.coerce.boolean().optional(),
  supports_claim: z.coerce.boolean().optional(),
  excerpt_or_summary: tekst,
  notes: tekst,
});

export type ResearchItemInput = z.infer<typeof researchItemSchema>;
export type ResearchSourceInput = z.infer<typeof researchSourceSchema>;

export async function listResearchItems(client: SupabaseClient, search?: string | null): Promise<ResearchItem[]> {
  const { data, error } = await client.rpc("research_items", { p_search: search?.trim() || null });
  if (error) throw new Error(`research_items: ${error.message}`);
  return ((data ?? []) as ResearchItem[]).map(medTall);
}

export async function getResearchItem(client: SupabaseClient, id: string): Promise<{ item: ResearchItem; sources: ResearchSource[] } | null> {
  const [items, sources] = await Promise.all([listResearchItems(client), listResearchSources(client, id)]);
  const item = items.find((i) => i.id === id);
  return item ? { item, sources } : null;
}

export async function listResearchSources(client: SupabaseClient, itemId: string): Promise<ResearchSource[]> {
  const { data, error } = await client.rpc("research_sources", { p_item_id: itemId });
  if (error) throw new Error(`research_sources: ${error.message}`);
  return (data ?? []) as ResearchSource[];
}

export async function researchNear(
  client: SupabaseClient,
  input: { lat: number; lng: number; radiusM: number },
): Promise<NearbyResearch[]> {
  const { data, error } = await client.rpc("research_near", {
    lat: input.lat,
    lng: input.lng,
    radius_m: input.radiusM,
  });
  if (error) throw new Error(`research_near: ${error.message}`);
  return ((data ?? []) as NearbyResearch[]).map((r) => ({ ...r, source_count: Number(r.source_count) }));
}

export async function saveResearchItem(client: SupabaseClient, id: string | null, fields: ResearchItemInput): Promise<string> {
  const { data, error } = await client.rpc("save_research_item", { p_id: id, p_fields: fields });
  if (error) throw new Error(`save_research_item: ${error.message}`);
  return data as string;
}

export async function addResearchSource(client: SupabaseClient, itemId: string, fields: ResearchSourceInput): Promise<string> {
  const { data, error } = await client.rpc("add_research_source", { p_item_id: itemId, p_fields: fields });
  if (error) throw new Error(`add_research_source: ${error.message}`);
  return data as string;
}

export async function deleteResearchSource(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.rpc("delete_research_source", { p_id: id });
  if (error) throw new Error(`delete_research_source: ${error.message}`);
}

/** bigint kommer som streng over PostgREST. */
function medTall(item: ResearchItem): ResearchItem {
  return { ...item, source_count: Number(item.source_count) };
}
