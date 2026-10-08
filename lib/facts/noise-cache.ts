import type { Db } from "@/lib/db/types";
import type { AreaLookup, DetailedLookupOutcome, LookupContext, LookupHit } from "./lookups/types";

/**
 * Langlivet cache for strategisk støykartlegging, per søkepunkt.
 *
 * Strategiske støykart lages i runder på rundt fem år. Svaret for et punkt endrer seg ikke
 * mellom rundene, og kilden — Miljødirektoratets karttjeneste — er til tider svært treg. Derfor:
 *
 *   L1  minnecachen i lookup-runner (fem minutter, per serverinstans) — uendret
 *   L2  denne cachen, i databasen (90 dager)
 *   L3  Miljødirektoratet
 *
 * Reglene:
 * - **Bare gyldige svar lagres.** «Ingen treff» og «ikke dekket» er svar. En kildefeil er ikke
 *   et svar, lagres aldri, og kan derfor ikke overskrive et godt svar.
 * - **Ferskt svar (under 90 dager):** brukes, og kilden spørres ikke.
 * - **Gammelt eller manglende svar:** kilden spørres. Svarer den, oppdateres cachen.
 * - **Kilden feiler, og vi har et gammelt svar:** det gamle svaret vises, merket som sist
 *   tilgjengelige. Har vi ingenting, feiler oppslaget som før.
 * - **Kartleggingsår er ikke hentetidspunkt.** Vei gjelder situasjonen i 2022, bane 2017. Når
 *   NaboRadar hentet svaret, står for seg og gjør ikke dataene nyere.
 *
 * Cachen fylles bare når noen søker. Ingenting hentes på forhånd.
 */

/** Året støymodellen beskriver. Kilden: karttjenestens egen beskrivelse, lest 2026-10-08. */
export const NOISE_SOURCE_ROUND = { road: 2022, rail: 2017 } as const;

export const NOISE_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Hvor lenge kilden får på seg når vi allerede har et gammelt svar å falle tilbake på.
 *
 * Uten cache gjelder oppslagets vanlige grenser (6 s per kall, 8 s for hele runden). Med et
 * gammelt svar i hånden er det ingen grunn til å la brukeren vente like lenge på en kilde som
 * erfaringsmessig enten svarer raskt eller ikke i det hele tatt.
 */
export const NOISE_REFRESH_TIMEOUT_MS = 3_000;

export type NoiseState = "hit" | "no_hit" | "not_covered";
export type NoiseCoverage = "by" | "hoved" | "ingen";

/** Intervallet slik oppslaget tolket det. Samme felt som treffets attributter. */
export interface NoiseBand {
  niva: string;
  nedre: number;
  ovre: number | null;
  byomrade: boolean;
}

/** Det som lagres for ett punkt: vei og bane hver for seg, med hver sin kartleggingsrunde. */
export interface NoiseSnapshot {
  roadState: NoiseState;
  railState: NoiseState;
  roadCoverage: NoiseCoverage;
  railCoverage: NoiseCoverage;
  roadResult: NoiseBand | null;
  railResult: NoiseBand | null;
  sourceRoundRoad: number;
  sourceRoundRail: number;
}

export interface NoiseCacheRow extends NoiseSnapshot {
  key: string;
  /** Når NaboRadar hentet svaret fra kilden. */
  fetchedAt: string;
}

/**
 * Cachenøkkelen: bredde og lengde med fem desimaler — «59.96646,10.74715».
 *
 * Fem desimaler er rundt 1,1 m nord–sør og 0,5 m øst–vest. Det er samme avrunding som /omrade
 * gjør på koordinatene før noe oppslag kjøres, så nøkkelen er nøyaktig punktet kilden ble spurt
 * om: samme søkepunkt gir samme nøkkel, og cachen kan aldri gi et annet svar enn et nytt oppslag
 * ville gitt. Grovere avrunding ville slått sammen nabobygg — støybåndene langs en boliggate er
 * 5–20 m brede, og Langmyrgrenda 26 og 26C (26 m fra hverandre) har ulikt svar.
 */
export function noiseCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

const STATUS = "stoy_strategisk_status";
const VEG = "stoy_strategisk_veg";
const BANE = "stoy_strategisk_bane";
const DEKNING: readonly string[] = ["by", "hoved", "ingen"];

function band(hit: LookupHit | undefined): NoiseBand | null {
  if (!hit) return null;
  const a = hit.attributes;
  if (typeof a.niva !== "string" || typeof a.nedre !== "number") return null;
  return {
    niva: a.niva,
    nedre: a.nedre,
    ovre: typeof a.ovre === "number" ? a.ovre : null,
    byomrade: a.byomrade === true,
  };
}

/**
 * Oppslagets svar som en rad. Returnerer null når svaret ikke lar seg lagre uten å miste noe —
 * da lagres ingenting, og neste søk spør kilden på nytt.
 *
 * Dekningen står i statusen, som bare sendes når en kilde er uten treff. Har alle dekkede
 * kilder treff, finnes ingen status, og dekningen utledes av treffet (storbylaget er «by»).
 */
export function snapshotFromHits(hits: readonly LookupHit[]): NoiseSnapshot | null {
  const veg = hits.find((h) => h.subtype === VEG);
  const bane = hits.find((h) => h.subtype === BANE);
  const status = hits.find((h) => h.subtype === STATUS);
  if (hits.some((h) => ![VEG, BANE, STATUS].includes(h.subtype))) return null;

  const vegBand = band(veg);
  const baneBand = band(bane);
  if ((veg && !vegBand) || (bane && !baneBand)) return null;

  // Står statusen i svaret, er dekningen den kilden selv oppga. Uten status har alle dekkede
  // kilder treff, og dekningen brukes ikke til noe — den utledes da av treffet.
  const dekning = (kilde: "veg" | "bane", treff: NoiseBand | null): NoiseCoverage | null => {
    const verdi = status?.attributes[`${kilde}Dekning`];
    if (typeof verdi === "string" && DEKNING.includes(verdi)) return verdi as NoiseCoverage;
    return treff ? (treff.byomrade ? "by" : "hoved") : null;
  };
  const roadCoverage = dekning("veg", vegBand);
  const railCoverage = dekning("bane", baneBand);
  // Uten treff og uten status vet vi ikke om stedet er dekket. Det skal ikke gjettes.
  if (!roadCoverage || !railCoverage) return null;

  const state = (treff: NoiseBand | null, coverage: NoiseCoverage): NoiseState =>
    treff ? "hit" : coverage === "ingen" ? "not_covered" : "no_hit";

  return {
    roadState: state(vegBand, roadCoverage),
    railState: state(baneBand, railCoverage),
    roadCoverage,
    railCoverage,
    roadResult: vegBand,
    railResult: baneBand,
    sourceRoundRoad: NOISE_SOURCE_ROUND.road,
    sourceRoundRail: NOISE_SOURCE_ROUND.rail,
  };
}

/**
 * Raden som oppslagssvar — de samme treffene et nytt oppslag ville gitt, i samme rekkefølge.
 * Statusen tas med etter samme regel som i oppslaget (lib/facts/lookups/stoy.ts).
 */
export function hitsFromSnapshot(snapshot: NoiseSnapshot): LookupHit[] {
  const hits: LookupHit[] = [];
  const treff = (subtype: string, title: string, b: NoiseBand, aar: number): LookupHit => ({
    subtype,
    title,
    attributes: { niva: b.niva, nedre: b.nedre, ovre: b.ovre, byomrade: b.byomrade, enhet: "Lden", kartlagtAar: aar },
    distanceM: 0,
    contains: true,
  });
  if (snapshot.roadResult) hits.push(treff(VEG, "Beregnet veitrafikkstøy", snapshot.roadResult, snapshot.sourceRoundRoad));
  if (snapshot.railResult) hits.push(treff(BANE, "Beregnet banestøy", snapshot.railResult, snapshot.sourceRoundRail));

  const vegTreff = snapshot.roadState === "hit";
  const baneTreff = snapshot.railState === "hit";
  const dekketUtenTreff = snapshot.roadState === "no_hit" || snapshot.railState === "no_hit";
  const ingenDekning = snapshot.roadState === "not_covered" && snapshot.railState === "not_covered";
  if (dekketUtenTreff || ingenDekning) {
    hits.push({
      subtype: STATUS,
      title: "Strategisk støykartlegging",
      attributes: {
        vegDekning: snapshot.roadCoverage,
        baneDekning: snapshot.railCoverage,
        vegTreff,
        baneTreff,
      },
      distanceM: 0,
      contains: true,
    });
  }
  return hits;
}

/** Ferskt: under 90 dager gammelt, og fra de kartleggingsrundene koden kjenner nå. */
export function isFresh(row: Pick<NoiseCacheRow, "fetchedAt" | "sourceRoundRoad" | "sourceRoundRail">, now: number): boolean {
  const alder = now - new Date(row.fetchedAt).getTime();
  return (
    Number.isFinite(alder) &&
    alder < NOISE_CACHE_TTL_MS &&
    row.sourceRoundRoad === NOISE_SOURCE_ROUND.road &&
    row.sourceRoundRail === NOISE_SOURCE_ROUND.rail
  );
}

// ---------------------------------------------------------------------------------------------
// Lagring
// ---------------------------------------------------------------------------------------------

export interface NoiseCacheStore {
  get(key: string): Promise<NoiseCacheRow | null>;
  /** Lagrer et gyldig svar. Returnerer hentetidspunktet, eller null når lagring ikke er satt opp. */
  put(key: string, lat: number, lng: number, snapshot: NoiseSnapshot): Promise<string | null>;
}

interface DbRow {
  cache_key: string;
  road_state: NoiseState;
  rail_state: NoiseState;
  road_coverage: NoiseCoverage;
  rail_coverage: NoiseCoverage;
  road_result: NoiseBand | null;
  rail_result: NoiseBand | null;
  source_round_road: number;
  source_round_rail: number;
  fetched_at: string;
}

/**
 * Cachen i databasen. Lesing går med den vanlige lesetilgangen. Skriving krever
 * NOISE_CACHE_WRITE_TOKEN — en egen nøkkel som bare kan skrive støycache-rader (se migrasjon
 * 20261114000000). Uten token leses cachen fortsatt, men ingenting lagres.
 */
export function createDbNoiseCacheStore(getDb: () => Promise<Db | null>, token: string | undefined): NoiseCacheStore {
  return {
    async get(key) {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db.rpc<DbRow>("noise_cache_get", { p_key: key });
      if (!row) return null;
      return {
        key: row.cache_key,
        roadState: row.road_state,
        railState: row.rail_state,
        roadCoverage: row.road_coverage,
        railCoverage: row.rail_coverage,
        roadResult: row.road_result,
        railResult: row.rail_result,
        sourceRoundRoad: row.source_round_road,
        sourceRoundRail: row.source_round_rail,
        fetchedAt: new Date(row.fetched_at).toISOString(),
      };
    },
    async put(key, lat, lng, s) {
      if (!token) return null;
      const db = await getDb();
      if (!db) return null;
      const [fetchedAt] = await db.rpc<string | { noise_cache_put: string }>("noise_cache_put", {
        p_token: token,
        p_key: key,
        p_latitude: Number(lat.toFixed(5)),
        p_longitude: Number(lng.toFixed(5)),
        p_road_state: s.roadState,
        p_rail_state: s.railState,
        p_road_coverage: s.roadCoverage,
        p_rail_coverage: s.railCoverage,
        p_road_result: s.roadResult,
        p_rail_result: s.railResult,
        p_source_round_road: s.sourceRoundRoad,
        p_source_round_rail: s.sourceRoundRail,
      });
      const verdi = typeof fetchedAt === "object" && fetchedAt !== null ? fetchedAt.noise_cache_put : fetchedAt;
      return verdi ? new Date(verdi).toISOString() : null;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Oppslaget med cache
// ---------------------------------------------------------------------------------------------

/**
 * Strategisk støykartlegging med databasecache foran.
 *
 * Pakker inn det vanlige oppslaget og endrer ingenting ved hva det svarer: terskler, intervaller
 * og dekning tolkes der. Her avgjøres bare *om* kilden må spørres, og hva som skjer når den ikke
 * svarer.
 *
 * Cachen selv får aldri velte et søk. Feiler lesingen, spørres kilden som før. Feiler
 * skrivingen, returneres svaret likevel.
 */
export class CachedNoiseLookup implements AreaLookup {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly category: AreaLookup["category"];

  constructor(
    private readonly inner: AreaLookup,
    private readonly store: NoiseCacheStore,
    private readonly options: { now?: () => number; refreshTimeoutMs?: number } = {},
  ) {
    this.id = inner.id;
    this.name = inner.name;
    this.owner = inner.owner;
    this.category = inner.category;
  }

  async run(context: LookupContext): Promise<LookupHit[]> {
    return (await this.runDetailed(context)).hits;
  }

  async runDetailed(context: LookupContext): Promise<DetailedLookupOutcome> {
    const now = this.options.now ?? Date.now;
    const key = noiseCacheKey(context.lat, context.lng);

    let cached: NoiseCacheRow | null = null;
    try {
      cached = await this.store.get(key);
    } catch (error) {
      console.warn(`[stoy-cache] lesing feilet: ${error instanceof Error ? error.message.slice(0, 120) : "ukjent"}`);
    }

    if (cached && isFresh(cached, now())) {
      return { hits: hitsFromSnapshot(cached), fetchedAt: cached.fetchedAt, origin: "cache" };
    }
    // Kilden feilet nettopp. Vi spør den ikke igjen nå, men har vi et svar lagret, vises det.
    if (context.skipSource) {
      if (cached) return { hits: hitsFromSnapshot(cached), fetchedAt: cached.fetchedAt, origin: "stale-cache" };
      throw new Error("kilden har pause, og ingenting er lagret for punktet");
    }

    let hits: LookupHit[];
    try {
      // Med et gammelt svar i hånden får kilden kortere tid på seg.
      const signal = cached
        ? AbortSignal.any([
            ...(context.signal ? [context.signal] : []),
            AbortSignal.timeout(this.options.refreshTimeoutMs ?? NOISE_REFRESH_TIMEOUT_MS),
          ])
        : context.signal;
      hits = await this.inner.run({ ...context, signal });
    } catch (error) {
      // Kildefeil. Det gamle svaret er fortsatt et gyldig svar, og det røres ikke.
      if (cached) return { hits: hitsFromSnapshot(cached), fetchedAt: cached.fetchedAt, origin: "stale-cache" };
      throw error;
    }

    const snapshot = snapshotFromHits(hits);
    let fetchedAt = new Date(now()).toISOString();
    if (snapshot) {
      try {
        fetchedAt = (await this.store.put(key, context.lat, context.lng, snapshot)) ?? fetchedAt;
      } catch (error) {
        console.warn(`[stoy-cache] lagring feilet: ${error instanceof Error ? error.message.slice(0, 120) : "ukjent"}`);
      }
    }
    return { hits, fetchedAt, origin: "source" };
  }
}
