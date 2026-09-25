"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import {
  addResearchSource,
  deleteResearchSource,
  researchItemSchema,
  researchSourceSchema,
  saveResearchItem,
} from "@/lib/admin/research";

/**
 * Skriving til research-laget.
 *
 * Server actions kan kalles direkte med POST, så tilgangen sjekkes her i tillegg til i
 * databasefunksjonen — samme mønster som resten av admin. Databasen er grensen som gjelder;
 * dette er bare det første nei-et.
 */

export type FormState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string; felt?: Record<string, string> };

export const initialFormState: FormState = { status: "idle" };

/** Tomme felt skal bli null, ikke "". Checkboxer kommer bare med når de er avkrysset. */
function felterFra(formData: FormData, nøkler: readonly string[]): Record<string, unknown> {
  const ut: Record<string, unknown> = {};
  for (const nøkkel of nøkler) {
    if (!formData.has(nøkkel)) continue;
    ut[nøkkel] = String(formData.get(nøkkel) ?? "");
  }
  return ut;
}

const ITEM_FELT = [
  "item_type",
  "category",
  "subcategory",
  "title",
  "description",
  "municipality",
  "address",
  "postal_code",
  "city",
  "latitude",
  "longitude",
  "verification_status",
  "operational_status",
  "sensitivity",
  "reason_not_public",
  "confidence",
  "interest_level",
  "why_interesting",
  "notes",
] as const;

export async function saveResearchItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const id = String(formData.get("id") ?? "") || null;
  const parsed = researchItemSchema.safeParse(felterFra(formData, ITEM_FELT));
  if (!parsed.success) {
    const felt: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const nøkkel = String(issue.path[0] ?? "");
      if (nøkkel && !felt[nøkkel]) felt[nøkkel] = issue.message;
    }
    return { status: "error", message: "Sjekk feltene under.", felt };
  }

  let nyId: string;
  try {
    nyId = await saveResearchItem(session.client, id, parsed.data);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Kunne ikke lagre." };
  }

  revalidatePath("/admin/research");
  revalidatePath(`/admin/research/${nyId}`);
  if (!id) redirect(`/admin/research/${nyId}`);
  return { status: "ok", message: "Lagret." };
}

const KILDE_FELT = [
  "source_name",
  "source_url",
  "publisher",
  "source_type",
  "source_date",
  "excerpt_or_summary",
  "notes",
] as const;

export async function addResearchSourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { status: "error", message: "Mangler funn." };

  const parsed = researchSourceSchema.safeParse({
    ...felterFra(formData, KILDE_FELT),
    primary_source: formData.get("primary_source") === "on",
    // «Støtter påstanden» er avkrysset som standard i skjemaet, så fraværet betyr nei.
    supports_claim: formData.get("supports_claim") === "on",
  });
  if (!parsed.success) {
    const felt: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const nøkkel = String(issue.path[0] ?? "");
      if (nøkkel && !felt[nøkkel]) felt[nøkkel] = issue.message;
    }
    return { status: "error", message: "Sjekk feltene under.", felt };
  }

  try {
    await addResearchSource(session.client, itemId, parsed.data);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Kunne ikke legge til kilden." };
  }

  revalidatePath(`/admin/research/${itemId}`);
  return { status: "ok", message: "Kilden er lagt til." };
}

export async function deleteResearchSourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const id = String(formData.get("sourceId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!id) return { status: "error", message: "Mangler kilde." };

  try {
    await deleteResearchSource(session.client, id);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Kunne ikke slette kilden." };
  }

  revalidatePath(`/admin/research/${itemId}`);
  return { status: "ok", message: "Kilden er slettet." };
}
