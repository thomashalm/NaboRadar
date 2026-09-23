import { areaFeatureProviders } from "@/lib/providers/area-registry";
import { providers } from "@/lib/providers/registry";
import type { DataProvider } from "@/lib/providers/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import type { NormalizedEvent } from "@/types/event";

/**
 * Alle providere som faktisk synkes, uavhengig av om de leverer events eller områdefakta.
 * Kilder som spørres direkte per søk (lib/facts/lookups) hører ikke hjemme her.
 */
export type SyncRecord = NormalizedEvent | NormalizedAreaFeature;
export type SyncableProvider = DataProvider<SyncRecord>;

export const syncProviders: readonly SyncableProvider[] = [
  ...providers.filter((p) => p.defaultStatus === "active"),
  ...areaFeatureProviders,
];

export function getSyncProvider(id: string): SyncableProvider | undefined {
  return syncProviders.find((p) => p.id === id);
}
