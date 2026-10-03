import { describe, expect, it, vi } from "vitest";
import { KartverketStormfloLookup } from "@/lib/facts/lookups/naturfare";
import { FlystoyLookup } from "@/lib/facts/lookups/stoy";
import { lesWmsGml, wmsBbox, wmsPunktUrl, WMS_PUNKT_DELTA, WMS_PUNKT_PIKSLER } from "@/lib/facts/lookups/wms";
import { AVINOR_LUFTHAVNER, lufthavnNavn } from "@/lib/facts/lufthavner";
import { describeFact } from "@/lib/facts/wording";

/**
 * Stormflo og flystøy som punktoppslag mot WMS (ADR 015, docs/research/stormflo-flystoy-kildegjennomgang.md).
 * Svarene under er formet etter de ekte svarene fra wms.geonorge.no, 2026-10-03.
 */

const BJORVIKA = { lat: 59.9054, lng: 10.75480, radiusM: 1000 };

/** MapServer-GML slik tjenesten svarer: én blokk per lag med treff, ingen blokk for lag uten. */
function gml(lag: Record<string, Record<string, string>[]>): string {
  const blokker = Object.entries(lag)
    .map(([navn, treff]) => `<${navn}_layer><gml:name>${navn}</gml:name>${treff.map((felt) => `<${navn}_feature>${Object.entries(felt).map(([k, v]) => `<${k}>${v}</${k}>`).join("")}</${navn}_feature>`).join("")}</${navn}_layer>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><msGMLOutput xmlns:gml="http://www.opengis.net/gml">${blokker}</msGMLOutput>`;
}
const svar = (body: string, status = 200) => vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;
const UNNTAK = `<?xml version='1.0'?><ServiceExceptionReport version="1.3.0"><ServiceException code="LayerNotDefined">Invalid layer(s) given</ServiceException></ServiceExceptionReport>`;
const TOMCAT_500 = `<!doctype html><html><head><title>HTTP Status 500 – Internal Server Error</title></head><body>Connect to rin-ap2261:8081 timed out</body></html>`;

describe("WMS-punktoppslag", () => {
  it("bygger BBOX med riktig akserekkefølge: CRS:84 er lon,lat, EPSG:4326 er lat,lon", () => {
    expect(wmsBbox("CRS:84", 60, 10, 0.001)).toBe("9.999,59.999,10.001,60.001");
    expect(wmsBbox("EPSG:4326", 60, 10, 0.001)).toBe("59.999,9.999,60.001,10.001");
    const url = new URL(wmsPunktUrl({ url: "https://x/wms", layers: ["a", "b"], crs: "EPSG:4326", lat: 60, lng: 10 }));
    expect(url.searchParams.get("CRS")).toBe("EPSG:4326");
    expect(url.searchParams.get("QUERY_LAYERS")).toBe("a,b");
    expect(url.searchParams.get("VERSION")).toBe("1.3.0");
    expect(url.searchParams.get("INFO_FORMAT")).toBe("application/vnd.ogc.gml");
  });

  it("spør i detaljmålestokk, godt innenfor stormflolagenes grense på 1:80 000", () => {
    // Bredeste utsnitt er nord–sør: 2·Δ grader breddegrad på 3 piksler, 0,28 mm per piksel (OGC).
    const meterPerPiksel = (2 * WMS_PUNKT_DELTA * 111_320) / WMS_PUNKT_PIKSLER;
    expect(meterPerPiksel / 0.00028).toBeLessThan(20_000);
  });

  it("et gyldig tomt svar er «ingen treff»", () => {
    expect(lesWmsGml(gml({})).size).toBe(0);
  });

  it("et unntak, en HTML-feilside eller noe annet enn GML er kildefeil — aldri fravær", () => {
    expect(() => lesWmsGml(UNNTAK)).toThrow(/WMS-feil/);
    expect(() => lesWmsGml(TOMCAT_500)).toThrow();
    expect(() => lesWmsGml("")).toThrow();
  });
});

describe("stormflo (Kartverket, samme kartlag som «Se havnivå i kart»)", () => {
  const LAND = { vannstandovernn2000: "190", sikkerhetsklasseflom: "F2" };

  it("spør alle lagene i ett kall, med CRS:84 rundt punktet", async () => {
    const fetchImpl = svar(gml({}));
    await new KartverketStormfloLookup(fetchImpl).run(BJORVIKA);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = new URL(String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]));
    expect(url.origin + url.pathname).toBe("https://wms.geonorge.no/skwms1/wms.stormflo_havniva");
    expect(url.searchParams.get("QUERY_LAYERS")).toBe(
      "middelhoyvann_klimaarna,stormfloovreestimat_klimaar2150,stormflo20ar_klimaarna,stormflo200ar_klimaarna,stormflo200ar_klimaar2100",
    );
    expect(url.searchParams.get("CRS")).toBe("CRS:84");
    const [minLng, minLat, maxLng, maxLat] = url.searchParams.get("BBOX")!.split(",").map(Number);
    expect((minLng! + maxLng!) / 2).toBeCloseTo(BJORVIKA.lng, 6);
    expect((minLat! + maxLat!) / 2).toBeCloseTo(BJORVIKA.lat, 6);
    // dekningsomrade er ikke en port: den dekker også innlandet.
    expect(url.searchParams.get("QUERY_LAYERS")).not.toContain("dekningsomrade");
  });

  it("oppgir strengeste nivå i dag og det framtidige separat", async () => {
    const hits = await new KartverketStormfloLookup(
      svar(gml({ stormfloovreestimat_klimaar2150: [LAND], stormflo20ar_klimaarna: [LAND], stormflo200ar_klimaarna: [LAND], stormflo200ar_klimaar2100: [LAND] })),
    ).run(BJORVIKA);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.attributes).toEqual({ gjentaksintervallAr: 20, framtidigGjentaksintervallAr: 200, framtidigAr: 2100 });
  });

  it("bare 2100: ingen dagens nivå, bare det framtidige (Bryggen)", async () => {
    const [hit] = await new KartverketStormfloLookup(svar(gml({ stormfloovreestimat_klimaar2150: [LAND], stormflo200ar_klimaar2100: [LAND] }))).run(BJORVIKA);
    expect(hit!.attributes).toEqual({ gjentaksintervallAr: null, framtidigGjentaksintervallAr: 200, framtidigAr: 2100 });
  });

  it("«ikke berørt» bare når adressen er i spill (øvre estimat), og ingenting høyt eller i innlandet", async () => {
    const naer = await new KartverketStormfloLookup(svar(gml({ stormfloovreestimat_klimaar2150: [LAND] }))).run(BJORVIKA);
    expect(naer.map((h) => h.subtype)).toEqual(["stormflo_utenfor"]);
    expect(await new KartverketStormfloLookup(svar(gml({}))).run(BJORVIKA)).toEqual([]);
  });

  it("et punkt i sjøen får ingen stormflovurdering, selv om alle scenariene treffer", async () => {
    const sjo = await new KartverketStormfloLookup(
      svar(gml({ middelhoyvann_klimaarna: [{ vannstandovernn2000: "40" }], stormfloovreestimat_klimaar2150: [LAND], stormflo20ar_klimaarna: [LAND], stormflo200ar_klimaarna: [LAND], stormflo200ar_klimaar2100: [LAND] })),
    ).run(BJORVIKA);
    expect(sjo).toEqual([]);
  });

  it("kildefeil er ikke fravær: unntak, HTML-500 og HTTP-feil kaster", async () => {
    await expect(new KartverketStormfloLookup(svar(UNNTAK)).run(BJORVIKA)).rejects.toThrow();
    await expect(new KartverketStormfloLookup(svar(TOMCAT_500)).run(BJORVIKA)).rejects.toThrow();
    await expect(new KartverketStormfloLookup(svar("nede", 500)).run(BJORVIKA)).rejects.toThrow();
  });
});

describe("flystøy (Avinor, Geonorge-WMS)", () => {
  const GARDERMOEN = { lat: 60.1976, lng: 11.0966, radiusM: 1000 };

  it("spør med EPSG:4326 og lat,lon-rekkefølge", async () => {
    const fetchImpl = svar(gml({}));
    await new FlystoyLookup(fetchImpl).run(GARDERMOEN);
    const url = new URL(String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]));
    expect(url.origin + url.pathname).toBe("https://wms.geonorge.no/skwms1/wms.stoylufthavn");
    expect(url.searchParams.get("CRS")).toBe("EPSG:4326");
    const [minLat, minLng, maxLat, maxLng] = url.searchParams.get("BBOX")!.split(",").map(Number);
    expect((minLat! + maxLat!) / 2).toBeCloseTo(GARDERMOEN.lat, 6);
    expect((minLng! + maxLng!) / 2).toBeCloseTo(GARDERMOEN.lng, 6);
  });

  // Svarblokken heter «stoylufthavn_layer» i det ekte svaret, ikke «stoylufthavn_wms_layer» som
  // lagnavnet vi spør med. Testene bruker det ekte navnet (fant feilen i nettverkstesten 2026-10-03).
  it("rød sone med lufthavnens navn og beregningsår — aldri ICAO-koden", async () => {
    const [hit] = await new FlystoyLookup(
      svar(gml({ stoylufthavn: [{ objtype: "Støy", stoysonekategori: "R", stoykilde: "F", stoykildenavn: "ENGM", beregnetar: "2022" }] })),
    ).run(GARDERMOEN);
    expect(hit).toMatchObject({ subtype: "stoysone_fly_t1442", contains: true, attributes: { sone: "rod", lufthavn: "Oslo lufthavn, Gardermoen", beregnetAar: 2022 } });
    const tekst = describeFact({ subtype: hit!.subtype, title: hit!.title, attributes: hit!.attributes, contains: true })!;
    expect(tekst.details).toEqual(["Oslo lufthavn, Gardermoen · beregningsår 2022"]);
    expect(JSON.stringify(tekst)).not.toContain("ENGM");
  });

  it("tar den strengeste sonen om begge skulle treffe", async () => {
    const [hit] = await new FlystoyLookup(
      svar(gml({ stoylufthavn: [{ stoysonekategori: "G", stoykildenavn: "ENBO", beregnetar: "2016" }, { stoysonekategori: "R", stoykildenavn: "ENBO", beregnetar: "2016" }] })),
    ).run(GARDERMOEN);
    expect(hit!.attributes.sone).toBe("rod");
  });

  it("gjetter ikke år eller navn når kilden ikke har dem", async () => {
    const [hit] = await new FlystoyLookup(svar(gml({ stoylufthavn: [{ stoysonekategori: "G", stoykildenavn: "ENRY", beregnetar: "" }] }))).run(GARDERMOEN);
    expect(hit!.attributes).toEqual({ sone: "gul", lufthavn: null, beregnetAar: null });
    const tekst = describeFact({ subtype: hit!.subtype, title: hit!.title, attributes: hit!.attributes, contains: true })!;
    expect(tekst.details).toEqual([]);
    expect(JSON.stringify(tekst)).not.toContain("ENRY");
  });

  it("ingen sone er et tomt svar; kildefeil kaster", async () => {
    expect(await new FlystoyLookup(svar(gml({}))).run(GARDERMOEN)).toEqual([]);
    await expect(new FlystoyLookup(svar(UNNTAK)).run(GARDERMOEN)).rejects.toThrow();
    await expect(new FlystoyLookup(svar("nede", 500)).run(GARDERMOEN)).rejects.toThrow();
  });
});

describe("ICAO → lufthavnnavn", () => {
  it("dekker alle lufthavnene Avinors støysonekart har navn for (44), og gir null — ikke koden — ellers", () => {
    expect(Object.keys(AVINOR_LUFTHAVNER)).toHaveLength(44);
    expect(lufthavnNavn("ENBO")).toBe("Bodø lufthavn");
    expect(lufthavnNavn("enva")).toBe("Trondheim lufthavn, Værnes");
    expect(lufthavnNavn("ENRY")).toBeNull();
    expect(lufthavnNavn("ENOL")).toBeNull(); // Ørland er Forsvarets, ikke Avinors
    expect(lufthavnNavn(null)).toBeNull();
    for (const [icao, navn] of Object.entries(AVINOR_LUFTHAVNER)) {
      expect(icao).toMatch(/^EN[A-Z]{2}$/);
      expect(navn).not.toContain(icao);
    }
  });
});
