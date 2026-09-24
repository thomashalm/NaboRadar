import { describe, expect, it } from "vitest";
import { mergeRepeatedAnnouncements } from "@/lib/events/queries";
import type { AreaEvent } from "@/types/event";

/**
 * Kilden har én rad per varsel om planoppstart, ikke én per plan. «Detaljregulering av
 * Ullernchausséen 52» lå tre ganger innen 3 km av Majorstuen, med samme plan-ID og litt ulik
 * dato og areal. Det er samme sak.
 */

function sak(overrides: Partial<AreaEvent> & { id: string }): AreaEvent {
  return {
    type: "planning_started",
    title: "En plan",
    announcedAt: "2025-01-01",
    sourceUpdatedAt: null,
    distanceM: 500,
    computedAreaM2: 1000,
    centroid: { type: "Point", coordinates: [10.7, 59.9] },
    geometry: { type: "Point", coordinates: [10.7, 59.9] },
    municipalityNumber: "0301",
    sourceUrl: null,
    sourceUrlType: null,
    attributes: { planId: "202457833" },
    ...overrides,
  } as AreaEvent;
}

describe("samme plan varslet flere ganger", () => {
  it("slår sammen varsler med samme kommune og plan-ID", () => {
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "c", announcedAt: "2025-11-21", computedAreaM2: 16883 }),
      sak({ id: "b", announcedAt: "2025-04-04", computedAreaM2: 13298 }),
      sak({ id: "a", announcedAt: "2024-11-15", computedAreaM2: 13298 }),
    ]);

    expect(resultat).toHaveLength(1);
    // Nyeste varsel er planen slik den står nå, også arealet.
    expect(resultat[0]!.id).toBe("c");
    expect(resultat[0]!.computedAreaM2).toBe(16883);
    expect(resultat[0]!.earlier).toEqual({ count: 2, firstAnnouncedAt: "2024-11-15" });
  });

  it("slår sammen selv om varslene har ulik tittel", () => {
    // Harstad: «Utvidelse av planområde – …» og «Detaljregulering for Harstad Brannstasjon»
    // er samme plan-ID 835, altså samme sak.
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "ny", title: "Utvidelse av planområde", announcedAt: "2025-03-27", municipalityNumber: "5503", attributes: { planId: "835" } }),
      sak({ id: "gammel", title: "Detaljregulering for Harstad Brannstasjon", announcedAt: "2024-07-01", municipalityNumber: "5503", attributes: { planId: "835" } }),
    ]);
    expect(resultat.map((e) => e.title)).toEqual(["Utvidelse av planområde"]);
    expect(resultat[0]!.earlier?.count).toBe(1);
  });

  it("beholder ulike planer som tilfeldigvis har samme navn", () => {
    // Trondheim har to «Detaljregulering Nedre Møllenberg» med hver sin plan-ID.
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "en", title: "Detaljregulering Nedre Møllenberg", attributes: { planId: "r20250001" } }),
      sak({ id: "to", title: "Detaljregulering Nedre Møllenberg", attributes: { planId: "r20250002" } }),
    ]);
    expect(resultat).toHaveLength(2);
    expect(resultat.every((e) => e.earlier === undefined)).toBe(true);
  });

  it("slår aldri sammen saker som mangler plan-ID", () => {
    // To Oslo-planer uten planid er ikke samme sak fordi feltet er tomt hos begge.
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "thaulows", title: "Thaulows vei 19-25", attributes: {} }),
      sak({ id: "slemdal", title: "Slemdalsveien 125 m.fl.", attributes: { planId: "" } }),
    ]);
    expect(resultat).toHaveLength(2);
  });

  it("regner kildens «-» som manglende plan-ID, ikke som en felles ID", () => {
    // Ekte tilfelle i Oslo: begge planene står med «-», men er to forskjellige saker.
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "thaulows", title: "Thaulows vei 19-25", announcedAt: "2026-09-08", attributes: { planId: "-" } }),
      sak({ id: "slemdal", title: "Slemdalsveien 125 m.fl.", announcedAt: "2025-09-17", attributes: { planId: "-" } }),
    ]);
    expect(resultat.map((e) => e.title)).toEqual(["Thaulows vei 19-25", "Slemdalsveien 125 m.fl."]);
    expect(resultat.every((e) => e.earlier === undefined)).toBe(true);
  });

  it("tåler mellomrom rundt plan-ID-en fra kilden", () => {
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "ny", announcedAt: "2026-01-01", attributes: { planId: "202461894  " } }),
      sak({ id: "gammel", announcedAt: "2025-01-01", attributes: { planId: "202461894" } }),
    ]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0]!.id).toBe("ny");
  });

  it("slår ikke sammen samme plan-ID i ulike kommuner", () => {
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "oslo", municipalityNumber: "0301", attributes: { planId: "100" } }),
      sak({ id: "bergen", municipalityNumber: "4601", attributes: { planId: "100" } }),
    ]);
    expect(resultat).toHaveLength(2);
  });

  it("beholder rekkefølgen databasen sorterte etter", () => {
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "nær", distanceM: 100, attributes: { planId: "a" } }),
      sak({ id: "midt", distanceM: 200, attributes: { planId: "b" } }),
      sak({ id: "midt-duplikat", distanceM: 210, announcedAt: "2020-01-01", attributes: { planId: "b" } }),
      sak({ id: "fjern", distanceM: 900, attributes: { planId: "c" } }),
    ]);
    expect(resultat.map((e) => e.id)).toEqual(["nær", "midt", "fjern"]);
  });

  it("teller ikke en registrering gjort om igjen som et nytt varsel", () => {
    // Ekte tilfelle: «Skallum» i Bærum lå to ganger med plan-ID 3201_1996020, samme flate
    // på 1 851 m², samme avstand, og datoer ett døgn fra hverandre.
    const resultat = mergeRepeatedAnnouncements([
      sak({ id: "ny", title: "Skallum", announcedAt: "2025-09-24", computedAreaM2: 1851, municipalityNumber: "3201", attributes: { planId: "3201_1996020" } }),
      sak({ id: "gammel", title: "Skallum", announcedAt: "2025-09-23", computedAreaM2: 1851, municipalityNumber: "3201", attributes: { planId: "3201_1996020" } }),
    ]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0]!.id).toBe("ny");
    // Ingen «varslet én gang før» — det var samme varsel.
    expect(resultat[0]!.earlier).toBeUndefined();
  });

  it("lar en enkeltstående sak være urørt", () => {
    const en = sak({ id: "en" });
    expect(mergeRepeatedAnnouncements([en])).toEqual([en]);
  });
});
