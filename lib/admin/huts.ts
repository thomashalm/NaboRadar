import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/** Kontrollkøen for hytter. Se migrasjon 20261020000000 og håndboken, «Hytter og koier». */

const kildeSchema = z.object({
  provider_id: z.string(),
  external_id: z.string(),
  title: z.string(),
  hut_type: z.string().nullable(),
  match_basis: z.string(),
  distance_m: z.number().nullable(),
});

const naboSchema = z.object({
  id: z.string(),
  name: z.string(),
  hut_type: z.string(),
  owner_kind: z.string(),
  distance_m: z.number(),
});

const sakSchema = z.object({
  id: z.string(),
  name: z.string(),
  hut_type: z.string(),
  owner_kind: z.string(),
  manager_name: z.string().nullable(),
  municipality_number: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  confidence: z.string(),
  is_visible: z.boolean(),
  review_reason: z.string(),
  sources: z.array(kildeSchema).nullable(),
  nearby: z.array(naboSchema).nullable(),
});

export type HutReviewCase = z.infer<typeof sakSchema>;

export async function hentHytteKø(client: SupabaseClient): Promise<{ saker: HutReviewCase[]; feil: string | null }> {
  const { data, error } = await client.rpc("hut_review_queue");
  if (error) return { saker: [], feil: error.message };
  const parsed = z.array(sakSchema).safeParse(data ?? []);
  return parsed.success ? { saker: parsed.data, feil: null } : { saker: [], feil: "Uventet svar fra hut_review_queue" };
}

const kontaktSchema = z.object({
  id: z.string(),
  name: z.string(),
  hut_type: z.string(),
  owner_kind: z.string(),
  locked: z.boolean().nullable(),
  /** Forvalteren slik den vises: kontrollert, ellers kildens. */
  manager_name: z.string().nullable(),
  manager_verified: z.string().nullable(),
  manager_source: z.string().nullable(),
  booking_url: z.string().nullable(),
  info_url: z.string().nullable(),
  links_verified_at: z.string().nullable(),
  contact_note: z.string().nullable(),
  /** Andre navn lagt inn for hånd, typisk forvalterens. */
  aliases: z.array(z.string()),
  municipality_number: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  is_visible: z.boolean(),
  // `hut_type` og `locked` over er kildens verdier. Disse ligger oppå, og er det siden viser.
  type_override: z.string().nullable(),
  access_override: z.string().nullable(),
  access_status: z.string(),
  public_note: z.string().nullable(),
  override_source_url: z.string().nullable(),
  override_verified_at: z.string().nullable(),
  /** Eierkategori lagt oppå kildens, når forvalterens side viser at kategorien er feil. */
  owner_override: z.string().nullable().optional(),
});

export type HutContactRow = z.infer<typeof kontaktSchema>;
export type HutContactView = "dnt_gap";

/**
 * Kontaktopplysningene for hytter. Uten søk: de låste hyttene som mangler bestillingsside
 * (høyst 100), med
 * de som mangler mest først. Med søk: hyttene som passer navnet. Med `dnt_gap`: DNT-hyttene som
 * mangler kontrollert forening eller lenke, vanlige hytter før rastebuer.
 */
export async function hentHytteKontakt(
  client: SupabaseClient,
  q: string | null,
  view: HutContactView | null = null,
): Promise<{ hytter: HutContactRow[]; feil: string | null }> {
  const { data, error } = await client.rpc("hut_contact_list", { p_q: q, p_view: view });
  if (error) return { hytter: [], feil: error.message };
  const parsed = z.array(kontaktSchema).safeParse(data ?? []);
  return parsed.success ? { hytter: parsed.data, feil: null } : { hytter: [], feil: "Uventet svar fra hut_contact_list" };
}

/** Låste hytter fordelt på hvor langt vi har kommet med neste steg. Nøklene er `HutNextStepKind`. */
export async function hentKontaktstatus(client: SupabaseClient): Promise<Record<string, number>> {
  const { data, error } = await client.rpc("hut_contact_summary");
  if (error) return {};
  const parsed = z.array(z.object({ kind: z.string(), antall: z.coerce.number() })).safeParse(data ?? []);
  return parsed.success ? Object.fromEntries(parsed.data.map((rad) => [rad.kind, rad.antall])) : {};
}

const statusSchema = z.object({
  id: z.string(),
  name: z.string(),
  manager_name: z.string().nullable(),
  municipality_number: z.string().nullable(),
  access_status: z.string(),
  public_note: z.string().nullable(),
  source_url: z.string().nullable(),
  verified_at: z.string().nullable(),
  review_at: z.string(),
  overdue: z.boolean(),
  is_visible: z.boolean(),
});

export type HutStatusRow = z.infer<typeof statusSchema>;

/** Midlertidig stengte hytter, de som skal kontrolleres først. */
export async function hentStatuskø(client: SupabaseClient): Promise<HutStatusRow[]> {
  const { data, error } = await client.rpc("hut_status_queue");
  if (error) return [];
  const parsed = z.array(statusSchema).safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
}

export const KILDENAVN: Record<string, string> = {
  "kartverket-n50-hytter": "N50",
  "kartverket-turrutebasen-hytter": "Turrutebasen",
};
