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

function radonFake(grad: string | null): typeof fetch {
  return (async () => {
    const features = grad === null ? [] : [{ properties: { radonAktsomhetGrad: grad, oppdateringsdato: "2026-08-31T22:00:00Z" } }];
    return new Response(JSON.stringify({ features }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

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

describe("radon", () => {
  it("bruker kildens egne klasser", async () => {
    for (const grad of Object.keys(RADON_LABEL)) {
      const hits = await new NguRadonLookup(radonFake(grad)).run(ctx);
      expect(hits[0]!.attributes.aktsomhetsgrad).toBe(grad);
      const tekst = describeFact({ subtype: "radon_aktsomhet", title: hits[0]!.title, attributes: hits[0]!.attributes, contains: true })!;
      expect(tekst.headline).toContain(RADON_LABEL[grad]!);
    }
  });

  it("avviser en klasse kilden ikke har", async () => {
    const hits = await new NguRadonLookup(radonFake("ekstrem")).run(ctx);
    expect(hits).toEqual([]);
  });

  it("sier eksplisitt at dette ikke er en måling i boligen", async () => {
    const hits = await new NguRadonLookup(radonFake("megetHøy")).run(ctx);
    const tekst = describeFact({ subtype: "radon_aktsomhet", title: hits[0]!.title, attributes: hits[0]!.attributes, contains: true })!;
    expect(tekst.details.join(" ")).toContain("ikke en måling i boligen");
    expect(tekst.details.join(" ")).toContain("måling");
    expect(tekst.headline).toContain("i området");
    // Aldri formulert som et nivå i boligen.
    expect(tekst.headline).not.toMatch(/radonnivå i boligen|Bq/i);
  });

  it("tar vare på kildens oppdateringsdato, ikke vår hentedato", async () => {
    const hits = await new NguRadonLookup(radonFake("høy")).run(ctx);
    expect(hits[0]!.sourceUpdatedAt).toBe("2026-08-31T22:00:00.000Z");
  });

  it("gir ingen treff når kartet ikke dekker punktet", async () => {
    expect(await new NguRadonLookup(radonFake(null)).run(ctx)).toEqual([]);
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
