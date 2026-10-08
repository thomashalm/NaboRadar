import { describe, expect, it } from "vitest";
import { areaParamsSchema } from "@/lib/area-params";
import { buildOverview, findTheme, mapFocus, themeHref, themesFor, THEME_COLORS } from "@/lib/area-themes";
import type { AreaEventsResult } from "@/lib/events/queries";
import { noiseFloor, noiseScale, scalePosition } from "@/lib/facts/noise-scale";
import type { AreaFactGroup, AreaFactsResult, FactCluster } from "@/lib/facts/queries";
import { AREA_SECTIONS, PUBLIC_AREA_SECTIONS } from "@/types/area-feature";

const OFFENTLIG = PUBLIC_AREA_SECTIONS.map((s) => s.id);

const cluster = (sectionId: string, id: string, summary: string, extra: Partial<FactCluster> = {}): FactCluster => ({
  sectionId,
  id,
  label: id,
  summary,
  facts: [],
  lists: [],
  overview: null,
  caveat: null,
  sourceName: "Kilde",
  ...extra,
});
const group = (sectionId: string, clusters: FactCluster[]): AreaFactGroup => ({
  sectionId,
  label: sectionId,
  intro: null,
  facts: [],
  clusters,
  overview: null,
});
const facts = (groups: AreaFactGroup[], order: readonly string[] = OFFENTLIG): AreaFactsResult =>
  ({ status: "ok", groups, order, mapFeatures: [], sources: [], unavailableSources: [] }) as unknown as AreaFactsResult;
const events = (n: number): AreaEventsResult =>
  ({
    status: "ok",
    dataUpdatedAt: "2026-10-01T00:00:00Z",
    events: Array.from({ length: n }, (_, i) => ({ id: String(i), type: "planning_started" })),
  }) as unknown as AreaEventsResult;

const stored = facts([
  group("naeromradet", [
    cluster("naeromradet", "skoler-og-barnehager", "2 skoler · 7 barnehager innen 1 km", { label: "Skoler og barnehager" }),
    cluster("naeromradet", "helse", "1 sykehus innen 1 km", { label: "Helse og omsorg" }),
    cluster("naeromradet", "ny-stedstype", "3 steder innen 1 km", { label: "Ny stedstype" }),
  ]),
]);
const lookups = facts([
  group("stoy", [
    cluster("stoy", "stoy", "", {
      label: "Lavt modellert støynivå fra vei og bane ved søkepunktet.",
      emptyNote: { text: "Lavt modellert støynivå fra vei og bane ved søkepunktet.", detail: "Under 50 dB i støykartene.", nearestLink: false },
    }),
  ]),
  group("infrastruktur", [cluster("infrastruktur", "infrastruktur", "1 kraftlinje innen 1 km", { label: "Infrastruktur" })]),
]);

describe("temaene", () => {
  it("har de fem viktigste først, og resten under «Mer i området»", () => {
    const temaer = themesFor(stored);
    expect(temaer.filter((t) => t.primary).map((t) => t.id)).toEqual(["stoy", "naturfare", "planer", "skoler", "infrastruktur"]);
    expect(temaer.filter((t) => !t.primary).map((t) => t.id)).toEqual([
      "helse",
      "servering",
      "anlegg",
      "friluft",
      "tilfluktsrom",
      "ny-stedstype",
    ]);
  });

  it("gir en ny stedstype et eget tema, så ingenting forsvinner", () => {
    const tema = findTheme(themesFor(stored), "ny-stedstype");
    expect(tema).toMatchObject({ label: "Ny stedstype", source: { kind: "section", sectionId: "naeromradet", clusterId: "ny-stedstype" } });
  });

  it("dekker alle offentlige seksjoner", () => {
    const dekket = new Set(
      themesFor(facts([])).map((t) => (t.source.kind === "section" ? t.source.sectionId : t.source.kind)),
    );
    for (const id of OFFENTLIG) expect(dekket, id).toContain(id);
  });

  it("løfter en intern seksjon serveren har satt først (admin)", () => {
    const admin = facts([], ["forurenset-grunn", ...OFFENTLIG]);
    expect(themesFor(admin)[0]).toMatchObject({ id: "forurenset-grunn", label: "Forurenset grunn", primary: true });
    const ikkeLoftet = facts([], AREA_SECTIONS.map((s) => s.id));
    expect(themesFor(ikkeLoftet).find((t) => t.id === "forurenset-grunn")?.primary).toBe(false);
  });

  it("har én farge per tema, og ingen deler farge med et annet fast tema", () => {
    const farger = themesFor(null).map((t) => t.color);
    expect(new Set(farger).size).toBe(farger.length);
    expect(Object.values(THEME_COLORS).every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
  });
});

describe("oversikten", () => {
  it("gjentar gruppenes egne linjer ordrett", () => {
    const rows = buildOverview({ stored, lookups, events: events(2), radius: 1000 });
    expect(rows.map((r) => [r.theme.id, r.text, r.detail])).toEqual([
      ["stoy", "Lavt modellert støynivå fra vei og bane ved søkepunktet.", "Under 50 dB i støykartene."],
      ["planer", "2 varslede planoppstarter innen 1 km", "Siste 24 måneder"],
      ["skoler", "2 skoler · 7 barnehager innen 1 km", undefined],
      ["infrastruktur", "1 kraftlinje innen 1 km", undefined],
      ["helse", "1 sykehus innen 1 km", undefined],
      ["ny-stedstype", "3 steder innen 1 km", undefined],
    ]);
  });

  it("sier ingenting om et tema uten svar — fravær av data er ikke et funn", () => {
    const ids = buildOverview({ stored, lookups, events: events(2), radius: 1000 }).map((r) => r.theme.id);
    expect(ids).not.toContain("naturfare");
    expect(ids).not.toContain("servering");
  });

  it("beholder alle avgrensningene når det ikke finnes plansaker", () => {
    const planer = buildOverview({ stored: facts([]), lookups: facts([]), events: events(0), radius: 500 }).find(
      (r) => r.theme.id === "planer",
    );
    expect(planer).toMatchObject({
      text: "Ingen varslede planoppstarter",
      detail: "Fra private forslagsstillere · innen 500 m · siste 24 måneder",
    });
  });

  it("viser at de viktigste temaene lastes, og venter ikke på oppslagene for det databasen kan svare på", () => {
    const forst = buildOverview({ stored: null, lookups: null, events: null, radius: 1000 });
    expect(forst.map((r) => [r.theme.id, r.text])).toEqual([
      ["stoy", null],
      ["naturfare", null],
      ["planer", null],
      ["infrastruktur", null],
    ]);
    const delvis = buildOverview({ stored, lookups: null, events: null, radius: 1000 });
    expect(delvis.find((r) => r.theme.id === "skoler")?.text).toBe("2 skoler · 7 barnehager innen 1 km");
    expect(delvis.find((r) => r.theme.id === "stoy")?.text).toBeNull();
  });

  it("tier om temaer der kilden ikke svarte", () => {
    const nede = { status: "unavailable" } as unknown as AreaFactsResult;
    const rows = buildOverview({ stored, lookups: nede, events: { status: "unavailable" } as unknown as AreaEventsResult, radius: 1000 });
    expect(rows.map((r) => r.theme.id)).toEqual(["skoler", "helse", "ny-stedstype"]);
  });
});

describe("kartet følger temaet", () => {
  it("viser alt uten valgt tema", () => {
    expect(mapFocus(null)).toEqual({ categories: null, plans: true });
  });

  it("viser bare stedene temaet eier, og planområder bare for Planer", () => {
    const temaer = themesFor(stored);
    expect([...mapFocus(findTheme(temaer, "skoler")).categories!]).toEqual(["oppvekst"]);
    expect([...mapFocus(findTheme(temaer, "helse")).categories!]).toEqual(["helse", "omsorg"]);
    expect(mapFocus(findTheme(temaer, "skoler")).plans).toBe(false);
    expect(mapFocus(findTheme(temaer, "planer"))).toEqual({ categories: new Set(), plans: true });
  });
});

describe("tema i URL-en", () => {
  const search = "lat=59.96646&lng=10.74715&radius=1000&label=Langmyrgrenda+26C%2C+0861+Oslo";

  it("er en søkeparameter, ikke et anker — ingenting skal rulle", () => {
    const href = themeHref("/omrade", search, "stoy");
    expect(href).toBe(`/omrade?${search}&tema=stoy`);
    expect(href).not.toContain("#");
  });

  it("fjerner temaet når man går tilbake til oversikten, og bytter uten å hope opp", () => {
    expect(themeHref("/omrade", `${search}&tema=stoy`, null)).toBe(`/omrade?${search}`);
    expect(themeHref("/omrade", `${search}&tema=stoy`, "planer")).toBe(`/omrade?${search}&tema=planer`);
  });

  it("forstyrrer ikke adressen: /omrade leser de samme parametrene med og uten tema", () => {
    const uten = areaParamsSchema.parse(Object.fromEntries(new URLSearchParams(search)));
    const med = areaParamsSchema.parse(Object.fromEntries(new URLSearchParams(`${search}&tema=stoy`)));
    expect(med).toEqual(uten);
  });

  it("viser oversikten for et ukjent tema", () => {
    expect(findTheme(themesFor(stored), "finnes-ikke")).toBeNull();
    expect(findTheme(themesFor(stored), "oversikt")).toBeNull();
    expect(findTheme(themesFor(stored), null)).toBeNull();
  });
});

describe("støyskalaen", () => {
  it("tegner intervallet kilden oppgir, med T-1442-grensene for riktig støykilde", () => {
    const vei = noiseScale({ subtype: "stoy_strategisk_veg", headline: "Beregnet støy fra veitrafikk: Lden 60–64 dB" });
    expect(vei).toMatchObject({ from: 60, to: 64, marks: [{ db: 55, label: "Gul fra 55" }, { db: 65, label: "Rød fra 65" }] });
    const bane = noiseScale({ subtype: "stoy_strategisk_bane", headline: "Beregnet støy fra jernbane: Lden 55–59 dB" });
    expect(bane?.marks.map((m) => m.db)).toEqual([58, 68]);
  });

  it("tegner ingenting for støytyper uten Lden-intervall, eller når tallet ikke kan leses", () => {
    expect(noiseScale({ subtype: "stoy_veg_varsel", headline: "Gul støysone for veitrafikk (T-1442)" })).toBeNull();
    expect(noiseScale({ subtype: "stoy_strategisk_veg", headline: "Beregnet støy fra veitrafikk" })).toBeNull();
  });

  it("plasserer verdier på aksen og holder dem innenfor den", () => {
    const akse = { min: 45, max: 80 };
    expect(scalePosition(akse, 45)).toBe(0);
    expect(scalePosition(akse, 80)).toBe(100);
    expect(scalePosition(akse, 62.5)).toBe(50);
    expect(scalePosition(akse, 120)).toBe(100);
  });

  it("viser «under laveste nivå» uten punkt, og bare når kilden nevner én grense", () => {
    expect(noiseFloor("Under 50 dB i støykartene.")).toMatchObject({ below: 50 });
    expect(noiseFloor("Under 50 dB for vei og 55 dB for jernbane i støykartene.")).toBeNull();
    expect(noiseFloor("Området er ikke kartlagt.")).toBeNull();
    expect(noiseFloor(null)).toBeNull();
  });
});
