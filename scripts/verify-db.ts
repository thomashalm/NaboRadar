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

  // Hvem som skal kunne kalle hva. Listen er positiv og uttømmende: alt annet i
  // public skal være stengt for anon og authenticated. Supabase gir EXECUTE til
  // anon, authenticated og PUBLIC som standard på hver nye funksjon i public, så
  // uten denne sjekken åpner neste funksjon seg selv i det stille — slik
  // trigger_sync_workflow() gjorde til 2026-09-25.
  // Hyttefunksjonene er åpne for anon, men svarer bare når kategorien `hytte` er publisert.
  const HUTS = ["huts_near", "huts_in_bbox", "huts_in_municipality", "huts_search", "get_hut"];
  const ANON_OK = new Set(["data_status", "events_within", "features_near", "features_count_near", "get_event", ...HUTS]);
  // Research er admin-only, men går gjennom authenticated-rollen — is_admin() inne i hver
  // funksjon er det som faktisk stenger, ikke grantet. Anon skal aldri ha noen av dem.
  const RESEARCH = ["research_items", "research_sources", "research_near", "save_research_item", "add_research_source", "delete_research_source", "research_runs", "research_map"];
  // Review-laget. record_research_review_unchecked står med vilje *ikke* her: den er kjernen som
  // bare eieren skal kunne kalle, og skal derfor ikke ha grant til authenticated heller.
  const REVIEW = ["research_review_queue", "research_review_metrics", "research_reviews", "research_review_status", "research_review_interval", "record_research_review", "set_research_review_plan"];
  // Datasenter-enrichment. Egen kø og egne felt, samme regel som resten av research: aldri anon,
  // og is_admin() inne i hver funksjon er det som faktisk stenger.
  const DATACENTER = ["datacenter_items", "datacenter_detail", "datacenter_refresh_candidates", "datacenter_refresh_runs", "datacenter_refresh_queue", "start_datacenter_refresh", "cancel_datacenter_refresh", "record_datacenter_refresh_item", "save_datacenter_details", "save_datacenter_party", "delete_datacenter_party", "set_datacenter_field_source", "is_datacenter_item"];
  // recent_sync_requests er historikken bak «Kjør sync nå» — admin-only, som provider_health.
  const AUTH_OK = new Set([
    ...ANON_OK,
    "is_admin",
    "provider_health",
    "recent_sync_runs",
    "recent_sync_requests",
    "request_sync",
    "scheduler_status",
    // Kontrollkøen for hytter: admin-only, med is_admin() inne i funksjonen.
    "hut_review_queue",
    "review_hut",
    "set_hut_contact",
    "set_hut_overrides",
    "hut_contact_list",
    ...RESEARCH,
    ...REVIEW,
    ...DATACENTER,
  ]);

  const grants = await q<{ proname: string; anon: boolean; auth: boolean; service: boolean }>(
    `select p.proname,
            has_function_privilege('anon', p.oid, 'execute') as anon,
            has_function_privilege('authenticated', p.oid, 'execute') as auth,
            has_function_privilege('service_role', p.oid, 'execute') as service
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' order by 1`,
  );
  const avvik: string[] = [];
  console.log("Funksjoner:     (anon / authenticated / service_role)");
  for (const g of grants) {
    const anonSkal = ANON_OK.has(g.proname);
    const authSkal = AUTH_OK.has(g.proname);
    if (g.anon !== anonSkal) avvik.push(`${g.proname}: anon ${g.anon ? "har" : "mangler"} EXECUTE, skal ${anonSkal ? "ha" : "ikke ha"}`);
    if (g.auth !== authSkal) avvik.push(`${g.proname}: authenticated ${g.auth ? "har" : "mangler"} EXECUTE, skal ${authSkal ? "ha" : "ikke ha"}`);
    if (!g.service) avvik.push(`${g.proname}: service_role mangler EXECUTE`);
    const flagg = `${g.anon ? "anon " : "  .  "}${g.auth ? "auth " : "  .  "}${g.service ? "svc" : " . "}`;
    console.log(`  ${flagg}  ${g.proname}`);
  }

  // Regelen fra migrasjon 20261003000000. Skjemaet net er en Supabase-plattform-
  // standard vi ikke kan tilbakekalle, så veien inn dit må stenges hos oss:
  //
  //   net.http_*  — kan sende en forespørsel ut. Ingen utenfra skal nå den.
  //   net.*       — kan lese pg_nets egne logger. Skal minst være stengt for anon.
  //
  // scheduler_status() er bevisst i den andre kategorien: den leser status_code fra
  // net._http_response til /admin, sender ingenting, og har is_admin()-sjekk inni seg.
  const netBrukere = await q<{ proname: string; anon: boolean; auth: boolean; sender: boolean }>(
    `select p.proname,
            has_function_privilege('anon', p.oid, 'execute') as anon,
            has_function_privilege('authenticated', p.oid, 'execute') as auth,
            p.prosrc ~ '\\mnet\\.http_' as sender
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f' and p.prosrc ~ '\\mnet\\.' order by 1`,
  );
  for (const f of netBrukere) {
    if (f.sender && (f.anon || f.auth)) avvik.push(`${f.proname} kan sende via net.http_* og er kjørbar av ${f.anon ? "anon" : "authenticated"}`);
    if (!f.sender && f.anon) avvik.push(`${f.proname} leser net.* og er kjørbar av anon`);
  }
  console.log(`net.*-brukere:  ${netBrukere.map((f) => `${f.proname}${f.sender ? " (sender)" : " (leser)"}`).join(", ") || "ingen"}`);

  // Tabelltilgang. Offentlig lesing går bare gjennom RPC-ene (migrasjon 20261018000000):
  // anon skal ikke ha ett eneste tabellprivilegium i public, og authenticated bare det som står
  // her. Supabase gir ALL på hver nye tabell til begge rollene som standard, så en ny tabell
  // — staging, rådata, research — åpner seg selv på REST-API-et hvis ingen sier noe annet.
  const ADMIN_LES = [
    "admin_users", "sync_runs", "sync_requests", "notifications",
    "admin_research_items", "admin_research_sources", "admin_research_runs", "admin_research_reviews",
    "admin_research_datacenter_details", "admin_research_datacenter_parties", "admin_research_datacenter_field_sources",
    "admin_research_datacenter_refresh_runs", "admin_research_datacenter_refresh_items",
  ];
  const AUTH_TABELL: Record<string, string> = {
    ...Object.fromEntries(ADMIN_LES.map((t) => [t, "SELECT"])),
    watched_areas: "DELETE,INSERT,SELECT,UPDATE",
  };
  const tabellGrants = await q<{ relname: string; grantee: string; privs: string }>(
    `select c.relname, r.rolname as grantee,
            string_agg(p.priv, ',' order by p.priv) as privs
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join (values ('anon'), ('authenticated')) r(rolname)
     cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
     where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
       and has_table_privilege(r.rolname, c.oid, p.priv)
     group by 1, 2 order by 1, 2`,
  );
  for (const g of tabellGrants) {
    const skal = g.grantee === "authenticated" ? AUTH_TABELL[g.relname] : undefined;
    if (g.privs !== skal) avvik.push(`${g.relname}: ${g.grantee} har ${g.privs}, skal ha ${skal ?? "ingenting"}`);
  }
  for (const [tabell, privs] of Object.entries(AUTH_TABELL)) {
    if (!tabellGrants.some((g) => g.relname === tabell && g.grantee === "authenticated")) {
      avvik.push(`${tabell}: authenticated mangler ${privs}`);
    }
  }
  console.log(`Tabelltilgang:  anon ${tabellGrants.filter((g) => g.grantee === "anon").length} tabeller, authenticated ${tabellGrants.filter((g) => g.grantee === "authenticated").length} tabeller`);

  // Uten RLS er en tabell bare beskyttet av grants. Alle tabeller i public skal ha RLS på.
  for (const t of tables) if (!t.rls) avvik.push(`${t.relname}: RLS er ikke slått på`);

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

  // Avvik i tilgangsflaten er ikke en advarsel. Den skal stoppe kjøringen.
  if (avvik.length > 0) {
    console.error(`\nTilgangsavvik (${avvik.length}):`);
    for (const a of avvik) console.error(`  ✗ ${a}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Feil: ${message.replace(/postgres(ql)?:\/\/[^\s]+/g, "<SUPABASE_DB_URL>")}`);
  process.exit(1);
});
