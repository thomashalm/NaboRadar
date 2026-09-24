import type { NormalizedAreaFeature } from "@/types/area-feature";
import { asNumber, gmlPoint, nested, wfsPages, type GmlFeature } from "@/lib/providers/gml";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";

const WFS = "https://wfs.geonorge.no/skwms1/wfs.barnehager";

/**
 * Barnehager fra Utdanningsdirektoratet (NLOD).
 *
 * Vi tar kun med ordinære barnehager. En familiebarnehage drives i et privat hjem, så
 * koordinaten peker på noens bolig — den skal ikke i et offentlig kart. Åpne barnehager er
 * et drop-in-tilbud uten fast plass, og utelates fordi de ikke svarer på det brukeren lurer
 * på. Mangler typen, tar vi den ikke med: vi viser bare det vi kan verifisere.
 */
const ORDINÆR = "OrdinærBarnehage";

export class UdirBarnehagerProvider implements AreaFeatureProvider {
  readonly id = "udir-barnehager";
  readonly name = "Barnehager";
  readonly owner = "Utdanningsdirektoratet";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD)", url: "https://data.norge.no/nlod/no/1.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(
    _fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = DEFAULT_RETRY_POLICY,
  ) {}

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    for await (const features of wfsPages({ baseUrl: WFS, typeName: "Barnehage", signal: options.signal, retry: this.retry })) {
      yield { features, documents: [] };
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];

    for (const feature of batch.features as GmlFeature[]) {
      const orgnr = typeof feature.organisasjonsnummer === "string" ? feature.organisasjonsnummer : null;
      const navn = typeof feature.barnehagenavn === "string" ? feature.barnehagenavn.trim() : null;
      const punkt = gmlPoint(feature);
      const type = typeof feature.barnehagetype === "string" ? feature.barnehagetype : null;

      if (!orgnr || !navn || !punkt) {
        rejected.push({ kind: "feature", externalId: orgnr, reason: "mangler organisasjonsnummer, navn eller posisjon" });
        continue;
      }
      if (type !== ORDINÆR) {
        skipped.push({ kind: "feature", externalId: orgnr, reason: `ikke ordinær barnehage (${type ?? "type mangler"})` });
        continue;
      }
      if (feature.iDrift === "false") {
        skipped.push({ kind: "feature", externalId: orgnr, reason: "ikke i drift" });
        continue;
      }

      records.push({
        providerId: this.id,
        externalId: orgnr,
        category: "oppvekst",
        subtype: "barnehage",
        title: navn,
        geometry: { type: "Point", coordinates: punkt },
        attributes: {
          eierforhold: typeof feature.eierforhold === "string" ? feature.eierforhold : null,
          antallBarn: asNumber(feature.antallBarn),
          antallAnsatte: asNumber(feature.antallAnsatte),
          lavesteAlder: asNumber(nested(feature, "aldersgruppe", "Aldersgruppe", "lavesteAlder")),
          hoyesteAlder: asNumber(nested(feature, "aldersgruppe", "Aldersgruppe", "høyesteAlder")),
          kommunenavn: typeof feature.kommunenavn === "string" ? feature.kommunenavn : null,
        },
        // Udirs egen offentlige faktaside for barnehagen.
        sourceUrl: `https://www.barnehagefakta.no/barnehage/${orgnr}`,
        sourceUrlType: "factsheet",
        sourceUpdatedAt: typeof feature.datauttaksdato === "string" ? feature.datauttaksdato : null,
      });
    }
    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      let antall = 0;
      for await (const features of wfsPages({ baseUrl: WFS, typeName: "Barnehage", pageSize: 1, retry: this.retry })) {
        antall = features.length;
        break;
      }
      return { ok: antall > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: "WFS svarer" };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
