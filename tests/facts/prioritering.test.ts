import { describe, expect, it } from "vitest";
import { groupFacts, needsAttention, type SectionOverview } from "@/lib/facts/queries";
import { AREA_SECTIONS, type AreaCategory, type AreaFact } from "@/types/area-feature";

/**
 * Hva som løftes fram rundt en adresse. Poenget er signalverdi: kilden har registreringer
 * overalt i byene, men bare noen av dem er noe brukeren bør merke seg.
 */

const overview = (sectionId: string): SectionOverview => ({
  sectionId,
  toggleLabel: "Se alle",
  total: 3,
  noAttentionNote: null,
  headline: "3 registreringer",
  details: [],
  caveat: null,
  sourceName: "Kilde",
  items: [],
});

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
      [],
    );
    expect(groups.map((g) => g.label)).toEqual(["Grunnforhold", "Støy", "Forurenset grunn"]);
  });

  it("kaller seksjonen «Forurenset grunn», ikke «Miljø»", () => {
    const labels = AREA_SECTIONS.map((s) => s.label);
    expect(labels).toContain("Forurenset grunn");
    expect(labels).not.toContain("Miljø");
  });

  it("samler industri og anlegg under «Nærområdet», med nøytral ingress", () => {
    const naer = AREA_SECTIONS.find((s) => s.id === "naeromradet")!;
    expect(naer.label).toBe("Nærområdet");
    expect(naer.categories).toContain("industri");
    expect(naer.intro).toBeTruthy();
    expect([naer.label, naer.intro].join(" ")).not.toMatch(/risiko|farlig|uønsket|oppmerksom|advarsel/i);
  });

  it("lar «Nærområdet» utvides med nye typer uten ny UI-logikk", () => {
    // Slik en framtidig kategori legges til: bare i seksjonens kategoriliste.
    const utvidet = [
      { id: "naeromradet", label: "Nærområdet", intro: null, categories: ["industri", "infrastruktur"] as AreaCategory[] },
    ];
    const groups = groupFacts([fact("infrastruktur", { headline: "Trafo" }), fact("industri", { headline: "Anlegg" })], [], utvidet);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe("Nærområdet");
    expect(groups[0]!.facts.map((f) => f.headline).sort()).toEqual(["Anlegg", "Trafo"]);
  });

  it("lar de øvrige flytte opp når en kategori mangler", () => {
    const utenGrunnforhold = groupFacts([fact("stoy"), fact("miljo")]);
    expect(utenGrunnforhold.map((g) => g.label)).toEqual(["Støy", "Forurenset grunn"]);

    const bareStoy = groupFacts([fact("stoy")]);
    expect(bareStoy.map((g) => g.label)).toEqual(["Støy"]);

    const bareAnlegg = groupFacts([fact("industri")]);
    expect(bareAnlegg.map((g) => g.label)).toEqual(["Nærområdet"]);
  });

  it("holder infrastruktur og nærområdet etter de tre prioriterte", () => {
    expect(AREA_SECTIONS.map((s) => s.id)).toEqual([
      "grunnforhold",
      "stoy",
      "forurenset-grunn",
      "infrastruktur",
      "naeromradet",
    ]);
  });

  it("beholder en seksjon som bare har en utvidbar oversikt", () => {
    // Akseptable registreringer skal fortsatt kunne åpnes, uten å prege området.
    const groups = groupFacts([fact("stoy")], [overview("forurenset-grunn")]);
    expect(groups.map((g) => g.label)).toEqual(["Støy", "Forurenset grunn"]);
    expect(groups.find((g) => g.sectionId === "forurenset-grunn")!.facts).toEqual([]);
  });

  it("dropper seksjonen helt når det ikke finnes noe i området", () => {
    expect(groupFacts([fact("stoy")]).map((g) => g.sectionId)).toEqual(["stoy"]);
  });

  it("sorterer treff som omfatter søkepunktet først i sin kategori", () => {
    const groups = groupFacts(
      [
        fact("miljo", { headline: "Lenger unna", distanceM: 50 }),
        fact("miljo", { headline: "Omfatter punktet", distanceM: 0, contains: true }),
      ],
      [],
    );
    expect(groups[0]!.facts.map((f) => f.headline)).toEqual(["Omfatter punktet", "Lenger unna"]);
  });
});
