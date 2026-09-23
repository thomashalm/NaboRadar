import type { Db } from "@/lib/db/types";
import type { SyncMode, SyncResult } from "@/lib/providers/types";
import { getSyncProvider, syncProviders, type SyncableProvider } from "./registry";
import { runSync, type SyncProgress } from "./run";

/**
 * Sync-worker: kjører én provider av gangen, isolert.
 *
 * To kilder til arbeid:
 *   1. forespørsler fra /admin («Kjør sync nå») — køen sync_requests
 *   2. providere som er forfalt etter sin egen tidsplan — sync_due()
 *
 * En provider som feiler stopper aldri de andre: feilen logges på providerens egen rad
 * og i sync_runs, og workeren går videre til neste.
 */

export interface WorkerOptions {
  /** Begrens til disse providerne (CLI: --provider=). */
  providerIds?: string[];
  /** Overstyr modus. Ellers bestemmer tidsplanen (full vs. incremental). */
  mode?: SyncMode;
  force?: boolean;
  skipRequests?: boolean;
  skipDue?: boolean;
  /** Maks antall køforespørsler per kjøring, som en enkel sikkerhetsventil. */
  maxRequests?: number;
  log?: (line: string) => void;
  onProgress?: (providerId: string, progress: SyncProgress) => void;
  /** Overstyr provider-registeret (tester). */
  providers?: readonly SyncableProvider[];
}

export interface WorkerFailure {
  providerId: string;
  message: string;
}

export interface WorkerOutcome {
  results: SyncResult[];
  /** Feil utenfor selve kjøringen (ukjent provider, databasefeil). */
  failures: WorkerFailure[];
  handledRequests: number;
  expiredRequests: number;
}

interface ClaimedRequest {
  id: string;
  provider_id: string;
  mode: SyncMode;
  force: boolean;
  requested_by: string | null;
}

interface DueRow {
  provider_id: string;
  mode: SyncMode;
  reason: string;
}

const DEFAULT_MAX_REQUESTS = 10;

export async function runSyncWorker(db: Db, options: WorkerOptions = {}): Promise<WorkerOutcome> {
  const log = options.log ?? (() => {});
  const outcome: WorkerOutcome = { results: [], failures: [], handledRequests: 0, expiredRequests: 0 };
  const wanted = options.providerIds && options.providerIds.length > 0 ? new Set(options.providerIds) : null;

  const lookup = (id: string) => (options.providers ? options.providers.find((p) => p.id === id) : getSyncProvider(id));

  const runOne = async (providerId: string, mode: SyncMode, trigger: "admin" | "scheduled" | "manual", force: boolean) => {
    const provider = lookup(providerId);
    if (!provider) throw new Error(`Ukjent provider «${providerId}» — finnes ikke i registeret.`);
    log(`→ ${providerId} (${mode}, ${trigger})`);
    const result = await runSync(provider, db, {
      mode,
      trigger,
      force,
      onProgress: options.onProgress ? (progress) => options.onProgress!(providerId, progress) : undefined,
    });
    outcome.results.push(result);
    log(`  ${providerId}: ${result.status} — ${result.records} poster${result.warnings.length ? `, ${result.warnings.length} advarsel(er)` : ""}`);
    return result;
  };

  // 1. Forespørsler fra admin. Rydd først opp i kjøringer som aldri ble fullført.
  if (!options.skipRequests) {
    try {
      const [expired] = await db.rpc<number>("expire_stale_sync_requests");
      outcome.expiredRequests = expired ?? 0;
      if (outcome.expiredRequests > 0) log(`${outcome.expiredRequests} forespørsel(er) ryddet etter avbrutt kjøring.`);
    } catch (error) {
      outcome.failures.push({ providerId: "-", message: message(error) });
    }

    const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
    for (let i = 0; i < maxRequests; i++) {
      let request: ClaimedRequest | undefined;
      try {
        [request] = await db.rpc<ClaimedRequest>("claim_sync_request");
      } catch (error) {
        outcome.failures.push({ providerId: "-", message: message(error) });
        break;
      }
      if (!request) break;
      outcome.handledRequests += 1;

      if (wanted && !wanted.has(request.provider_id)) {
        // Ikke vår jobb i denne kjøringen — legg den tilbake.
        await finishRequest(db, request.id, "pending", null, null, outcome);
        break;
      }
      try {
        const result = await runOne(request.provider_id, options.mode ?? request.mode, "admin", options.force || request.force);
        await finishRequest(
          db,
          request.id,
          result.status === "failed" ? "failed" : "done",
          null,
          result.status === "failed" ? result.errors[0] ?? "Ukjent feil" : null,
          outcome,
        );
      } catch (error) {
        outcome.failures.push({ providerId: request.provider_id, message: message(error) });
        await finishRequest(db, request.id, "failed", null, message(error), outcome);
      }
    }
  }

  // 2. Providere som er forfalt etter tidsplan.
  if (!options.skipDue) {
    let due: DueRow[] = [];
    try {
      due = await db.rpc<DueRow>("sync_due");
    } catch (error) {
      outcome.failures.push({ providerId: "-", message: message(error) });
    }
    const alreadyRun = new Set(outcome.results.map((r) => r.providerId));
    for (const row of due) {
      if (wanted && !wanted.has(row.provider_id)) continue;
      if (alreadyRun.has(row.provider_id)) continue;
      try {
        await runOne(row.provider_id, options.mode ?? row.mode, "scheduled", options.force ?? false);
      } catch (error) {
        // Én kilde skal aldri stoppe de andre.
        outcome.failures.push({ providerId: row.provider_id, message: message(error) });
        log(`  ${row.provider_id}: FEIL — ${message(error)}`);
      }
    }
  }

  return outcome;
}

/** Kjører oppgitte providere uavhengig av tidsplan (CLI og lokal utvikling). */
export async function runProvidersNow(
  db: Db,
  providerIds: string[],
  options: {
    mode: SyncMode;
    force?: boolean;
    log?: (line: string) => void;
    onProgress?: WorkerOptions["onProgress"];
    /** Overstyr provider-registeret (tester). */
    providers?: readonly SyncableProvider[];
  },
): Promise<WorkerOutcome> {
  const log = options.log ?? (() => {});
  const outcome: WorkerOutcome = { results: [], failures: [], handledRequests: 0, expiredRequests: 0 };
  for (const id of providerIds) {
    const provider = options.providers ? options.providers.find((p) => p.id === id) : getSyncProvider(id);
    if (!provider) {
      outcome.failures.push({ providerId: id, message: "Ukjent provider" });
      continue;
    }
    try {
      const result = await runSync(provider, db, {
        mode: options.mode,
        trigger: "manual",
        force: options.force,
        onProgress: options.onProgress ? (progress) => options.onProgress!(id, progress) : undefined,
      });
      outcome.results.push(result);
    } catch (error) {
      outcome.failures.push({ providerId: id, message: message(error) });
      log(`${id}: FEIL — ${message(error)}`);
    }
  }
  return outcome;
}

/** Exit-kode: 0 alt bra, 2 minst én kilde feilet eller så mistenkelig ut, 1 fatal feil. */
export function exitCodeFor(outcome: WorkerOutcome): 0 | 1 | 2 {
  if (outcome.failures.some((f) => f.providerId === "-")) return 1;
  const bad = outcome.results.some((r) => r.status === "failed" || r.status === "suspicious");
  return bad || outcome.failures.length > 0 ? 2 : 0;
}

export const knownSyncProviderIds = syncProviders.map((p) => p.id);

async function finishRequest(
  db: Db,
  id: string,
  status: string,
  runId: string | null,
  error: string | null,
  outcome: WorkerOutcome,
) {
  try {
    await db.rpc("finish_sync_request", { p_id: id, p_status: status, p_sync_run_id: runId, p_error: error });
  } catch (dbError) {
    outcome.failures.push({ providerId: "-", message: message(dbError) });
  }
}

function message(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 300) : "Ukjent feil";
}
