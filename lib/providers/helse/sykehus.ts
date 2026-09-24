import datasett from "@/data/sykehus.json";
import type {
  AreaFeatureProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "@/lib/providers/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import type { KuratertSykehus, SykehusDatasett } from "./types";

/**
 * Sykehus, fra den kuraterte listen i data/sykehus.json.
 *
 * Listen er ikke hentet fra ett register, fordi ingen åpen kilde alene svarer på «hva er et
 * sykehus»: RESH ligger bak helsenettet, Enhetsregisteret sier bare hva enheten er registrert
 * som, og Helsenorge blander sykehus, distriktspsykiatri, rusbehandling og private klinikker.
 * Et sted er derfor bare med når to uavhengige offentlige kilder er enige — se
 * scripts/build-sykehus.ts, som bygger fila og viser forskjellene før de committes.
 *
 * Psykiatriske og rusrelaterte behandlingssteder er bevisst ikke med, jf. at vi ikke
 * masseplasserer skjermede eller sårbare institusjoner i kartet.
 */
const DATA = datasett as SykehusDatasett;

export class SykehusProvider implements AreaFeatureProvider {
  readonly id = "helsenorge-sykehus";
  readonly name = "Sykehus";
  readonly owner = "Helsenorge og Enhetsregisteret";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD)", url: "https://data.norge.no/nlod/no/2.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(private readonly data: SykehusDatasett = DATA) {}

  // Ingen nettverkskall: datasettet ligger i repoet, og er verifisert før det ble committet.
  async *fetch(_options: SyncOptions): AsyncIterable<RawBatch> {
    yield { features: this.data.steder, documents: [] };
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];

    for (const sted of batch.features as KuratertSykehus[]) {
      if (!sted?.orgnr || !sted.navn || typeof sted.lat !== "number" || typeof sted.lng !== "number") {
        rejected.push({ kind: "feature", externalId: sted?.orgnr ?? null, reason: "mangler navn, orgnr eller koordinat" });
        continue;
      }
      // Nedlagte steder blir stående i fila som historikk, men skal ikke vises.
      if (sted.status !== "i drift") {
        skipped.push({ kind: "feature", externalId: sted.orgnr, reason: `status ${sted.status}` });
        continue;
      }

      records.push({
        providerId: this.id,
        externalId: sted.orgnr,
        category: "helse",
        subtype: "sykehus",
        title: sted.navn,
        geometry: { type: "Point", coordinates: [sted.lng, sted.lat] },
        attributes: {
          adresse: sted.adresse,
          postnr: sted.postnr,
          poststed: sted.poststed,
          kommune: sted.kommune,
          eierform: sted.eierform,
          helseregion: sted.helseregion,
          verifisert: sted.verifisert,
        },
        // Helsenorges egen side om behandlingsstedet, slik brukeren kan etterprøve oppføringen.
        sourceUrl: "https://tjenester.helsenorge.no/velg-behandlingssted/behandlingssteder",
        sourceUrlType: "provider_page",
        sourceUpdatedAt: `${sted.verifisert}T00:00:00Z`,
      });
    }

    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const antall = this.data.steder.filter((s) => s.status === "i drift").length;
    return {
      ok: antall > 0,
      checkedAt: new Date().toISOString(),
      latencyMs: 0,
      message: `${antall} sykehus, verifisert ${this.data.verifisert}`,
    };
  }
}
