import { describe, expect, it, vi } from "vitest";
import { createLookupRunner } from "@/lib/facts/lookup-runner";
import type { AreaLookup, LookupContext, LookupHit } from "@/lib/facts/lookups/types";
import {
  CachedNoiseLookup,
  hitsFromSnapshot,
  isFresh,
  noiseCacheKey,
  NOISE_CACHE_TTL_MS,
  NOISE_SOURCE_ROUND,
  snapshotFromHits,
  type NoiseCacheRow,
  type NoiseCacheStore,
  type NoiseSnapshot,
} from "@/lib/facts/noise-cache";
import { describeFact, describeStaleSources, SOURCES } from "@/lib/facts/wording";

const DAG = 24 * 60 * 60 * 1000;
const NÅ = Date.parse("2026-10-08T10:00:00Z");
const PUNKT = { lat: 59.92852, lng: 10.71432, radiusM: 1000 };

const vegTreff: LookupHit = {
  subtype: "stoy_strategisk_veg",
  title: "Beregnet veitrafikkstøy",
  attributes: { niva: "60–64 dB", nedre: 60, ovre: 64, byomrade: true, enhet: "Lden", kartlagtAar: 2022 },
  distanceM: 0,
  contains: true,
};
const baneTreff: LookupHit = {
  subtype: "stoy_strategisk_bane",
  title: "Beregnet banestøy",
  attributes: { niva: "55–59 dB", nedre: 55, ovre: 59, byomrade: false, enhet: "Lden", kartlagtAar: 2017 },
  distanceM: 0,
  contains: true,
};
const status = (attributes: LookupHit["attributes"]): LookupHit => ({
  subtype: "stoy_strategisk_status",
  title: "Strategisk støykartlegging",
  attributes,
  distanceM: 0,
  contains: true,
});
/** Dekket av vei og bane i byområde, ingen treff: «lavt modellert støynivå». */
const INGEN_TREFF = [status({ vegDekning: "by", baneDekning: "by", vegTreff: false, baneTreff: false })];
/** Kartleggingen dekker ikke stedet. */
const IKKE_DEKKET = [status({ vegDekning: "ingen", baneDekning: "ingen", vegTreff: false, baneTreff: false })];
/** Vei med treff, bane dekket uten treff. */
const VEI_OG_LAV_BANE = [vegTreff, status({ vegDekning: "by", baneDekning: "by", vegTreff: true, baneTreff: false })];

function minne(): NoiseCacheStore & { rader: Map<string, NoiseCacheRow>; skrevet: number; tid: number } {
  const rader = new Map<string, NoiseCacheRow>();
  const store = {
    rader,
    skrevet: 0,
    tid: NÅ,
    async get(key: string) {
      return rader.get(key) ?? null;
    },
    async put(key: string, _lat: number, _lng: number, snapshot: NoiseSnapshot) {
      const fetchedAt = new Date(store.tid).toISOString();
      rader.set(key, { key, ...snapshot, fetchedAt });
      store.skrevet += 1;
      return fetchedAt;
    },
  };
  return store;
}

function kilde(svar: () => Promise<LookupHit[]>) {
  const run = vi.fn((_: LookupContext) => svar());
  const lookup: AreaLookup = { id: "mdir-stoy-strategisk", name: "Strategisk støykartlegging", owner: "Miljødirektoratet", category: "stoy", run };
  return { lookup, run };
}
const tidsavbrudd = () => Promise.reject(new Error("The operation was aborted due to timeout"));

describe("cachenøkkelen", () => {
  it("er den samme for samme søkepunkt", () => {
    expect(noiseCacheKey(59.92852, 10.71432)).toBe("59.92852,10.71432");
    expect(noiseCacheKey(59.928520000001, 10.714319999999)).toBe("59.92852,10.71432");
    expect(noiseCacheKey(60, 5.3)).toBe("60.00000,5.30000");
  });

  it("skiller nabobygg — Langmyrgrenda 26, 26B og 26C har ulike svar i kilden", () => {
    const nøkler = [
      noiseCacheKey(59.966229, 10.747226), // 26: Lden 50–54
      noiseCacheKey(59.966346, 10.747179), // 26B: Lden 50–54
      noiseCacheKey(59.966464, 10.747149), // 26C: ingen treff, 20 cm utenfor båndet
    ];
    expect(new Set(nøkler).size).toBe(3);
    // Også punkter én meter fra hverandre får hver sin rad.
    expect(noiseCacheKey(59.96646, 10.74715)).not.toBe(noiseCacheKey(59.96647, 10.74715));
  });
});

describe("svaret som rad, og tilbake", () => {
  it.each([
    ["vei og bane med treff", [vegTreff, baneTreff], { roadState: "hit", railState: "hit" }],
    ["dekket uten treff", INGEN_TREFF, { roadState: "no_hit", railState: "no_hit" }],
    ["ikke dekket", IKKE_DEKKET, { roadState: "not_covered", railState: "not_covered" }],
    ["vei med treff, bane lav", VEI_OG_LAV_BANE, { roadState: "hit", railState: "no_hit" }],
    [
      "bare vei dekket, uten treff",
      [status({ vegDekning: "hoved", baneDekning: "ingen", vegTreff: false, baneTreff: false })],
      { roadState: "no_hit", railState: "not_covered" },
    ],
  ])("%s gir nøyaktig de samme treffene igjen", (_navn, hits, forventet) => {
    const snapshot = snapshotFromHits(hits as LookupHit[]);
    expect(snapshot).toMatchObject(forventet);
    expect(hitsFromSnapshot(snapshot!)).toEqual(hits);
  });

  it("gir samme tekst fra cachen som fra kilden", () => {
    for (const hits of [[vegTreff, baneTreff], INGEN_TREFF, IKKE_DEKKET, VEI_OG_LAV_BANE]) {
      const fraCache = hitsFromSnapshot(snapshotFromHits(hits)!);
      const tekst = (liste: LookupHit[]) => liste.map((h) => describeFact({ subtype: h.subtype, title: h.title, attributes: h.attributes, contains: h.contains }));
      expect(tekst(fraCache)).toEqual(tekst(hits));
    }
  });

  it("lagrer ikke et svar den ikke forstår — da spørres kilden heller på nytt", () => {
    expect(snapshotFromHits([])).toBeNull();
    expect(snapshotFromHits([{ ...vegTreff, attributes: { niva: "60–64 dB" } }])).toBeNull();
    expect(snapshotFromHits([{ ...vegTreff, subtype: "noe_nytt" }])).toBeNull();
  });
});

describe("vei og bane har hver sin kartleggingsrunde", () => {
  it("lagrer vei som 2022 og bane som 2017", () => {
    expect(NOISE_SOURCE_ROUND).toEqual({ road: 2022, rail: 2017 });
    expect(snapshotFromHits([vegTreff, baneTreff])).toMatchObject({ sourceRoundRoad: 2022, sourceRoundRail: 2017 });
  });

  it("skriver riktig år på hvert funn, og blander dem ikke", () => {
    const [vei, bane] = hitsFromSnapshot(snapshotFromHits([vegTreff, baneTreff])!);
    expect(vei!.attributes.kartlagtAar).toBe(2022);
    expect(bane!.attributes.kartlagtAar).toBe(2017);
    expect(describeFact({ subtype: vei!.subtype, title: vei!.title, attributes: vei!.attributes, contains: true })?.details).toContain(
      "Støykartet viser situasjonen i 2022.",
    );
    expect(describeFact({ subtype: bane!.subtype, title: bane!.title, attributes: bane!.attributes, contains: true })?.details).toContain(
      "Støykartet viser situasjonen i 2017.",
    );
  });

  it("sier ikke lenger at hele kilden er kartlagt i 2022", () => {
    const metode = SOURCES["mdir-stoy-strategisk"]!.method!;
    expect(metode).toContain("Veitrafikk: situasjonen i 2022");
    expect(metode).toContain("Jernbane: situasjonen i 2017");
    expect(metode).not.toMatch(/kartlagt 2022/);
  });
});

describe("oppslaget med cache", () => {
  it("fersk cache: kilden kalles ikke", async () => {
    const store = minne();
    const første = kilde(async () => VEI_OG_LAV_BANE);
    await new CachedNoiseLookup(første.lookup, store, { now: () => NÅ }).runDetailed(PUNKT);

    const andre = kilde(tidsavbrudd);
    const svar = await new CachedNoiseLookup(andre.lookup, store, { now: () => NÅ + 30 * DAG }).runDetailed(PUNKT);
    expect(andre.run).not.toHaveBeenCalled();
    expect(svar).toMatchObject({ origin: "cache", hits: VEI_OG_LAV_BANE });
  });

  it("tom cache: kilden kalles, og et gyldig svar lagres", async () => {
    const store = minne();
    const { lookup, run } = kilde(async () => [vegTreff, baneTreff]);
    const svar = await new CachedNoiseLookup(lookup, store, { now: () => NÅ }).runDetailed(PUNKT);
    expect(run).toHaveBeenCalledTimes(1);
    expect(svar).toMatchObject({ origin: "source", hits: [vegTreff, baneTreff] });
    expect(store.rader.get("59.92852,10.71432")).toMatchObject({ roadState: "hit", railState: "hit", sourceRoundRoad: 2022, sourceRoundRail: 2017 });
  });

  it.each([
    ["ingen treff", INGEN_TREFF],
    ["ikke dekket", IKKE_DEKKET],
  ])("gyldig «%s» lagres og brukes senere uten nytt kall", async (_navn, hits) => {
    const store = minne();
    await new CachedNoiseLookup(kilde(async () => hits).lookup, store, { now: () => NÅ }).runDetailed(PUNKT);
    expect(store.skrevet).toBe(1);

    const senere = kilde(tidsavbrudd);
    const svar = await new CachedNoiseLookup(senere.lookup, store, { now: () => NÅ + 60 * DAG }).runDetailed(PUNKT);
    expect(senere.run).not.toHaveBeenCalled();
    expect(svar.hits).toEqual(hits);
  });

  it("gammel cache og kilden svarer: cachen oppdateres", async () => {
    const store = minne();
    await new CachedNoiseLookup(kilde(async () => INGEN_TREFF).lookup, store, { now: () => NÅ }).runDetailed(PUNKT);

    store.tid = NÅ + 100 * DAG;
    const ny = kilde(async () => [vegTreff, baneTreff]);
    const svar = await new CachedNoiseLookup(ny.lookup, store, { now: () => store.tid }).runDetailed(PUNKT);
    expect(ny.run).toHaveBeenCalledTimes(1);
    expect(svar).toMatchObject({ origin: "source", hits: [vegTreff, baneTreff] });
    expect(store.rader.get("59.92852,10.71432")).toMatchObject({ roadState: "hit", fetchedAt: new Date(store.tid).toISOString() });
  });

  it("gammel cache og kilden feiler: det gamle svaret vises og røres ikke", async () => {
    const store = minne();
    await new CachedNoiseLookup(kilde(async () => VEI_OG_LAV_BANE).lookup, store, { now: () => NÅ }).runDetailed(PUNKT);
    const før = structuredClone(store.rader.get("59.92852,10.71432"));

    const nede = kilde(tidsavbrudd);
    const svar = await new CachedNoiseLookup(nede.lookup, store, { now: () => NÅ + 100 * DAG }).runDetailed(PUNKT);
    expect(nede.run).toHaveBeenCalledTimes(1);
    expect(svar).toMatchObject({ origin: "stale-cache", hits: VEI_OG_LAV_BANE, fetchedAt: new Date(NÅ).toISOString() });
    expect(store.rader.get("59.92852,10.71432")).toEqual(før);
    expect(store.skrevet).toBe(1);
  });

  it("ingen cache og kilden feiler: oppslaget feiler som før", async () => {
    const store = minne();
    await expect(new CachedNoiseLookup(kilde(tidsavbrudd).lookup, store, { now: () => NÅ }).runDetailed(PUNKT)).rejects.toThrow(/timeout/);
    expect(store.skrevet).toBe(0);
  });

  it("gir kilden kortere tid når et gammelt svar finnes, og vanlig tid ellers", async () => {
    const store = minne();
    const kald = kilde(async () => INGEN_TREFF);
    const ytre = new AbortController().signal;
    await new CachedNoiseLookup(kald.lookup, store, { now: () => NÅ }).runDetailed({ ...PUNKT, signal: ytre });
    expect(kald.run.mock.calls[0]![0].signal).toBe(ytre);

    const varm = kilde(async () => INGEN_TREFF);
    await new CachedNoiseLookup(varm.lookup, store, { now: () => NÅ + 100 * DAG, refreshTimeoutMs: 5 }).runDetailed({ ...PUNKT, signal: ytre });
    const signal = varm.run.mock.calls[0]![0].signal!;
    expect(signal).not.toBe(ytre);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(signal.aborted).toBe(true);
  });

  it("en rad fra en annen kartleggingsrunde regnes som gammel", () => {
    const rad = { fetchedAt: new Date(NÅ).toISOString(), sourceRoundRoad: 2022, sourceRoundRail: 2017 };
    expect(isFresh(rad, NÅ + DAG)).toBe(true);
    expect(isFresh(rad, NÅ + NOISE_CACHE_TTL_MS - 1)).toBe(true);
    expect(isFresh(rad, NÅ + NOISE_CACHE_TTL_MS)).toBe(false);
    expect(isFresh({ ...rad, sourceRoundRoad: 2017 }, NÅ + DAG)).toBe(false);
    expect(isFresh({ ...rad, fetchedAt: "ikke en dato" }, NÅ)).toBe(false);
  });

  it("bruker hentetidspunktet bare som hentetidspunkt, aldri som kartleggingsår", async () => {
    const store = minne();
    await new CachedNoiseLookup(kilde(async () => [vegTreff, baneTreff]).lookup, store, { now: () => NÅ }).runDetailed(PUNKT);
    const svar = await new CachedNoiseLookup(kilde(tidsavbrudd).lookup, store, { now: () => NÅ + 400 * DAG }).runDetailed(PUNKT);
    // Svaret er hentet i 2026 og vist i 2027, men modellen er fortsatt fra 2022 og 2017.
    expect(svar.fetchedAt).toBe("2026-10-08T10:00:00.000Z");
    expect(svar.hits.map((h) => h.attributes.kartlagtAar)).toEqual([2022, 2017]);
    expect(JSON.stringify(svar.hits)).not.toContain("2026");
  });

  it("cachen selv velter aldri et søk", async () => {
    const ødelagt: NoiseCacheStore = {
      get: async () => {
        throw new Error("databasen er nede");
      },
      put: async () => {
        throw new Error("databasen er nede");
      },
    };
    const { lookup } = kilde(async () => INGEN_TREFF);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(new CachedNoiseLookup(lookup, ødelagt, { now: () => NÅ }).runDetailed(PUNKT)).resolves.toMatchObject({
      origin: "source",
      hits: INGEN_TREFF,
    });
    vi.restoreAllMocks();
  });
});

describe("oppslagsrunden med cachet støy", () => {
  it("viser lagret svar som «sist tilgjengelige» når kilden er nede, og ikke som en feil", async () => {
    const store = minne();
    await new CachedNoiseLookup(kilde(async () => INGEN_TREFF).lookup, store, { now: () => NÅ }).runDetailed(PUNKT);

    let tid = NÅ + 100 * DAG;
    const nede = kilde(tidsavbrudd);
    const runner = createLookupRunner([new CachedNoiseLookup(nede.lookup, store, { now: () => tid })], { now: () => tid, pauseMs: 30_000 });

    const første = await runner.run(PUNKT.lat, PUNKT.lng, PUNKT.radiusM);
    expect(første.failed).toEqual([]);
    expect(første.results[0]).toMatchObject({ stale: true, hits: INGEN_TREFF, fetchedAt: new Date(NÅ).toISOString() });

    // I pausen etter feilen spørres ikke kilden, men det lagrede svaret vises fortsatt.
    tid += 5_000;
    const iPausen = await runner.run(PUNKT.lat, PUNKT.lng, PUNKT.radiusM);
    expect(nede.run).toHaveBeenCalledTimes(1);
    expect(iPausen.failed).toEqual([]);
    expect(iPausen.results[0]).toMatchObject({ stale: true, hits: INGEN_TREFF });
  });

  it("melder kilden som nede når ingenting er lagret", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const runner = createLookupRunner([new CachedNoiseLookup(kilde(tidsavbrudd).lookup, minne(), { now: () => NÅ })], { now: () => NÅ });
    const svar = await runner.run(PUNKT.lat, PUNKT.lng, PUNKT.radiusM);
    expect(svar.failed).toEqual(["mdir-stoy-strategisk"]);
    expect(svar.results).toEqual([]);
    vi.restoreAllMocks();
  });

  it("holder to nabopunkter fra hverandre også i minnecachen", async () => {
    const svar = new Map([
      ["59.96623,10.74723", [{ ...vegTreff, attributes: { ...vegTreff.attributes, niva: "50–54 dB", nedre: 50, ovre: 54 } }]],
      ["59.96646,10.74715", INGEN_TREFF],
    ]);
    const lookup: AreaLookup = {
      id: "mdir-stoy-strategisk",
      name: "x",
      owner: "x",
      category: "stoy",
      run: async ({ lat, lng }) => svar.get(noiseCacheKey(lat, lng))!,
    };
    const runner = createLookupRunner([lookup]);
    const a = await runner.run(59.96623, 10.74723, 1000);
    const c = await runner.run(59.96646, 10.74715, 1000);
    expect(a.results[0]!.hits[0]!.subtype).toBe("stoy_strategisk_veg");
    expect(c.results[0]!.hits[0]!.subtype).toBe("stoy_strategisk_status");
  });
});

describe("teksten når lagret svar vises", () => {
  it("er nøytral og sier hvor svaret kom fra", () => {
    expect(describeStaleSources(["Strategisk støykartlegging"])).toBe(
      "Viser sist tilgjengelige svar fra NaboRadars cache for Strategisk støykartlegging. Kilden svarte ikke akkurat nå.",
    );
  });
});
