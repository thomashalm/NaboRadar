-- ---------------------------------------------------------------------------
-- Manuelle sync-forespørsler: gjør feil synlige, og historikken lesbar.
--
-- To hull denne lukker:
--
--   1. `provider_health()` returnerte bare forespørsler med status `pending` eller `running`.
--      Feilet en manuell oppdatering, forsvant den i stillhet: kortet gikk rett tilbake til
--      knappen, og ingenting sa at forespørselen hadde feilet. Nå følger også den siste feilede
--      med, slik at admin kan se det som skjedde.
--
--   2. Det fantes ingen vei til historikken. `recent_sync_requests()` gir de siste forespørslene
--      per provider, til feilsøking — hvem ba om hva, når, hvor lenge den lå i kø, og hvilken
--      kjøring den ble.
--
-- Terskler for «ser fastlåst ut» hører ikke her. De beregnes i lib/sync/request-state.ts fra
-- tidsstemplene, av samme grunn som review-tilstandene: en beregnet tilstand kan ikke komme ut av
-- takt med virkeligheten, og trenger ingen jobb som holder den oppdatert.
--
-- Tilgangen er uendret: ingenting til anon, `is_privileged()`/`is_admin()` inne i funksjonen.
-- ---------------------------------------------------------------------------

drop function if exists public.provider_health();

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
  alert_critical_streak integer,
  alert_state_since timestamptz,
  alert_notified_at timestamptz,
  last_run jsonb,
  open_request jsonb,
  /** Siste manuelle forespørsel som feilet. Vises bare når den er nyere enn siste suksess. */
  last_failed_request jsonb
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
    p.alert_state, p.alert_critical_streak, p.alert_state_since, p.alert_notified_at,
    (select to_jsonb(r) - 'provider_id' from sync_runs r where r.provider_id = p.id order by r.started_at desc limit 1),
    (select to_jsonb(q) from sync_requests q
      where q.provider_id = p.id and q.status in ('pending', 'running')
      order by q.requested_at desc limit 1),
    (select to_jsonb(q) from sync_requests q
      where q.provider_id = p.id and q.status = 'failed'
      order by q.finished_at desc nulls last, q.requested_at desc limit 1)
  from providers p
  where public.is_privileged()
  order by (p.sync_interval_minutes is null), p.kind, p.id
$$;

/**
 * De siste manuelle forespørslene, til feilsøking.
 *
 * Hele poenget er å kunne følge kjeden: hvem ba om hva, når den lå i kø, når den startet, hvilken
 * `sync_run` den ble, og hva som gikk galt. Feilteksten kuttes her, slik at UI-et aldri får en hel
 * stacktrace å vise.
 */
create function public.recent_sync_requests(p_limit integer default 5)
returns table (
  id uuid,
  provider_id text,
  mode text,
  force boolean,
  status text,
  requested_by text,
  requested_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  sync_run_id uuid,
  error text,
  /** Kjøringens utfall, når forespørselen rakk å bli en kjøring. */
  run_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.provider_id, q.mode, q.force, q.status, q.requested_by,
         q.requested_at, q.started_at, q.finished_at, q.sync_run_id,
         left(q.error, 200), r.status
  from (
    select q.*, row_number() over (partition by q.provider_id order by q.requested_at desc) as nr
    from sync_requests q
  ) q
  left join sync_runs r on r.id = q.sync_run_id
  where public.is_privileged() and q.nr <= greatest(1, least(coalesce(p_limit, 5), 20))
  order by q.provider_id, q.requested_at desc
$$;

do $$
begin
  execute 'revoke execute on function public.provider_health() from public';
  execute 'revoke execute on function public.recent_sync_requests(integer) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.provider_health() from anon';
    execute 'revoke execute on function public.recent_sync_requests(integer) from anon';
    execute 'grant execute on function public.provider_health() to authenticated';
    execute 'grant execute on function public.recent_sync_requests(integer) to authenticated';
  end if;
end;
$$;
