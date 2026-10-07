import { describe, expect, it } from "vitest";
import { buildChapters, HVERDAG_CLUSTER } from "@/lib/area-chapters";
import { buildAreaSummary, sectionAnchor } from "@/lib/area-summary";
import type { AreaEventsResult } from "@/lib/events/queries";
import type { AreaFactGroup, AreaFactsResult, FactCluster } from "@/lib/facts/queries";
import { PUBLIC_AREA_SECTIONS, AREA_SECTIONS } from "@/types/area-feature";

const OFFENTLIG = PUBLIC_AREA_SECTIONS.map((s) => s.id);

describe("kapitlene på /omrade", () => {
  it("ordner seksjonene slik en boligkjøper leser dem", () => {
    const { lifted, chapters } = buildChapters(OFFENTLIG);
    expect(lifted).toEqual([]);
    expect(chapters.map((c) => c.label)).toEqual([
      "Ved adressen",
      "Hva kan endre seg",
      "Hverdagen",
      "I nærområdet",
      "Utforsk området",
    ]);
    expect(chapters.map((c) => c.parts)).toEqual([
      [
        { kind: "section", sectionId: "stoy" },
        { kind: "section", sectionId: "grunnforhold" },
      ],
      [{ kind: "saker" }],
      [{ kind: "skolekrets" }, { kind: "section", sectionId: "naeromradet", clusters: "hverdag" }],
      [
        { kind: "section", sectionId: "infrastruktur" },
        { kind: "section", sectionId: "naeromradet", clusters: "ovrige" },
      ],
      [{ kind: "friluft" }, { kind: "section", sectionId: "tilfluktsrom" }],
    ]);
  });

  it("mister ingen offentlig seksjon", () => {
    const plassert = buildChapters(OFFENTLIG).chapters.flatMap((c) =>
      c.parts.map((p) => (p.kind === "section" ? p.sectionId : p.kind === "saker" ? "saker" : null)),
    );
    for (const id of OFFENTLIG) expect(plassert, id).toContain(id);
  });

  it("viser en seksjon serveren har løftet, foran kapitlene (admin)", () => {
    const admin = ["forurenset-grunn", ...OFFENTLIG];
    const { lifted, chapters } = buildChapters(admin);
    expect(lifted).toEqual(["forurenset-grunn"]);
    expect(JSON.stringify(chapters)).not.toContain("forurenset-grunn");
  });

  it("legger en intern eller ukjent seksjon i nærområdet når den ikke er løftet", () => {
    const { lifted, chapters } = buildChapters(AREA_SECTIONS.map((s) => s.id));
    expect(lifted).toEqual([]);
    const naer = chapters.find((c) => c.id === "naeromradet");
    expect(naer?.parts).toContainEqual({ kind: "section", sectionId: "forurenset-grunn" });
  });

  it("tar bare med seksjoner som finnes i svaret", () => {
    const { chapters } = buildChapters(["stoy", "saker"]);
    expect(chapters.find((c) => c.id === "naeromradet")?.parts).toEqual([]);
    expect(chapters.find((c) => c.id === "hverdagen")?.parts).toEqual([{ kind: "skolekrets" }]);
  });
});

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
const facts = (groups: AreaFactGroup[]): AreaFactsResult =>
  ({ status: "ok", groups, order: OFFENTLIG, mapFeatures: [], sources: [], unavailableSources: [] }) as unknown as AreaFactsResult;
const events = (n: number): AreaEventsResult =>
  ({
    status: "ok",
    dataUpdatedAt: "2026-10-01T00:00:00Z",
    events: Array.from({ length: n }, (_, i) => ({ id: String(i), type: "planning_started" })),
  }) as unknown as AreaEventsResult;

describe("«Området i korte trekk»", () => {
  const stored = facts([
    group("naeromradet", [
      cluster("naeromradet", HVERDAG_CLUSTER, "2 skoler · 7 barnehager innen 1 km"),
      cluster("naeromradet", "helse", "1 sykehus innen 1 km"),
    ]),
  ]);
  const lookups = facts([
    group("stoy", [cluster("stoy", "stoy", "Lavt modellert støynivå fra vei og bane ved søkepunktet")]),
    group("infrastruktur", [cluster("infrastruktur", "infrastruktur", "1 kraftlinje innen 1 km")]),
  ]);

  it("gjentar seksjonenes egne linjer, ordrett, og lenker til dem", () => {
    expect(buildAreaSummary({ stored, lookups, events: events(2), radius: 1000 })).toEqual([
      { id: "stoy", label: "Støy", text: "Lavt modellert støynivå fra vei og bane ved søkepunktet", href: `#${sectionAnchor("stoy")}` },
      { id: "saker", label: "Planer", text: "2 varslede planoppstarter innen 1 km", href: `#${sectionAnchor("saker")}` },
      { id: "skoler", label: "Skoler og barnehager", text: "2 skoler · 7 barnehager innen 1 km", href: `#${sectionAnchor("skoler")}` },
      { id: "infrastruktur", label: "Infrastruktur", text: "1 kraftlinje innen 1 km", href: `#${sectionAnchor("infrastruktur")}` },
    ]);
  });

  it("sier ingenting om et tema uten svar — fravær av data er ikke et funn", () => {
    const items = buildAreaSummary({ stored, lookups, events: events(2), radius: 1000 });
    expect(items.map((i) => i.id)).not.toContain("grunnforhold");
  });

  it("sier nøyaktig hva som er kontrollert når det ikke finnes plansaker", () => {
    const [planer] = buildAreaSummary({ stored: facts([]), lookups: facts([]), events: events(0), radius: 500 });
    expect(planer).toMatchObject({
      id: "saker",
      text: "Ingen varslede planoppstarter fra private forslagsstillere innen 500 m siste 24 måneder",
    });
  });

  it("viser at en kilde lastes, og venter ikke på oppslagene for det databasen alene kan svare på", () => {
    const items = buildAreaSummary({ stored, lookups: null, events: null, radius: 1000 });
    expect(items.find((i) => i.id === "stoy")?.text).toBeNull();
    expect(items.find((i) => i.id === "saker")?.text).toBeNull();
    expect(items.find((i) => i.id === "skoler")?.text).toBe("2 skoler · 7 barnehager innen 1 km");
  });

  it("tier om temaer der kilden ikke svarte, i stedet for å gjette", () => {
    const utilgjengelig = { status: "unavailable" } as unknown as AreaEventsResult;
    const items = buildAreaSummary({ stored, lookups: "failed", events: utilgjengelig, radius: 1000 });
    expect(items.map((i) => i.id)).toEqual(["skoler"]);
  });

  it("bruker tomlinjen når en gruppe ikke har noe innen radien", () => {
    const tom = facts([
      group("stoy", [cluster("stoy", "stoy", "", { emptyNote: { text: "Ingen støysoner ved søkepunktet", nearestLink: false } })]),
    ]);
    const items = buildAreaSummary({ stored: facts([]), lookups: tom, events: null, radius: 1000 });
    expect(items.find((i) => i.id === "stoy")?.text).toBe("Ingen støysoner ved søkepunktet");
  });
});
