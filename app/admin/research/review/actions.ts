"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { registrerReview, reviewPlanSchema, reviewSchema, settReviewPlan } from "@/lib/admin/review";

/**
 * Skriving til review-laget.
 *
 * Som resten av admin: tilgangen sjekkes her i tillegg til i databasefunksjonen, fordi server
 * actions kan kalles direkte med POST. Databasen er grensen som gjelder.
 */

export type ReviewFormState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string; felt?: Record<string, string> };

export const initialReviewState: ReviewFormState = { status: "idle" };

function felterFra(formData: FormData, nøkler: readonly string[]): Record<string, unknown> {
  const ut: Record<string, unknown> = {};
  for (const nøkkel of nøkler) {
    if (!formData.has(nøkkel)) continue;
    ut[nøkkel] = String(formData.get(nøkkel) ?? "");
  }
  return ut;
}

function feltfeil(issues: { path: (string | number | symbol)[]; message: string }[]): Record<string, string> {
  const felt: Record<string, string> = {};
  for (const issue of issues) {
    const nøkkel = String(issue.path[0] ?? "");
    if (nøkkel && !felt[nøkkel]) felt[nøkkel] = issue.message;
  }
  return felt;
}

const REVIEW_FELT = [
  "outcome",
  "summary",
  "new_status",
  "new_confidence",
  "notes",
  "sources_checked",
  "next_review_at",
  "review_mode",
  "review_mode_note",
] as const;

export async function registrerReviewAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { status: "error", message: "Mangler funn." };

  const parsed = reviewSchema.safeParse(felterFra(formData, REVIEW_FELT));
  if (!parsed.success) {
    return { status: "error", message: "Sjekk feltene under.", felt: feltfeil(parsed.error.issues) };
  }

  try {
    await registrerReview(session.client, itemId, parsed.data);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Kunne ikke lagre reviewen." };
  }

  revalidatePath("/admin/research");
  revalidatePath("/admin/research/review");
  revalidatePath(`/admin/research/review/${itemId}`);
  revalidatePath(`/admin/research/${itemId}`);
  // Etter en fullført review hører man hjemme i køen igjen, ikke på samme skjema.
  redirect("/admin/research/review");
}

const PLAN_FELT = ["review_mode", "next_review_at", "review_mode_note"] as const;

export async function settReviewPlanAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { status: "error", message: "Mangler funn." };

  const parsed = reviewPlanSchema.safeParse(felterFra(formData, PLAN_FELT));
  if (!parsed.success) {
    return { status: "error", message: "Sjekk feltene under.", felt: feltfeil(parsed.error.issues) };
  }

  try {
    await settReviewPlan(session.client, itemId, parsed.data);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Kunne ikke endre planen." };
  }

  revalidatePath("/admin/research/review");
  revalidatePath(`/admin/research/review/${itemId}`);
  revalidatePath(`/admin/research/${itemId}`);
  return { status: "ok", message: "Planen er endret." };
}
