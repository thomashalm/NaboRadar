import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/** Driftsobservasjon for de direkte oppslagene (migrasjon 20261031000000). */
describe("lookup_source_status", { timeout: 60_000 }, () => {
  let db: Db;
  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`insert into admin_users (email) values ('drift@example.com') on conflict do nothing`);
  });

  async function som<T>(rolle: string, sql: string, email?: string): Promise<T[] | "NEKTET"> {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(email ? { role: rolle, email } : { role: rolle })]);
      await db.pg.exec(`set local role ${rolle}`);
      return (await db.pg.query<T>(sql)).rows;
    } catch {
      return "NEKTET";
    } finally {
      await db.pg.exec("rollback");
    }
  }
  const rad = async () =>
    (await db.pg.query<{ consecutive_failures: number; failing_since: string | null; last_error: string | null; last_ok_at: string | null }>(
      `select * from lookup_source_status where lookup_id = 'kartverket-stormflo'`,
    )).rows[0]!;

  it("teller sammenhengende feil, husker når feilperioden startet, og nullstiller ved OK", async () => {
    await db.rpc("record_lookup_check", { p_lookup_id: "kartverket-stormflo", p_name: "Stormflo og havnivå", p_ok: true, p_error: null });
    expect((await rad()).failing_since).toBeNull();

    await db.rpc("record_lookup_check", { p_lookup_id: "kartverket-stormflo", p_name: "Stormflo og havnivå", p_ok: false, p_error: "HTTP 500" });
    const første = await rad();
    await db.rpc("record_lookup_check", { p_lookup_id: "kartverket-stormflo", p_name: "Stormflo og havnivå", p_ok: false, p_error: "x".repeat(500) });
    const andre = await rad();
    expect(andre.consecutive_failures).toBe(2);
    expect(andre.failing_since).toEqual(første.failing_since);
    expect(andre.last_error).toHaveLength(300);
    expect(andre.last_ok_at).not.toBeNull();

    await db.rpc("record_lookup_check", { p_lookup_id: "kartverket-stormflo", p_name: "Stormflo og havnivå", p_ok: true, p_error: null });
    const ok = await rad();
    expect(ok.consecutive_failures).toBe(0);
    expect(ok.failing_since).toBeNull();
  });

  it("bare synken skriver, bare admin leser, og tabellen er stengt", async () => {
    const skriv = `select record_lookup_check('x', 'x', false, 'falsk feil')`;
    expect(await som("anon", skriv)).toBe("NEKTET");
    expect(await som("authenticated", skriv, "drift@example.com")).toBe("NEKTET");
    expect(await som("anon", "select * from lookup_source_status()")).toBe("NEKTET");
    expect(await som("authenticated", "select * from lookup_source_status()", "noen@example.com")).toEqual([]);
    const admin = (await som<{ lookup_id: string }>("authenticated", "select * from lookup_source_status()", "drift@example.com")) as { lookup_id: string }[];
    expect(admin.map((r) => r.lookup_id)).toContain("kartverket-stormflo");
    expect(await som("anon", "select 1 from lookup_source_status")).toBe("NEKTET");
    expect(await som("authenticated", "select 1 from lookup_source_status", "drift@example.com")).toBe("NEKTET");
  });
});
