import { describe, expect, it } from "vitest";
import { KartverketN50HytterProvider, n50ArchiveUrls, parseN50Huts } from "@/lib/providers/kartverket/n50-hytter";

const hytte = (o: { navn?: string; grad: string; eier?: string; tilgang?: string; pos?: string }) => `
  <gml:featureMember>
    <app:Bygning gml:id="id-${Math.random()}">
      <app:oppdateringsdato>2025-01-04</app:oppdateringsdato>
      <app:posisjon><gml:Point srsName="urn:ogc:def:crs:EPSG::25833"><gml:pos>${o.pos ?? "258507.71 6663353.82"}</gml:pos></gml:Point></app:posisjon>
      <app:bygningstype>956</app:bygningstype>
      <app:hytteinformasjon><app:Hytteinformasjon>
        <app:betjeningsgrad>${o.grad}</app:betjeningsgrad>
        <app:hytteeier>${o.eier ?? "1"}</app:hytteeier>
        <app:tilgjengelighet>${o.tilgang ?? "Ulåst"}</app:tilgjengelighet>
      </app:Hytteinformasjon></app:hytteinformasjon>
      ${o.navn === undefined ? "" : `<app:navn>${o.navn}</app:navn>`}
    </app:Bygning>
  </gml:featureMember>`;

const annenBygning = `
  <gml:featureMember>
    <app:Bygning gml:id="id-hus"><app:bygningstype>111</app:bygningstype><app:navn>Et hus</app:navn></app:Bygning>
  </gml:featureMember>`;

const gml = (...medlemmer: string[]) => `<gml:FeatureCollection>${medlemmer.join("")}</gml:FeatureCollection>`;

describe("N50: lesing av hytteobjekter", () => {
  it("plukker bare bygninger med hytteinformasjon", () => {
    const huts = parseN50Huts(gml(annenBygning, hytte({ navn: "Kobberhaughytta", grad: "Betjent" }), annenBygning), "0301");
    expect(huts).toEqual([
      {
        knr: "0301",
        navn: "Kobberhaughytta",
        betjeningsgrad: "Betjent",
        hytteeier: "1",
        tilgjengelighet: "Ulåst",
        oppdateringsdato: "2025-01-04",
        easting: 258507.71,
        northing: 6663353.82,
      },
    ]);
  });

  it("dekoder XML-tegn i navnet", () => {
    const [hut] = parseN50Huts(gml(hytte({ navn: "Ommen &amp; Veslestua", grad: "Ubetjent" })), "3212") as { navn: string }[];
    expect(hut!.navn).toBe("Ommen & Veslestua");
  });

  it("finner UTM 33-arkivet per kommune i feeden", () => {
    const feed = `
      <link href="https://nedlasting.geonorge.no/geonorge/Basisdata/N50Kartdata/GML/Basisdata_0301_Oslo_25832_N50Kartdata_GML.zip"/>
      <link href="https://nedlasting.geonorge.no/geonorge/Basisdata/N50Kartdata/GML/Basisdata_0301_Oslo_25833_N50Kartdata_GML.zip"/>
      <link href="https://nedlasting.geonorge.no/geonorge/Basisdata/N50Kartdata/GML/Basisdata_3201_Berum_25833_N50Kartdata_GML.zip"/>`;
    const urls = n50ArchiveUrls(feed);
    expect([...urls.keys()]).toEqual(["0301", "3201"]);
    expect(urls.get("0301")).toContain("_25833_");
  });
});

describe("N50: normalisering", () => {
  const provider = new KartverketN50HytterProvider();
  const normaliser = (...medlemmer: string[]) =>
    provider.normalize({ features: parseN50Huts(gml(...medlemmer), "0301"), documents: [] });

  it("oversetter kildens klasser uten å legge til noe", () => {
    const { records } = normaliser(
      hytte({ navn: "Kobberhaughytta", grad: "Betjent", eier: "1", tilgang: "Ulåst" }),
      hytte({ navn: "Sellanrå", grad: "Selvbetjent", eier: "2", tilgang: "Låst" }),
      hytte({ navn: "Breimåsahytta", grad: "Ubetjent", eier: "3", tilgang: "Låst" }),
      hytte({ navn: "Fjellsjøkoia", grad: "Rastebu", eier: "4" }),
    );
    expect(records.map((r) => [r.title, r.attributes.hut_type, r.attributes.owner_kind, r.attributes.locked, r.attributes.overnight])).toEqual([
      ["Kobberhaughytta", "staffed_hut", "dnt", false, "yes"],
      ["Sellanrå", "self_service_hut", "other", true, "yes"],
      ["Breimåsahytta", "unstaffed_hut", "fjellstyre", true, "yes"],
      // En rastebu er ikke en overnattingshytte, selv om ordet «hytte» ofte brukes om den.
      ["Fjellsjøkoia", "rest_cabin", "statskog", false, "no"],
    ]);
    const [første] = records;
    expect(første).toMatchObject({ category: "hytte_kilde", externalId: "0301:kobberhaughytta", sourceUpdatedAt: "2025-01-04T00:00:00.000Z" });
    // Kilden har ikke sengetall, sesong eller navngitt forvalter. Da står de tomme.
    expect(første!.attributes).toMatchObject({ beds: null, manager_name: null, municipality_number: "0301" });
    // Koordinaten er regnet om fra UTM 33 til lengde- og breddegrad.
    const [lng, lat] = (første!.geometry as unknown as { coordinates: [number, number] }).coordinates;
    expect(lng).toBeCloseTo(10.66365, 4);
    expect(lat).toBeCloseTo(60.0361, 4);
  });

  it("lagrer «Udefinert» tilgang som ukjent, ikke som ulåst", () => {
    // Kodelisten: Udefinert = «Irrelevant/ikke aktuell». Det er ikke en opplysning om døra.
    const { records, rejected } = normaliser(hytte({ navn: "Udefinertbu", grad: "Ubetjent", tilgang: "Udefinert" }));
    expect(rejected).toEqual([]);
    expect(records[0]!.attributes.locked).toBeNull();
  });

  it("utelater serveringshytter, gapahuker, hytter uten navn og alt utenfor piloten — som valg, ikke feil", () => {
    const { records, rejected, skipped } = normaliser(
      hytte({ navn: "Ullevålseter", grad: "Serveringshytte" }),
      hytte({ navn: "Gapahuken", grad: "Gapahuk" }),
      hytte({ grad: "Ubetjent" }),
      // Tromsø: gyldig hytte, men utenfor pilotområdet.
      hytte({ navn: "Skarvassbu", grad: "Ubetjent", pos: "653000 7730000" }),
    );
    expect(records).toEqual([]);
    expect(rejected).toEqual([]);
    expect(skipped!.map((s) => s.reason)).toEqual([
      "Serveringshytte tas ikke inn",
      "Gapahuk tas ikke inn",
      "hytte uten navn",
      "utenfor pilotområdet",
    ]);
  });

  it("avviser en klasse kilden ikke har hatt før, i stedet for å gjette", () => {
    const { records, rejected } = normaliser(hytte({ navn: "Ny type", grad: "Glamping" }));
    expect(records).toEqual([]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toContain("betjeningsgrad");
  });

  it("skiller to hytter med samme navn i samme kommune på posisjonen", () => {
    const { records } = normaliser(
      hytte({ navn: "Ringkolltoppen", grad: "Rastebu", pos: "258500.00 6663300.00" }),
      hytte({ navn: "Ringkolltoppen", grad: "Ubetjent", pos: "258590.00 6663430.00" }),
      hytte({ navn: "Kobberhaughytta", grad: "Betjent" }),
    );
    expect(records.map((r) => r.externalId)).toEqual([
      "0301:ringkolltoppen@25850_666330",
      "0301:ringkolltoppen@25859_666343",
      "0301:kobberhaughytta",
    ]);
  });
});
