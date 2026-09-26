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
 *
 * IDENTITET: `romnr`, ikke `lokalId`.
 *
 * `lokalId` ser ut som en varig UUID, men DSB genererer den på nytt for hvert uttrekk. To uttrekk
 * et døgn fra hverandre hadde 0 av 556 ID-er felles, mens `romnr` hadde 556 av 556 — og
 * koordinatene var identiske til sju desimaler. Med `lokalId` som nøkkel ble derfor alle 556 rom
 * opprettet på nytt, og de 556 gamle markert som fjernet, ved hver full sync.
 *
 * `romnr` er Sivilforsvarets eget romnummer, unikt på alle 556 i uttrekket. Adresse og koordinat
 * ble vurdert og forkastet: tre stedsbeskrivelser brukes av flere rom, fire koordinater deles av
 * to rom hver, og to par — romnr 2127/2128 på «TANGVALL» og 9983/17676 på «Tjørnahaugane 60» —
 * deler *både* adresse og koordinat. En nøkkel av de feltene ville slått sammen reelle rom.
 *
 * `datauttaksdato` brukes ikke som `sourceUpdatedAt`. Den er tidspunktet uttrekket ble kjørt, med
 * millisekunder, og sier ingenting om når rommet ble endret. Feltet inngår i innholdshashen, så å
 * ta det med ville gjort hver sync til 556 «updated» uten at noe var endret.
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
      fetchImpl: this.fetchImpl,
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

      /*
       * Uten romnummer har rommet ingen stabil identitet, og vi avviser det framfor å finne på
       * en. Å falle tilbake på lokalId ville gjenskapt ID-churnen, og en nøkkel av adresse og
       * koordinat ville slått sammen rom som faktisk er forskjellige. Et avvist rom blir synlig
       * i kjøringens `rejected`, som er der et datakvalitetsproblem hører.
       */
      if (romnr === null || !punkt) {
        rejected.push({
          kind: "feature",
          externalId: lokalId,
          reason: romnr === null ? "mangler romnr (stabil identitet)" : "mangler posisjon",
        });
        continue;
      }

      // Antall plasser er kildens dimensjonering. 0 betyr at tallet ikke er satt, ikke at
      // rommet er fullt — da viser vi det ikke i det hele tatt.
      const plasser = asNumber(feature.plasser);

      records.push({
        providerId: this.id,
        externalId: String(romnr),
        category: "tilfluktsrom",
        subtype: "offentlig_tilfluktsrom",
        // Stedsbeskrivelsen er det eneste navnet kilden har. Uten den bruker vi romnummeret.
        title: sted ?? `Tilfluktsrom ${romnr}`,
        geometry: { type: "Point", coordinates: punkt },
        attributes: {
          sted,
          romnummer: romnr,
          plasser: plasser !== null && plasser > 0 ? plasser : null,
        },
        sourceUrl: DATASETT,
        sourceUrlType: "provider_page",
        // Se kommentaren øverst: kilden har ingen endringsdato, bare uttrekkstidspunkt.
        sourceUpdatedAt: null,
      });
    }

    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      let antall = 0;
      for await (const side of wfsPages({
        baseUrl: WFS,
        typeName: TYPENAME,
        retry: this.retry,
        fetchImpl: this.fetchImpl,
      })) {
        antall += side.length;
      }
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
