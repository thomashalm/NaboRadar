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

/**
 * explore_events_overlap: «Finn overlapp». Plansakene er det som filtreres; referanselaget er
 * det de testes mot. Regelen for flater er minst 10 m² felles areal.
 */
describe("explore_events_overlap", { timeout: 60_000 }, () => {
  let db: Db;
  type Rad = { title: string; hit_count: number; hits: { title: string; subtype: string; attributes: Record<string, unknown> }[]; total: string; area_total: string; edge_only: string; geometry: { type: string } };
  const som = async (email: string | null, sql: string) => {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(email ? { role: "authenticated", email } : { role: "anon" })]);
      await db.pg.exec(`set local role ${email ? "authenticated" : "anon"}`);
      return (await db.pg.query<Rad>(sql)).rows;
    } catch {
      return "NEKTET" as const;
    } finally {
      await db.pg.exec("rollback");
    }
  };
  const admin = async (ref: string, ekstra = "") => {
    const rader = await som("drift@example.com", `select * from explore_events_overlap('${ref}', 10.5, 59.8, 11.0, 60.1${ekstra})`);
    if (rader === "NEKTET") throw new Error("nektet");
    return rader;
  };
  const flate = (id: string, title: string, subtype: string, [x1, y1, x2, y2]: number[], attributes: Record<string, unknown> = {}) => ({
    external_id: id, category: "grunnforhold", subtype, title,
    geometry: { type: "Polygon", coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]] },
    attributes, source_url: null, source_url_type: null, source_updated_at: null, content_hash: id,
  });
  const annet = (id: string, title: string, subtype: string, geometry: unknown) => ({
    external_id: id, category: "grunnforhold", subtype, title, geometry, attributes: {}, source_url: null, source_url_type: null, source_updated_at: null, content_hash: id,
  });
  const plan = (nr: number, title: string, boks: string, dato: string) =>
    `('00000000-0000-4000-8000-00000000010${nr}', 'dibk-planning-started', 'o${nr}', 'planning_started', '${title}', extensions.st_multi(extensions.st_makeenvelope(${boks}, 4326)), 'o${nr}', '{}'::jsonb, '${dato}', '0301', '{}'::jsonb)`;

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`
      insert into admin_users (email) values ('drift@example.com') on conflict do nothing;
      insert into events (id, provider_id, external_id, type, title, geom, content_hash, raw_data, announced_at, municipality_number, attributes) values
        ${plan(1, "Plan A", "10.70, 59.90, 10.71, 59.91", "2026-05-01")},
        ${plan(2, "Plan B", "10.80, 59.90, 10.81, 59.91", "2026-04-01")},
        ${plan(3, "Plan C", "10.72, 59.90, 10.73, 59.91", "2026-03-01")};
    `);
    const synk = { p_synced_at: new Date().toISOString() };
    await db.rpc("upsert_area_features", {
      ...synk,
      p_provider_id: "nve-kvikkleire-soner",
      p_features: [
        // Overlapper A med areal, og deler bare grenselinjen x = 10.72 med C.
        flate("s1", "Sone 1", "kvikkleire_sone", [10.705, 59.895, 10.72, 59.905], { risikoklasse: 4 }),
        flate("s2", "Sone 2", "kvikkleire_sone", [10.695, 59.905, 10.702, 59.915]),
        // Dekker hele B, men er utredet uten fare: ikke en kvikkleiresone.
        flate("u1", "Utredet", "kvikkleire_utredet_uten_fare", [10.79, 59.89, 10.82, 59.92]),
      ],
    });
    await db.rpc("upsert_area_features", {
      ...synk,
      p_provider_id: "mdir-forurenset-grunn",
      p_features: [
        // En flis langs kanten av A: rundt 3 m².
        flate("f1", "Flis", "forurenset_grunn", [10.70999, 59.9, 10.712, 59.90005]),
        flate("f2", "Lokalitet i B", "forurenset_grunn", [10.805, 59.905, 10.82, 59.92], { paavirkningsgrad: "liteForurensning" }),
      ],
    });
    await db.rpc("upsert_area_features", {
      ...synk,
      p_provider_id: "nve-nettanlegg",
      p_features: [
        annet("l1", "Kraftledning", "kraftledning", { type: "LineString", coordinates: [[10.69, 59.905], [10.715, 59.905]] }),
        annet("t1", "Stasjon", "transformatorstasjon", { type: "Point", coordinates: [10.705, 59.905] }),
        // Nær B, men utenfor.
        annet("l2", "Kraftledning", "kraftledning", { type: "LineString", coordinates: [[10.79, 59.92], [10.82, 59.92]] }),
      ],
    });
  });

  it("gir bare plansakene som overlapper, med hva de traff og hvor mange det ble lett blant", async () => {
    const rader = await admin("kvikkleire");
    expect(rader.map((r) => r.title)).toEqual(["Plan A"]);
    const a = rader[0]!;
    expect(a.hit_count).toBe(2);
    // Størst felles areal først.
    expect(a.hits.map((h) => h.title)).toEqual(["Sone 1", "Sone 2"]);
    expect(a.hits[0]!.attributes).toEqual({ risikoklasse: 4 });
    expect([Number(a.total), Number(a.area_total)]).toEqual([1, 3]);
    expect(a.geometry.type).toMatch(/Polygon$/);
  });

  it("felles grenselinje er ikke overlapp, men telles som kant", async () => {
    const [a] = await admin("kvikkleire");
    // Plan C deler bare linjen x = 10.72 med Sone 1.
    expect(Number(a!.edge_only)).toBe(1);
  });

  it("område utredet uten fare er ikke en kvikkleiresone", async () => {
    expect((await admin("kvikkleire")).some((r) => r.title === "Plan B")).toBe(false);
  });

  it("en flis under 10 m² er ikke et treff", async () => {
    const rader = await admin("forurenset-grunn");
    expect(rader.map((r) => [r.title, r.hit_count])).toEqual([["Plan B", 1]]);
    expect(Number(rader[0]!.edge_only)).toBe(1);
  });

  it("kraftnett: ledning som krysser og stasjon innenfor er treff; ledning utenfor er det ikke", async () => {
    const rader = await admin("kraftnett");
    expect(rader.map((r) => r.title)).toEqual(["Plan A"]);
    expect(rader[0]!.hits.map((h) => h.subtype).sort()).toEqual(["kraftledning", "transformatorstasjon"]);
  });

  it("flaten avgrenser hvilke plansaker det letes blant", async () => {
    const vest = `, '{"type":"Polygon","coordinates":[[[10.6,59.8],[10.75,59.8],[10.75,60.0],[10.6,60.0],[10.6,59.8]]]}'::jsonb`;
    const [a] = await admin("kvikkleire", vest);
    expect([a!.title, Number(a!.area_total)]).toEqual(["Plan A", 2]);
    expect(await admin("forurenset-grunn", vest)).toEqual([]);
  });

  it("ukjent referanselag gir ingenting — nøkkelen er en fast liste, ikke fritekst", async () => {
    for (const ref of ["nve-kvikkleire-soner", "datasenter", "", "kvikkleire'; drop table events; --".replaceAll("'", "''")]) {
      expect(await admin(ref)).toEqual([]);
    }
  });

  it("anon kommer ikke til funksjonen, og innlogget ikke-admin får ingen rader", async () => {
    const sql = "select * from explore_events_overlap('kvikkleire', 10.5, 59.8, 11.0, 60.1)";
    expect(await som(null, sql)).toBe("NEKTET");
    expect(await som("annen@example.com", sql)).toEqual([]);
  });
});
