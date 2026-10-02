import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hutAccessKind } from "@/lib/huts/types";
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
  hutSourceLine,
  hutStatusBadge,
  hutSummaryLine,
} from "@/lib/huts/wording";

const hytte = (km: number, over: Partial<Hut> = {}): Hut => ({
  id: `h${km}`,
  name: `Hytte ${km}`,
  type: "unstaffed_hut",
  ownerKind: "dnt",
  managerName: null,
  accessStatus: "unknown",
  access: "unknown",
  publicNote: null,
  overridden: [],
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
    expect(hutAccessLine("locked_prebooking")).toBe("Låst – må bestilles på forhånd");
    expect(hutAccessLine("unlocked_or_dnt_key")).toBe("Ulåst, eller åpnes med DNT-nøkkel");
    expect(hutAccessLine("unknown")).toBeNull();
    for (const tekst of Object.values(HUT_ACCESS_LABELS)) {
      if (tekst) expect(tekst).not.toMatch(/åpen|stengt|ingen nøkkel|ledig/i);
    }
    // Forvalterens opplysning, når den er kontrollert, står som den er — uten Kartverkets «eller».
    expect(hutAccessLine("code_lock")).toBe("Kodelås");
    expect(hutAccessLine("special_key")).toBe("Spesialnøkkel");
    expect(hutAccessLine("code_or_special_key")).toBe("Kodelås eller spesialnøkkel");
    expect(hutAccessLine("dnt_key", "short")).toBe("DNT-nøkkel");
    // Kildens verdi og overstyringen: overstyringen går foran, og en ukjent verdi ignoreres.
    expect(hutAccessKind(false, null)).toBe("unlocked_or_dnt_key");
    expect(hutAccessKind(false, "code_lock")).toBe("code_lock");
    expect(hutAccessKind(true, "finnes_ikke")).toBe("locked_prebooking");
    expect(hutAccessKind(null, undefined)).toBe("unknown");
    // Bare «midlertidig stengt» får plass i lister.
    expect(hutStatusBadge("closed")).toBe("Midlertidig stengt");
    expect(hutStatusBadge("seasonal")).toBeNull();
    expect(hutStatusBadge("unknown")).toBeNull();
    // Kildelinjen navngir forvalteren når noe er kontrollert mot den.
    expect(hutSourceLine({ overridden: [], managerName: "DNT Oslo og Omegn" }, "4. januar 2025")).toBe("Kartverket, N50 Kartdata · oppdatert 4. januar 2025.");
    expect(hutSourceLine({ overridden: ["access"], managerName: "DNT Oslo og Omegn" }, null)).toBe(
      "Kartverket, N50 Kartdata, og kontrollert informasjon fra DNT Oslo og Omegn.",
    );
    expect(hutSourceLine({ overridden: ["note"], managerName: null }, null)).toMatch(/fra forvalteren\.$/);
    expect(hutDetailLines({ overnight: "yes", beds: null, access: "unlocked_or_dnt_key", managerName: null })).toEqual(["Overnatting", "Ulåst eller DNT-nøkkel"]);
    expect(hutDetailLines({ overnight: "yes", beds: 12, access: "locked_prebooking", managerName: "DNT Oslo og Omegn" })).toEqual([
      "Overnatting · 12 sengeplasser",
      "Låst, bestilles på forhånd",
      "Forvaltes av DNT Oslo og Omegn",
    ]);
    expect(hutDetailLines({ overnight: "no", beds: null, access: "unknown", managerName: null })).toEqual([
      "Rast og dagsbesøk, ikke beregnet for overnatting",
    ]);
    // Ukjent er ukjent: ingen linje, ingen antakelse.
    expect(hutDetailLines({ overnight: "unknown", beds: null, access: "unknown", managerName: null })).toEqual([]);
  });

  it("viser bare faktarader med innhold", () => {
    const hut = {
      type: "self_service_hut",
      ownerKind: "dnt",
      managerName: null,
      overnight: "yes",
      beds: null,
      access: "locked_prebooking",
      bookingUrl: "https://hyttebestilling.dnt.no/hytte/1",
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
    const tom = { ...hut, type: "unknown", ownerKind: "other", overnight: "unknown", access: "unknown", municipalityName: null, countyName: null, elevationM: null } as const;
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
import { HUT_NEXT_STEP_NOTES, hutLinks, hutNextStep, hutUseLine } from "@/lib/huts/wording";

describe("lenker ut fra en hytte", () => {
  const base = { bookingUrl: null, infoUrl: null, managerName: null };

  it("sier «Bestill» bare om en side der man bestiller", () => {
    expect(hutLinks({ ...base, bookingUrl: "https://hyttebestilling.dnt.no/hytte/1" })).toEqual([
      { kind: "booking", href: "https://hyttebestilling.dnt.no/hytte/1", label: "Bestill hos DNT" },
    ]);
    expect(hutLinks({ ...base, infoUrl: "https://www.dnt.no/hytter/x" })).toEqual([
      { kind: "info", href: "https://www.dnt.no/hytter/x", label: "Se hos DNT" },
    ]);
  });

  it("en hytte som ikke er for allmennheten, får ingen oppfordring til å bestille", () => {
    const steg = hutNextStep({ ...base, access: "not_public", managerName: "Selbu fjellstyre" });
    expect(steg).toMatchObject({ bookingRequired: false, kind: "manager_only", note: HUT_NEXT_STEP_NOTES.notPublic });
    expect(hutAccessLine("not_public")).toBe("Ikke for allmennheten");
    // Den står ikke som et sted å overnatte, selv om kilden klassifiserer den slik.
    expect(hutUseLine({ overnight: "yes", beds: null, access: "not_public" })).toBeNull();
    expect(hutUseLine({ overnight: "yes", beds: null, access: "locked_prebooking" })).toBe("Overnatting");
  });

  it("navngir stedet lenken går til, ellers forvalteren — aldri eierkategorien", () => {
    // Lenken går til Inatur, selv om forvalteren er et fjellstyre.
    expect(hutLinks({ ...base, managerName: "Snåsa fjellstyre", bookingUrl: "https://www.inatur.no/hytte/1" })[0]!.label).toBe("Bestill hos Inatur");
    expect(hutLinks({ ...base, managerName: "Bondeungdomslaget i Oslo", bookingUrl: "https://www.bul.no/x", infoUrl: "https://www.bul.no/y" }).map((l) => l.label)).toEqual([
      "Bestill hos Bondeungdomslaget i Oslo",
      "Se hos Bondeungdomslaget i Oslo",
    ]);
    // Uten kjent forvalter og uten kjent nettsted er knappen navnløs.
    expect(hutLinks({ ...base, bookingUrl: "https://eksempel.no/bestill" })[0]!.label).toBe("Bestill hytta");
    expect(hutLinks({ ...base, infoUrl: "https://eksempel.no/info" })[0]!.label).toBe("Mer informasjon");
    // Et domene som bare ligner, er ikke DNT.
    expect(hutLinks({ ...base, bookingUrl: "https://ikke-dnt.no/x" })[0]!.label).toBe("Bestill hytta");
  });

  it("viser begge når begge finnes, bestilling først", () => {
    const lenker = hutLinks({ ...base, bookingUrl: "https://www.statskog.no/a", infoUrl: "https://www.statskog.no/b" });
    expect(lenker.map((l) => l.label)).toEqual(["Bestill hos Statskog", "Se hos Statskog"]);
  });

  it("viser ingenting når vi ikke har en lenke", () => {
    expect(hutLinks(base)).toEqual([]);
  });
});

describe("neste steg for en hytte", () => {
  const base = { access: "locked_prebooking", bookingUrl: null, infoUrl: null, managerName: null } as const;

  it("bestillingslenke: knappen er neste steg, uten ekstra tekst", () => {
    const steg = hutNextStep({ ...base, bookingUrl: "https://hyttebestilling.dnt.no/hytte/1", managerName: "DNT Oslo og Omegn" });
    expect(steg).toMatchObject({ kind: "booking_link", bookingRequired: true, note: null });
    expect(steg.links.map((l) => l.label)).toEqual(["Bestill hos DNT"]);
  });

  it("infoside uten bestillingslenke: viser til forvalteren", () => {
    const steg = hutNextStep({ ...base, infoUrl: "https://friluftsklubben.no/hyttene/Solstua", managerName: "Friluftsklubben i Oslo" });
    expect(steg.kind).toBe("info_link");
    expect(steg.links.map((l) => l.label)).toEqual(["Se hos Friluftsklubben i Oslo"]);
    expect(steg.note).toBe(HUT_NEXT_STEP_NOTES.info);
    // En koie som ikke kan reserveres, viser ikke til en bestilling.
    expect(hutNextStep({ ...base, access: "unlocked_or_dnt_key", infoUrl: "https://jevnaker-almenning.no/hytter/" }).note).toBe(
      "Oppdatert informasjon finner du hos forvalteren.",
    );
  });

  it("bare forvalter: sier at bestilling kreves, og at vi mangler lenken", () => {
    const steg = hutNextStep({ ...base, managerName: "Oslofjordens Friluftsråd" });
    expect(steg).toMatchObject({ kind: "manager_only", managerName: "Oslofjordens Friluftsråd", links: [] });
    expect(steg.note).toBe("Bestilling kreves. NaboRadar har foreløpig ikke en verifisert bestillingslenke.");
  });

  it("ingenting kjent: sier det rett ut, og peker ikke til en ukjent aktør", () => {
    const steg = hutNextStep(base);
    expect(steg).toMatchObject({ kind: "unknown", bookingRequired: true, links: [] });
    expect(steg.note).toMatch(/^Kartverket oppgir at hytta krever forhåndsbooking\./);
    expect(steg.note).not.toMatch(/den som driver/);
  });

  it("ulåst hytte uten lenke får ingen oppfordring", () => {
    expect(hutNextStep({ ...base, access: "unlocked_or_dnt_key" })).toMatchObject({ kind: "unknown", bookingRequired: false, note: null });
    expect(hutNextStep({ ...base, access: "unknown", managerName: "Lunner Almenning" })).toMatchObject({ kind: "manager_only", note: null });
    // En ulåst hytte kan likevel ha en bestillingslenke.
    expect(hutNextStep({ ...base, access: "unlocked_or_dnt_key", bookingUrl: "https://hyttebestilling.dnt.no/hytte/2" })).toMatchObject({
      kind: "booking_link",
      bookingRequired: false,
    });
  });

  it("ingen av tekstene sier noe om åpen, stengt eller ledig", () => {
    for (const tekst of Object.values(HUT_NEXT_STEP_NOTES)) expect(tekst).not.toMatch(/åpen|stengt|ledig|full/i);
  });

  it("tilgangsraden lover ikke bestilling når vi ikke vet hvor", () => {
    const hut = { type: "unstaffed_hut", ownerKind: "other", managerName: null, overnight: "yes", beds: null, access: "locked_prebooking", lat: 60, lng: 10 } as const;
    const tilgang = (h: Parameters<typeof hutFacts>[0]) => hutFacts(h, true).find(([navn]) => navn === "Tilgang")?.[1];
    expect(tilgang(hut)).toBe("Låst");
    expect(tilgang({ ...hut, managerName: "Bondeungdomslaget i Oslo" })).toBe("Låst – må bestilles på forhånd");
    expect(tilgang({ ...hut, bookingUrl: "https://www.bul.no/x" })).toBe("Låst – må bestilles på forhånd");
    expect(tilgang({ ...hut, access: "unlocked_or_dnt_key" })).toBe("Ulåst, eller åpnes med DNT-nøkkel");
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

import { hutMapRadius } from "@/components/huts/HutPointMap";

describe("kartutsnittet på hyttesiden", () => {
  it("strekker seg etter de tre nærmeste naboene, innenfor faste grenser", () => {
    const naboer = (...km: number[]) => km.map((k) => ({ distanceM: k * 1000 }));
    // Tredje nærmeste ligger 5,5 km unna: utsnittet går litt forbi den.
    expect(hutMapRadius(naboer(4.5, 5.2, 5.5, 5.7, 6.6))).toBeCloseTo(6325);
    // Naboer tett på: aldri trangere enn at hytta kan plasseres i terrenget.
    expect(hutMapRadius(naboer(0.1, 0.2, 0.3))).toBe(2500);
    // Naboer langt unna: aldri så vidt at hytta bare blir et punkt.
    expect(hutMapRadius(naboer(14, 22, 28))).toBe(10_000);
    // Færre enn tre naboer, eller ingen.
    expect(hutMapRadius(naboer(3))).toBeCloseTo(3450);
    expect(hutMapRadius([])).toBe(2500);
  });
});
