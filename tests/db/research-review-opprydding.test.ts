import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { BaselineFeil, kontrollerRegler, oppsummer, ryddFalskeReviews, SEED_UENDRET_TEKST } from "@/scripts/research/review-opprydding";
import type { SeedKlient } from "@/scripts/research/seed";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/**
 * Oppryddingen etter de falske seed-reviewene (runde 16 og 17).
 *
 * Det som testes er at skriptet fjerner akkurat de falske radene, setter reviewfeltene tilbake
 * fra historikken som står igjen, og stopper når basen ikke ser ut som forventet.
 */
describe("opprydding av falske seed-reviews", { timeout: 120_000 }, () => {
  let db: Db;
  let klient: SeedKlient;
  const R16 = "Runde 16";
  const R17 = "Runde 17";
  let runde: Record<string, string>;

  async function lagFunn(tittel: string, kildedato: string | null = "2026-09-25"): Promise<string> {
    const { rows } = await db.pg.query<{ id: string }>(
      `insert into admin_research_items (item_type, category, subcategory, title, description, verification_status, operational_status, sensitivity, confidence, interest_level, created_by)
       values ('finding', 'Test', 'Testfunn', $1, 'x', 'partially_verified', 'active', 'internal_only', 'medium', 'medium', 'seed') returning id`,
      [tittel],
    );
    const id = rows[0]!.id;
    if (kildedato) await db.pg.query(`insert into admin_research_sources (research_item_id, source_name, source_type, source_date) values ($1, 'Kilde', 'web', $2::date)`, [id, kildedato]);
    // Ankeret, slik review:backfill setter det.
    await db.pg.query(
      `update admin_research_items i set last_verified_at = coalesce((select max(coalesce(s.source_date::timestamptz, s.accessed_at)) from admin_research_sources s where s.research_item_id = i.id), i.first_seen_at) where i.id = $1`,
      [id],
    );
    return id;
  }
  /** En review gjennom databasens egen funksjon, på et bestemt tidspunkt. */
  async function review(id: string, naar: string, felt: Record<string, unknown>, aktør: string) {
    const { rows } = await db.pg.query<{ r: string }>(`select public.record_research_review_unchecked($1, $2::jsonb, $3) as r`, [id, JSON.stringify(felt), aktør]);
    await db.pg.query(`update admin_research_reviews set reviewed_at = $2 where id = $1`, [rows[0]!.r, naar]);
    // Funksjonen bruker now(); flytt feltene på funnet til samme tidspunkt, som i virkeligheten.
    await db.pg.query(`update admin_research_items set last_reviewed_at = $2, last_verified_at = $2 where id = $1`, [id, naar]);
  }
  const ekte = (id: string, naar: string, outcome = "updated") => review(id, naar, { outcome, summary: "Kontrollert av en person" }, "drift@example.com");
  const falsk = (id: string, naar: string, r: string) => review(id, naar, { outcome: "unchanged", research_run_id: runde[r], sources_checked: 0, summary: SEED_UENDRET_TEKST }, "seed");
  async function tilstand(id: string) {
    const { rows } = await db.pg.query<{ lr: string | null; lv: string | null; streak: number; nr: string | null; reviews: number; state: string; reasons: string[] }>(
      `select i.last_reviewed_at as lr, i.last_verified_at as lv, i.review_unchanged_streak as streak, i.next_review_at as nr,
              (select count(*)::int from admin_research_reviews r where r.research_item_id = i.id) as reviews, st.review_state as state, st.review_reasons as reasons
       from admin_research_items i join admin_research_review_status st on st.id = i.id where i.id = $1`,
      [id],
    );
    return rows[0]!;
  }
  const dag = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : null);
  const antallReviews = async () => (await db.pg.query<{ n: number }>(`select count(*)::int as n from admin_research_reviews`)).rows[0]!.n;

  beforeAll(async () => {
    db = await createPgliteDb();
    klient = { query: (sql, params) => db.pg.query(sql, params as unknown[]) as never };
  });
  beforeEach(async () => {
    await db.pg.exec("delete from admin_research_reviews; delete from admin_research_sources; delete from admin_research_items; delete from admin_research_runs;");
    runde = {};
    for (const label of [R16, R17]) {
      runde[label] = (await db.pg.query<{ id: string }>(`insert into admin_research_runs (label, started_at) values ($1, now()) returning id`, [label])).rows[0]!.id;
    }
  });

  /** Tre funn: ett uten ekte review, ett med eldre ekte review, ett med ekte review i runde 17. */
  async function oppsett() {
    const aldri = await lagFunn("Pukkverk uten review", "2026-09-25");
    // Ankeret slik det sto før noen review: det er dette oppryddingen skal tilbake til.
    const anker = (await tilstand(aldri)).lv;
    const eldre = await lagFunn("Datasenter med eldre review");
    const r17 = await lagFunn("Datasenter kontrollert i runde 17");
    const urørt = await lagFunn("Funn utenfor oppryddingen");
    await ekte(eldre, "2026-09-30T10:00:00Z", "updated");
    await ekte(eldre, "2026-10-01T10:00:00Z", "unchanged");
    await ekte(urørt, "2026-10-01T12:00:00Z", "unchanged");
    for (const id of [aldri, eldre, r17]) await falsk(id, "2026-10-02T10:35:00Z", R16);
    for (const id of [aldri, eldre]) await falsk(id, "2026-10-06T07:21:00Z", R17);
    await review(r17, "2026-10-06T07:22:00Z", { outcome: "updated", research_run_id: runde[R17], summary: "Oppdatert fra seeden: notes." }, "seed");
    return { aldri, eldre, r17, urørt, anker };
  }
  const FORVENTET = { perRunde: { [R16]: 3, [R17]: 2 }, funn: 3 };

  it("tørrkjøring viser endringene og skriver ingenting", async () => {
    const f = await oppsett();
    const før = { a: await tilstand(f.aldri), e: await tilstand(f.eldre), n: await antallReviews() };
    const r = await ryddFalskeReviews(klient, { forventet: FORVENTET });
    expect(r).toMatchObject({ status: "tørrkjøring", falskeRader: 5, perRunde: { [R16]: 3, [R17]: 2 }, tvilstilfeller: [], andreEndret: 0 });
    expect(oppsummer(r)).toMatchObject({ falskeRader: 5, funn: 3, tilAldriKontrollert: 1, beholderEkteReview: 2 });
    expect(await antallReviews()).toBe(før.n);
    expect(await tilstand(f.aldri)).toEqual(før.a);
    expect(await tilstand(f.eldre)).toEqual(før.e);
  });

  it("apply: falske reviews slettes, ekte beholdes, og feltene settes fra historikken", async () => {
    const f = await oppsett();
    const urørtFør = await tilstand(f.urørt);
    expect(await antallReviews()).toBe(9);
    // Før: alle tre ser nykontrollerte ut.
    expect(dag((await tilstand(f.aldri)).lr)).toBe("2026-10-06");
    expect((await tilstand(f.aldri)).streak).toBe(2);

    const r = await ryddFalskeReviews(klient, { forventet: FORVENTET, apply: true });
    expect(r).toMatchObject({ status: "utført", falskeRader: 5, ekteReviewsFør: 4, ekteReviewsEtter: 4 });
    expect(await antallReviews()).toBe(4);

    // Ingen reviews igjen → aldri kontrollert, ankeret fra kilden, streak 0.
    const aldri = await tilstand(f.aldri);
    expect(aldri).toMatchObject({ lr: null, streak: 0, reviews: 0 });
    expect(f.anker).not.toBeNull();
    expect(aldri.lv).toBe(f.anker);
    expect(aldri.reasons).toContain("never_reviewed");
    expect(aldri.nr).not.toBeNull();

    // Eldre ekte review står: datoene er fra den, og streaken telles fra historikken (1 uendret etter 1 endret).
    const eldre = await tilstand(f.eldre);
    expect(new Date(eldre.lr!).toISOString()).toBe("2026-10-01T10:00:00.000Z");
    expect(new Date(eldre.lv!).toISOString()).toBe("2026-10-01T10:00:00.000Z");
    expect(eldre).toMatchObject({ streak: 1, reviews: 2 });

    // Runde 17-funnet beholder den ekte reviewen og mister bare den falske fra runde 16.
    const r17 = await tilstand(f.r17);
    expect(new Date(r17.lr!).toISOString()).toBe("2026-10-06T07:22:00.000Z");
    expect(r17).toMatchObject({ streak: 0, reviews: 1 });

    // Funnet utenfor er ikke rørt.
    expect(await tilstand(f.urørt)).toEqual(urørtFør);
    // Og reglene stemmer med historikken etterpå.
    expect(await kontrollerRegler(klient)).toMatchObject({ avvikReviewet: 0, avvikVerifisert: 0, avvikStreak: 0 });
  });

  it("neste review regnes av triggeren, ikke av skriptet", async () => {
    const f = await oppsett();
    const før = await tilstand(f.aldri);
    await ryddFalskeReviews(klient, { forventet: FORVENTET, apply: true });
    const etter = await tilstand(f.aldri);
    // Ankeret flyttet fra 6. oktober til kildedatoen og streaken falt: datoen kommer tidligere.
    expect(new Date(etter.nr!).getTime()).toBeLessThan(new Date(før.nr!).getTime());
    const { rows } = await db.pg.query<{ forventet: string }>(
      `select (i.last_verified_at::date + i.review_interval_days)::text as forventet from admin_research_items i where i.id = $1`,
      [f.aldri],
    );
    expect(dag(etter.nr)).toBe(rows[0]!.forventet);
  });

  it("dobbelt apply gjør ingenting andre gang", async () => {
    const f = await oppsett();
    await ryddFalskeReviews(klient, { forventet: FORVENTET, apply: true });
    const etterFørste = { a: await tilstand(f.aldri), e: await tilstand(f.eldre), r: await tilstand(f.r17), n: await antallReviews() };
    const andre = await ryddFalskeReviews(klient, { forventet: FORVENTET, apply: true });
    expect(andre).toMatchObject({ status: "ingenting", falskeRader: 0, funn: [] });
    expect({ a: await tilstand(f.aldri), e: await tilstand(f.eldre), r: await tilstand(f.r17), n: await antallReviews() }).toEqual(etterFørste);
    // Tørrkjøring etterpå sier det samme.
    expect((await ryddFalskeReviews(klient, { forventet: FORVENTET })).status).toBe("ingenting");
  });

  it("baseline som ikke stemmer, stopper uten å endre noe", async () => {
    const f = await oppsett();
    const før = { a: await tilstand(f.aldri), n: await antallReviews() };
    await expect(ryddFalskeReviews(klient, { forventet: { perRunde: { [R16]: 3, [R17]: 3 }, funn: 3 }, apply: true })).rejects.toThrow(BaselineFeil);
    await expect(ryddFalskeReviews(klient, { forventet: { perRunde: { [R16]: 3, [R17]: 2 }, funn: 4 }, apply: true })).rejects.toThrow(/forventet 4/);
    expect(await antallReviews()).toBe(før.n);
    expect(await tilstand(f.aldri)).toEqual(før.a);
    // Transaksjonen er lukket: neste kall virker.
    expect((await ryddFalskeReviews(klient, { forventet: FORVENTET })).status).toBe("tørrkjøring");
  });

  it("tvilstilfeller beholdes og rapporteres: seed-rad med kilder kontrollert, og rader fra andre runder", async () => {
    const f = await oppsett();
    await db.pg.query(`insert into admin_research_runs (label, started_at) values ('Runde 15', now())`);
    const r15 = (await db.pg.query<{ id: string }>(`select id from admin_research_runs where label = 'Runde 15'`)).rows[0]!.id;
    // Samme tekst og aktør, men en runde vi ikke rydder: skal stå.
    await review(f.urørt, "2026-09-30T09:00:00Z", { outcome: "unchanged", research_run_id: r15, summary: SEED_UENDRET_TEKST }, "seed");
    // I en runde vi rydder, men med kilder kontrollert: tvil.
    await review(f.urørt, "2026-10-02T10:36:00Z", { outcome: "unchanged", research_run_id: runde[R16], sources_checked: 2, summary: SEED_UENDRET_TEKST }, "seed");
    // En person som kontrollerte uten endring i runde 16: aldri falsk.
    await review(f.eldre, "2026-10-02T10:34:00Z", { outcome: "unchanged", research_run_id: runde[R16], summary: SEED_UENDRET_TEKST }, "drift@example.com");
    const n = await antallReviews();

    const r = await ryddFalskeReviews(klient, { forventet: FORVENTET, apply: true });
    expect(r.falskeRader).toBe(5);
    expect(r.tvilstilfeller).toEqual([expect.objectContaining({ title: "Funn utenfor oppryddingen", runde: R16, grunn: "kilder kontrollert" })]);
    expect(await antallReviews()).toBe(n - 5);
    expect((await tilstand(f.urørt)).reviews).toBe(3);
  });

  it("regelkontrollen oppdager felt som ikke følger historikken", async () => {
    const f = await oppsett();
    expect(await kontrollerRegler(klient)).toMatchObject({ funnMedReview: 4, avvikReviewet: 0, avvikVerifisert: 0, avvikStreak: 0 });
    await db.pg.query(`update admin_research_items set last_verified_at = '2026-01-01T00:00:00Z', review_unchanged_streak = 9 where id = $1`, [f.eldre]);
    expect(await kontrollerRegler(klient)).toMatchObject({ avvikVerifisert: 1, avvikStreak: 1 });
  });
});
