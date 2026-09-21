import { describe, expect, it } from "vitest";
import { fakeDocument, fakeFeature } from "../helpers/fake-dibk";
import { DibkPlanningStartedProvider } from "@/lib/providers/dibk/planning-started";
import { contentHash, stableStringify } from "@/lib/sync/hash";
import { mergeFragments } from "@/lib/sync/merge";

const provider = new DibkPlanningStartedProvider();
const normalize = (features: unknown[], documents: unknown[] = []) => provider.normalize({ features, documents }).events;

describe("mergeFragments (dedupe på arealplan)", () => {
  it("slår sammen flere features for samme arealplan til ett event med MultiPolygon", () => {
    const events = mergeFragments(
      normalize([
        fakeFeature({ id: 11, arealplan: 5, center: [10.7, 59.9] }),
        fakeFeature({ id: 12, arealplan: 5, center: [10.8, 59.9] }),
        fakeFeature({ id: 13, arealplan: 5, center: [10.9, 59.9] }),
      ]),
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.geometry.type).toBe("MultiPolygon");
    expect((events[0]!.geometry as { coordinates: unknown[] }).coordinates).toHaveLength(3);
    expect((events[0]!.rawData as { features: unknown[] }).features).toHaveLength(3);
  });

  it("gjør også enkeltpolygoner om til MultiPolygon (samme form som databasen)", () => {
    const [event] = mergeFragments(normalize([fakeFeature({ id: 1, arealplan: 1 })]));
    expect(event!.geometry.type).toBe("MultiPolygon");
  });

  it("dedupliserer aldri på plannavn", () => {
    const events = mergeFragments(
      normalize([
        fakeFeature({ id: 1, arealplan: 100, name: "Sentrum" }),
        fakeFeature({ id: 2, arealplan: 200, name: "Sentrum" }),
      ]),
    );
    expect(events.map((e) => e.externalId).sort()).toEqual(["100", "200"]);
  });

  it("bruker nyeste oppdateringsdato og slår sammen dokumenter uten duplikater", () => {
    const [event] = mergeFragments(
      normalize(
        [
          fakeFeature({ id: 1, arealplan: 5, updated: "2026-01-01T00:00:00Z", name: "Gammelt navn" }),
          fakeFeature({ id: 2, arealplan: 5, updated: "2026-06-01T00:00:00Z", name: "Nytt navn" }),
        ],
        [fakeDocument({ id: 7, arealplan: 5, type: "PlanomraadePdf" })],
      ),
    );
    expect(event!.sourceUpdatedAt).toBe("2026-06-01T00:00:00Z");
    expect(event!.title).toBe("Nytt navn");
    expect(event!.documents.map((d) => d.externalId)).toEqual(["7"]);
  });

  it("er uavhengig av rekkefølgen fragmentene kommer i", () => {
    const a = fakeFeature({ id: 1, arealplan: 5, center: [10.7, 59.9] });
    const b = fakeFeature({ id: 2, arealplan: 5, center: [10.8, 59.9] });
    const [first] = mergeFragments(normalize([a, b]));
    const [second] = mergeFragments(normalize([b, a]));
    expect(contentHash(first!)).toBe(contentHash(second!));
  });
});

describe("contentHash", () => {
  const base = () => mergeFragments(normalize([fakeFeature({ id: 1, arealplan: 1 })], [fakeDocument({ id: 3, arealplan: 1, type: "PlanomraadePdf" })]))[0]!;

  it("er stabil for samme innhold", () => {
    expect(contentHash(base())).toBe(contentHash(base()));
  });

  it("påvirkes ikke av nøkkelrekkefølge", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it("endres når relevant kildeinnhold endres", () => {
    const original = contentHash(base());
    expect(contentHash({ ...base(), title: "Nytt navn" })).not.toBe(original);
    expect(contentHash({ ...base(), announcedAt: "2026-05-02" })).not.toBe(original);
    expect(contentHash({ ...base(), documents: [] })).not.toBe(original);
    const moved = base();
    (moved.geometry as { coordinates: number[][][][] }).coordinates[0]![0]![0]![0]! += 0.001;
    expect(contentHash(moved)).not.toBe(original);
  });

  it("inneholder ingen lokale felt (synced_at o.l.) — kun normalisert kildeinnhold", () => {
    const event = base() as unknown as Record<string, unknown>;
    for (const local of ["syncedAt", "firstSeenAt", "removedFromSourceAt", "id"]) expect(event).not.toHaveProperty(local);
  });
});
