import { describe, expect, it } from "vitest";
import { aapenLisens, GbifKantarellfunnProvider, GbifMultefunnProvider, GbifTyttebaerfunnProvider, KANTARELL, TYTTEBAER } from "@/lib/providers/gbif/multefunn";
import { KartverketN50MyrProvider, parseN50Myr } from "@/lib/providers/kartverket/n50-myr";

/**
 * Kildene bak det interne researchlaget for multefunn og myr (Oslo og Marka).
 */
const funn = (over: Record<string, unknown> = {}) => ({
  key: 100, decimalLatitude: 60.03638, decimalLongitude: 10.664691, occurrenceStatus: "PRESENT", year: 2024, month: 7, eventDate: "2024-07-12T10:30:00",
  coordinateUncertaintyInMeters: 10, license: "http://creativecommons.org/licenses/by/4.0/legalcode", datasetTitle: "Norwegian Species Observation Service", datasetName: "Lokalflora Oslo og Akershus",
  institutionCode: "nbf", basisOfRecord: "HUMAN_OBSERVATION", recordedBy: "Ola Nordmann", locality: "Bak hytta til Kari", ...over,
});

describe("GbifMultefunnProvider", () => {
  const p = new GbifMultefunnProvider();
  const norm = (features: unknown[]) => p.normalize({ features, documents: [] });

  it("lisens: bare CC BY 4.0 og CC0 tas inn", () => {
    expect(aapenLisens("http://creativecommons.org/licenses/by/4.0/legalcode")).toBe("CC BY 4.0");
    expect(aapenLisens("http://creativecommons.org/publicdomain/zero/1.0/legalcode")).toBe("CC0");
    expect(aapenLisens("http://creativecommons.org/licenses/by-nc/4.0/legalcode")).toBeNull();
    expect(aapenLisens(undefined)).toBeNull();
  });

  it("et funn blir et punkt med år, dato, presisjon, kilde og lisens — uten person og stedsbeskrivelse", () => {
    const { records, rejected, skipped } = norm([funn()]);
    expect([rejected, skipped]).toEqual([[], []]);
    expect(records[0]).toMatchObject({
      providerId: "gbif-multefunn-oslomarka", externalId: "100", category: "natur_intern", subtype: "multefunn", title: "Multe",
      geometry: { type: "Point", coordinates: [10.664691, 60.03638] },
      attributes: { aar: 2024, maaned: 7, dato: "2024-07-12", presisjonM: 10, datasett: "Norwegian Species Observation Service", prosjekt: "Lokalflora Oslo og Akershus", institusjon: "nbf", type: "observasjon", lisens: "CC BY 4.0", funnIRuta: 1, bilde: false, validert: false },
      sourceUrl: "https://www.gbif.org/occurrence/100",
    });
    expect(JSON.stringify(records)).not.toMatch(/Ola Nordmann|Bak hytta/);
  });

  it("utvalget: til stede, fra 2000, presisjon ≤ 100 m, åpen lisens, artsbestemt av et menneske", () => {
    const { records, skipped } = norm([
      funn({ key: 1, occurrenceStatus: "ABSENT" }),
      funn({ key: 2, year: 1998 }),
      funn({ key: 3, coordinateUncertaintyInMeters: 250 }),
      funn({ key: 4, coordinateUncertaintyInMeters: undefined }),
      funn({ key: 5, license: "http://creativecommons.org/licenses/by-nc/4.0/legalcode" }),
      funn({ key: 6, decimalLatitude: 60.1 }),
      // Pl@ntNet: artsbestemt automatisk fra bilde.
      funn({ key: 8, decimalLatitude: 60.2, datasetKey: "14d5676a-2c54-4f94-9023-1e8dcd822aa0" }),
    ]);
    expect(records.map((r) => r.externalId)).toEqual(["6"]);
    expect(skipped!.map((s) => s.externalId)).toEqual(["1", "2", "3", "4", "5", "8"]);
  });

  it("én per 100 m-rute: den nyeste, og ved likt år lavest nøkkel — uansett rekkefølge i kilden", () => {
    const sett = [funn({ key: 30, year: 2019 }), funn({ key: 20, year: 2025 }), funn({ key: 10, year: 2025 }), funn({ key: 40, year: 2021, decimalLatitude: 60.05 })];
    const a = norm(sett).records;
    const b = norm([...sett].reverse()).records;
    expect(a.map((r) => r.externalId).sort()).toEqual(["10", "40"]);
    expect(b.map((r) => r.externalId).sort()).toEqual(["10", "40"]);
    expect(a.find((r) => r.externalId === "10")!.attributes.funnIRuta).toBe(3);
  });

  it("en registrering uten nøkkel eller koordinat avvises, ikke gjettes", () => {
    const { records, rejected } = norm([{ ...funn(), key: undefined }, { ...funn({ key: 7 }), decimalLatitude: "60" }]);
    expect(records).toEqual([]);
    expect(rejected).toHaveLength(2);
  });
});

describe("GbifTyttebaerfunnProvider", () => {
  it("samme utvalg og samme felt som multe, med egen kilde-ID, art og takson", () => {
    const p = new GbifTyttebaerfunnProvider();
    expect([p.id, TYTTEBAER.taxonKey]).toEqual(["gbif-tyttebaerfunn-oslomarka", 2882835]);
    const { records, skipped } = p.normalize({ features: [funn(), funn({ key: 2, year: 1995 }), funn({ key: 3, decimalLatitude: 60.2, datasetKey: "14d5676a-2c54-4f94-9023-1e8dcd822aa0" })], documents: [] });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ providerId: "gbif-tyttebaerfunn-oslomarka", category: "natur_intern", subtype: "tyttebaerfunn", title: "Tyttebær", externalId: "100" });
    expect(skipped!.map((s) => s.externalId)).toEqual(["2", "3"]);
  });

  it("spør GBIF etter tyttebær, i samme boks som multe", async () => {
    const urler: string[] = [];
    const fetchImpl = (async (url: string) => {
      urler.push(String(url));
      return new Response(JSON.stringify(String(url).includes("/dataset/") ? { title: "Datasett" } : { results: [funn()], endOfRecords: true }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    const p = new GbifTyttebaerfunnProvider(fetchImpl);
    const bolker = [];
    for await (const b of p.fetch({ mode: "full" } as never)) bolker.push(b);
    expect(bolker).toHaveLength(1);
    expect(urler[0]).toContain("taxonKey=2882835");
    expect(urler[0]).toContain("decimalLatitude=59.78%2C60.3");
    expect(urler[0]).toContain("decimalLongitude=10.3%2C11.1");
  });
});

describe("GbifKantarellfunnProvider", () => {
  const p = new GbifKantarellfunnProvider();
  // 0,001° bredde ≈ 111 m.
  const sett = [
    funn({ key: 1, year: 2024, recordedBy: "A", media: [{}] }),
    funn({ key: 2, year: 2019, recordedBy: "B", decimalLatitude: 60.03738, fieldNotes: "Validationstatus: Approved Media" }),
    funn({ key: 3, year: 2019, recordedBy: "B", decimalLatitude: 60.03739 }),
    funn({ key: 4, year: 2012, recordedBy: "C", decimalLatitude: 60.0381 }),
    // 600 m unna: hører ikke til samme sted.
    funn({ key: 5, year: 2021, recordedBy: "D", decimalLatitude: 60.0418 }),
  ];

  it("kilde-ID, takson og gjentak er slått på", () => {
    expect([p.id, KANTARELL.taxonKey, KANTARELL.gjentak]).toEqual(["gbif-kantarellfunn-oslomarka", 5249504, true]);
  });

  it("teller registreringer innen 250 m: antall, ulike år og ulike observatører — også dem som tynnes bort", () => {
    const { records } = p.normalize({ features: sett, documents: [] });
    const a = records.find((r) => r.externalId === "1")!.attributes;
    expect(a).toMatchObject({ funnINaerheten: 4, aarINaerheten: 3, aarliste: "2012, 2019, 2024", observatorerINaerheten: 3, bilde: true, validert: false });
    const alene = records.find((r) => r.externalId === "5")!.attributes;
    expect(alene).toMatchObject({ funnINaerheten: 1, aarINaerheten: 1, aarliste: "2021", observatorerINaerheten: 1 });
    expect(records.find((r) => r.externalId === "2")!.attributes.validert).toBe(true);
    // Funnet fra 2012 deler 100 m-rute med et nyere og vises ikke selv — men det teller i opptellingen over.
    expect(records.map((r) => r.externalId).sort()).toEqual(["1", "2", "5"]);
  });

  it("observatørnavn brukes til å telle, men lagres ikke", () => {
    const { records } = p.normalize({ features: sett.map((f, i) => ({ ...f, recordedBy: `Fullt Navn ${i}` })), documents: [] });
    expect(JSON.stringify(records)).not.toMatch(/Fullt Navn/);
  });

  it("uverifiserte og automatisk godkjente registreringer tas ikke inn", () => {
    const { records, skipped } = p.normalize({ features: [funn({ key: 1, identificationVerificationStatus: "unverified" }), funn({ key: 2, decimalLatitude: 60.1, identificationVerificationStatus: "Approved | Automated" }), funn({ key: 3, decimalLatitude: 60.2, identificationVerificationStatus: "validated" })], documents: [] });
    expect(records.map((r) => r.externalId)).toEqual(["3"]);
    expect(skipped!.map((s) => s.reason)).toEqual(["uverifisert eller automatisk godkjent i kilden", "uverifisert eller automatisk godkjent i kilden"]);
  });

  it("multe får ikke gjentaksfeltene", () => {
    const a = new GbifMultefunnProvider().normalize({ features: sett, documents: [] }).records[0]!.attributes;
    expect(a.funnINaerheten).toBeUndefined();
    expect(a.aarliste).toBeUndefined();
  });
});

const GML = `<gml:FeatureCollection>
<gml:featureMember>
  <app:Skog gml:id="s1"><app:område><gml:Surface><gml:patches><gml:PolygonPatch><gml:exterior><gml:LinearRing><gml:posList>1 1 2 1 2 2 1 1</gml:posList></gml:LinearRing></gml:exterior></gml:PolygonPatch></gml:patches></gml:Surface></app:område></app:Skog>
</gml:featureMember>
<gml:featureMember>
  <app:Myr gml:id="m1"><app:oppdateringsdato>2016-12-02</app:oppdateringsdato><app:område><gml:Surface srsName="urn:ogc:def:crs:EPSG::25833"><gml:patches><gml:PolygonPatch>
    <gml:exterior><gml:LinearRing><gml:posList>265000 6660000 265200 6660000 265200 6660200 265000 6660200 265000 6660000</gml:posList></gml:LinearRing></gml:exterior>
    <gml:interior><gml:LinearRing><gml:posList>265050 6660050 265100 6660050 265100 6660100 265050 6660050</gml:posList></gml:LinearRing></gml:interior>
  </gml:PolygonPatch></gml:patches></gml:Surface></app:område></app:Myr>
</gml:featureMember>
<gml:featureMember>
  <app:Myr gml:id="m2"><app:oppdateringsdato>2020-01-01</app:oppdateringsdato><app:område><gml:Surface><gml:patches><gml:PolygonPatch>
    <gml:exterior><gml:LinearRing><gml:posList>-30000 6730000 -29900 6730000 -29900 6730100 -30000 6730000</gml:posList></gml:LinearRing></gml:exterior>
  </gml:PolygonPatch></gml:patches></gml:Surface></app:område></app:Myr>
</gml:featureMember>
</gml:FeatureCollection>`;

describe("KartverketN50MyrProvider", () => {
  it("leser bare Myr, med ytterring og hull", () => {
    const flater = parseN50Myr(GML, "0301") as { knr: string; ringer: number[][][]; oppdateringsdato: string }[];
    expect(flater).toHaveLength(2);
    expect(flater[0]).toMatchObject({ knr: "0301", oppdateringsdato: "2016-12-02" });
    expect(flater[0]!.ringer.map((r) => r.length)).toEqual([5, 4]);
  });

  it("myr i Oslo og Marka blir en flate i grader; myr utenfor boksen hoppes over", () => {
    const p = new KartverketN50MyrProvider();
    const { records, rejected, skipped } = p.normalize({ features: parseN50Myr(GML, "0301"), documents: [] });
    expect(rejected).toEqual([]);
    expect(skipped).toEqual([{ kind: "feature", externalId: null, reason: "utenfor Oslo og Marka" }]);
    expect(records).toHaveLength(1);
    const myr = records[0]!;
    expect(myr).toMatchObject({ providerId: "kartverket-n50-myr-oslomarka", category: "natur_intern", subtype: "myr", title: "Myr", externalId: "0301:26510_666010", attributes: { municipality_number: "0301" }, sourceUpdatedAt: "2016-12-02T00:00:00Z" });
    const [lng, lat] = (myr.geometry as { coordinates: number[][][] }).coordinates[0]![0]!;
    expect(lng).toBeGreaterThan(10.3);
    expect(lng).toBeLessThan(11.1);
    expect(lat).toBeGreaterThan(59.78);
    expect(lat).toBeLessThan(60.3);
    expect((myr.geometry as { coordinates: number[][][] }).coordinates).toHaveLength(2);
  });

  it("samme nøkkel to ganger får et løpenummer, så ingen flate overskriver en annen", () => {
    const p = new KartverketN50MyrProvider();
    const en = parseN50Myr(GML, "0301")[0];
    expect(p.normalize({ features: [en, en], documents: [] }).records.map((r) => r.externalId)).toEqual(["0301:26510_666010", "0301:26510_666010-2"]);
  });
});
