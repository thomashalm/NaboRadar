-- ---------------------------------------------------------------------------
-- NaboRadar — fase 6: pålitelig sync og admin.
--
-- Målet er at systemet skal oppdage at en kilde har sluttet å levere, også når
-- den svarer 200 OK med for lite data («silent failure»). Derfor:
--   * hver provider har egen tidsplan, egen status og egen feilhistorikk
--   * en kjøring kan bli markert «suspicious» — data er skrevet, men ikke stolt på,
--     og full reconciliation (markering som fjernet) hoppes over
--   * admin kan be om en kjøring uten at webappen har skrivenøkkel: forespørselen
--     legges i kø, og sync-worker med service role utfører den
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- providers: tidsplan, helsetilstand og referansetall.
-- ---------------------------------------------------------------------------
alter table public.providers
  add column last_attempt_at          timestamptz,
  add column last_run_status          text,
  add column consecutive_failures     integer not null default 0,
  -- Antall poster ved siste kjøring vi stolte på. Grunnlag for å oppdage unormale fall.
  add column baseline_record_count    integer,
  add column supports_incremental     boolean not null default false,
  -- null = kjøres ikke etter tidsplan (direkte oppslag, eller deaktivert kilde).
  add column sync_interval_minutes    integer,
  add column full_sync_interval_hours integer,
  add column stale_after_hours        integer,
  -- Tilstandsmaskin for varsling utenfor systemet. Oppdateres av varsleren, ikke av sync.
  add column alert_state              text not null default 'ok' check (alert_state in ('ok', 'alerted')),
  add column alert_state_since        timestamptz,
  add column alert_notified_at        timestamptz;

-- Tidsplan per kilde. Intervallene følger hvor ofte kilden faktisk endrer seg.
update public.providers set
  supports_incremental     = true,
  sync_interval_minutes    = 180,
  full_sync_interval_hours = 24,
  stale_after_hours        = 24
where id = 'dibk-planning-started';

-- Miljødirektoratet og NVE har ingen brukbar endringsmarkør: full sync, sjeldnere.
update public.providers set
  supports_incremental     = false,
  sync_interval_minutes    = 1440,
  full_sync_interval_hours = 24,
  stale_after_hours        = 72
where id in ('mdir-forurenset-grunn', 'mdir-industri-tillatelse');

update public.providers set
  supports_incremental     = false,
  sync_interval_minutes    = 1440,
  full_sync_interval_hours = 24,
  stale_after_hours        = 168
where id in ('nve-kvikkleire-soner', 'nve-nettanlegg');

-- ---------------------------------------------------------------------------
-- sync_runs: hvorfor kjøringen ble startet, hva som ble skrevet, og hva vi reagerte på.
-- ---------------------------------------------------------------------------
alter table public.sync_runs
  add column records     integer not null default 0,
  add column documents   integer not null default 0,
  add column trigger     text not null default 'manual' check (trigger in ('manual', 'scheduled', 'admin')),
  -- Kjøringen skrev data, men tallene ser feil ut. Reconciliation ble hoppet over.
  add column suspicious  boolean not null default false,
  add column reconciled  boolean not null default false,
  add column warnings    jsonb not null default '[]'::jsonb;

alter table public.sync_runs drop constraint sync_runs_status_check;
alter table public.sync_runs add constraint sync_runs_status_check
  check (status in ('running', 'success', 'partial', 'failed', 'suspicious'));


-- ---------------------------------------------------------------------------
-- admin_users: hvem som slipper inn på /admin. E-post, ikke user_id, slik at
-- tilgangen kan gis før brukeren har logget inn første gang.
-- ---------------------------------------------------------------------------
create table public.admin_users (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

insert into public.admin_users (email, note) values ('thomas@fink.no', 'Eier');

/**
 * Rollen til den som kaller.
 *
 * PostgREST setter både `request.jwt.claims` og `role`. Verdien kan være tom streng,
 * og da må den ikke castes til jsonb — derfor nullif. Uten begge deler (lokal PGlite, psql)
 * regnes kallet som betrodd; der er man allerede superbruker.
 */
create function public.request_claims()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create function public.request_role()
returns text
language sql
stable
as $$
  select coalesce(
    public.request_claims()->>'role',
    nullif(current_setting('role', true), 'none'),
    'service_role')
$$;

create function public.request_email()
returns text
language sql
stable
as $$
  select lower(coalesce(public.request_claims()->>'email', ''))
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.request_email() <> ''
     and exists (select 1 from admin_users a where lower(a.email) = public.request_email())
$$;

/** Admin (innlogget) eller sync-worker (service role). */
create function public.is_privileged()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.request_role() = 'service_role' or public.is_admin()
$$;

alter table public.admin_users enable row level security;
create policy "kun admin leser" on public.admin_users for select to authenticated using (public.is_admin());

create policy "admin leser kjøringer" on public.sync_runs for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- sync_requests: kø for «Kjør sync nå» fra /admin.
--
-- Webappen har bevisst ingen skrivenøkkel. Admin legger en forespørsel i køen via
-- en security definer-funksjon, og sync-worker (service role) utfører den.
-- ---------------------------------------------------------------------------
create table public.sync_requests (
  id           uuid primary key default gen_random_uuid(),
  provider_id  text not null references public.providers (id),
  mode         text not null check (mode in ('full', 'incremental')),
  -- Tvinger reconciliation selv om tallene ser mistenkelige ut. Kun bevisst admin-handling.
  force        boolean not null default false,
  status       text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed', 'cancelled')),
  requested_by text,
  requested_at timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  sync_run_id  uuid references public.sync_runs (id),
  error        text
);

-- Én åpen forespørsel per provider — knappetrykk skal ikke kunne kø opp arbeid.
create unique index sync_requests_open_idx on public.sync_requests (provider_id)
  where status in ('pending', 'running');
create index sync_requests_status_idx on public.sync_requests (status, requested_at);

alter table public.sync_requests enable row level security;
create policy "admin leser forespørsler" on public.sync_requests for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- sync_run_start / sync_run_finish: utvidet med trigger, varsler og mistenkelige kjøringer.
-- ---------------------------------------------------------------------------
drop function public.sync_run_start(text, text);

create function public.sync_run_start(p_provider_id text, p_mode text, p_trigger text default 'manual')
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into sync_runs (provider_id, mode, trigger) values (p_provider_id, p_mode, p_trigger)
  returning id into v_id;
  update providers set last_attempt_at = now(), updated_at = now() where id = p_provider_id;
  return v_id;
end;
$$;

drop function public.sync_run_finish(uuid, text, jsonb, text);

/**
 * Avslutter kjøringen og oppdaterer providerens tilstand.
 *
 * last_success_at settes KUN når kjøringen kan stoles på. En mistenkelig kjøring
 * teller derfor som feil for stale-detektoren, selv om data ble skrevet.
 * baseline_record_count oppdateres bare etter en kjøring vi stolte på.
 */
create function public.sync_run_finish(
  p_run_id uuid,
  p_status text,
  p_counts jsonb,
  p_error text default null,
  p_warnings jsonb default '[]'::jsonb,
  p_suspicious boolean default false,
  p_reconciled boolean default false
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_provider text;
  v_trusted boolean := p_status in ('success', 'partial');
begin
  update sync_runs set
    status = p_status,
    completed_at = now(),
    fetched = coalesce((p_counts->>'fetched')::integer, 0),
    accepted = coalesce((p_counts->>'accepted')::integer, 0),
    rejected = coalesce((p_counts->>'rejected')::integer, 0),
    records = coalesce((p_counts->>'records')::integer, 0),
    documents = coalesce((p_counts->>'documents')::integer, 0),
    inserted = coalesce((p_counts->>'inserted')::integer, 0),
    updated = coalesce((p_counts->>'updated')::integer, 0),
    unchanged = coalesce((p_counts->>'unchanged')::integer, 0),
    removed = coalesce((p_counts->>'removed')::integer, 0),
    failed = coalesce((p_counts->>'failed')::integer, 0),
    suspicious = p_suspicious,
    reconciled = p_reconciled,
    warnings = coalesce(p_warnings, '[]'::jsonb),
    error = left(p_error, 1000)
  where id = p_run_id
  returning provider_id into v_provider;

  update providers set
    last_sync_at = now(),
    last_run_status = p_status,
    last_success_at = case when v_trusted then now() else last_success_at end,
    consecutive_failures = case when v_trusted then 0 else consecutive_failures + 1 end,
    baseline_record_count = case
      when v_trusted then coalesce((p_counts->>'records')::integer, baseline_record_count)
      else baseline_record_count end,
    last_error = case when p_status = 'success' then null else left(p_error, 1000) end,
    status = case
      when status not in ('active', 'error') then status
      when v_trusted then 'active'
      else 'error' end,
    updated_at = now()
  where id = v_provider;
end;
$$;

-- ---------------------------------------------------------------------------
-- sync_due: hvilke providere som skal kjøres nå, og i hvilken modus.
-- Bruker last_attempt_at (ikke last_success_at), slik at en kilde som feiler
-- ikke blir forsøkt på nytt i løkke.
-- ---------------------------------------------------------------------------
create function public.sync_due(p_now timestamptz default now())
returns table (provider_id text, mode text, reason text)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    case when not p.supports_incremental
           or lf.last_full is null
           or lf.last_full < p_now - make_interval(hours => p.full_sync_interval_hours)
         then 'full' else 'incremental' end,
    case when p.last_attempt_at is null then 'aldri kjørt'
         else 'sist forsøkt ' || to_char(p.last_attempt_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || 'Z' end
  from providers p
  left join lateral (
    select max(r.started_at) as last_full
    from sync_runs r
    where r.provider_id = p.id and r.mode = 'full' and r.status in ('success', 'partial')
  ) lf on true
  -- 'error' = aktiv kilde der siste kjøring feilet. Den skal forsøkes igjen, ikke glemmes.
  where p.status in ('active', 'error')
    and p.kind in ('event', 'area_feature')
    and p.sync_interval_minutes is not null
    and (p.last_attempt_at is null
         or p.last_attempt_at < p_now - make_interval(mins => p.sync_interval_minutes))
  order by p.last_attempt_at nulls first, p.id
$$;

-- ---------------------------------------------------------------------------
-- provider_health: alt admin-siden og varsleren trenger, i ett kall.
-- ---------------------------------------------------------------------------
create function public.provider_health()
returns table (
  id text,
  name text,
  kind text,
  status text,
  status_reason text,
  supports_incremental boolean,
  sync_interval_minutes integer,
  full_sync_interval_hours integer,
  stale_after_hours integer,
  last_attempt_at timestamptz,
  last_sync_at timestamptz,
  last_success_at timestamptz,
  last_run_status text,
  last_error text,
  consecutive_failures integer,
  baseline_record_count integer,
  active_records bigint,
  removed_records bigint,
  documents bigint,
  alert_state text,
  alert_notified_at timestamptz,
  last_run jsonb,
  open_request jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.name, p.kind, p.status, p.status_reason,
    p.supports_incremental, p.sync_interval_minutes, p.full_sync_interval_hours, p.stale_after_hours,
    p.last_attempt_at, p.last_sync_at, p.last_success_at, p.last_run_status, p.last_error,
    p.consecutive_failures, p.baseline_record_count,
    case p.kind
      when 'event' then (select count(*) from events e where e.provider_id = p.id and e.removed_from_source_at is null)
      when 'area_feature' then (select count(*) from area_features a where a.provider_id = p.id and a.removed_from_source_at is null)
      else 0 end,
    case p.kind
      when 'event' then (select count(*) from events e where e.provider_id = p.id and e.removed_from_source_at is not null)
      when 'area_feature' then (select count(*) from area_features a where a.provider_id = p.id and a.removed_from_source_at is not null)
      else 0 end,
    case p.kind
      when 'event' then (select count(*) from event_documents d join events e on e.id = d.event_id where e.provider_id = p.id)
      else 0 end,
    p.alert_state, p.alert_notified_at,
    (select to_jsonb(r) - 'provider_id' from sync_runs r where r.provider_id = p.id order by r.started_at desc limit 1),
    (select to_jsonb(q) from sync_requests q
      where q.provider_id = p.id and q.status in ('pending', 'running')
      order by q.requested_at desc limit 1)
  from providers p
  where public.is_privileged()
  order by (p.sync_interval_minutes is null), p.kind, p.id
$$;

-- ---------------------------------------------------------------------------
-- recent_sync_runs: historikk på tvers av providere.
-- ---------------------------------------------------------------------------
create function public.recent_sync_runs(p_limit integer default 40, p_provider_id text default null)
returns table (
  id uuid,
  provider_id text,
  mode text,
  trigger text,
  status text,
  suspicious boolean,
  reconciled boolean,
  started_at timestamptz,
  completed_at timestamptz,
  fetched integer,
  accepted integer,
  rejected integer,
  records integer,
  inserted integer,
  updated integer,
  unchanged integer,
  removed integer,
  failed integer,
  warnings jsonb,
  error text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id, r.provider_id, r.mode, r.trigger, r.status, r.suspicious, r.reconciled,
    r.started_at, r.completed_at,
    r.fetched, r.accepted, r.rejected, r.records,
    r.inserted, r.updated, r.unchanged, r.removed, r.failed,
    r.warnings, r.error
  from sync_runs r
  where public.is_privileged()
    and (p_provider_id is null or r.provider_id = p_provider_id)
  order by r.started_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- ---------------------------------------------------------------------------
-- Køen: be om, plukke og avslutte en kjøring.
-- ---------------------------------------------------------------------------
create function public.request_sync(p_provider_id text, p_mode text default 'full', p_force boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_id uuid;
begin
  if not public.is_privileged() then
    raise exception 'ikke autorisert';
  end if;
  -- Også kilder med status 'error': det er nettopp da admin trenger å kjøre en sync.
  if not exists (select 1 from providers p where p.id = p_provider_id and p.status in ('active', 'error')
                   and p.kind in ('event', 'area_feature')) then
    raise exception 'ukjent eller inaktiv provider: %', p_provider_id;
  end if;

  select q.id into v_existing from sync_requests q
  where q.provider_id = p_provider_id and q.status in ('pending', 'running');
  if found then
    return v_existing;
  end if;

  insert into sync_requests (provider_id, mode, force, requested_by)
  values (p_provider_id, p_mode, p_force, nullif(public.request_email(), ''))
  returning id into v_id;
  return v_id;
end;
$$;

/** Plukker eldste ventende forespørsel. Kun sync-worker (service role). */
create function public.claim_sync_request()
returns table (id uuid, provider_id text, mode text, force boolean, requested_by text)
language plpgsql
set search_path = public
as $$
begin
  return query
  with next_request as (
    select q.id from sync_requests q
    where q.status = 'pending'
    order by q.requested_at
    limit 1
    for update skip locked
  )
  update sync_requests q
  set status = 'running', started_at = now()
  from next_request n
  where q.id = n.id
  returning q.id, q.provider_id, q.mode, q.force, q.requested_by;
end;
$$;

create function public.finish_sync_request(p_id uuid, p_status text, p_sync_run_id uuid default null, p_error text default null)
returns void
language sql
set search_path = public
as $$
  update sync_requests set
    status = p_status,
    finished_at = now(),
    sync_run_id = p_sync_run_id,
    error = left(p_error, 1000)
  where id = p_id
$$;

/** Rydder forespørsler som ble stående i «running» fordi worker døde. */
create function public.expire_stale_sync_requests(p_older_than interval default interval '30 minutes')
returns integer
language sql
set search_path = public
as $$
  with expired as (
    update sync_requests set status = 'failed', finished_at = now(),
      error = coalesce(error, 'Kjøringen ble aldri fullført (worker stoppet).')
    where status = 'running' and started_at < now() - p_older_than
    returning 1
  )
  select count(*)::integer from expired
$$;

-- ---------------------------------------------------------------------------
-- Varslingstilstand. Settes av varsleren slik at gjentatte feil ikke gir gjentatte varsler.
-- ---------------------------------------------------------------------------
create function public.set_alert_state(p_provider_id text, p_state text, p_notified boolean default false)
returns void
language sql
set search_path = public
as $$
  update providers set
    alert_state = p_state,
    alert_state_since = case when alert_state is distinct from p_state then now() else alert_state_since end,
    alert_notified_at = case when p_notified then now() else alert_notified_at end,
    updated_at = now()
  where id = p_provider_id
$$;

-- ---------------------------------------------------------------------------
-- Tilganger. Webappen kaller provider_health, recent_sync_runs og request_sync
-- med brukerens egen sesjon — funksjonene sjekker selv at kalleren er admin.
-- Alt som utfører arbeid er kun for service role.
-- ---------------------------------------------------------------------------
revoke execute on function public.sync_run_start(text, text, text) from public;
revoke execute on function public.sync_run_finish(uuid, text, jsonb, text, jsonb, boolean, boolean) from public;
revoke execute on function public.sync_due(timestamptz) from public;
revoke execute on function public.claim_sync_request() from public;
revoke execute on function public.finish_sync_request(uuid, text, uuid, text) from public;
revoke execute on function public.expire_stale_sync_requests(interval) from public;
revoke execute on function public.set_alert_state(text, text, boolean) from public;
revoke execute on function public.provider_health() from public;
revoke execute on function public.recent_sync_runs(integer, text) from public;
revoke execute on function public.request_sync(text, text, boolean) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.sync_run_start(text, text, text) from anon, authenticated';
    execute 'revoke execute on function public.sync_run_finish(uuid, text, jsonb, text, jsonb, boolean, boolean) from anon, authenticated';
    execute 'revoke execute on function public.sync_due(timestamptz) from anon, authenticated';
    execute 'revoke execute on function public.claim_sync_request() from anon, authenticated';
    execute 'revoke execute on function public.finish_sync_request(uuid, text, uuid, text) from anon, authenticated';
    execute 'revoke execute on function public.expire_stale_sync_requests(interval) from anon, authenticated';
    execute 'revoke execute on function public.set_alert_state(text, text, boolean) from anon, authenticated';
    execute 'revoke execute on function public.provider_health() from anon';
    execute 'revoke execute on function public.recent_sync_runs(integer, text) from anon';
    execute 'revoke execute on function public.request_sync(text, text, boolean) from anon';
    execute 'grant execute on function public.provider_health() to authenticated';
    execute 'grant execute on function public.recent_sync_runs(integer, text) to authenticated';
    execute 'grant execute on function public.request_sync(text, text, boolean) to authenticated';
    execute 'grant execute on function public.is_admin() to authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- provider_baseline: antall poster ved siste kjøring vi stolte på.
-- Sync-laget sammenligner mot dette for å oppdage unormale fall.
-- ---------------------------------------------------------------------------
create function public.provider_baseline(p_provider_id text)
returns integer
language sql
stable
set search_path = public
as $$
  select baseline_record_count from providers where id = p_provider_id
$$;

revoke execute on function public.provider_baseline(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.provider_baseline(text) from anon, authenticated';
  end if;
end;
$$;
