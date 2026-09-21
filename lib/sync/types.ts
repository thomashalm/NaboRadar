import type { DataProvider, SyncOptions, SyncResult } from "@/lib/providers/types";

/**
 * Sync-orkestrering (implementeres i fase 4/6):
 *
 * 1. opprett sync_runs-rad (status running)
 * 2. for await (batch of provider.fetch(options)) → provider.normalize(batch)
 * 3. upsert events på (provider_id, external_id); content_hash avgjør updated vs unchanged
 * 4. erstatt event_documents for berørte events
 * 5. full: marker events som ikke ble sett med removed_from_source_at
 * 6. nye events → match mot watched_areas (ST_DWithin) → notifications (pending)
 * 7. oppdater sync_runs + providers.last_sync_at / last_success_at / last_error
 *
 * Kjøres kun på server (cron-route med CRON_SECRET, eller «Sync now» i /admin i development).
 */
export type RunSync = (provider: DataProvider, options: SyncOptions) => Promise<SyncResult>;

export interface HttpRetryPolicy {
  timeoutMs: number;
  maxRetries: number;
  /** Eksponentiell backoff: baseDelayMs * 2^forsøk, med jitter. */
  baseDelayMs: number;
}

/** Retry kun på nettverksfeil, timeout og 5xx. Aldri på 4xx. */
export const DEFAULT_RETRY_POLICY: HttpRetryPolicy = {
  timeoutMs: 20_000,
  maxRetries: 3,
  baseDelayMs: 1_000,
};
