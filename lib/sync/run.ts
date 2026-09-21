import type { Db } from "@/lib/db/types";
import type { DataProvider, RawBatch, SyncOptions, SyncResult } from "@/lib/providers/types";
import { contentHash } from "./hash";
import { mergeFragments } from "./merge";
import { toEventRow } from "./rows";

/** Rader per upsert-kall. Holder hvert kall godt under PostgREST sine grenser. */
const UPSERT_CHUNK = 150;
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
}

interface UpsertResult {
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: { external_id: string; error: string }[];
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
export async function runSync(provider: DataProvider, db: Db, options: RunSyncOptions): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const progress = options.onProgress ?? (() => {});
  const result: SyncResult = {
    providerId: provider.id,
    mode: options.mode,
    startedAt,
    completedAt: startedAt,
    status: "failed",
    fetched: 0,
    accepted: 0,
    rejected: 0,
    events: 0,
    documents: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    failed: 0,
    errors: [],
  };

  const [runId] = await db.rpc<string>("sync_run_start", { p_provider_id: provider.id, p_mode: options.mode });
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

    const events = mergeFragments(normalized.events);
    result.events = events.length;
    result.documents = events.reduce((sum, e) => sum + e.documents.length, 0);
    progress({ phase: "normalize", message: `${result.accepted} godkjent, ${result.rejected} avvist → ${events.length} events` });

    // 3. Skriv i biter.
    const syncedAt = new Date().toISOString();
    const failedIds: string[] = [];
    for (let i = 0; i < events.length; i += UPSERT_CHUNK) {
      const rows = events.slice(i, i + UPSERT_CHUNK).map((e) => toEventRow(e, contentHash(e)));
      const [counts] = await db.rpc<UpsertResult>("upsert_events", {
        p_provider_id: provider.id,
        p_events: rows,
        p_synced_at: syncedAt,
      });
      if (!counts) throw new SyncError("upsert_events returnerte ingen tellere");
      result.inserted += counts.inserted;
      result.updated += counts.updated;
      result.unchanged += counts.unchanged;
      result.failed += counts.failed;
      for (const e of counts.errors ?? []) {
        failedIds.push(e.external_id);
        if (result.errors.length < 40) result.errors.push(`skrivefeil ${e.external_id}: ${e.error}`);
      }
      progress({ phase: "write", message: `${Math.min(i + UPSERT_CHUNK, events.length)}/${events.length}` });
    }

    // 4. Full reconciliation: det som ikke ble sett, markeres — slettes ikke.
    if (options.mode === "full") {
      const keep = [
        ...new Set([...rejectedFeatures.map((r) => r.externalId).filter((id): id is string => id !== null), ...failedIds]),
      ];
      const [removed] = await db.rpc<number>("mark_removed_from_source", {
        p_provider_id: provider.id,
        p_run_synced_at: syncedAt,
        p_keep_external_ids: keep,
      });
      result.removed = removed ?? 0;
      progress({ phase: "reconcile", message: `${result.removed} markert som fjernet fra kilden` });
    }

    result.status = result.failed > 0 ? "partial" : "success";
  } catch (error) {
    result.status = "failed";
    result.errors.unshift(error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 500) : "Ukjent feil");
  }

  result.completedAt = new Date().toISOString();
  const { errors, ...counts } = result;
  await db.rpc("sync_run_finish", {
    p_run_id: runId,
    p_status: result.status,
    p_counts: counts,
    p_error: result.status === "success" ? null : errors.slice(0, 5).join("\n"),
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
    `Events:     ${r.events}  (etter gruppering på arealplan)`,
    `Documents:  ${r.documents}`,
    `Inserted:   ${r.inserted}`,
    `Updated:    ${r.updated}`,
    `Unchanged:  ${r.unchanged}`,
    `Removed:    ${r.removed}`,
    `Failed:     ${r.failed}`,
  ];
  if (r.errors.length > 0) lines.push("", ...r.errors.slice(0, 10).map((e) => `  • ${e}`));
  return lines.join("\n");
}
