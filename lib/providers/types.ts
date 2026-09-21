import type { EventType, NormalizedEvent } from "@/types/event";

/**
 * active       — hentes ved sync og vises i produktet
 * disabled     — teknisk mulig/planlagt, men slått av (f.eks. ingen lovlig kilde ennå)
 * unsupported  — kilden kan ikke brukes (tilgang/lisens). Aktiveres ikke uten ny vurdering.
 * error        — aktiv, men siste sync feilet. Settes av sync-laget, ikke av provideren.
 */
export type ProviderStatus = "active" | "disabled" | "unsupported" | "error";

export interface ProviderLicense {
  name: string;
  url: string;
}

export type SyncMode = "full" | "incremental";

export interface SyncOptions {
  mode: SyncMode;
  /** Påkrevd for incremental: hent poster endret etter dette tidspunktet. */
  since?: Date;
  signal?: AbortSignal;
}

/**
 * Én sammenhengende enhet rådata fra kilden som normaliseres samlet.
 * DiBK: alle planomrade-features og tillatte dokumenter for en mengde arealplaner.
 * Providers bestemmer selv innholdet; sync-laget sender det urørt til normalize().
 */
export interface RawBatch {
  features: unknown[];
  documents: unknown[];
}

export interface RejectedRecord {
  /** Kildens ID hvis den kunne leses. */
  externalId: string | null;
  reason: string;
}

export interface NormalizeResult {
  events: NormalizedEvent[];
  rejected: RejectedRecord[];
}

export interface ProviderHealth {
  ok: boolean;
  checkedAt: string;
  latencyMs: number | null;
  message: string | null;
}

/**
 * En provider er en ren adapter mot én ekstern kilde.
 * Den henter og normaliserer — den skriver aldri til databasen.
 * Orkestrering (upsert, logging, varsling) ligger i lib/sync.
 */
export interface DataProvider {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly eventTypes: readonly EventType[];
  readonly license: ProviderLicense | null;
  /** Status fra kode. Kan overstyres i providers-tabellen (f.eks. deaktivere en aktiv provider). */
  readonly defaultStatus: ProviderStatus;
  /** Menneskelesbar begrunnelse, vises i /admin/providers. */
  readonly statusReason: string | null;

  /**
   * Henter rådata i batcher. Håndterer paginering, timeout og retry.
   * Kaster ProviderUnavailableError hvis kilden ikke kan brukes.
   */
  fetch(options: SyncOptions): AsyncIterable<RawBatch>;

  /** Ren funksjon: validerer (Zod), grupperer og mapper til intern modell. Ingen I/O. */
  normalize(batch: RawBatch): NormalizeResult;

  healthCheck(): Promise<ProviderHealth>;
}

export interface SyncResult {
  providerId: string;
  mode: SyncMode;
  startedAt: string;
  completedAt: string;
  status: "success" | "partial" | "failed";
  fetched: number;
  inserted: number;
  updated: number;
  unchanged: number;
  /** Markert removed_from_source_at (kun ved full sync). */
  removed: number;
  failed: number;
  errors: string[];
}

export class ProviderUnavailableError extends Error {
  constructor(
    readonly providerId: string,
    message: string,
  ) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
