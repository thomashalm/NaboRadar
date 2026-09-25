import { describe, expect, it } from "vitest";
import { areaLookups } from "@/lib/facts/lookups";
import { mergeFactResults } from "@/lib/facts/merge";
import type { AreaFactGroup, AreaFactsResult } from "@/lib/facts/queries";
import { combineStates, visibleSections, type SourceState } from "@/lib/facts/section-state";
import { AREA_SECTIONS, LOOKUP_CATEGORIES, sectionOrder, sectionWaitsForLookups } from "@/types/area-feature";

/**
 * Siden lastes i tre strømmer med svært ulik fart: saker og databasefakta på 0,1–1,8 s, og de
 * direkte oppslagene på opptil fem sekunder. Hver seksjon må derfor kunne laste, lykkes, være
 * tom eller feile for seg — uten å ta med seg resten av siden.
 */

const gruppe = (sectionId: string): AreaFactGroup => ({
  sectionId,
  label: sectionId,
  intro: null,
  facts: [],
  clusters: [],
  overview: null,
});

const ok = (groups: AreaFactGroup[], order = AREA_SECTIONS.map((s) => s.id)): AreaFactsResult => ({
  status: "ok",
  groups,
  order,
  mapFeatures: [],
  sources: [],
  unavailableSources: [],
});

const nede: AreaFactsResult = { status: "unavailable", devReason: "test" };

describe("hvilke kilder en seksjon venter på", () => {
  it("holder listen over trege kategorier i synk med oppslagene", () => {
    // Regelen om hva som lastes for seg må følge de faktiske direkte oppslagene.
    const fraOppslag = [...new Set(areaLookups.map((lookup) => lookup.category))].sort();
    expect([...LOOKUP_CATEGORIES].sort()).toEqual(fraOppslag);
  });

  it("vet hvilke seksjoner som må vente på et direkte oppslag", () => {
    expect(sectionWaitsForLookups("stoy")).toBe(true);
    expect(sectionWaitsForLookups("grunnforhold")).toBe(true);
    expect(sectionWaitsForLookups("infrastruktur")).toBe(true);
    // Nærområdet og forurenset grunn kommer bare fra databasen, og vises med én gang.
    expect(sectionWaitsForLookups("naeromradet")).toBe(false);
    expect(sectionWaitsForLookups("forurenset-grunn")).toBe(false);
  });
});

describe("tilstanden per seksjon", () => {
  it("laster så lenge én av kildene ikke har svart", () => {
    expect(combineStates(["klar", "laster"])).toBe("laster");
    expect(combineStates(["feilet", "laster"])).toBe("laster");
  });

  it("feiler bare når alle kildene er nede", () => {
    expect(combineStates(["feilet", "feilet"])).toBe("feilet");
    expect(combineStates(["feilet"])).toBe("feilet");
    // Svarer én av dem, viser vi det vi har.
    expect(combineStates(["klar", "feilet"])).toBe("klar");
  });
});

describe("hvilke seksjoner som vises", () => {
  const order = ["saker", "grunnforhold", "stoy", "naeromradet"];

  it("viser en seksjon som laster, selv uten data ennå", () => {
    const synlige = visibleSections({ order, groups: [], stateFor: () => "laster" });
    expect(synlige.map((s) => s.sectionId)).toEqual(order);
    expect(synlige.every((s) => s.group === undefined)).toBe(true);
  });

  it("skjuler en ferdig seksjon uten treff, og lar de andre flytte opp", () => {
    const synlige = visibleSections({
      order,
      groups: [gruppe("naeromradet")],
      stateFor: () => "klar",
    });
    expect(synlige.map((s) => s.sectionId)).toEqual(["naeromradet"]);
  });

  it("skiller «ingen treff» fra «kunne ikke hentes»", () => {
    const synlige = visibleSections({
      order,
      groups: [gruppe("naeromradet")],
      stateFor: (id) => (id === "stoy" ? "feilet" : "klar"),
    });
    // Støy feilet og vises med feiltekst; grunnforhold var tomt og vises ikke.
    expect(synlige.map((s) => [s.sectionId, s.state])).toEqual([
      ["stoy", "feilet"],
      ["naeromradet", "klar"],
    ]);
  });

  it("beholder rekkefølgen fra svaret, også når forurenset grunn løftes", () => {
    const løftet = sectionOrder({ contaminationAtSearchPoint: true }).map((s) => s.id);
    const synlige = visibleSections({
      order: løftet,
      groups: løftet.map(gruppe),
      stateFor: () => "klar",
    });
    expect(synlige[0]!.sectionId).toBe("forurenset-grunn");
  });

  it("følger standardrekkefølgen når søkepunktet ikke ligger i en lokalitet", () => {
    // Nærområdet først: det er det mest umiddelbart forståelige svaret. Plansakene er
    // viktige, men mer tekniske, og kommer rett etter.
    expect(sectionOrder({ contaminationAtSearchPoint: false }).map((s) => s.id)).toEqual([
      "naeromradet",
      "saker",
      "grunnforhold",
      "stoy",
      "infrastruktur",
      "forurenset-grunn",
    ]);
  });

  it("har ingen egen hovedseksjon for lokale saker", () => {
    // Støysaker og bydelsvedtak skal inn som undertyper under «Planer og saker».
    const idn = AREA_SECTIONS.map((s) => s.id);
    for (const forbudt of ["naboklager", "lokale-saker", "saker-i-naeromradet"]) {
      expect(idn).not.toContain(forbudt);
    }
    expect(AREA_SECTIONS.find((s) => s.id === "saker")?.label).toBe("Planer og saker");
  });

  it("lar plansaksseksjonen stå i rekkefølgen uten å hente områdefakta", () => {
    // Seksjonen fylles av events, så den har ingen kategorier — og skal aldri få en faktagruppe.
    expect(AREA_SECTIONS.find((s) => s.id === "saker")?.categories).toEqual([]);
  });
});

describe("delsvarene settes sammen", () => {
  it("slår sammen fakta i samme seksjon fra begge kildene", () => {
    const db = ok([{ ...gruppe("grunnforhold"), facts: [{ id: "sone", contains: true, distanceM: 0 } as never] }]);
    const oppslag = ok([
      { ...gruppe("grunnforhold"), facts: [{ id: "aktsomhet", contains: false, distanceM: 500 } as never] },
      gruppe("stoy"),
    ]);

    const slått = mergeFactResults(db, oppslag);
    expect(slått.status).toBe("ok");
    if (slått.status !== "ok") return;
    const grunn = slått.groups.find((g) => g.sectionId === "grunnforhold")!;
    // Nærmest først, og det som dekker søkepunktet øverst.
    expect(grunn.facts.map((f) => f.id)).toEqual(["sone", "aktsomhet"]);
    expect(slått.groups.map((g) => g.sectionId)).toEqual(["grunnforhold", "stoy"]);
  });

  it("bruker rekkefølgen fra databasen, som vet om søkepunktet er berørt", () => {
    const løftet = ["forurenset-grunn", "grunnforhold", "stoy"];
    const slått = mergeFactResults(ok([gruppe("forurenset-grunn")], løftet), ok([gruppe("stoy")]));
    expect(slått.status === "ok" && slått.order).toEqual(løftet);
    expect(slått.status === "ok" && slått.groups.map((g) => g.sectionId)).toEqual(["forurenset-grunn", "stoy"]);
  });

  it("viser det ene delsvaret når det andre er nede", () => {
    expect(mergeFactResults(ok([gruppe("naeromradet")]), nede).status).toBe("ok");
    expect(mergeFactResults(nede, ok([gruppe("stoy")])).status).toBe("ok");
    expect(mergeFactResults(nede, nede).status).toBe("unavailable");
  });

  it("slår sammen kilder og kartobjekter uten dubletter", () => {
    const kilde = { name: "NVE", owner: "NVE", licenseName: "NLOD", licenseUrl: "x" };
    const db = { ...ok([]), sources: [kilde], unavailableSources: ["A"] } as AreaFactsResult;
    const oppslag = { ...ok([]), sources: [kilde], unavailableSources: ["A", "B"] } as AreaFactsResult;
    const slått = mergeFactResults(db, oppslag);
    expect(slått.status === "ok" && slått.sources).toHaveLength(1);
    expect(slått.status === "ok" && slått.unavailableSources).toEqual(["A", "B"]);
  });
});

describe("kildene hentes hver for seg", () => {
  it("lar en seksjon som bare bruker databasen bli klar før oppslagene", () => {
    const stateFor = (sectionId: string): SourceState =>
      combineStates(sectionWaitsForLookups(sectionId) ? ["klar", "laster"] : ["klar"]);

    expect(stateFor("naeromradet")).toBe("klar");
    expect(stateFor("forurenset-grunn")).toBe("klar");
    expect(stateFor("stoy")).toBe("laster");
    expect(stateFor("grunnforhold")).toBe("laster");
  });

  it("lar databasen være nede uten at oppslagsseksjonene feiler", () => {
    const stateFor = (sectionId: string): SourceState =>
      combineStates(sectionWaitsForLookups(sectionId) ? ["feilet", "klar"] : ["feilet"]);

    expect(stateFor("stoy")).toBe("klar");
    expect(stateFor("naeromradet")).toBe("feilet");
  });
});
