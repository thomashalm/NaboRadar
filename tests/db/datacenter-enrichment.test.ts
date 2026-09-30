import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;
const DRIFT = { role: "authenticated", email: "drift@example.com" };

/**
 * Datasenter-enrichment: roller, MW-semantikk, feltkilder og refresh-køen.
 *
 * Tre ting testes hardest, fordi det er de tre modellen finnes for.
 *
 *   1. At rollene ikke smelter sammen. En kunde er ikke en eier, og en operatør er ikke et
 *      morselskap. Slår de sammen ett sted, er hele poenget borte.
 *   2. At MW-tallene beholder semantikken. «700 MW sikret kraft» og «700 MW i drift» skal ikke
 *      kunne bli det samme feltet.
 *   3. At ingenting av dette lekker ut, og at køen ikke rører resten av appen.
 */
describe("datasenter-enrichment", { timeout: 90_000 }, () => {
  let db: Db;
  let anlegg: string;

  /** Kjører som en gitt rolle. "NEKTET" = feil fra Postgres. Rulles alltid tilbake. */
  async function som<T>(rolle: string, email: string | null, sql: string): Promise<T[] | "NEKTET"> {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(email ? { role: rolle, email } : { role: rolle }),
      ]);
      await db.pg.exec(`set local role ${rolle}`);
      return (await db.pg.query<T>(sql)).rows;
    } catch {
      return "NEKTET";
    } finally {
      await db.pg.exec("rollback");
    }
  }

  /** Kjører som drift. Oppsett og steg som skal henge igjen. */
  async function drift<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    await db.pg.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(DRIFT)]);
    return (await db.pg.query<T>(sql, params)).rows;
  }

  async function nyttAnlegg(tittel: string, over: Record<string, string> = {}): Promise<string> {
    const rows = await drift<{ id: string }>(
      `insert into admin_research_items
         (item_type, category, subcategory, title, municipality, latitude, longitude,
          operational_status, confidence, interest_level, verification_status)
       values ('finding', 'Datasenter / industri / tekniske anlegg', 'Datasenter', $1, $2,
               59.9, 10.7, $3, $4, $5, $6)
       returning id`,
      [
        tittel,
        over.municipality ?? "Vennesla",
        over.operational_status ?? "active",
        over.confidence ?? "medium",
        over.interest_level ?? "medium",
        over.verification_status ?? "verified_public_source",
      ],
    );
    return rows[0]!.id;
  }

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`insert into admin_users (email) values ('drift@example.com') on conflict do nothing`);
    await db.pg.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(DRIFT)]);
    anlegg = await nyttAnlegg("Bulk N01 Campus, Øvrebø", { municipality: "Vennesla", interest_level: "high" });
  });

  // -------------------------------------------------------------------------
  describe("sikkerhet", () => {
    const tabeller = [
      "admin_research_datacenter_details",
      "admin_research_datacenter_parties",
      "admin_research_datacenter_field_sources",
      "admin_research_datacenter_refresh_runs",
      "admin_research_datacenter_refresh_items",
    ];

    it("anon får ikke lese noen av tabellene", async () => {
      for (const t of tabeller) {
        expect(await som("anon", null, `select * from ${t}`), t).toBe("NEKTET");
      }
      expect(await som("anon", null, "select * from admin_datacenter_overview")).toBe("NEKTET");
    });

    /**
     * Viewene er interne definisjoner uten grants, på linje med admin_research_review_status.
     * All lesing skal gå gjennom funksjonene, som sjekker is_admin() selv.
     */
    it("viewene er ikke en tilgangsflate — heller ikke for innloggede", async () => {
      for (const v of ["admin_datacenter_overview", "admin_datacenter_refresh_status"]) {
        expect(await som("authenticated", "utenfor@example.com", `select * from ${v}`), v).toBe("NEKTET");
        expect(await som("authenticated", DRIFT.email, `select * from ${v}`), v).toBe("NEKTET");
      }
    });

    it("innlogget uten admin får ingen rader gjennom funksjonene", async () => {
      expect(await som("authenticated", "utenfor@example.com", "select * from datacenter_items()")).toEqual([]);
      expect(await som("authenticated", "utenfor@example.com", "select * from datacenter_refresh_runs()")).toEqual([]);
      expect(
        await som("authenticated", "utenfor@example.com", "select * from datacenter_refresh_candidates('full')"),
      ).toEqual([]);
    });

    it("anon får ikke kalle noen av funksjonene", async () => {
      for (const kall of [
        "select * from datacenter_items()",
        "select * from datacenter_refresh_candidates('review_due')",
        "select start_datacenter_refresh('review_due')",
        "select datacenter_detail(gen_random_uuid())",
        "select * from datacenter_refresh_runs()",
      ]) {
        expect(await som("anon", null, kall), kall).toBe("NEKTET");
      }
    });

    it("innlogget uten admin kan ikke starte en kjøring", async () => {
      expect(
        await som("authenticated", "utenfor@example.com", "select start_datacenter_refresh('full')"),
      ).toBe("NEKTET");
    });

    it("tabellene kan ikke skrives til direkte, heller ikke av admin", async () => {
      for (const t of tabeller) {
        const r = await som("authenticated", DRIFT.email, `insert into ${t} default values`);
        expect(r, t).toBe("NEKTET");
      }
    });

    it("datasentre finnes ikke i area_features, så /omrade kan ikke nå dem", async () => {
      const r = await drift<{ n: number }>(
        `select count(*)::int n from area_features where category ilike '%datasenter%'`,
      );
      expect(r[0]!.n).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe("roller holdes fra hverandre", () => {
    it("eier, operatør, kunde og morselskap er fire ulike påstander", async () => {
      const kilde = await drift<{ id: string }>(
        `insert into admin_research_sources (research_item_id, source_name, source_url, primary_source)
         values ($1, 'Pressemelding fra operatøren', 'https://example.com/a', true) returning id`,
        [anlegg],
      );
      await drift(`select save_datacenter_party($1, 'owner', 'Eierselskap AS', '{"org_number":"123456789"}')`, [anlegg]);
      await drift(`select save_datacenter_party($1, 'operator', 'Driftsselskap AS', '{}')`, [anlegg]);
      await drift(`select save_datacenter_party($1, 'customer', 'Kunde Inc', $2)`, [
        anlegg,
        JSON.stringify({ confidence: "high", source_id: kilde[0]!.id }),
      ]);
      await drift(`select save_datacenter_party($1, 'parent_company', 'Konsern ASA', '{}')`, [anlegg]);

      const o = await drift<Record<string, string>>(
        `select owners, operators, customers, parent_companies from admin_datacenter_overview where id = $1`,
        [anlegg],
      );
      expect(o[0]!.owners).toBe("Eierselskap AS");
      expect(o[0]!.operators).toBe("Driftsselskap AS");
      expect(o[0]!.customers).toBe("Kunde Inc");
      expect(o[0]!.parent_companies).toBe("Konsern ASA");
    });

    it("samme selskap kan ha to roller uten at de blandes", async () => {
      const id = await nyttAnlegg("Anlegg med dobbeltrolle");
      await drift(`select save_datacenter_party($1, 'owner', 'Samme AS', '{}')`, [id]);
      await drift(`select save_datacenter_party($1, 'operator', 'Samme AS', '{}')`, [id]);
      const o = await drift<Record<string, string>>(
        `select owners, operators from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(o[0]!.owners).toBe("Samme AS");
      expect(o[0]!.operators).toBe("Samme AS");
    });

    /**
     * Terskelen for kunde ligger i databasen, ikke bare i en instruks. En avis som kaller noe
     * «TikToks datasenter» er ikke dokumentasjon, og regelen skal ikke kunne omgås i en travel time.
     */
    it("kunde uten både høy sikkerhet og kilde avvises av databasen", async () => {
      const id = await nyttAnlegg("Anlegg med rykte om kunde");
      await expect(
        drift(`select save_datacenter_party($1, 'customer', 'Antatt Kunde AS', '{"confidence":"medium"}')`, [id]),
      ).rejects.toThrow();
      await expect(
        drift(`select save_datacenter_party($1, 'customer', 'Antatt Kunde AS', '{"confidence":"high"}')`, [id]),
      ).rejects.toThrow();
    });

    it("eier uten kilde er derimot lov — den terskelen er lavere", async () => {
      const id = await nyttAnlegg("Anlegg med eier uten kilde");
      await expect(drift(`select save_datacenter_party($1, 'owner', 'Eier AS', '{}')`, [id])).resolves.toBeDefined();
    });

    it("ukjent rolle avvises", async () => {
      await expect(drift(`select save_datacenter_party($1, 'sponsor', 'Noen AS', '{}')`, [anlegg])).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe("MW-semantikk", () => {
    it("de fem tallene er fem ulike felt", async () => {
      const id = await nyttAnlegg("Anlegg med all kapasitet");
      await drift(`select save_datacenter_details($1, $2)`, [
        id,
        JSON.stringify({
          it_load_mw: "12.5",
          operational_capacity_mw: "20",
          secured_power_mw: "700",
          planned_capacity_mw: "120",
          campus_potential_mw: "900",
        }),
      ]);
      const d = await drift<Record<string, string>>(
        `select it_load_mw, operational_capacity_mw, secured_power_mw, planned_capacity_mw, campus_potential_mw
           from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(Number(d[0]!.it_load_mw)).toBe(12.5);
      expect(Number(d[0]!.operational_capacity_mw)).toBe(20);
      expect(Number(d[0]!.secured_power_mw)).toBe(700);
      expect(Number(d[0]!.planned_capacity_mw)).toBe(120);
      expect(Number(d[0]!.campus_potential_mw)).toBe(900);
    });

    it("det finnes ingen generisk capacity_mw å falle tilbake på", async () => {
      const kolonner = await drift<{ column_name: string }>(
        `select column_name from information_schema.columns
          where table_name = 'admin_research_datacenter_details'`,
      );
      const navn = kolonner.map((k) => k.column_name);
      expect(navn).not.toContain("capacity_mw");
      expect(navn).not.toContain("mw");
      for (const f of [
        "it_load_mw",
        "operational_capacity_mw",
        "secured_power_mw",
        "planned_capacity_mw",
        "campus_potential_mw",
      ]) {
        expect(navn, f).toContain(f);
      }
    });

    it("negativ effekt avvises", async () => {
      const id = await nyttAnlegg("Anlegg med feil tall");
      await expect(drift(`select save_datacenter_details($1, '{"secured_power_mw":"-5"}')`, [id])).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe("anleggstype", () => {
    it("bruker kontrollert vokabular", async () => {
      const id = await nyttAnlegg("Anlegg med type");
      await drift(`select save_datacenter_details($1, '{"facility_type":"ai_hpc"}')`, [id]);
      const d = await drift<{ facility_type: string }>(
        `select facility_type from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(d[0]!.facility_type).toBe("ai_hpc");
    });

    it("avviser fritekstsynonymer", async () => {
      const id = await nyttAnlegg("Anlegg med fritekst-type");
      await expect(
        drift(`select save_datacenter_details($1, '{"facility_type":"AI-datasenter"}')`, [id]),
      ).rejects.toThrow();
    });

    it("er unknown som utgangspunkt, ikke gjettet", async () => {
      const id = await nyttAnlegg("Anlegg uten type");
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"10"}')`, [id]);
      const d = await drift<{ facility_type: string }>(
        `select facility_type from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(d[0]!.facility_type).toBe("unknown");
    });
  });

  // -------------------------------------------------------------------------
  describe("delvis lagring", () => {
    it("et felt som ikke sendes med, blir stående", async () => {
      const id = await nyttAnlegg("Anlegg som oppdateres to ganger");
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"700","facility_type":"hyperscale"}')`, [id]);
      await drift(`select save_datacenter_details($1, '{"planned_capacity_mw":"120"}')`, [id]);
      const d = await drift<Record<string, string>>(
        `select secured_power_mw, planned_capacity_mw, facility_type
           from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(Number(d[0]!.secured_power_mw)).toBe(700);
      expect(Number(d[0]!.planned_capacity_mw)).toBe(120);
      expect(d[0]!.facility_type).toBe("hyperscale");
    });

    it("et felt som sendes tomt, nullstilles bevisst", async () => {
      const id = await nyttAnlegg("Anlegg som korrigeres");
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"700"}')`, [id]);
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":""}')`, [id]);
      const d = await drift<{ secured_power_mw: string | null }>(
        `select secured_power_mw from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(d[0]!.secured_power_mw).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("historikk", () => {
    it("et endret felt gir en review, ikke en stille overskriving", async () => {
      const id = await nyttAnlegg("Anlegg som vokser");
      await drift(`select save_datacenter_details($1, '{"operational_capacity_mw":"20"}')`, [id]);
      const før = await drift<{ n: number }>(
        `select count(*)::int n from admin_research_reviews where research_item_id = $1`,
        [id],
      );
      await drift(`select save_datacenter_details($1, '{"operational_capacity_mw":"40"}')`, [id]);
      const etter = await drift<{ n: number; summary: string }>(
        `select count(*)::int n, max(summary) summary from admin_research_reviews where research_item_id = $1`,
        [id],
      );
      expect(etter[0]!.n).toBe(før[0]!.n + 1);
      expect(etter[0]!.summary).toContain("operational_capacity_mw");
    });

    it("en lagring som ikke endrer noe, gir ingen review", async () => {
      const id = await nyttAnlegg("Anlegg som står stille");
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"50"}')`, [id]);
      const før = await drift<{ n: number }>(
        `select count(*)::int n from admin_research_reviews where research_item_id = $1`,
        [id],
      );
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"50"}')`, [id]);
      const etter = await drift<{ n: number }>(
        `select count(*)::int n from admin_research_reviews where research_item_id = $1`,
        [id],
      );
      expect(etter[0]!.n).toBe(før[0]!.n);
    });

    it("funksjonen sier hvilke felt som endret seg", async () => {
      const id = await nyttAnlegg("Anlegg som rapporterer endring");
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"10"}')`, [id]);
      const r = await drift<{ save_datacenter_details: string[] }>(
        `select save_datacenter_details($1, '{"secured_power_mw":"20","facility_type":"colocation"}')`,
        [id],
      );
      expect([...r[0]!.save_datacenter_details].sort()).toEqual(["facility_type", "secured_power_mw"]);
    });

    it("en rolle som settes eller fjernes, havner i historikken", async () => {
      const id = await nyttAnlegg("Anlegg med rolleendring");
      await drift(`select save_datacenter_party($1, 'operator', 'Første Drift AS', '{}')`, [id]);
      const p = await drift<{ id: string }>(
        `select id from admin_research_datacenter_parties where research_item_id = $1`,
        [id],
      );
      await drift(`select delete_datacenter_party($1)`, [p[0]!.id]);
      const h = await drift<{ summary: string }>(
        `select summary from admin_research_reviews where research_item_id = $1 order by reviewed_at`,
        [id],
      );
      const alle = h.map((x) => x.summary).join(" | ");
      expect(alle).toContain("Rolle satt: operator");
      expect(alle).toContain("Rolle fjernet: operator");
    });
  });

  // -------------------------------------------------------------------------
  describe("manglende felt", () => {
    it("listes i prioritert rekkefølge, og forsvinner når de fylles", async () => {
      const id = await nyttAnlegg("Anlegg uten noe som helst", { operational_status: "unknown" });
      const før = await drift<{ missing_fields: string[] }>(
        `select missing_fields from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(før[0]!.missing_fields).toEqual(["operator", "owner", "status", "mw", "type", "primary_source"]);

      await drift(`select save_datacenter_party($1, 'operator', 'Drift AS', '{}')`, [id]);
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"40","facility_type":"colocation"}')`, [id]);
      const etter = await drift<{ missing_fields: string[] }>(
        `select missing_fields from admin_datacenter_overview where id = $1`,
        [id],
      );
      expect(etter[0]!.missing_fields).toEqual(["owner", "status", "primary_source"]);
    });

    it("koordinat teller som manglende felt når det ikke finnes", async () => {
      const rows = await drift<{ id: string }>(
        `insert into admin_research_items (item_type, category, subcategory, title, operational_status)
         values ('finding', 'Datasenter / industri / tekniske anlegg', 'Datasenter', 'Anlegg uten koordinat', 'active')
         returning id`,
      );
      const m = await drift<{ missing_fields: string[] }>(
        `select missing_fields from admin_datacenter_overview where id = $1`,
        [rows[0]!.id],
      );
      expect(m[0]!.missing_fields).toContain("coordinates");
    });
  });

  // -------------------------------------------------------------------------
  describe("refresh-køen", () => {
    it("review_due tar bare det som trenger tilsyn, og sier hvorfor", async () => {
      const k = await drift<{ title: string; queued_reasons: string[] }>(
        `select title, queued_reasons from datacenter_refresh_candidates('review_due')`,
      );
      expect(k.length).toBeGreaterThan(0);
      for (const rad of k) expect(rad.queued_reasons.length, rad.title).toBeGreaterThan(0);
    });

    it("full tar med anlegg som ikke trenger tilsyn ennå", async () => {
      const id = await nyttAnlegg("Komplett stabilt anlegg", { interest_level: "low" });
      await drift(
        `insert into admin_research_sources (research_item_id, source_name, primary_source)
         values ($1, 'Operatørens side', true)`,
        [id],
      );
      await drift(`select save_datacenter_party($1, 'owner', 'Eier AS', '{}')`, [id]);
      await drift(`select save_datacenter_party($1, 'operator', 'Drift AS', '{}')`, [id]);
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"30","facility_type":"colocation"}')`, [id]);
      await drift(`update admin_research_items set next_review_at = current_date + 200 where id = $1`, [id]);

      const due = await drift<{ id: string }>(`select id from datacenter_refresh_candidates('review_due')`);
      const full = await drift<{ id: string }>(`select id from datacenter_refresh_candidates('full')`);
      expect(due.map((x) => x.id)).not.toContain(id);
      expect(full.map((x) => x.id)).toContain(id);
    });

    it("rejected og archived er aldri med", async () => {
      const id = await nyttAnlegg("Avvist anlegg", { verification_status: "rejected" });
      for (const mode of ["review_due", "full"]) {
        const k = await drift<{ id: string }>(`select id from datacenter_refresh_candidates($1)`, [mode]);
        expect(k.map((x) => x.id), mode).not.toContain(id);
      }
    });

    it("prioriterer under bygging foran alt annet", async () => {
      const id = await nyttAnlegg("Anlegg under bygging", { operational_status: "under_construction" });
      const k = await drift<{ id: string }>(`select id from datacenter_refresh_candidates('review_due')`);
      expect(k[0]!.id).toBe(id);
    });

    it("søkeplanen bygges av det vi vet, ikke av en fast liste", async () => {
      const plan = await drift<{ datacenter_search_plan: string[] }>(`select datacenter_search_plan($1)`, [anlegg]);
      const tekst = plan[0]!.datacenter_search_plan.join(" | ");
      expect(tekst).toContain("Bulk N01 Campus");
      expect(tekst).toContain("Vennesla");
      expect(tekst).toMatch(/MW/);
      expect(tekst).toMatch(/kunde|leietaker/);
      // Kjente roller gir egne søk.
      expect(tekst).toContain("Driftsselskap AS");
    });
  });

  // -------------------------------------------------------------------------
  describe("kjøringen", () => {
    it("går queued → running → completed, og teller riktig underveis", async () => {
      const r = await drift<{ start_datacenter_refresh: string }>(`select start_datacenter_refresh('review_due')`);
      const run = r[0]!.start_datacenter_refresh;

      const q = await drift<{ status: string; total: number; checked: number }>(
        `select status, total, checked from admin_datacenter_refresh_status where id = $1`,
        [run],
      );
      expect(q[0]!.status).toBe("queued");
      expect(q[0]!.total).toBeGreaterThan(2);
      expect(q[0]!.checked).toBe(0);

      const kø = await drift<{ research_item_id: string }>(
        `select research_item_id from datacenter_refresh_queue($1) order by queue_position`,
        [run],
      );

      await drift(
        `select record_datacenter_refresh_item($1, $2, 'changed', 'MW oppdatert', array['secured_power_mw'])`,
        [run, kø[0]!.research_item_id],
      );
      const underveis = await drift<{ status: string; checked: number; changed: number }>(
        `select status, checked, changed from admin_datacenter_refresh_status where id = $1`,
        [run],
      );
      expect(underveis[0]!.status).toBe("running");
      expect(underveis[0]!.checked).toBe(1);
      expect(underveis[0]!.changed).toBe(1);

      for (const rad of kø.slice(1, -1)) {
        await drift(`select record_datacenter_refresh_item($1, $2, 'unchanged')`, [run, rad.research_item_id]);
      }
      await drift(`select record_datacenter_refresh_item($1, $2, 'failed', null, '{}', 'kilden svarte 503')`, [
        run,
        kø[kø.length - 1]!.research_item_id,
      ]);

      const slutt = await drift<{
        status: string;
        checked: number;
        total: number;
        changed: number;
        unchanged: number;
        failed: number;
      }>(
        `select status, checked, total, changed, unchanged, failed
           from admin_datacenter_refresh_status where id = $1`,
        [run],
      );
      expect(slutt[0]!.status).toBe("completed");
      expect(slutt[0]!.checked).toBe(slutt[0]!.total);
      expect(slutt[0]!.changed).toBe(1);
      expect(slutt[0]!.failed).toBe(1);
      expect(slutt[0]!.unchanged).toBe(slutt[0]!.total - 2);
    });

    it("tellerne er utledet, ikke lagret — de kan ikke drive fra køen", async () => {
      const kolonner = await drift<{ column_name: string }>(
        `select column_name from information_schema.columns
          where table_name = 'admin_research_datacenter_refresh_runs'`,
      );
      const navn = kolonner.map((k) => k.column_name);
      for (const teller of ["total", "checked", "changed", "unchanged", "failed", "status"]) {
        expect(navn, teller).not.toContain(teller);
      }
    });

    it("bare én kjøring om gangen", async () => {
      const r = await drift<{ start_datacenter_refresh: string }>(`select start_datacenter_refresh('full')`);
      const run = r[0]!.start_datacenter_refresh;
      await expect(drift(`select start_datacenter_refresh('review_due')`)).rejects.toThrow(/kjører allerede/);
      await drift(`select cancel_datacenter_refresh($1, 'ryddet i test')`, [run]);
      const etter = await drift<{ status: string }>(
        `select status from admin_datacenter_refresh_status where id = $1`,
        [run],
      );
      expect(etter[0]!.status).toBe("cancelled");

      const ny = await drift<{ start_datacenter_refresh: string }>(`select start_datacenter_refresh('review_due')`);
      expect(ny[0]!.start_datacenter_refresh).toBeDefined();
      await drift(`select cancel_datacenter_refresh($1, 'ryddet i test')`, [ny[0]!.start_datacenter_refresh]);
    });

    it("logges som en vanlig research-runde, så historikken henger sammen", async () => {
      const r = await drift<{ start_datacenter_refresh: string }>(`select start_datacenter_refresh('review_due')`);
      const run = r[0]!.start_datacenter_refresh;
      const l = await drift<{ label: string; scope: string }>(
        `select l.label, l.scope from admin_research_datacenter_refresh_runs d
           join admin_research_runs l on l.id = d.research_run_id where d.id = $1`,
        [run],
      );
      expect(l[0]!.label).toContain("Datasenter-refresh");
      expect(l[0]!.scope).toContain("Datasenter");
      await drift(`select cancel_datacenter_refresh($1, 'ryddet i test')`, [run]);
    });

    it("rører ingen andre kategorier, og starter ingen provider-sync", async () => {
      const r = await drift<{ start_datacenter_refresh: string }>(`select start_datacenter_refresh('full')`);
      const run = r[0]!.start_datacenter_refresh;
      const feil = await drift<{ n: number }>(
        `select count(*)::int n from admin_research_datacenter_refresh_items ri
           join admin_research_items i on i.id = ri.research_item_id
          where ri.run_id = $1 and i.subcategory is distinct from 'Datasenter'`,
        [run],
      );
      expect(feil[0]!.n).toBe(0);
      const sync = await drift<{ n: number }>(`select count(*)::int n from sync_requests`);
      expect(sync[0]!.n).toBe(0);
      await drift(`select cancel_datacenter_refresh($1, 'ryddet i test')`, [run]);
    });
  });

  // -------------------------------------------------------------------------
  describe("feltkilder", () => {
    it("et MW-tall kan spores til kilden som bærer det", async () => {
      const id = await nyttAnlegg("Anlegg med sporbart tall");
      const kilde = await drift<{ id: string }>(
        `insert into admin_research_sources (research_item_id, source_name, source_url)
         values ($1, 'Kraftselskapets melding', 'https://example.com/kraft') returning id`,
        [id],
      );
      await drift(`select save_datacenter_details($1, '{"secured_power_mw":"700"}')`, [id]);
      await drift(`select set_datacenter_field_source($1, 'secured_power_mw', $2, 'Oppgitt i melding')`, [
        id,
        kilde[0]!.id,
      ]);

      const d = await drift<{
        datacenter_detail: { field_sources: { field_name: string; source_name: string }[] };
      }>(`select datacenter_detail($1)`, [id]);
      const fs = d[0]!.datacenter_detail.field_sources;
      expect(fs).toHaveLength(1);
      expect(fs[0]!.field_name).toBe("secured_power_mw");
      expect(fs[0]!.source_name).toBe("Kraftselskapets melding");
    });

    it("avviser feltnavn som ikke finnes", async () => {
      const id = await nyttAnlegg("Anlegg med ukjent felt");
      const kilde = await drift<{ id: string }>(
        `insert into admin_research_sources (research_item_id, source_name) values ($1, 'X') returning id`,
        [id],
      );
      await expect(drift(`select set_datacenter_field_source($1, 'mw', $2)`, [id, kilde[0]!.id])).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  it("detaljvisningen henter roller, feltkilder og kilder i ett kall", async () => {
    const d = await drift<{ datacenter_detail: Record<string, unknown> }>(`select datacenter_detail($1)`, [anlegg]);
    const detalj = d[0]!.datacenter_detail;
    expect(Object.keys(detalj).sort()).toEqual(["field_sources", "item", "parties", "sources"]);
    const parties = detalj.parties as { role: string }[];
    expect(parties.map((p) => p.role).sort()).toEqual(["customer", "operator", "owner", "parent_company"]);
  });

  it("kartlista henter ikke kilder eller historikk", async () => {
    const kolonner = await drift<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'admin_datacenter_overview'`,
    );
    const navn = kolonner.map((k) => k.column_name);
    expect(navn).toContain("source_count");
    expect(navn).not.toContain("sources");
    expect(navn).not.toContain("reviews");
  });
});
