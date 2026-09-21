"use server";

import { revalidatePath } from "next/cache";
import { getWriteDb } from "@/lib/db";
import { DibkPlanningStartedProvider } from "@/lib/providers/dibk/planning-started";
import type { SyncResult } from "@/lib/providers/types";
import { runSync } from "@/lib/sync/run";

export type SyncActionState =
  | { status: "idle" }
  | { status: "done"; result: SyncResult }
  | { status: "error"; message: string };

type GlobalWithLock = typeof globalThis & { __naboradarSyncRunning?: boolean };

/**
 * «Sync now» på /dev. Server actions kan kalles direkte med POST, så beskyttelsen må ligge her —
 * ikke bare i at knappen er skjult. I produksjon avvises kallet alltid.
 */
export async function syncNowAction(_prev: SyncActionState, formData: FormData): Promise<SyncActionState> {
  if (process.env.NODE_ENV !== "development") {
    return { status: "error", message: "Ikke tilgjengelig utenfor development." };
  }
  const mode = formData.get("mode") === "incremental" ? "incremental" : "full";
  const g = globalThis as GlobalWithLock;
  if (g.__naboradarSyncRunning) return { status: "error", message: "En sync kjører allerede." };

  g.__naboradarSyncRunning = true;
  try {
    const db = await getWriteDb();
    if (!db) return { status: "error", message: "Ingen database med skrivetilgang er konfigurert." };
    const result = await runSync(new DibkPlanningStartedProvider(), db, { mode });
    revalidatePath("/dev");
    return { status: "done", result };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Ukjent feil" };
  } finally {
    g.__naboradarSyncRunning = false;
  }
}
