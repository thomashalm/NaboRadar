/**
 * Opprydding etter falske reviews fra `research:seed --review` (runde 16 og 17).
 *
 * Bakgrunn og tall: docs/research/research-review-opprydding.md. Til og med runde 17 logget
 * seeden en review for hvert funn som fantes i basen. Denne modulen fjerner akkurat de radene
 * og setter reviewfeltene på funnene tilbake til det de gjenværende, ekte reviewene tilsier.
 *
 * HVA SOM REGNES SOM FALSKT — alle vilkårene må holde:
 *   aktør «seed», utfall `unchanged`, `changed = false`, ingen kilder kontrollert, seedens faste
 *   tekst, og knyttet til en av de navngitte rundene.
 * En rad fra seeden i samme runde som ikke passer alt dette, er et tvilstilfelle: den beholdes
 * og rapporteres.
 *
 * HVORDAN FELTENE SETTES TILBAKE. Reglene er de samme som systemet selv bruker:
 *   last_reviewed_at        = tidspunktet for nyeste gjenværende review, ellers tom.
 *   review_unchanged_streak = antall gjenværende reviews uten endring etter den siste med endring.
 *   last_verified_at        = tidspunktet for nyeste gjenværende review som verifiserte
 *                             (alle utfall unntatt `unresolved` og `snoozed`). Review-funksjonen
 *                             setter feltet til samme `now()` som reviewens tidspunkt. Uten en
 *                             slik review: ankeret fra `review:backfill` — nyeste kildedato,
 *                             ellers datoen funnet ble lagt inn.
 *   next_review_at          = ikke satt her. Triggeren regner den ut når ankrene endres.
 *   updated_at              = ikke rørt. Gammel verdi kan ikke gjenskapes og skal ikke diktes.
 *
 * Alt skjer i én transaksjon. Uten `apply` rulles den tilbake, så tørrkjøringen viser de
 * faktiske verdiene triggeren ville gitt.
 */
import type { SeedKlient } from "./seed";

export const SEED_UENDRET_TEKST = "Gjennomgått i runden uten at innholdet endret seg.";

export interface Forventet {
  /** Antall falske rader per rundeetikett. Rundene som ryddes, er nøklene her. */
  perRunde: Record<string, number>;
  /** Antall ulike funn radene fordeler seg på. */
  funn: number;
}

export interface Funnendring {
  id: string;
  title: string;
  subcategory: string | null;
  falske: number;
  ekte: number;
  før: Reviewfelt;
  etter: Reviewfelt;
}

export interface Reviewfelt {
  last_reviewed_at: string | null;
  last_verified_at: string | null;
  review_unchanged_streak: number;
  next_review_at: string | null;
  updated_at: string | null;
}

export interface Oppryddingsrapport {
  status: "ingenting" | "tørrkjøring" | "utført";
  falskeRader: number;
  perRunde: Record<string, number>;
  tvilstilfeller: { id: string; title: string; runde: string; grunn: string }[];
  funn: Funnendring[];
  ekteReviewsFør: number;
  ekteReviewsEtter: number;
  /** Funn utenfor oppryddingen som likevel endret seg. Skal være tom. */
  andreEndret: number;
}

export class BaselineFeil extends Error {}

const iso = (v: unknown): string | null => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v));

const FELT = `i.id, i.title, i.subcategory, i.last_reviewed_at, i.last_verified_at, i.review_unchanged_streak, i.next_review_at, i.updated_at`;

type FeltRad = { id: string; title: string; subcategory: string | null; last_reviewed_at: unknown; last_verified_at: unknown; review_unchanged_streak: number; next_review_at: unknown; updated_at: unknown };
const felt = (r: FeltRad): Reviewfelt => ({
  last_reviewed_at: iso(r.last_reviewed_at),
  last_verified_at: iso(r.last_verified_at),
  review_unchanged_streak: Number(r.review_unchanged_streak),
  next_review_at: iso(r.next_review_at),
  updated_at: iso(r.updated_at),
});

/** Strengt: bare rader som passer alle vilkårene. */
const FALSK = `rv.reviewed_by = 'seed' and rv.outcome = 'unchanged' and rv.changed = false
  and rv.sources_checked = 0 and rv.summary = $2 and ru.label = any($1)`;

/**
 * Kontrollerer reglene mot dagens data, før noe er endret: stemmer feltene på funnene med det
 * reviewhistorikken tilsier? Hvis ikke, er reglene ikke gode nok til å skrive med.
 */
export async function kontrollerRegler(client: SeedKlient): Promise<{ funnMedReview: number; avvikReviewet: number; avvikVerifisert: number; avvikStreak: number }> {
  const { rows } = await client.query<{ n: number; lr: number; lv: number; st: number }>(
    `with h as (
       select i.id, i.last_reviewed_at, i.last_verified_at, i.review_unchanged_streak,
              (select max(r.reviewed_at) from admin_research_reviews r where r.research_item_id = i.id) as lr,
              (select max(r.reviewed_at) from admin_research_reviews r where r.research_item_id = i.id and r.outcome not in ('unresolved', 'snoozed')) as lv,
              (select count(*) from admin_research_reviews r where r.research_item_id = i.id and not r.changed
                 and r.reviewed_at > coalesce((select max(c.reviewed_at) from admin_research_reviews c where c.research_item_id = i.id and c.changed), '-infinity'::timestamptz)) as st
       from admin_research_items i
       where exists (select 1 from admin_research_reviews r where r.research_item_id = i.id))
     select count(*)::int as n,
            count(*) filter (where last_reviewed_at is distinct from lr)::int as lr,
            count(*) filter (where lv is not null and last_verified_at is distinct from lv)::int as lv,
            count(*) filter (where review_unchanged_streak <> st)::int as st
     from h`,
  );
  const r = rows[0]!;
  return { funnMedReview: r.n, avvikReviewet: r.lr, avvikVerifisert: r.lv, avvikStreak: r.st };
}

export async function ryddFalskeReviews(client: SeedKlient, valg: { forventet: Forventet; apply?: boolean }): Promise<Oppryddingsrapport> {
  const runder = Object.keys(valg.forventet.perRunde);
  await client.query("begin");
  try {
    const falske = (
      await client.query<{ id: string; research_item_id: string; label: string }>(
        `select rv.id, rv.research_item_id, ru.label
         from admin_research_reviews rv join admin_research_runs ru on ru.id = rv.research_run_id
         where ${FALSK}`,
        [runder, SEED_UENDRET_TEKST],
      )
    ).rows;

    // Seed-rader uten endring i de samme rundene som ikke passer alle vilkårene: beholdes.
    const tvil = (
      await client.query<{ id: string; title: string; label: string; changed: boolean; sources_checked: number; summary: string | null }>(
        `select rv.id, i.title, ru.label, rv.changed, rv.sources_checked, rv.summary
         from admin_research_reviews rv
         join admin_research_runs ru on ru.id = rv.research_run_id
         join admin_research_items i on i.id = rv.research_item_id
         where rv.reviewed_by = 'seed' and rv.outcome = 'unchanged' and ru.label = any($1) and not (${FALSK})`,
        [runder, SEED_UENDRET_TEKST],
      )
    ).rows.map((t) => ({
      id: t.id,
      title: t.title,
      runde: t.label,
      grunn: t.changed ? "markert som endret" : Number(t.sources_checked) > 0 ? "kilder kontrollert" : "annen tekst enn seedens",
    }));

    const perRunde: Record<string, number> = Object.fromEntries(runder.map((r) => [r, 0]));
    for (const f of falske) perRunde[f.label] = (perRunde[f.label] ?? 0) + 1;
    const funnIder = [...new Set(falske.map((f) => f.research_item_id))];
    const tom: Oppryddingsrapport = { status: "ingenting", falskeRader: 0, perRunde, tvilstilfeller: tvil, funn: [], ekteReviewsFør: 0, ekteReviewsEtter: 0, andreEndret: 0 };

    // Idempotent: ingenting å rydde er ikke et avvik, det er ferdig.
    if (falske.length === 0) {
      await client.query("rollback");
      return tom;
    }

    // Baseline. Stemmer ikke tallene med det som er undersøkt, stopper vi uten å justere.
    const avvik: string[] = [];
    for (const r of runder) if (perRunde[r] !== valg.forventet.perRunde[r]) avvik.push(`«${r}»: ${perRunde[r]} falske rader, forventet ${valg.forventet.perRunde[r]}`);
    if (funnIder.length !== valg.forventet.funn) avvik.push(`${funnIder.length} funn, forventet ${valg.forventet.funn}`);
    if (avvik.length > 0) throw new BaselineFeil(`Dataene stemmer ikke med det som ble undersøkt. Ingenting er endret. ${avvik.join("; ")}.`);

    const falskeIder = falske.map((f) => f.id);
    const hentFelt = async () =>
      new Map((await client.query<FeltRad>(`select ${FELT} from admin_research_items i where i.id = any($1)`, [funnIder])).rows.map((r) => [r.id, r]));
    const avtrykkAndre = async () =>
      (
        await client.query<{ a: string | null }>(
          `select md5(string_agg(concat_ws('|', i.id, i.last_reviewed_at, i.last_verified_at, i.review_unchanged_streak, i.next_review_at, i.updated_at), ';' order by i.id)) as a
           from admin_research_items i where not (i.id = any($1))`,
          [funnIder],
        )
      ).rows[0]!.a;
    const antallAndreReviews = async () =>
      (await client.query<{ n: number }>(`select count(*)::int as n from admin_research_reviews where not (id = any($1))`, [falskeIder])).rows[0]!.n;

    const før = await hentFelt();
    const andreFør = await avtrykkAndre();
    const ekteFør = await antallAndreReviews();

    await client.query(`delete from admin_research_reviews where id = any($1)`, [falskeIder]);

    /*
     * Reviewfeltene fra gjenværende historikk. next_review_at og updated_at står ikke her:
     * triggeren regner datoen fordi ankrene endres, og updated_at røres ikke.
     */
    await client.query(
      `update admin_research_items i set
         last_reviewed_at = d.lr,
         last_verified_at = coalesce(d.lv, d.anker),
         review_unchanged_streak = d.st
       from (
         select x.id,
                (select max(r.reviewed_at) from admin_research_reviews r where r.research_item_id = x.id) as lr,
                (select max(r.reviewed_at) from admin_research_reviews r where r.research_item_id = x.id and r.outcome not in ('unresolved', 'snoozed')) as lv,
                (select count(*)::int from admin_research_reviews r where r.research_item_id = x.id and not r.changed
                   and r.reviewed_at > coalesce((select max(c.reviewed_at) from admin_research_reviews c where c.research_item_id = x.id and c.changed), '-infinity'::timestamptz)) as st,
                -- Samme anker som review:backfill: nyeste kildedato, ellers datoen funnet ble lagt inn.
                coalesce((select max(coalesce(s.source_date::timestamptz, s.accessed_at)) from admin_research_sources s where s.research_item_id = x.id), x.first_seen_at) as anker
         from admin_research_items x where x.id = any($1)
       ) d
       where i.id = d.id`,
      [funnIder],
    );

    const etter = await hentFelt();
    const gjenstår = (
      await client.query<{ n: number }>(
        `select count(*)::int as n from admin_research_reviews rv join admin_research_runs ru on ru.id = rv.research_run_id where ${FALSK}`,
        [runder, SEED_UENDRET_TEKST],
      )
    ).rows[0]!.n;
    const ekteEtter = (await client.query<{ n: number }>(`select count(*)::int as n from admin_research_reviews`)).rows[0]!.n;
    const andreEndret = (await avtrykkAndre()) === andreFør ? 0 : 1;
    const ektePerFunn = new Map(
      (await client.query<{ id: string; n: number }>(`select research_item_id as id, count(*)::int as n from admin_research_reviews where research_item_id = any($1) group by 1`, [funnIder])).rows.map((r) => [r.id, r.n]),
    );

    // Egenkontroll før noe får bli stående.
    if (gjenstår !== 0) throw new Error(`${gjenstår} falske rader står igjen etter sletting`);
    if (ekteEtter !== ekteFør) throw new Error(`Antall øvrige reviews endret seg: ${ekteFør} → ${ekteEtter}`);
    if (andreEndret) throw new Error("Funn utenfor oppryddingen ble endret");

    const falskePerFunn = new Map<string, number>();
    for (const f of falske) falskePerFunn.set(f.research_item_id, (falskePerFunn.get(f.research_item_id) ?? 0) + 1);
    const funn: Funnendring[] = funnIder
      .map((id) => ({ id, title: før.get(id)!.title, subcategory: før.get(id)!.subcategory, falske: falskePerFunn.get(id)!, ekte: ektePerFunn.get(id) ?? 0, før: felt(før.get(id)!), etter: felt(etter.get(id)!) }))
      .sort((a, b) => a.title.localeCompare(b.title, "nb"));

    await client.query(valg.apply ? "commit" : "rollback");
    return { status: valg.apply ? "utført" : "tørrkjøring", falskeRader: falske.length, perRunde, tvilstilfeller: tvil, funn, ekteReviewsFør: ekteFør, ekteReviewsEtter: ekteEtter, andreEndret };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
}

/** Tallene rapporten og dokumentasjonen bruker. */
export function oppsummer(r: Oppryddingsrapport) {
  const dag = (v: string | null) => (v ? v.slice(0, 10) : null);
  const f = r.funn;
  return {
    falskeRader: r.falskeRader,
    funn: f.length,
    tilAldriKontrollert: f.filter((x) => x.etter.last_reviewed_at === null).length,
    beholderEkteReview: f.filter((x) => x.etter.last_reviewed_at !== null).length,
    endretSistReviewet: f.filter((x) => x.før.last_reviewed_at !== x.etter.last_reviewed_at).length,
    endretStreak: f.filter((x) => x.før.review_unchanged_streak !== x.etter.review_unchanged_streak).length,
    endretSistVerifisert: f.filter((x) => x.før.last_verified_at !== x.etter.last_verified_at).length,
    verifisertFraReview: f.filter((x) => x.ekte > 0 && x.før.last_verified_at !== x.etter.last_verified_at).length,
    verifisertFraAnker: f.filter((x) => x.ekte === 0 && x.før.last_verified_at !== x.etter.last_verified_at).length,
    endretNesteReview: f.filter((x) => dag(x.før.next_review_at) !== dag(x.etter.next_review_at)).length,
    nesteReviewTidligere: f.filter((x) => x.før.next_review_at && x.etter.next_review_at && dag(x.etter.next_review_at)! < dag(x.før.next_review_at)!).length,
    endretUpdatedAt: f.filter((x) => x.før.updated_at !== x.etter.updated_at).length,
  };
}
