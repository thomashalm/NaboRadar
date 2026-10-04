import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/**
 * explore_area_features: lesefunksjonen bak Utforsk data. Bare for admin, og alltid avgrenset.
 */
describe("explore_area_features", { timeout: 60_000 }, () => {
  let db: Db;

  const sone = (id: string, lng: number, lat: number, størrelse = 0.01) => ({
    external_id: id,
    category: "grunnforhold",
    subtype: "kvikkleire_sone",
    title: "Kvikkleiresone",
    geometry: { type: "Polygon", coordinates: [[[lng, lat], [lng + størrelse, lat], [lng + størrelse, lat + størrelse], [lng, lat + størrelse], [lng, lat]]] },
    attributes: { risikoklasse: 3 },
    source_url: null,
    source_url_type: null,
    source_updated_at: null,
    content_hash: id,
  });

  const som = async (email: string | null, sql: string) => {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(email ? { role: "authenticated", email } : { role: "anon" })]);
      await db.pg.exec(`set local role ${email ? "authenticated" : "anon"}`);
      return (await db.pg.query<{ external_id: string; total: string; geometry: { type: string }; center: { type: string } }>(sql)).rows;
    } catch {
      return "NEKTET" as const;
    } finally {
      await db.pg.exec("rollback");
    }
  };
  const kall = (boks: string, ekstra = "") => `select * from explore_area_features('nve-kvikkleire-soner', ${boks}${ekstra})`;
  const OSLO = "10.5, 59.8, 11.0, 60.1";

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`insert into admin_users (email) values ('drift@example.com') on conflict do nothing`);
    await db.rpc("upsert_area_features", {
      p_provider_id: "nve-kvikkleire-soner",
      p_features: [sone("stor", 10.7, 59.9, 0.02), sone("liten", 10.8, 59.95, 0.005), sone("bergen", 5.3, 60.39)],
      p_synced_at: new Date().toISOString(),
    });
  });

  it("admin får sonene i utsnittet, størst først, med geometri og senter", async () => {
    const rader = await som("drift@example.com", kall(OSLO));
    expect(rader).not.toBe("NEKTET");
    if (rader === "NEKTET") return;
    expect(rader.map((r) => r.external_id)).toEqual(["stor", "liten"]);
    expect(Number(rader[0]!.total)).toBe(2);
    expect(rader[0]!.geometry.type).toMatch(/Polygon$/);
    expect(rader[0]!.center.type).toBe("Point");
  });

  it("anon kommer ikke til funksjonen, og innlogget ikke-admin får ingen rader", async () => {
    expect(await som(null, kall(OSLO))).toBe("NEKTET");
    expect(await som("annen@example.com", kall(OSLO))).toEqual([]);
  });

  it("en flate avgrenser videre innenfor utsnittet", async () => {
    const flate = `'{"type":"Polygon","coordinates":[[[10.79,59.94],[10.82,59.94],[10.82,59.97],[10.79,59.97],[10.79,59.94]]]}'::jsonb`;
    const rader = await som("drift@example.com", kall(OSLO, `, ${flate}`));
    expect(rader === "NEKTET" ? rader : rader.map((r) => r.external_id)).toEqual(["liten"]);
  });

  it("er avgrenset: grensen på antall holder, og totalen sier hva som fantes", async () => {
    const rader = await som("drift@example.com", kall(OSLO, ", null, 1"));
    if (rader === "NEKTET") throw new Error("nektet");
    expect(rader.map((r) => r.external_id)).toEqual(["stor"]);
    expect(Number(rader[0]!.total)).toBe(2);
  });

  it("et ugyldig utsnitt gir ingenting", async () => {
    expect(await som("drift@example.com", kall("11.0, 59.8, 10.5, 60.1"))).toEqual([]);
  });

  it("andre datasett lekker ikke inn", async () => {
    expect(await som("drift@example.com", `select * from explore_area_features('udir-skoler', ${OSLO})`)).toEqual([]);
  });
});
