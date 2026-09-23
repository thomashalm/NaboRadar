import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assessAll, type ProviderHealth, type ProviderHealthRow, type SyncRunSummary } from "@/lib/sync/health";

/** Kjøringer på tvers av providere, til historikktabellen. */
export interface SyncRunRow extends SyncRunSummary {
  provider_id: string;
}

export interface AdminOverview {
  health: ProviderHealth[];
  runs: SyncRunRow[];
  errors: string[];
}

/**
 * Henter alt admin-siden viser, med brukerens egen sesjon.
 * Feiler én spørring, vises resten — admin skal ikke stå uten oversikt fordi én del er nede.
 */
export async function loadAdminOverview(client: SupabaseClient, now = new Date()): Promise<AdminOverview> {
  const [healthResult, runsResult] = await Promise.all([
    client.rpc("provider_health"),
    client.rpc("recent_sync_runs", { p_limit: 40 }),
  ]);

  const errors: string[] = [];
  if (healthResult.error) errors.push(`provider_health: ${healthResult.error.message}`);
  if (runsResult.error) errors.push(`recent_sync_runs: ${runsResult.error.message}`);

  return {
    health: assessAll((healthResult.data ?? []) as ProviderHealthRow[], now),
    runs: (runsResult.data ?? []) as SyncRunRow[],
    errors,
  };
}
