import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

const PROVIDER = "mdir-forurenset-grunn";

const counts = (over: Record<string, number> = {}) => ({
  fetched: 100, accepted: 100, rejected: 0, records: 100, documents: 0,
  inserted: 0, updated: 100, unchanged: 0, removed: 0, failed: 0, ...over,
});

describe("sync-tilstand i databasen", { timeout: 30_000 }, () => {
  let db: Db;
  const provider = async (id = PROVIDER) =>
    (await db.pg.query<Record<string, unknown>>("select * from providers where id = $1", [id])).rows[0]!;

  const finishRun = async (status: string, over: Record<string, unknown> = {}) => {
    const [runId] = await db.rpc<string>("sync_run_start", { p_provider_id: PROVIDER, p_mode: "full", p_trigger: "scheduled" });
    await db.rpc("sync_run_finish", {
      p_run_id: runId,
      p_status: status,
      p_counts: counts(),
      p_error: status === "success" ? null : "HTTP 503",
      p_warnings: [],
      p_suspicious: status === "suspicious",
      p_reconciled: status === "success",
      ...over,
    });
    return runId;
  };

  beforeAll(async () => {
    db = await createPgliteDb();
  });

  it("registrerer forsøk før kjøringen er ferdig", async () => {
    expect((await provider()).last_attempt_at).toBeNull();
    await db.rpc<string>("sync_run_start", { p_provider_id: PROVIDER, p_mode: "full", p_trigger: "manual" });
    expect((await provider()).last_attempt_at).not.toBeNull();
    expect((await provider()).last_success_at).toBeNull();
  });

  it("en vellykket kjøring setter referansetall og nullstiller feiltelleren", async () => {
    await finishRun("success");
    const row = await provider();
    expect(row.last_success_at).not.toBeNull();
    expect(row.baseline_record_count).toBe(100);
    expect(row.consecutive_failures).toBe(0);
    expect(row.last_error).toBeNull();
    expect(row.status).toBe("active");
  });

  it("feilede kjøringer teller opp og rører ikke last_success_at eller referansetallet", async () => {
    const before = await provider();
    await finishRun("failed");
    await finishRun("failed");
    const row = await provider();
    expect(row.consecutive_failures).toBe(2);
    expect(row.last_success_at).toBe(before.last_success_at);
    expect(row.baseline_record_count).toBe(100);
    expect(row.status).toBe("error");
    expect(row.last_error).toContain("503");
  });

  it("mistenkelig kjøring teller som feil, selv om den skrev data", async () => {
    const before = await provider();
    await finishRun("suspicious", { p_counts: counts({ records: 3 }) });
    const row = await provider();
    // Referansetallet må ikke overskrives av tall vi ikke stoler på.
    expect(row.baseline_record_count).toBe(100);
    expect(row.last_success_at).toBe(before.last_success_at);
    expect(row.last_run_status).toBe("suspicious");
    expect(Number(row.consecutive_failures)).toBeGreaterThan(0);
  });

  it("sync_due velger forfalte providere og riktig modus", async () => {
    const due = await db.rpc<{ provider_id: string; mode: string }>("sync_due");
    const ids = due.map((d) => d.provider_id);
    // Denne provideren ble nettopp forsøkt, og er ikke forfalt igjen ennå — selv om den feilet.
    expect(ids).not.toContain(PROVIDER);
    expect(ids).toContain("dibk-planning-started");
    // Kilder uten tidsplan (direkte oppslag) skal aldri komme med.
    expect(ids).not.toContain("nve-kvikkleire-aktsomhet");

    // DiBK støtter incremental, men trenger en fullført full sync først.
    expect(due.find((d) => d.provider_id === "dibk-planning-started")!.mode).toBe("full");
    const [runId] = await db.rpc<string>("sync_run_start", { p_provider_id: "dibk-planning-started", p_mode: "full", p_trigger: "manual" });
    await db.rpc("sync_run_finish", { p_run_id: runId, p_status: "success", p_counts: counts(), p_error: null });
    const later = await db.rpc<{ provider_id: string; mode: string }>("sync_due", {
      p_now: new Date(Date.now() + 4 * 3_600_000).toISOString(),
    });
    expect(later.find((d) => d.provider_id === "dibk-planning-started")!.mode).toBe("incremental");
  });

  it("køen: forespørsel, plukking og avslutning", async () => {
    const [id] = await db.rpc<string>("request_sync", { p_provider_id: PROVIDER, p_mode: "full", p_force: false });
    expect(id).toBeTruthy();

    // Et nytt knappetrykk skal ikke lage en ny jobb.
    const [again] = await db.rpc<string>("request_sync", { p_provider_id: PROVIDER, p_mode: "full", p_force: false });
    expect(again).toBe(id);

    const [claimed] = await db.rpc<{ id: string; provider_id: string; mode: string; force: boolean }>("claim_sync_request");
    expect(claimed?.provider_id).toBe(PROVIDER);
    expect(await db.rpc("claim_sync_request")).toEqual([]);

    await db.rpc("finish_sync_request", { p_id: claimed!.id, p_status: "done", p_sync_run_id: null, p_error: null });
    const [row] = (await db.pg.query<{ status: string }>("select status from sync_requests where id = $1", [id])).rows;
    expect(row!.status).toBe("done");
  });

  it("kan be om kjøring også for en kilde som feiler", async () => {
    expect((await provider()).status).toBe("error");
    const [id] = await db.rpc<string>("request_sync", { p_provider_id: PROVIDER, p_mode: "full" });
    expect(id).toBeTruthy();
    const [claimed] = await db.rpc<{ id: string }>("claim_sync_request");
    await db.rpc("finish_sync_request", { p_id: claimed!.id, p_status: "done" });
  });

  it("avviser forespørsler for ukjente eller inaktive kilder", async () => {
    await expect(db.rpc("request_sync", { p_provider_id: "finnes-ikke", p_mode: "full" })).rejects.toThrow();
    await expect(db.rpc("request_sync", { p_provider_id: "oslo-building-case", p_mode: "full" })).rejects.toThrow();
  });

  it("rydder forespørsler som ble hengende i «running»", async () => {
    await db.rpc("request_sync", { p_provider_id: "nve-nettanlegg", p_mode: "full" });
    const [claimed] = await db.rpc<{ id: string }>("claim_sync_request");
    expect(claimed).toBeTruthy();
    // Simuler at workeren døde for en time siden.
    await db.pg.query("update sync_requests set started_at = now() - interval '1 hour' where id = $1", [claimed!.id]);
    expect(await db.rpc<number>("expire_stale_sync_requests")).toEqual([1]);
    const [row] = (await db.pg.query<{ status: string; error: string }>(
      "select status, error from sync_requests where provider_id = 'nve-nettanlegg'",
    )).rows;
    expect(row!.status).toBe("failed");
    expect(row!.error).toContain("aldri fullført");
  });

  it("is_admin er usann uten innlogget bruker", async () => {
    expect(await db.rpc<boolean>("is_admin")).toEqual([false]);
    // Sync-worker (service role / lokal psql) skal likevel slippe til.
    expect(await db.rpc<boolean>("is_privileged")).toEqual([true]);
  });

  it("slipper bare inn e-poster som står i admin_users", async () => {
    // Samme claims som PostgREST setter for en innlogget bruker.
    const asUser = async (claims: Record<string, string>) =>
      (
        await db.pg.query<{ is_admin: boolean }>(
          "select set_config('request.jwt.claims', $1, true) as c, public.is_admin() as is_admin",
          [JSON.stringify(claims)],
        )
      ).rows[0]!.is_admin;

    expect(await asUser({ role: "authenticated", email: "thomas@fink.no" })).toBe(true);
    expect(await asUser({ role: "authenticated", email: "THOMAS@FINK.NO" })).toBe(true);
    expect(await asUser({ role: "authenticated", email: "noen.andre@example.com" })).toBe(false);
    expect(await asUser({ role: "anon" })).toBe(false);
  });

  it("nekter en innlogget ikke-admin å be om sync", async () => {
    await expect(
      db.pg.query(
        `select set_config('request.jwt.claims', '{"role":"authenticated","email":"noen.andre@example.com"}', true),
                public.request_sync('nve-kvikkleire-soner', 'full', false)`,
      ),
    ).rejects.toThrow(/ikke autorisert/);
  });

  it("admin ser driftsdata, innlogget ikke-admin ser ingenting", async () => {
    /** Kjører spørringen med samme claims som PostgREST setter for en innlogget bruker. */
    const asUser = async (email: string, sql: string) =>
      db.pg.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ role: "authenticated", email }),
        ]);
        return (await tx.query<{ n: number }>(sql)).rows[0]!.n;
      });

    expect(Number(await asUser("thomas@fink.no", "select count(*)::int n from public.provider_health()"))).toBeGreaterThan(0);
    expect(Number(await asUser("thomas@fink.no", "select count(*)::int n from public.recent_sync_runs(10, null)"))).toBeGreaterThan(0);

    expect(Number(await asUser("ikke.admin@example.com", "select count(*)::int n from public.provider_health()"))).toBe(0);
    expect(Number(await asUser("ikke.admin@example.com", "select count(*)::int n from public.recent_sync_runs(10, null)"))).toBe(0);
  });

  it("provider_health og recent_sync_runs gir det admin trenger", async () => {
    const health = await db.rpc<Record<string, unknown>>("provider_health");
    const row = health.find((h) => h.id === PROVIDER)!;
    expect(row.stale_after_hours).toBe(72);
    expect(row.last_run).not.toBeNull();
    expect(health.find((h) => h.id === "nve-kvikkleire-aktsomhet")!.sync_interval_minutes).toBeNull();

    const runs = await db.rpc<{ provider_id: string; trigger: string }>("recent_sync_runs", { p_limit: 5 });
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]!.trigger).toBeTruthy();
  });
});
