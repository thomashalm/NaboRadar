-- ---------------------------------------------------------------------------
-- Strammer inn hvem som faktisk kan kalle funksjonene våre.
--
-- Bakgrunn: de tidligere migrasjonene brukte «revoke execute … from public».
-- Det er ikke nok i Supabase. Supabase kjører
--
--   alter default privileges in schema public grant all on functions
--     to postgres, anon, authenticated, service_role;
--
-- så hver nye funksjon i public får EXECUTE gitt eksplisitt til anon og
-- authenticated i tillegg til PUBLIC. En revoke fra PUBLIC rører ikke de
-- eksplisitte grantene, og funksjonen blir liggende åpen på REST-API-et.
--
-- Konsekvensen var at hvem som helst med den publiserbare nøkkelen — som ligger
-- i klientbundlen — kunne kalle public.trigger_sync_workflow() og utløse
-- produksjons-workflowen på GitHub så mange ganger de ville. Bekreftet med et
-- anonymt kall 2026-09-25: HTTP 204 og et nytt utgående kall fra pg_net.
--
-- Derfor: én eksplisitt liste over hva anon og authenticated skal nå, og
-- revoke på alt annet. Listen er positiv og uttømmende, ikke en opprydding i
-- enkelttilfeller, slik at neste funksjon ikke arver problemet i det stille.
-- tests/db/grants.test.ts håndhever den samme listen.
-- ---------------------------------------------------------------------------

do $$
declare
  -- Det anon faktisk trenger: alt den offentlige siden leser.
  anon_ok   text[] := array[
    'data_status()',
    'events_within(double precision,double precision,double precision,date,text,integer)',
    'features_near(double precision,double precision,double precision,text[],integer)',
    'features_count_near(double precision,double precision,double precision,text[])',
    'get_event(uuid,double precision,double precision)'
  ];
  -- …og det en innlogget bruker trenger i tillegg: /admin, samt is_admin() som
  -- RLS-policyene kaller på vegne av kalleren.
  auth_ok   text[] := anon_ok || array[
    'is_admin()',
    'provider_health()',
    'recent_sync_runs(integer,text)',
    'request_sync(text,text,boolean)',
    'scheduler_status()'
  ];
  fn        record;
  signature text;
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke (lokal PGlite) — hopper over.';
    return;
  end if;

  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    -- Identiteten på samme form som listene over: navn(typer), uten parameternavn.
    signature := fn.proname || '(' || (
      select coalesce(string_agg(trim(regexp_replace(a, '^\s*\S+\s+(?=\S)', '')), ',' order by o), '')
      from unnest(string_to_array(fn.args, ', ')) with ordinality t(a, o)
    ) || ')';

    if not (signature = any (anon_ok)) then
      execute format('revoke execute on function public.%I(%s) from anon',
                     fn.proname, fn.args);
    end if;
    if not (signature = any (auth_ok)) then
      execute format('revoke execute on function public.%I(%s) from authenticated',
                     fn.proname, fn.args);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- pg_net: anon og authenticated hadde både USAGE på skjemaet og EXECUTE på
-- net.http_post/http_get/http_delete. PostgREST ruter ikke til skjemaet net, så
-- det var ikke direkte nåbart — men det er en HTTP-klient inne i databasen, og
-- den skal ingen av de to rollene ha. Kun postgres og service_role trenger den.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regnamespace('net') is null then return; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then return; end if;

  execute 'revoke all on schema net from anon, authenticated';
  execute 'revoke all on all functions in schema net from anon, authenticated';
  execute 'revoke all on all tables in schema net from anon, authenticated';
end;
$$;

-- ---------------------------------------------------------------------------
-- Tabellene: anon og authenticated fikk INSERT/UPDATE/DELETE/TRUNCATE på alt,
-- fra de samme standardrettighetene. RLS stopper skrivingen i dag, fordi ingen
-- av tabellene har en insert/update/delete-policy for dem. Men rettigheten er
-- ikke i bruk, og da skal den bort: da er RLS andre forsvarslinje, ikke eneste.
--
-- Appen går utelukkende gjennom RPC-er og rører ingen tabell direkte, så
-- SELECT beholdes bare der en policy allerede slipper rollen til.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then return; end if;

  execute 'revoke all on all tables in schema public from anon, authenticated';

  -- Offentlige data. features_near/events_within er security invoker og leser
  -- disse som kalleren, så SELECT må være på plass for at siden skal virke.
  execute 'grant select on public.providers, public.events, public.event_documents,
                            public.area_features to anon, authenticated';

  -- Innlogget: admin-tabellene er beskyttet av is_admin() i policyen, og
  -- watched_areas/notifications av eierskap.
  execute 'grant select on public.admin_users, public.sync_runs, public.sync_requests,
                            public.notifications to authenticated';
  execute 'grant select, insert, update, delete on public.watched_areas to authenticated';
end;
$$;
