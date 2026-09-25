import kuratert from "@/data/skolekretser.json";
import { utm32ToWgs84 } from "@/lib/geo/utm";
import { fetchGml, gmlFeatureMembers, gmlPolygon, nested } from "@/lib/providers/gml";
import type {
  AreaFeatureProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";

/**
 * Veiledende inntaksområder for barneskole i Oslo, fra Plan- og bygningsetatens kartserver.
 *
 * Dette er den eneste kilden vår der avstand ikke betyr noe. Et inntaksområde 200 meter unna
 * er ikke adressens område — det er naboens. Oppslaget spør derfor bare om punktet ligger
 * inne i polygonet, og vi sier ingenting når det ikke gjør det.
 *
 * Tre ting kilden ikke gir oss, og som derfor ikke finnes i dataene:
 *   * ingen skole-ID — laget har nøyaktig ett felt, `SKRETSNAVN`. Koblingen til en skole
 *     ligger i data/skolekretser.json, satt for hånd
 *   * ingen datostempel — grensene revideres hver høst, og innholdshashen i sync-laget er
 *     vårt eneste signal om at det har skjedd
 *   * ingen ungdomsskole — i Oslo bestemmes den av hvilken barneskole eleven hadde
 *     nærskolerett ved, ikke av en egen geografi
 */
const WFS = "https://od2.pbe.oslo.kommune.no/cgi-bin/wms";
const TYPENAME = "Skolekretser_f";
const KART = "https://od2.pbe.oslo.kommune.no/xkart/skoler/";

/** Laget svarer i EPSG:32632 uansett hva vi ber om, med øst før nord. Verifisert mot rådata. */
const UTM32_EAST_NORTH = (ost: number, nord: number) => utm32ToWgs84([ost, nord]);

interface KuratertKrets {
  krets: string;
  skoler: { navn: string; orgnr: string | null }[];
}

const KRETSER = new Map<string, KuratertKrets>(
  (kuratert.kretser as KuratertKrets[]).map((k) => [k.krets, k]),
);

export class OsloSkolekretsProvider implements AreaFeatureProvider {
  readonly id = "oslo-skolekrets";
  readonly name = "Skolekretser i Oslo";
  readonly owner = "Plan- og bygningsetaten, Oslo kommune";
  readonly recordKind = "area_feature" as const;
  // Tjenesten oppgir «Copyright Plan- og bygningsetaten i Oslo kommune». Ingen åpen lisens,
  // og gjenbruken er ikke avklart. Vi navngir kilden og lenker til kartet.
  readonly license = { name: "Lisens ikke avklart med kilden", url: KART };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = DEFAULT_RETRY_POLICY,
  ) {}

  private url(): string {
    const params = new URLSearchParams({
      map: "SKOLER",
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typename: TYPENAME,
    });
    return `${WFS}?${params}`;
  }

  /** Laget tilbyr bare GML — «geojson is not a permitted output format for layer». */
  private request(signal?: AbortSignal): Promise<string> {
    return fetchGml(this.url(), { retry: this.retry, signal, fetchImpl: this.fetchImpl });
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    // Hele Oslo er 105 polygoner på under en megabyte. Ingen grunn til å sidedele.
    const xml = await this.request(options.signal);
    yield { features: gmlFeatureMembers(xml, TYPENAME), documents: [] };
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];
    const sett = new Set<string>();

    for (const feature of batch.features as Record<string, unknown>[]) {
      const krets = nested(feature, "SKRETSNAVN");
      const geometry = gmlPolygon(feature, "msGeometry", UTM32_EAST_NORTH);

      if (!krets) {
        rejected.push({ kind: "feature", externalId: null, reason: "mangler SKRETSNAVN" });
        continue;
      }
      if (!geometry) {
        rejected.push({ kind: "feature", externalId: krets, reason: "mangler eller ugyldig geometri" });
        continue;
      }
      // Kretsnavnet er vår eneste nøkkel. To polygoner med samme navn ville gjort oppslaget
      // flertydig uten at vi merket det, så det skal avvises, ikke slås sammen.
      if (sett.has(krets)) {
        rejected.push({ kind: "feature", externalId: krets, reason: "kretsnavnet finnes fra før" });
        continue;
      }
      sett.add(krets);

      records.push({
        providerId: this.id,
        externalId: krets,
        category: "skolekrets",
        subtype: "inntaksomrade_barneskole",
        // Rått kretsnavn som tittel. Skolenavnet er en avledning, og ligger i attributes.
        title: krets,
        geometry,
        attributes: {
          skretsnavn: krets,
          nivaa: "barneskole",
          veiledende: true,
          // Om kretsnavnet er kuratert. Selve koblingen til skole slås opp fra
          // data/skolekretser.json ved visning, ikke lagret her: da kan en feil i koblingen
          // rettes uten å synke kilden på nytt.
          kuratert: KRETSER.has(krets),
        },
        sourceUrl: KART,
        sourceUrlType: "provider_page",
        // Kilden datostempler ikke laget. Vi later ikke som om vi vet når det ble endret.
        sourceUpdatedAt: null,
      });
    }

    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const antall = gmlFeatureMembers(await this.request(), TYPENAME).length;
      return {
        ok: antall > 0,
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        message: `${antall} inntaksområder`,
      };
    } catch (error) {
      return {
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs: null,
        message: error instanceof Error ? error.name : "Ukjent feil",
      };
    }
  }
}
