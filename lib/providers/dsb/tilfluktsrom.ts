import { asNumber, gmlPoint, nested, wfsPages, type GmlFeature } from "@/lib/providers/gml";
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
 * Offentlige tilfluktsrom, fra Sivilforsvaret via DSBs Geonorge-tjeneste.
 *
 * Datasettet heter «Tilfluktsrom - Offentlige», og det er hele avgrensningen: private
 * tilfluktsrom publiseres ikke av DSB. Vi filtrerer altså ikke på offentlig/privat — vi henter
 * fra det datasettet som er offentlig, og importerer ingenting annet.
 *
 * Kilden gir fire opplysninger om rommet: romnummer, antall plasser, en stedsbeskrivelse og et
 * punkt. Den gir **ikke** areal, type eller status, og vi later ikke som om den gjør det.
 *
 * `adresse` er ikke en ren adresse, men kildens egen stedsbeskrivelse — «Vestre Braarudgt. 6b -
 * Åsheim». Den vises derfor som «Sted», ikke som «Adresse».
 */
const WFS = "https://wfs.geonorge.no/skwms1/wfs.tilfluktsrom_offentlige";
const TYPENAME = "Tilfluktsrom";
const DATASETT = "https://kartkatalog.geonorge.no/metadata/tilfluktsrom-offentlige/dbae9aae-10e7-4b75-8d67-7f0e8828f3d8";

export class DsbTilfluktsromProvider implements AreaFeatureProvider {
  readonly id = "dsb-tilfluktsrom";
  readonly name = "Offentlige tilfluktsrom";
  readonly owner = "Direktoratet for samfunnssikkerhet og beredskap";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD)", url: "https://data.norge.no/nlod/no/1.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = DEFAULT_RETRY_POLICY,
  ) {}

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    for await (const features of wfsPages({
      baseUrl: WFS,
      typeName: TYPENAME,
      signal: options.signal,
      retry: this.retry,
    })) {
      yield { features, documents: [] };
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];

    for (const feature of batch.features as GmlFeature[]) {
      const lokalId = nested(feature, "identifikasjon", "Identifikasjon", "lokalId") ?? nested(feature, "lokalId");
      const punkt = gmlPoint(feature, "posisjon");
      const romnr = asNumber(feature.romnr);
      const sted = nested(feature, "adresse");

      if (!lokalId || !punkt) {
        rejected.push({ kind: "feature", externalId: lokalId, reason: "mangler lokalId eller posisjon" });
        continue;
      }

      // Antall plasser er kildens dimensjonering. 0 betyr at tallet ikke er satt, ikke at
      // rommet er fullt — da viser vi det ikke i det hele tatt.
      const plasser = asNumber(feature.plasser);

      records.push({
        providerId: this.id,
        externalId: lokalId,
        category: "tilfluktsrom",
        subtype: "offentlig_tilfluktsrom",
        // Stedsbeskrivelsen er det eneste navnet kilden har. Uten den bruker vi romnummeret.
        title: sted ?? (romnr !== null ? `Tilfluktsrom ${romnr}` : "Offentlig tilfluktsrom"),
        geometry: { type: "Point", coordinates: punkt },
        attributes: {
          sted,
          romnummer: romnr,
          plasser: plasser !== null && plasser > 0 ? plasser : null,
        },
        sourceUrl: DATASETT,
        sourceUrlType: "provider_page",
        sourceUpdatedAt: uttaksdato(nested(feature, "datauttaksdato")),
      });
    }

    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      let antall = 0;
      for await (const side of wfsPages({ baseUrl: WFS, typeName: TYPENAME, retry: this.retry })) antall += side.length;
      return {
        ok: antall > 0,
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        message: `${antall} offentlige tilfluktsrom`,
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

/** Kilden oppgir når uttrekket ble tatt, ikke når rommet ble endret. */
function uttaksdato(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
