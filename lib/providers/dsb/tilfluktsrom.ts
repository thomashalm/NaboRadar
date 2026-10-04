import { utm33ToWgs84Exact } from "@/lib/geo/utm";
import { asNumber, gmlFeatureMembers, nested, type GmlFeature } from "@/lib/providers/gml";
import type {
  AreaFeatureProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "@/lib/providers/types";
import { readZipMember } from "@/lib/providers/zip-range";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";

/**
 * Offentlige tilfluktsrom, fra Sivilforsvaret/DSB via Geonorges nedlastingstjeneste.
 *
 * Datasettet heter «Tilfluktsrom - Offentlige», og det er hele avgrensningen: private
 * tilfluktsrom publiseres ikke av DSB. Vi filtrerer altså ikke på offentlig/privat — vi henter
 * fra det datasettet som er offentlig, og importerer ingenting annet.
 *
 * KILDE: den landsdekkende nedlastingsfila, ikke WFS-en.
 *
 * Fram til 2026-10-04 leste syncen `wfs.geonorge.no/skwms1/wfs.tilfluktsrom_offentlige`. Den
 * svarte HTTP 500 fra slutten av september («Connect to rin-ap2261:8081 timed out»), og syncen
 * sto fra 2026-09-26. Nedlastingsfila er samme datasett fra samme utgiver, lagt ut som en ferdig
 * fil, og er distribusjonen datasettets metadata peker på
 * («Geonorge nedlastning»). Den står også i datasettets ATOM-feed. Ved byttet var alle 556 rom
 * identiske med det WFS-en sist ga. Se docs/research/tilfluktsrom-naermeste-rom.md.
 *
 * Det finnes ingen reserve mot WFS-en. To kilder som kan skrive til samme datasett gir to sett
 * feil å forstå, og en fil som svarer er bedre enn en tjeneste som kanskje gjør det.
 *
 * FILEN ER ET KOMPLETT UTTREKK, og behandles som det: den valideres før noe skrives
 * (`lesUttrekk`). En tom fil, en fil uten nøkkelfeltene eller en fil i et annet koordinatsystem
 * er en feil — ikke «0 rom». Da kastes det, kjøringen feiler, og ingenting skrives eller
 * markeres som fjernet. Rom som mangler i et gyldig uttrekk markeres som fjernet av den vanlige
 * avstemmingen, som stopper selv hvis antallet faller mer enn 30 % (lib/sync/guards.ts).
 *
 * Kilden gir fire opplysninger om rommet: romnummer, antall plasser, en stedsbeskrivelse og et
 * punkt. Den gir **ikke** areal, type, status eller kommune, og vi later ikke som om den gjør det.
 *
 * `adresse` er ikke en ren adresse, men kildens egen stedsbeskrivelse — «Vestre Braarudgt. 6b -
 * Åsheim». Den vises derfor som «Sted», ikke som «Adresse».
 *
 * KOORDINATER: fila er i EUREF89 UTM sone 33 for hele landet, også Vestlandet og Finnmark. Den
 * regnes om med Krüger-rekkene (utm33ToWgs84Exact) — den korte rekkeutviklingen bommer med
 * inntil 42 m så langt fra sentralmeridianen. Resultatet avrundes til sju desimaler, samme
 * oppløsning som WFS-en ga, slik at samme fil alltid gir samme innholdshash.
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
 * `datauttaksdato` brukes ikke som `sourceUpdatedAt`. Den er tidspunktet uttrekket ble kjørt, og
 * sier ingenting om når rommet ble endret. Feltet inngår i innholdshashen, så å ta det med ville
 * gjort hver sync til 556 «updated» uten at noe var endret.
 */
export const TILFLUKTSROM_NEDLASTING =
  "https://nedlasting.geonorge.no/geonorge/Samfunnssikkerhet/TilfluktsromOffentlige/GML/" +
  "Samfunnssikkerhet_0000_Norge_25833_TilfluktsromOffentlige_GML.zip";
const TYPENAME = "Tilfluktsrom";
const SRS = "urn:ogc:def:crs:EPSG::25833";
const DATASETT = "https://kartkatalog.geonorge.no/metadata/tilfluktsrom-offentlige/dbae9aae-10e7-4b75-8d67-7f0e8828f3d8";

/** Feltene syncen bygger på. Mangler ett av dem i fila, har skjemaet endret seg. */
const NOEKKELFELT = ["romnr", "posisjon", "plasser", "adresse"] as const;
/** Andelen rom som må ha hvert nøkkelfelt. Enkeltrom uten romnr avvises for seg i normalize(). */
const MIN_FELTDEKNING = 0.9;
/** Rom som må ha gyldig romnummer og posisjon samtidig før uttrekket regnes som lesbart. */
const MIN_GYLDIGE = 0.9;

/** Fila lot seg ikke lese som et uttrekk av tilfluktsrom. Ingenting skal skrives. */
export class TilfluktsromSkjemaFeil extends Error {
  constructor(message: string) {
    super(`Tilfluktsrom-uttrekket er ikke gyldig: ${message}`);
    this.name = "TilfluktsromSkjemaFeil";
  }
}

/** UTM 33-posisjonen som `[easting, northing]`, eller null når den mangler eller er utenfor Norge. */
function utmPunkt(feature: GmlFeature): [number, number] | null {
  const pos = (feature.posisjon as { Point?: { pos?: unknown } } | undefined)?.Point?.pos;
  if (typeof pos !== "string") return null;
  const [easting, northing] = pos.trim().split(/\s+/).map(Number);
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) return null;
  // Fastlands-Norge i UTM 33. Fanger byttede akser og grader der det skulle stått meter.
  if (easting! < -200_000 || easting! > 1_200_000 || northing! < 6_400_000 || northing! > 8_000_000) return null;
  return [easting!, northing!];
}

/**
 * Leser og validerer uttrekket. Kaster hvis fila ikke er det vi forventer.
 *
 * Eksportert for test. Reglene er bevisst strenge: en fil vi ikke forstår skal stoppe syncen,
 * ikke tolkes som at rommene er borte.
 */
export function lesUttrekk(gml: string): GmlFeature[] {
  let features: GmlFeature[];
  try {
    features = gmlFeatureMembers(gml, TYPENAME);
  } catch {
    throw new TilfluktsromSkjemaFeil("fila er ikke lesbar XML");
  }
  if (features.length === 0) throw new TilfluktsromSkjemaFeil(`ingen <${TYPENAME}> i fila`);

  for (const felt of NOEKKELFELT) {
    const med = features.filter((f) => f[felt] !== undefined).length;
    if (med / features.length < MIN_FELTDEKNING) {
      throw new TilfluktsromSkjemaFeil(`feltet «${felt}» finnes i ${med} av ${features.length} rom`);
    }
  }

  const feilSrs = features.filter(
    (f) => (f.posisjon as { Point?: Record<string, unknown> } | undefined)?.Point?.["@srsName"] !== SRS,
  ).length;
  if (feilSrs > 0) throw new TilfluktsromSkjemaFeil(`${feilSrs} posisjoner er ikke i ${SRS}`);

  const gyldige = features.filter((f) => asNumber(f.romnr) !== null && utmPunkt(f) !== null).length;
  if (gyldige / features.length < MIN_GYLDIGE) {
    throw new TilfluktsromSkjemaFeil(`bare ${gyldige} av ${features.length} rom har gyldig romnummer og posisjon`);
  }
  return features;
}

const avrund7 = (n: number) => Math.round(n * 1e7) / 1e7;

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

  /** Laster ned fila og returnerer de validerte rommene. Kaster ved nedlastings- eller skjemafeil. */
  private async hentUttrekk(signal?: AbortSignal): Promise<GmlFeature[]> {
    const fil = await readZipMember(TILFLUKTSROM_NEDLASTING, (navn) => navn.toLowerCase().endsWith(".gml"), {
      retry: this.retry,
      signal,
      fetchImpl: this.fetchImpl,
    });
    if (!fil) throw new TilfluktsromSkjemaFeil("arkivet inneholder ingen GML-fil");
    return lesUttrekk(fil.text);
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    // Én ferdig validert bolk. Ingenting gis videre til skriving før hele fila er godkjent.
    yield { features: await this.hentUttrekk(options.signal), documents: [] };
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];

    for (const feature of batch.features as GmlFeature[]) {
      const lokalId = nested(feature, "identifikasjon", "Identifikasjon", "lokalId") ?? nested(feature, "lokalId");
      const utm = utmPunkt(feature);
      const punkt = utm ? (utm33ToWgs84Exact(utm).map(avrund7) as [number, number]) : null;
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

  /** Nedlasting og skjema i ett: fila hentes og valideres som ved sync, uten at noe skrives. */
  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const antall = (await this.hentUttrekk()).length;
      return {
        ok: true,
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        message: `${antall} offentlige tilfluktsrom i nedlastingsfila`,
      };
    } catch (error) {
      return {
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs: null,
        message: error instanceof TilfluktsromSkjemaFeil ? error.message : error instanceof Error ? error.name : "Ukjent feil",
      };
    }
  }
}
