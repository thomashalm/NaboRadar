import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AKTSOMHET_TEKST } from "@/lib/admin/explore/aktsomhet";
import { boksFor, lesUtsnitt, punktIFlate, utsnittKm } from "@/lib/admin/explore/area";
import { forurensetGrunnFeature } from "@/lib/admin/explore/forurenset-grunn";
import { kraftnettFeature } from "@/lib/admin/explore/kraftnett";
import { kvikkleireFeature } from "@/lib/admin/explore/kvikkleire";
import { multefunnFeature } from "@/lib/admin/explore/multefunn";
import { myrFeature } from "@/lib/admin/explore/myr";
import { PLANSAK_OVERLAPP, plansakOverlapp } from "@/lib/admin/explore/plansak-overlapp";
import { plansakFeature, plansakOverlappFeature } from "@/lib/admin/explore/plansaker";
import { tolkSok } from "@/lib/admin/explore/parse";
import { EKSEMPELKOMBINASJON, EKSEMPELSOK } from "@/lib/admin/explore/eksempler";
import { datasetMedId, EXPLORE_DATASETS, MAX_LAG } from "@/lib/admin/explore/registry";

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
      // Interne researchlag: aldri offentlige.
      multefunn: { openMap: "nei", omrade: "nei" },
      myr: { openMap: "nei", omrade: "nei" },
    });
  });

  it("alle store datasett krever område; bare datasentre vises for hele landet", () => {
    expect(Object.fromEntries(EXPLORE_DATASETS.map((d) => [d.id, d.needsArea]))).toEqual({
      plansaker: true,
      kvikkleire: true,
      kraftnett: true,
      "forurenset-grunn": true,
      datasenter: false,
      multefunn: false,
      myr: true,
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

describe("eksemplene i tomtilstanden", () => {
  it("hvert eksempelsøk treffer et datasett og et sted som finnes", () => {
    expect(EKSEMPELSOK.map((sok) => { const t = tolk(sok); return [t.dataset?.id, t.sted.status]; })).toEqual([
      ["plansaker", "ok"],
      ["kvikkleire", "ok"],
      ["kraftnett", "ok"],
      ["datasenter", "ingen"],
    ]);
  });

  it("eksempelkombinasjonen er to ulike datasett for et sted — ingen egen syntaks", () => {
    const t = tolk(EKSEMPELKOMBINASJON.q);
    expect(t).toMatchObject({ dataset: { id: "plansaker" }, sted: { status: "ok" } });
    expect(datasetMedId(EKSEMPELKOMBINASJON.lag)?.id).toBe("kvikkleire");
    expect(EKSEMPELKOMBINASJON.q).not.toContain("+");
  });
});

describe("Finn overlapp: hva en plansak traff", () => {
  const treff = (id: string, title: string, subtype: string, attributes: Record<string, string | number | boolean | null> = {}) => ({ id, external_id: `e-${id}`, title, subtype, attributes });

  it("kvikkleire: antall soner, og for hver sone det kilden har", () => {
    const r = plansakOverlapp("kvikkleire", [
      treff("1", "Bjørvika", "kvikkleire_sone", { stabilitet: "paavist", risikoklasse: 4, faregrad: "Middels", konsekvens: "megetAlvorlig" }),
      treff("2", "Uten klasse", "kvikkleire_sone", {}),
    ], 2)!;
    expect(r.summary).toBe("Overlapper 2 kartlagte kvikkleiresoner");
    expect(r.analysis.heading).toBe("Overlapper kvikkleire");
    expect(r.analysis.lines).toEqual(["Planområdet overlapper 2 kartlagte kvikkleiresoner."]);
    expect(r.analysis.items[0]).toMatchObject({ id: "1", title: "Bjørvika" });
    expect(r.analysis.items[0]!.lines).toContain("Risikoklasse: 4 av 5");
    expect(r.analysis.items[0]!.lines).toContain("Faregrad: middels");
    // En sone uten risikoklasse får ingen risikoklasse — heller ikke «ukjent» eller 0.
    expect(r.analysis.items[1]!.lines.join(" ")).not.toMatch(/Risikoklasse|Faregrad/);
    expect(plansakOverlapp("kvikkleire", [treff("1", "A", "kvikkleire_sone")], 1)!.summary).toBe("Overlapper 1 kartlagt kvikkleiresone");
  });

  it("løsneområde og utløpsområde med samme navn er én sone, ikke to", () => {
    const r = plansakOverlapp("kvikkleire", [
      treff("1", "Kjelsås", "kvikkleire_sone", { risikoklasse: 5, omradetype: "losneomrade" }),
      treff("2", "Frysja", "kvikkleire_sone", { risikoklasse: 3, omradetype: "utlopsomrade" }),
      treff("3", "Kjelsås", "kvikkleire_sone", { risikoklasse: 5, omradetype: "utlopsomrade" }),
    ], 3)!;
    expect(r.summary).toBe("Overlapper 2 kartlagte kvikkleiresoner");
    expect(r.analysis.items.map((i) => [i.id, i.title])).toEqual([["1", "Kjelsås"], ["2", "Frysja"]]);
    expect(r.analysis.items[0]!.lines.at(-1)).toBe("Del av sonen som treffes: løsneområde og utløpsområde");
    expect(r.analysis.items[1]!.lines.at(-1)).toBe("Del av sonen som treffes: utløpsområde");
  });

  it("forurenset grunn: sier ikke at planområdet er forurenset", () => {
    const r = plansakOverlapp("forurenset-grunn", [treff("1", "Gamle verksted", "forurenset_grunn", { paavirkningsgrad: "liteForurensning", prosessStatus: "avsluttet" })], 3)!;
    expect(r.summary).toBe("Overlapper 3 registrerte lokaliteter for forurenset grunn");
    expect(r.analysis.lines[0]).toBe("Planområdet overlapper 3 registrerte lokaliteter for forurenset grunn.");
    expect(r.analysis.lines[1]).toContain("Det sier ikke at hele planområdet er forurenset.");
    expect(r.analysis.items[0]!.lines[0]).toBe("Vurdering: Påvirkningsgrad 1 – lite eller ikke forurenset, ikke behov for tiltak uansett arealbruk");
    // Tre traff, én er beskrevet: resten sies fra om.
    expect(r.analysis.more).toBe(2);
  });

  it("kraftnett: ledning krysser, stasjon ligger innenfor — to ulike ting", () => {
    const r = plansakOverlapp("kraftnett", [
      treff("1", "Kraftledning", "kraftledning", { spenningKv: 132 }),
      treff("2", "Kraftledning", "kraftledning", { spenningKv: 47 }),
      treff("3", "Sandvika", "transformatorstasjon", { spenningKv: 47 }),
    ], 3)!;
    expect(r.summary).toBe("2 kraftledninger krysser planområdet · 1 transformatorstasjon ligger innenfor");
    expect(r.analysis.lines).toEqual(["2 kraftledninger krysser planområdet.", "1 transformatorstasjon ligger innenfor."]);
    expect(r.analysis.items.map((i) => i.title)).toEqual(["Kraftledning 132 kV", "Kraftledning 47 kV", "Sandvika"]);
    expect(plansakOverlapp("kraftnett", [treff("1", "Kraftledning", "kraftledning")], 1)!.summary).toBe("1 kraftledning krysser planområdet");
  });

  it("språket er en geometrisk observasjon, ikke en vurdering", () => {
    const alt = JSON.stringify([
      plansakOverlapp("kvikkleire", [treff("1", "A", "kvikkleire_sone", { risikoklasse: 5 })], 1),
      plansakOverlapp("forurenset-grunn", [treff("1", "A", "forurenset_grunn", { paavirkningsgrad: "alvorligForurensning" })], 1),
      plansakOverlapp("kraftnett", [treff("1", "A", "kraftledning")], 1),
      PLANSAK_OVERLAPP,
    ]);
    expect(alt).not.toMatch(/farlig|problematisk|planlagt på|risikabel|utrygg|bør ikke|ST_|intersect/i);
  });

  it("bare plansaker kan filtreres, og bare mot de tre lagene", () => {
    expect(EXPLORE_DATASETS.filter((d) => d.overlap).map((d) => d.id)).toEqual(["plansaker"]);
    expect(Object.keys(PLANSAK_OVERLAPP)).toEqual(["kvikkleire", "forurenset-grunn", "kraftnett"]);
    expect(plansakOverlapp("datasenter", [], 0)).toBeNull();
  });

  it("analysen legges ved plansaken, ikke inn i kildens felt", () => {
    const rad = {
      id: "sak-1", title: "Storgata 1", type: "planning_started", municipality_number: "0301", announced_at: "2026-03-10", source_url: null, area_m2: 100,
      attributes: {}, documents: [], geometry: { type: "Polygon", coordinates: [] }, center: { type: "Point", coordinates: [10, 59] }, total: 1,
      hits: [treff("1", "Bjørvika", "kvikkleire_sone")], hit_count: 1, area_total: 53, edge_only: 0,
    } as Parameters<typeof plansakOverlappFeature>[0];
    const f = plansakOverlappFeature(rad, "Oslo", "kvikkleire");
    expect(f.summary).toMatch(/^Overlapper 1 kartlagt kvikkleiresone · /);
    expect(f.analysis?.heading).toBe("Overlapper kvikkleire");
    expect(JSON.stringify(f.details)).not.toMatch(/kvikkleire/i);
    expect(f.explanation).toBe("Vi vet ikke om planene senere er vedtatt, endret eller lagt bort.");
  });
});

describe("multefunn og myr: interne researchlag", () => {
  it("søkeordene velger riktig datasett", () => {
    for (const sok of ["multer Oslo", "multe Oslo", "multefunn Oslo", "registrerte multefunn Oslo"]) expect(tolk(sok)).toMatchObject({ dataset: { id: "multefunn" }, sted: { status: "ok", sted: { number: "0301" } } });
    expect(tolk("multefunn")).toMatchObject({ dataset: { id: "multefunn" }, sted: { status: "ingen" } });
    for (const sok of ["myr Oslo", "myrer Oslo", "Oslo myr"]) expect(tolk(sok)).toMatchObject({ dataset: { id: "myr" }, sted: { status: "ok" } });
    // «myr» er et eget ord: «Myrvoll» er ikke et søk etter myr.
    expect(tolk("myrvoll").dataset).toBeNull();
  });

  it("begge sier hvor de dekker", () => {
    for (const id of ["multefunn", "myr"]) {
      const d = EXPLORE_DATASETS.find((x) => x.id === id)!;
      expect(d.coverage).toEqual({ label: "Oslo og Marka", box: { minLng: 10.3, minLat: 59.78, maxLng: 11.1, maxLat: 60.3 } });
      expect(d.description).toContain("Dekker bare Oslo og Marka");
    }
  });

  const punkt = { type: "Point" as const, coordinates: [10.66, 60.03] };
  const funn = (attributes: Record<string, string | number | null>) =>
    ({ id: "f1", external_id: "6444831430", title: "Multe", subtype: "multefunn", attributes, source_url: "https://www.gbif.org/occurrence/6444831430", source_updated_at: null, geometry: punkt, center: punkt, total: 1 }) as Parameters<typeof multefunnFeature>[0];
  const verdi = (f: { details: { label: string; value: string }[] }, label: string) => f.details.find((d) => d.label === label)?.value;

  it("et funn viser dato, år, presisjon, kilde og lisens — og ingen person", () => {
    const f = multefunnFeature(funn({ aar: 2026, maaned: 7, dato: "2026-07-12", presisjonM: 10, datasett: "Norwegian Species Observation Service", institusjon: "nbf", type: "observasjon", lisens: "CC BY 4.0", funnIRuta: 3 }), 2026);
    expect(f.title).toBe("Multefunn, juli 2026");
    expect(f.kind).toBe("Registrert funn");
    expect(verdi(f, "Art")).toBe("Multe (Rubus chamaemorus)");
    expect(verdi(f, "Dato")).toBe("12. juli 2026");
    expect(verdi(f, "Registreringsår")).toBe("2026");
    expect(verdi(f, "Presisjon")).toBe("10 m");
    expect(verdi(f, "Lisens")).toBe("CC BY 4.0");
    expect(verdi(f, "Funn i samme 100 m-rute")).toBe("3 (det nyeste vises)");
    expect(f.sourceName).toBe("Norwegian Species Observation Service via GBIF (CC BY 4.0)");
    expect(f.explanation).toBe("Registrert observasjon – sier ikke noe sikkert om forekomst i dag.");
    expect(f.notice).toBe("Internt researchlag. Ikke offentlig.");
    expect(f.details.map((d) => d.label)).not.toEqual(expect.arrayContaining(["Observatør", "Finner", "Lokalitet"]));
  });

  it("et gammelt funn tolkes ikke som en bestand", () => {
    const f = multefunnFeature(funn({ aar: 2004, maaned: null, dato: null, presisjonM: 100, lisens: "CC BY 4.0", funnIRuta: 1 }), 2026);
    expect(f.title).toBe("Multefunn, 2004");
    expect(f.explanation).toContain("Funnet er fra 2004: det sier lite om hva som står der nå.");
    expect(verdi(f, "Funn i samme 100 m-rute")).toBeUndefined();
    expect(JSON.stringify(f)).not.toMatch(/bestand|vokser her|sannsynlig|lovende/i);
  });

  const flate = { type: "Polygon" as const, coordinates: [[[10.6, 60.0], [10.61, 60.0], [10.61, 60.01], [10.6, 60.0]]] };
  const myr = (over: Record<string, unknown>) =>
    ({ id: "m1", external_id: "0301:1_2", title: "Myr", subtype: "myr", attributes: { municipality_number: "0301" }, source_url: null, source_updated_at: "2016-12-02T00:00:00Z", geometry: flate, center: punkt, total: 1, area_m2: 24_300, finds_500: 0, nearest_m: null, nearest_id: null, nearest_year: null, ...over }) as Parameters<typeof myrFeature>[0];

  it("myr med flere funn i nærheten: antall innen 500 m og nærmeste funn", () => {
    const f = myrFeature(myr({ finds_500: 4, nearest_m: 183.4, nearest_id: "f1", nearest_year: 2023 }), "Oslo");
    expect(f.title).toBe("Myr, 24 dekar");
    expect(f.summary).toBe("4 registrerte multefunn innen 500 m");
    expect(f.analysis).toMatchObject({ label: "Registrerte multefunn i nærheten", heading: "4 registrerte multefunn innen 500 m", lines: ["Nærmeste registrerte funn: 180 m."] });
    expect(f.analysis!.items).toEqual([{ id: "f1", title: "Nærmeste funn", lines: ["180 m unna, registrert 2023"] }]);
    expect(verdi(f, "Kommune")).toBe("Oslo");
  });

  it("funn på selve myra, ett funn, og funn lenger unna enn 500 m", () => {
    expect(myrFeature(myr({ finds_500: 1, nearest_m: 0, nearest_id: "f1", nearest_year: 2021 }), null).analysis).toMatchObject({ heading: "1 registrert multefunn innen 500 m", lines: ["Nærmeste registrerte funn: på myra."] });
    expect(myrFeature(myr({ finds_500: 1, nearest_m: 3.7, nearest_id: "f1", nearest_year: 2021 }), null).analysis!.lines).toEqual(["Nærmeste registrerte funn: i myrkanten."]);
    const langt = myrFeature(myr({ finds_500: 0, nearest_m: 1340, nearest_id: "f1", nearest_year: 2019 }), null);
    expect(langt.summary).toBe("Nærmeste registrerte funn: 1,3 km");
    expect(langt.analysis!.heading).toBe("0 registrerte multefunn innen 500 m");
  });

  it("myr uten funn i nærheten: sier det, uten å gjøre det til en vurdering", () => {
    const f = myrFeature(myr({ area_m2: 3_400 }), null);
    expect(f.title).toBe("Myr, 3,4 dekar");
    expect(f.summary).toBe("Ingen registrerte funn innen 2 km");
    expect(f.analysis!.items).toEqual([]);
    expect(f.analysis!.note).toContain("Ikke en sannsynlighet og ikke en vurdering av myra");
  });

  it("ingen score og ingen sannsynlighet i noen tekst", () => {
    const alt = JSON.stringify([
      myrFeature(myr({ finds_500: 9, nearest_m: 0, nearest_id: "f1", nearest_year: 2025 }), "Oslo"),
      multefunnFeature(funn({ aar: 2025, maaned: 8, presisjonM: 5, lisens: "CC0", funnIRuta: 1 }), 2026),
      EXPLORE_DATASETS.filter((d) => ["multefunn", "myr"].includes(d.id)).map((d) => d.description),
    ]).replace("Ikke en sannsynlighet", "");
    expect(alt).not.toMatch(/lovende|sannsynlig|score|poeng|egnet|her vokser|bekreftet/i);
  });
});
