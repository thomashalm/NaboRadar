/**
 * npm run qa:hytter
 *
 * Kvalitetssjekker for hytter og koier. Leser bare. Hver sjekk er en regel som skal holde
 * uansett hvor mange hytter som er importert; et avvik er enten en feil i en kilde eller et
 * brudd på en av våre egne regler. Avslutter med kode 1 når noe bryter en regel.
 *
 * Kjøres etter en import og før publisering. Den erstatter ikke stikkprøver mot kart.
 */
import nextEnv from "@next/env";
import pg from "pg";
import { HUT_BOUNDS } from "@/lib/huts/types";

nextEnv.loadEnvConfig(process.cwd());

interface Check {
  navn: string;
  /** Spørringen returnerer radene som bryter regelen. */
  sql: string;
  /** Advarsel: verdt å se på, men ikke et regelbrudd. */
  advarsel?: boolean;
}

const B = HUT_BOUNDS;
const SYNLIG = `h.archived_at is null and h.rejected_at is null and (h.confidence <> 'low' or h.last_verified_at is not null)`;

const CHECKS: Check[] = [
  {
    navn: "Koordinater utenfor Norge",
    sql: `select h.name from huts h where h.archived_at is null and (st_y(h.geom) not between ${B.minLat} and ${B.maxLat} or st_x(h.geom) not between ${B.minLng} and ${B.maxLng})`,
  },
  {
    navn: "Kildeposter utenfor Norge",
    sql: `select a.title as name from area_features a where a.category = 'hytte_kilde' and a.removed_from_source_at is null
          and (st_y(a.centroid) not between ${B.minLat} and ${B.maxLat} or st_x(a.centroid) not between ${B.minLng} and ${B.maxLng})`,
  },
  {
    navn: "Samme eksterne ID to ganger hos én kilde",
    sql: `select provider_id || ':' || external_id as name from area_features where category = 'hytte_kilde' group by provider_id, external_id having count(*) > 1`,
  },
  {
    navn: "Aktiv hytte uten aktiv kildepost",
    sql: `select h.name from huts h where h.archived_at is null and not exists (
            select 1 from hut_sources s join area_features a on a.id = s.feature_id where s.hut_id = h.id and a.removed_from_source_at is null)`,
  },
  {
    navn: "Kildepost koblet til arkivert hytte",
    sql: `select a.title as name from hut_sources s join area_features a on a.id = s.feature_id join huts h on h.id = s.hut_id
          where a.removed_from_source_at is null and h.archived_at is not null`,
  },
  {
    navn: "To synlige hytter med samme navn på samme punkt",
    sql: `select h.name from huts h join huts o on o.id > h.id and o.name_key = h.name_key and st_dwithin(o.geom::geography, h.geom::geography, 10)
          where ${SYNLIG} and ${SYNLIG.replaceAll("h.", "o.")}`,
  },
  {
    navn: "Avvist hytte i den offentlige visningen",
    sql: `select p.name from huts_public p join huts h on h.id = p.id where h.rejected_at is not null or h.archived_at is not null`,
  },
  {
    navn: "Hytte fra bare sekundærkilde i den offentlige visningen uten godkjenning",
    sql: `select p.name from huts_public p join huts h on h.id = p.id where h.confidence = 'low' and h.last_verified_at is null`,
  },
  {
    navn: "Overstyring eller offentlig merknad uten kilde",
    sql: `select h.name from huts h where (h.type_override is not null or h.access_override is not null or h.public_note is not null or h.access_status <> 'unknown')
          and (h.override_source_url is null or h.override_verified_at is null)`,
  },
  {
    navn: "Lenke eller kontrollert forvalter uten kontrolltidspunkt",
    sql: `select h.name from huts h where (h.booking_url is not null or h.info_url is not null or h.manager_verified is not null) and h.links_verified_at is null`,
  },
  {
    navn: "Lenke som ikke er https",
    sql: `select h.name from huts h where coalesce(h.booking_url, 'https://') !~ '^https://' or coalesce(h.info_url, 'https://') !~ '^https://'`,
  },
  {
    navn: "Synlig hytte uten kommunenummer",
    sql: `select h.name from huts h where ${SYNLIG} and h.municipality_number is null and h.last_verified_at is null`,
  },
  {
    navn: "Kontrollert forvalter uten notat om hvor den ble kontrollert",
    sql: `select h.name from huts h where h.manager_verified is not null and h.contact_note is null`,
  },
  {
    navn: "Overstyring av type eller tilgang til en verdi utenfor de kontrollerte listene",
    sql: `select h.name from huts h where (h.access_override is not null and h.access_override not in ('unlocked','dnt_key','code_lock','special_key','code_or_special_key','locked_prebooking'))
          or (h.type_override is not null and h.type_override not in ('staffed_hut','self_service_hut','unstaffed_hut','rest_cabin','open_cabin','day_trip_hut','emergency_shelter'))`,
  },
  {
    navn: "Offentlig merknad som ser ut som pris, ledighet eller sengetall",
    sql: `select h.name from huts h where h.public_note ~* '(\\mkr\\M|kroner|,-|ledig|sengeplass|senger\\M)'`,
  },
  {
    navn: "Midlertidig stengt uten dato for ny kontroll",
    sql: `select h.name from huts h where h.access_status = 'closed' and h.status_review_at is null`,
  },
  {
    navn: "Midlertidig stengt uten kilde",
    sql: `select h.name from huts h where h.access_status = 'closed' and (h.override_source_url is null or h.override_verified_at is null)`,
  },
  {
    navn: "Midlertidig stengt: kontrollen er forfalt",
    advarsel: true,
    sql: `select h.name from huts h where h.archived_at is null and h.rejected_at is null and h.access_status = 'closed' and h.status_review_at <= now()`,
  },
  {
    navn: "Låst Statskog-hytte uten neste steg",
    advarsel: true,
    sql: `select h.name from huts h where ${SYNLIG} and h.owner_kind = 'statskog' and h.locked is true
          and coalesce(h.manager_verified, h.manager_name) is null and h.booking_url is null and h.info_url is null`,
  },
  {
    navn: "Statskog-hytte uten kontrollert forvalter (står ikke i Statskogs egen oversikt)",
    advarsel: true,
    sql: `select h.name from huts h where ${SYNLIG} and h.owner_kind = 'statskog' and h.manager_verified is null`,
  },
  {
    navn: "Hytte med Statskog som forvalter uten direkte lenke",
    advarsel: true,
    sql: `select h.name from huts h where ${SYNLIG} and h.manager_verified = 'Statskog' and h.booking_url is null and h.info_url is null`,
  },
  {
    navn: "Vanlig DNT-hytte (betjent, selvbetjent, ubetjent) uten kontrollert forvalter eller lenke",
    advarsel: true,
    sql: `select h.name from huts h where ${SYNLIG} and h.owner_kind = 'dnt'
          and h.hut_type in ('staffed_hut', 'self_service_hut', 'unstaffed_hut')
          and (h.manager_verified is null or (h.booking_url is null and h.info_url is null))`,
  },
  {
    navn: "DNT-hytte uten navngitt forening",
    advarsel: true,
    sql: `select h.name from huts h where ${SYNLIG} and h.owner_kind = 'dnt' and coalesce(h.manager_verified, h.manager_name) is null`,
  },
  {
    navn: "Låst DNT-hytte uten neste steg (verken forening eller lenke)",
    advarsel: true,
    sql: `select h.name from huts h where ${SYNLIG} and h.owner_kind = 'dnt' and h.locked is true
          and coalesce(h.manager_verified, h.manager_name) is null and h.booking_url is null and h.info_url is null`,
  },
  {
    navn: "Låst hytte uten neste steg, alle eierkategorier",
    advarsel: true,
    sql: `select h.name from huts h where ${SYNLIG} and h.locked is true
          and coalesce(h.manager_verified, h.manager_name) is null and h.booking_url is null and h.info_url is null`,
  },
  {
    navn: "Synlige hytter innen 25 m av hverandre (anneks, eller dublett?)",
    advarsel: true,
    sql: `select h.name || ' / ' || o.name as name from huts h join huts o on o.id > h.id and st_dwithin(o.geom::geography, h.geom::geography, 25)
          where ${SYNLIG} and ${SYNLIG.replaceAll("h.", "o.")}`,
  },
  {
    navn: "Skjult hytte på samme punkt og med samme navn som en synlig (dublett i sekundærkilden)",
    advarsel: true,
    sql: `select h.name from huts h join huts o on o.id <> h.id and o.name_key = h.name_key and st_dwithin(o.geom::geography, h.geom::geography, 50)
          where h.archived_at is null and h.rejected_at is null and h.confidence = 'low' and h.last_verified_at is null and ${SYNLIG.replaceAll("h.", "o.")}`,
  },
];

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("SUPABASE_DB_URL mangler i .env.local.");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("set search_path = public, extensions");
  let brudd = 0;
  try {
    const [tall] = (
      await client.query<{ alle: string; synlige: string; kategori: boolean }>(
        `select (select count(*) from huts where archived_at is null) as alle, (select count(*) from huts_public) as synlige,
                (select is_public from area_feature_categories where category = 'hytte') as kategori`,
      )
    ).rows;
    console.log(`Hytter: ${tall!.alle} aktive, ${tall!.synlige} i den offentlige visningen. Kategorien er ${tall!.kategori ? "PUBLISERT" : "upublisert"}.\n`);
    for (const check of CHECKS) {
      const rows = (await client.query<{ name: string }>(check.sql)).rows;
      const ok = rows.length === 0;
      if (!ok && !check.advarsel) brudd++;
      const merke = ok ? "✓" : check.advarsel ? "!" : "✗";
      const eksempler = ok ? "" : ` — ${rows.length}: ${rows.slice(0, 5).map((r) => r.name).join(", ")}${rows.length > 5 ? " …" : ""}`;
      console.log(`${merke} ${check.navn}${eksempler}`);
    }
  } finally {
    await client.end();
  }
  console.log(brudd === 0 ? "\n✓ ingen regelbrudd" : `\n✗ ${brudd} regelbrudd`);
  process.exit(brudd === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
