import type {
  DataProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  SyncOptions,
} from "../types";

/**
 * DiBK «Planlegging igangsatt» — collection `planomrade` + tillatte `plandokument`.
 *
 * Normaliseringsregler (implementeres i fase 4, se docs/architecture.md):
 * - grupper features på properties.arealplan → ett event, externalId = String(arealplan)
 * - 1 polygon → Polygon, flere → MultiPolygon. Aldri dedupliser på plannavn.
 * - announcedAt = kunngjøringsdatoVarselOmPlanoppstart, sourceUpdatedAt = max(oppdateringsdato)
 * - sourceUrl = link hvis toSafeHttpUrl() godtar den (municipal), ellers dibkArealplanPageUrl() (provider_page)
 * - documents: kun isAllowedDocument()
 * - rawData: kun properties per feature, uten geometri
 */
export class DibkPlanningStartedProvider implements DataProvider {
  readonly id = "dibk-planning-started";
  readonly name = "Planlegging igangsatt";
  readonly owner = "Direktoratet for byggkvalitet";
  readonly eventTypes = ["planning_started"] as const;
  readonly license = {
    name: "Norsk lisens for offentlige data (NLOD) 2.0",
    url: "https://data.norge.no/nlod/no/2.0",
  };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  async *fetch(_options: SyncOptions): AsyncIterable<RawBatch> {
    throw new Error("Ikke implementert ennå (fase 4)");
  }

  normalize(_batch: RawBatch): NormalizeResult {
    throw new Error("Ikke implementert ennå (fase 4)");
  }

  async healthCheck(): Promise<ProviderHealth> {
    throw new Error("Ikke implementert ennå (fase 4)");
  }
}
