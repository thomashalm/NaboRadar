import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { HUT_NEARBY, HUT_NEIGHBOURS, selectNearbyHuts, selectNeighbourHuts, type Hut } from "@/lib/huts/queries";
import {
  HUT_ACCESS_LABELS,
  formatHutDistance,
  hutAccessLine,
  hutCountLine,
  hutDetailLines,
  hutDistanceFrom,
  hutFacts,
  hutOriginName,
  hutPlaceLine,
  hutSummaryLine,
} from "@/lib/huts/wording";

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

describe("andre hytter i nærheten", () => {
  it("er de nærmeste, uten hytta selv", () => {
    const rader = [0, 1, 2, 3, 4, 5, 6, 7].map((km) => hytte(km));
    const naboer = selectNeighbourHuts(rader, "h0");
    expect(naboer.map((h) => h.id)).toEqual(["h1", "h2", "h3", "h4", "h5"]);
    expect(naboer).toHaveLength(HUT_NEIGHBOURS.count);
    // Færre enn fem i nærheten: da vises de som finnes, og ingen fylles på.
    expect(selectNeighbourHuts([hytte(0), hytte(2)], "h0").map((h) => h.id)).toEqual(["h2"]);
    expect(selectNeighbourHuts([hytte(0)], "h0")).toEqual([]);
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

  it("navngir stedet en avstand er målt fra", () => {
    // Stedet er første ledd av adressen: «Storgata 1», ikke hele adresselinjen.
    expect(hutOriginName("Storgata 1, 0155 Oslo")).toBe("Storgata 1");
    expect(hutOriginName("Kobberhaughytta")).toBe("Kobberhaughytta");
    expect(hutOriginName("  ")).toBe("valgt sted");
    expect(hutOriginName(null)).toBe("valgt sted");
    expect(hutOriginName("x".repeat(60))).toHaveLength(40);
    expect(hutDistanceFrom(4200, "Storgata 1")).toBe("4,2 km fra Storgata 1");
    expect(hutSummaryLine({ type: "unstaffed_hut", ownerKind: "dnt", distanceM: 4200 }, "Storgata 1")).toBe(
      "Ubetjent hytte · DNT · 4,2 km fra Storgata 1",
    );
    // Uten avstand er det heller ikke noe sted å nevne.
    expect(hutSummaryLine({ type: "unstaffed_hut", ownerKind: "dnt", distanceM: null }, "Storgata 1")).toBe("Ubetjent hytte · DNT");
  });

  it("sier det Kartverkets kodeliste sier om tilgang — ikke «åpen», og ikke «ingen nøkkel»", () => {
    // Låst = «Låst og krever forhåndsbooking». Ulåst = «Ulåst eller tilgjengelig med DNTs standardnøkkel».
    expect(hutAccessLine(true)).toBe("Låst – må bestilles på forhånd");
    expect(hutAccessLine(false)).toBe("Ulåst, eller åpnes med DNT-nøkkel");
    expect(hutAccessLine(null)).toBeNull();
    for (const tekst of Object.values(HUT_ACCESS_LABELS)) {
      expect(tekst).not.toMatch(/åpen|stengt|ingen nøkkel|ledig/i);
    }
    expect(hutDetailLines({ overnight: "yes", beds: null, locked: false, managerName: null })).toEqual(["Overnatting", "Ulåst eller DNT-nøkkel"]);
    expect(hutDetailLines({ overnight: "yes", beds: 12, locked: true, managerName: "DNT Oslo og Omegn" })).toEqual([
      "Overnatting · 12 sengeplasser",
      "Låst, bestilles på forhånd",
      "Forvaltes av DNT Oslo og Omegn",
    ]);
    expect(hutDetailLines({ overnight: "no", beds: null, locked: null, managerName: null })).toEqual([
      "Rast og dagsbesøk, ikke beregnet for overnatting",
    ]);
    // Ukjent er ukjent: ingen linje, ingen antakelse.
    expect(hutDetailLines({ overnight: "unknown", beds: null, locked: null, managerName: null })).toEqual([]);
  });

  it("viser bare faktarader med innhold", () => {
    const hut = {
      type: "self_service_hut",
      ownerKind: "dnt",
      managerName: null,
      overnight: "yes",
      beds: null,
      locked: true,
      lat: 60.0360956,
      lng: 10.6636515,
      municipalityName: "Nittedal",
      countyName: "Akershus",
      elevationM: 433,
    } as const;
    expect(hutFacts(hut, true)).toEqual([
      ["Type", "Selvbetjent hytte"],
      ["Eier", "DNT"],
      ["Bruk", "Overnatting"],
      ["Tilgang", "Låst – må bestilles på forhånd"],
      ["Kommune", "Nittedal"],
      ["Fylke", "Akershus"],
      ["Høyde", "ca. 433 moh."],
      ["Koordinater", "60,0361° N, 10,6637° Ø"],
    ]);
    // Oslo er både kommune og fylke: da står det én gang.
    const oslo = { ...hut, municipalityName: "Oslo", countyName: "Oslo" };
    expect(hutFacts(oslo, true).map(([navn]) => navn)).not.toContain("Fylke");
    expect(hutPlaceLine(oslo)).toBe("Oslo");
    expect(hutPlaceLine(hut)).toBe("Nittedal, Akershus");
    expect(hutPlaceLine({})).toBeNull();
    // Kortversjonen i lista har verken fylke, høyde eller koordinater.
    expect(hutFacts(hut, false).map(([navn]) => navn)).toEqual(["Type", "Eier", "Bruk", "Tilgang", "Kommune"]);
    // En hytte kilden vet lite om, får få rader — ingen tomme, og ingen «ukjent».
    const tom = { ...hut, type: "unknown", ownerKind: "other", overnight: "unknown", locked: null, municipalityName: null, countyName: null, elevationM: null } as const;
    expect(hutFacts(tom, true)).toEqual([["Koordinater", "60,0361° N, 10,6637° Ø"]]);
    expect(hutFacts(tom, false)).toEqual([]);
  });

  it("teller riktig", () => {
    expect(hutCountLine(1, 30_000, false)).toBe("1 hytte eller koie innen 30 km");
    expect(hutCountLine(9, 10_000, false)).toBe("9 hytter og koier innen 10 km");
    expect(hutCountLine(100, 10_000, true)).toBe("Over 100 hytter og koier innen 10 km");
  });
});

import { buildHutHref, buildHutMapHref, hutRefFromSlug, hutSlug } from "@/lib/huts/href";
import { hutLinks } from "@/lib/huts/wording";

describe("lenker ut fra en hytte", () => {
  const base = { bookingUrl: null, infoUrl: null, ownerKind: "dnt" as const, managerName: null };

  it("sier «Bestill» bare om en side der man bestiller", () => {
    expect(hutLinks({ ...base, bookingUrl: "https://eksempel.no/bestill" })).toEqual([
      { kind: "booking", href: "https://eksempel.no/bestill", label: "Bestill hos DNT" },
    ]);
    expect(hutLinks({ ...base, infoUrl: "https://eksempel.no/info" })).toEqual([
      { kind: "info", href: "https://eksempel.no/info", label: "Se hos DNT" },
    ]);
  });

  it("viser begge når begge finnes, bestilling først", () => {
    const lenker = hutLinks({ ...base, ownerKind: "statskog", bookingUrl: "https://a.no", infoUrl: "https://b.no" });
    expect(lenker.map((l) => l.label)).toEqual(["Bestill hos Statskog", "Se hos Statskog"]);
  });

  it("bruker forvalternavnet når eierkategorien ikke sier hvem, og ellers ingen navn", () => {
    expect(hutLinks({ ...base, ownerKind: "other", managerName: "Lunner Almenning", infoUrl: "https://b.no" })[0]!.label).toBe("Se hos Lunner Almenning");
    expect(hutLinks({ ...base, ownerKind: "other", infoUrl: "https://b.no" })[0]!.label).toBe("Mer informasjon");
    expect(hutLinks({ ...base, ownerKind: "unknown", bookingUrl: "https://a.no" })[0]!.label).toBe("Bestill");
  });

  it("viser ingenting når vi ikke har en lenke", () => {
    expect(hutLinks(base)).toEqual([]);
  });
});

describe("fast adresse for en hytte", () => {
  const hut = { id: "3f2a9c1e-1111-4222-8333-444455556666", name: "Sæteren gård" };

  it("bygger adressen av navnet og starten på ID-en", () => {
    expect(buildHutHref(hut)).toBe("/hytter/saeteren-gard-3f2a9c1e");
    expect(hutSlug("Ommen/Veslestua")).toBe("ommen-veslestua");
    expect(hutSlug("Bøvelstad")).toBe("bovelstad");
    expect(hutSlug("—")).toBe("hytte");
  });

  it("finner ID-en igjen uansett hva navnet foran er", () => {
    expect(hutRefFromSlug("saeteren-gard-3f2a9c1e")).toBe("3f2a9c1e");
    expect(hutRefFromSlug("et-helt-annet-navn-3f2a9c1e")).toBe("3f2a9c1e");
    expect(hutRefFromSlug("3f2a9c1e")).toBe("3f2a9c1e");
    expect(hutRefFromSlug("saeteren-gard")).toBeNull();
    expect(hutRefFromSlug("saeteren-gard-3F2A9C1E")).toBeNull();
  });
});

describe("lenke til hyttekartet", () => {
  it("har med stedet og radien når kartet skal vise avstand", () => {
    const href = buildHutMapHref({ lat: 59.91391, lng: 10.75221, from: "Storgata 1, 0155 Oslo", radiusM: 20_000 });
    const query = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/hytter?")).toBe(true);
    expect(Object.fromEntries(query)).toEqual({ lat: "59.91391", lng: "10.75221", fra: "Storgata 1, 0155 Oslo", radius: "20" });
  });

  it("har ikke med noe sted når det ikke finnes et — da viser kartet ingen avstand", () => {
    expect(buildHutMapHref({ lat: 60, lng: 10.5 })).toBe("/hytter?lat=60.00000&lng=10.50000");
  });
});
