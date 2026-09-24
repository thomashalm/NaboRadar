import type { NormalizedAreaFeature } from "@/types/area-feature";
import { fetchJson } from "@/lib/http";
import { asNumber, gmlPoint, nested, wfsPages, type GmlFeature } from "@/lib/providers/gml";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";

const WFS = "https://wfs.geonorge.no/skwms1/wfs.grunnskoler_vgs";
/** Nasjonalt skoleregister. Eneste kilde som har spesialskole-flagget. */
const NSR = "https://data-nsr.udir.no/v4/enheter";

/**
 * Grunnskoler og videregående skoler fra Utdanningsdirektoratet (CC BY 4.0 / NLOD).
 *
 * WFS-en har koordinat, besøksadresse, trinn, elevtall og eierforhold, og publiserer bare
 * skoler i drift. Den mangler ett felt vi trenger: om skolen er en spesialskole. Det henter
 * vi fra NSR og bruker til å utelate dem — en skole ved en institusjon kan røpe institusjonen,
 * og vi tar bare med det vi kan verifisere at hører hjemme i et offentlig kart.
 */
type SkoleType = "grunnskole" | "videregaende_skole";

interface RawSkole {
  type: SkoleType;
  feature: GmlFeature;
  erSpesialskole: boolean;
}

interface NsrEnhet {
  Organisasjonsnummer?: string;
  ErSpesialskole?: boolean;
}

export class UdirSkolerProvider implements AreaFeatureProvider {
  readonly id = "udir-skoler";
  readonly name = "Grunnskoler og videregående skoler";
  readonly owner = "Utdanningsdirektoratet";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Creative Commons Navngivelse 4.0", url: "https://creativecommons.org/licenses/by/4.0/" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = DEFAULT_RETRY_POLICY,
  ) {}

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    const spesialskoler = await this.loadSpesialskoler(options.signal);
    for (const type of ["grunnskole", "videregaende_skole"] as const) {
      const typeName = type === "grunnskole" ? "Grunnskole" : "VideregåendeSkole";
      for await (const features of wfsPages({ baseUrl: WFS, typeName, signal: options.signal, retry: this.retry })) {
        yield {
          features: features.map((feature) => ({
            type,
            feature,
            erSpesialskole: spesialskoler.has(String(feature.organisasjonsnummer ?? "")),
          })),
          documents: [],
        };
      }
    }
  }

  /** Organisasjonsnumre for spesialskoler. Registeret er paginert med 1 000 per side. */
  private async loadSpesialskoler(signal?: AbortSignal): Promise<Set<string>> {
    const spesial = new Set<string>();
    for (let side = 1; ; side++) {
      const body = (await fetchJson(`${NSR}?sidenummer=${side}`, {
        timeoutMs: this.retry.timeoutMs,
        retries: this.retry.maxRetries,
        baseDelayMs: this.retry.baseDelayMs,
        signal,
        fetchImpl: this.fetchImpl,
      })) as { AntallSider?: number; EnhetListe?: NsrEnhet[] };

      for (const enhet of body.EnhetListe ?? []) {
        if (enhet.ErSpesialskole && enhet.Organisasjonsnummer) spesial.add(enhet.Organisasjonsnummer);
      }
      if (!body.AntallSider || side >= body.AntallSider) return spesial;
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];

    for (const raw of batch.features as RawSkole[]) {
      const { type, feature, erSpesialskole } = raw;
      const orgnr = typeof feature.organisasjonsnummer === "string" ? feature.organisasjonsnummer : null;
      const navn = typeof feature.skolenavn === "string" ? feature.skolenavn.trim() : null;
      const punkt = gmlPoint(feature);

      if (!orgnr || !navn || !punkt) {
        rejected.push({ kind: "feature", externalId: orgnr, reason: "mangler organisasjonsnummer, navn eller posisjon" });
        continue;
      }
      if (feature.iDrift === "false") {
        skipped.push({ kind: "feature", externalId: orgnr, reason: "ikke i drift" });
        continue;
      }
      if (erSpesialskole) {
        skipped.push({ kind: "feature", externalId: orgnr, reason: "spesialskole — vises ikke" });
        continue;
      }

      records.push({
        providerId: this.id,
        externalId: orgnr,
        category: "oppvekst",
        subtype: type,
        title: navn,
        geometry: { type: "Point", coordinates: punkt },
        attributes: {
          eierforhold: typeof feature.eierforhold === "string" ? feature.eierforhold : null,
          antallElever: asNumber(feature.antallElever),
          antallAnsatte: asNumber(feature.antallAnsatte),
          lavesteTrinn: asNumber(nested(feature, "trinn", "Trinn", "lavesteTrinn")),
          hoyesteTrinn: asNumber(nested(feature, "trinn", "Trinn", "høyesteTrinn")),
          adresse: nested(feature, "besøksadresse", "Besøksadresse", "adressenavn"),
          poststed: nested(feature, "besøksadresse", "Besøksadresse", "poststed"),
        },
        // Udirs egen offentlige side for enheten.
        sourceUrl: `https://nsr.udir.no/enhet/${orgnr}`,
        sourceUrlType: "factsheet",
        sourceUpdatedAt: typeof feature.oppdateringsdato === "string" ? feature.oppdateringsdato : null,
      });
    }
    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      let antall = 0;
      for await (const features of wfsPages({ baseUrl: WFS, typeName: "Grunnskole", pageSize: 1, retry: this.retry })) {
        antall = features.length;
        break;
      }
      return { ok: antall > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: "WFS svarer" };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
