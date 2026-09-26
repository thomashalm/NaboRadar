/**
 * npm run review:backfill — gir eksisterende research-items en reviewplan.
 *
 * Basen ble bygget før review-laget fantes, så ingenting har `last_verified_at` eller en dato for
 * neste kontroll. Skriptet setter det i to trinn:
 *
 *   1. ANKER. `last_verified_at` settes til nyeste kildedato, ellers datoen funnet ble lagt inn.
 *      Det er det nærmeste vi kommer sannheten om når innholdet sist ble kontrollert mot kilder.
 *      Triggeren regner ut `next_review_at` fra dette etter intervallpolicyen.
 *
 *   2. FØRSTEGANGSANKER. Alt i basen er researchet i løpet av de siste ukene, så policyen alene
 *      ville gitt en tom kø i flere uker — og deretter en vegg. Funn som aldri er kontrollert og
 *      som ligger i prioritetsklassene (under bygging, planlagt, svake high-interest,
 *      public candidates, ukjent status, undersøkt-ikke-bekreftet med høy interesse) får derfor en
 *      første review fordelt over tre uker, de høyest prioriterte først.
 *
 * Skriptet hevder ikke at noen har gjort en review: `last_reviewed_at` står urørt, og funnene
 * beholder grunnen «aldri kontrollert» til noen faktisk gjør det. Det registrerer heller ingen
 * historikk — en backfill er en plan, ikke et arbeid som er utført.
 *
 * Kjør med --dry for å se hva det ville gjort.
 */
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

/** Hvor mange som skal være forfalt med én gang. En kø på tolv er en arbeidsliste; på førti er den støy. */
const FORFALT_NÅ = 12;
/** Resten av førstegangsankeret fordeles over så mange dager. */
const SPREDNING_DAGER = 21;

interface Rad {
  id: string;
  title: string;
  operational_status: string;
  verification_status: string;
  interest_level: string;
  confidence: string;
  public_candidate: boolean;
  review_priority: number;
  next_review_at: string | null;
  review_interval_days: number | null;
}

async function main() {
  const tørr = process.argv.includes("--dry");
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler");

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    if (tørr) await client.query("begin");

    // 1. Ankeret. Bare der det mangler — et anker som allerede er satt er mer riktig enn et nytt.
    const anker = await client.query(
      `update admin_research_items i set
         last_verified_at = coalesce(
           (select max(coalesce(s.source_date::timestamptz, s.accessed_at))
              from admin_research_sources s where s.research_item_id = i.id),
           i.first_seen_at)
       where i.last_verified_at is null
       returning i.id`,
    );
    console.log(`Anker satt på ${anker.rowCount} funn (last_verified_at fra nyeste kilde).`);

    // 2. Førstegangsankeret. Prioritetsrekkefølgen kommer fra viewet, ikke fra en liste her.
    const { rows } = await client.query<Rad>(
      `select i.id, i.title, i.operational_status, i.verification_status, i.interest_level,
              i.confidence, i.public_candidate, st.review_priority, st.next_review_at,
              st.review_interval_days
         from admin_research_items i
         join admin_research_review_status st on st.id = i.id
        where i.last_reviewed_at is null
          and i.review_mode = 'policy'
          and st.next_review_at is not null
          and (
            i.operational_status in ('under_construction', 'planned', 'unknown')
            or i.public_candidate
            or (i.interest_level = 'high' and i.confidence in ('low', 'medium'))
            or (i.verification_status = 'investigated_not_confirmed' and i.interest_level = 'high')
          )
        order by st.review_priority,
                 coalesce(i.last_verified_at, i.first_seen_at),
                 i.title`,
    );

    console.log(`\nPrioritetsklasser uten review: ${rows.length} funn.`);
    let forfalt = 0;
    let spredt = 0;

    for (const [i, rad] of rows.entries()) {
      // De første er forfalt i dag; resten fordeles jevnt over tre uker.
      const dager = i < FORFALT_NÅ ? 0 : 1 + Math.floor(((i - FORFALT_NÅ) * SPREDNING_DAGER) / Math.max(1, rows.length - FORFALT_NÅ));
      if (i < FORFALT_NÅ) forfalt++;
      else spredt++;

      await client.query(
        `update admin_research_items
            set next_review_at = current_date + $2::integer, updated_at = now()
          where id = $1`,
        [rad.id, dager],
      );

      if (i < 15) {
        console.log(
          `  P${rad.review_priority} · +${dager}d · ${rad.operational_status}/${rad.interest_level}/${rad.confidence}` +
            `${rad.public_candidate ? "/kandidat" : ""} · ${rad.title}`,
        );
      }
    }
    if (rows.length > 15) console.log(`  … og ${rows.length - 15} flere`);
    console.log(`\nForfalt nå: ${forfalt}. Fordelt over ${SPREDNING_DAGER} dager: ${spredt}.`);

    // 3. Rapporten. Det er denne som avgjør om policyen faktisk er nyttig.
    const [m] = (
      await client.query<Record<string, string>>(
        `select count(*) total,
                count(*) filter (where review_state = 'current') fersk,
                count(*) filter (where review_state = 'due_soon') snart,
                count(*) filter (where review_state = 'due') na,
                count(*) filter (where review_state = 'overdue') forsinket,
                count(*) filter (where review_state = 'needs_followup') oppfolging,
                count(*) filter (where review_state = 'blocked') blokkert,
                count(*) filter (where review_state = 'no_review_needed') ingen,
                count(*) filter (where last_reviewed_at is null) aldri
           from admin_research_review_status`,
      )
    ).rows;

    console.log("\nKøen etter backfill:");
    console.log(`  ${m!.total} research-items`);
    console.log(`  ${m!.na} review nå, ${m!.forsinket} forsinket, ${m!.oppfolging} oppfølging`);
    console.log(`  ${m!.snart} snart, ${m!.fersk} ferske, ${m!.ingen} trenger ikke review`);
    console.log(`  ${m!.aldri} aldri kontrollert`);

    const topp = await client.query<{ title: string; review_priority: number; next_review_at: string; grunner: string }>(
      `select i.title, st.review_priority, st.next_review_at, array_to_string(st.review_reasons, ', ') grunner
         from admin_research_items i join admin_research_review_status st on st.id = i.id
        where st.review_state in ('needs_followup', 'overdue', 'due')
        order by st.review_priority, st.next_review_at, i.title
        limit 15`,
    );
    console.log("\nTopp 15 i køen:");
    topp.rows.forEach((r, i) =>
      console.log(`  ${String(i + 1).padStart(2)}. P${r.review_priority} · ${r.title}\n      ${r.grunner}`),
    );

    if (tørr) {
      await client.query("rollback");
      console.log("\n--dry: ingenting er lagret.");
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
