import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AKTSOMHET_TEKST } from "@/lib/admin/explore/aktsomhet";
import { boksFor, lesUtsnitt, punktIFlate, utsnittKm } from "@/lib/admin/explore/area";
import { kvikkleireFeature } from "@/lib/admin/explore/kvikkleire";
import { tolkSok } from "@/lib/admin/explore/parse";
import { EXPLORE_DATASETS } from "@/lib/admin/explore/registry";

/**
 * Utforsk data: søket tolkes deterministisk. Et ord velger datasettet, resten er et sted fra
 * kommuneregisteret. Ingen gjetting.
 */
const KOMMUNER = new Map([
  ["0301", { name: "Oslo", county: "Oslo" }],
  ["3201", { name: "Bærum", county: "Akershus" }],
  ["5001", { name: "Trondheim - Tråante", county: "Trøndelag - Trööndelage" }],
  ["1515", { name: "Herøy", county: "Møre og Romsdal" }],
  ["1818", { name: "Herøy", county: "Nordland" }],
  ["4601", { name: "Bergen", county: "Vestland" }],
]);
const tolk = (sok: string, valgt?: string) => tolkSok(sok, EXPLORE_DATASETS, KOMMUNER, valgt);

describe("tolkning av søket", () => {
  it("finner datasettet på navn og synonymer", () => {
    for (const sok of ["kvikkleire", "Kvikkleire", "kvikkleiresone", "kvikkleireområde", "kvikkleiresoner"]) expect(tolk(sok).dataset?.id).toBe("kvikkleire");
    for (const sok of ["datasenter", "datasentre", "data center", "Datacenter"]) expect(tolk(sok).dataset?.id).toBe("datasenter");
  });

  it("uten sted: datasettet alene", () => {
    expect(tolk("kvikkleire")).toMatchObject({ stedTekst: "", sted: { status: "ingen" } });
  });

  it("datasett og kommune, i begge rekkefølger og med småord", () => {
    for (const sok of ["kvikkleire Oslo", "Oslo kvikkleire", "kvikkleire i Oslo", "kvikkleire, Oslo kommune"]) {
      const t = tolk(sok);
      expect(t.dataset?.id).toBe("kvikkleire");
      expect(t.sted).toEqual({ status: "ok", sted: { kind: "kommune", number: "0301", name: "Oslo", county: "Oslo" } });
    }
    expect(tolk("datasenter Bærum").sted).toMatchObject({ status: "ok", sted: { number: "3201" } });
  });

  it("kjenner igjen kommuner med samisk parallellnavn", () => {
    expect(tolk("kvikkleire Trondheim").sted).toMatchObject({ status: "ok", sted: { kind: "kommune", number: "5001" } });
  });

  it("fylke når ingen kommune heter det", () => {
    expect(tolk("kvikkleire Trøndelag").sted).toMatchObject({ status: "ok", sted: { kind: "fylke", number: "50" } });
    expect(tolk("datasenter Akershus").sted).toMatchObject({ status: "ok", sted: { kind: "fylke", number: "32" } });
    // Oslo er både kommune og fylke. Kommunen vinner.
    expect(tolk("datasenter Oslo").sted).toMatchObject({ status: "ok", sted: { kind: "kommune" } });
  });

  it("gjetter ikke når stedet er flertydig", () => {
    const t = tolk("kvikkleire Herøy");
    expect(t.sted.status).toBe("flertydig");
    if (t.sted.status === "flertydig") expect(t.sted.valg.map((v) => v.number)).toEqual(["1515", "1818"]);
    expect(tolk("kvikkleire Herøy", "1818").sted).toMatchObject({ status: "ok", sted: { number: "1818", county: "Nordland" } });
  });

  it("ukjent sted er ukjent — ikke nærmeste treff", () => {
    expect(tolk("kvikkleire Osloo").sted).toEqual({ status: "ukjent", tekst: "osloo" });
    expect(tolk("kvikkleire Baerum").sted.status).toBe("ukjent");
  });

  it("ukjent datasett gir ingen treff, og later ikke som det er et fritekstsøk", () => {
    expect(tolk("radon Oslo").dataset).toBeNull();
    expect(tolk("").dataset).toBeNull();
    expect(tolk("Oslo").dataset).toBeNull();
  });

  it("deler av ord velger ikke et datasett", () => {
    expect(tolk("datasenteransatt").dataset).toBeNull();
  });
});

describe("område", () => {
  const firkant = { type: "Polygon" as const, coordinates: [[[10, 59], [11, 59], [11, 60], [10, 60], [10, 59]], [[10.4, 59.4], [10.6, 59.4], [10.6, 59.6], [10.4, 59.6], [10.4, 59.4]]] };

  it("punkt i flate, med hull", () => {
    expect(punktIFlate(10.2, 59.2, firkant)).toBe(true);
    expect(punktIFlate(10.5, 59.5, firkant)).toBe(false);
    expect(punktIFlate(11.5, 59.5, firkant)).toBe(false);
    expect(punktIFlate(10.2, 59.2, { type: "MultiPolygon", coordinates: [firkant.coordinates] })).toBe(true);
  });

  it("boks rundt flaten", () => {
    expect(boksFor(firkant)).toEqual({ minLng: 10, minLat: 59, maxLng: 11, maxLat: 60 });
  });

  it("leser kartutsnitt fra URL-en, og avviser alt annet", () => {
    expect(lesUtsnitt("10.6,59.8,10.9,60.0")).toEqual({ minLng: 10.6, minLat: 59.8, maxLng: 10.9, maxLat: 60 });
    for (const verdi of [undefined, "", "10,59,11", "a,b,c,d", "10.9,59.8,10.6,60.0", "-10,59,11,60", "10,40,11,60"]) expect(lesUtsnitt(verdi)).toBeNull();
    const km = utsnittKm({ minLng: 10, minLat: 59.5, maxLng: 11, maxLat: 60.5 });
    expect(km.bredde).toBeGreaterThan(50);
    expect(km.bredde).toBeLessThan(60);
    expect(km.hoyde).toBeCloseTo(111.13, 0);
  });
});

describe("kvikkleire i panelet og listen", () => {
  const rad = (subtype: string, attributes: Record<string, string | number | null>) => ({
    id: "id-1",
    external_id: "2031",
    title: "Kvikkleiresone",
    subtype,
    attributes,
    source_url: "https://www.nve.no/rapport",
    source_updated_at: null,
    geometry: { type: "Polygon" as const, coordinates: [[[10, 59], [10.1, 59], [10.1, 59.1], [10, 59]]] },
    center: { type: "Point" as const, coordinates: [10.05, 59.05] },
    total: 1,
  });
  const verdi = (f: ReturnType<typeof kvikkleireFeature>, label: string) => f.details.find((d) => d.label === label)?.value;

  it("kartlagt sone med risikoklasse og påvist kvikkleire", () => {
    const f = kvikkleireFeature(rad("kvikkleire_sone", { faregrad: "Høy", risikoklasse: 4, stabilitet: "paavist_lav_sikkerhet", konsekvens: "alvorlig", omradetype: "losneomrade", vurdertAar: 2019, undersokelse: null }), "Oslo");
    expect(f.kind).toBe("Kartlagt kvikkleiresone");
    expect(f.style).toBe("kvikkleire_sone");
    expect(f.summary).toBe("Kvikkleire påvist · risikoklasse 4 av 5");
    expect(verdi(f, "Risikoklasse")).toBe("4 av 5");
    expect(verdi(f, "Status")).toBe("Kvikkleire er påvist i sonen, med beregnet sikkerhetsfaktor under 1,4");
    expect(verdi(f, "Kommune")).toBe("Oslo");
    expect(verdi(f, "Vurdert")).toBe("2019");
    expect(f.sourceUrl).toBe("https://www.nve.no/rapport");
  });

  it("«mulig» er ikke «påvist»", () => {
    const f = kvikkleireFeature(rad("kvikkleire_sone", { faregrad: "Lav", risikoklasse: 2, stabilitet: "mulig", konsekvens: null, omradetype: "losneomrade", vurdertAar: null, undersokelse: null }), null);
    expect(f.summary).toBe("Mulig kvikkleire, ikke påvist · risikoklasse 2 av 5");
    expect(JSON.stringify(f)).not.toContain("Kvikkleire påvist");
  });

  it("sone uten risikoklasse sier ingenting om risikoklasse", () => {
    const f = kvikkleireFeature(rad("kvikkleire_sone", { faregrad: "Middels", risikoklasse: null, stabilitet: "mulig", konsekvens: null, omradetype: "utlopsomrade", vurdertAar: null, undersokelse: null }), null);
    expect(verdi(f, "Risikoklasse")).toBeUndefined();
    expect(f.summary).toBe("Mulig kvikkleire, ikke påvist");
    expect(verdi(f, "Områdetype")).toBe("utløpsområde");
  });

  it("utredet uten fare vises som det, med egen stil", () => {
    const f = kvikkleireFeature(rad("kvikkleire_utredet_uten_fare", { faregrad: "Ingen", risikoklasse: 0, stabilitet: "ikke_fare", konsekvens: "ingen", omradetype: "losneomrade", vurdertAar: null, undersokelse: null }), "Bærum");
    expect(f.kind).toBe("Utredet uten fare");
    expect(f.style).toBe("kvikkleire_uten_fare");
    expect(f.summary).toBe("Utredet: ikke fare");
    expect(verdi(f, "Type")).toBe("Utredet område uten fare for områdeskred");
  });

  it("et aktsomhetsområde presenteres aldri som en kartlagt sone", () => {
    expect(AKTSOMHET_TEKST.innenfor.tekst).toContain("ikke at kvikkleire er påvist");
    expect(AKTSOMHET_TEKST.innenfor.tekst).toContain("ikke en kartlagt kvikkleiresone");
    expect(AKTSOMHET_TEKST.ikke_kartlagt.tekst).toContain("sier ingenting om grunnen");
    const kvikkleire = EXPLORE_DATASETS.find((d) => d.id === "kvikkleire")!;
    expect(kvikkleire.needsArea).toBe(true);
    expect(kvikkleire.description).toContain("Aktsomhetsområdene er et annet");
  });
});
