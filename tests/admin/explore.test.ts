import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AKTSOMHET_TEKST } from "@/lib/admin/explore/aktsomhet";
import { boksFor, lesUtsnitt, punktIFlate, utsnittKm } from "@/lib/admin/explore/area";
import { forurensetGrunnFeature } from "@/lib/admin/explore/forurenset-grunn";
import { kraftnettFeature } from "@/lib/admin/explore/kraftnett";
import { kvikkleireFeature } from "@/lib/admin/explore/kvikkleire";
import { plansakFeature } from "@/lib/admin/explore/plansaker";
import { tolkSok } from "@/lib/admin/explore/parse";
import { EXPLORE_DATASETS, MAX_LAG } from "@/lib/admin/explore/registry";

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

describe("nye datasett i søket", () => {
  it("plansaker, kraftnett og forurenset grunn velges av sine ord", () => {
    for (const sok of ["planer Bærum", "plansaker Bærum", "plan Bærum", "reguleringsplaner Bærum"]) expect(tolk(sok)).toMatchObject({ dataset: { id: "plansaker" }, sted: { status: "ok", sted: { number: "3201" } } });
    for (const sok of ["kraftlinjer Oslo", "kraftnett Oslo", "kraftlinje Oslo", "transformatorstasjoner Oslo", "transformatorstasjon Oslo"]) expect(tolk(sok)).toMatchObject({ dataset: { id: "kraftnett" }, sted: { status: "ok", sted: { number: "0301" } } });
    for (const sok of ["forurenset grunn Trondheim", "forurensning Trondheim", "Trondheim forurenset grunn"]) expect(tolk(sok)).toMatchObject({ dataset: { id: "forurenset-grunn" }, sted: { status: "ok", sted: { number: "5001" } } });
  });

  it("flerordsalias tar hele uttrykket: «grunn» blir ikke et sted", () => {
    expect(tolk("forurenset grunn")).toMatchObject({ dataset: { id: "forurenset-grunn" }, stedTekst: "", sted: { status: "ingen" } });
  });

  it("ingen ord velger to datasett, og alle har en policy", () => {
    const alle = EXPLORE_DATASETS.flatMap((d) => d.aliases.map((a) => [a, d.id] as const));
    expect(new Set(alle.map(([a]) => a)).size).toBe(alle.length);
    for (const d of EXPLORE_DATASETS) expect(d.policy).toBeDefined();
  });

  it("policyen følger beslutningene: forurenset grunn og datasentre er ikke for åpent kart", () => {
    const policy = Object.fromEntries(EXPLORE_DATASETS.map((d) => [d.id, d.policy]));
    expect(policy).toEqual({
      plansaker: { openMap: "ja", omrade: "ja" },
      kvikkleire: { openMap: "ja", omrade: "ja" },
      kraftnett: { openMap: "vurderes", omrade: "ja" },
      "forurenset-grunn": { openMap: "nei", omrade: "nei" },
      datasenter: { openMap: "nei", omrade: "egen beslutning" },
    });
  });

  it("alle store datasett krever område; bare datasentre vises for hele landet", () => {
    expect(Object.fromEntries(EXPLORE_DATASETS.map((d) => [d.id, d.needsArea]))).toEqual({
      plansaker: true,
      kvikkleire: true,
      kraftnett: true,
      "forurenset-grunn": true,
      datasenter: false,
    });
    expect(MAX_LAG).toBe(2);
  });
});

describe("plansaker i panelet", () => {
  const rad = (over: Record<string, unknown> = {}) =>
    ({
      id: "sak-1",
      title: "Detaljregulering for Storgata 1, boliger",
      type: "planning_started",
      municipality_number: "3201",
      announced_at: "2026-03-10",
      source_url: "https://plandata.ft.dibk.no/x",
      area_m2: 12345.6,
      attributes: { planId: "r2026001", plantype: "Detaljregulering", proposerType: "Foretak", tiltakstype: "bolig", formaal: "Legge til rette for boligbebyggelse" },
      documents: [
        { type: "Planvarsel", title: "Planvarsel.pdf", url: "https://plandata.ft.dibk.no/d/1", date: "2026-03-10" },
        { type: "Planinitiativ", title: "Planinitiativ", url: "https://plandata.ft.dibk.no/d/2", date: null },
        { type: "Annet", title: "Ugyldig", url: "javascript:alert(1)", date: null },
      ],
      geometry: { type: "Polygon", coordinates: [[[10, 59], [10.1, 59], [10.1, 59.1], [10, 59]]] },
      center: { type: "Point", coordinates: [10.05, 59.05] },
      total: 1,
      ...over,
    }) as Parameters<typeof plansakFeature>[0];
  const verdi = (f: ReturnType<typeof plansakFeature>, label: string) => f.details.find((d) => d.label === label)?.value;

  it("viser tiltakstype, formål som sitat, dato, kommune og dokumenter", () => {
    const f = plansakFeature(rad(), "Bærum");
    expect(f.kind).toBe("Varslet planoppstart");
    expect(verdi(f, "Tiltakstype")).toBe("Boligprosjekt");
    expect(verdi(f, "Formål")).toBe("«Legge til rette for boligbebyggelse»");
    expect(verdi(f, "Kommune")).toBe("Bærum");
    expect(verdi(f, "Plantype")).toBe("Detaljregulering");
    expect(verdi(f, "Dokumenter")).toBe("2");
    expect(f.links!.map((l) => l.url)).toEqual(["https://plandata.ft.dibk.no/d/1", "https://plandata.ft.dibk.no/d/2"]);
    expect(f.links!.map((l) => l.label)).toEqual(["Varsel om oppstart · Planvarsel.pdf · 10. mars 2026", "Planinitiativ · Planinitiativ"]);
    expect(f.href).toBe("/sak/sak-1");
  });

  it("uten formål står det ingenting om formål — vi oppsummerer ikke selv", () => {
    const f = plansakFeature(rad({ attributes: { plantype: "Detaljregulering" }, documents: [] }), null);
    expect(verdi(f, "Formål")).toBeUndefined();
    expect(verdi(f, "Dokumenter")).toBe("ingen i kilden");
    expect(f.links).toEqual([]);
  });

  it("dikter ikke status: forbeholdet står, og ingen ord om vedtak", () => {
    const f = plansakFeature(rad(), "Bærum");
    expect(f.explanation).toBe("Vi vet ikke om planene senere er vedtatt, endret eller lagt bort.");
    expect(JSON.stringify(f.details)).not.toMatch(/vedtatt|godkjent|avslått|pågår/i);
    // Ukjent dokumenttype vises ikke med kildens kode.
    const ukjent = plansakFeature(rad({ documents: [{ type: "NyKodeFraKilden", title: "Notat.pdf", url: "https://example.com/n", date: null }] }), null);
    expect(ukjent.links![0]!.label).toBe("Dokument · Notat.pdf");
  });
});

describe("kraftnett i panelet", () => {
  const rad = (subtype: string, title: string, attributes: Record<string, string | number | null>, geometry: unknown) =>
    ({ id: "k1", external_id: "e1", title, subtype, attributes, source_url: null, source_updated_at: null, geometry, center: { type: "Point", coordinates: [10, 60] }, total: 1 }) as Parameters<typeof kraftnettFeature>[0];
  const linje = { type: "LineString", coordinates: [[10, 60], [10.1, 60.1]] };

  it("ledning uten egennavn får spenningen som navn", () => {
    const f = kraftnettFeature(rad("kraftledning", "Kraftledning", { spenningKv: 132, nettnivaa: "regional", eier: "ELVIA AS", driftsattAar: null }, linje), "Oslo");
    expect(f.title).toBe("Kraftledning 132 kV");
    expect(f.style).toBe("kraftledning");
    expect(f.summary).toBe("132 kV · regionalnett · ELVIA AS");
    expect(f.details.map((d) => d.label)).toEqual(["Type", "Spenning", "Nettnivå", "Eier", "Kommune"]);
  });

  it("transformatorstasjon med navn, uten spenning", () => {
    const f = kraftnettFeature(rad("transformatorstasjon", "M584", { spenningKv: null, nettnivaa: null, eier: "NORDKYN KRAFTLAG SA", driftsattAar: 1958 }, { type: "Point", coordinates: [10, 60] }), null);
    expect(f.title).toBe("M584");
    expect(f.kind).toBe("Transformatorstasjon");
    expect(f.style).toBe("transformatorstasjon");
    expect(f.details).toEqual([
      { label: "Type", value: "Transformatorstasjon" },
      { label: "Navn", value: "M584" },
      { label: "Eier", value: "NORDKYN KRAFTLAG SA" },
      { label: "Satt i drift", value: "1958" },
    ]);
  });

  it("viser ikke rå feltnavn", () => {
    const f = kraftnettFeature(rad("kraftledning", "Kraftledning", { spenningKv: 50, nettnivaa: "regional", eier: null, driftsattAar: null }, linje), null);
    expect(JSON.stringify(f)).not.toMatch(/spenningKv|nettnivaa|driftsattAar/);
  });
});

describe("forurenset grunn i panelet", () => {
  const rad = (attributes: Record<string, string | number | boolean | null>) =>
    ({ id: "f1", external_id: "12534-D", title: "Bondelia gartneri", subtype: "forurenset_grunn", attributes, source_url: "https://grunnforurensning.miljodirektoratet.no/faktaark.html?lok_id=12534", source_updated_at: "2025-01-03T00:00:00Z", geometry: { type: "Polygon", coordinates: [[[10, 59], [10.1, 59], [10.1, 59.1], [10, 59]]] }, center: { type: "Point", coordinates: [10, 59] }, total: 1 }) as Parameters<typeof forurensetGrunnFeature>[0];
  const verdi = (f: ReturnType<typeof forurensetGrunnFeature>, label: string) => f.details.find((d) => d.label === label)?.value;

  it("lokalitet med rik metadata: myndighetens egne ord", () => {
    const f = forurensetGrunnFeature(rad({ status: "Godkjent", arealM2: 13943, arealbruk: "bebyggelseBolig", lokalitetType: "deponi", prosessStatus: "avsluttet", registrertAar: 2019, tilstandsklasse: "megetGod", paavirkningsgrad: "liteForurensning", harStoffopplysninger: false }), "Trondheim");
    expect(f.summary).toBe("Myndighetens vurdering: lite eller ikke forurenset");
    expect(verdi(f, "Vurdering")).toBe("Påvirkningsgrad 1 – lite eller ikke forurenset, ikke behov for tiltak uansett arealbruk");
    expect(verdi(f, "Oppfølging")).toBe("Saken er avsluttet");
    expect(verdi(f, "Tilstandsklasse")).toBe("1 – meget god");
    expect(verdi(f, "Arealbruk")).toBe("Boligbebyggelse");
    expect(verdi(f, "Lokalitet-ID")).toBe("12534-D");
    expect(f.sourceUrl).toContain("faktaark");
  });

  it("lokalitet med lite metadata viser bare det som finnes", () => {
    const f = forurensetGrunnFeature(rad({ paavirkningsgrad: "ukjentPåvirkning", arealbruk: "uavklart", harStoffopplysninger: false }), null);
    expect(f.details.map((d) => d.label)).toEqual(["Vurdering", "Stoffopplysninger", "Sist oppdatert i kilden", "Lokalitet-ID"]);
    expect(f.summary).toBe("Myndighetens vurdering: uavklart");
  });

  it("gjør ikke vurderingen sterkere enn kilden, og sier at datasettet er internt", () => {
    const akseptabel = forurensetGrunnFeature(rad({ paavirkningsgrad: "akseptabelForurensning" }), null);
    expect(JSON.stringify(akseptabel)).not.toMatch(/farlig|giftig|helsefare|alvorlig/i);
    expect(akseptabel.notice).toContain("Internt datasett");
    // En kode vi ikke kjenner, vises ikke rått.
    expect(forurensetGrunnFeature(rad({ paavirkningsgrad: "nyKode" }), null).summary).toBeNull();
  });
});
