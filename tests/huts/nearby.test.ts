import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { HUT_NEARBY, selectNearbyHuts, type Hut } from "@/lib/huts/queries";
import { formatHutDistance, hutCountLine, hutDetailLines, hutSummaryLine } from "@/lib/huts/wording";

const hytte = (km: number, over: Partial<Hut> = {}): Hut => ({
  id: `h${km}`,
  name: `Hytte ${km}`,
  type: "unstaffed_hut",
  ownerKind: "dnt",
  managerName: null,
  accessStatus: "unknown",
  locked: null,
  overnight: "yes",
  beds: null,
  bookingUrl: null,
  infoUrl: null,
  municipalityNumber: "0301",
  lat: 60,
  lng: 10.6,
  sourceUpdatedAt: null,
  distanceM: km * 1000,
  ...over,
});

describe("«i nærheten» for hytter", () => {
  it("holder seg på 10 km når det gir minst tre treff", () => {
    const valg = selectNearbyHuts([2, 5, 9, 12, 18, 25].map((km) => hytte(km)));
    expect(valg).toMatchObject({ radiusM: 10_000, count: 3, capped: false });
    expect(valg.cards.map((h) => h.name)).toEqual(["Hytte 2", "Hytte 5", "Hytte 9"]);
  });

  it("utvider til 20 km, og så 30 km, når det er for få", () => {
    expect(selectNearbyHuts([8, 12, 18, 25].map((km) => hytte(km)))).toMatchObject({ radiusM: 20_000, count: 3 });
    expect(selectNearbyHuts([8, 22, 28].map((km) => hytte(km)))).toMatchObject({ radiusM: 30_000, count: 3 });
  });

  it("stopper på 30 km selv om det bare finnes én", () => {
    const valg = selectNearbyHuts([14, 45].map((km) => hytte(km)));
    expect(valg).toMatchObject({ radiusM: 30_000, count: 1 });
    expect(selectNearbyHuts([45].map((km) => hytte(km)))).toMatchObject({ radiusM: 30_000, count: 0, cards: [] });
  });

  it("viser aldri flere kort enn grensen, men teller alle", () => {
    const valg = selectNearbyHuts([1, 2, 3, 4, 5, 6, 7].map((km) => hytte(km)));
    expect(valg.count).toBe(7);
    expect(valg.cards).toHaveLength(HUT_NEARBY.maxCards);
  });

  it("sier fra når oppslaget traff radgrensen", () => {
    const tre = [1, 2, 3].map((km) => hytte(km));
    expect(selectNearbyHuts(tre, 3).capped).toBe(true);
    expect(selectNearbyHuts(tre, 100).capped).toBe(false);
    // Rader utenfor valgt radius betyr at grensen ikke kuttet det som telles.
    expect(selectNearbyHuts([1, 2, 3, 25].map((km) => hytte(km)), 4).capped).toBe(false);
  });
});

describe("ordlyd", () => {
  it("setter sammen typen, eieren og avstanden — og dropper det kilden ikke sier", () => {
    expect(hutSummaryLine({ type: "staffed_hut", ownerKind: "dnt", distanceM: 7400 })).toBe("Betjent hytte · DNT · 7,4 km");
    // «Andre» i kilden er uspesifisert, og vises ikke som en eier.
    expect(hutSummaryLine({ type: "unstaffed_hut", ownerKind: "other", distanceM: 5810 })).toBe("Ubetjent hytte · 5,8 km");
    expect(hutSummaryLine({ type: "unknown", ownerKind: "unknown" })).toBe("Hytte");
    expect(formatHutDistance(430)).toBe("450 m");
  });

  it("sier «ulåst», ikke «åpen»", () => {
    expect(hutDetailLines({ overnight: "yes", beds: null, locked: false, managerName: null })).toEqual(["Overnatting", "Ulåst"]);
    expect(hutDetailLines({ overnight: "yes", beds: 12, locked: true, managerName: "DNT Oslo og Omegn" })).toEqual([
      "Overnatting · 12 sengeplasser",
      "Låst",
      "Forvaltes av DNT Oslo og Omegn",
    ]);
    expect(hutDetailLines({ overnight: "no", beds: null, locked: null, managerName: null })).toEqual([
      "Rast og dagsbesøk, ikke beregnet for overnatting",
    ]);
    // Ukjent er ukjent: ingen linje, ingen antakelse.
    expect(hutDetailLines({ overnight: "unknown", beds: null, locked: null, managerName: null })).toEqual([]);
  });

  it("teller riktig", () => {
    expect(hutCountLine(1, 30_000, false)).toBe("1 hytte eller koie innen 30 km");
    expect(hutCountLine(9, 10_000, false)).toBe("9 hytter og koier innen 10 km");
    expect(hutCountLine(100, 10_000, true)).toBe("Over 100 hytter og koier innen 10 km");
  });
});
