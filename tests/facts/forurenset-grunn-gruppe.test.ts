import { describe, expect, it } from "vitest";
import { contaminatedFacts, erRelevantForurensning, groupFacts } from "@/lib/facts/queries";
import { AREA_SECTIONS, sectionOrder } from "@/types/area-feature";

/**
 * «Forurenset grunn» vises som én kompakt gruppe, som resten av siden.
 *
 * Offentlig vises bare relevante funn — grad 3, grad X og pågående tiltak. Finnes ingen,
 * forsvinner seksjonen. Admin ser alle registreringene, slik datagrunnlaget faktisk er.
 */

type Row = Parameters<typeof contaminatedFacts>[0][number];

const flate = (n: number) => ({
  type: "Polygon" as const,
  coordinates: [[[10.7, 59.9], [10.7 + n / 1e4, 59.9], [10.7 + n / 1e4, 59.9 + n / 1e4], [10.7, 59.9]]],
});

function lokalitet(overrides: {
  title: string;
  distance_m: number;
  grad: string;
  contains?: boolean;
  prosess?: string;
  oppdatert?: string;
  type?: string;
}): Row {
  return {
    id: `${overrides.title}-${overrides.distance_m}`,
    provider_id: "mdir-forurenset-grunn",
    external_id: `e${overrides.distance_m}`,
    category: "miljo",
    subtype: "forurenset_grunn",
    title: overrides.title,
    distance_m: overrides.distance_m,
    contains: overrides.contains ?? false,
    attributes: {
      paavirkningsgrad: overrides.grad,
      ...(overrides.prosess ? { prosessStatus: overrides.prosess } : {}),
      ...(overrides.type ? { lokalitetType: overrides.type } : {}),
    },
    source_url: "https://grunnforurensning.miljodirektoratet.no/",
    source_url_type: "factsheet",
    source_updated_at: overrides.oppdatert ?? null,
    centroid: { type: "Point", coordinates: [10.7, 59.9] },
    geometry: flate(overrides.distance_m),
  } as Row;
}

const grad3 = (title: string, distance_m: number, contains = false) =>
  lokalitet({ title, distance_m, grad: "ikkeAkseptabelForurensning", contains });
const gradX = (title: string, distance_m: number, contains = false) =>
  lokalitet({ title, distance_m, grad: "ukjentPåvirkning", contains });
const grad1 = (title: string, distance_m: number, contains = false) =>
  lokalitet({ title, distance_m, grad: "liteForurensning", contains });
const grad2 = (title: string, distance_m: number) =>
  lokalitet({ title, distance_m, grad: "akseptabelForurensning" });

/** Nordbergveien slik den ligger i kilden: deponi, grad 1, oppfølging uavklart, oppdatert 2010. */
const nordbergveien = lokalitet({
  title: "Nordbergveien",
  distance_m: 0,
  contains: true,
  grad: "liteForurensning",
  prosess: "uavklart",
  type: "deponi",
  oppdatert: "2010-10-12T00:00:00.000Z",
});

const seks = [
  grad3("Gammel bensinstasjon", 120),
  grad1("Tidligere verksted", 200),
  grad1("Skoletomta", 260),
  grad2("Havnelageret", 300),
  grad2("Parken", 380),
  grad2("Kaia", 460),
];

describe("hvilke registreringer som er relevante offentlig", () => {
  it("grad 3 og X er relevante, grad 1 og 2 er det ikke", () => {
    expect(erRelevantForurensning({ grade: "ikkeAkseptabelForurensning" })).toBe(true);
    expect(erRelevantForurensning({ grade: "ukjentPåvirkning" })).toBe(true);
    expect(erRelevantForurensning({ grade: "liteForurensning" })).toBe(false);
    expect(erRelevantForurensning({ grade: "akseptabelForurensning" })).toBe(false);
  });

  it("oppfølging uavklart alene gjør ikke grad 1 eller 2 relevant", () => {
    expect(erRelevantForurensning({ grade: "liteForurensning", prosessStatus: "uavklart" })).toBe(false);
    expect(erRelevantForurensning({ grade: "akseptabelForurensning", prosessStatus: "uavklart" })).toBe(false);
  });

  it("pågående tiltak er relevant uansett grad", () => {
    expect(erRelevantForurensning({ grade: "akseptabelForurensning", prosessStatus: "tiltakIgangsatt" })).toBe(true);
    expect(erRelevantForurensning({ grade: "liteForurensning", prosessStatus: "tiltakIgangsatt" })).toBe(true);
  });
});

describe("Forurenset grunn offentlig", () => {
  it("A: Nordbergveien – lite forurenset, ingen tiltak, gammel kilde – gir ingen seksjon", () => {
    expect(contaminatedFacts([nordbergveien], 500)).toBeNull();
    // Heller ikke sammen med andre svake registreringer.
    expect(contaminatedFacts([nordbergveien, grad1("Verksted", 200), grad2("Kaia", 300)], 500)).toBeNull();
    // Og seksjonen forsvinner helt fra siden — ingen «0 funn», ingen «alt er trygt».
    expect(groupFacts([], [], AREA_SECTIONS, []).map((g) => g.sectionId)).not.toContain("forurenset-grunn");
  });

  it("B: grad 3 vises, med kildens egen ordlyd", () => {
    const resultat = contaminatedFacts([grad3("Gammel bensinstasjon", 120)], 500)!;
    const kort = resultat.cluster.facts[0]!;
    expect(kort.headline).toBe("Gammel bensinstasjon");
    expect(kort.details.join(" ")).toContain("ikke akseptabel, og det er behov for tiltak");
    expect(kort.caveat).toContain("ikke nødvendigvis hele eiendommen");
    expect(resultat.cluster.summary).toBe("1 med behov for tiltak");
  });

  it("C: grad X ved søkepunktet vises og løfter fortsatt seksjonen øverst", () => {
    const resultat = contaminatedFacts([gradX("Under huset", 0, true)], 500)!;
    expect(resultat.cluster.facts.map((f) => f.headline)).toEqual(["Under huset"]);
    expect(resultat.cluster.summary).toBe("1 med uavklart mistanke");
    expect(resultat.affectsSearchPoint).toBe(true);
    expect(contaminatedFacts([grad3("Under huset", 0, true)], 500)!.affectsSearchPoint).toBe(true);

    const grupper = groupFacts([], [], sectionOrder({ contaminationAtSearchPoint: true }), [resultat.cluster]);
    expect(grupper[0]!.sectionId).toBe("forurenset-grunn");
    expect(grupper[0]!.clusters[0]!.facts).toHaveLength(1);
  });

  it("D: flere lave registreringer og ett alvorlig funn – bare det alvorlige vises", () => {
    const resultat = contaminatedFacts(seks, 500)!;
    expect(resultat.cluster.facts.map((f) => f.headline)).toEqual(["Gammel bensinstasjon"]);
    expect(resultat.cluster.summary).toBe("1 med behov for tiltak");
    // Ingen «Se alle» med grad 1 og 2, og bare den relevante flaten i kartet.
    expect(resultat.cluster.overview).toBeNull();
    expect(resultat.mapFeatures.map((f) => f.title)).toEqual(["Gammel bensinstasjon"]);
  });

  it("E: et gammelt, alvorlig funn skjules ikke på grunn av alder", () => {
    const gammelt = lokalitet({
      title: "Gammelt verft",
      distance_m: 150,
      grad: "ikkeAkseptabelForurensning",
      oppdatert: "2008-03-01T00:00:00.000Z",
    });
    const resultat = contaminatedFacts([gammelt], 500)!;
    expect(resultat.cluster.facts.map((f) => f.headline)).toEqual(["Gammelt verft"]);
    // Datoen er kildens oppdateringsdato, og sies som det.
    expect(resultat.cluster.facts[0]!.sourceDateLabel).toBe("Kildedata sist oppdatert 2008");
  });

  it("grad 1 ved søkepunktet gir ikke lenger kort, og løfter ikke seksjonen", () => {
    const resultat = contaminatedFacts([grad1("Under huset", 0, true), grad3("Nabo", 300)], 500)!;
    expect(resultat.cluster.facts.map((f) => f.headline)).toEqual(["Nabo"]);
    expect(resultat.affectsSearchPoint).toBe(false);
  });

  it("pågående tiltak på grad 2 vises, med egen tekst", () => {
    const pagar = lokalitet({ title: "Opprydding pågår", distance_m: 90, grad: "akseptabelForurensning", prosess: "tiltakIgangsatt" });
    const resultat = contaminatedFacts([pagar, grad2("Kaia", 300)], 500)!;
    expect(resultat.cluster.facts.map((f) => f.headline)).toEqual(["Opprydding pågår"]);
    expect(resultat.cluster.summary).toBe("1 der tiltak pågår");
    // Tiltak på grad 2 løfter ikke seksjonen; det gjør bare grad 3/X ved søkepunktet.
    expect(resultat.affectsSearchPoint).toBe(false);
  });

  it("sammendraget skiller mellom behov for tiltak og uavklart mistanke", () => {
    const resultat = contaminatedFacts([grad3("A", 100), gradX("B", 200), gradX("C", 300)], 1000)!;
    expect(resultat.cluster.summary).toBe("1 med behov for tiltak · 2 med uavklart mistanke");
  });

  it("«Se alle» viser bare relevante funn når de er flere enn kortene", () => {
    const mange = Array.from({ length: 7 }, (_, i) => gradX(`X${i}`, 100 + i * 50));
    const resultat = contaminatedFacts([...mange, grad1("Lav", 90)], 1000)!;
    expect(resultat.cluster.facts).toHaveLength(5);
    expect(resultat.cluster.overview!.toggleLabel).toBe("Se alle relevante registreringer i området");
    expect(resultat.cluster.overview!.items.map((i) => i.title)).not.toContain("Lav");
    expect(resultat.cluster.overview!.total).toBe(7);
    expect(resultat.cluster.overview!.caveat).toContain("vises ikke");
  });
});

describe("Forurenset grunn i admin – alle registreringene", () => {
  const alle = (rows: Row[], radius = 500) => contaminatedFacts(rows, radius, false, "alle")!;

  it("teller grad 3 og X som oppfølging, og alt som total", () => {
    expect(alle(seks).cluster.summary).toBe("1 krever oppfølging · 6 registreringer totalt");
  });

  it("viser grad 1 og 2 i totalen, uten kort", () => {
    const { cluster } = alle([grad1("A", 100), grad2("B", 200), grad2("C", 300)]);
    expect(cluster.summary).toBe("3 registreringer · ingen vurdert til å kreve tiltak eller oppfølging");
    expect(cluster.facts).toEqual([]);
    expect(cluster.caveat).toContain("Ingen av registreringene i området er vurdert til å kreve tiltak");
  });

  it("viser Nordbergveien, fordi søkepunktet ligger i lokaliteten", () => {
    const { cluster, affectsSearchPoint } = alle([nordbergveien]);
    expect(cluster.facts.map((f) => f.headline)).toEqual(["Nordbergveien"]);
    expect(cluster.facts[0]!.sourceDateLabel).toBe("Kildedata sist oppdatert 2010");
    expect(affectsSearchPoint).toBe(false);
  });

  it("har alle registreringene bak «Se alle» og i kartet", () => {
    const { cluster, mapFeatures } = alle(seks);
    expect(cluster.overview!.toggleLabel).toBe("Se alle registreringer i området");
    expect(cluster.overview!.items).toHaveLength(6);
    expect(mapFeatures).toHaveLength(6);
  });

  it("markerer søkepunktet som berørt bare ved grad 3 eller X", () => {
    expect(alle([grad3("Under huset", 0, true)]).affectsSearchPoint).toBe(true);
    expect(alle([grad1("Under huset", 0, true)]).affectsSearchPoint).toBe(false);
  });
});
