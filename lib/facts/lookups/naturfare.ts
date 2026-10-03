import { ArcgisClient } from "@/lib/providers/arcgis";
import type { AreaLookup, LookupContext, LookupHit } from "./types";
import { wmsPunktoppslag } from "./wms";

/**
 * Naturfare rundt en adresse: flom, skred, radon og stormflo.
 *
 * ALLE FIRE ER DIREKTE OPPSLAG, ikke providere. Grunnen er den samme for hver av dem: det er
 * landsdekkende polygonlag med hundretusener av flater, og spørsmålet er «ligger denne adressen
 * innenfor?». Å kopiere Norges flomsoner, skredaktsomhet og radonaktsomhet inn i Supabase ville
 * gitt oss vedlikehold og lagring uten å svare bedre på det spørsmålet. Samme vurdering som for
 * aktsomhetsområdet for kvikkleire, som lå her fra før.
 *
 * DET VIKTIGSTE SKILLET: aktsomhet er ikke fare.
 *
 *   * Et **aktsomhetsområde** er et landsdekkende screeningkart, laget av terrengmodell og
 *     løsmassekart. Et treff betyr «her bør forholdene undersøkes nærmere», ikke at noe vil skje.
 *   * En **kartlagt faresone** eller **flomsone** er en detaljert utredning på et utvalgt sted,
 *     med gjentaksintervall. Den finnes bare der NVE har kartlagt, og er et sterkere signal.
 *
 * Derfor spør hvert oppslag alltid også om **dekning**: ligger punktet i det hele tatt innenfor
 * området kilden har kartlagt? Uten det ville «ingen treff» blitt lest som «ingen fare», og det er
 * den samme feilen som å lese fravær i et register som fravær i virkeligheten.
 */

/** Kortere budsjett enn sync: brukeren venter. Oppslagene kjøres parallelt av runLookups(). */
const LOOKUP_RETRY = { timeoutMs: 5_000, maxRetries: 1, baseDelayMs: 200 };

const FLOMSONER = "https://kart.nve.no/enterprise/rest/services/Flomsoner2/MapServer";
const FLOMAKTSOMHET = "https://kart.nve.no/enterprise/rest/services/Flomaktsomhet/MapServer";
const JORDFLOMSKRED = "https://kart.nve.no/enterprise/rest/services/JordFlomskredAktsomhet/MapServer";
const SNOSTEIN = "https://kart.nve.no/enterprise/rest/services/SkredSnoSteinAkt/MapServer";
const SKREDFARESONER = "https://kart.nve.no/enterprise/rest/services/Skredfaresoner3/MapServer";
/** Karttjenesten bak geo.ngu.no/kart/radon — det radonkartet NGU publiserer til publikum. */
const RADON_WMS = "https://geo.ngu.no/mapserver/RadonWMS2";
const RADON_LAG = "Radon_aktsomhet";
/**
 * WMS-en bak Kartverkets «Se havnivå i kart» (kartverket.no/til-sjos/se-havniva/kart). Fram til
 * 2026-10-03 brukte vi WFS-en `wfs.stormflo_havniva`; se ADR 015 og
 * docs/research/stormflo-flystoy-kildegjennomgang.md for hvorfor den ble byttet.
 */
const STORMFLO_WMS = "https://wms.geonorge.no/skwms1/wms.stormflo_havniva";

/**
 * Flomsonelagene, ett per gjentaksintervall.
 *
 * Lag 0 er analyseområdet — NVEs egen dekning. Vi leser gjentaksintervallet av lagnavnet og ikke
 * av attributtet `gjentaksinterval`, fordi attributtet er 0 på enkelte rader i samme lag.
 */
const FLOMSONE_LAG: Record<number, { ar: number; klima: boolean }> = {
  13: { ar: 10, klima: false },
  14: { ar: 20, klima: false },
  15: { ar: 50, klima: false },
  16: { ar: 100, klima: false },
  17: { ar: 200, klima: false },
  18: { ar: 500, klima: false },
  19: { ar: 1000, klima: false },
  20: { ar: 20, klima: true },
  21: { ar: 200, klima: true },
  22: { ar: 1000, klima: true },
};
const FLOMSONE_DEKNING_LAG = 0;

/** Polygonlaget for jord- og flomskred. Lag 0 i samme tjeneste er et oversiktslag uten geometri. */
const JORDFLOMSKRED_LAG = 1;

interface FaresoneLag {
  ar: number;
  /** Skredtypen laget gjelder, eller null for de samlede sonene. */
  type: string | null;
}

/**
 * Faresonelagene i Skredfaresoner3.
 *
 * Tallet i lagnavnet er gjentaksintervallet: 100 betyr en årlig sannsynlighet på 1/100. Gruppelagene
 * («Skredfaresoner_Samlet», «Skredfaresoner_Snoskred» …) har ingen geometri og kan ikke spørres —
 * det er barnelagene under dem som har flatene.
 */
const FARESONE_LAG: Record<number, FaresoneLag> = {
  6: { ar: 100, type: null },
  7: { ar: 1000, type: null },
  8: { ar: 5000, type: null },
  10: { ar: 100, type: "jord- og flomskred" },
  14: { ar: 100, type: "sørpeskred" },
  18: { ar: 100, type: "snøskred" },
  22: { ar: 100, type: "steinskred" },
};
const FARESONE_DEKNING_LAG = 0;

/**
 * Flom: kartlagt flomsone først, ellers nasjonal flomaktsomhet.
 *
 * To forespørsler, ikke tolv: én `identify` dekker alle flomsonelagene, og én dekker
 * aktsomhetskartet med sitt eget dekningslag.
 */
export class NveFlomLookup implements AreaLookup {
  readonly id = "nve-flom";
  readonly name = "Flomsoner og flomaktsomhet";
  readonly owner = "Norges vassdrags- og energidirektorat";
  readonly category = "grunnforhold" as const;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.client = new ArcgisClient(fetchImpl, LOOKUP_RETRY);
  }

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    const [soner, aktsomhet] = await Promise.all([
      this.client.identify(FLOMSONER, [FLOMSONE_DEKNING_LAG, ...Object.keys(FLOMSONE_LAG).map(Number)], { lat, lng, signal }),
      this.client.identify(FLOMAKTSOMHET, [1, 2], { lat, lng, signal }),
    ]);

    const hits: LookupHit[] = [];

    const iAnalyseomrade = soner.some((r) => r.layerId === FLOMSONE_DEKNING_LAG);
    const traff = soner.filter((r) => FLOMSONE_LAG[r.layerId] !== undefined).map((r) => FLOMSONE_LAG[r.layerId]!);
    const utenKlima = traff.filter((t) => !t.klima).map((t) => t.ar);
    const medKlima = traff.filter((t) => t.klima).map((t) => t.ar);

    if (utenKlima.length > 0 || medKlima.length > 0) {
      /*
       * Ligger punktet i flere soner, er den *minste* gjentaksperioden den strengeste: en
       * 20-årsflom skjer oftere enn en 200-årsflom, og arealet er da med i begge.
       */
      const minste = Math.min(...(utenKlima.length > 0 ? utenKlima : medKlima));
      hits.push({
        subtype: "flom_sone",
        title: "Kartlagt flomsone",
        attributes: {
          gjentaksintervallAr: minste,
          alleIntervaller: utenKlima.length > 0 ? utenKlima.sort((a, b) => a - b).join(", ") : null,
          klimaIntervaller: medKlima.length > 0 ? medKlima.sort((a, b) => a - b).join(", ") : null,
        },
        distanceM: 0,
        contains: true,
      });
    } else if (iAnalyseomrade) {
      // Kartlagt, men utenfor sonene. Det er en opplysning, ikke et tomt svar.
      hits.push({
        subtype: "flom_utenfor_sone",
        title: "Utenfor kartlagt flomsone",
        attributes: {},
        distanceM: null,
        contains: false,
      });
    }

    // Aktsomhetskartet er landsdekkende, men har eget dekningslag. Uten dekning sier vi ingenting.
    const harAktsomhetsdekning = aktsomhet.some((r) => r.layerId === 2);
    const iAktsomhet = aktsomhet.some((r) => r.layerId === 1);
    if (iAktsomhet && harAktsomhetsdekning) {
      hits.push({
        subtype: "flom_aktsomhet",
        title: "Aktsomhetsområde for flom",
        attributes: {},
        distanceM: 0,
        contains: true,
      });
    }

    return hits;
  }
}

/**
 * Skred: kartlagt faresone først, deretter aktsomhetsområdene.
 *
 * Tre tjenester, tre forespørsler. Faresonene (Skredfaresoner3) finnes bare der NVE har utredet,
 * og er det sterkeste signalet. Aktsomhetskartene for jord- og flomskred og for snø- og steinskred
 * er landsdekkende screening.
 */
export class NveSkredLookup implements AreaLookup {
  readonly id = "nve-skred";
  readonly name = "Skredfaresoner og aktsomhetsområder for skred";
  readonly owner = "Norges vassdrags- og energidirektorat";
  readonly category = "grunnforhold" as const;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.client = new ArcgisClient(fetchImpl, LOOKUP_RETRY);
  }

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    const [faresoner, jordFlom, snoStein] = await Promise.all([
      this.client.identify(SKREDFARESONER, [FARESONE_DEKNING_LAG, ...Object.keys(FARESONE_LAG).map(Number)], {
        lat,
        lng,
        signal,
      }),
      // Lag 1 er polygonlaget med de 503 461 aktsomhetsområdene. Lag 0 er et rasterisert
      // oversiktslag uten geometritype, og `identify` mot det ga treff overalt — også på flat
      // bygrunn i Oslo og Lillestrøm. Det ble oppdaget i QA mot ekte adresser.
      this.client.identify(JORDFLOMSKRED, [JORDFLOMSKRED_LAG], { lat, lng, signal }),
      // Lag 0 = aktsomhetsområde, lag 1 = kartlagt område (dekning).
      this.client.identify(SNOSTEIN, [0, 1], { lat, lng, signal }),
    ]);

    const hits: LookupHit[] = [];

    const faresonetreff = faresoner.map((r) => FARESONE_LAG[r.layerId]).filter((v): v is FaresoneLag => v !== undefined);
    if (faresonetreff.length > 0) {
      /*
       * Strengeste nivå er det med lavest gjentaksintervall: en sone for 1/100 per år treffer
       * oftere enn 1/5000. Skredtypene tas fra de typespesifikke lagene — «Samlet» er et
       * gruppelag uten geometri, og «Dimensjonerende_skredtype» er et punktlag som sjelden
       * treffer et adressepunkt.
       */
      const nivaer = faresonetreff.map((f) => f.ar);
      const typer = [...new Set(faresonetreff.map((f) => f.type).filter((v): v is string => v !== null))];
      hits.push({
        subtype: "skred_faresone",
        title: "Kartlagt skredfaresone",
        attributes: {
          gjentaksintervallAr: Math.min(...nivaer),
          skredtyper: typer.length > 0 ? typer.join(", ") : null,
        },
        distanceM: 0,
        contains: true,
      });
    }

    if (jordFlom.some((r) => r.layerId === JORDFLOMSKRED_LAG)) {
      hits.push({
        subtype: "skred_jord_flom_aktsomhet",
        title: "Aktsomhetsområde for jord- og flomskred",
        attributes: {},
        distanceM: 0,
        contains: true,
      });
    }

    // Snø og stein er ett felles aktsomhetskart hos NVE, og skilles ikke her.
    if (snoStein.some((r) => r.layerId === 0) && snoStein.some((r) => r.layerId === 1)) {
      hits.push({
        subtype: "skred_sno_stein_aktsomhet",
        title: "Aktsomhetsområde for snø- og steinskred",
        attributes: {},
        distanceM: 0,
        contains: true,
      });
    }

    return hits;
  }
}

/**
 * Kildens fire klasser, slik `aktsomhetgrad` koder dem i det publiserte kartet.
 *
 * Vi nøkler på tallkoden og ikke på `aktsomhetgrad_besk`, fordi tallet er det feltet som styrer
 * fargen i NGUs egen legend. Teksten leses likevel ut og sammenlignes, slik at en omskriving hos
 * NGU blir synlig som et avvik i stedet for å passere stille.
 */
const RADONKLASSER: Record<string, { nokkel: string; kildetekst: string }> = {
  "0": { nokkel: "usikker", kildetekst: "Usikker aktsomhet" },
  "1": { nokkel: "moderatTilLav", kildetekst: "Moderat til lav aktsomhet" },
  "2": { nokkel: "høy", kildetekst: "Høy aktsomhet" },
  "3": { nokkel: "særligHøy", kildetekst: "Særlig høy aktsomhet" },
};

/**
 * Radonaktsomhet (NGU og DSA) — **det kartet NGU publiserer til publikum**.
 *
 * Kilden er `RadonWMS2`, laget `Radon_aktsomhet`: nøyaktig den tjenesten geo.ngu.no/kart/radon
 * tegner, med de fire klassene særlig høy / høy / moderat til lav / usikker.
 *
 * VALGET AV KILDE ER BEVISST, og det er ikke det nyeste endepunktet. NGU har også publisert en
 * «versjon 2» av datasettet (OGC API Features + RadonUranAktsomhetWMS, september 2026) med fem
 * andre klasser. Den klassifiserer mange adresser høyere: på et testsett på 40 steder over hele
 * landet ga de to produktene ulik klasse i 40 av 40 tilfeller. Så lenge NGU selv sender publikum
 * til 2014-kartet, er det dette svaret en bruker kan etterprøve, og da er det dette vi viser.
 * Se «Flere versjoner av samme datasett» i håndboken.
 *
 * OPPSLAGET ER EKTE PUNKT-I-POLYGON. GetFeatureInfo spør «hvilken flate ligger dette punktet i»
 * og lar serveren avgjøre. En bbox-spørring gjør ikke det: den returnerer alt som *overlapper*
 * boksen, og nær en klassegrense ble feil flate valgt.
 *
 * Merk at dette er **modellert aktsomhet for området**, ikke en måling i boligen — den forskjellen
 * står i formuleringsregisteret, og den er ikke valgfri.
 */
export class NguRadonLookup implements AreaLookup {
  readonly id = "ngu-radon-aktsomhet";
  readonly name = "Nasjonalt aktsomhetskart for radon";
  readonly owner = "Norges geologiske undersøkelse";
  readonly category = "grunnforhold" as const;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    // CRS:84 og ikke EPSG:4326: i WMS 1.3.0 er akserekkefølgen for EPSG:4326 lat,lon, mens CRS:84
    // alltid er lon,lat. Begge svarer likt her, men CRS:84 kan ikke byttes om ved et uhell.
    const d = 0.00002;
    const params = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.3.0",
      REQUEST: "GetFeatureInfo",
      CRS: "CRS:84",
      LAYERS: RADON_LAG,
      QUERY_LAYERS: RADON_LAG,
      STYLES: "default",
      FORMAT: "image/png",
      INFO_FORMAT: "application/vnd.ogc.gml",
      // 3×3 piksler med I/J i midten: minste ramme som treffer punktet og ingenting rundt det.
      WIDTH: "3",
      HEIGHT: "3",
      I: "1",
      J: "1",
      BBOX: `${lng - d},${lat - d},${lng + d},${lat + d}`,
      FEATURE_COUNT: "1",
    });
    const gml = await fetchTekst(`${RADON_WMS}?${params.toString()}`, this.fetchImpl, signal);

    const kode = gml.match(/<aktsomhetgrad>\s*(\d+)\s*<\/aktsomhetgrad>/)?.[1];
    const klasse = kode !== undefined ? RADONKLASSER[kode] : undefined;
    // Ukjent kode er et signal om at kilden har endret seg, ikke noe vi skal gjette oss forbi.
    if (klasse === undefined) return [];

    return [
      {
        subtype: "radon_aktsomhet",
        title: "Radonaktsomhet",
        attributes: { aktsomhetsgrad: klasse.nokkel, kildetekst: klasse.kildetekst },
        distanceM: 0,
        contains: true,
        sourceUpdatedAt: null,
      },
    ];
  }
}

/**
 * Stormflo (Kartverket).
 *
 * Scenarioene er valgt for en boligkjøper, ikke for fullstendighet: 20 år (skjer ofte), 200 år
 * (nivået plan- og bygningsregelverket bruker for bolig) og 200 år med havnivå for 2100 (samme
 * hendelse senere i husets levetid) — sikkerhetsklasse F1 og F2 «Nå» og «2100» i Kartverkets
 * publikumskart. 1000-års og øvre estimat vises ikke; øvre estimat for 2150 brukes bare som port.
 *
 * Teknisk: ett `GetFeatureInfo`-kall mot WMS-en Kartverkets publikumskart bruker, med alle lagene
 * samtidig, i detaljmålestokk (se ./wms.ts). Lagnavnene er WMS-ens, ikke WFS-ens.
 */
const STORMFLO_SCENARIOER = [
  { lag: "stormflo20ar_klimaarna", ar: 20, klimaAr: null },
  { lag: "stormflo200ar_klimaarna", ar: 200, klimaAr: null },
  { lag: "stormflo200ar_klimaar2100", ar: 200, klimaAr: 2100 },
] as const;

/**
 * Det ytterste scenarioet kilden har, brukt som port for om adressen er i spill i det hele tatt.
 *
 * `dekningsomrade` dekker praktisk talt hele landet (også Elverum), og svarer dessuten bare i
 * oversiktsmålestokk. Treffer ikke øvre estimat for 2150 heller, ligger adressen for høyt eller
 * for langt fra sjøen, og da sier vi ingenting.
 */
const STORMFLO_YTTERSTE = "stormfloovreestimat_klimaar2150";

/**
 * Sjøen innenfor dagens middel høyvann. Stormfloflatene dekker også sjøen, så et punkt ute i
 * vannet treffer alle scenarier — også 20-års i dag. Det er ikke en landadresse som kan bli
 * oversvømt, og da sier vi ingenting om stormflo.
 */
const STORMFLO_SJO = "middelhoyvann_klimaarna";

export class KartverketStormfloLookup implements AreaLookup {
  readonly id = "kartverket-stormflo";
  readonly name = "Stormflo og havnivå";
  readonly owner = "Kartverket";
  readonly category = "grunnforhold" as const;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    // Kaster ved feil og ugyldig svar: da er kilden nede, ikke adressen trygg.
    const treff = await wmsPunktoppslag({
      url: STORMFLO_WMS,
      layers: [STORMFLO_SJO, STORMFLO_YTTERSTE, ...STORMFLO_SCENARIOER.map((s) => s.lag)],
      crs: "CRS:84",
      lat,
      lng,
      retry: LOOKUP_RETRY,
      signal,
      fetchImpl: this.fetchImpl,
    });

    // Punktet ligger i sjøen etter Kartverkets egen kystlinje.
    if (treff.has(STORMFLO_SJO)) return [];
    // Ikke engang det ytterste scenarioet treffer: adressen er ikke i spill. Ingen uttalelse.
    if (!treff.has(STORMFLO_YTTERSTE)) return [];

    const berort = STORMFLO_SCENARIOER.filter((s) => treff.has(s.lag));
    if (berort.length === 0) {
      return [
        {
          subtype: "stormflo_utenfor",
          title: "Ikke berørt av kartlagte stormflonivåer",
          attributes: {},
          distanceM: null,
          contains: false,
        },
      ];
    }

    // Laveste gjentaksintervall er det strengeste: det skjer oftest.
    const dagens = berort.filter((s) => s.klimaAr === null).map((s) => s.ar);
    const framtid = berort.filter((s) => s.klimaAr !== null).map((s) => s.ar);
    return [
      {
        subtype: "stormflo",
        title: "Innenfor område som kan bli berørt av stormflo",
        attributes: {
          gjentaksintervallAr: dagens.length > 0 ? Math.min(...dagens) : null,
          framtidigGjentaksintervallAr: framtid.length > 0 ? Math.min(...framtid) : null,
          framtidigAr: framtid.length > 0 ? 2100 : null,
        },
        distanceM: 0,
        contains: true,
      },
    ];
  }
}

/** GetFeatureInfo svarer med GML, ikke JSON. */
async function fetchTekst(url: string, fetchImpl: typeof fetch, signal?: AbortSignal): Promise<string> {
  const response = await fetchImpl(url, { signal, headers: { accept: "application/vnd.ogc.gml, text/xml" } });
  if (!response.ok) throw new Error(`${url} svarte ${response.status}`);
  return response.text();
}
