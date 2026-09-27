import { describe, expect, it } from "vitest";
import {
  KartverketStormfloLookup,
  NguRadonLookup,
  NveFlomLookup,
  NveSkredLookup,
} from "@/lib/facts/lookups/naturfare";
import { areaLookups } from "@/lib/facts/lookups";
import { describeFact, RADON_LABEL, SOURCES } from "@/lib/facts/wording";
import { AREA_SECTIONS, LOOKUP_CATEGORIES } from "@/types/area-feature";

/**
 * Naturfare: flom, skred, radon og stormflo.
 *
 * To ting testes hardest. Det ene er at vi aldri sier «ingen fare» når kilden bare sier «ingen
 * kartlagt sone» — fravær i et datasett er ikke fravær i virkeligheten, og for naturfare er den
 * forskjellen hele forskjellen. Det andre er at aktsomhet ikke blir omskrevet til fare.
 */

const ctx = { lat: 60.3824, lng: 5.3291, radiusM: 1000 };

/** Svar på ArcGIS `identify` med de lagene testen vil ha treff i. */
function arcgisFake(perService: Record<string, number[]>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const service = Object.keys(perService).find((navn) => url.includes(navn));
    const layers = service ? perService[service]! : [];
    const bedt = new URL(url).searchParams.get("layers")?.replace("all:", "").split(",").map(Number) ?? [];
    const results = layers
      .filter((id) => bedt.includes(id))
      .map((id) => ({ layerId: id, layerName: `lag-${id}`, attributes: {} }));
    return new Response(JSON.stringify({ results }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

/** Svar på WFS `resulttype=hits` for de typene testen vil ha treff i. */
function wfsFake(treff: string[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(String(input));
    const antall = treff.some((t) => url.includes(`app:${t}`)) ? 1 : 0;
    const xml = `<?xml version="1.0"?><wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" numberMatched="${antall}" numberReturned="0"/>`;
    return new Response(xml, { status: 200, headers: { "content-type": "application/xml" } });
  }) as typeof fetch;
}

/**
 * Svarer som NGUs publikumskart: GetFeatureInfo med GML, der `aktsomhetgrad` er tallkoden som
 * styrer fargen i legenden. `kode = null` betyr at kartet ikke dekker punktet.
 */
const radonKall: string[] = [];
function radonFake(kode: string | null, besk = ""): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    radonKall.push(String(input));
    const body =
      kode === null
        ? `<?xml version="1.0"?><msGMLOutput></msGMLOutput>`
        : `<?xml version="1.0"?><msGMLOutput><Radon_aktsomhet_layer><Radon_aktsomhet_feature>` +
          `<objectid>495519</objectid><objekttype>RadonAktsomhet</objekttype>` +
          `<aktsomhetgrad>${kode}</aktsomhetgrad><aktsomhetgrad_besk>${besk}</aktsomhetgrad_besk>` +
          `</Radon_aktsomhet_feature></Radon_aktsomhet_layer></msGMLOutput>`;
    return new Response(body, { status: 200, headers: { "content-type": "application/vnd.ogc.gml" } });
  }) as typeof fetch;
}

/** Kildens fire klasser: tallkode → nøkkel og visningstekst. Rekkefølgen er legendens. */
const RADON_FASIT = [
  { kode: "3", kildetekst: "Særlig høy aktsomhet", nokkel: "særligHøy", vises: "Særlig høy" },
  { kode: "2", kildetekst: "Høy aktsomhet", nokkel: "høy", vises: "Høy" },
  { kode: "1", kildetekst: "Moderat til lav aktsomhet", nokkel: "moderatTilLav", vises: "Moderat til lav" },
  { kode: "0", kildetekst: "Usikker aktsomhet", nokkel: "usikker", vises: "Usikker" },
] as const;

describe("flom", () => {
  it("sier at punktet er innenfor kartlagt flomsone, med strengeste gjentaksintervall", async () => {
    // Treff i 10-, 50- og 200-årssonene: 10 år er strengest fordi det skjer oftest.
    const hits = await new NveFlomLookup(arcgisFake({ Flomsoner2: [0, 13, 15, 17], Flomaktsomhet: [] })).run(ctx);
    expect(hits.map((h) => h.subtype)).toEqual(["flom_sone"]);
    expect(hits[0]!.attributes.gjentaksintervallAr).toBe(10);
    expect(hits[0]!.attributes.alleIntervaller).toBe("10, 50, 200");
    expect(hits[0]!.contains).toBe(true);
  });

  it("sier «utenfor kartlagt flomsone» når området er kartlagt uten treff — ikke «ingen flomfare»", async () => {
    const hits = await new NveFlomLookup(arcgisFake({ Flomsoner2: [0], Flomaktsomhet: [] })).run(ctx);
    expect(hits.map((h) => h.subtype)).toEqual(["flom_utenfor_sone"]);
    const tekst = describeFact({ subtype: "flom_utenfor_sone", title: hits[0]!.title, attributes: hits[0]!.attributes, contains: false })!;
    expect(tekst.headline).toBe("Utenfor kartlagt flomsone");
    expect(JSON.stringify(tekst)).not.toMatch(/ingen flomfare|trygt|ikke utsatt/i);
  });

  it("sier ingenting når området ikke er flomsonekartlagt", async () => {
    const hits = await new NveFlomLookup(arcgisFake({ Flomsoner2: [], Flomaktsomhet: [] })).run(ctx);
    expect(hits).toEqual([]);
  });

  it("tar med aktsomhetsområde bare når aktsomhetskartet dekker punktet", async () => {
    const utenDekning = await new NveFlomLookup(arcgisFake({ Flomsoner2: [], Flomaktsomhet: [1] })).run(ctx);
    expect(utenDekning).toEqual([]);
    const medDekning = await new NveFlomLookup(arcgisFake({ Flomsoner2: [], Flomaktsomhet: [1, 2] })).run(ctx);
    expect(medDekning.map((h) => h.subtype)).toEqual(["flom_aktsomhet"]);
  });

  it("setter kartlagt sone før aktsomhetsområde", async () => {
    const hits = await new NveFlomLookup(arcgisFake({ Flomsoner2: [0, 17], Flomaktsomhet: [1, 2] })).run(ctx);
    expect(hits.map((h) => h.subtype)).toEqual(["flom_sone", "flom_aktsomhet"]);
  });
});

describe("skred", () => {
  it("skiller kartlagt faresone fra aktsomhetsområde", async () => {
    const hits = await new NveSkredLookup(
      arcgisFake({ Skredfaresoner3: [0, 6, 18], JordFlomskredAktsomhet: [1], SkredSnoSteinAkt: [0, 1] }),
    ).run(ctx);
    expect(hits.map((h) => h.subtype)).toEqual([
      "skred_faresone",
      "skred_jord_flom_aktsomhet",
      "skred_sno_stein_aktsomhet",
    ]);
    // Faresonen først: den er en utredning på stedet, de andre er screening.
    expect(hits[0]!.subtype).toBe("skred_faresone");
    // Nivå og skredtype leses av lagene, ikke av et attributt.
    expect(hits[0]!.attributes.gjentaksintervallAr).toBe(100);
    expect(hits[0]!.attributes.skredtyper).toBe("snøskred");
  });

  it("krever dekning for snø- og steinskred", async () => {
    const hits = await new NveSkredLookup(
      arcgisFake({ Skredfaresoner3: [], JordFlomskredAktsomhet: [], SkredSnoSteinAkt: [0] }),
    ).run(ctx);
    expect(hits).toEqual([]);
  });

  it("gir ingen treff i flatt terreng uten kartlegging", async () => {
    const hits = await new NveSkredLookup(
      arcgisFake({ Skredfaresoner3: [], JordFlomskredAktsomhet: [], SkredSnoSteinAkt: [] }),
    ).run(ctx);
    expect(hits).toEqual([]);
  });

  it("beskriver aktsomhet som aktsomhet, ikke som fare", () => {
    for (const subtype of ["skred_jord_flom_aktsomhet", "skred_sno_stein_aktsomhet", "flom_aktsomhet"]) {
      const tekst = describeFact({ subtype, title: "", attributes: {}, contains: true })!;
      expect(tekst.headline.toLowerCase()).toContain("aktsomhetsområde");
      expect(tekst.headline.toLowerCase()).not.toMatch(/fare|farlig|risiko/);
    }
  });
});

/**
 * Radon henger på ett valg: vi viser **det kartet NGU publiserer**, ikke det nyeste endepunktet.
 *
 * NGU har også et «versjon 2»-datasett fra september 2026 med fem andre klasser, som ga en annen
 * klasse på 40 av 40 testede steder. Testene her låser klassene til publikumskartets fire, slik at
 * et bytte tilbake til v2 ikke kan skje ved et uhell.
 */
describe("radon", () => {
  it("bruker publikumskartets fire klasser, og bare dem", () => {
    expect(Object.keys(RADON_LABEL).sort()).toEqual(["høy", "moderatTilLav", "særligHøy", "usikker"]);
    // Klassene fra v2-datasettet skal ikke finnes her.
    for (const v2 of ["megetHøy", "middels", "lav"]) expect(RADON_LABEL[v2]).toBeUndefined();
    // «Moderat til lav» er én klasse hos NGU, ikke to.
    expect(RADON_LABEL.moderatTilLav).toBe("Moderat til lav");
  });

  it("oversetter kildens tallkode til kildens egen klasse", async () => {
    for (const { kode, kildetekst, nokkel, vises } of RADON_FASIT) {
      const hits = await new NguRadonLookup(radonFake(kode, kildetekst)).run(ctx);
      expect(hits[0]!.attributes.aktsomhetsgrad).toBe(nokkel);
      expect(hits[0]!.attributes.kildetekst).toBe(kildetekst);
      const tekst = describeFact({ subtype: "radon_aktsomhet", title: hits[0]!.title, attributes: hits[0]!.attributes, contains: true })!;
      expect(tekst.headline).toBe(`${vises} radonaktsomhet i området`);
      // Kildens egen ordlyd skal være etterprøvbar under detaljer.
      expect(tekst.technical!.join(" ")).toContain(kildetekst);
    }
  });

  it("spør publikumskartet, med ekte punkt-i-polygon", async () => {
    radonKall.length = 0;
    await new NguRadonLookup(radonFake("1", "Moderat til lav aktsomhet")).run(ctx);
    const url = new URL(radonKall[0]!);
    expect(url.origin + url.pathname).toBe("https://geo.ngu.no/mapserver/RadonWMS2");
    expect(url.searchParams.get("LAYERS")).toBe("Radon_aktsomhet");
    // GetFeatureInfo svarer «hvilken flate ligger punktet i». bbox + features[0] gjorde ikke det.
    expect(url.searchParams.get("REQUEST")).toBe("GetFeatureInfo");
    // CRS:84 er alltid lon,lat. EPSG:4326 i WMS 1.3.0 er lat,lon og kan byttes om ved et uhell.
    expect(url.searchParams.get("CRS")).toBe("CRS:84");
    const [minX, minY, maxX, maxY] = url.searchParams.get("BBOX")!.split(",").map(Number);
    expect(minX! < ctx.lng && ctx.lng < maxX!).toBe(true);
    expect(minY! < ctx.lat && ctx.lat < maxY!).toBe(true);
  });

  it("henter ikke lenger fra v2-endepunktet", async () => {
    radonKall.length = 0;
    await new NguRadonLookup(radonFake("1", "Moderat til lav aktsomhet")).run(ctx);
    expect(radonKall.join(" ")).not.toContain("api/features/radonaktsomhet");
    expect(radonKall.join(" ")).not.toContain("RadonUranAktsomhetWMS");
  });

  it("avviser en kode kilden ikke har", async () => {
    expect(await new NguRadonLookup(radonFake("9", "Noe nytt")).run(ctx)).toEqual([]);
  });

  it("sier eksplisitt at dette ikke er en måling i boligen", async () => {
    const hits = await new NguRadonLookup(radonFake("2", "Høy aktsomhet")).run(ctx);
    const tekst = describeFact({ subtype: "radon_aktsomhet", title: hits[0]!.title, attributes: hits[0]!.attributes, contains: true })!;
    expect(tekst.details.join(" ")).toContain("ikke en måling i boligen");
    expect(tekst.headline).toContain("i området");
    // Aldri formulert som et nivå i boligen.
    expect(tekst.headline).not.toMatch(/radonnivå i boligen|Bq/i);
  });

  it("overpresiserer ikke tomten", async () => {
    const hits = await new NguRadonLookup(radonFake("1", "Moderat til lav aktsomhet")).run(ctx);
    const tekst = describeFact({ subtype: "radon_aktsomhet", title: hits[0]!.title, attributes: hits[0]!.attributes, contains: true })!;
    // NGU: «Kartet kan ikke benyttes til å forutsi radonkonsentrasjonen i enkeltbygninger.»
    expect(tekst.details.join(" ")).toContain("ikke en måling eller detaljert vurdering av den enkelte tomten");
    // Hovedkortet skal være kort — forbeholdene hører under detaljer.
    expect(tekst.headline.length).toBeLessThan(60);
  });

  it("gir ingen treff når kartet ikke dekker punktet", async () => {
    expect(await new NguRadonLookup(radonFake(null)).run(ctx)).toEqual([]);
  });

  it("kildevisningen peker på NGUs eget publikumskart", () => {
    const kilde = SOURCES["ngu-radon-aktsomhet"]!;
    expect(kilde.name).toBe("Radon – aktsomhetsområder");
    expect(kilde.url).toBe("https://geo.ngu.no/kart/radon/");
    // «versjon 2» er ikke noe NGU omtaler produktet som offentlig.
    expect(JSON.stringify(kilde)).not.toMatch(/versjon 2|v2/i);
  });
});

/**
 * Regresjon på en reell adresse.
 *
 * Langmyrgrenda 26C i Oslo var saken som avdekket at vi hadde koblet oss på feil produkt: vi viste
 * «Meget høy», mens NGUs publiserte kart viser «Moderat til lav». Koordinatet er det Kartverkets
 * adresse-API gir (EPSG:4258), altså nøyaktig det `/omrade` slår opp med.
 */
describe("regresjon: Langmyrgrenda 26C", () => {
  const LANGMYRGRENDA = { lat: 59.96646353771135, lng: 10.747149073750538, radiusM: 1000 };

  it("klassifiseres som «Moderat til lav», ikke «Meget høy»", async () => {
    const hits = await new NguRadonLookup(radonFake("1", "Moderat til lav aktsomhet")).run(LANGMYRGRENDA);
    expect(hits[0]!.attributes.aktsomhetsgrad).toBe("moderatTilLav");
    const tekst = describeFact({ subtype: "radon_aktsomhet", title: hits[0]!.title, attributes: hits[0]!.attributes, contains: true })!;
    expect(tekst.headline).toBe("Moderat til lav radonaktsomhet i området");
    expect(tekst.headline).not.toContain("Meget høy");
  });

  it("slår opp på adressens eget koordinat", async () => {
    radonKall.length = 0;
    await new NguRadonLookup(radonFake("1", "Moderat til lav aktsomhet")).run(LANGMYRGRENDA);
    const bbox = new URL(radonKall[0]!).searchParams.get("BBOX")!.split(",").map(Number);
    expect((bbox[0]! + bbox[2]!) / 2).toBeCloseTo(LANGMYRGRENDA.lng, 5);
    expect((bbox[1]! + bbox[3]!) / 2).toBeCloseTo(LANGMYRGRENDA.lat, 5);
  });
});

describe("stormflo", () => {
  it("oppgir strengeste nivå i dag og det framtidige separat", async () => {
    const hits = await new KartverketStormfloLookup(
      wfsFake([
        "StormfloØvreEstimat_KlimaÅr2150",
        "Stormflo20År_KlimaÅrNå",
        "Stormflo200År_KlimaÅrNå",
        "Stormflo200År_KlimaÅr2100",
      ]),
    ).run(ctx);
    expect(hits[0]!.subtype).toBe("stormflo");
    expect(hits[0]!.attributes.gjentaksintervallAr).toBe(20);
    expect(hits[0]!.attributes.framtidigGjentaksintervallAr).toBe(200);
    expect(hits[0]!.attributes.framtidigAr).toBe(2100);
  });

  /**
   * Regresjon: `Dekningsområde` dekker praktisk talt hele landet, så det kunne ikke brukes som
   * port. QA ga «ikke berørt av kartlagte stormflonivåer» på Grünerløkka, i Lillestrøm og på
   * Elverum. Porten er nå det ytterste scenarioet kilden har.
   */
  it("sier «ikke berørt» bare når adressen er i spill, og ingenting i innlandet", async () => {
    const naerSjoen = await new KartverketStormfloLookup(wfsFake(["StormfloØvreEstimat_KlimaÅr2150"])).run(ctx);
    expect(naerSjoen.map((h) => h.subtype)).toEqual(["stormflo_utenfor"]);
    // Dekningsområde alene skal ikke utløse noe: det treffer også langt inne i landet.
    const innlandet = await new KartverketStormfloLookup(wfsFake(["Dekningsområde"])).run(ctx);
    expect(innlandet).toEqual([]);
  });

  it("sier ikke at eiendommen er trygg", () => {
    const tekst = describeFact({ subtype: "stormflo_utenfor", title: "", attributes: {}, contains: false })!;
    expect(tekst.headline).toBe("Ikke berørt av kartlagte stormflonivåer");
    expect(JSON.stringify(tekst)).not.toMatch(/trygg|ingen fare|sikker/i);
  });

  it("nevner bare scenarioene vi faktisk spør om", () => {
    const tekst = describeFact({ subtype: "stormflo_utenfor", title: "", attributes: {}, contains: false })!;
    expect(tekst.technical!.join(" ")).toContain("20- og 200-årsnivå");
  });
});

describe("naturfare samlet", () => {
  it("ligger i én seksjon sammen med kvikkleire", () => {
    const seksjon = AREA_SECTIONS.find((s) => s.id === "grunnforhold")!;
    expect(seksjon.label).toBe("Naturfare");
    expect(seksjon.intro).toContain("Aktsomhetsområder");
    expect(LOOKUP_CATEGORIES).toContain("grunnforhold");
  });

  it("har kilde med lisens for hvert nytt oppslag", () => {
    for (const id of ["nve-flom", "nve-skred", "ngu-radon-aktsomhet", "kartverket-stormflo"]) {
      const kilde = SOURCES[id];
      expect(kilde, id).toBeDefined();
      expect(kilde!.licenseName).toBeTruthy();
      expect(kilde!.licenseUrl).toMatch(/^https:/);
      expect(kilde!.owner).toBeTruthy();
    }
  });

  it("er registrert som direkte oppslag, ikke som providere", () => {
    const ider = areaLookups.map((l) => l.id);
    expect(ider).toEqual(
      expect.arrayContaining(["nve-kvikkleire-aktsomhet", "nve-flom", "nve-skred", "ngu-radon-aktsomhet", "kartverket-stormflo"]),
    );
    // Kvikkleire først, slik at den etablerte raden beholder plassen sin.
    expect(ider.indexOf("nve-kvikkleire-aktsomhet")).toBeLessThan(ider.indexOf("nve-flom"));
  });

  it("lager ingen samlet risikoscore", () => {
    const alle = [
      "flom_sone",
      "flom_aktsomhet",
      "flom_utenfor_sone",
      "skred_faresone",
      "skred_jord_flom_aktsomhet",
      "skred_sno_stein_aktsomhet",
      "radon_aktsomhet",
      "stormflo",
      "stormflo_utenfor",
    ].map((s) => describeFact({ subtype: s, title: "", attributes: { gjentaksintervallAr: 200, aktsomhetsgrad: "høy" }, contains: true })!);
    for (const tekst of alle) {
      expect(JSON.stringify(tekst)).not.toMatch(/score|poeng|samlet risiko|trygghetsgrad/i);
    }
  });
});

describe("feiltoleranse", () => {
  it("lar ett oppslag feile uten å ta med de andre", async () => {
    const nede: typeof fetch = async () => new Response("nede", { status: 503 });
    await expect(new NguRadonLookup(nede).run(ctx)).rejects.toThrow();
    // Andre oppslag berøres ikke: runLookups() bruker Promise.allSettled per oppslag.
    const flom = await new NveFlomLookup(arcgisFake({ Flomsoner2: [0, 17], Flomaktsomhet: [] })).run(ctx);
    expect(flom[0]!.subtype).toBe("flom_sone");
  });

  it("håndterer tomt svar fra ArcGIS", async () => {
    const tomt: typeof fetch = async () => new Response(JSON.stringify({ results: [] }), { status: 200 });
    expect(await new NveFlomLookup(tomt).run(ctx)).toEqual([]);
    expect(await new NveSkredLookup(tomt).run(ctx)).toEqual([]);
  });
});
