import { beforeAll, describe, expect, it } from "vitest";
import { createFakeDibk, fakeDocument, fakeFeature, TEST_RETRY } from "../helpers/fake-dibk";
import { createPgliteDb } from "@/lib/db/pglite";
import { DibkPlanningStartedProvider } from "@/lib/providers/dibk/planning-started";
import { destinationPoint } from "@/lib/geo/radius";
import { runSync } from "@/lib/sync/run";

type Row = { id: string; title: string; distance_m: number; announced_at: string; computed_area_m2: number; centroid: { coordinates: [number, number] } };

const ORIGIN = { lat: 59.92992, lng: 10.71488 }; // Majorstuen

/** Kvadrat på ~200 × 200 m med sentrum `distanceM` øst for origin. */
function squareEast(id: number, arealplan: number, distanceM: number, announced: string, halfSideM = 100) {
  const [lng, lat] = destinationPoint(ORIGIN.lat, ORIGIN.lng, distanceM, 90);
  const dLat = halfSideM / 111_195;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const f = fakeFeature({ id, arealplan, name: `Plan ${distanceM} m`, announced });
  f.geometry.coordinates = [[[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]]];
  return f;
}

describe("events_within / get_event", { timeout: 30_000 }, () => {
  let db: Awaited<ReturnType<typeof createPgliteDb>>;

  beforeAll(async () => {
    db = await createPgliteDb();
    const features = [
      squareEast(1, 1, 0, "2026-01-10"), // punktet ligger inni
      squareEast(2, 2, 400, "2026-06-01"),
      // Sentrum 1080 m unna, men vestkanten ~980 m unna → delvis innenfor 1 km.
      squareEast(3, 3, 1080, "2025-03-01"),
      squareEast(4, 4, 1300, "2026-08-01"), // helt utenfor 1 km
      squareEast(5, 5, 600, "2023-01-01"), // gammel — utenfor 24-måneders filter
    ];
    const { fetchImpl } = createFakeDibk({ features, documents: [fakeDocument({ id: 50, arealplan: 2, type: "PlanomraadePdf" })] });
    await runSync(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), db, { mode: "full" });
  });

  const within = (radius: number, extra: Record<string, unknown> = {}) =>
    db.rpc<Row>("events_within", { lat: ORIGIN.lat, lng: ORIGIN.lng, radius_m: radius, ...extra });

  it("tar med polygoner som bare delvis ligger innenfor radius (ikke centroid)", async () => {
    const titles = (await within(1000)).map((r) => r.title);
    expect(titles).toContain("Plan 1080 m");
    expect(titles).not.toContain("Plan 1300 m");
  });

  it("gir avstand 0 når punktet ligger inni planområdet", async () => {
    const [first] = await within(500);
    expect(first!.title).toBe("Plan 0 m");
    expect(first!.distance_m).toBe(0);
  });

  it("måler avstand i meter til polygonkanten", async () => {
    const row = (await within(1000)).find((r) => r.title === "Plan 400 m")!;
    expect(row.distance_m).toBeGreaterThan(290);
    expect(row.distance_m).toBeLessThan(310);
  });

  it("beregner areal i m² fra geometrien (~200 × 200 m)", async () => {
    const row = (await within(1000)).find((r) => r.title === "Plan 400 m")!;
    expect(row.computed_area_m2).toBeGreaterThan(39_000);
    expect(row.computed_area_m2).toBeLessThan(41_000);
  });

  it("filtrerer på announced_since uten å slette eldre saker", async () => {
    const all = await within(1000);
    const recent = await within(1000, { announced_since: "2024-09-21" });
    expect(all.map((r) => r.title)).toContain("Plan 600 m");
    expect(recent.map((r) => r.title)).not.toContain("Plan 600 m");
  });

  it("sorterer nærmest først som standard", async () => {
    const distances = (await within(1000)).map((r) => r.distance_m);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("sorterer nyeste først når sort = newest", async () => {
    const dates = (await within(1500, { sort: "newest" })).map((r) => r.announced_at);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("avviser urimelig radius", async () => {
    expect(await within(0)).toEqual([]);
    expect(await within(50_000)).toEqual([]);
  });

  it("get_event gir avstand bare med kontekst, og dokumenter", async () => {
    const [row] = await within(500, { sort: "distance" }).then((rows) => rows.filter((r) => r.title === "Plan 400 m"));
    const [withOrigin] = await db.rpc<{ distance_m: number | null; documents: { type: string }[] }>("get_event", { event_id: row!.id, lat: ORIGIN.lat, lng: ORIGIN.lng });
    const [withoutOrigin] = await db.rpc<{ distance_m: number | null }>("get_event", { event_id: row!.id });
    expect(withOrigin!.distance_m).toBeCloseTo(row!.distance_m, 3);
    expect(withOrigin!.documents.map((d) => d.type)).toEqual(["PlanomraadePdf"]);
    expect(withoutOrigin!.distance_m).toBeNull();
  });
});
