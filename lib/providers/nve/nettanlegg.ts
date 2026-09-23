import { z } from "zod";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import { ArcgisClient, arcgisFeatureSchema } from "@/lib/providers/arcgis";
import { geometrySchema } from "@/lib/providers/mdir/shared";
import { describeIssues } from "@/lib/providers/issues";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY } from "@/lib/sync/types";

const SERVICE = "https://kart.nve.no/enterprise/rest/services/Nettanlegg4/MapServer";

/**
 * NVEs nettanlegg (NLOD): transformatorstasjoner og luftledninger i transmisjons- og regionalnett.
 *
 * Vi viser kun det NVE selv publiserer som åpne data. Jordkabler og lavspent distribusjonsnett
 * inngår ikke i kilden, og vi forsøker aldri å utlede kabeltraseer ved å kombinere kilder
 * (kraftsensitiv informasjon, energiloven § 9-3).
 */
const LAYERS = [
  { id: 5, subtype: "transformatorstasjon" as const, nett: null },
  { id: 0, subtype: "kraftledning" as const, nett: "transmisjon" },
  { id: 1, subtype: "kraftledning" as const, nett: "regional" },
];

const propertiesSchema = z.object({
  globalid: z.string().min(1),
  navn: z.string().nullable(),
  eier: z.string().nullable(),
  spenning_kv: z.number().nullable(),
  objekttype: z.string().nullable(),
  driftsattaar: z.number().nullable(),
});

export class NveNettanleggProvider implements AreaFeatureProvider {
  readonly id = "nve-nettanlegg";
  readonly name = "Transformatorstasjoner og kraftledninger";
  readonly owner = "Norges vassdrags- og energidirektorat";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD)", url: "https://data.norge.no/nlod/no/1.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch, retry = DEFAULT_RETRY_POLICY) {
    this.client = new ArcgisClient(fetchImpl, retry);
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    for (const layer of LAYERS) {
      for await (const features of this.client.pages(SERVICE, layer.id, {
        outFields: Object.keys(propertiesSchema.shape),
        geometryPrecision: 6,
        signal: options.signal,
      })) {
        // Laget følger med, slik at normalize vet om det er stasjon eller ledning.
        yield { features: features.map((f) => ({ layer, feature: f })), documents: [] };
      }
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];

    for (const raw of batch.features) {
      const wrapper = z.object({ layer: z.object({ id: z.number(), subtype: z.string(), nett: z.string().nullable() }), feature: z.unknown() }).safeParse(raw);
      const feature = wrapper.success ? arcgisFeatureSchema.safeParse(wrapper.data.feature) : null;
      const props = feature?.success ? propertiesSchema.safeParse(feature.data.properties) : null;
      const geometry = feature?.success ? geometrySchema.safeParse(feature.data.geometry) : null;
      if (!wrapper.success || !feature?.success || !props?.success || !geometry?.success) {
        rejected.push({
          kind: "feature",
          externalId: null,
          reason: describeIssues(props?.error ?? geometry?.error ?? feature?.error ?? wrapper.error, "ugyldig nettanlegg"),
        });
        continue;
      }
      const p = props.data;
      const { subtype, nett } = wrapper.data.layer;

      records.push({
        providerId: this.id,
        externalId: p.globalid,
        category: "infrastruktur",
        subtype,
        title: p.navn?.trim() || (subtype === "transformatorstasjon" ? "Transformatorstasjon" : "Kraftledning"),
        geometry: geometry.data,
        attributes: {
          spenningKv: p.spenning_kv,
          eier: p.eier,
          nettnivaa: nett,
          driftsattAar: p.driftsattaar,
        },
        sourceUrl: null,
        sourceUrlType: null,
        sourceUpdatedAt: null,
      });
    }
    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const count = await this.client.count(SERVICE, 5);
      return { ok: count > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: `${count} transformatorstasjoner` };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
