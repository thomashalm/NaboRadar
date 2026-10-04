import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { refreshSchoolUnits } from "@/lib/schools/refresh";

type TestDb = Awaited<ReturnType<typeof createPgliteDb>>;

const ORIGIN = { lat: 59.9139, lng: 10.7522 };
const RETRY = { timeoutMs: 2_000, maxRetries: 0, baseDelayMs: 1 };

/**
 * Skolefilteret fra ende til ende: næringskode fra Udir → school_units → hva lese-RPC-en gir til
 * offentlige lesere og til admin.
 */
describe("skolefilter: henting og offentlig visning", { timeout: 60_000 }, () => {
  let db: TestDb;

  const skole = (orgnr: string, title: string, subtype = "videregaende_skole") => ({
    external_id: orgnr,
    category: "oppvekst",
    subtype,
    title,
    geometry: { type: "Point", coordinates: [ORIGIN.lng, ORIGIN.lat] },
    attributes: {},
    source_url: `https://nsr.udir.no/enheter/${orgnr}`,
    source_url_type: "factsheet",
    source_updated_at: null,
    content_hash: orgnr + title,
  });

  /** Falsk Udir: listen med DatoEndret, og enhetssiden med næringskoder. */
  function udir(enheter: Record<string, { endret: string; koder: string[] | "FEIL" }>, opts: { listeNede?: boolean } = {}) {
    const kall: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      kall.push(url);
      if (url.includes("/enheter?")) {
        if (opts.listeNede) return new Response("nede", { status: 500 });
        return Response.json({ AntallSider: 1, EnhetListe: Object.entries(enheter).map(([o, e]) => ({ Organisasjonsnummer: o, DatoEndret: e.endret })) });
      }
      const orgnr = url.split("/").pop()!;
      const enhet = enheter[orgnr];
      if (!enhet || enhet.koder === "FEIL") return new Response("feil", { status: 500 });
      return Response.json({ Organisasjonsnummer: orgnr, Naeringskoder: enhet.koder.map((Kode, i) => ({ Prioritet: i + 1, Kode })) });
    }) as typeof fetch;
    return { fetchImpl, kall, detaljkall: () => kall.filter((u) => u.includes("/enhet/")) };
  }

  const som = async (email: string | null) => {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(email ? { role: "authenticated", email } : { role: "anon" })]);
      await db.pg.exec(`set local role ${email ? "authenticated" : "anon"}`);
      const rader = await db.pg.query<{ title: string; attributes: { offentligSkjult?: string } }>(
        `select title, attributes from features_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500, array['oppvekst']) order by title`,
      );
      const antall = await db.pg.query<{ antall: string }>(`select antall from features_count_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500, array['oppvekst'])`);
      return { titler: rader.rows.map((r) => r.title), skjult: Object.fromEntries(rader.rows.filter((r) => r.attributes.offentligSkjult).map((r) => [r.title, r.attributes.offentligSkjult])), antall: Number(antall.rows[0]?.antall ?? 0) };
    } finally {
      await db.pg.exec("rollback");
    }
  };

  const ENHETER = {
    "100": { endret: "2026-01-01T00:00:00Z", koder: ["85.310"] },
    "200": { endret: "2026-01-01T00:00:00Z", koder: ["85.699", "85.310"] },
    "300": { endret: "2026-01-01T00:00:00Z", koder: ["85.310"] },
    "400": { endret: "2026-01-01T00:00:00Z", koder: ["85.201"] },
  };

  beforeEach(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`insert into admin_users (email) values ('drift@example.com') on conflict do nothing`);
    await db.rpc("upsert_area_features", {
      p_provider_id: "udir-skoler",
      p_features: [
        skole("100", "Møllergata videregående skole"),
        skole("200", "Eksamenskontoret i Akershus"),
        skole("300", "Nettskolen Innlandet"),
        skole("400", "Løren skole", "grunnskole"),
      ],
      p_synced_at: new Date().toISOString(),
    });
  });

  it("før filteret er fylt ut vises alt — ukjent skjuler ingen", async () => {
    expect((await som(null)).titler).toEqual(["Eksamenskontoret i Akershus", "Løren skole", "Møllergata videregående skole", "Nettskolen Innlandet"]);
  });

  it("første kjøring henter alle, og skjuler bare de ikke-vanlige offentlig", async () => {
    const { fetchImpl, detaljkall } = udir(ENHETER);
    const resultat = await refreshSchoolUnits(db, { fetchImpl, retry: RETRY });
    expect(resultat).toMatchObject({ schools: 4, fetched: 4, failed: 0, hidden: 2 });
    expect(detaljkall()).toHaveLength(4);

    const offentlig = await som(null);
    expect(offentlig.titler).toEqual(["Løren skole", "Møllergata videregående skole"]);
    expect(offentlig.antall).toBe(2);
    expect(offentlig.skjult).toEqual({});
    expect((await som("annen@example.com")).titler).toEqual(offentlig.titler);
  });

  it("admin ser alle, med grunnen", async () => {
    await refreshSchoolUnits(db, { fetchImpl: udir(ENHETER).fetchImpl, retry: RETRY });
    const admin = await som("drift@example.com");
    expect(admin.titler).toHaveLength(4);
    expect(admin.antall).toBe(4);
    expect(admin.skjult).toEqual({ "Eksamenskontoret i Akershus": "exam_office", "Nettskolen Innlandet": "online_school" });
    const rader = (await db.pg.query<{ orgnr: string; hidden_reason: string | null; rule: string | null; primary_nace: string }>("select orgnr, hidden_reason, rule, primary_nace from school_units order by orgnr")).rows;
    expect(rader).toEqual([
      { orgnr: "100", hidden_reason: null, rule: null, primary_nace: "85.310" },
      { orgnr: "200", hidden_reason: "exam_office", rule: "nace", primary_nace: "85.699" },
      { orgnr: "300", hidden_reason: "online_school", rule: "name", primary_nace: "85.310" },
      { orgnr: "400", hidden_reason: null, rule: null, primary_nace: "85.201" },
    ]);
  });

  it("andre kjøring henter ingenting når registeret er uendret", async () => {
    await refreshSchoolUnits(db, { fetchImpl: udir(ENHETER).fetchImpl, retry: RETRY });
    const andre = udir(ENHETER);
    const resultat = await refreshSchoolUnits(db, { fetchImpl: andre.fetchImpl, retry: RETRY });
    expect(andre.detaljkall()).toEqual([]);
    expect(resultat).toMatchObject({ fetched: 0, written: 0, hidden: 2 });
  });

  it("henter bare enheten registeret har endret, og en ny skole", async () => {
    await refreshSchoolUnits(db, { fetchImpl: udir(ENHETER).fetchImpl, retry: RETRY });
    await db.rpc("upsert_area_features", {
      p_provider_id: "udir-skoler",
      p_features: [skole("100", "Møllergata videregående skole"), skole("200", "Eksamenskontoret i Akershus"), skole("300", "Nettskolen Innlandet"), skole("400", "Løren skole", "grunnskole"), skole("500", "Ny skole", "grunnskole")],
      p_synced_at: new Date().toISOString(),
    });
    const neste = udir({ ...ENHETER, "100": { endret: "2026-06-01T00:00:00Z", koder: ["85.593"] }, "500": { endret: "2026-06-01T00:00:00Z", koder: ["85.201"] } });
    await refreshSchoolUnits(db, { fetchImpl: neste.fetchImpl, retry: RETRY });
    expect(neste.detaljkall().map((u) => u.split("/").pop()).sort()).toEqual(["100", "500"]);
    // Næringskoden er endret til voksenopplæring: nå skjules den.
    expect((await som(null)).titler).toEqual(["Løren skole", "Ny skole"]);
  });

  it("Udir svarer ikke for en enhet: skolen vises, og prøves igjen neste gang", async () => {
    const første = udir({ ...ENHETER, "100": { endret: "2026-01-01T00:00:00Z", koder: "FEIL" }, "200": { endret: "2026-01-01T00:00:00Z", koder: "FEIL" } });
    const resultat = await refreshSchoolUnits(db, { fetchImpl: første.fetchImpl, retry: RETRY });
    expect(resultat.failed).toBe(2);
    const offentlig = await som(null);
    // Den ordinære skolen vises. Eksamenskontoret fanges likevel av navnet, uten næringskode.
    expect(offentlig.titler).toEqual(["Løren skole", "Møllergata videregående skole"]);

    const andre = udir(ENHETER);
    await refreshSchoolUnits(db, { fetchImpl: andre.fetchImpl, retry: RETRY });
    expect(andre.detaljkall().map((u) => u.split("/").pop()).sort()).toEqual(["100", "200"]);
  });

  it("registerlisten er nede: ingenting endres, og ingen skjules", async () => {
    await expect(refreshSchoolUnits(db, { fetchImpl: udir(ENHETER, { listeNede: true }).fetchImpl, retry: RETRY })).rejects.toThrow();
    expect((await som(null)).titler).toHaveLength(4);
    expect((await db.pg.query("select 1 from school_units")).rows).toEqual([]);
  });

  it("offentlige roller kommer ikke til tabellen eller skrivefunksjonen", async () => {
    for (const rolle of ["anon", "authenticated"]) {
      for (const sql of ["select 1 from school_units", "select * from school_units_state()", "select upsert_school_units('[]'::jsonb)"]) {
        await db.pg.exec("begin");
        let nektet = false;
        try {
          await db.pg.exec(`set local role ${rolle}`);
          await db.pg.query(sql);
        } catch {
          nektet = true;
        } finally {
          await db.pg.exec("rollback");
        }
        expect(nektet, `${rolle}: ${sql}`).toBe(true);
      }
    }
  });
});
