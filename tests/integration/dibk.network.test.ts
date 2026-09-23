import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { monthsAgo } from "@/lib/events/queries";
import { DibkPlanningStartedProvider } from "@/lib/providers/dibk/planning-started";
import type { SyncResult } from "@/lib/providers/types";
import { runSync } from "@/lib/sync/run";

/**
 * Ekte full sync fra DiBK inn i en PGlite-database i minnet (~20–40 s).
 * Kjøres kun med RUN_NETWORK_TESTS=1 (npm run test:network). Antall saker endrer seg over tid,
 * så testene sjekker egenskaper — ikke eksakte tall.
 */
const enabled = process.env.RUN_NETWORK_TESTS === "1";

type Row = { title: string; distance_m: number; announced_at: string | null; computed_area_m2: number | null };

describe.skipIf(!enabled)("DiBK Planlegging igangsatt (nettverk)", { timeout: 180_000 }, () => {
  let db: Awaited<ReturnType<typeof createPgliteDb>>;
  let result: SyncResult;

  beforeAll(async () => {
    db = await createPgliteDb();
    result = await runSync(new DibkPlanningStartedProvider(), db, { mode: "full" });
  }, 180_000);

  const since = monthsAgo(24);
  const within = (lat: number, lng: number, radius: number) =>
    db.rpc<Row>("events_within", { lat, lng, radius_m: radius, announced_since: since });

  it("full sync lykkes med få eller ingen avviste features", () => {
    expect(result.status).toBe("success");
    expect(result.fetched).toBeGreaterThan(1000);
    expect(result.rejected / result.fetched).toBeLessThan(0.01);
    expect(result.records).toBeGreaterThan(500);
    expect(result.records).toBeLessThanOrEqual(result.accepted);
  });

  it("ingen berørte parter i databasen", async () => {
    const [{ n }] = (
      await db.pg.query<{ n: number }>(
        "select count(*)::int n from event_documents where title ~* 'beroert|berørt' or mime_type = 'application/json' or type not in ('ref-data-as-pdf','PlanomraadePdf','ReferatOppstartsmoete')",
      )
    ).rows as [{ n: number }];
    expect(n).toBe(0);
  });

  it.each([
    ["Sognsvann", 59.97499, 10.72891, 3000],
    ["Majorstuen", 59.92992, 10.71488, 1000],
    ["Oslo S", 59.91067, 10.75226, 1000],
  ])("%s innen %d m: ekte planer, sortert på avstand, innenfor radius og tidsvindu", async (_name, lat, lng, radius) => {
    const rows = await within(lat as number, lng as number, radius as number);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.distance_m).toBeLessThanOrEqual(radius as number);
      expect(row.announced_at! >= since).toBe(true);
      expect(row.computed_area_m2).toBeGreaterThan(0);
    }
    const distances = rows.map((r) => r.distance_m);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });
});
