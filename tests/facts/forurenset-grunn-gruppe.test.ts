import { describe, expect, it } from "vitest";
import { contaminatedFacts, groupFacts } from "@/lib/facts/queries";
import { AREA_SECTIONS, sectionOrder } from "@/types/area-feature";

/**
 * «Forurenset grunn» vises som én kompakt gruppe, som resten av siden. Kortene, «Se alle» og
 * ordlyden er uendret — de ligger bak utvideren i stedet for å dominere siden.
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
    attributes: { paavirkningsgrad: overrides.grad },
    source_url: "https://grunnforurensning.miljodirektoratet.no/",
    source_url_type: "factsheet",
    source_updated_at: null,
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

describe("Forurenset grunn som kompakt gruppe", () => {
  const seks = [
    grad3("Gammel bensinstasjon", 120),
    grad1("Tidligere verksted", 200),
    grad1("Skoletomta", 260),
    grad2("Havnelageret", 300),
    grad2("Parken", 380),
    grad2("Kaia", 460),
  ];

  it("teller grad 3 og X som oppfølging, og alt som total", () => {
    const { cluster } = contaminatedFacts(seks, 500);
    expect(cluster.summary).toBe("1 krever oppfølging · 6 registreringer totalt");
  });

  it("teller grad 1 og 2 med i totalen, men aldri som oppfølging", () => {
    const { cluster } = contaminatedFacts([grad1("A", 100), grad2("B", 200), grad2("C", 300)], 500);
    expect(cluster.summary).toBe("3 registreringer · ingen vurdert til å kreve tiltak eller oppfølging");
    expect(cluster.facts).toEqual([]);
    expect(cluster.caveat).toContain("Ingen av registreringene i området er vurdert til å kreve tiltak");
  });

  it("bøyer tallene riktig når det bare er én av hver", () => {
    expect(contaminatedFacts([grad3("A", 100)], 500).cluster.summary).toBe(
      "1 krever oppfølging · 1 registrering totalt",
    );
    expect(contaminatedFacts([grad3("A", 100), gradX("B", 200)], 1000).cluster.summary).toBe(
      "2 krever oppfølging · 2 registreringer totalt",
    );
  });

  it("viser hovedfunnene som kort inne i gruppen, med kildens egen ordlyd", () => {
    const { cluster } = contaminatedFacts(seks, 500);
    expect(cluster.facts.map((f) => f.headline)).toEqual(["Gammel bensinstasjon"]);
    const kort = cluster.facts[0]!;
    expect(kort.distanceLabel).toBe("120 m unna");
    expect(kort.details.join(" ")).toContain("ikke akseptabel");
    expect(kort.sourceName).toContain("Miljødirektoratet");
    expect(kort.link?.href).toContain("grunnforurensning");
  });

  it("løfter registreringen som inneholder søkepunktet, uansett grad", () => {
    const { cluster, affectsSearchPoint } = contaminatedFacts([grad1("Under huset", 0, true), grad2("Nabo", 300)], 500);
    expect(cluster.facts.map((f) => f.headline)).toEqual(["Under huset"]);
    expect(cluster.facts[0]!.distanceLabel).toBe("Ved søkepunktet");
    // Grad 1 er myndighetens egen konklusjon om at tilstanden er akseptabel.
    expect(cluster.summary).toBe("2 registreringer · ingen vurdert til å kreve tiltak eller oppfølging");
    expect(affectsSearchPoint).toBe(false);
  });

  it("markerer søkepunktet som berørt bare ved grad 3 eller X", () => {
    expect(contaminatedFacts([grad3("Under huset", 0, true)], 500).affectsSearchPoint).toBe(true);
    expect(contaminatedFacts([gradX("Under huset", 0, true)], 500).affectsSearchPoint).toBe(true);
    expect(contaminatedFacts([grad3("Langt unna", 900)], 1000).affectsSearchPoint).toBe(false);
  });

  it("har alle registreringene bak «Se alle», også grad 1 og 2", () => {
    const { cluster } = contaminatedFacts(seks, 500);
    expect(cluster.overview!.toggleLabel).toBe("Se alle registreringer i området");
    expect(cluster.overview!.total).toBe(6);
    expect(cluster.overview!.items).toHaveLength(6);
    expect(cluster.overview!.items.map((i) => i.title)).toContain("Kaia");
    // Meldingen står i sammendraget, ikke to ganger inne i gruppen.
    expect(cluster.overview!.noAttentionNote).toBeNull();
  });

  it("tegner fortsatt lokalitetene som flater i kartet", () => {
    const { mapFeatures } = contaminatedFacts(seks, 500);
    expect(mapFeatures).toHaveLength(6);
    expect(mapFeatures.every((f) => f.geometry.type === "Polygon")).toBe(true);
  });

  it("skjuler seksjonen når det ikke finnes registreringer", () => {
    expect(groupFacts([], [], AREA_SECTIONS, []).map((g) => g.sectionId)).not.toContain("forurenset-grunn");
  });

  it("bruker gruppeformatet også når seksjonen løftes øverst", () => {
    const { cluster } = contaminatedFacts([grad3("Under huset", 0, true)], 500);
    const rekkefølge = sectionOrder({ contaminationAtSearchPoint: true });
    const grupper = groupFacts([], [], rekkefølge, [cluster]);

    expect(grupper[0]!.sectionId).toBe("forurenset-grunn");
    // Ingen løse kort i seksjonen: alt ligger i gruppen.
    expect(grupper[0]!.facts).toEqual([]);
    expect(grupper[0]!.clusters.map((c) => c.label)).toEqual(["Forurenset grunn"]);
    expect(grupper[0]!.clusters[0]!.facts).toHaveLength(1);
  });
});
