import { describe, expect, it } from "vitest";
import { erPlanendring, formaalFor, relevansgruppe, sorterEtterRelevans, tiltakLabel, tiltakstypeFor } from "@/lib/plans/visning";
import type { AreaEvent } from "@/types/event";

let løpenummer = 0;
function sak(o: { title?: string; distanceM: number; plantype?: string; areal?: number; dato?: string; attributes?: Record<string, string> }): AreaEvent {
  løpenummer++;
  return {
    id: `sak-${String(løpenummer).padStart(3, "0")}`,
    type: "planning_started",
    title: o.title ?? "Groheim",
    announcedAt: o.dato ?? "2026-01-01",
    sourceUpdatedAt: null,
    distanceM: o.distanceM,
    computedAreaM2: o.areal ?? 10_000,
    centroid: { type: "Point", coordinates: [10, 60] },
    geometry: { type: "Point", coordinates: [10, 60] },
    municipalityNumber: "0301",
    sourceUrl: null,
    sourceUrlType: null,
    attributes: { plantype: o.plantype ?? "Detaljregulering", ...o.attributes },
  };
}

describe("merkelapp og formål", () => {
  it("bruker uttrekket fra synken, og tittelen når saken ikke er lest ennå", () => {
    expect(tiltakstypeFor(sak({ distanceM: 0, title: "Furnesvegen 111", attributes: { tiltakstype: "naering" } }))).toBe("naering");
    expect(tiltakstypeFor(sak({ distanceM: 0, title: "Utneset masseuttak" }))).toBe("masseuttak");
    expect(tiltakstypeFor(sak({ distanceM: 0, title: "Groheim", attributes: { tiltakstype: "finnes-ikke" } }))).toBe("annet");
  });

  it("ukjent type heter «Planarbeid», og en planendring heter «Planendring» uansett hva planen gjelder", () => {
    expect(tiltakLabel(sak({ distanceM: 0, title: "Groheim" }))).toBe("Planarbeid");
    expect(tiltakLabel(sak({ distanceM: 0, title: "Flodda boligområde II" }))).toBe("Boligprosjekt");
    expect(tiltakLabel(sak({ distanceM: 0, title: "Hyllbekklia hyttefelt", plantype: "Mindre reguleringsendring" }))).toBe("Planendring");
    expect(tiltakLabel(sak({ distanceM: 0, title: "Flodda boligområde", plantype: "Forenklet endring i reguleringsplan etter pbl2008" }))).toBe("Planendring");
    expect(erPlanendring("Detaljregulering")).toBe(false);
    expect(erPlanendring("Områderegulering")).toBe(false);
    expect(erPlanendring(null)).toBe(false);
  });

  it("formålet finnes bare når synken fant en setning", () => {
    expect(formaalFor(sak({ distanceM: 0 }))).toBeNull();
    expect(formaalFor(sak({ distanceM: 0, attributes: { formaal: "  " } }))).toBeNull();
    expect(formaalFor(sak({ distanceM: 0, attributes: { formaal: "å etablere et datasenter" } }))).toBe("å etablere et datasenter");
  });
});

describe("relevans", () => {
  it("gruppe 1: stedet ligger i planområdet, eller et nytt planarbeid innen 300 m", () => {
    expect(relevansgruppe(sak({ distanceM: 0 }))).toBe(1);
    expect(relevansgruppe(sak({ distanceM: 0, plantype: "Mindre reguleringsendring" }))).toBe(1);
    expect(relevansgruppe(sak({ distanceM: 300 }))).toBe(1);
    expect(relevansgruppe(sak({ distanceM: 301 }))).toBe(2);
    expect(relevansgruppe(sak({ distanceM: 150, plantype: "Mindre reguleringsendring" }))).toBe(2);
  });

  it("gruppe 3: planendringer mer enn 500 m unna", () => {
    expect(relevansgruppe(sak({ distanceM: 501, plantype: "Mindre reguleringsendring" }))).toBe(3);
    expect(relevansgruppe(sak({ distanceM: 500, plantype: "Mindre reguleringsendring" }))).toBe(2);
    expect(relevansgruppe(sak({ distanceM: 900 }))).toBe(2);
  });

  it("sorterer etter gruppe, så avstand i trinn på 100 m, kjent type, størrelse og dato", () => {
    const iOmrådet = sak({ distanceM: 0, title: "A" });
    const nær = sak({ distanceM: 250, title: "B boligfelt" });
    const endringNær = sak({ distanceM: 120, title: "C", plantype: "Mindre reguleringsendring" });
    const stor = sak({ distanceM: 640, title: "D næringspark", areal: 500_000 });
    const liten = sak({ distanceM: 610, title: "E næringspark", areal: 5_000 });
    const ukjent = sak({ distanceM: 605, title: "F", areal: 900_000 });
    const endringFjern = sak({ distanceM: 520, title: "G", plantype: "Mindre reguleringsendring" });
    const sortert = sorterEtterRelevans([endringFjern, ukjent, liten, stor, endringNær, nær, iOmrådet]).map((e) => e.title);
    expect(sortert).toEqual(["A", "B boligfelt", "C", "D næringspark", "E næringspark", "F", "G"]);
  });

  it("nyeste først når alt annet er likt, og rekkefølgen er stabil", () => {
    const gammel = sak({ distanceM: 420, title: "X", dato: "2025-01-01" });
    const ny = sak({ distanceM: 430, title: "Y", dato: "2026-06-01" });
    expect(sorterEtterRelevans([gammel, ny]).map((e) => e.title)).toEqual(["Y", "X"]);
    expect(sorterEtterRelevans([ny, gammel]).map((e) => e.title)).toEqual(["Y", "X"]);
  });

  it("endrer ikke lista den får inn", () => {
    const inn = [sak({ distanceM: 900 }), sak({ distanceM: 0 })];
    const kopi = [...inn];
    sorterEtterRelevans(inn);
    expect(inn).toEqual(kopi);
  });
});
