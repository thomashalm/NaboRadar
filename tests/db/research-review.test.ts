import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;
const DRIFT = { role: "authenticated", email: "drift@example.com" };

/**
 * Review-laget: freshness, policy, kø og historikk.
 *
 * To ting testes hardest. Det ene er at policyen gir *intuitivt forskjellige* intervaller — et
 * byggeprosjekt og en fredet bunker skal ikke ende på samme 90 dager. Det andre er at en
 * innholdsoppdatering ikke ser ut som en kontroll: seeden skriver over felt hver gang den kjører,
 * og hvis den samtidig nullstilte reviewdata ville køen vært verdiløs.
 */
describe("research review", { timeout: 40_000 }, () => {
  let db: Db;

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

  /** Lager et funn direkte som eier, med feltene testen trenger. */
  async function lagFunn(felt: Record<string, unknown>): Promise<string> {
    const kolonner = Object.keys(felt);
    const verdier = kolonner.map((_, i) => `$${i + 1}`);
    const { rows } = await db.pg.query<{ id: string }>(
      `insert into admin_research_items (${kolonner.join(", ")}) values (${verdier.join(", ")}) returning id`,
      Object.values(felt),
    );
    return rows[0]!.id;
  }

  async function status(id: string) {
    const { rows } = await db.pg.query<{
      review_state: string;
      review_reasons: string[];
      review_priority: number;
      next_review_at: string | null;
      review_interval_days: number | null;
      review_mode: string;
      last_reviewed_at: string | null;
      last_verified_at: string | null;
      review_unchanged_streak: number;
      review_count: number;
    }>(`select * from admin_research_review_status where id = $1`, [id]);
    return rows[0]!;
  }

  /** Intervallet policyen gir, uten å måtte lage en rad først. */
  async function intervall(over: Partial<Record<string, unknown>> = {}): Promise<number | null> {
    const p = {
      item_type: "finding",
      operational: "active",
      verification: "verified_public_source",
      interest: "medium",
      confidence: "high",
      kandidat: false,
      koordinat: true,
      primaer: true,
      streak: 0,
      endret: false,
      ...over,
    };
    const { rows } = await db.pg.query<{ i: number | null }>(
      `select public.research_review_interval($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as i`,
      [
        p.item_type,
        p.operational,
        p.verification,
        p.interest,
        p.confidence,
        p.kandidat,
        p.koordinat,
        p.primaer,
        p.streak,
        p.endret,
      ],
    );
    return rows[0]!.i;
  }

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`insert into admin_users (email) values ('drift@example.com') on conflict do nothing`);
    await db.pg.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(DRIFT)]);
  });

  describe("intervallpolicyen", () => {
    it("gir kortest intervall til det som endrer seg fortest", async () => {
      // Stargate Narvik-tilfellet: under bygging, høy interesse.
      expect(await intervall({ operational: "under_construction", interest: "high" })).toBeLessThanOrEqual(30);
      // atNorth NOR01: planlagt, høy interesse.
      const planlagt = await intervall({ operational: "planned", interest: "high" });
      // Skygard OSL1: aktivt med høy interesse.
      const aktivHøy = await intervall({ operational: "active", interest: "high" });
      expect(planlagt!).toBeLessThan(aktivHøy!);
    });

    it("skiller aktive anlegg etter interesse", async () => {
      const høy = await intervall({ operational: "active", interest: "high" });
      const middels = await intervall({ operational: "active", interest: "medium" });
      const lav = await intervall({ operational: "active", interest: "low" });
      expect(høy!).toBeLessThan(middels!);
      expect(middels!).toBeLessThan(lav!);
      expect(høy).toBe(90);
      expect(middels).toBe(180);
    });

    it("gir ingen review til avviste funn", async () => {
      // Ullevaal Stadion-tilfellet: undersøkt, avvist som datasenter.
      expect(await intervall({ verification: "rejected" })).toBeNull();
      expect(await intervall({ verification: "archived" })).toBeNull();
    });

    it("gir ingen review til stabile historiske funn, men beholder de usikre", async () => {
      // En fredet bunker med sterke kilder.
      expect(
        await intervall({ operational: "historical", interest: "low", confidence: "high" }),
      ).toBeNull();
      // Et historisk funn med svak sikkerhet skal fortsatt sees på.
      expect(
        await intervall({ operational: "historical", interest: "low", confidence: "low" }),
      ).not.toBeNull();
    });

    it("forkorter når sikkerheten er svak", async () => {
      const sikker = await intervall({ confidence: "high" });
      const middels = await intervall({ confidence: "medium" });
      const svak = await intervall({ confidence: "low" });
      expect(svak!).toBeLessThan(middels!);
      expect(middels!).toBeLessThan(sikker!);
    });

    it("holder public candidates under et lavere tak", async () => {
      const uten = await intervall({ operational: "active", interest: "low", kandidat: false });
      const med = await intervall({ operational: "active", interest: "low", kandidat: true });
      expect(uten).toBe(365);
      expect(med!).toBeLessThanOrEqual(120);
    });

    it("forkorter når primærkilde eller koordinat mangler", async () => {
      const komplett = await intervall({});
      expect((await intervall({ primaer: false }))!).toBeLessThan(komplett!);
      expect((await intervall({ koordinat: false }))!).toBeLessThan(komplett!);
    });

    it("krever ikke koordinat av notater", async () => {
      const notat = await intervall({ item_type: "note", koordinat: false });
      const funn = await intervall({ item_type: "finding", koordinat: false });
      expect(notat!).toBeGreaterThan(funn!);
    });

    it("forlenger etter flere reviews uten endring, og forkorter når noe har endret seg", async () => {
      const grunn = await intervall({ streak: 0 });
      expect((await intervall({ streak: 3 }))!).toBeGreaterThan(grunn!);
      // Oredalen-tilfellet: statusen har endret seg før, så den sjekkes oftere.
      expect((await intervall({ endret: true }))!).toBeLessThan(grunn!);
    });

    it("holder seg innenfor gulv og tak", async () => {
      const kortest = await intervall({
        operational: "under_construction",
        confidence: "low",
        kandidat: true,
        primaer: false,
        koordinat: false,
        endret: true,
      });
      expect(kortest!).toBeGreaterThanOrEqual(14);
      const lengst = await intervall({ operational: "active", interest: "low", streak: 4 });
      expect(lengst!).toBeLessThanOrEqual(730);
    });
  });

  describe("tilstand og grunner", () => {
    it("er fersk rett etter at innholdet er verifisert", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Fersk aktiv fabrikk",
        operational_status: "active",
        interest_level: "medium",
        confidence: "high",
        last_verified_at: "now()",
      });
      await db.pg.query(`update admin_research_items set last_verified_at = now() where id = $1`, [id]);
      const s = await status(id);
      expect(s.review_state).toBe("current");
      expect(s.next_review_at).not.toBeNull();
    });

    it("er forfalt og deretter forsinket når datoen passeres", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Planlagt anlegg som har ventet",
        operational_status: "planned",
        interest_level: "high",
        confidence: "medium",
      });
      // Datoen settes direkte: triggeren hopper over update-er som setter den selv.
      await db.pg.query(`update admin_research_items set next_review_at = current_date - 3 where id = $1`, [id]);
      expect((await status(id)).review_state).toBe("due");
      await db.pg.query(`update admin_research_items set next_review_at = current_date - 40 where id = $1`, [id]);
      expect((await status(id)).review_state).toBe("overdue");
    });

    it("er «snart» innenfor fjorten dager og fersk utenfor", async () => {
      const id = await lagFunn({ category: "Kilder", title: "Kilde snart", item_type: "note" });
      await db.pg.query(`update admin_research_items set next_review_at = current_date + 7 where id = $1`, [id]);
      expect((await status(id)).review_state).toBe("due_soon");
      await db.pg.query(`update admin_research_items set next_review_at = current_date + 60 where id = $1`, [id]);
      expect((await status(id)).review_state).toBe("current");
    });

    it("trenger ikke review når policyen gir null eller moden er «none»", async () => {
      const avvist = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Avvist hypotese",
        verification_status: "rejected",
      });
      expect((await status(avvist)).review_state).toBe("no_review_needed");
      expect((await status(avvist)).next_review_at).toBeNull();

      const slått_av = await lagFunn({
        category: "Forsvar / militært",
        title: "Fredet anlegg",
        operational_status: "historical",
        review_mode: "none",
        review_mode_note: "Kulturminne, endrer seg ikke",
      });
      expect((await status(slått_av)).review_state).toBe("no_review_needed");
    });

    it("regner opp grunnene som gjelder", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Svakt planlagt prosjekt uten kilder",
        operational_status: "planned",
        interest_level: "high",
        confidence: "low",
      });
      const s = await status(id);
      expect(s.review_reasons).toEqual(
        expect.arrayContaining([
          "planned_project",
          "high_interest",
          "low_confidence",
          "missing_primary_source",
          "missing_coordinates",
          "never_reviewed",
        ]),
      );
      // Planlagte prosjekter ligger i nest høyeste prioritetsklasse.
      expect(s.review_priority).toBe(2);
    });

    it("gir blokkerte funn egen tilstand", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Venter på et dokument vi ikke kan lese",
        review_mode: "blocked",
        review_mode_note: "PDF-en kan ikke tekstuttrekkes",
        next_review_at: "2026-01-01",
      });
      const s = await status(id);
      expect(s.review_state).toBe("blocked");
      expect(s.review_reasons).toContain("blocked_source");
    });

    it("krever begrunnelse for overstyring", async () => {
      await expect(
        lagFunn({ category: "Kilder", title: "Uten begrunnelse", review_mode: "none" }),
      ).rejects.toThrow();
    });
  });

  describe("triggeren", () => {
    it("flytter neste review når statusen endrer seg", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Prosjekt som går fra planlagt til bygging",
        operational_status: "planned",
        interest_level: "high",
        confidence: "high",
      });
      const før = await status(id);
      await db.pg.query(`update admin_research_items set operational_status = 'under_construction' where id = $1`, [id]);
      const etter = await status(id);
      expect(etter.review_interval_days!).toBeLessThan(før.review_interval_days!);
      expect(etter.next_review_at! < før.next_review_at!).toBe(true);
    });

    it("stopper review når funnet avvises, og starter den ikke igjen av seg selv", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Blir avvist",
        operational_status: "planned",
      });
      expect((await status(id)).next_review_at).not.toBeNull();
      await db.pg.query(`update admin_research_items set verification_status = 'rejected' where id = $1`, [id]);
      expect((await status(id)).next_review_at).toBeNull();
    });

    it("rører ikke datoen når moden er manuell", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Manuelt planlagt",
        operational_status: "planned",
        review_mode: "manual",
        review_mode_note: "Sjekkes etter at planen er vedtatt",
        next_review_at: "2027-03-01",
      });
      await db.pg.query(`update admin_research_items set interest_level = 'high' where id = $1`, [id]);
      const s = await status(id);
      expect(s.next_review_at).toBe("2027-03-01");
      expect(s.review_mode).toBe("manual");
    });

    it("beholder en dato kallet setter selv", async () => {
      const id = await lagFunn({ category: "Kilder", title: "Egen dato", item_type: "note" });
      await db.pg.query(`update admin_research_items set next_review_at = '2027-06-01' where id = $1`, [id]);
      expect((await status(id)).next_review_at).toBe("2027-06-01");
    });
  });

  /**
   * Punktet som betyr mest i praksis: seeden kjører på nytt hver gang funn oppdateres, og skriver
   * innholdsfeltene uten å nevne reviewdata. Da skal reviewdata stå.
   */
  describe("innholdsoppdatering er ikke en review", () => {
    it("nullstiller ikke reviewdata når seeden oppdaterer innholdet", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Funn seeden eier",
        operational_status: "active",
        interest_level: "medium",
        confidence: "high",
      });
      await db.rpc("record_research_review_unchecked", {
        p_item_id: id,
        p_fields: { outcome: "unchanged", summary: "Kontrollert" },
        p_actor: "test",
      });
      const før = await status(id);
      expect(før.last_reviewed_at).not.toBeNull();

      // Presis samme form som scripts/seed-research.ts bruker.
      await db.pg.query(
        `update admin_research_items set
           description = $2, notes = $3, why_interesting = $4, updated_at = now()
         where id = $1`,
        [id, "Ny beskrivelse fra seeden", "Nye notater", "Ny begrunnelse"],
      );

      const etter = await status(id);
      expect(etter.last_reviewed_at).toBe(før.last_reviewed_at);
      expect(etter.last_verified_at).toBe(før.last_verified_at);
      expect(etter.review_unchanged_streak).toBe(før.review_unchanged_streak);
      expect(etter.review_count).toBe(1);
    });

    /**
     * Regresjon. Første versjon av triggeren regnet om datoen ved hver oppdatering der kallet
     * ikke satte den selv. Da vasket én seed-kjøring bort planen backfillen hadde satt, og en
     * kø på tolv aktuelle saker ble nesten to hundre «ferske».
     */
    it("beholder en planlagt dato gjennom en seed-oppdatering", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Planlagt dato som skal stå",
        operational_status: "planned",
        interest_level: "high",
        confidence: "medium",
      });
      await db.pg.query(`update admin_research_items set next_review_at = current_date where id = $1`, [id]);
      const planlagt = (await status(id)).next_review_at;

      await db.pg.query(
        `update admin_research_items set description = $2, notes = $3, address = $4, updated_at = now()
          where id = $1`,
        [id, "Ny tekst", "Nye notater", "Ny adresse 1"],
      );
      expect((await status(id)).next_review_at).toBe(planlagt);

      // Men en endring som påvirker policyen skal fortsatt flytte datoen.
      await db.pg.query(`update admin_research_items set operational_status = 'under_construction' where id = $1`, [id]);
      expect((await status(id)).next_review_at).not.toBe(planlagt);
    });

    it("beholder manuell overstyring gjennom en seed-oppdatering", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Manuelt satt, seedet etterpå",
        review_mode: "manual",
        review_mode_note: "Avtalt med kommunen",
        next_review_at: "2027-01-15",
      });
      await db.pg.query(`update admin_research_items set description = 'oppdatert' where id = $1`, [id]);
      const s = await status(id);
      expect(s.review_mode).toBe("manual");
      expect(s.next_review_at).toBe("2027-01-15");
    });
  });

  describe("å registrere en review", () => {
    it("lagrer historikk, teller opp og flytter datoen", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Kontrollert flere ganger",
        operational_status: "active",
        interest_level: "medium",
        confidence: "high",
      });
      const før = await status(id);
      await db.rpc("record_research_review", { p_item_id: id, p_fields: { outcome: "unchanged" } });
      await db.rpc("record_research_review", { p_item_id: id, p_fields: { outcome: "unchanged" } });
      const s = await status(id);
      expect(s.review_count).toBe(2);
      expect(s.review_unchanged_streak).toBe(2);
      // Streaken forlenger intervallet, målt mot dette funnets eget utgangspunkt: funnet mangler
      // kilder og koordinat, så basisintervallet er lavere enn policyens 180 dager.
      expect(s.review_interval_days!).toBeGreaterThan(før.review_interval_days!);

      const historikk = await db.rpc<{ outcome: string; reviewed_by: string | null; changed: boolean }>(
        "research_reviews",
        { p_item_id: id },
      );
      expect(historikk).toHaveLength(2);
      expect(historikk[0]!.outcome).toBe("unchanged");
      expect(historikk[0]!.changed).toBe(false);
      expect(historikk[0]!.reviewed_by).toBe("drift@example.com");
    });

    it("nullstiller streaken og husker endringen når statusen flytter seg", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Planlagt som ble bygget",
        operational_status: "planned",
        interest_level: "high",
        confidence: "medium",
      });
      await db.rpc("record_research_review", { p_item_id: id, p_fields: { outcome: "unchanged" } });
      await db.rpc("record_research_review", {
        p_item_id: id,
        p_fields: { outcome: "status_changed", new_status: "under_construction", summary: "Byggestart bekreftet" },
      });

      const s = await status(id);
      expect(s.review_unchanged_streak).toBe(0);
      expect(s.review_reasons).toContain("previously_changed");
      expect(s.review_reasons).toContain("under_construction");

      const [siste] = await db.rpc<{ previous_status: string; new_status: string; changed: boolean }>(
        "research_reviews",
        { p_item_id: id },
      );
      expect(siste!.previous_status).toBe("planned");
      expect(siste!.new_status).toBe("under_construction");
      expect(siste!.changed).toBe(true);
    });

    it("verifiserer ikke innholdet når reviewen endte uavklart", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Uavklart lead",
        operational_status: "unknown",
        interest_level: "high",
        confidence: "low",
      });
      await db.rpc("record_research_review", {
        p_item_id: id,
        p_fields: { outcome: "unresolved", summary: "Fant ikke ut av det" },
      });
      const s = await status(id);
      expect(s.last_reviewed_at).not.toBeNull();
      expect(s.last_verified_at).toBeNull();
      // Neste review er forfalt, og da er tilstanden oppfølging og ikke bare forfalt.
      await db.pg.query(`update admin_research_items set next_review_at = current_date - 1 where id = $1`, [id]);
      const etter = await status(id);
      expect(etter.review_state).toBe("needs_followup");
      expect(etter.review_reasons).toContain("unresolved_lead");
    });

    it("tar avviste funn ut av køen, og gjenåpning setter manuell dato", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Avvist og gjenåpnet",
        operational_status: "planned",
      });
      await db.rpc("record_research_review", {
        p_item_id: id,
        p_fields: { outcome: "rejected", summary: "Hypotesen holdt ikke" },
      });
      expect((await status(id)).review_state).toBe("no_review_needed");

      await db.rpc("record_research_review", {
        p_item_id: id,
        p_fields: { outcome: "reopened", summary: "Ny kilde dukket opp", review_mode_note: "Ny kilde" },
      });
      const s = await status(id);
      expect(s.review_mode).toBe("manual");
      expect(s.next_review_at).not.toBeNull();
      expect(s.review_state).not.toBe("no_review_needed");
    });

    it("krever begrunnelse for utsettelse", async () => {
      const id = await lagFunn({ category: "Kilder", title: "Utsettelse uten grunn", item_type: "note" });
      await expect(
        db.rpc("record_research_review", { p_item_id: id, p_fields: { outcome: "snoozed" } }),
      ).rejects.toThrow();
    });

    it("kan knytte reviewen til en research-run", async () => {
      const [runId] = await db.pg
        .query<{ id: string }>(`insert into admin_research_runs (label) values ('Testrunde') returning id`)
        .then((r) => r.rows.map((x) => x.id));
      const id = await lagFunn({ category: "Kilder", title: "Fra en runde", item_type: "note" });
      await db.rpc("record_research_review_unchecked", {
        p_item_id: id,
        p_fields: { outcome: "unchanged", research_run_id: runId },
        p_actor: "seed",
      });
      const [siste] = await db.rpc<{ run_label: string; reviewed_by: string }>("research_reviews", { p_item_id: id });
      expect(siste!.run_label).toBe("Testrunde");
      expect(siste!.reviewed_by).toBe("seed");
    });
  });

  describe("planoverstyring", () => {
    it("setter og fjerner manuell dato", async () => {
      const id = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Plan som overstyres",
        operational_status: "active",
        interest_level: "medium",
      });
      await db.rpc("set_research_review_plan", {
        p_item_id: id,
        p_fields: { review_mode: "manual", next_review_at: "2027-02-01", review_mode_note: "Avtalt" },
      });
      expect((await status(id)).next_review_at).toBe("2027-02-01");

      // Tilbake til policy: datoen skal regnes ut igjen, ikke stå fast.
      await db.rpc("set_research_review_plan", { p_item_id: id, p_fields: { review_mode: "policy" } });
      const s = await status(id);
      expect(s.review_mode).toBe("policy");
      expect(s.next_review_at).not.toBe("2027-02-01");
      expect(s.next_review_at).not.toBeNull();
    });

    it("krever dato for manuell modus og begrunnelse for alt annet enn policy", async () => {
      const id = await lagFunn({ category: "Kilder", title: "Ugyldige planer", item_type: "note" });
      await expect(
        db.rpc("set_research_review_plan", {
          p_item_id: id,
          p_fields: { review_mode: "manual", review_mode_note: "Uten dato" },
        }),
      ).rejects.toThrow();
      await expect(
        db.rpc("set_research_review_plan", {
          p_item_id: id,
          p_fields: { review_mode: "none" },
        }),
      ).rejects.toThrow();
    });
  });

  describe("køen", () => {
    beforeAll(async () => {
      // Et lite, realistisk utvalg: ett av hver klasse som skal sortere ulikt.
      const bygging = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Kø: under bygging",
        operational_status: "under_construction",
        interest_level: "high",
        confidence: "medium",
        municipality: "Narvik",
      });
      const planlagt = await lagFunn({
        category: "Datasenter / industri / tekniske anlegg",
        title: "Kø: planlagt",
        operational_status: "planned",
        interest_level: "high",
        confidence: "medium",
        municipality: "Tysvær",
      });
      const stabilt = await lagFunn({
        category: "Forsvar / militært",
        title: "Kø: stabil base",
        operational_status: "active",
        interest_level: "high",
        confidence: "high",
        municipality: "Bærum",
      });
      for (const id of [bygging, planlagt, stabilt]) {
        await db.pg.query(`update admin_research_items set next_review_at = current_date - 2 where id = $1`, [id]);
      }
    });

    it("setter det som haster øverst", async () => {
      const kø = await db.rpc<{ title: string; review_priority: number; total_count: string }>(
        "research_review_queue",
        {},
      );
      expect(kø.length).toBeGreaterThan(0);
      const titler = kø.map((r) => r.title);
      expect(titler.indexOf("Kø: under bygging")).toBeLessThan(titler.indexOf("Kø: planlagt"));
      expect(titler.indexOf("Kø: planlagt")).toBeLessThan(titler.indexOf("Kø: stabil base"));
      // Totalen følger med hver rad, så UI-et slipper et ekstra kall.
      expect(Number(kø[0]!.total_count)).toBe(kø.length);
    });

    it("filtrerer på grunn, kommune og tilstand", async () => {
      const planlagte = await db.rpc<{ title: string }>("research_review_queue", {
        p_reasons: ["planned_project"],
      });
      expect(planlagte.every((r) => r.title !== "Kø: stabil base")).toBe(true);

      const narvik = await db.rpc<{ title: string }>("research_review_queue", { p_municipality: "Narvik" });
      expect(narvik.map((r) => r.title)).toEqual(["Kø: under bygging"]);

      const ferske = await db.rpc<{ title: string }>("research_review_queue", { p_states: ["current"] });
      expect(ferske.every((r) => !r.title.startsWith("Kø:"))).toBe(true);
    });

    it("paginerer", async () => {
      const side1 = await db.rpc<{ id: string; total_count: string }>("research_review_queue", { p_limit: 1 });
      const side2 = await db.rpc<{ id: string }>("research_review_queue", { p_limit: 1, p_offset: 1 });
      expect(side1).toHaveLength(1);
      expect(side2).toHaveLength(1);
      expect(side1[0]!.id).not.toBe(side2[0]!.id);
      expect(Number(side1[0]!.total_count)).toBeGreaterThan(1);
    });

    it("teller opp driftssignalene", async () => {
      const [m] = await db.rpc<{
        total: number;
        due: number;
        overdue: number;
        needs_followup: number;
        planned_or_building_due: number;
        no_review_needed: number;
      }>("research_review_metrics", {});
      expect(m!.total).toBeGreaterThan(0);
      expect(m!.overdue + m!.due + m!.needs_followup).toBeGreaterThan(0);
      expect(m!.planned_or_building_due).toBeGreaterThan(0);
      expect(m!.no_review_needed).toBeGreaterThan(0);
    });
  });

  /**
   * Sikkerheten. Reviewdata er like interne som resten av research: de sier hva vi ikke har
   * kontrollert, og det er ikke noe utenforstående skal få vite.
   */
  describe("tilgang", () => {
    it("gir anon ingenting", async () => {
      expect(await som("anon", null, "select * from admin_research_reviews")).toBe("NEKTET");
      expect(await som("anon", null, "select * from admin_research_review_status")).toBe("NEKTET");
      expect(await som("anon", null, "select * from public.research_review_queue()")).toBe("NEKTET");
      expect(await som("anon", null, "select * from public.research_review_metrics()")).toBe("NEKTET");
      expect(
        await som("anon", null, "select public.record_research_review('00000000-0000-0000-0000-000000000000', '{}')"),
      ).toBe("NEKTET");
    });

    it("gir innlogget ikke-admin ingen rader", async () => {
      const rader = await som<{ id: string }>(
        "authenticated",
        "utenfor@example.com",
        "select * from admin_research_reviews",
      );
      expect(rader === "NEKTET" || rader.length === 0).toBe(true);

      const kø = await som<{ id: string }>(
        "authenticated",
        "utenfor@example.com",
        "select * from public.research_review_queue()",
      );
      expect(kø === "NEKTET" || kø.length === 0).toBe(true);
    });

    it("nekter ikke-admin å skrive en review", async () => {
      const id = await lagFunn({ category: "Kilder", title: "Skrivetest", item_type: "note" });
      const svar = await som(
        "authenticated",
        "utenfor@example.com",
        `select public.record_research_review('${id}', '{"outcome":"unchanged"}'::jsonb)`,
      );
      expect(svar).toBe("NEKTET");
    });

    it("holder kjernefunksjonen unna alle roller", async () => {
      const id = await lagFunn({ category: "Kilder", title: "Kjernetest", item_type: "note" });
      for (const [rolle, email] of [
        ["anon", null],
        ["authenticated", "drift@example.com"],
      ] as const) {
        const svar = await som(
          rolle,
          email,
          `select public.record_research_review_unchecked('${id}', '{"outcome":"unchanged"}'::jsonb, 'x')`,
        );
        expect(svar).toBe("NEKTET");
      }
    });
  });
});
