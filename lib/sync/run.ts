import type { Db } from "@/lib/db/types";
import type { DataProvider, RawBatch, SyncOptions, SyncResult, SyncTrigger } from "@/lib/providers/types";
import { assessRun } from "./guards";
import { strategyFor } from "./strategy";

/** Overlapp ved incremental sync, slik at klokkeforskjeller og sene oppdateringer ikke faller mellom. */
const INCREMENTAL_OVERLAP_MS = 24 * 60 * 60 * 1000;

export interface SyncProgress {
  phase: "fetch" | "normalize" | "write" | "reconcile";
  message: string;
}

export interface RunSyncOptions {
  mode: SyncOptions["mode"];
  signal?: AbortSignal;
  onProgress?: (progress: SyncProgress) => void;
  /** Overstyr «since» for incremental (ellers: siste vellykkede sync − 24 t). */
  since?: Date;
  /** Hva som startet kjøringen. Logges på sync_runs. */
  trigger?: SyncTrigger;
  /** Admin har bekreftet at et unormalt datafall er reelt: kjør reconciliation likevel. */
  force?: boolean;
}

interface UpsertResult {
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: { external_id: string; error: string }[];
}

/** Deler radene i pakker som både har få nok rader og liten nok payload. */
function* chunkByBytes(rows: unknown[], maxRows: number, maxBytes: number): Generator<{ rows: unknown[]; done: number }> {
  let current: unknown[] = [];
  let bytes = 0;
  for (const [index, row] of rows.entries()) {
    const size = JSON.stringify(row).length;
    if (current.length > 0 && (current.length >= maxRows || bytes + size > maxBytes)) {
      yield { rows: current, done: index };
      current = [];
      bytes = 0;
    }
    current.push(row);
    bytes += size;
  }
  if (current.length > 0) yield { rows: current, done: rows.length };
}

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
  }
}

/**
 * Sentral sync for én provider:
 * hent (provider) → valider/normaliser (provider) → grupper/dedupliser → hash → skriv → logg.
 * Providers skriver aldri til databasen selv.
 */
export async function runSync<TRecord>(
  provider: DataProvider<TRecord>,
  db: Db,
  options: RunSyncOptions,
): Promise<SyncResult> {
  const strategy = strategyFor(provider.recordKind) as unknown as import("./strategy").SyncStrategy<TRecord>;
  const startedAt = new Date().toISOString();
  const progress = options.onProgress ?? (() => {});
  const trigger = options.trigger ?? "manual";
  const result: SyncResult = {
    providerId: provider.id,
    mode: options.mode,
    trigger,
    startedAt,
    completedAt: startedAt,
    status: "failed",
    fetched: 0,
    accepted: 0,
    rejected: 0,
    records: 0,
    documents: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    failed: 0,
    suspicious: false,
    reconciled: false,
    warnings: [],
    errors: [],
  };

  const [runId] = await db.rpc<string>("sync_run_start", {
    p_provider_id: provider.id,
    p_mode: options.mode,
    p_trigger: trigger,
  });
  if (!runId) throw new SyncError("Kunne ikke opprette sync_run");

  try {
    let since: Date | undefined;
    if (options.mode === "incremental") {
      since = options.since;
      if (!since) {
        const [last] = await db.rpc<string | null>("last_successful_sync_start", { p_provider_id: provider.id });
        if (!last) throw new SyncError("Ingen vellykket sync å bygge videre på. Kjør full sync først.");
        since = new Date(new Date(last).getTime() - INCREMENTAL_OVERLAP_MS);
      }
    }

    // 1. Hent alt. Grupper kan krysse sidegrenser, så vi normaliserer først når alt er hentet.
    const combined: RawBatch = { features: [], documents: [] };
    for await (const batch of provider.fetch({ mode: options.mode, since, signal: options.signal })) {
      combined.features.push(...batch.features);
      combined.documents.push(...batch.documents);
      progress({ phase: "fetch", message: `${combined.features.length} features, ${combined.documents.length} dokumenter` });
    }
    result.fetched = combined.features.length;

    // 2. Valider + normaliser (provider), grupper + dedupliser (sync).
    const normalized = provider.normalize(combined);
    const rejectedFeatures = normalized.rejected.filter((r) => r.kind === "feature");
    result.rejected = rejectedFeatures.length;
    result.accepted = result.fetched - result.rejected;
    for (const r of rejectedFeatures.slice(0, 20)) result.errors.push(`avvist ${r.externalId ?? "?"}: ${r.reason}`);

    const records = strategy.merge(normalized.records);
    result.records = records.length;
    result.documents = strategy.countDocuments(records);
    progress({ phase: "normalize", message: `${result.accepted} godkjent, ${result.rejected} avvist → ${records.length} poster` });

    // 3. Skriv i biter.
    const syncedAt = new Date().toISOString();
    const failedIds: string[] = [];
    const rows = records.map((r) => strategy.toRow(r, strategy.hash(r)));
    for (const chunk of chunkByBytes(rows, strategy.chunkSize, strategy.maxChunkBytes)) {
      const [counts] = await db.rpc<UpsertResult>(strategy.upsertFn, {
        p_provider_id: provider.id,
        [provider.recordKind === "event" ? "p_events" : "p_features"]: chunk.rows,
        p_synced_at: syncedAt,
      });
      if (!counts) throw new SyncError(`${strategy.upsertFn} returnerte ingen tellere`);
      result.inserted += counts.inserted;
      result.updated += counts.updated;
      result.unchanged += counts.unchanged;
      result.failed += counts.failed;
      for (const e of counts.errors ?? []) {
        failedIds.push(e.external_id);
        if (result.errors.length < 40) result.errors.push(`skrivefeil ${e.external_id}: ${e.error}`);
      }
      progress({ phase: "write", message: `${chunk.done}/${rows.length}` });
    }

    // 4. Vakt mot «silent failures»: er tallene til å stole på?
    const [baseline] = await db.rpc<number | null>("provider_baseline", { p_provider_id: provider.id });
    const verdict = assessRun({
      fetched: result.fetched,
      rejected: result.rejected,
      records: result.records,
      baseline: baseline ?? null,
      mode: options.mode,
      force: options.force,
    });
    result.suspicious = verdict.suspicious;
    result.warnings = verdict.warnings;

    // 5. Full reconciliation: det som ikke ble sett, markeres — slettes ikke.
    //    Hoppes over når tallene ikke er til å stole på, slik at en kilde som plutselig
    //    leverer for lite ikke fører til at alt annet markeres som fjernet.
    if (verdict.allowReconcile) {
      const keep = [
        ...new Set([...rejectedFeatures.map((r) => r.externalId).filter((id): id is string => id !== null), ...failedIds]),
      ];
      const [removed] = await db.rpc<number>(strategy.removeFn, {
        p_provider_id: provider.id,
        p_run_synced_at: syncedAt,
        p_keep_external_ids: keep,
      });
      result.removed = removed ?? 0;
      result.reconciled = true;
      progress({ phase: "reconcile", message: `${result.removed} markert som fjernet fra kilden` });
    } else if (options.mode === "full") {
      progress({ phase: "reconcile", message: "hoppet over (mistenkelige tall)" });
    }

    result.status = verdict.suspicious ? "suspicious" : result.failed > 0 ? "partial" : "success";
  } catch (error) {
    result.status = "failed";
    result.errors.unshift(error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 500) : "Ukjent feil");
  }

  result.completedAt = new Date().toISOString();
  const { errors, warnings, ...counts } = result;
  await db.rpc("sync_run_finish", {
    p_run_id: runId,
    p_status: result.status,
    p_counts: counts,
    p_error: result.status === "success" ? null : [...warnings, ...errors].slice(0, 5).join("\n"),
    p_warnings: warnings,
    p_suspicious: result.suspicious,
    p_reconciled: result.reconciled,
  });
  return result;
}

/** Kompakt oppsummering for CLI og /dev. Aldri payloads. */
export function formatSyncResult(r: SyncResult): string {
  const seconds = ((Date.parse(r.completedAt) - Date.parse(r.startedAt)) / 1000).toFixed(1);
  const lines = [
    `Provider:   ${r.providerId} (${r.mode})`,
    `Status:     ${r.status}  (${seconds} s)`,
    `Fetched:    ${r.fetched}`,
    `Accepted:   ${r.accepted}`,
    `Rejected:   ${r.rejected}`,
    `Poster:     ${r.records}  (etter gruppering/dedupe)`,
    `Documents:  ${r.documents}`,
    `Inserted:   ${r.inserted}`,
    `Updated:    ${r.updated}`,
    `Unchanged:  ${r.unchanged}`,
    `Removed:    ${r.removed}${r.mode === "full" && !r.reconciled ? "  (reconciliation hoppet over)" : ""}`,
    `Failed:     ${r.failed}`,
  ];
  if (r.warnings.length > 0) lines.push("", ...r.warnings.map((w) => `  ⚠ ${w}`));
  if (r.errors.length > 0) lines.push("", ...r.errors.slice(0, 10).map((e) => `  • ${e}`));
  return lines.join("\n");
}
