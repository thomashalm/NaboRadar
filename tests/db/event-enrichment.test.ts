import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/**
 * Uttrekket per plansak (tiltakstype og formål) ligger i en egen tabell. Det skrives bare av
 * synken, og leses bare som felter i `attributes` fra events_within og get_event.
 */
describe("event_enrichment", { timeout: 30_000 }, () => {
  let db: Db;
  let eventId: string;
  const ORIGIN = { lat: 59.9139, lng: 10.7522 };

  async function som<T>(rolle: string, sql: string): Promise<T[] | "NEKTET"> {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: rolle })]);
      await db.pg.exec(`set local role ${rolle}`);
      return (await db.pg.query<T>(sql)).rows;
    } catch {
      return "NEKTET";
    } finally {
      await db.pg.exec("rollback");
    }
  }

  const rad = (overstyr: Record<string, unknown> = {}) => ({
    event_id: eventId,
    parser_version: 1,
    documents_fingerprint: "x",
    measure_type: "naering",
    measure_type_source: "formaal",
    purpose: "å legge til rette for etablering av dagligvareforretning og kontorarealer",
    purpose_document_external_id: "d-initiativ",
    purpose_document_type: "Planinitiativ",
    purpose_method: "setning",
    ...overstyr,
  });

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`
      insert into events (provider_id, external_id, type, title, geom, content_hash, raw_data, attributes, announced_at)
      values ('dibk-planning-started', 'p1', 'planning_started', 'Furnesvegen 111',
              extensions.st_multi(extensions.st_buffer(extensions.st_setsrid(extensions.st_makepoint(10.7522, 59.9139), 4326), 0.001)),
              'h', '{"features": []}'::jsonb, '{"plantype": "Detaljregulering", "planId": "2024001"}'::jsonb, current_date);
    `);
    eventId = (await db.pg.query<{ id: string }>("select id from events where external_id = 'p1'")).rows[0]!.id;
    await db.pg.exec(`
      insert into event_documents (event_id, external_id, type, title, url, mime_type, document_date) values
        ('${eventId}', 'd-initiativ', 'Planinitiativ', 'Planinitiativ.pdf', 'https://plandata.ft.dibk.no/a', 'application/pdf', '2026-01-02'),
        ('${eventId}', 'd-varsel', 'Planvarsel', 'Varsel.pdf', 'https://plandata.ft.dibk.no/b', 'application/pdf', '2026-01-03'),
        ('${eventId}', 'd-kart', 'PlanomraadePdf', 'Kart.pdf', 'https://plandata.ft.dibk.no/c', 'application/pdf', '2026-01-03');
    `);
  });

  it("de nye dokumenttypene kan lagres, ukjente typer kan ikke", async () => {
    await expect(
      db.pg.exec(`insert into event_documents (event_id, external_id, type, title, url) values ('${eventId}', 'd-annet', 'Annet', 'x', 'https://plandata.ft.dibk.no/d')`),
    ).rejects.toThrow();
  });

  it("køen har saker uten uttrekk, med bare dokumentene formålet kan stå i", async () => {
    const kø = await db.rpc<{ event_id: string; title: string; fingerprint: string; documents: { external_id: string; type: string }[] }>(
      "events_for_enrichment",
      { p_parser_version: 1, p_limit: 10 },
    );
    expect(kø).toHaveLength(1);
    expect(kø[0]!.title).toBe("Furnesvegen 111");
    expect(kø[0]!.documents.map((d) => d.type).sort()).toEqual(["Planinitiativ", "Planvarsel"]);
    expect(kø[0]!.fingerprint).toMatch(/^[0-9a-f]{32}$/);
  });

  it("uten uttrekk er attributes uendret", async () => {
    const [sak] = (await som<{ attributes: Record<string, string> }>("anon", `select * from events_within(${ORIGIN.lat}, ${ORIGIN.lng}, 500)`)) as { attributes: Record<string, string> }[];
    expect(sak!.attributes).toEqual({ plantype: "Detaljregulering", planId: "2024001" });
  });

  it("etter lagring ligger uttrekket i attributes, og saken er ute av køen", async () => {
    const [kø] = await db.rpc<{ fingerprint: string }>("events_for_enrichment", { p_parser_version: 1, p_limit: 10 });
    await db.rpc("upsert_event_enrichment", { p_rows: [rad({ documents_fingerprint: kø!.fingerprint })] });

    const [sak] = (await som<{ attributes: Record<string, string> }>("anon", `select * from events_within(${ORIGIN.lat}, ${ORIGIN.lng}, 500)`)) as { attributes: Record<string, string> }[];
    expect(sak!.attributes).toEqual({
      plantype: "Detaljregulering",
      planId: "2024001",
      tiltakstype: "naering",
      formaal: "å legge til rette for etablering av dagligvareforretning og kontorarealer",
      formaalDokumenttype: "Planinitiativ",
      formaalDokumentId: "d-initiativ",
    });

    const [detalj] = (await som<{ attributes: Record<string, string>; documents: { external_id: string }[] }>("anon", `select * from get_event('${eventId}')`)) as {
      attributes: Record<string, string>;
      documents: { external_id: string }[];
    }[];
    expect(detalj!.attributes.formaalDokumentId).toBe("d-initiativ");
    expect(detalj!.documents.map((d) => d.external_id)).toContain("d-initiativ");

    expect(await db.rpc("events_for_enrichment", { p_parser_version: 1, p_limit: 10 })).toEqual([]);
  });

  it("saken leses på nytt når reglene, tittelen eller dokumentene endres", async () => {
    expect(await db.rpc("events_for_enrichment", { p_parser_version: 2, p_limit: 10 })).toHaveLength(1);

    await db.pg.exec(`update events set title = 'Furnesvegen 111 - dagligvare' where id = '${eventId}'`);
    expect(await db.rpc("events_for_enrichment", { p_parser_version: 1, p_limit: 10 })).toHaveLength(1);
    await db.pg.exec(`update events set title = 'Furnesvegen 111' where id = '${eventId}'`);
    expect(await db.rpc("events_for_enrichment", { p_parser_version: 1, p_limit: 10 })).toHaveLength(0);

    await db.pg.exec(`insert into event_documents (event_id, external_id, type, title, url) values ('${eventId}', 'd-referat', 'ReferatOppstartsmoete', 'Referat.pdf', 'https://plandata.ft.dibk.no/e')`);
    expect(await db.rpc("events_for_enrichment", { p_parser_version: 1, p_limit: 10 })).toHaveLength(1);
  });

  it("en sak uten formål lagres uten dokumentreferanse, og halve rader avvises", async () => {
    await db.rpc("upsert_event_enrichment", {
      p_rows: [rad({ measure_type: "annet", measure_type_source: null, purpose: null, purpose_document_external_id: null, purpose_document_type: null, purpose_method: null })],
    });
    const [sak] = (await som<{ attributes: Record<string, string> }>("anon", `select * from events_within(${ORIGIN.lat}, ${ORIGIN.lng}, 500)`)) as { attributes: Record<string, string> }[];
    expect(sak!.attributes).toEqual({ plantype: "Detaljregulering", planId: "2024001", tiltakstype: "annet" });

    await expect(db.rpc("upsert_event_enrichment", { p_rows: [rad({ purpose_document_external_id: null })] })).rejects.toThrow();
    await expect(db.rpc("upsert_event_enrichment", { p_rows: [rad({ measure_type: "gjetning" })] })).rejects.toThrow();
    await expect(db.rpc("upsert_event_enrichment", { p_rows: [rad({ purpose: "x".repeat(301) })] })).rejects.toThrow();
  });

  it("rader for saker som ikke finnes, hoppes over", async () => {
    const antall = await db.rpc<number>("upsert_event_enrichment", { p_rows: [rad({ event_id: "00000000-0000-0000-0000-000000000000" })] });
    expect(antall[0]).toBe(0);
  });

  it("uttrekket kan ikke leses eller skrives direkte av anon eller innloggede", async () => {
    for (const rolle of ["anon", "authenticated"]) {
      expect(await som(rolle, "select * from event_enrichment")).toBe("NEKTET");
      expect(await som(rolle, `select public.upsert_event_enrichment('[]'::jsonb)`)).toBe("NEKTET");
      expect(await som(rolle, "select * from public.events_for_enrichment(1, 10)")).toBe("NEKTET");
      expect(await som(rolle, `select public.event_enrichment_attributes('${eventId}')`)).toBe("NEKTET");
    }
  });

  it("uttrekket forsvinner med saken", async () => {
    await db.pg.exec(`delete from events where id = '${eventId}'`);
    expect((await db.pg.query("select 1 from event_enrichment")).rows).toEqual([]);
  });
});
