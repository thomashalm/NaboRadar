import { describe, expect, it } from "vitest";
import { groupFacts, needsAttention, type SectionOverview } from "@/lib/facts/queries";
import { AREA_SECTIONS, sectionOrder, type AreaCategory, type AreaFact } from "@/types/area-feature";

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
  it("følger standardrekkefølgen", () => {
    const groups = groupFacts(
      [
        fact("miljo", { headline: "Lokalitet" }),
        fact("infrastruktur", { headline: "Trafo" }),
        fact("stoy", { headline: "Veitrafikk" }),
        fact("oppvekst", { headline: "Skole" }),
        fact("grunnforhold", { headline: "Kvikkleiresone" }),
      ],
      [],
    );
    expect(groups.map((g) => g.label)).toEqual([
      "Nærområdet",
      "Støy",
      "Grunnforhold",
      "Infrastruktur",
      "Forurenset grunn",
    ]);
  });

  it("legger forurenset grunn sist når registreringen ikke gjelder søkepunktet", () => {
    // Eksempelet fra testingen: en registrering 760 m unna, søkepunktet utenfor lokaliteten.
    const rekkefølge = sectionOrder({ contaminationAtSearchPoint: false });
    expect(rekkefølge.at(-1)!.id).toBe("forurenset-grunn");

    const groups = groupFacts(
      [fact("miljo", { headline: "760 m unna", distanceM: 760, contains: false }), fact("stoy")],
      [],
      rekkefølge,
    );
    expect(groups.map((g) => g.label)).toEqual(["Støy", "Forurenset grunn"]);
  });

  it("løfter forurenset grunn når søkepunktet ligger inne i en lokalitet som krever oppfølging", () => {
    const rekkefølge = sectionOrder({ contaminationAtSearchPoint: true });
    expect(rekkefølge[0]!.id).toBe("forurenset-grunn");
    // Resten beholder sin innbyrdes rekkefølge.
    expect(rekkefølge.slice(1).map((s) => s.id)).toEqual([
      "naeromradet",
      "stoy",
      "grunnforhold",
      "infrastruktur",
      "saker",
    ]);

    const groups = groupFacts(
      [fact("miljo", { headline: "Ved søkepunktet", distanceM: 0, contains: true }), fact("grunnforhold")],
      [],
      rekkefølge,
    );
    expect(groups[0]!.label).toBe("Forurenset grunn");
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

    const utenStoy = groupFacts([fact("grunnforhold"), fact("oppvekst"), fact("miljo")]);
    expect(utenStoy.map((g) => g.label)).toEqual(["Nærområdet", "Grunnforhold", "Forurenset grunn"]);

    // Også når forurenset grunn er løftet: de som mangler, faller bort.
    const løftet = groupFacts([fact("miljo", { contains: true }), fact("oppvekst")], [], sectionOrder({ contaminationAtSearchPoint: true }));
    expect(løftet.map((g) => g.label)).toEqual(["Forurenset grunn", "Nærområdet"]);

    const bareStoy = groupFacts([fact("stoy")]);
    expect(bareStoy.map((g) => g.label)).toEqual(["Støy"]);

    const bareAnlegg = groupFacts([fact("industri")]);
    expect(bareAnlegg.map((g) => g.label)).toEqual(["Nærområdet"]);
  });

  it("har én seksjon per tema — industri og anlegg ligger under Nærområdet", () => {
    expect(AREA_SECTIONS.map((s) => s.id)).toEqual([
      "naeromradet",
      "stoy",
      "grunnforhold",
      "infrastruktur",
      "saker",
      "forurenset-grunn",
    ]);
    // Ingen kategori skal høre til to seksjoner.
    const kategorier = AREA_SECTIONS.flatMap((s) => s.categories);
    expect(new Set(kategorier).size).toBe(kategorier.length);
    expect(AREA_SECTIONS.map((s) => s.label)).not.toContain("Industri og anlegg");
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
