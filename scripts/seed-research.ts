/**
 * npm run research:seed — legger inn de manuelle research-funnene som skal finnes i basen.
 *
 * Idempotent, og skriptet er kilden: funn kjennes igjen på tittel + adresse, feltene settes til
 * det som står i scripts/research/funn.ts, og kilder legges til hvis de mangler. Endrer noen et
 * felt i UI-et, vinner skriptet neste gang det kjøres — derfor står bare de kuraterte funnene
 * der, ikke alt.
 *
 * Kjøres sjelden og manuelt, mot SUPABASE_DB_URL, som eier. `created_by` settes eksplisitt til
 * «seed», så det er synlig i UI-et at ingen person la det inn.
 *
 * Research publiseres aldri automatisk. Dette skriptet skriver kun til admin_research_*.
 *
 * REVIEWDATA. Seed er ikke review. Skriptet oppdaterer innhold, aldri reviewplanen:
 * `last_reviewed_at`, `next_review_at`, `review_mode` og manuelle overstyringer står urørt.
 *
 * `--review="<runde>"` registrerer en review BARE for funn som er merket
 * `gjennomgatt_i: "<runde>"` i funn.ts. Uten merkede funn stopper skriptet før noe er skrevet.
 * Kjernen og reglene står i scripts/research/seed.ts.
 */
import nextEnv from "@next/env";
import pg from "pg";
import { FUNN } from "./research/funn";
import { kjorSeed, SeedReviewFeil } from "./research/seed";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler");
  const runde = runEtikett();
  if (runde === "") throw new SeedReviewFeil("--review mangler rundeetikett. Ingenting er skrevet.");

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const r = await kjorSeed(client, FUNN, { runde });
    for (const l of r.linjer) {
      console.log(
        `  ${l.ny ? "la inn" : "oppdatert"}: ${l.tittel} — ${l.adresse ?? "uten adresse"}` +
          `${l.nyeKilder ? ` (+${l.nyeKilder} kilder)` : ""}` +
          `${l.review === "logget" ? ` [review: ${l.endringer.length ? l.endringer.join(", ") : "ingen feltendring"}]` : ""}` +
          `${l.review === "fantes" ? " [review fantes fra før]" : ""}`,
      );
    }
    const [antall] = (
      await client.query<{ funn: string; kilder: string }>(
        `select (select count(*) from admin_research_items) as funn,
                (select count(*) from admin_research_sources) as kilder`,
      )
    ).rows;
    console.log(`\nSeed: ${r.linjer.length} funn i fila (${r.nye} nye, ${r.endret} endret, ${r.uendret} uendret)`);
    if (runde) {
      console.log(`Review: ${r.reviewLogget} funn i runden «${runde}»${r.reviewFantes ? ` (${r.reviewFantes} hadde reviewen fra før)` : ""}`);
      console.log(`Ikke reviewet: ${r.linjer.length - r.reviewLogget - r.reviewFantes} funn (ikke merket med runden)`);
    } else {
      console.log("Review: 0 funn (ingen --review)");
    }
    console.log(`Totalt i basen: ${antall!.funn} funn, ${antall!.kilder} kilder`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof SeedReviewFeil ? `FEIL: ${error.message}` : error);
  process.exit(1);
});

/** `--review="etikett"` eller `--review etikett`. null = ikke oppgitt, "" = oppgitt uten verdi. */
function runEtikett(): string | null {
  const args = process.argv.slice(2);
  const medLikhetstegn = args.find((a) => a.startsWith("--review="));
  if (medLikhetstegn) return medLikhetstegn.slice("--review=".length).trim();
  const i = args.indexOf("--review");
  if (i < 0) return null;
  const neste = args[i + 1]?.trim() ?? "";
  return neste.startsWith("--") ? "" : neste;
}
