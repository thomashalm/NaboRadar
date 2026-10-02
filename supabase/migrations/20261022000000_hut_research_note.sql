-- ---------------------------------------------------------------------------
-- Hytter: internt notat uten kontakt, og andre navn lagt inn for hånd.
--
-- Kontrollen av alle 58 pilothyttene (runde 6) ga to ting modellen ikke kunne ta imot:
--
--   1. Et notat om en hytte der kontrollen endte uten kontakt. «Ingen offisiell side funnet,
--      disse kildene er sjekket» er også et resultat, og skal ikke måtte gjøres på nytt.
--      `set_hut_contact` kastet notatet når lenker og forvalter var tomme.
--
--   2. Navnet forvalteren bruker når det ikke er Kartverkets: «Bekkensten» for Bekkenstein,
--      «Store Tømtehytta» for Tømtehytta, «Styrbord - Gressholmen». `alt_names` bygges av
--      synken fra kildepostene og overskrives hver gang, så et navn lagt inn for hånd trenger
--      en egen kolonne. Det kanoniske navnet endres ikke — det følger fortsatt Kartverket.
--
-- Ingen nye offentlige funksjoner. `huts_public.alt_names` får med de manuelle navnene, så
-- navnesøket finner dem.
-- ---------------------------------------------------------------------------

alter table public.huts
  add column aliases text[] not null default '{}'
    check (cardinality(aliases) <= 10);

comment on column public.huts.aliases is
  'Andre navn lagt inn for hånd, typisk forvalterens. Synken rører dem ikke. Brukes i søk.';

create or replace view public.huts_public as
  select
    h.id, h.name, h.hut_type, h.owner_kind,
    coalesce(h.manager_verified, h.manager_name) as manager_name,
    h.access_status, h.locked,
    h.overnight, h.beds, h.booking_url, h.info_url, h.municipality_number,
    extensions.st_y(h.geom) as latitude, extensions.st_x(h.geom) as longitude,
    h.source_updated_at, h.last_seen_at, h.geom, h.name_key,
    h.alt_names || h.aliases as alt_names,
    array(select distinct f.provider_id
          from hut_sources s join area_features f on f.id = s.feature_id
          where s.hut_id = h.id and f.removed_from_source_at is null
          order by 1) as sources
  from huts h
  where h.archived_at is null
    and h.rejected_at is null
    and (h.confidence <> 'low' or h.last_verified_at is not null);

drop function public.set_hut_contact(uuid, text, text, text, text);

/**
 * Setter lenkene, forvalteren, notatet og andre navn på en hytte. Tomme verdier fjerner
 * opplysningen. Å kalle denne er selve kontrollen: den som lagrer, går god for at lenken
 * gjelder hytta og at forvalteren er den den offisielle siden oppgir.
 *
 * Notatet kan stå alene. `links_verified_at` er tidspunktet hytta sist ble kontrollert, også
 * når kontrollen endte med at det ikke finnes noe å lenke til.
 */
create function public.set_hut_contact(
  p_hut_id uuid,
  p_booking_url text,
  p_info_url text,
  p_manager text,
  p_note text,
  p_aliases text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking text := nullif(trim(coalesce(p_booking_url, '')), '');
  v_info    text := nullif(trim(coalesce(p_info_url, '')), '');
  v_manager text := nullif(trim(coalesce(p_manager, '')), '');
  v_note    text := nullif(trim(coalesce(p_note, '')), '');
  v_aliases text[];
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct navn order by navn), '{}')
    into v_aliases
  from (select trim(a) as navn from unnest(coalesce(p_aliases, '{}')) a) x
  where length(navn) between 2 and 80;

  update huts set
    booking_url = v_booking,
    info_url = v_info,
    manager_verified = v_manager,
    contact_note = v_note,
    aliases = v_aliases,
    links_verified_at = case
      when v_booking is null and v_info is null and v_manager is null and v_note is null then null
      else now()
    end,
    reviewed_by = public.request_email(),
    updated_at = now()
  where id = p_hut_id;
  if not found then
    raise exception 'Fant ikke hytta';
  end if;
end;
$$;

drop function public.hut_contact_list(text);

/**
 * Adminlisten over kontaktopplysninger. Uten søk: låste hytter, og hytter som har fått en
 * lenke, en forvalter eller et notat — de som mangler mest, først. Med søk: hyttene som passer
 * navnet, også på et navn lagt inn for hånd.
 */
create function public.hut_contact_list(p_q text default null)
returns table (
  id uuid, name text, hut_type text, owner_kind text, locked boolean,
  manager_name text, manager_verified text, manager_source text,
  booking_url text, info_url text, links_verified_at timestamptz, contact_note text,
  aliases text[],
  municipality_number text, latitude double precision, longitude double precision,
  is_visible boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with nokkel as (select public.hut_name_key(coalesce(p_q, '')) as k)
  select h.id, h.name, h.hut_type, h.owner_kind, h.locked,
         coalesce(h.manager_verified, h.manager_name), h.manager_verified, h.manager_name,
         h.booking_url, h.info_url, h.links_verified_at, h.contact_note, h.aliases,
         h.municipality_number, st_y(h.geom), st_x(h.geom),
         (h.confidence <> 'low' or h.last_verified_at is not null)
  from huts h, nokkel n
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and case
          when length(n.k) >= 2 then
            h.name_key like '%' || n.k || '%'
            or exists (select 1 from unnest(h.alt_names || h.aliases) a where public.hut_name_key(a) like '%' || n.k || '%')
          else
            h.locked is true or h.booking_url is not null or h.info_url is not null
            or h.manager_verified is not null or h.contact_note is not null
        end
  order by
    (h.locked is true) desc,
    (h.booking_url is not null) asc,
    (h.info_url is not null) asc,
    (coalesce(h.manager_verified, h.manager_name) is not null) asc,
    h.name, h.id
  limit 500
$$;

do $$
declare
  v_fn text;
begin
  execute 'revoke execute on function public.set_hut_contact(uuid, text, text, text, text, text[]) from public';
  execute 'revoke execute on function public.hut_contact_list(text) from public';
  execute 'revoke all on public.huts_public from public';

  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;

  execute 'revoke all on public.huts_public from anon, authenticated';

  foreach v_fn in array array[
    'public.set_hut_contact(uuid, text, text, text, text, text[])',
    'public.hut_contact_list(text)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from anon';
    execute 'grant execute on function ' || v_fn || ' to authenticated';
  end loop;
end;
$$;
