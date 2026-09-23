import { z } from "zod";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import { toDisplayName } from "@/lib/format";
import { ArcgisClient, arcgisDate, arcgisFeatureSchema, arcgisTimestamp, arcgisYear } from "@/lib/providers/arcgis";
import { hasDrawableArea } from "@/lib/providers/geometry";
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
 * Lokalitetsnavnet lagres og vises: uten det kan brukeren ikke se hvilket sted en registrering
 * gjelder. Navnet er publisert av forvaltningsmyndigheten sammen med flaten det gjelder, og
 * flaten vi lagrer er mer presis enn navnet. Virksomhetsnavn og næringsgruppe lagres derimot
 * ikke — de sier hvem som har drevet der, ikke hvor registreringen ligger.
 *
 * Kilden har ingen opplysninger om hvilke stoffer som er registrert. Stofflistene finnes bare
 * i faktaark-applikasjonen, bak et udokumentert internt API (jf. ADR 004), så vi sier i stedet
 * eksplisitt at kilden ikke oppgir forurensningstype, og lenker til faktaarket.
 */

/** Kildens egne påvirkningsgrader (tegnforklaringen i tjenesten). */
export const PAAVIRKNINGSGRAD = {
  liteForurensning: 1,
  akseptabelForurensning: 2,
  ikkeAkseptabelForurensning: 3,
  ukjentPåvirkning: null,
} as const;

/** Reservetittel når kilden mangler lokalitetsnavn (1,4 % av lokalitetene). */
const LOKALITET_TYPE_LABELS: Record<string, string> = {
  forurensetGrunn: "Registrert lokalitet med forurenset grunn",
  deponi: "Nedlagt eller eksisterende deponi",
  deponiKommunalt: "Kommunalt deponi",
  skipsverft: "Skipsverft",
  industriEllerNæring: "Industri- eller næringslokalitet",
  krigsetterlatenskaper: "Krigsetterlatenskaper",
  skytebane: "Skytebane",
  avfall: "Avfallslokalitet",
  mellomlager: "Mellomlager",
  nyttiggjøringavfall: "Lokalitet for nyttiggjøring av avfall",
  sedimentFerskvann: "Forurenset sediment i ferskvann",
  sedimentSaltvann: "Forurenset sediment i sjø",
};

/** Tall som enten kommer som tall eller som tallstreng fra ArcGIS. */
const arcgisNumber = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((value) => {
    const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  });

const propertiesSchema = z.object({
  identifikasjon_lokalid: z.string().min(1),
  lokalitet_navn: z.string().nullable(),
  lokalitet_type: z.string().nullable(),
  paavirkningsgrad: z.string().nullable(),
  tilstandsklasse: z.string().nullable(),
  prosess_status: z.string().nullable(),
  status: z.string().nullable(),
  arealbruk: z.string().nullable(),
  areal_totalt: arcgisNumber,
  datafangstdato: arcgisTimestamp,
  faktaark: z.string().nullable(),
  oppdateringsdato: arcgisTimestamp,
});

/** Tomme strenger i kilden betyr «ikke registrert». */
const code = (value: string | null): string | null => (value?.trim() ? value.trim() : null);

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

      // Uten brukbar flate kan vi ikke si hvor registreringen ligger, og da vises den ikke.
      if (!hasDrawableArea(geometry.data)) {
        rejected.push({ kind: "feature", externalId: p.identifikasjon_lokalid, reason: "degenerert geometri uten areal" });
        continue;
      }

      const lokalitetType = code(p.lokalitet_type);
      const navn = code(p.lokalitet_navn);
      const faktaark = toSafeHttpUrl(p.faktaark);
      const erFaktaark = faktaark?.startsWith("https://grunnforurensning.miljodirektoratet.no/") ?? false;

      records.push({
        providerId: this.id,
        externalId: p.identifikasjon_lokalid,
        category: "miljo",
        subtype: "forurenset_grunn",
        title: navn ? toDisplayName(navn) : (LOKALITET_TYPE_LABELS[lokalitetType ?? ""] ?? "Registrert lokalitet med forurenset grunn"),
        geometry: geometry.data,
        attributes: {
          // Kodede verdier fra kilden. Aldri virksomhetsnavn eller næringsgruppe.
          lokalitetType,
          paavirkningsgrad: code(p.paavirkningsgrad),
          tilstandsklasse: code(p.tilstandsklasse),
          prosessStatus: code(p.prosess_status),
          status: code(p.status),
          arealbruk: code(p.arealbruk),
          arealM2: p.areal_totalt,
          registrertAar: arcgisYear(p.datafangstdato),
          /** Kilden har ingen stoffopplysninger i åpne data — UI-et sier dette eksplisitt. */
          harStoffopplysninger: false,
        },
        sourceUrl: erFaktaark ? faktaark : null,
        sourceUrlType: erFaktaark ? "factsheet" : null,
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
