import type { EventType } from "@/types/event";
import {
  ProviderUnavailableError,
  type DataProvider,
  type NormalizeResult,
  type ProviderHealth,
  type ProviderLicense,
  type ProviderStatus,
  type RawBatch,
} from "./types";

interface UnavailableProviderConfig {
  id: string;
  name: string;
  owner: string;
  eventTypes: readonly EventType[];
  license: ProviderLicense | null;
  status: Extract<ProviderStatus, "disabled" | "unsupported">;
  statusReason: string;
}

/**
 * Provider som er registrert men ikke kan brukes. Den gjør aldri nettverkskall.
 * Når lovlig tilgang finnes erstattes den av en ekte implementasjon med samme id.
 */
class UnavailableProvider implements DataProvider {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly eventTypes: readonly EventType[];
  readonly license: ProviderLicense | null;
  readonly defaultStatus: ProviderStatus;
  readonly statusReason: string;

  constructor(config: UnavailableProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.owner = config.owner;
    this.eventTypes = config.eventTypes;
    this.license = config.license;
    this.defaultStatus = config.status;
    this.statusReason = config.statusReason;
  }

  // eslint-disable-next-line require-yield
  async *fetch(): AsyncIterable<RawBatch> {
    throw new ProviderUnavailableError(this.id, this.statusReason);
  }

  normalize(): NormalizeResult {
    throw new ProviderUnavailableError(this.id, this.statusReason);
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      message: this.statusReason,
    };
  }
}

export const dibkRegulationProvider = new UnavailableProvider({
  id: "dibk-regulation",
  name: "Reguleringsplaner (NAP)",
  owner: "Direktoratet for byggkvalitet",
  eventTypes: ["regulation"],
  license: null,
  status: "unsupported",
  statusReason:
    "HTTP 401 – krever Norge Digitalt-innlogging (testet 2026-09-21). Ikke åpne data.",
});

export const dibkRegulationProposalProvider = new UnavailableProvider({
  id: "dibk-regulation-proposal",
  name: "Reguleringsplanforslag / høring (NAP)",
  owner: "Direktoratet for byggkvalitet",
  eventTypes: ["regulation_hearing"],
  license: null,
  status: "unsupported",
  statusReason:
    "HTTP 401 – krever Norge Digitalt-innlogging (testet 2026-09-21). Ikke åpne data.",
});

export const osloBuildingCaseProvider = new UnavailableProvider({
  id: "oslo-building-case",
  name: "Byggesaker Oslo",
  owner: "Oslo kommune",
  eventTypes: ["building_case"],
  license: null,
  status: "disabled",
  statusReason:
    "Ingen dokumentert offentlig API funnet. Interne endepunkter reverse-engineeres ikke (ADR 004).",
});
