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

      const id = finnes.rows[0]?.id ?? (await settInn(client, funn));
      if (finnes.rows[0]) await oppdater(client, id, funn);

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
      console.log(
        `  ${finnes.rows[0] ? "oppdatert" : "la inn"}: ${funn.title} — ${funn.address ?? "uten adresse"}` +
          `${nyeKilder ? ` (+${nyeKilder} kilder)` : ""}`,
      );
    }

    const [antall] = (
      await client.query<{ funn: string; kilder: string }>(
        `select (select count(*) from admin_research_items) as funn,
                (select count(*) from admin_research_sources) as kilder`,
      )
    ).rows;
    console.log(`Totalt: ${antall!.funn} funn, ${antall!.kilder} kilder`);
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
           why_interesting, notes, created_by
         ) values (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           case when $10::double precision is not null
             then extensions.st_setsrid(extensions.st_makepoint($11, $10), 4326) end,
           $12, $13, $14, $15, $16, $17, $18, 'seed'
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
       address = $18,
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
    ],
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
