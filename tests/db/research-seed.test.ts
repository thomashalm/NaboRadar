import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import type { Funn } from "@/scripts/research/funn";
import { kjorSeed, merketForRunde, SeedReviewFeil, type SeedKlient } from "@/scripts/research/seed";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/**
 * Seed er ikke review.
 *
 * Regresjon: til og med runde 17 logget `research:seed --review` en review for hvert funn som
 * fantes i basen. To runder ga til sammen 547 funn en «gjennomgått uten endring» ingen hadde
 * gjort. Nå registreres en review bare for funn som er merket med runden i funn.ts.
 */
describe("research:seed og review", { timeout: 120_000 }, () => {
  let db: Db;
  let klient: SeedKlient;
  const RUNDE = "Testrunde A";

  const funn = (n: number, over: Partial<Funn> = {}): Funn => ({
    category: "Test",
    subcategory: "Testfunn",
    item_type: "finding",
    title: `Funn ${n}`,
    description: `Beskrivelse ${n}`,
    address: `Testveien ${n}`,
    municipality: "Oslo",
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting: "Test",
    notes: "Notat",
    kilder: [{ source_name: `Kilde ${n}`, source_type: "web", excerpt_or_summary: "x" } as Funn["kilder"][number]],
    ...over,
  });

  async function runde(label: string) {
    await db.pg.query(`insert into admin_research_runs (label, started_at) values ($1, now()) on conflict do nothing`, [label]);
  }
  async function tilstand(tittel: string) {
    const { rows } = await db.pg.query<{ last_reviewed_at: string | null; last_verified_at: string | null; streak: number; next_review_at: string | null; description: string; reviews: number }>(
      `select i.last_reviewed_at, i.last_verified_at, i.review_unchanged_streak as streak, i.next_review_at, i.description,
              (select count(*)::int from admin_research_reviews r where r.research_item_id = i.id) as reviews
       from admin_research_items i where i.title = $1`,
      [tittel],
    );
    return rows[0]!;
  }
  const antallReviewet = async () =>
    (await db.pg.query<{ n: number }>(`select count(*)::int as n from admin_research_items where last_reviewed_at is not null`)).rows[0]!.n;
  const antallReviews = async () => (await db.pg.query<{ n: number }>(`select count(*)::int as n from admin_research_reviews`)).rows[0]!.n;
  async function tøm() {
    await db.pg.exec("delete from admin_research_reviews; delete from admin_research_sources; delete from admin_research_items; delete from admin_research_runs;");
  }

  beforeAll(async () => {
    db = await createPgliteDb();
    klient = { query: (sql, params) => db.pg.query(sql, params as unknown[]) as never };
  });

  it("A: seed med 100 funn og tre merket — bare de tre får reviewdato", async () => {
    await tøm();
    await runde(RUNDE);
    const utenMerke = Array.from({ length: 100 }, (_, i) => funn(i + 1));
    await kjorSeed(klient, utenMerke);

    const liste = utenMerke.map((f, i) => ([7, 42, 99].includes(i + 1) ? { ...f, gjennomgatt_i: RUNDE } : f));
    const r = await kjorSeed(klient, liste, { runde: RUNDE });

    expect(r).toMatchObject({ nye: 0, endret: 0, uendret: 100, reviewLogget: 3, reviewFantes: 0 });
    expect(r.linjer.filter((l) => l.review === "logget").map((l) => l.tittel)).toEqual(["Funn 7", "Funn 42", "Funn 99"]);
    expect(await antallReviewet()).toBe(3);
    expect(await antallReviews()).toBe(3);
    expect((await tilstand("Funn 7")).last_reviewed_at).not.toBeNull();
    expect(await tilstand("Funn 8")).toMatchObject({ last_reviewed_at: null, reviews: 0, streak: 0 });
    // Reviewene peker på runden og sier «seed», ikke en person.
    const { rows } = await db.pg.query<{ reviewed_by: string; outcome: string; label: string }>(
      `select r.reviewed_by, r.outcome, ru.label from admin_research_reviews r join admin_research_runs ru on ru.id = r.research_run_id`,
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((x) => x.reviewed_by === "seed" && x.outcome === "unchanged" && x.label === RUNDE)).toBe(true);
  });

  it("B: seed uten --review — ingen får reviewdato, selv om funn er merket", async () => {
    await tøm();
    await runde(RUNDE);
    const liste = Array.from({ length: 20 }, (_, i) => funn(i + 1, i < 5 ? { gjennomgatt_i: RUNDE } : {}));
    const første = await kjorSeed(klient, liste);
    expect(første).toMatchObject({ nye: 20, reviewLogget: 0 });
    const andre = await kjorSeed(klient, liste.map((f) => ({ ...f, description: `${f.description} endret` })));
    expect(andre).toMatchObject({ nye: 0, endret: 20, reviewLogget: 0 });
    expect(await antallReviewet()).toBe(0);
    expect(await antallReviews()).toBe(0);
  });

  it("C: --review uten merkede funn feiler før noe er skrevet", async () => {
    await tøm();
    await runde(RUNDE);
    await runde("En annen runde");
    const liste = Array.from({ length: 10 }, (_, i) => funn(i + 1));
    await kjorSeed(klient, liste);

    // Ingen merket i det hele tatt, og innholdet er endret: ingenting av det skal inn.
    const endret = liste.map((f) => ({ ...f, description: "Skal ikke skrives" }));
    await expect(kjorSeed(klient, endret, { runde: RUNDE })).rejects.toThrow(SeedReviewFeil);
    await expect(kjorSeed(klient, endret, { runde: RUNDE })).rejects.toThrow(/ingen funn er merket/);
    // Merket med en annen runde er heller ikke nok.
    await expect(kjorSeed(klient, endret.map((f) => ({ ...f, gjennomgatt_i: "En annen runde" })), { runde: RUNDE })).rejects.toThrow(SeedReviewFeil);
    // En runde som ikke er logget i basen, er en feil — ikke en review uten kontekst.
    await expect(kjorSeed(klient, endret.map((f) => ({ ...f, gjennomgatt_i: "Finnes ikke" })), { runde: "Finnes ikke" })).rejects.toThrow(/Fant ingen research-run/);

    expect(await antallReviewet()).toBe(0);
    expect(await antallReviews()).toBe(0);
    expect((await tilstand("Funn 1")).description).toBe("Beskrivelse 1");
    expect(merketForRunde(endret, RUNDE)).toEqual([]);
  });

  it("D: et funn med eldre review beholder den når det ikke er med i den nye runden", async () => {
    await tøm();
    await runde("Gammel runde");
    await runde(RUNDE);
    const liste = [funn(1, { gjennomgatt_i: "Gammel runde" }), funn(2, { gjennomgatt_i: "Gammel runde" }), funn(3)];
    await kjorSeed(klient, liste);
    await kjorSeed(klient, liste, { runde: "Gammel runde" });
    // Skyv den gamle reviewen bakover, så en ny ville synes.
    await db.pg.exec(`update admin_research_items set last_reviewed_at = '2026-01-10T10:00:00Z', last_verified_at = '2026-01-10T10:00:00Z' where last_reviewed_at is not null`);
    const før1 = await tilstand("Funn 1");
    const før2 = await tilstand("Funn 2");

    // Ny runde: bare funn 2 er kontrollert. Funn 1 står fortsatt merket med den gamle.
    const ny = [liste[0]!, { ...liste[1]!, gjennomgatt_i: RUNDE }, liste[2]!];
    const r = await kjorSeed(klient, ny, { runde: RUNDE });
    expect(r).toMatchObject({ reviewLogget: 1 });

    const etter1 = await tilstand("Funn 1");
    expect(etter1.last_reviewed_at).toBe(før1.last_reviewed_at);
    expect(etter1.last_verified_at).toBe(før1.last_verified_at);
    expect(etter1.streak).toBe(før1.streak);
    expect(etter1.next_review_at).toBe(før1.next_review_at);
    expect(etter1.reviews).toBe(1);
    const etter2 = await tilstand("Funn 2");
    expect(etter2.last_reviewed_at).not.toBe(før2.last_reviewed_at);
    expect(etter2.reviews).toBe(2);
    expect(await tilstand("Funn 3")).toMatchObject({ last_reviewed_at: null, reviews: 0 });
  });

  it("E: et merket funn som også får nytt innhold — både innhold og review oppdateres", async () => {
    await tøm();
    await runde(RUNDE);
    const liste = [funn(1), funn(2)];
    await kjorSeed(klient, liste);

    const oppdatert = [
      { ...liste[0]!, gjennomgatt_i: RUNDE, description: "Ny beskrivelse", notes: "Nytt notat", kilder: [...liste[0]!.kilder, { source_name: "Ny kilde", source_type: "register" } as Funn["kilder"][number]] },
      { ...liste[1]!, description: "Også endret, men ikke kontrollert" },
    ];
    const r = await kjorSeed(klient, oppdatert, { runde: RUNDE });
    expect(r).toMatchObject({ endret: 2, uendret: 0, reviewLogget: 1 });
    expect(r.linjer[0]).toMatchObject({ endringer: ["description", "notes"], nyeKilder: 1, review: "logget" });

    const en = await tilstand("Funn 1");
    expect(en.description).toBe("Ny beskrivelse");
    expect(en.last_reviewed_at).not.toBeNull();
    expect(en.streak).toBe(0);
    const { rows } = await db.pg.query<{ outcome: string; changed: boolean; summary: string; sources_checked: number }>(`select outcome, changed, summary, sources_checked from admin_research_reviews`);
    expect(rows).toEqual([{ outcome: "updated", changed: true, summary: "Gjennomgått i runden. Oppdatert fra seeden: description, notes, 1 ny kilde.", sources_checked: 1 }]);
    // Innholdet ble skrevet for det andre funnet også — uten at det ble en review av det.
    expect(await tilstand("Funn 2")).toMatchObject({ description: "Også endret, men ikke kontrollert", last_reviewed_at: null, reviews: 0 });
  });

  it("samme runde to ganger gir ikke to reviews", async () => {
    await tøm();
    await runde(RUNDE);
    const liste = [funn(1, { gjennomgatt_i: RUNDE }), funn(2)];
    await kjorSeed(klient, liste);
    expect(await kjorSeed(klient, liste, { runde: RUNDE })).toMatchObject({ reviewLogget: 1, reviewFantes: 0 });
    const etterFørste = await tilstand("Funn 1");
    expect(await kjorSeed(klient, liste, { runde: RUNDE })).toMatchObject({ reviewLogget: 0, reviewFantes: 1 });
    expect(await tilstand("Funn 1")).toEqual(etterFørste);
    expect(await antallReviews()).toBe(1);
  });

  it("et nytt funn som er merket, får review; et nytt funn uten merke får ingen", async () => {
    await tøm();
    await runde(RUNDE);
    const r = await kjorSeed(klient, [funn(1, { gjennomgatt_i: RUNDE }), funn(2)], { runde: RUNDE });
    expect(r).toMatchObject({ nye: 2, reviewLogget: 1 });
    expect((await tilstand("Funn 1")).last_reviewed_at).not.toBeNull();
    expect(await tilstand("Funn 2")).toMatchObject({ last_reviewed_at: null, reviews: 0 });
  });

  it("de kuraterte funnene: bare merkede funn kan bli reviewet, og merkene peker på navngitte runder", async () => {
    const { FUNN } = await import("@/scripts/research/funn");
    const merket = FUNN.filter((f) => f.gjennomgatt_i !== undefined);
    expect(merket.length).toBeLessThan(FUNN.length / 2);
    for (const f of merket) expect(f.gjennomgatt_i, f.title).toMatch(/\S{3,}/);
    // Runde 17 kontrollerte sju funn. Det er de sju, ikke hele fila.
    expect(merketForRunde(FUNN, "Datasenter runde 17 – Vestland og kraftkø 2026-10-06").map((f) => f.title).sort()).toEqual(
      ["ASP Dalekvam", "Bluefjords Gaupne", "Gaupne Datapark, Gaupnegrandane", "Kitebrook Børdalen", "Kitebrook Leirdøla, Gaupne", "Kitebrook Matre, Masfjorden", "Skipavika datasenter, Gulen"],
    );
  });
});
