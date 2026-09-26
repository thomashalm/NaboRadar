/**
 * npm run fix:dsb-identitet — slår sammen DSB-generasjonene til én rad per tilfluktsrom.
 *
 * Engangsjobb. Bakgrunn: `lokalId` fra DSB er ny for hvert uttrekk, så hver full sync opprettet
 * 556 nye rader og markerte 556 gamle som fjernet. Basen har derfor flere generasjoner av samme
 * 556 rom, med UUID-er som eksterne ID-er. Provideren bruker nå `romnr`, og dette skriptet flytter
 * de eksisterende radene over til den nøkkelen — ellers ville neste sync laget enda en generasjon.
 *
 * Hva den gjør, per romnummer:
 *   1. samler alle rader (aktive og fjernede) med det romnummeret
 *   2. beholder den nyeste aktive raden, som har de ferskeste feltene
 *   3. setter `external_id` til romnummeret
 *   4. setter `first_seen_at` til det eldste i gruppa — historikken vi faktisk har
 *   5. regner ut `content_hash` på nytt med samme funksjon som syncen bruker, slik at neste
 *      kjøring gir «unchanged» og ikke en runde med falske «updated»
 *   6. sletter de øvrige radene i gruppa, som er rene artefakter av ID-feilen
 *
 * Sletting skjer bare når radene er beviselig samme objekt: samme koordinat, samme
 * stedsbeskrivelse, samme antall plasser. Grupper som ikke oppfyller det, røres ikke — de
 * rapporteres, slik at et reelt avvik ikke blir borte i en opprydding.
 *
 * Kjør med --dry først. Ingenting skrives da.
 */
import nextEnv from "@next/env";
import pg from "pg";
import { areaFeatureSyncStrategy } from "@/lib/sync/strategy";
import type { AreaAttributes, AreaCategory, AreaSourceUrlType } from "@/types/area-feature";

nextEnv.loadEnvConfig(process.cwd());

const PROVIDER = "dsb-tilfluktsrom";

interface Rad {
  id: string;
  external_id: string;
  romnr: string | null;
  aktiv: boolean;
  category: AreaCategory;
  subtype: string;
  title: string;
  lat: string;
  lon: string;
  attributes: AreaAttributes;
  source_url: string | null;
  source_url_type: AreaSourceUrlType | null;
  first_seen_at: string;
  synced_at: string;
}

async function main() {
  const tørr = process.argv.includes("--dry");
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler");

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("begin");

    const { rows } = await client.query<Rad>(
      `select id, external_id, attributes->>'romnummer' as romnr,
              removed_from_source_at is null as aktiv,
              category, subtype, title,
              st_y(geom)::text as lat, st_x(geom)::text as lon,
              attributes, source_url, source_url_type, first_seen_at, synced_at
         from area_features
        where provider_id = $1
        order by synced_at desc, first_seen_at desc`,
      [PROVIDER],
    );
    console.log(`${rows.length} DSB-rader: ${rows.filter((r) => r.aktiv).length} aktive, ${rows.filter((r) => !r.aktiv).length} fjernet.`);

    const grupper = new Map<string, Rad[]>();
    const utenRomnr: Rad[] = [];
    for (const rad of rows) {
      if (!rad.romnr) {
        utenRomnr.push(rad);
        continue;
      }
      const liste = grupper.get(rad.romnr) ?? [];
      liste.push(rad);
      grupper.set(rad.romnr, liste);
    }
    console.log(`${grupper.size} unike romnummer. ${utenRomnr.length} rader uten romnummer.`);

    let konsolidert = 0;
    let slettet = 0;
    let alleredeRiktig = 0;
    const tvetydige: string[] = [];

    for (const [romnr, gruppe] of [...grupper.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
      const aktive = gruppe.filter((r) => r.aktiv);

      // Tvetydig: ingen aktiv rad, flere aktive rader, eller rader som ikke er samme objekt.
      if (aktive.length !== 1) {
        tvetydige.push(`romnr ${romnr}: ${aktive.length} aktive rader av ${gruppe.length}`);
        continue;
      }
      const behold = aktive[0]!;
      const avvik = gruppe
        .filter((r) => r.id !== behold.id)
        .filter(
          (r) =>
            r.lat !== behold.lat ||
            r.lon !== behold.lon ||
            String(r.attributes.sted ?? "") !== String(behold.attributes.sted ?? "") ||
            String(r.attributes.plasser ?? "") !== String(behold.attributes.plasser ?? ""),
        );
      if (avvik.length > 0) {
        tvetydige.push(`romnr ${romnr}: ${avvik.length} rad(er) med andre feltverdier — ikke rørt`);
        continue;
      }

      const eldste = gruppe.reduce((m, r) => (r.first_seen_at < m ? r.first_seen_at : m), behold.first_seen_at);
      // Samme hash-funksjon som syncen, slik at neste kjøring ser «unchanged».
      const hash = areaFeatureSyncStrategy.hash({
        providerId: PROVIDER,
        externalId: romnr,
        category: behold.category,
        subtype: behold.subtype,
        title: behold.title,
        geometry: { type: "Point", coordinates: [Number(behold.lon), Number(behold.lat)] },
        attributes: behold.attributes,
        sourceUrl: behold.source_url,
        sourceUrlType: behold.source_url_type,
        sourceUpdatedAt: null,
      });

      if (behold.external_id === romnr && gruppe.length === 1) {
        alleredeRiktig++;
      }

      await client.query(
        `update area_features
            set external_id = $2, first_seen_at = $3, content_hash = $4, source_updated_at = null
          where id = $1`,
        [behold.id, romnr, eldste, hash],
      );
      konsolidert++;

      const fjern = gruppe.filter((r) => r.id !== behold.id).map((r) => r.id);
      if (fjern.length > 0) {
        await client.query(`delete from area_features where id = any($1::uuid[])`, [fjern]);
        slettet += fjern.length;
      }
    }

    console.log(`\nKonsolidert: ${konsolidert} rom (${alleredeRiktig} var allerede på ny nøkkel).`);
    console.log(`Slettet: ${slettet} duplikatrader fra tidligere generasjoner.`);
    if (utenRomnr.length > 0) {
      console.log(`\nRader uten romnummer (ikke rørt): ${utenRomnr.length}`);
      utenRomnr.slice(0, 10).forEach((r) => console.log(`  ${r.external_id} — ${r.title}`));
    }
    if (tvetydige.length > 0) {
      console.log(`\nTvetydige grupper (ikke rørt), ${tvetydige.length}:`);
      tvetydige.slice(0, 20).forEach((t) => console.log(`  ${t}`));
    } else {
      console.log("\nIngen tvetydige grupper.");
    }

    const [etter] = (
      await client.query<{ totalt: string; aktive: string; fjernet: string; unike: string; eldste: string }>(
        `select count(*) totalt,
                count(*) filter (where removed_from_source_at is null) aktive,
                count(*) filter (where removed_from_source_at is not null) fjernet,
                count(distinct external_id) unike,
                min(first_seen_at)::text eldste
           from area_features where provider_id = $1`,
        [PROVIDER],
      )
    ).rows;
    console.log(
      `\nEtter: ${etter!.totalt} rader, ${etter!.aktive} aktive, ${etter!.fjernet} fjernet, ` +
        `${etter!.unike} unike external_id, eldste first_seen_at ${etter!.eldste}`,
    );

    if (tørr) {
      await client.query("rollback");
      console.log("\n--dry: rullet tilbake, ingenting er lagret.");
    } else {
      await client.query("commit");
      console.log("\nLagret.");
    }
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
