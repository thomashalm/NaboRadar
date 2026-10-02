"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { HUT_ACCESS_OVERRIDES, HUT_TYPE_OVERRIDES } from "@/lib/huts/types";

export type HutActionState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

const avgjørelse = z.object({
  hutId: z.uuid(),
  action: z.enum(["approve", "reject", "merge"]),
  target: z.uuid().optional(),
  note: z.string().trim().max(500).optional(),
});

/**
 * Avgjør en kontrollsak: godkjenn, avvis eller slå sammen.
 *
 * Tilgangen sjekkes både her og i databasefunksjonen. En server action kan kalles direkte med
 * POST, så det holder ikke at knappen bare vises for admin.
 */
export async function reviewHutAction(_prev: HutActionState, formData: FormData): Promise<HutActionState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const parsed = avgjørelse.safeParse({
    hutId: formData.get("hutId"),
    action: formData.get("action"),
    target: formData.get("target") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Ugyldig valg." };
  const { hutId, action, target, note } = parsed.data;
  if (action === "merge" && !target) return { status: "error", message: "Velg hytta den skal slås sammen med." };

  const { error } = await session.client.rpc("review_hut", {
    p_hut_id: hutId,
    p_action: action,
    p_target: action === "merge" ? target : null,
    p_note: note ?? null,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/hytter");
  return { status: "ok", message: action === "approve" ? "Godkjent." : action === "reject" ? "Avvist." : "Slått sammen." };
}

const kontakt = z.object({
  hutId: z.uuid(),
  // Tomt felt fjerner opplysningen. Bare https: det er eneste databasen godtar.
  bookingUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
  infoUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
  manager: z.union([z.literal(""), z.string().min(2).max(120)]),
  note: z.string().max(500),
  // Kommaskilt i skjemaet. Navn forvalteren bruker når det ikke er Kartverkets.
  aliases: z.array(z.string().min(2).max(80)).max(10),
});

/**
 * Lagrer lenkene og forvalteren på en hytte. Den som lagrer, går god for at lenkene gjelder
 * hytta og at forvalteren er den den offisielle siden oppgir.
 */
export async function setHutContactAction(_prev: HutActionState, formData: FormData): Promise<HutActionState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const tekst = (navn: string) => String(formData.get(navn) ?? "").trim();
  const parsed = kontakt.safeParse({
    hutId: formData.get("hutId"),
    bookingUrl: tekst("bookingUrl"),
    infoUrl: tekst("infoUrl"),
    manager: tekst("manager"),
    note: tekst("note"),
    aliases: tekst("aliases").split(",").map((navn) => navn.trim()).filter(Boolean),
  });
  if (!parsed.success) return { status: "error", message: "Lenkene må være fullstendige https-adresser, og forvalter og andre navn minst to tegn." };

  const { error } = await session.client.rpc("set_hut_contact", {
    p_hut_id: parsed.data.hutId,
    p_booking_url: parsed.data.bookingUrl,
    p_info_url: parsed.data.infoUrl,
    p_manager: parsed.data.manager,
    p_note: parsed.data.note,
    p_aliases: parsed.data.aliases,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/hytter");
  return { status: "ok", message: "Lagret." };
}

const overstyring = z.object({
  hutId: z.uuid(),
  type: z.union([z.literal(""), z.enum(HUT_TYPE_OVERRIDES)]),
  access: z.union([z.literal(""), z.enum(HUT_ACCESS_OVERRIDES)]),
  status: z.enum(["unknown", "closed", "seasonal", "open"]),
  publicNote: z.string().max(160),
  sourceUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
});

/**
 * Lagrer overstyringer av type og tilgang, status og den offentlige merknaden.
 *
 * Kildens verdier røres ikke; dette ligger oppå. En overstyring sier at Kartverket tar feil
 * på akkurat dette feltet, og krever derfor den offisielle siden som sier det.
 */
export async function setHutOverridesAction(_prev: HutActionState, formData: FormData): Promise<HutActionState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const tekst = (navn: string) => String(formData.get(navn) ?? "").trim();
  const parsed = overstyring.safeParse({
    hutId: formData.get("hutId"),
    type: tekst("type"),
    access: tekst("access"),
    status: tekst("status") || "unknown",
    publicNote: tekst("publicNote"),
    sourceUrl: tekst("sourceUrl"),
  });
  if (!parsed.success) return { status: "error", message: "Ugyldig verdi. Merknaden kan være høyst 160 tegn, og kilden må være en https-adresse." };
  const { hutId, type, access, status, publicNote, sourceUrl } = parsed.data;
  const noeSatt = type !== "" || access !== "" || status !== "unknown" || publicNote !== "";
  if (noeSatt && sourceUrl === "") return { status: "error", message: "En overstyring eller merknad krever en kilde: den offisielle siden som sier det." };

  const { error } = await session.client.rpc("set_hut_overrides", {
    p_hut_id: hutId,
    p_type: type,
    p_access: access,
    p_status: status,
    p_public_note: publicNote,
    p_source_url: sourceUrl,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/hytter");
  return { status: "ok", message: noeSatt ? "Lagret." : "Overstyringene er fjernet." };
}
