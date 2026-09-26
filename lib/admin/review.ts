import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { LEVELS, OPERATIONAL_STATUSES } from "./research-types";
import {
  REVIEW_MODES,
  REVIEW_OUTCOMES,
  type ReviewHistorikk,
  type ReviewKøElement,
  type ReviewMetrics,
  type ReviewStatus,
} from "./review-types";
import { SIDESTØRRELSE, type Køfilter } from "./review-queue-filters";

export * from "./review-types";

/**
 * Databasetilgangen for review-laget.
 *
 * Alt beregnet — tilstand, grunner, prioritet — kommer fra basen. Dette laget sender filtrene
 * dit og typer svaret; det gjentar ikke policyen. Filtrering, sortering og paginering skjer
 * serverside, fordi køen skal tåle å vokse uten at admin laster hele basen.
 *
 * Funksjonene i databasen håndhever `is_admin()` selv, så dette er bekvemmelighet — ikke
 * sikkerhetsgrensen.
 */

/** Tom liste betyr «ingen begrensning»: null til basen, som tolker det som alle. */
function eller<T>(liste: T[]): T[] | null {
  return liste.length ? liste : null;
}

export async function hentReviewKø(
  client: SupabaseClient,
  filter: Køfilter,
): Promise<{ elementer: ReviewKøElement[]; totalt: number }> {
  const { data, error } = await client.rpc("research_review_queue", {
    p_states: eller(filter.states),
    p_categories: filter.kategori ? [filter.kategori] : null,
    p_operational: eller(filter.drift),
    p_confidence: eller(filter.confidence),
    p_interest: eller(filter.interesse),
    p_reasons: eller(filter.reasons),
    p_municipality: filter.kommune ?? null,
    p_search: filter.sok ?? null,
    p_limit: SIDESTØRRELSE,
    p_offset: (filter.side - 1) * SIDESTØRRELSE,
  });
  if (error) throw new Error(`research_review_queue: ${error.message}`);

  const rader = (data ?? []) as (ReviewKøElement & { total_count: number | string })[];
  return {
    elementer: rader.map(({ total_count: _total, ...rad }) => rad),
    totalt: rader.length ? Number(rader[0]!.total_count) : 0,
  };
}

export async function hentReviewMetrics(client: SupabaseClient): Promise<ReviewMetrics | null> {
  const { data, error } = await client.rpc("research_review_metrics");
  if (error) throw new Error(`research_review_metrics: ${error.message}`);
  const rad = ((data ?? []) as ReviewMetrics[])[0];
  return rad ? { ...rad, avg_days_since_review: rad.avg_days_since_review == null ? null : Number(rad.avg_days_since_review) } : null;
}

export async function hentReviewStatus(client: SupabaseClient, itemId: string): Promise<ReviewStatus | null> {
  const { data, error } = await client.rpc("research_review_status", { p_item_id: itemId });
  if (error) throw new Error(`research_review_status: ${error.message}`);
  return ((data ?? []) as ReviewStatus[])[0] ?? null;
}

export async function hentReviewHistorikk(client: SupabaseClient, itemId: string): Promise<ReviewHistorikk[]> {
  const { data, error } = await client.rpc("research_reviews", { p_item_id: itemId });
  if (error) throw new Error(`research_reviews: ${error.message}`);
  return (data ?? []) as ReviewHistorikk[];
}

/**
 * Skjema for å registrere en review.
 *
 * `review_mode_note` er påkrevd når reviewen overstyrer planen. Databasen krever det også — en
 * overstyring uten begrunnelse er ikke etterprøvbar — men feilmeldingen er bedre her.
 */
const tom = z.literal("").transform(() => null);
const tekst = z.union([tom, z.string().trim().min(1)]).nullable().optional();

export const reviewSchema = z
  .object({
    outcome: z.enum(REVIEW_OUTCOMES),
    summary: tekst,
    new_status: z.union([tom, z.enum(OPERATIONAL_STATUSES)]).nullable().optional(),
    new_confidence: z.union([tom, z.enum(LEVELS)]).nullable().optional(),
    notes: tekst,
    sources_checked: z.union([tom, z.coerce.number().int().min(0).max(999)]).nullable().optional(),
    next_review_at: z
      .union([tom, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dato må være ÅÅÅÅ-MM-DD")])
      .nullable()
      .optional(),
    review_mode: z.union([tom, z.enum(REVIEW_MODES)]).nullable().optional(),
    review_mode_note: tekst,
    research_run_id: tekst,
  })
  .refine((v) => !(v.outcome === "snoozed" && !v.next_review_at), {
    message: "En utsettelse må ha en dato",
    path: ["next_review_at"],
  })
  .refine((v) => !(v.outcome === "snoozed" && !v.review_mode_note), {
    message: "En utsettelse må ha en begrunnelse",
    path: ["review_mode_note"],
  })
  .refine((v) => !(v.review_mode && v.review_mode !== "policy" && !v.review_mode_note), {
    message: "Overstyring krever en begrunnelse",
    path: ["review_mode_note"],
  });

export type ReviewInput = z.infer<typeof reviewSchema>;

export async function registrerReview(client: SupabaseClient, itemId: string, felt: ReviewInput): Promise<string> {
  const { data, error } = await client.rpc("record_research_review", {
    p_item_id: itemId,
    p_fields: felt,
  });
  if (error) throw new Error(`record_research_review: ${error.message}`);
  return data as string;
}

/** Manuell overstyring av planen, uten å hevde at noe er kontrollert. */
export const reviewPlanSchema = z
  .object({
    review_mode: z.enum(REVIEW_MODES),
    next_review_at: z
      .union([tom, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dato må være ÅÅÅÅ-MM-DD")])
      .nullable()
      .optional(),
    review_mode_note: tekst,
  })
  .refine((v) => !(v.review_mode !== "policy" && !v.review_mode_note), {
    message: "Overstyring krever en begrunnelse",
    path: ["review_mode_note"],
  })
  .refine((v) => !(["manual", "blocked"].includes(v.review_mode) && !v.next_review_at), {
    message: "Manuell eller blokkert review må ha en dato",
    path: ["next_review_at"],
  });

export type ReviewPlanInput = z.infer<typeof reviewPlanSchema>;

export async function settReviewPlan(client: SupabaseClient, itemId: string, felt: ReviewPlanInput): Promise<void> {
  const { error } = await client.rpc("set_research_review_plan", { p_item_id: itemId, p_fields: felt });
  if (error) throw new Error(`set_research_review_plan: ${error.message}`);
}
