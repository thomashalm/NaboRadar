import { describe, expect, it } from "vitest";
import { groupFacts, needsAttention } from "@/lib/facts/queries";
import { AREA_CATEGORIES, AREA_CATEGORY_LABELS, type AreaCategory, type AreaFact } from "@/types/area-feature";

/**
 * Hva som løftes fram rundt en adresse. Poenget er signalverdi: kilden har registreringer
 * overalt i byene, men bare noen av dem er noe brukeren bør merke seg.
 */

const fact = (category: AreaCategory, over: Partial<AreaFact> = {}): AreaFact => ({
  id: `${category}-${over.headline ?? "x"}`,
  category,
  subtype: "test",
  headline: "Test",
  details: [],
  technical: [],
  caveat: null,
  distanceLabel: "100 m unna",
  distanceM: 100,
  contains: false,
  sourceName: "Kilde",
  sourceDateLabel: null,
  link: null,
  ...over,
});

describe("hvilke registreringer som blir hovedkort", () => {
  it("påvirkningsgrad 1 og 2 gir ikke hovedkort", () => {
    expect(needsAttention({ contains: false, grade: "liteForurensning" })).toBe(false);
    expect(needsAttention({ contains: false, grade: "akseptabelForurensning" })).toBe(false);
  });

  it("påvirkningsgrad 3 og X gir hovedkort", () => {
    expect(needsAttention({ contains: false, grade: "ikkeAkseptabelForurensning" })).toBe(true);
    expect(needsAttention({ contains: false, grade: "ukjentPåvirkning" })).toBe(true);
  });

  it("en registrering søkepunktet ligger inne i, gir hovedkort uansett grad", () => {
    // Dette handler om stedet brukeren faktisk spurte om.
    expect(needsAttention({ contains: true, grade: "akseptabelForurensning" })).toBe(true);
    expect(needsAttention({ contains: true, grade: "liteForurensning" })).toBe(true);
  });
});

describe("rekkefølge på kategoriene", () => {
  it("viser Grunnforhold, så Støy, så Forurenset grunn", () => {
    const groups = groupFacts(
      [
        fact("miljo", { headline: "Majorstuen skole" }),
        fact("stoy", { headline: "Veitrafikk" }),
        fact("grunnforhold", { headline: "Kvikkleiresone" }),
      ],
      true,
    );
    expect(groups.map((g) => g.label)).toEqual(["Grunnforhold", "Støy", "Forurenset grunn"]);
  });

  it("kaller kategorien «Forurenset grunn», ikke «Miljø»", () => {
    expect(AREA_CATEGORY_LABELS.miljo).toBe("Forurenset grunn");
    expect(Object.values(AREA_CATEGORY_LABELS)).not.toContain("Miljø");
  });

  it("lar de øvrige flytte opp når en kategori mangler", () => {
    const utenGrunnforhold = groupFacts([fact("stoy"), fact("miljo")], true);
    expect(utenGrunnforhold.map((g) => g.label)).toEqual(["Støy", "Forurenset grunn"]);

    const bareStoy = groupFacts([fact("stoy")], false);
    expect(bareStoy.map((g) => g.label)).toEqual(["Støy"]);

    const bareInfrastruktur = groupFacts([fact("infrastruktur")], false);
    expect(bareInfrastruktur.map((g) => g.label)).toEqual(["Infrastruktur"]);
  });

  it("holder infrastruktur og industri etter de tre prioriterte", () => {
    expect([...AREA_CATEGORIES]).toEqual(["grunnforhold", "stoy", "miljo", "infrastruktur", "industri"]);
  });

  it("beholder seksjonen for forurenset grunn selv uten hovedkort", () => {
    // Akseptable registreringer skal fortsatt kunne åpnes, uten å prege området.
    const groups = groupFacts([fact("stoy")], true);
    expect(groups.map((g) => g.label)).toEqual(["Støy", "Forurenset grunn"]);
    expect(groups.find((g) => g.category === "miljo")!.facts).toEqual([]);
  });

  it("dropper seksjonen helt når det ikke finnes registreringer i området", () => {
    expect(groupFacts([fact("stoy")], false).map((g) => g.category)).toEqual(["stoy"]);
  });

  it("sorterer treff som omfatter søkepunktet først i sin kategori", () => {
    const groups = groupFacts(
      [
        fact("miljo", { headline: "Lenger unna", distanceM: 50 }),
        fact("miljo", { headline: "Omfatter punktet", distanceM: 0, contains: true }),
      ],
      true,
    );
    expect(groups[0]!.facts.map((f) => f.headline)).toEqual(["Omfatter punktet", "Lenger unna"]);
  });
});
