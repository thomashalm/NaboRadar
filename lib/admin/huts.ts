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

const lenkeSchema = z.object({
  id: z.string(),
  name: z.string(),
  hut_type: z.string(),
  owner_kind: z.string(),
  municipality_number: z.string().nullable(),
  booking_url: z.string().nullable(),
  info_url: z.string().nullable(),
});

export type HutLinkRow = z.infer<typeof lenkeSchema>;

/** Hytter som passer et navnesøk, med lenkene de har i dag. */
export async function søkHytter(client: SupabaseClient, q: string): Promise<HutLinkRow[]> {
  const { data, error } = await client.rpc("huts_search", { q, max_results: 20 });
  if (error) return [];
  const parsed = z.array(lenkeSchema).safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
}

export const KILDENAVN: Record<string, string> = {
  "kartverket-n50-hytter": "N50",
  "kartverket-turrutebasen-hytter": "Turrutebasen",
};
