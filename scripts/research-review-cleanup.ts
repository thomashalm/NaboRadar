/**
 * npm run review:cleanup — fjerner de falske reviewene fra runde 16 og 17.
 *
 * Tørrkjøring er standard: alt gjøres i en transaksjon som rulles tilbake, og rapporten viser
 * hva som ville blitt endret. `--apply` skriver. `--alle` lister hvert funn.
 *
 * Stopper uten å endre noe hvis tallene i basen ikke stemmer med det som ble undersøkt
 * (docs/research/research-review-opprydding.md). Etter en gjennomført opprydding finner
 * skriptet ingenting å rydde, og gjør ingenting.
 */
import nextEnv from "@next/env";
import pg from "pg";
import { BaselineFeil, kontrollerRegler, oppsummer, ryddFalskeReviews, type Forventet } from "./research/review-opprydding";

nextEnv.loadEnvConfig(process.cwd());

/** Undersøkt i produksjon 2026-10-06. Endres ikke for å få skriptet til å gå. */
const FORVENTET: Forventet = {
  perRunde: {
    "Datasenter runde 16 – coverage first 2026-10-02": 268,
    "Datasenter runde 17 – Vestland og kraftkø 2026-10-06": 269,
  },
  funn: 275,
};

async function main() {
  const apply = process.argv.includes("--apply");
  const alle = process.argv.includes("--alle");
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const regler = await kontrollerRegler(client);
    console.log(`Regelkontroll mot dagens data (${regler.funnMedReview} funn med review):`);
    console.log(`  sist reviewet ≠ nyeste review:           ${regler.avvikReviewet}`);
    console.log(`  sist verifisert ≠ nyeste verifiserende:  ${regler.avvikVerifisert}`);
    console.log(`  streak ≠ opptelling fra historikken:     ${regler.avvikStreak}`);

    const r = await ryddFalskeReviews(client, { forventet: FORVENTET, apply });
    if (r.status === "ingenting") {
      console.log("\n0 falske reviews å rydde. Ingenting er endret.");
      if (r.tvilstilfeller.length) console.log(`Tvilstilfeller som står: ${r.tvilstilfeller.length}`);
      return;
    }
    const s = oppsummer(r);
    console.log(`\n${apply ? "UTFØRT" : "TØRRKJØRING (ingenting er skrevet)"} — ${new Date().toISOString()}`);
    for (const [runde, n] of Object.entries(r.perRunde)) console.log(`  ${n} falske rader · ${runde}`);
    console.log(`Review-rader slettet:               ${s.falskeRader}`);
    console.log(`Funn berørt:                        ${s.funn}`);
    console.log(`  tilbake til «aldri kontrollert»:  ${s.tilAldriKontrollert}`);
    console.log(`  beholder minst én ekte review:    ${s.beholderEkteReview}`);
    console.log(`Øvrige reviews før / etter:         ${r.ekteReviewsFør} / ${r.ekteReviewsEtter}`);
    console.log(`Endret last_reviewed_at:            ${s.endretSistReviewet}`);
    console.log(`Endret streak:                      ${s.endretStreak}`);
    console.log(`Endret last_verified_at:            ${s.endretSistVerifisert} (${s.verifisertFraReview} fra nyeste ekte review, ${s.verifisertFraAnker} fra kildeanker)`);
    console.log(`Endret next_review_at (trigger):    ${s.endretNesteReview} (${s.nesteReviewTidligere} tidligere enn før)`);
    console.log(`Endret updated_at:                  ${s.endretUpdatedAt}`);
    console.log(`Tvilstilfeller beholdt:             ${r.tvilstilfeller.length}`);
    for (const t of r.tvilstilfeller) console.log(`  ${t.title} · ${t.runde} · ${t.grunn}`);

    const d = (v: string | null) => (v ? v.slice(0, 16).replace("T", " ") : "–");
    const vis = alle ? r.funn : [...r.funn.filter((x) => x.ekte === 0).slice(0, 4), ...r.funn.filter((x) => x.ekte > 0).slice(0, 6)];
    console.log(`\n${alle ? "Alle funn" : "Utvalg"} (før → etter):`);
    for (const x of vis) {
      console.log(
        `  ${x.title} [${x.subcategory ?? "–"}] · ${x.falske} falske, ${x.ekte} ekte\n` +
          `     reviewet ${d(x.før.last_reviewed_at)} → ${d(x.etter.last_reviewed_at)} · verifisert ${d(x.før.last_verified_at)} → ${d(x.etter.last_verified_at)}` +
          ` · streak ${x.før.review_unchanged_streak} → ${x.etter.review_unchanged_streak} · neste ${d(x.før.next_review_at).slice(0, 10)} → ${d(x.etter.next_review_at).slice(0, 10)}`,
      );
    }
    if (!apply) console.log("\nKjør med --apply for å skrive.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof BaselineFeil ? `STOPPET: ${error.message}` : error);
  process.exit(1);
});
