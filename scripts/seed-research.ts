/**
 * npm run research:seed — legger inn de manuelle research-funnene som skal finnes i basen.
 *
 * Idempotent, og skriptet er kilden: funn kjennes igjen på tittel + adresse, feltene settes til
 * det som står her, og kilder legges til hvis de mangler. Endrer noen et felt i UI-et, vinner
 * skriptet neste gang det kjøres — derfor står bare de kuraterte funnene her, ikke alt.
 *
 * Kjøres sjelden og manuelt, mot SUPABASE_DB_URL, som eier. `created_by` settes eksplisitt til
 * «seed», så det er synlig i UI-et at ingen person la det inn.
 *
 * Research publiseres aldri automatisk. Dette skriptet skriver kun til admin_research_*.
 *
 * REVIEWDATA. Skriptet oppdaterer innhold, aldri reviewplanen: `last_reviewed_at`,
 * `next_review_at`, `review_mode` og manuelle overstyringer står urørt. En innholdsoppdatering er
 * ikke en kontroll, og skal ikke se ut som en. Triggeren i basen regner ut ny dato hvis innholdet
 * endret forutsetningene — det er en annen sak.
 *
 * Kjøres skriptet med `--review="<runde>"`, registreres i tillegg en review per funn som
 * faktisk ble oppdatert, knyttet til research-runden med den etiketten. Da får en stor
 * researchrunde reviewhistorikk uten at noen må klikke gjennom UI-et for hvert funn.
 */
import nextEnv from "@next/env";
import pg from "pg";
import { FUNN, type Funn } from "./research/funn";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler");
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  /*
   * --review="<etikett>" knytter reviewene til en research-run. Etiketten må finnes: en review
   * som peker på en runde som ikke er logget ville vært historikk uten kontekst.
   */
  const runLabel = runEtikett();
  let runId: string | null = null;
  let reviewLoggede = 0;
  if (runLabel) {
    const { rows } = await client.query<{ id: string }>(
      `select id from admin_research_runs where label = $1 order by started_at desc limit 1`,
      [runLabel],
    );
    if (rows.length === 0) throw new Error(`Fant ingen research-run med etiketten «${runLabel}»`);
    runId = rows[0]!.id;
    console.log(`Registrerer reviews på runden «${runLabel}».`);
  }

  try {
    for (const funn of FUNN) {
      /*
       * Gjenkjenning: tittel + adresse først, og tittel alene som reserve.
       *
       * Reserven finnes fordi et funn kan få adresse etter at det ble lagt inn — da ville en
       * ren tittel+adresse-nøkkel opprettet en dublett i stedet for å oppdatere raden. Den
       * brukes bare når nøyaktig én rad har tittelen, så to ulike steder med samme navn ikke
       * smelter sammen.
       */
      let finnes = await client.query<{ id: string }>(
        `select id from admin_research_items where title = $1 and coalesce(address, '') = coalesce($2, '')`,
        [funn.title, funn.address ?? null],
      );
      if (finnes.rows.length === 0) {
        const påTittel = await client.query<{ id: string }>(
          `select id from admin_research_items where title = $1`,
          [funn.title],
        );
        if (påTittel.rows.length === 1) finnes = påTittel;
      }
      if (finnes.rows.length === 0 && funn.tidligere_titler?.length) {
        const påGammelTittel = await client.query<{ id: string }>(
          `select id from admin_research_items where title = any($1)`,
          [funn.tidligere_titler],
        );
        if (påGammelTittel.rows.length === 1) finnes = påGammelTittel;
      }

      const id = finnes.rows[0]?.id ?? (await settInn(client, funn));
      let endringer: string[] = [];
      if (finnes.rows[0]) {
        const før = await hentFelter(client, id);
        await oppdater(client, id, funn);
        endringer = forskjeller(før, funn);
      }

      let nyeKilder = 0;
      for (const kilde of funn.kilder) {
        const harKilden = await client.query(
          `select 1 from admin_research_sources where research_item_id = $1 and source_name = $2`,
          [id, kilde.source_name],
        );
        if (harKilden.rows.length > 0) continue;
        await client.query(
          `insert into admin_research_sources (
             research_item_id, source_name, source_url, publisher, source_type, source_date,
             primary_source, supports_claim, excerpt_or_summary
           ) values ($1, $2, $3, $4, $5, $6::date, $7, $8, $9)`,
          [
            id,
            kilde.source_name,
            kilde.source_url ?? null,
            kilde.publisher ?? null,
            kilde.source_type,
            kilde.source_date ?? null,
            kilde.primary_source ?? false,
            kilde.supports_claim ?? true,
            kilde.excerpt_or_summary ?? null,
          ],
        );
        nyeKilder += 1;
      }
      // Reviewhistorikk for de eksisterende funnene, når runden er navngitt.
      if (runId && finnes.rows[0]) {
        await loggReview(client, id, runId, endringer, nyeKilder);
        reviewLoggede++;
      }

      console.log(
        `  ${finnes.rows[0] ? "oppdatert" : "la inn"}: ${funn.title} — ${funn.address ?? "uten adresse"}` +
          `${nyeKilder ? ` (+${nyeKilder} kilder)` : ""}` +
          `${runId && finnes.rows[0] ? ` [review: ${endringer.length ? endringer.join(", ") : "ingen endring"}]` : ""}`,
      );
    }

    const [antall] = (
      await client.query<{ funn: string; kilder: string }>(
        `select (select count(*) from admin_research_items) as funn,
                (select count(*) from admin_research_sources) as kilder`,
      )
    ).rows;
    console.log(`Totalt: ${antall!.funn} funn, ${antall!.kilder} kilder`);
    if (runId) console.log(`Reviews registrert: ${reviewLoggede}`);
  } finally {
    await client.end();
  }
}

async function settInn(client: pg.Client, funn: Funn): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into admin_research_items (
           item_type, category, subcategory, title, description,
           municipality, address, postal_code, city, latitude, longitude, geom,
           verification_status, operational_status, sensitivity, confidence, interest_level,
           why_interesting, notes, created_by, public_candidate, public_candidate_note
         ) values (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           case when $10::double precision is not null
             then extensions.st_setsrid(extensions.st_makepoint($11, $10), 4326) end,
           $12, $13, $14, $15, $16, $17, $18, 'seed', $19, $20
         ) returning id`,
    [
      funn.item_type,
      funn.category,
      funn.subcategory ?? null,
      funn.title,
      funn.description,
      funn.municipality ?? null,
      funn.address ?? null,
      funn.postal_code ?? null,
      funn.city ?? null,
      funn.latitude ?? null,
      funn.longitude ?? null,
      funn.verification_status,
      funn.operational_status,
      funn.sensitivity,
      funn.confidence,
      funn.interest_level,
      funn.why_interesting ?? null,
      funn.notes ?? null,
      funn.public_candidate ?? false,
      funn.public_candidate_note ?? null,
    ],
  );
  return rows[0]!.id;
}

/** Setter feltene til det som står i skriptet. Kilder røres ikke her. */
async function oppdater(
  client: pg.Client,
  id: string,
  funn: Funn,
): Promise<void> {
  await client.query(
    `update admin_research_items set
       item_type = $2, category = $3, subcategory = $4, description = $5,
       municipality = $6, postal_code = $7, city = $8, latitude = $9, longitude = $10,
       address = $18, title = $19,
       public_candidate = $20, public_candidate_note = $21,
       geom = case when $9::double precision is not null
                then extensions.st_setsrid(extensions.st_makepoint($10, $9), 4326) end,
       verification_status = $11, operational_status = $12, sensitivity = $13,
       confidence = $14, interest_level = $15, why_interesting = $16, notes = $17,
       updated_at = now()
     where id = $1`,
    [
      id,
      funn.item_type,
      funn.category,
      funn.subcategory ?? null,
      funn.description,
      funn.municipality ?? null,
      funn.postal_code ?? null,
      funn.city ?? null,
      funn.latitude ?? null,
      funn.longitude ?? null,
      funn.verification_status,
      funn.operational_status,
      funn.sensitivity,
      funn.confidence,
      funn.interest_level,
      funn.why_interesting ?? null,
      funn.notes ?? null,
      funn.address ?? null,
      funn.title,
      funn.public_candidate ?? false,
      funn.public_candidate_note ?? null,
    ],
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/** `--review="etikett"` eller `--review etikett`. Tom verdi betyr av. */
function runEtikett(): string | null {
  const args = process.argv.slice(2);
  const medLikhetstegn = args.find((a) => a.startsWith("--review="));
  if (medLikhetstegn) return medLikhetstegn.slice("--review=".length).trim() || null;
  const i = args.indexOf("--review");
  return i >= 0 ? (args[i + 1]?.trim() || null) : null;
}

/** Feltene vi sammenligner for å avgjøre om oppdateringen faktisk endret noe. */
const SAMMENLIGN = [
  "title",
  "description",
  "notes",
  "why_interesting",
  "operational_status",
  "verification_status",
  "confidence",
  "interest_level",
  "subcategory",
  "municipality",
  "address",
  "latitude",
  "public_candidate",
] as const;

type Felter = Record<string, unknown>;

async function hentFelter(client: pg.Client, id: string): Promise<Felter> {
  const { rows } = await client.query<Felter>(
    `select ${SAMMENLIGN.join(", ")} from admin_research_items where id = $1`,
    [id],
  );
  return rows[0] ?? {};
}

/**
 * Hva som endret seg. Brukes både til `changed` på reviewen og til sammendraget, slik at
 * historikken kan svare på «hva var forskjellen» uten en generell diffmotor.
 */
function forskjeller(før: Felter, funn: Funn): string[] {
  const etter: Felter = {
    title: funn.title,
    description: funn.description,
    notes: funn.notes ?? null,
    why_interesting: funn.why_interesting ?? null,
    operational_status: funn.operational_status,
    verification_status: funn.verification_status,
    confidence: funn.confidence,
    interest_level: funn.interest_level,
    subcategory: funn.subcategory ?? null,
    municipality: funn.municipality ?? null,
    address: funn.address ?? null,
    latitude: funn.latitude ?? null,
    public_candidate: funn.public_candidate ?? false,
  };
  return SAMMENLIGN.filter((felt) => {
    const a = før[felt];
    const b = etter[felt];
    // Tall fra Postgres kommer som streng; sammenlign som tekst for å slippe falske treff.
    return (a === null || a === undefined ? "" : String(a)) !== (b === null || b === undefined ? "" : String(b));
  });
}

/**
 * Registrerer reviewen gjennom databasens egen funksjon.
 *
 * Kjernen brukes med vilje: den holder streak, datoer og historikk i takt. Skriptet kjører som
 * eier uten JWT, så den tilgangssjekkede innpakningen ville avvist det — og å låne en admins
 * e-post for å komme gjennom ville gjort historikken feil. Aktøren er «seed».
 */
async function loggReview(
  client: pg.Client,
  id: string,
  runId: string,
  endringer: string[],
  nyeKilder: number,
): Promise<void> {
  const endret = endringer.length > 0;
  await client.query(`select public.record_research_review_unchecked($1, $2::jsonb, 'seed')`, [
    id,
    JSON.stringify({
      outcome: endret ? "updated" : "unchanged",
      research_run_id: runId,
      sources_checked: nyeKilder,
      summary: endret
        ? `Oppdatert fra seeden: ${endringer.join(", ")}.`
        : "Gjennomgått i runden uten at innholdet endret seg.",
    }),
  ]);
}
