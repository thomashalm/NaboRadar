/**
 * npm run qa:datasenter — sjekker datasentermodellen mot ekte anlegg i basen.
 *
 * Finnes fordi de tre tingene modellen er bygget for ikke kan bevises i en enhetstest med
 * oppdiktede data: at rollene faktisk skiller mellom eier, operatør og kunde på reelle anlegg,
 * at MW-tallene beholder semantikken, og at kunde-terskelen holder når en kilde frister.
 *
 * Skriptet skriver ikke. Det leser basen og rapporterer, slik at det kan kjøres når som helst.
 */
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

/** Anlegg vi bruker som faste kontrollpunkter. Valgt for å dekke ulike roller og statuser. */
const KONTROLLPUNKTER = [
  "Bulk N01 Campus",
  "Green Mountain",
  "atNorth NOR01",
  "Stargate Norway",
  "Microsoft Sandnes",
  "Google Skien",
];

async function main() {
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const q = async <T extends pg.QueryResultRow>(sql: string, p: unknown[] = []) =>
    (await client.query<T>(sql, p)).rows;

  // Databasen håndhever is_admin() selv; skriptet må derfor si hvem det er.
  const [admin] = await q<{ email: string }>(`select email from admin_users order by email limit 1`);
  if (!admin) throw new Error("Ingen admin_users — kan ikke kjøre QA");
  await client.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ role: "authenticated", email: admin.email }),
  ]);

  let avvik = 0;

  const [tot] = await q<{ n: number }>(`select count(*)::int n from datacenter_items()`);
  const n = tot?.n ?? 0;
  console.log(`\n■ ${n} datasentre i basen`);

  // ---- Dekning -----------------------------------------------------------
  console.log("\n■ Hva som mangler");
  const mangler = await q<{ f: string; n: number }>(
    `select f, count(*)::int n from datacenter_items() o, unnest(o.missing_fields) f group by 1 order by n desc`,
  );
  for (const m of mangler) console.log(`   ${String(m.n).padStart(3)} / ${n}   ${m.f}`);

  // ---- Rollene skiller ---------------------------------------------------
  console.log("\n■ Roller på kontrollpunktene");
  for (const navn of KONTROLLPUNKTER) {
    const [a] = await q<{
      title: string;
      owners: string | null;
      operators: string | null;
      customers: string | null;
      facility_type: string;
      missing_fields: string[];
    }>(`select title, owners, operators, customers, facility_type, missing_fields
          from datacenter_items() where title ilike $1 limit 1`, [`%${navn}%`]);
    if (!a) {
      console.log(`   ⚠ «${navn}» finnes ikke i basen`);
      avvik++;
      continue;
    }
    console.log(`   ${a.title}`);
    console.log(
      `      eier: ${a.owners ?? "—"} | operatør: ${a.operators ?? "—"} | kunde: ${a.customers ?? "—"} | type: ${a.facility_type}`,
    );
    // Rollene skal aldri være identiske strenger på tvers av eier og kunde: da er de slått sammen.
    if (a.owners && a.customers && a.owners === a.customers) {
      console.log("      ✗ eier og kunde er samme verdi — rollene er slått sammen");
      avvik++;
    }
  }

  // ---- MW-semantikk ------------------------------------------------------
  console.log("\n■ MW-semantikk");
  const mw = await q<{ title: string; felt: string; verdi: string }>(
    `select o.title, x.felt, x.verdi::text
       from datacenter_items() o,
       lateral (values ('it_load_mw', o.it_load_mw), ('operational_capacity_mw', o.operational_capacity_mw),
                       ('secured_power_mw', o.secured_power_mw), ('planned_capacity_mw', o.planned_capacity_mw),
                       ('campus_potential_mw', o.campus_potential_mw)) as x(felt, verdi)
      where x.verdi is not null
      order by o.title, x.felt`,
  );
  if (mw.length === 0) {
    console.log("   (ingen MW-tall registrert ennå)");
  } else {
    for (const r of mw) console.log(`   ${r.title}: ${r.verdi} MW — ${r.felt}`);
  }

  // ---- Kunde-terskelen holder -------------------------------------------
  console.log("\n■ Kunde-terskelen");
  const svake = await q<{ title: string; name: string; confidence: string }>(
    `select i.title, p.name, p.confidence
       from admin_research_datacenter_parties p
       join admin_research_items i on i.id = p.research_item_id
      where p.role = 'customer' and (p.confidence <> 'high' or p.source_id is null)`,
  );
  if (svake.length === 0) {
    console.log("   ✓ ingen kunder uten høy sikkerhet og kilde");
  } else {
    for (const s of svake) console.log(`   ✗ ${s.title}: «${s.name}» (${s.confidence}, uten kilde)`);
    avvik += svake.length;
  }

  // ---- Refresh-køen ------------------------------------------------------
  console.log("\n■ Refresh-kø");
  for (const mode of ["review_due", "full"]) {
    const [k] = await q<{ n: number }>(`select count(*)::int n from datacenter_refresh_candidates($1)`, [mode]);
    console.log(`   ${mode.padEnd(12)} ${k!.n} anlegg`);
  }
  const topp = await q<{ title: string; operational_status: string; queued_reasons: string[] }>(
    `select title, operational_status, queued_reasons from datacenter_refresh_candidates('review_due') limit 5`,
  );
  for (const t of topp) {
    console.log(`   • ${t.title} (${t.operational_status})`);
    console.log(`       ${t.queued_reasons.join(" · ")}`);
  }

  // ---- Isolasjon ---------------------------------------------------------
  console.log("\n■ Isolasjon");
  const [fremmed] = await q<{ n: number }>(
    `select count(*)::int n from admin_research_datacenter_refresh_items ri
       join admin_research_items i on i.id = ri.research_item_id
      where i.subcategory is distinct from 'Datasenter'`,
  );
  console.log(
    fremmed!.n === 0
      ? "   ✓ ingen andre kategorier har vært innom en datasenter-kø"
      : `   ✗ ${fremmed!.n} rader fra andre kategorier i køen`,
  );
  if (fremmed!.n > 0) avvik++;

  console.log(avvik === 0 ? "\n✓ ingen avvik" : `\n✗ ${avvik} avvik`);
  if (avvik > 0) process.exitCode = 1;
  await client.end();
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
