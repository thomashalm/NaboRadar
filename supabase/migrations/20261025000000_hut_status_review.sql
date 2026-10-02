-- ---------------------------------------------------------------------------
-- Hytter: en midlertidig stengt hytte skal ikke bli stående stengt for alltid.
--
-- «Midlertidig stengt» settes for hånd etter forvalterens side (`access_status = 'closed'`).
-- Ingen kilde oppdaterer den, så uten oppfølging blir den liggende til noen tilfeldigvis
-- oppdager at hytta har åpnet igjen. Derfor får hver stengt hytte en dato for neste kontroll:
--
--   * `status_review_at` settes når statusen settes — 60 dager fram som standard, eller det
--     antallet dager den som lagrer velger (30 for kortvarig stenging, 90 for «ubestemt tid»).
--   * `hut_status_queue()` gir admin de stengte hyttene, de som har forfalt først.
--   * `review_hut_status()` er de to utfallene av en kontroll: fortsatt stengt (ny dato), eller
--     åpen igjen (statusen og setningen om stenging fjernes).
--
-- Statusen oppheves aldri av seg selv. En forfalt kontroll betyr «se etter», ikke «åpen».
-- Kilden og kontrolltidspunktet er de samme som for overstyringene (`override_source_url`,
-- `override_verified_at`) — det er samme side som sier at hytta er stengt.
-- ---------------------------------------------------------------------------

alter table public.huts add column status_review_at timestamptz;

comment on column public.huts.status_review_at is
  'Når en midlertidig stenging skal kontrolleres på nytt. Satt så lenge access_status = closed.';

update public.huts
   set status_review_at = coalesce(override_verified_at, now()) + interval '60 days'
 where access_status = 'closed';

alter table public.huts
  add constraint huts_stengt_har_kontrolldato
  check (access_status <> 'closed' or status_review_at is not null);

drop function public.set_hut_overrides(uuid, text, text, text, text, text);

create function public.set_hut_overrides(
  p_hut_id uuid,
  p_type text,
  p_access text,
  p_status text,
  p_public_note text,
  p_source_url text,
  p_review_days integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type   text := nullif(trim(coalesce(p_type, '')), '');
  v_access text := nullif(trim(coalesce(p_access, '')), '');
  v_status text := coalesce(nullif(trim(coalesce(p_status, '')), ''), 'unknown');
  v_note   text := nullif(trim(coalesce(p_public_note, '')), '');
  v_url    text := nullif(trim(coalesce(p_source_url, '')), '');
  v_days   integer := least(greatest(coalesce(p_review_days, 60), 7), 365);
  v_tom    boolean;
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  v_tom := v_type is null and v_access is null and v_note is null and v_status = 'unknown';
  if not v_tom and v_url is null then
    raise exception 'En overstyring krever en kilde';
  end if;
  update huts set
    type_override = v_type,
    access_override = v_access,
    access_status = v_status,
    public_note = v_note,
    override_source_url = case when v_tom then null else v_url end,
    override_verified_at = case when v_tom then null else now() end,
    status_review_at = case when v_status = 'closed' then now() + make_interval(days => v_days) else null end,
    reviewed_by = public.request_email(),
    updated_at = now()
  where id = p_hut_id;
  if not found then
    raise exception 'Fant ikke hytta';
  end if;
end;
$$;

/** Stengte hytter, de som skal kontrolleres først. Bare for admin. */
create function public.hut_status_queue()
returns table (
  id uuid, name text, manager_name text, municipality_number text,
  access_status text, public_note text, source_url text,
  verified_at timestamptz, review_at timestamptz, overdue boolean, is_visible boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.name, coalesce(h.manager_verified, h.manager_name), h.municipality_number,
         h.access_status, h.public_note, h.override_source_url,
         h.override_verified_at, h.status_review_at, h.status_review_at <= now(),
         (h.confidence <> 'low' or h.last_verified_at is not null)
  from huts h
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and h.access_status = 'closed'
  order by h.status_review_at, h.name
$$;

/**
 * Utfallet av en statuskontroll.
 *
 *   still_closed  forvalterens side sier fortsatt stengt: ny kontrolldato
 *   reopened      hytta er åpen igjen: statusen fjernes, og setninger om stenging tas ut av den
 *                 offentlige merknaden. Resten av merknaden og overstyringene står.
 */
create function public.review_hut_status(p_hut_id uuid, p_action text, p_review_days integer default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hut  huts%rowtype;
  v_days integer := least(greatest(coalesce(p_review_days, 60), 7), 365);
  v_note text;
  v_tom  boolean;
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  select * into v_hut from huts where id = p_hut_id;
  if not found or v_hut.access_status <> 'closed' then
    raise exception 'Hytta står ikke som stengt';
  end if;

  if p_action = 'still_closed' then
    update huts set override_verified_at = now(),
                    status_review_at = now() + make_interval(days => v_days),
                    reviewed_by = public.request_email(), updated_at = now()
     where id = p_hut_id;

  elsif p_action = 'reopened' then
    -- Ta ut setningene som handler om stengingen; behold det andre brukeren trenger.
    select nullif(trim(string_agg(setning, ' ' order by nr)), '')
      into v_note
    from regexp_split_to_table(coalesce(v_hut.public_note, ''), '(?<=[.!?])\s+') with ordinality as t(setning, nr)
    where setning !~* 'stengt' and length(trim(setning)) > 0;
    v_tom := v_hut.type_override is null and v_hut.access_override is null and v_note is null;
    update huts set access_status = 'unknown',
                    status_review_at = null,
                    public_note = v_note,
                    override_source_url = case when v_tom then null else override_source_url end,
                    override_verified_at = case when v_tom then null else now() end,
                    reviewed_by = public.request_email(), updated_at = now()
     where id = p_hut_id;

  else
    raise exception 'Ukjent utfall: %', p_action;
  end if;
end;
$$;

do $$
declare
  v_fn text;
begin
  execute 'revoke execute on function public.set_hut_overrides(uuid, text, text, text, text, text, integer) from public';
  execute 'revoke execute on function public.hut_status_queue() from public';
  execute 'revoke execute on function public.review_hut_status(uuid, text, integer) from public';
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;
  foreach v_fn in array array[
    'public.set_hut_overrides(uuid, text, text, text, text, text, integer)',
    'public.hut_status_queue()',
    'public.review_hut_status(uuid, text, integer)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from anon';
    execute 'grant execute on function ' || v_fn || ' to authenticated';
  end loop;
end;
$$;
