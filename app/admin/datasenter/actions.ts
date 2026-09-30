"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin/session";

/**
 * Handlingene bak datasenter-refresh.
 *
 * Knappen oppretter bare en kjøring — den gjør ikke selve researchen. Det er hele poenget med
 * modellen: 67 anlegg som skal kontrolleres mot operatørsider, kommunale saker og presse er ikke
 * noe en HTTP-request kan gjøre ferdig, og en request som prøver ville enten timet ut eller
 * levert påstander ingen har verifisert. Kjøringen er en kø med framdrift, og arbeidet gjøres
 * mot den.
 */

export interface Svar {
  ok: boolean;
  melding: string;
  runId?: string;
}

export async function startRefresh(_forrige: Svar | null, formData: FormData): Promise<Svar> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { ok: false, melding: "Ikke tilgang." };

  const mode = formData.get("mode");
  if (mode !== "review_due" && mode !== "full") {
    return { ok: false, melding: "Ukjent modus." };
  }

  const { data, error } = await session.client.rpc("start_datacenter_refresh", { p_mode: mode });
  if (error) {
    // «Kjører allerede» er en forventet tilstand, ikke en feil å vise som en krasj.
    const kjører = error.message.includes("kjører allerede");
    return { ok: false, melding: kjører ? "En datasenter-refresh kjører allerede." : error.message };
  }

  revalidatePath("/admin/datasenter");
  return {
    ok: true,
    runId: data as string,
    melding: mode === "full" ? "Full datasenter-refresh lagt i kø." : "Refresh av det som trenger review lagt i kø.",
  };
}

export async function avbrytRefresh(_forrige: Svar | null, formData: FormData): Promise<Svar> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { ok: false, melding: "Ikke tilgang." };

  const runId = String(formData.get("runId") ?? "");
  if (!runId) return { ok: false, melding: "Mangler kjøring." };

  const { error } = await session.client.rpc("cancel_datacenter_refresh", {
    p_run_id: runId,
    p_reason: "Avbrutt fra admin",
  });
  if (error) return { ok: false, melding: error.message };

  revalidatePath("/admin/datasenter");
  return { ok: true, melding: "Kjøringen er avbrutt." };
}
