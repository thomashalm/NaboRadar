"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin/session";

export type SyncRequestState = { status: "idle" } | { status: "queued"; message: string } | { status: "error"; message: string };

/**
 * «Kjør sync nå» legger en forespørsel i kø — den kjører ikke syncen i webrequesten.
 *
 * To grunner: en full sync tar lengre tid enn en serverless-request får lov til, og
 * webappen skal ikke ha skrivenøkkel til databasen. Sync-worker (service role) plukker
 * forespørselen. Server actions kan kalles direkte med POST, så tilgangen sjekkes her
 * i tillegg til i databasefunksjonen.
 */
export async function requestSyncAction(_prev: SyncRequestState, formData: FormData): Promise<SyncRequestState> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "error", message: "Ikke autorisert." };

  const providerId = String(formData.get("providerId") ?? "");
  // «Godta datafallet» er alltid en full sync — den finnes bare for å kjøre reconciliation.
  const force = formData.get("force") === "1";
  const mode = !force && formData.get("mode") === "incremental" ? "incremental" : "full";
  if (!providerId) return { status: "error", message: "Mangler provider." };

  const { error } = await session.client.rpc("request_sync", {
    p_provider_id: providerId,
    p_mode: mode,
    p_force: force,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin");
  return {
    status: "queued",
    message: `${providerId}: ${mode === "full" ? "full sync" : "inkrementell sync"} er lagt i kø${force ? " (reconciliation tvunget)" : ""}.`,
  };
}
