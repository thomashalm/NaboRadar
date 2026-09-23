import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import type { NormalizeResult } from "@/lib/providers/types";
import type { SyncableProvider } from "@/lib/sync/registry";
import { exitCodeFor, runProvidersNow, runSyncWorker } from "@/lib/sync/worker";
import type { NormalizedAreaFeature } from "@/types/area-feature";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

const A = "mdir-forurenset-grunn";
const B = "mdir-industri-tillatelse";

/** Kvadrat ~10 m, forskjøvet per indeks, slik at hver post har egen geometri. */
const square = (index: number) => {
  const lng = 10.7 + index * 0.001;
  const lat = 59.9;
  const d = 0.0001;
  return {
    type: "Polygon" as const,
    coordinates: [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]],
  };
};

/** Testprovider som leverer et kontrollerbart antall poster, eller feiler. */
function fakeProvider(id: string, state: { count: number; fail?: boolean }): SyncableProvider {
  return {
    id,
    name: id,
    owner: "test",
    recordKind: "area_feature",
    license: null,
    defaultStatus: "active",
    statusReason: null,
    async *fetch() {
      if (state.fail) throw new Error("kilden svarer ikke");
      yield { features: Array.from({ length: state.count }, (_, i) => i), documents: [] };
    },
    normalize(batch): NormalizeResult<NormalizedAreaFeature> {
      return {
        records: batch.features.map((_, index) => ({
          providerId: id,
          externalId: `lok-${index}`,
          category: "miljo" as const,
          subtype: "forurenset_grunn",
          title: `Lokalitet ${index}`,
          geometry: square(index),
          attributes: {},
          sourceUrl: null,
          sourceUrlType: null,
          sourceUpdatedAt: null,
        })),
        rejected: [],
      };
    },
    async healthCheck() {
      return { ok: true, checkedAt: new Date().toISOString(), latencyMs: 1, message: null };
    },
  };
}

const activeCount = async (db: Db, providerId: string) =>
  Number(
    (
      await db.pg.query<{ n: number }>(
        "select count(*)::int n from area_features where provider_id = $1 and removed_from_source_at is null",
        [providerId],
      )
    ).rows[0]!.n,
  );

describe("sync-worker", { timeout: 60_000 }, () => {
  let db: Db;
  let a: { count: number; fail?: boolean };
  let b: { count: number; fail?: boolean };
  let providers: SyncableProvider[];

  beforeEach(async () => {
    db = await createPgliteDb();
    a = { count: 30 };
    b = { count: 4 };
    providers = [fakeProvider(A, a), fakeProvider(B, b)];
  });

  it("lar én kilde feile uten å stoppe de andre", async () => {
    b.fail = true;
    const outcome = await runSyncWorker(db, { providerIds: [A, B], providers, skipRequests: true });

    const byProvider = Object.fromEntries(outcome.results.map((r) => [r.providerId, r]));
    expect(byProvider[A]!.status).toBe("success");
    expect(byProvider[B]!.status).toBe("failed");
    expect(byProvider[B]!.errors.join(" ")).toContain("kilden svarer ikke");
    expect(await activeCount(db, A)).toBe(30);
    expect(exitCodeFor(outcome)).toBe(2);

    // Feilen står på providerens egen rad, ikke som en global feil.
    const [row] = (await db.pg.query<{ status: string; consecutive_failures: number; last_success_at: string | null }>(
      "select status, consecutive_failures, last_success_at from providers where id = $1",
      [B],
    )).rows;
    expect(row!.status).toBe("error");
    expect(Number(row!.consecutive_failures)).toBe(1);
    expect(row!.last_success_at).toBeNull();
  });

  it("markerer ikke resten som fjernet når kilden plutselig gir få objekter", async () => {
    await runProvidersNow(db, [A], { mode: "full", providers });
    expect(await activeCount(db, A)).toBe(30);

    // Kilden svarer 200 OK, men med nesten ingenting.
    a.count = 3;
    const [second] = (await runProvidersNow(db, [A], { mode: "full", providers })).results;

    expect(second!.status).toBe("suspicious");
    expect(second!.suspicious).toBe(true);
    expect(second!.reconciled).toBe(false);
    expect(second!.removed).toBe(0);
    expect(second!.warnings.join(" ")).toContain("30 → 3");
    // De 27 som manglet er fortsatt aktive — vi sletter ikke på et usikkert grunnlag.
    expect(await activeCount(db, A)).toBe(30);

    const [provider] = (await db.pg.query<{ baseline_record_count: number; last_run_status: string }>(
      "select baseline_record_count, last_run_status from providers where id = $1",
      [A],
    )).rows;
    expect(Number(provider!.baseline_record_count)).toBe(30);
    expect(provider!.last_run_status).toBe("suspicious");
  });

  it("kjører reconciliation når admin bekrefter at fallet er reelt", async () => {
    await runProvidersNow(db, [A], { mode: "full", providers });
    a.count = 3;
    await runProvidersNow(db, [A], { mode: "full", providers });

    const [forced] = (await runProvidersNow(db, [A], { mode: "full", force: true, providers })).results;
    expect(forced!.reconciled).toBe(true);
    expect(forced!.removed).toBe(27);
    expect(await activeCount(db, A)).toBe(3);
  });

  it("tar forespørsler fra køen og markerer dem som ferdige", async () => {
    await db.rpc("request_sync", { p_provider_id: A, p_mode: "full", p_force: false });
    const outcome = await runSyncWorker(db, { providers, skipDue: true });

    expect(outcome.handledRequests).toBe(1);
    expect(outcome.results[0]!.trigger).toBe("admin");
    expect(exitCodeFor(outcome)).toBe(0);

    const [request] = (await db.pg.query<{ status: string }>("select status from sync_requests where provider_id = $1", [A])).rows;
    expect(request!.status).toBe("done");
    const [run] = (await db.pg.query<{ trigger: string; records: number }>(
      "select trigger, records from sync_runs where provider_id = $1 order by started_at desc limit 1",
      [A],
    )).rows;
    expect(run!.trigger).toBe("admin");
    expect(Number(run!.records)).toBe(30);
  });

  it("melder fra om ukjent provider uten å krasje kjøringen", async () => {
    await db.rpc("request_sync", { p_provider_id: "nve-nettanlegg", p_mode: "full" });
    const outcome = await runSyncWorker(db, { providers, skipDue: true });
    expect(outcome.failures[0]!.providerId).toBe("nve-nettanlegg");
    expect(outcome.failures[0]!.message).toContain("Ukjent provider");
    expect(exitCodeFor(outcome)).toBe(2);
    const [request] = (await db.pg.query<{ status: string }>(
      "select status from sync_requests where provider_id = 'nve-nettanlegg'",
    )).rows;
    expect(request!.status).toBe("failed");
  });

  it("henter seg inn igjen når kilden kommer tilbake", async () => {
    b.fail = true;
    await runSyncWorker(db, { providerIds: [B], providers, skipRequests: true });

    const failed = (await db.pg.query<{ status: string; consecutive_failures: number }>(
      "select status, consecutive_failures from providers where id = $1",
      [B],
    )).rows[0]!;
    expect(failed.status).toBe("error");

    // Kilden er oppe igjen. Neste kjøring skal nullstille feiltelleren og statusen.
    b.fail = false;
    const [result] = (await runProvidersNow(db, [B], { mode: "full", providers })).results;
    expect(result!.status).toBe("success");

    const recovered = (await db.pg.query<{ status: string; consecutive_failures: number; last_success_at: string | null }>(
      "select status, consecutive_failures, last_success_at from providers where id = $1",
      [B],
    )).rows[0]!;
    expect(recovered.status).toBe("active");
    expect(Number(recovered.consecutive_failures)).toBe(0);
    expect(recovered.last_success_at).not.toBeNull();
  });

  it("kjører forfalte providere etter tidsplanen", async () => {
    const outcome = await runSyncWorker(db, { providerIds: [A, B], providers });
    expect(outcome.results.map((r) => r.providerId).sort()).toEqual([A, B].sort());
    expect(outcome.results.every((r) => r.trigger === "scheduled")).toBe(true);

    // Kjører vi igjen med en gang, er ingen forfalt.
    const again = await runSyncWorker(db, { providerIds: [A, B], providers });
    expect(again.results).toEqual([]);
  });
});
