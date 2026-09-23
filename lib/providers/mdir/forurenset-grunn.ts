import { z } from "zod";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import { ArcgisClient, arcgisDate, arcgisFeatureSchema, arcgisTimestamp } from "@/lib/providers/arcgis";
import { describeIssues } from "@/lib/providers/issues";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY } from "@/lib/sync/types";
import { toSafeHttpUrl } from "@/lib/url";
import { geometrySchema } from "./shared";

const SERVICE = "https://kart3.miljodirektoratet.no/arcgis/rest/services/grunnforurensning/MapServer";
const LAYER = 1;

/**
 * Miljødirektoratets grunnforurensningsdatabase (NLOD 2.0).
 *
 * Personvern: `lokalitet_navn` er ofte en gateadresse eller et borettslag og lagres derfor ikke.
 * Tittelen er lokalitetstypen, og detaljene er kildens egne klasser. Brukeren sendes til
 * Miljødirektoratets faktaark for resten.
 */

/** Kildens egne påvirkningsgrader (tegnforklaringen i tjenesten). */
export const PAAVIRKNINGSGRAD = {
  liteForurensning: 1,
  akseptabelForurensning: 2,
  ikkeAkseptabelForurensning: 3,
  ukjentPåvirkning: null,
} as const;

const LOKALITET_TYPE_LABELS: Record<string, string> = {
  forurensetGrunn: "Registrert lokalitet med forurenset grunn",
  deponi: "Nedlagt eller eksisterende deponi",
  deponiKommunalt: "Kommunalt deponi",
  skipsverft: "Skipsverft",
  industriEllerNæring: "Industri- eller næringslokalitet",
  krigsetterlatenskaper: "Krigsetterlatenskaper",
};

const propertiesSchema = z.object({
  identifikasjon_lokalid: z.string().min(1),
  lokalitet_type: z.string().nullable(),
  paavirkningsgrad: z.string().nullable(),
  tilstandsklasse: z.string().nullable(),
  prosess_status: z.string().nullable(),
  status: z.string().nullable(),
  faktaark: z.string().nullable(),
  oppdateringsdato: arcgisTimestamp,
});

export class MdirForurensetGrunnProvider implements AreaFeatureProvider {
  readonly id = "mdir-forurenset-grunn";
  readonly name = "Forurenset grunn";
  readonly owner = "Miljødirektoratet";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD) 2.0", url: "https://data.norge.no/nlod/no/2.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch, retry = DEFAULT_RETRY_POLICY) {
    this.client = new ArcgisClient(fetchImpl, retry);
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    // Kilden har ingen brukbar endringsmarkør, så incremental gjør samme uttrekk som full.
    for await (const features of this.client.pages(SERVICE, LAYER, {
      outFields: Object.keys(propertiesSchema.shape),
      geometryPrecision: 6,
      pageSize: 1000,
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
          reason: describeIssues(props?.error ?? geometry?.error ?? feature.error, "ugyldig lokalitet"),
        });
        continue;
      }
      const p = props.data;
      const faktaark = toSafeHttpUrl(p.faktaark);

      records.push({
        providerId: this.id,
        externalId: p.identifikasjon_lokalid,
        category: "miljo",
        subtype: "forurenset_grunn",
        title: LOKALITET_TYPE_LABELS[p.lokalitet_type ?? ""] ?? "Registrert lokalitet med forurenset grunn",
        geometry: geometry.data,
        attributes: {
          // Kun kodede verdier — aldri lokalitetsnavn (kan være adresse) eller virksomhetsnavn.
          lokalitetType: p.lokalitet_type,
          paavirkningsgrad: p.paavirkningsgrad,
          tilstandsklasse: p.tilstandsklasse,
          prosessStatus: p.prosess_status,
          status: p.status,
        },
        sourceUrl: faktaark?.startsWith("https://grunnforurensning.miljodirektoratet.no/") ? faktaark : null,
        sourceUrlType: faktaark?.startsWith("https://grunnforurensning.miljodirektoratet.no/") ? "factsheet" : null,
        sourceUpdatedAt: arcgisDate(p.oppdateringsdato),
      });
    }
    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const count = await this.client.count(SERVICE, LAYER);
      return { ok: count > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: `${count} lokaliteter` };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
