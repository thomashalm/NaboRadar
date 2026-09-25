import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assessAll, type ProviderHealth, type ProviderHealthRow, type SyncRunSummary } from "@/lib/sync/health";

/** Kjøringer på tvers av providere, til historikktabellen. */
export interface SyncRunRow extends SyncRunSummary {
  provider_id: string;
}

/** Klokka som utløser sync-workflowen. pg_cron primært, GitHubs egen schedule som reserve. */
export interface SchedulerStatus {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
  last_message: string | null;
  last_http_status: number | null;
  last_http_at: string | null;
  /** Regnet ut her, ikke i komponenten: klokkeslett hører ikke hjemme i en render. */
  minutesSinceLastRun: number | null;
}

export interface AdminOverview {
  health: ProviderHealth[];
  runs: SyncRunRow[];
  scheduler: SchedulerStatus | null;
  errors: string[];
}

function withMinutes(status: SchedulerStatus | null, now: Date): SchedulerStatus | null {
  if (!status) return null;
  const sist = status.last_run ? new Date(status.last_run) : null;
  return {
    ...status,
    minutesSinceLastRun: sist ? Math.round((now.getTime() - sist.getTime()) / 60_000) : null,
  };
}

/**
 * Henter alt admin-siden viser, med brukerens egen sesjon.
 * Feiler én spørring, vises resten — admin skal ikke stå uten oversikt fordi én del er nede.
 */
export async function loadAdminOverview(client: SupabaseClient, now = new Date()): Promise<AdminOverview> {
  const [healthResult, runsResult, schedulerResult] = await Promise.all([
    client.rpc("provider_health"),
    client.rpc("recent_sync_runs", { p_limit: 40 }),
    client.rpc("scheduler_status"),
  ]);

  const errors: string[] = [];
  if (healthResult.error) errors.push(`provider_health: ${healthResult.error.message}`);
  if (runsResult.error) errors.push(`recent_sync_runs: ${runsResult.error.message}`);
  if (schedulerResult.error) errors.push(`scheduler_status: ${schedulerResult.error.message}`);

  return {
    health: assessAll((healthResult.data ?? []) as ProviderHealthRow[], now),
    runs: (runsResult.data ?? []) as SyncRunRow[],
    scheduler: withMinutes(((schedulerResult.data ?? []) as SchedulerStatus[])[0] ?? null, now),
    errors,
  };
}
