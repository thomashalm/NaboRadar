"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";

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

const lenker = z.object({
  hutId: z.uuid(),
  // Tomt felt fjerner lenken. Bare https: det er eneste databasen godtar.
  bookingUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
  infoUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
});

/** Lagrer de offisielle lenkene på en hytte. Den som lagrer, går god for at de peker riktig. */
export async function setHutLinksAction(_prev: HutActionState, formData: FormData): Promise<HutActionState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const parsed = lenker.safeParse({
    hutId: formData.get("hutId"),
    bookingUrl: String(formData.get("bookingUrl") ?? "").trim(),
    infoUrl: String(formData.get("infoUrl") ?? "").trim(),
  });
  if (!parsed.success) return { status: "error", message: "Lenkene må være fullstendige https-adresser." };

  const { error } = await session.client.rpc("set_hut_links", {
    p_hut_id: parsed.data.hutId,
    p_booking_url: parsed.data.bookingUrl,
    p_info_url: parsed.data.infoUrl,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/hytter");
  return { status: "ok", message: "Lenkene er lagret." };
}
