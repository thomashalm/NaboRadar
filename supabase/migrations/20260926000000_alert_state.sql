-- ---------------------------------------------------------------------------
-- NaboRadar — varslingstilstand per provider.
--
-- Reglene som skal håndheves:
--   * varsle kun ved «critical», aldri ved «warning»
--   * to påfølgende kritiske sjekker før første varsel (en forbigående 503 varsler ikke)
--   * høyst én påminnelse hver 12. time så lenge tilstanden varer
--   * recovery-varsel kun dersom det faktisk ble sendt et feilvarsel
--
-- Selve beslutningen tas i lib/alerts/state.ts (ren funksjon, testbar).
-- Databasen holder tilstanden mellom kjøringene.
-- ---------------------------------------------------------------------------
alter table public.providers
  add column alert_critical_streak integer not null default 0;

alter table public.providers drop constraint providers_alert_state_check;
alter table public.providers add constraint providers_alert_state_check
  check (alert_state in ('ok', 'pending', 'alerted'));

comment on column public.providers.alert_state is
  'ok = frisk, pending = én kritisk sjekk observert, alerted = feilvarsel sendt';

-- ---------------------------------------------------------------------------
-- set_alert_state: skriver tilstanden etter en varslingssjekk.
-- ---------------------------------------------------------------------------
drop function public.set_alert_state(text, text, boolean);

create function public.set_alert_state(
  p_provider_id text,
  p_state text,
  p_streak integer,
  p_notified boolean default false
)
returns void
language sql
set search_path = public
as $$
  update providers set
    alert_state = p_state,
    alert_critical_streak = greatest(p_streak, 0),
    alert_state_since = case when alert_state is distinct from p_state then now() else alert_state_since end,
    alert_notified_at = case when p_notified then now() else alert_notified_at end,
    updated_at = now()
  where id = p_provider_id
$$;

-- ---------------------------------------------------------------------------
-- provider_health utvides med varslingstilstanden, slik at både /admin og
-- varsleren ser det samme bildet i ett kall.
-- ---------------------------------------------------------------------------
drop function public.provider_health();

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
    p.alert_state, p.alert_critical_streak, p.alert_state_since, p.alert_notified_at,
    (select to_jsonb(r) - 'provider_id' from sync_runs r where r.provider_id = p.id order by r.started_at desc limit 1),
    (select to_jsonb(q) from sync_requests q
      where q.provider_id = p.id and q.status in ('pending', 'running')
      order by q.requested_at desc limit 1)
  from providers p
  where public.is_privileged()
  order by (p.sync_interval_minutes is null), p.kind, p.id
$$;

revoke execute on function public.set_alert_state(text, text, integer, boolean) from public;
revoke execute on function public.provider_health() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.set_alert_state(text, text, integer, boolean) from anon, authenticated';
    execute 'revoke execute on function public.provider_health() from anon';
    execute 'grant execute on function public.provider_health() to authenticated';
  end if;
end;
$$;
