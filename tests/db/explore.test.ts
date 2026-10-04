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

/**
 * explore_events: plansakene bak Utforsk data, med uttrekk og dokumenter i samme svar.
 */
describe("explore_events", { timeout: 60_000 }, () => {
  let db: Db;
  const som = async (email: string | null, sql: string) => {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(email ? { role: "authenticated", email } : { role: "anon" })]);
      await db.pg.exec(`set local role ${email ? "authenticated" : "anon"}`);
      return (await db.pg.query<{ title: string; total: string; attributes: Record<string, string>; documents: { type: string; url: string }[]; geometry: { type: string } }>(sql)).rows;
    } catch {
      return "NEKTET" as const;
    } finally {
      await db.pg.exec("rollback");
    }
  };
  const OSLO = "10.5, 59.8, 11.0, 60.1";

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`
      insert into admin_users (email) values ('drift@example.com') on conflict do nothing;
      insert into events (id, provider_id, external_id, type, title, geom, content_hash, raw_data, announced_at, municipality_number, attributes) values
        ('00000000-0000-4000-8000-000000000001', 'dibk-planning-started', 'p1', 'planning_started', 'Eldre plan',
         extensions.st_multi(extensions.st_buffer(extensions.st_setsrid(extensions.st_makepoint(10.75, 59.91), 4326), 0.002)), 'h1', '{}'::jsonb, '2025-01-01', '0301', '{"plantype":"Detaljregulering"}'::jsonb),
        ('00000000-0000-4000-8000-000000000002', 'dibk-planning-started', 'p2', 'planning_started', 'Nyere plan',
         extensions.st_multi(extensions.st_buffer(extensions.st_setsrid(extensions.st_makepoint(10.80, 59.95), 4326), 0.002)), 'h2', '{}'::jsonb, '2026-06-01', '0301', '{}'::jsonb),
        ('00000000-0000-4000-8000-000000000003', 'dibk-planning-started', 'p3', 'planning_started', 'Plan i Bergen',
         extensions.st_multi(extensions.st_buffer(extensions.st_setsrid(extensions.st_makepoint(5.32, 60.39), 4326), 0.002)), 'h3', '{}'::jsonb, '2026-01-01', '4601', '{}'::jsonb);
      insert into event_documents (event_id, external_id, type, title, url, document_date) values
        ('00000000-0000-4000-8000-000000000001', 'd1', 'Planvarsel', 'Planvarsel.pdf', 'https://example.com/d1', '2025-01-01');
      insert into event_enrichment (event_id, parser_version, documents_fingerprint, measure_type, purpose, purpose_document_external_id, purpose_document_type, purpose_method) values
        ('00000000-0000-4000-8000-000000000001', 2, 'f', 'bolig', 'Legge til rette for boliger', 'd1', 'Planvarsel', 'setning');
    `);
  });

  it("admin får sakene i utsnittet, nyeste først, med uttrekk og dokumenter", async () => {
    const rader = await som("drift@example.com", `select * from explore_events(${OSLO})`);
    if (rader === "NEKTET") throw new Error("nektet");
    expect(rader.map((r) => r.title)).toEqual(["Nyere plan", "Eldre plan"]);
    expect(Number(rader[0]!.total)).toBe(2);
    const eldre = rader[1]!;
    expect(eldre.attributes).toMatchObject({ plantype: "Detaljregulering", tiltakstype: "bolig", formaal: "Legge til rette for boliger" });
    expect(eldre.documents).toEqual([expect.objectContaining({ type: "Planvarsel", url: "https://example.com/d1" })]);
    expect(rader[0]!.documents).toEqual([]);
    expect(eldre.geometry.type).toMatch(/Polygon$/);
  });

  it("anon kommer ikke til funksjonen, og innlogget ikke-admin får ingen rader", async () => {
    expect(await som(null, `select * from explore_events(${OSLO})`)).toBe("NEKTET");
    expect(await som("annen@example.com", `select * from explore_events(${OSLO})`)).toEqual([]);
  });

  it("flate og tak avgrenser, og totalen sier hva som fantes", async () => {
    const flate = `'{"type":"Polygon","coordinates":[[[10.78,59.93],[10.83,59.93],[10.83,59.97],[10.78,59.97],[10.78,59.93]]]}'::jsonb`;
    const iFlate = await som("drift@example.com", `select * from explore_events(${OSLO}, ${flate})`);
    expect(iFlate === "NEKTET" ? iFlate : iFlate.map((r) => r.title)).toEqual(["Nyere plan"]);
    const kuttet = await som("drift@example.com", `select * from explore_events(${OSLO}, null, 1)`);
    if (kuttet === "NEKTET") throw new Error("nektet");
    expect(kuttet.map((r) => r.title)).toEqual(["Nyere plan"]);
    expect(Number(kuttet[0]!.total)).toBe(2);
  });
});
