import { utm32ToWgs84 } from "@/lib/geo/utm";
import type {
  AreaFeatureProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "@/lib/providers/types";
import { fetchJson } from "@/lib/http";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";

/**
 * Skjenkebevillinger i Oslo, fra Næringsetatens eget kart (laget av Plan- og bygningsetaten).
 *
 * Kilden er bevillingsmyndighetens egen oversikt: hvert punkt er et sted som faktisk har
 * skjenkebevilling, satt på adressepunktet. Målt mot Kartverkets adressepunkter er avviket
 * 0 m for de fleste stedene.
 *
 * To ting vi bevisst ikke lagrer:
 *   * `EIERNAVN` — bevillingshaveren kan være en enkeltpersonsforetak, altså en privatperson.
 *     Vi viser stedet, aldri hvem som står bak det.
 *   * Tidene tolkes ikke. Kilden oppgir «tillatt stengetid» inne og ute. Det er verken
 *     skjenketid eller faktisk åpningstid, og vi regner ikke om mellom dem.
 */
const WFS = "https://od2.pbe.oslo.kommune.no/cgi-bin/wms";
/** Oslo kommune med god margin, i EPSG:25832. Kilden dekker bare Oslo. */
const OSLO_BBOX = "585000,6630000,612000,6665000";
const KART = "https://od2.pbe.oslo.kommune.no/xkart/skjenkebevilling/";

interface SkjenkeFeature {
  properties?: Record<string, unknown>;
  geometry?: { type?: string; coordinates?: unknown } | null;
}

const str = (value: unknown): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
};

/** «2026-09-24 00:00:00» → ISO. Kilden oppgir når kopien ble tatt, ikke når bevillingen ble endret. */
function kopidato(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const parsed = new Date(text.replace(" ", "T") + "Z");
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export class OsloSkjenkebevillingProvider implements AreaFeatureProvider {
  readonly id = "oslo-skjenkebevilling";
  readonly name = "Skjenkebevillinger i Oslo";
  readonly owner = "Næringsetaten, Oslo kommune";
  readonly recordKind = "area_feature" as const;
  // Tjenesten oppgir ingen lisens. Vi navngir kilden og lenker til kartet, og har bedt om avklaring.
  readonly license = { name: "Lisens ikke oppgitt av kilden", url: KART };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = DEFAULT_RETRY_POLICY,
  ) {}

  private url(): string {
    const params = new URLSearchParams({
      map: "AAPNING",
      version: "1.1.0",
      service: "wfs",
      request: "GetFeature",
      typename: "skjenkebevilling_punkt",
      outputformat: "geojson",
      bbox: OSLO_BBOX,
    });
    return `${WFS}?${params}`;
  }

  private request(signal?: AbortSignal): Promise<unknown> {
    return fetchJson(this.url(), {
      timeoutMs: this.retry.timeoutMs,
      retries: this.retry.maxRetries,
      baseDelayMs: this.retry.baseDelayMs,
      signal,
      fetchImpl: this.fetchImpl,
    });
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    // Hele Oslo kommer i ett svar på under en megabyte, så det er ingen grunn til å sidedele.
    const body = (await this.request(options.signal)) as { features?: unknown };
    yield { features: Array.isArray(body.features) ? body.features : [], documents: [] };
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];

    for (const raw of batch.features as SkjenkeFeature[]) {
      const p = raw.properties ?? {};
      const id = str(p.DBID);
      const navn = str(p.OBJEKTNAVN);
      const koordinat = raw.geometry?.type === "Point" ? raw.geometry.coordinates : null;
      const utm =
        Array.isArray(koordinat) && koordinat.length >= 2 && koordinat.every((n) => typeof n === "number")
          ? ([koordinat[0], koordinat[1]] as [number, number])
          : null;

      if (!id || !navn || !utm) {
        rejected.push({ kind: "feature", externalId: id, reason: "mangler id, navn eller posisjon" });
        continue;
      }

      const inne = str(p.INNE_TID);
      const ute = str(p.UTE_TID);

      records.push({
        providerId: this.id,
        externalId: id,
        category: "servering",
        subtype: "skjenkested",
        title: navn,
        geometry: { type: "Point", coordinates: utm32ToWgs84(utm) },
        attributes: {
          adresse: str(p.OBJEKTADRESSE),
          postnr: str(p.OBJEKTPOSTNR),
          poststed: str(p.OBJEKTPOSTSTED),
          // Tillatt stengetid, slik kilden oppgir den. Ikke skjenketid, ikke faktisk åpningstid.
          stengetidInne: inne,
          stengetidUte: ute,
          uteservering: ute !== null,
        },
        sourceUrl: KART,
        sourceUrlType: "provider_page",
        sourceUpdatedAt: kopidato(p.KOPIDATO),
      });
    }

    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const body = (await this.request()) as { features?: unknown[] };
      const antall = Array.isArray(body.features) ? body.features.length : 0;
      return {
        ok: antall > 0,
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        message: `${antall} bevillinger`,
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
