import { z } from "zod";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import { ArcgisClient, arcgisFeatureSchema } from "@/lib/providers/arcgis";
import { describeIssues } from "@/lib/providers/issues";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY } from "@/lib/sync/types";
import { toSafeHttpUrl } from "@/lib/url";
import { geometrySchema } from "./shared";

const SERVICE = "https://kart3.miljodirektoratet.no/arcgis/rest/services/industri/MapServer";
const LAYER = 0;

/**
 * Landbaserte anlegg med utslippstillatelse fra Miljødirektoratet eller Statsforvalteren (NLOD).
 *
 * Kun anlegg som faktisk har offentlig tillatelse og er i drift. Vi klassifiserer aldri
 * en virksomhet som «industri» ut fra firmanavn — bransjekoden kommer fra kilden.
 */

/** NACE 38.x = innsamling, gjenvinning, forbrenning og deponi. */
export function isWasteFacility(bransje: string | null): boolean {
  return /^38\./.test(bransje ?? "");
}

const propertiesSchema = z.object({
  anlegg_id: z.union([z.string(), z.number()]).transform(String),
  navn: z.string().min(1),
  bransje: z.string().nullable(),
  driftsstatus: z.string().nullable(),
  anleggstype: z.string().nullable(),
  forurensningsmyndighet: z.string().nullable(),
  siste_rapportering_aar: z.number().nullable(),
  har_utslipp_luft: z.number().nullable(),
  har_utslipp_vann: z.number().nullable(),
  faktaark: z.string().nullable(),
});

export class MdirIndustriProvider implements AreaFeatureProvider {
  readonly id = "mdir-industri-tillatelse";
  readonly name = "Industri med utslippstillatelse";
  readonly owner = "Miljødirektoratet";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD)", url: "https://data.norge.no/nlod/no/1.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch, retry = DEFAULT_RETRY_POLICY) {
    this.client = new ArcgisClient(fetchImpl, retry);
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    // Nedlagte anlegg filtreres bort allerede i spørringen.
    for await (const features of this.client.pages(SERVICE, LAYER, {
      where: "driftsstatus = 'Aktiv'",
      outFields: Object.keys(propertiesSchema.shape),
      signal: options.signal,
    })) {
      yield { features, documents: [] };
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];

    for (const raw of batch.features) {
      const feature = arcgisFeatureSchema.safeParse(raw);
      const props = feature.success ? propertiesSchema.safeParse(feature.data.properties) : null;
      const geometry = feature.success ? geometrySchema.safeParse(feature.data.geometry) : null;
      if (!feature.success || !props?.success || !geometry?.success) {
        rejected.push({
          kind: "feature",
          externalId: null,
          reason: describeIssues(props?.error ?? geometry?.error ?? feature.error, "ugyldig anlegg"),
        });
        continue;
      }
      const p = props.data;
      if (p.driftsstatus !== "Aktiv") {
        rejected.push({ kind: "feature", externalId: p.anlegg_id, reason: `driftsstatus ${p.driftsstatus}` });
        continue;
      }
      const faktaark = toSafeHttpUrl(p.faktaark);

      records.push({
        providerId: this.id,
        externalId: p.anlegg_id,
        category: "industri",
        subtype: isWasteFacility(p.bransje) ? "avfallsanlegg" : "industrianlegg",
        title: p.navn,
        geometry: geometry.data,
        attributes: {
          bransje: p.bransje,
          anleggstype: p.anleggstype,
          myndighet: p.forurensningsmyndighet,
          sisteRapporteringAar: p.siste_rapportering_aar,
          utslippLuft: p.har_utslipp_luft === 1,
          utslippVann: p.har_utslipp_vann === 1,
        },
        sourceUrl: faktaark?.startsWith("https://www.norskeutslipp.no/") ? faktaark : null,
        sourceUrlType: faktaark?.startsWith("https://www.norskeutslipp.no/") ? "factsheet" : null,
        sourceUpdatedAt: null,
      });
    }
    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const count = await this.client.count(SERVICE, LAYER, { where: "driftsstatus = 'Aktiv'" });
      return { ok: count > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: `${count} aktive anlegg` };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
