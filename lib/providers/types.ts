import type { EventType, NormalizedEvent } from "@/types/event";
import type { NormalizedAreaFeature } from "@/types/area-feature";

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
  kind: "feature" | "document";
  /** Kildens ID hvis den kunne leses (for DiBK: arealplan). */
  externalId: string | null;
  /** Kort årsak — aldri hele payloaden. */
  reason: string;
}

export interface NormalizeResult<TRecord = NormalizedEvent> {
  /**
   * Normaliserte poster. Kan inneholde flere fragmenter med samme externalId
   * (DiBK: én per planomrade-feature) — sync-laget grupperer og slår dem sammen.
   */
  records: TRecord[];
  rejected: RejectedRecord[];
}

/** Hva provideren leverer: hendelser (events) eller områdefakta (area_features). */
export type RecordKind = "event" | "area_feature";

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
export interface DataProvider<TRecord = NormalizedEvent> {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly recordKind: RecordKind;
  /** Kun for event-providere. */
  readonly eventTypes?: readonly EventType[];
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

  /** Ren funksjon: validerer (Zod) og mapper til intern modell. Ingen I/O. Gruppering skjer i lib/sync. */
  normalize(batch: RawBatch): NormalizeResult<TRecord>;

  healthCheck(): Promise<ProviderHealth>;
}

/** Hva som startet kjøringen. */
export type SyncTrigger = "manual" | "scheduled" | "admin";

export interface SyncResult {
  providerId: string;
  mode: SyncMode;
  trigger: SyncTrigger;
  startedAt: string;
  completedAt: string;
  /**
   * success    — alt skrevet (avviste features er datakvalitet, ikke feil)
   * partial    — noen skrivefeil
   * suspicious — data ble skrevet, men tallene så feil ut (se lib/sync/guards.ts)
   * failed     — fatal feil
   */
  status: "success" | "partial" | "suspicious" | "failed";
  /** Antall rå features hentet fra kilden. */
  fetched: number;
  /** Features som besto validering. */
  accepted: number;
  /** Features som ikke besto validering. */
  rejected: number;
  /** Poster etter gruppering (for DiBK: én per arealplan). */
  records: number;
  documents: number;
  inserted: number;
  updated: number;
  unchanged: number;
  /** Markert removed_from_source_at (kun ved full sync). */
  removed: number;
  failed: number;
  /** Tallene så feil ut — reconciliation ble hoppet over med mindre admin tvang den. */
  suspicious: boolean;
  /** Om reconciliation faktisk ble kjørt. */
  reconciled: boolean;
  /** Nøytrale merknader om kjøringen. Vises i /admin og i varsler. */
  warnings: string[];
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

/** Provider som leverer områdefakta. */
export type AreaFeatureProvider = DataProvider<NormalizedAreaFeature>;
