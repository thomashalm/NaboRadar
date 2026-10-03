import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assessAll,
  type ProviderHealth,
  type ProviderHealthRow,
  type SyncRequestRow,
  type SyncRunSummary,
} from "@/lib/sync/health";

/** Kjøringer på tvers av providere, til historikktabellen. */
export interface SyncRunRow extends SyncRunSummary {
  provider_id: string;
}

/** Manuelle forespørsler per provider, til feilsøking i detaljene på kortet. */
export interface SyncRequestHistoryRow extends SyncRequestRow {
  provider_id: string;
  /** Utfallet av kjøringen forespørselen ble, når den rakk å bli en. */
  run_status: string | null;
}

/**
 * Klokka som utløser sync-workflowen.
 *
 * pg_cron er den eneste primære triggeren: den er synlig her og i /admin, og sender
 * workflow_dispatch hvert 15. minutt. GitHubs egen schedule i sync.yml står igjen som en
 * dokumentert daglig reserve, ikke som en parallell kadens — se docs/naboradar-handbook.md.
 */
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

/** Én rad fra lookup_source_status(): de direkte oppslagene på /omrade, sjekket av sync-jobben. */
export interface LookupSourceStatus {
  lookup_id: string;
  name: string;
  last_checked_at: string;
  last_ok_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  failing_since: string | null;
  consecutive_failures: number;
}

export interface AdminOverview {
  health: ProviderHealth[];
  lookups: LookupSourceStatus[];
  runs: SyncRunRow[];
  /** Siste manuelle forespørsler, gruppert per provider-id. */
  requests: Map<string, SyncRequestHistoryRow[]>;
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
  const [healthResult, runsResult, schedulerResult, requestsResult, lookupsResult] = await Promise.all([
    client.rpc("provider_health"),
    client.rpc("recent_sync_runs", { p_limit: 40 }),
    client.rpc("scheduler_status"),
    client.rpc("recent_sync_requests", { p_limit: 5 }),
    client.rpc("lookup_source_status"),
  ]);

  const errors: string[] = [];
  if (healthResult.error) errors.push(`provider_health: ${healthResult.error.message}`);
  if (runsResult.error) errors.push(`recent_sync_runs: ${runsResult.error.message}`);
  if (schedulerResult.error) errors.push(`scheduler_status: ${schedulerResult.error.message}`);
  if (requestsResult.error) errors.push(`recent_sync_requests: ${requestsResult.error.message}`);
  if (lookupsResult.error) errors.push(`lookup_source_status: ${lookupsResult.error.message}`);

  const requests = new Map<string, SyncRequestHistoryRow[]>();
  for (const rad of (requestsResult.data ?? []) as SyncRequestHistoryRow[]) {
    const liste = requests.get(rad.provider_id) ?? [];
    liste.push(rad);
    requests.set(rad.provider_id, liste);
  }

  return {
    health: assessAll((healthResult.data ?? []) as ProviderHealthRow[], now),
    lookups: (lookupsResult.data ?? []) as LookupSourceStatus[],
    runs: (runsResult.data ?? []) as SyncRunRow[],
    requests,
    scheduler: withMinutes(((schedulerResult.data ?? []) as SchedulerStatus[])[0] ?? null, now),
    errors,
  };
}
