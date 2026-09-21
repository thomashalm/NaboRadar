/**
 * npm run db:verify — sjekker en hosted database direkte via SUPABASE_DB_URL:
 * PostGIS, migrasjonshistorikk, tabeller, RLS og funksjonstilganger. Skriver aldri ut hemmeligheter.
 */
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const q = async <T extends pg.QueryResultRow>(sql: string) => (await client.query<T>(sql)).rows;

  const [postgis] = await q<{ version: string; schema: string }>(
    `select extversion as version, n.nspname as schema from pg_extension e join pg_namespace n on n.oid = e.extnamespace where extname = 'postgis'`,
  );
  const [server] = await q<{ version: string }>(`select split_part(version(), ' ', 2) as version`);
  console.log(`PostgreSQL:     ${server?.version}`);
  console.log(`PostGIS:        ${postgis ? `${postgis.version} (schema ${postgis.schema})` : "IKKE AKTIVERT"}`);
  const [geo] = await q<{ area: number }>(
    `select round(extensions.st_area(extensions.st_buffer(extensions.st_setsrid(extensions.st_makepoint(10.75, 59.91), 4326)::extensions.geography, 100))) as area`,
  );
  console.log(`Geografi-test:  areal av 100 m-buffer = ${geo?.area} m² (32-kant-tilnærming av πr² ≈ 31 416)`);

  const migrations = await q<{ version: string }>(`select version from supabase_migrations.schema_migrations order by version`);
  console.log(`Migrasjoner:    ${migrations.map((m) => m.version).join(", ")}`);

  const tables = await q<{ relname: string; rls: boolean }>(
    `select c.relname, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' order by 1`,
  );
  console.log(`Tabeller (RLS): ${tables.map((t) => `${t.relname}${t.rls ? "✓" : "✗"}`).join(", ")}`);

  const fns = ["events_within", "get_event", "data_status", "upsert_events", "mark_removed_from_source", "sync_run_start", "sync_run_finish", "last_successful_sync_start", "provider_overview"];
  const grants = await q<{ proname: string; anon: boolean; service: boolean }>(
    `select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('service_role', p.oid, 'execute') as service
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any($$${"{" + fns.join(",") + "}"}$$::text[]) order by 1`,
  );
  console.log("Funksjoner:     (anon / service_role)");
  for (const g of grants) console.log(`  ${g.proname.padEnd(28)} ${g.anon ? "anon ✓" : "anon ✗"}  ${g.service ? "service ✓" : "service ✗"}`);

  const [counts] = await q<{ events: string; active: string; removed: string; documents: string; runs: string }>(
    `select (select count(*) from events) events,
            (select count(*) from events where removed_from_source_at is null) active,
            (select count(*) from events where removed_from_source_at is not null) removed,
            (select count(*) from event_documents) documents,
            (select count(*) from sync_runs) runs`,
  );
  console.log(`Data:           ${counts?.events} events (${counts?.active} aktive, ${counts?.removed} fjernet), ${counts?.documents} dokumenter, ${counts?.runs} sync_runs`);
  const [bad] = await q<{ n: string }>(
    `select count(*) n from event_documents where title ~* 'beroert|berørt' or mime_type = 'application/json'`,
  );
  console.log(`Berørte parter: ${bad?.n} rader (skal være 0)`);
  await client.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Feil: ${message.replace(/postgres(ql)?:\/\/[^\s]+/g, "<SUPABASE_DB_URL>")}`);
  process.exit(1);
});
