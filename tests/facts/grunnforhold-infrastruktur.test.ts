import { describe, expect, it } from "vitest";
import { grunnforholdCluster, infrastrukturCluster } from "@/lib/facts/clusters";
import { describeFact } from "@/lib/facts/wording";
import type { AreaFact } from "@/types/area-feature";

/**
 * «Infrastruktur» som én kompakt gruppe. Alnabru har 52 registreringer innen 3 km — 38
 * kraftledninger og 14 transformatorstasjoner — og som enkeltkort fylte de hele siden.
 */

function fakta(overrides: Partial<AreaFact> & { id: string; subtype: string; distanceM: number }): AreaFact {
  return {
    category: "infrastruktur",
    headline: `Objekt ${overrides.id}`,
    details: ["132 kV · ELVIA AS"],
    technical: [],
    caveat: null,
    distanceLabel: `${overrides.distanceM} m unna`,
    contains: false,
    sourceName: "Nettanlegg (NVE)",
    sourceDateLabel: null,
    link: null,
    ...overrides,
  } as AreaFact;
}

const stasjon = (id: string, distanceM: number) =>
  fakta({ id, subtype: "transformatorstasjon", distanceM, headline: `Transformatorstasjon «${id}»` });
const ledning = (id: string, distanceM: number) =>
  fakta({ id, subtype: "kraftledning", distanceM, headline: `Kraftledning i regionalnett («${id}»)`, caveat: "Jordkabler inngår ikke i NVEs åpne data." });
const distribusjon = (id: string, distanceM: number) =>
  fakta({
    id,
    subtype: "hoyspent_distribusjon",
    distanceM,
    headline: "Høyspentledning i distribusjonsnettet",
    caveat: "Bare luftledninger NVE publiserer åpent. Jordkabler inngår ikke, og avstanden sier derfor ikke alt.",
  });

describe("Infrastruktur som kompakt gruppe", () => {
  const alnabru = [
    ...[1, 2, 3, 4, 5].map((n) => stasjon(`Stasjon ${n}`, n * 200)),
    ...[1, 2, 3, 4, 5, 6, 7].map((n) => ledning(`Ledning ${n}`, n * 100)),
  ];

  it("teller alle registreringene i sammendraget", () => {
    const gruppe = infrastrukturCluster(alnabru, 1000)!;
    expect(gruppe.sectionId).toBe("infrastruktur");
    expect(gruppe.label).toBe("Infrastruktur");
    expect(gruppe.summary).toBe("12 registreringer innen 1 km");
  });

  it("bøyer tallet riktig for én registrering", () => {
    expect(infrastrukturCluster([stasjon("A", 100)], 500)!.summary).toBe("1 registrering innen 500 m");
  });

  it("grupperer transformatorstasjoner og kraftlinjer hver for seg", () => {
    const gruppe = infrastrukturCluster(alnabru, 1000)!;
    expect(gruppe.lists.map((l) => [l.label, l.total])).toEqual([
      ["Transformatorstasjoner", 5],
      ["Kraftlinjer", 7],
    ]);
  });

  it("regner distribusjonsnettet som en kraftlinje", () => {
    const gruppe = infrastrukturCluster([ledning("A", 100), distribusjon("B", 50)], 1000)!;
    expect(gruppe.lists).toHaveLength(1);
    expect(gruppe.lists[0]!.label).toBe("Kraftlinjer");
    expect(gruppe.lists[0]!.total).toBe(2);
  });

  it("viser maks tre per undertype før «Se alle»", () => {
    const gruppe = infrastrukturCluster(alnabru, 1000)!;
    const [stasjoner, linjer] = gruppe.lists;
    expect(stasjoner!.previewCount).toBe(3);
    expect(stasjoner!.toggleLabel).toBe("Se alle transformatorstasjoner (5)");
    expect(linjer!.toggleLabel).toBe("Se alle kraftlinjer (7)");
  });

  it("gir ingen utvider når alt får plass", () => {
    const gruppe = infrastrukturCluster([stasjon("A", 100), stasjon("B", 200)], 1000)!;
    expect(gruppe.lists[0]!.toggleLabel).toBeNull();
  });

  it("sorterer nærmest først innen hver undertype", () => {
    const gruppe = infrastrukturCluster([stasjon("Fjern", 900), ledning("Nær linje", 50), stasjon("Nær", 100)], 1000)!;
    expect(gruppe.lists.find((l) => l.id === "transformatorstasjoner")!.items.map((i) => i.title)).toEqual([
      "Transformatorstasjon «Nær»",
      "Transformatorstasjon «Fjern»",
    ]);
  });

  it("viser bare undertypen som finnes", () => {
    expect(infrastrukturCluster([stasjon("A", 100)], 1000)!.lists.map((l) => l.id)).toEqual(["transformatorstasjoner"]);
    expect(infrastrukturCluster([ledning("A", 100)], 1000)!.lists.map((l) => l.id)).toEqual(["kraftlinjer"]);
  });

  it("gir ingen gruppe når det ikke finnes infrastruktur", () => {
    expect(infrastrukturCluster([], 1000)).toBeNull();
  });

  it("beholder spenning, netteier og kilde på hver registrering", () => {
    const gruppe = infrastrukturCluster([stasjon("Majorstua", 330)], 1000)!;
    const rad = gruppe.lists[0]!.items[0]!;
    expect(rad.title).toBe("Transformatorstasjon «Majorstua»");
    expect(rad.subtitle).toBe("132 kV · ELVIA AS");
    expect(rad.distanceLabel).toBe("330 m unna");
    expect(gruppe.sourceName).toContain("Nettanlegg (NVE)");
  });

  it("tar med forbeholdet for de typene som faktisk er med", () => {
    expect(infrastrukturCluster([stasjon("A", 100)], 1000)!.caveat).toBeNull();
    expect(infrastrukturCluster([distribusjon("A", 100)], 1000)!.caveat).toContain("Jordkabler inngår ikke");
  });
});

describe("spenning som ikke er oppgitt", () => {
  it("skriver ikke «0 kV» når NVE mangler verdien", () => {
    for (const subtype of ["transformatorstasjon", "kraftledning", "hoyspent_distribusjon"]) {
      for (const spenningKv of [0, null, -1]) {
        const tekst = describeFact({ subtype, title: "Et anlegg", attributes: { spenningKv, eier: "ELVIA AS" }, contains: false })!;
        expect(tekst.details.join(" ")).not.toMatch(/\bkV\b/);
        // Netteieren står fortsatt, uten tom eller villedende linje foran.
        expect(tekst.details.join(" ")).toContain("ELVIA AS");
      }
    }
  });

  it("viser spenningen når kilden faktisk oppgir en", () => {
    const tekst = describeFact({
      subtype: "transformatorstasjon",
      title: "Majorstua",
      attributes: { spenningKv: 132, eier: "ELVIA AS" },
      contains: false,
    })!;
    expect(tekst.details).toEqual(["132 kV · ELVIA AS"]);
  });

  it("gir ingen tom detaljlinje når verken spenning eller eier finnes", () => {
    const tekst = describeFact({ subtype: "transformatorstasjon", title: "Ukjent", attributes: { spenningKv: 0 }, contains: false })!;
    expect(tekst.details).toEqual([]);
  });
});

describe("Grunnforhold som kompakt gruppe", () => {
  const grunn = (overrides: Partial<AreaFact> & { id: string; subtype: string; distanceM: number }): AreaFact =>
    ({
      category: "grunnforhold",
      headline: `Kartlagt kvikkleiresone «${overrides.id}»`,
      details: ["Kvikkleire påvist", "Faregrad lav · risikoklasse 2 av 5"],
      technical: ["Kvikkleire er påvist i sonen, med beregnet sikkerhetsfaktor under 1,4"],
      caveat: null,
      distanceLabel: `${overrides.distanceM} m unna`,
      contains: false,
      sourceName: "Kartlagte kvikkleiresoner (NVE)",
      sourceDateLabel: null,
      link: null,
      ...overrides,
    }) as AreaFact;

  const sone = (id: string, distanceM: number, contains = false) =>
    grunn({ id, subtype: "kvikkleire_sone", distanceM, contains });
  const aktsomhet = grunn({
    id: "aktsomhet",
    subtype: "kvikkleire_aktsomhet",
    distanceM: 0,
    contains: true,
    headline: "Aktsomhetsområde for kvikkleireskred",
    details: ["Området kan ha marin leire i skrånende terreng. Kvikkleire er ikke påvist."],
    technical: ["Ved byggetiltak i et slikt område krever NVE at det innhentes geoteknisk vurdering"],
  });
  const utredet = grunn({
    id: "utredet",
    subtype: "kvikkleire_utredet_uten_fare",
    distanceM: 0,
    contains: true,
    headline: "Utredet av NVE: ikke fare for områdeskred",
    details: [],
  });

  it("løfter det som gjelder søkepunktet i sammendraget", () => {
    const gruppe = grunnforholdCluster([aktsomhet, sone("Alnabru", 0, true), sone("Smalvollveien", 890)], 1000)!;
    expect(gruppe.summary).toBe(
      "Kvikkleiresone ved søkepunktet · Aktsomhetsområde ved søkepunktet · 2 kartlagte kvikkleiresoner innen 1 km",
    );
  });

  it("lar en sone langt unna ikke dominere", () => {
    const gruppe = grunnforholdCluster([sone("Smalvollveien", 890)], 1000)!;
    expect(gruppe.summary).toBe("1 kartlagt kvikkleiresone innen 1 km");
  });

  it("oppsummerer aktsomhetsområde alene", () => {
    expect(grunnforholdCluster([aktsomhet], 500)!.summary).toBe("Aktsomhetsområde ved søkepunktet");
  });

  it("presenterer friskmeldt område som det det er", () => {
    const gruppe = grunnforholdCluster([utredet], 500)!;
    expect(gruppe.summary).toBe("Utredet: ikke fare for områdeskred ved søkepunktet");
    expect(gruppe.facts[0]!.headline).toContain("ikke fare for områdeskred");
  });

  it("viser maks tre funn før «Se alle funn»", () => {
    const mange = [1, 2, 3, 4, 5].map((n) => sone(`Sone ${n}`, n * 100));
    const gruppe = grunnforholdCluster(mange, 1000)!;
    expect(gruppe.facts.map((f) => f.id)).toEqual(["Sone 1", "Sone 2", "Sone 3"]);
    expect(gruppe.overview!.toggleLabel).toBe("Se alle funn");
    expect(gruppe.overview!.total).toBe(5);
  });

  it("setter det som dekker søkepunktet først", () => {
    const gruppe = grunnforholdCluster([sone("Fjern", 900), sone("Under huset", 0, true)], 1000)!;
    expect(gruppe.facts[0]!.id).toBe("Under huset");
  });

  it("beholder de tekniske opplysningene på kortet, ikke i standardteksten", () => {
    const gruppe = grunnforholdCluster([sone("Alnabru", 100)], 1000)!;
    const kort = gruppe.facts[0]!;
    expect(kort.details).toEqual(["Kvikkleire påvist", "Faregrad lav · risikoklasse 2 av 5"]);
    expect(kort.technical.join(" ")).toContain("sikkerhetsfaktor under 1,4");
  });

  it("gir ingen gruppe uten funn", () => {
    expect(grunnforholdCluster([], 1000)).toBeNull();
  });
});
