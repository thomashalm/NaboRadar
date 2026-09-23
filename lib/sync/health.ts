/**
 * Helsevurdering per provider — grunnlaget både for /admin og for varsling.
 *
 * Reglene er bevisst konservative: en kilde er «stale» når den ikke har levert data vi
 * stoler på innen sitt eget vindu, ikke når den tilfeldigvis feilet én gang. En mistenkelig
 * kjøring (se lib/sync/guards.ts) teller aldri som vellykket, så en kilde som stille
 * begynner å levere for lite data blir stale av seg selv.
 */

/** Rad fra provider_health(). */
export interface ProviderHealthRow {
  id: string;
  name: string;
  kind: string;
  status: string;
  status_reason: string | null;
  supports_incremental: boolean;
  sync_interval_minutes: number | null;
  full_sync_interval_hours: number | null;
  stale_after_hours: number | null;
  last_attempt_at: string | null;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_run_status: string | null;
  last_error: string | null;
  consecutive_failures: number;
  baseline_record_count: number | null;
  active_records: number | string;
  removed_records: number | string;
  documents: number | string;
  alert_state: string;
  alert_notified_at: string | null;
  last_run: SyncRunSummary | null;
  open_request: { id: string; mode: string; status: string; requested_at: string; requested_by: string | null } | null;
}

export interface SyncRunSummary {
  id: string;
  mode: string;
  trigger: string;
  status: string;
  suspicious: boolean;
  reconciled: boolean;
  started_at: string;
  completed_at: string | null;
  fetched: number;
  accepted: number;
  rejected: number;
  records: number;
  inserted: number;
  updated: number;
  unchanged: number;
  removed: number;
  failed: number;
  warnings: string[];
  error: string | null;
}

export type HealthState =
  | "ok"
  /** Aktiv kilde som ennå ikke har levert data. */
  | "never_synced"
  /** Data er eldre enn kildens eget vindu. */
  | "stale"
  /** Siste kjøring feilet. */
  | "failing"
  /** Siste kjøring skrev data, men tallene så feil ut. */
  | "suspicious"
  /** Spørres direkte per søk — synkes ikke. */
  | "not_scheduled"
  /** Deaktivert eller utilgjengelig kilde. */
  | "inactive";

export type HealthSeverity = "ok" | "warning" | "critical";

export interface ProviderHealth {
  id: string;
  name: string;
  state: HealthState;
  label: string;
  severity: HealthSeverity;
  /** Timer siden sist vi fikk data vi stolte på. */
  dataAgeHours: number | null;
  /** Timer til dataene regnes som utdaterte. Negativt = allerede utdatert. */
  hoursUntilStale: number | null;
  reasons: string[];
  row: ProviderHealthRow;
}

const HOUR_MS = 3_600_000;
/** Andel av stale-vinduet som må passere før vi advarer om at data nærmer seg grensen. */
const APPROACHING_STALE = 0.75;

const LABELS: Record<HealthState, string> = {
  ok: "OK",
  never_synced: "Aldri synket",
  stale: "Utdaterte data",
  failing: "Feiler",
  suspicious: "Mistenkelig kjøring",
  not_scheduled: "Direkte oppslag",
  inactive: "Ikke i bruk",
};

const hoursSince = (iso: string | null, now: Date): number | null =>
  iso === null ? null : (now.getTime() - Date.parse(iso)) / HOUR_MS;

const formatHours = (hours: number): string =>
  hours < 1 ? `${Math.round(hours * 60)} min` : hours < 48 ? `${Math.round(hours)} t` : `${Math.round(hours / 24)} døgn`;

export function assessProvider(row: ProviderHealthRow, now = new Date()): ProviderHealth {
  const base = { id: row.id, name: row.name, row };
  const dataAgeHours = hoursSince(row.last_success_at, now);
  const staleAfter = row.stale_after_hours;
  const hoursUntilStale = staleAfter !== null && dataAgeHours !== null ? staleAfter - dataAgeHours : null;
  const reasons: string[] = [];

  const done = (state: HealthState, severity: HealthSeverity): ProviderHealth => ({
    ...base,
    state,
    label: LABELS[state],
    severity,
    dataAgeHours,
    hoursUntilStale,
    reasons,
  });

  // 'error' betyr aktiv kilde der siste kjøring feilet — den skal fortsatt overvåkes.
  if (row.status !== "active" && row.status !== "error") {
    reasons.push(row.status_reason ?? `Status: ${row.status}.`);
    return done("inactive", "ok");
  }

  if (row.sync_interval_minutes === null) {
    reasons.push(row.status_reason ?? "Kilden spørres direkte per søk og synkes ikke.");
    return done("not_scheduled", "ok");
  }

  if (row.last_success_at === null) {
    reasons.push("Kilden har aldri levert data vi kunne skrive.");
    if (row.last_error) reasons.push(row.last_error);
    return done("never_synced", "critical");
  }

  if (row.consecutive_failures > 0) {
    reasons.push(
      row.consecutive_failures === 1
        ? "Siste kjøring gikk ikke gjennom."
        : `${row.consecutive_failures} kjøringer på rad har ikke gått gjennom.`,
    );
    if (row.last_error) reasons.push(row.last_error);
  }
  for (const warning of row.last_run?.warnings ?? []) reasons.push(warning);

  const isStale = staleAfter !== null && dataAgeHours !== null && dataAgeHours > staleAfter;
  if (isStale) {
    reasons.unshift(
      `Siste data vi stolte på er ${formatHours(dataAgeHours!)} gamle. Grensen for denne kilden er ${formatHours(staleAfter!)}.`,
    );
    return done("stale", "critical");
  }

  if (row.last_run_status === "suspicious") {
    return done("suspicious", "critical");
  }

  if (row.consecutive_failures > 0) {
    // Data er fortsatt ferske nok; én feilet kjøring er ikke en krise i seg selv.
    return done("failing", row.consecutive_failures >= 3 ? "critical" : "warning");
  }

  if (staleAfter !== null && dataAgeHours !== null && dataAgeHours > staleAfter * APPROACHING_STALE) {
    reasons.unshift(`Data er ${formatHours(dataAgeHours)} gamle og nærmer seg grensen på ${formatHours(staleAfter)}.`);
    return done("ok", "warning");
  }

  return done("ok", "ok");
}

export function assessAll(rows: ProviderHealthRow[], now = new Date()): ProviderHealth[] {
  return rows.map((row) => assessProvider(row, now));
}

/** Providere som fortjener et varsel utenfor systemet. */
export function criticalProviders(health: ProviderHealth[]): ProviderHealth[] {
  return health.filter((h) => h.severity === "critical");
}
