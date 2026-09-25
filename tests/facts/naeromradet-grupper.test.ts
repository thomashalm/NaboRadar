import { describe, expect, it } from "vitest";
import { groupFacts, placeFacts } from "@/lib/facts/queries";
import { AREA_SECTIONS } from "@/types/area-feature";

/**
 * «Nærområdet» skal gruppere relaterte typer før enkeltstedene vises. Uten grupperingen
 * ble seksjonen en lang liste med nesten like kort — typisk seks barnehager som skjøv
 * skolene ut av standardvisningen.
 */

type Row = Parameters<typeof placeFacts>[0][number];

const point = (n: number) => ({ type: "Point" as const, coordinates: [10.7 + n / 10_000, 59.9] });

function row(overrides: Partial<Row> & { title: string; distance_m: number }): Row {
  const n = overrides.distance_m;
  return {
    id: `${overrides.title}-${n}`,
    provider_id: "udir-skoler",
    external_id: `e${n}`,
    category: "oppvekst",
    subtype: "grunnskole",
    contains: false,
    attributes: {},
    source_url: null,
    source_url_type: null,
    source_updated_at: null,
    centroid: point(n),
    geometry: point(n),
    ...overrides,
  } as Row;
}

const skole = (title: string, distance_m: number, subtype = "grunnskole") =>
  row({ title, distance_m, subtype, attributes: { lavesteTrinn: 1, hoyesteTrinn: 7 } });

const barnehage = (title: string, distance_m: number) =>
  row({
    title,
    distance_m,
    subtype: "barnehage",
    provider_id: "udir-barnehager",
    attributes: { lavesteAlder: 1, hoyesteAlder: 5 },
  });

const sykehusrad = (title: string, distance_m: number) =>
  row({
    title,
    distance_m,
    category: "helse",
    subtype: "sykehus",
    provider_id: "helsenorge-sykehus",
    attributes: { eierform: "offentlig" },
  });

const skjenkested = (title: string, distance_m: number) =>
  row({
    title,
    distance_m,
    category: "servering",
    subtype: "skjenkested",
    provider_id: "oslo-skjenkebevilling",
    attributes: { stengetidInne: "03:30" },
  });

const anlegg = (title: string, distance_m: number) =>
  row({
    title,
    distance_m,
    category: "industri",
    subtype: "industrianlegg",
    provider_id: "mdir-industri-tillatelse",
    attributes: { bransje: "Verksted" },
  });

const cluster = (rows: Row[], radius = 1000) => placeFacts(rows, radius).clusters[0]!;
const listOf = (rows: Row[], id: string) => cluster(rows).lists.find((l) => l.id === id);

describe("Nærområdet: skoler og barnehager som én gruppe", () => {
  const seksVarianter = [
    skole("Majorstuen skole", 220),
    skole("Berg videregående", 900, "videregaende_skole"),
    barnehage("Bh A", 120),
    barnehage("Bh B", 180),
    barnehage("Bh C", 260),
    barnehage("Bh D", 340),
    barnehage("Bh E", 410),
    barnehage("Bh F", 480),
    barnehage("Bh G", 550),
  ];

  it("samler skoler og barnehager i én gruppe, og holder industri utenfor", () => {
    const result = placeFacts([...seksVarianter, anlegg("Alnabru terminal", 700)], 1000);

    const skoler = result.clusters.find((c) => c.id === "skoler-og-barnehager")!;
    expect(skoler.sectionId).toBe("naeromradet");
    expect(skoler.lists.flatMap((l) => l.items).map((i) => i.title)).not.toContain("Alnabru terminal");
    // Anlegget ligger i sin egen gruppe, ikke som løst kort i seksjonen.
    expect(result.facts).toEqual([]);
    const anleggsgruppe = result.clusters.find((c) => c.id === "virksomheter-og-anlegg")!;
    expect(anleggsgruppe.facts.map((f) => f.headline)).toEqual(["Alnabru terminal"]);
  });

  it("viser begge undertypene når begge finnes", () => {
    expect(cluster(seksVarianter).lists.map((l) => [l.id, l.label])).toEqual([
      ["skoler", "Skoler"],
      ["barnehager", "Barnehager"],
    ]);
  });

  it("viser bare undertypen som finnes, uten tom overskrift for den andre", () => {
    const bareBarnehager = cluster([barnehage("Bh A", 120), barnehage("Bh B", 180)]);
    expect(bareBarnehager.lists.map((l) => l.id)).toEqual(["barnehager"]);
    expect(bareBarnehager.summary).toBe("2 barnehager innen 1 km");

    const bareSkoler = cluster([skole("Majorstuen skole", 220)]);
    expect(bareSkoler.lists.map((l) => l.id)).toEqual(["skoler"]);
    expect(bareSkoler.summary).toBe("1 skole innen 1 km");
  });

  it("viser maks tre per undertype før «Se alle»", () => {
    const barnehager = listOf(seksVarianter, "barnehager")!;
    expect(barnehager.previewCount).toBe(3);
    expect(barnehager.items).toHaveLength(7);
    expect(barnehager.toggleLabel).toBe("Se alle barnehager (7)");
    expect(barnehager.items.slice(0, barnehager.previewCount).map((i) => i.title)).toEqual(["Bh A", "Bh B", "Bh C"]);

    // Tre eller færre trenger ingen utvider.
    expect(listOf(seksVarianter, "skoler")!.toggleLabel).toBeNull();
    expect(listOf([barnehage("A", 1), barnehage("B", 2), barnehage("C", 3)], "barnehager")!.toggleLabel).toBeNull();
  });

  it("oppgir antall per type i oppsummeringen", () => {
    expect(cluster(seksVarianter).summary).toBe("2 skoler · 7 barnehager innen 1 km");
    expect(cluster(seksVarianter, 3000).summary).toBe("2 skoler · 7 barnehager innen 3 km");
  });

  it("sorterer nærmest først innen hver undertype", () => {
    const usortert = [barnehage("Bh D", 340), skole("Fjern skole", 900), barnehage("Bh A", 120), skole("Nær skole", 220)];
    const c = cluster(usortert);
    expect(c.lists.find((l) => l.id === "skoler")!.items.map((i) => i.title)).toEqual(["Nær skole", "Fjern skole"]);
    expect(c.lists.find((l) => l.id === "barnehager")!.items.map((i) => i.title)).toEqual(["Bh A", "Bh D"]);
  });

  it("lar ikke mange nære barnehager skyve ut skolene", () => {
    // Alle barnehagene ligger nærmere enn begge skolene.
    const naere = [1, 2, 3, 4, 5, 6].map((n) => barnehage(`Bh ${n}`, n * 10));
    const c = cluster([...naere, skole("Majorstuen skole", 220), skole("Berg videregående", 900, "videregaende_skole")]);
    expect(c.lists.find((l) => l.id === "skoler")!.items.map((i) => i.title)).toEqual([
      "Majorstuen skole",
      "Berg videregående",
    ]);
  });

  it("gir undertekst med trinn eller aldersgruppe", () => {
    const c = cluster(seksVarianter);
    expect(c.lists.find((l) => l.id === "skoler")!.items[0]!.subtitle).toBe("Grunnskole, 1.–7. trinn");
    expect(c.lists.find((l) => l.id === "barnehager")!.items[0]!.subtitle).toBe("Barnehage, 1–5 år");
    expect(c.caveat).toContain("Familiebarnehager i private hjem og spesialskoler er ikke med");
  });

  it("lar alle skoler og barnehager bli kartmarkører, også de som ligger bak en utvider", () => {
    const rows = [...seksVarianter, anlegg("Alnabru terminal", 700)];
    const result = placeFacts(rows, 1000);

    expect(result.mapFeatures.map((f) => f.id).sort()).toEqual(rows.map((r) => r.id).sort());
    expect(result.mapFeatures.filter((f) => f.category === "oppvekst")).toHaveLength(9);
  });

  it("gir gruppen plass i Nærområdet-seksjonen, også uten kort", () => {
    const result = placeFacts(seksVarianter, 1000);
    const groups = groupFacts([], [], AREA_SECTIONS, result.clusters);

    expect(groups.map((g) => g.sectionId)).toEqual(["naeromradet"]);
    expect(groups[0]!.facts).toEqual([]);
    expect(groups[0]!.clusters.map((c) => c.label)).toEqual(["Skoler og barnehager"]);
  });

  it("viser de tre nærmeste anleggene som kort, resten bak «Se alle anlegg»", () => {
    const mange = [1, 2, 3, 4, 5, 6].map((n) => anlegg(`Anlegg ${n}`, n * 100));
    const gruppe = placeFacts(mange, 1000).clusters.find((c) => c.id === "virksomheter-og-anlegg")!;

    expect(gruppe.label).toBe("Virksomheter og anlegg");
    expect(gruppe.summary).toBe("6 anlegg innen 1 km");
    expect(gruppe.facts.map((f) => f.headline)).toEqual(["Anlegg 1", "Anlegg 2", "Anlegg 3"]);
    expect(gruppe.overview!.toggleLabel).toBe("Se alle anlegg");
    expect(gruppe.overview!.total).toBe(6);
    // Skole/barnehage-antall skal ikke blandes inn i anleggsoppsummeringen.
    expect(gruppe.overview!.headline).toBe("6 anlegg med utslippstillatelse innen 1 km");
  });

  it("beholder detaljinnholdet på anleggskortene", () => {
    const gruppe = placeFacts([anlegg("Haraldrud", 410)], 1000).clusters.find((c) => c.id === "virksomheter-og-anlegg")!;
    const kort = gruppe.facts[0]!;

    expect(kort.headline).toBe("Haraldrud");
    expect(kort.distanceLabel).toBe("410 m unna");
    expect(kort.details.join(" ")).toContain("Anlegg med utslippstillatelse");
    expect(kort.details.join(" ")).toContain("Verksted");
    expect(kort.caveat).toContain("Tillatelse gitt av");
    expect(kort.sourceName).toContain("Miljødirektoratet");
    // Ingen utvider når alt får plass.
    expect(gruppe.overview).toBeNull();
  });

  it("gir gruppene fast rekkefølge, og hopper over dem uten treff", () => {
    const alle = placeFacts(
      [skole("En skole", 100), sykehusrad("Et sykehus", 200), anlegg("Et anlegg", 300), skjenkested("Et utested", 400)],
      1000,
    );
    expect(alle.clusters.map((c) => c.id)).toEqual([
      "skoler-og-barnehager",
      "helse",
      "virksomheter-og-anlegg",
      "servering",
    ]);

    // Uten skoler og helse rykker de to andre opp, uten tomme grupper imellom.
    const færre = placeFacts([anlegg("Et anlegg", 300), skjenkested("Et utested", 400)], 1000);
    expect(færre.clusters.map((c) => c.id)).toEqual(["virksomheter-og-anlegg", "servering"]);
  });
});

describe("undertekst for videregående skole", () => {
  it("bruker Vg1–Vg3, ikke Udirs trinnkoding 11–13", () => {
    const rows = [
      row({
        title: "Bjerke videregående skole",
        distance_m: 880,
        subtype: "videregaende_skole",
        attributes: { lavesteTrinn: 11, hoyesteTrinn: 13 },
      }),
    ];
    expect(cluster(rows).lists[0]!.items[0]!.subtitle).toBe("Videregående skole, Vg1–Vg3");
  });

  it("dropper trinn når kilden oppgir noe annet enn 11–13", () => {
    const rows = [
      row({
        title: "Kombinert skole",
        distance_m: 300,
        subtype: "videregaende_skole",
        attributes: { lavesteTrinn: 8, hoyesteTrinn: 13 },
      }),
    ];
    expect(cluster(rows).lists[0]!.items[0]!.subtitle).toBe("Videregående skole");
  });
});
