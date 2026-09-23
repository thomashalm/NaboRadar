import { beforeEach, describe, expect, it } from "vitest";
import { createFakeDibk, fakeDocument, fakeFeature, TEST_RETRY, type FakeDibkState } from "../helpers/fake-dibk";
import { createPgliteDb } from "@/lib/db/pglite";
import { DibkPlanningStartedProvider } from "@/lib/providers/dibk/planning-started";
import { runSync } from "@/lib/sync/run";

type TestDb = Awaited<ReturnType<typeof createPgliteDb>>;

async function sync(db: TestDb, state: FakeDibkState, mode: "full" | "incremental" = "full", since?: Date) {
  const { fetchImpl, requests } = createFakeDibk(state);
  const result = await runSync(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), db, { mode, since });
  return { result, requests };
}

const count = async (db: TestDb, sql: string) => Number((await db.pg.query<{ n: number }>(sql)).rows[0]!.n);

describe("runSync mot PGlite + PostGIS", { timeout: 30_000 }, () => {
  let db: TestDb;
  let state: FakeDibkState;

  beforeEach(async () => {
    db = await createPgliteDb();
    state = {
      features: [
        fakeFeature({ id: 1, arealplan: 10, name: "Plan A", center: [10.75, 59.91] }),
        fakeFeature({ id: 2, arealplan: 10, name: "Plan A", center: [10.76, 59.91] }),
        fakeFeature({ id: 3, arealplan: 20, name: "Plan B", center: [10.72, 59.93] }),
        fakeFeature({ id: 4, arealplan: 30, name: "Plan C", center: [10.73, 59.97] }),
      ],
      documents: [
        fakeDocument({ id: 100, arealplan: 10, type: "ref-data-as-pdf" }),
        fakeDocument({ id: 101, arealplan: 10, type: null, title: "beroerteParter.json", mimeType: "application/json" }),
      ],
    };
  });

  it("full sync: inserted, deretter unchanged ved uendret kilde", async () => {
    const first = await sync(db, state);
    expect(first.result).toMatchObject({ status: "success", fetched: 4, accepted: 4, rejected: 0, records: 3, inserted: 3, updated: 0, unchanged: 0, removed: 0, failed: 0 });
    expect(await count(db, "select count(*) n from events")).toBe(3);
    expect(await count(db, "select count(*) n from events where extensions.st_geometrytype(geom) = 'ST_MultiPolygon'")).toBe(3);
    expect(await count(db, "select extensions.st_numgeometries(geom) n from events where external_id = '10'")).toBe(2);

    const second = await sync(db, state);
    expect(second.result).toMatchObject({ inserted: 0, updated: 0, unchanged: 3, removed: 0 });
  });

  it("updated kun når relevant kildeinnhold endres", async () => {
    await sync(db, state);
    state.features[2] = fakeFeature({ id: 3, arealplan: 20, name: "Plan B (endret navn)", center: [10.72, 59.93] });
    const { result } = await sync(db, state);
    expect(result).toMatchObject({ inserted: 0, updated: 1, unchanged: 2 });
    expect((await db.pg.query<{ title: string }>("select title from events where external_id = '20'")).rows[0]!.title).toBe("Plan B (endret navn)");
  });

  it("lagrer kun tillatte dokumenter — berørte parter når aldri databasen", async () => {
    await sync(db, state);
    const docs = (await db.pg.query<{ type: string; title: string }>("select type, title from event_documents")).rows;
    expect(docs).toEqual([{ type: "ref-data-as-pdf", title: "Dokument 100.pdf" }]);
    const dump = JSON.stringify((await db.pg.query("select * from events")).rows);
    expect(dump).not.toMatch(/beroert|berørt/i);
  });

  it("databasen avviser berørte parter selv om koden skulle slippe dem gjennom", async () => {
    await sync(db, state);
    await expect(
      db.pg.query(
        `insert into event_documents (event_id, external_id, type, title, url, mime_type)
         select id, 'x', 'PlanomraadePdf', 'beroerteParter.json', 'https://plandata.ft.dibk.no/x', 'application/pdf' from events limit 1`,
      ),
    ).rejects.toThrow();
  });

  it("full reconciliation markerer events som er borte fra kilden — sletter dem ikke", async () => {
    await sync(db, state);
    state.features = state.features.filter((f) => f.properties.arealplan !== 30);
    const { result } = await sync(db, state);
    expect(result.removed).toBe(1);
    expect(await count(db, "select count(*) n from events")).toBe(3);
    expect(await count(db, "select count(*) n from events where removed_from_source_at is not null and external_id = '30'")).toBe(1);

    // Standard brukerquery ekskluderer fjernede events.
    const hits = await db.rpc<{ title: string }>("events_within", { lat: 59.97, lng: 10.73, radius_m: 3000 });
    expect(hits.map((h) => h.title)).not.toContain("Plan C");

    // Kommer saken tilbake, gjenopprettes den.
    state.features.push(fakeFeature({ id: 4, arealplan: 30, name: "Plan C", center: [10.73, 59.97] }));
    const restored = await sync(db, state);
    expect(restored.result.updated).toBe(1);
    expect(await count(db, "select count(*) n from events where removed_from_source_at is not null")).toBe(0);
  });

  it("markerer ikke avviste features som fjernet", async () => {
    await sync(db, state);
    const broken = fakeFeature({ id: 4, arealplan: 30 });
    (broken as { geometry: unknown }).geometry = null;
    state.features[3] = broken;
    const { result } = await sync(db, state);
    expect(result).toMatchObject({ rejected: 1, removed: 0, status: "success" });
  });

  it("en ugyldig rad stopper ikke resten, og gir status partial", async () => {
    // Selvkryssende «sløyfe» som blir tom etter ST_MakeValid → skrivefeil for kun denne raden.
    const degenerate = fakeFeature({ id: 9, arealplan: 90 });
    degenerate.geometry.coordinates = [[[10.7, 59.9], [10.7, 59.9], [10.7, 59.9], [10.7, 59.9]]];
    state.features.push(degenerate);
    const { result } = await sync(db, state);
    expect(result).toMatchObject({ status: "partial", inserted: 3, failed: 1 });
    expect(result.errors.some((e) => e.includes("90"))).toBe(true);
  });

  it("fatal feil i henting gir status failed og ingen reconciliation", async () => {
    await sync(db, state);
    const failing = (async () => new Response("<html>502</html>", { status: 200 })) as unknown as typeof fetch;
    const result = await runSync(new DibkPlanningStartedProvider(failing, TEST_RETRY), db, { mode: "full" });
    expect(result.status).toBe("failed");
    expect(await count(db, "select count(*) n from events where removed_from_source_at is not null")).toBe(0);
    const [run] = (await db.pg.query<{ status: string; error: string }>("select status, error from sync_runs order by started_at desc limit 1")).rows;
    expect(run!.status).toBe("failed");
    // HTML med status 200 → JSON-feil (etter retry) → fatal.
    expect(run!.error).toMatch(/SyntaxError|DibkPageError/);
  });

  it("incremental: henter bare endrede planer og markerer ingenting som fjernet", async () => {
    await sync(db, state);
    state.features = state.features
      .filter((f) => f.properties.arealplan !== 30)
      .map((f) =>
        f.properties.arealplan === 20
          ? fakeFeature({ id: 3, arealplan: 20, name: "Plan B v2", center: [10.72, 59.93], updated: "2026-09-20T12:00:00+00:00" })
          : f,
      );
    const { result, requests } = await sync(db, state, "incremental", new Date("2026-09-01T00:00:00Z"));
    expect(result).toMatchObject({ mode: "incremental", fetched: 1, records: 1, updated: 1, removed: 0 });
    expect(requests.some((u) => u.searchParams.get("filter")?.startsWith("oppdateringsdato>"))).toBe(true);
    expect(await count(db, "select count(*) n from events where removed_from_source_at is not null")).toBe(0);
  });

  it("incremental uten tidligere vellykket sync feiler tydelig", async () => {
    const { result } = await sync(db, state, "incremental");
    expect(result.status).toBe("failed");
    expect(result.errors[0]).toContain("Kjør full sync først");
  });

  it("logger sync_run med tellere og oppdaterer providers", async () => {
    await sync(db, state);
    const [run] = (await db.pg.query<Record<string, unknown>>("select * from sync_runs")).rows;
    expect(run).toMatchObject({ status: "success", mode: "full", fetched: 4, accepted: 4, rejected: 0, inserted: 3 });
    const overview = await db.rpc<{ id: string; active_events: number; last_success_at: string | null }>("provider_overview");
    const dibk = overview.find((row) => row.id === "dibk-planning-started")!;
    expect(dibk.last_success_at).not.toBeNull();
    expect(Number(dibk.active_events)).toBe(3);
    const status = await db.rpc<{ provider_id: string; last_success_at: string | null }>("data_status");
    expect(status.find((s) => s.provider_id === "dibk-planning-started")!.last_success_at).not.toBeNull();
  });
});
