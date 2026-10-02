-- ---------------------------------------------------------------------------
-- Hytter: neste steg for en hytte som må bestilles.
--
-- Kartverket sier om en hytte er «Låst», som i kodelisten betyr «låst og krever
-- forhåndsbooking». Da må siden også kunne si hvor man bestiller, eller hvem som driver hytta —
-- eller si rett ut at vi ikke vet. Kildene gir sjelden svaret: N50 har bare en eierkategori, og
-- Turrutebasen navngir en konkret forvalter for et fåtall. Resten må legges inn for hånd.
--
-- Derfor:
--   * `manager_verified` er forvalteren et menneske har kontrollert mot en offisiell side. Den
--     går foran navnet fra Turrutebasen, og overlever synken (som bare skriver `manager_name`).
--   * `contact_note` sier hvor opplysningene ble kontrollert. Intern; returneres aldri offentlig.
--   * `set_hut_contact` erstatter `set_hut_links`: lenker, forvalter og notat lagres samlet, og
--     `links_verified_at` er tidspunktet for kontrollen av alle tre.
--   * `hut_contact_list` er adminlisten: låste hytter og det de mangler.
--
-- Ingen nye offentlige funksjoner. De offentlige leser `huts_public`, som nå gir den
-- kontrollerte forvalteren når den finnes.
-- ---------------------------------------------------------------------------

alter table public.huts
  add column manager_verified text
    check (manager_verified is null or length(trim(manager_verified)) between 2 and 120),
  add column contact_note text
    check (contact_note is null or length(contact_note) <= 500);

comment on column public.huts.manager_verified is
  'Forvalter kontrollert for hånd mot en offisiell side. Går foran manager_name fra kildene.';
comment on column public.huts.contact_note is
  'Hvor lenker og forvalter ble kontrollert. Intern.';

-- En kontrollert forvalter er, som en lenke, en påstand noen har gått god for.
alter table public.huts
  add constraint huts_forvalter_er_kontrollert
  check (manager_verified is null or links_verified_at is not null);

-- Samme kolonner som før; bare forvalteren er endret. Alle offentlige funksjoner leser herfra.
create or replace view public.huts_public as
  select
    h.id, h.name, h.hut_type, h.owner_kind,
    coalesce(h.manager_verified, h.manager_name) as manager_name,
    h.access_status, h.locked,
    h.overnight, h.beds, h.booking_url, h.info_url, h.municipality_number,
    extensions.st_y(h.geom) as latitude, extensions.st_x(h.geom) as longitude,
    h.source_updated_at, h.last_seen_at, h.geom, h.name_key, h.alt_names,
    array(select distinct f.provider_id
          from hut_sources s join area_features f on f.id = s.feature_id
          where s.hut_id = h.id and f.removed_from_source_at is null
          order by 1) as sources
  from huts h
  where h.archived_at is null
    and h.rejected_at is null
    and (h.confidence <> 'low' or h.last_verified_at is not null);

drop function public.set_hut_links(uuid, text, text);

/**
 * Setter lenkene og forvalteren på en hytte. Tomme verdier fjerner opplysningen. Å kalle denne
 * er selve kontrollen: den som lagrer, går god for at lenken gjelder hytta og at forvalteren
 * er den den offisielle siden oppgir.
 */
create function public.set_hut_contact(
  p_hut_id uuid,
  p_booking_url text,
  p_info_url text,
  p_manager text,
  p_note text
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
  v_tom     boolean;
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  v_tom := v_booking is null and v_info is null and v_manager is null;
  update huts set
    booking_url = v_booking,
    info_url = v_info,
    manager_verified = v_manager,
    -- Et notat uten noe å kontrollere er ikke en kontroll.
    contact_note = case when v_tom then null else v_note end,
    links_verified_at = case when v_tom then null else now() end,
    reviewed_by = public.request_email(),
    updated_at = now()
  where id = p_hut_id;
  if not found then
    raise exception 'Fant ikke hytta';
  end if;
end;
$$;

/**
 * Adminlisten over kontaktopplysninger. Uten søk: låste hytter, og hytter som har fått en lenke
 * eller forvalter — de som mangler mest, først. Med søk: hyttene som passer navnet.
 *
 * `manager_name` er forvalteren slik den vises (kontrollert, ellers kildens); `manager_source`
 * er kildens alene, så det går an å se hva som er lagt inn for hånd.
 */
create function public.hut_contact_list(p_q text default null)
returns table (
  id uuid, name text, hut_type text, owner_kind text, locked boolean,
  manager_name text, manager_verified text, manager_source text,
  booking_url text, info_url text, links_verified_at timestamptz, contact_note text,
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
         h.booking_url, h.info_url, h.links_verified_at, h.contact_note,
         h.municipality_number, st_y(h.geom), st_x(h.geom),
         (h.confidence <> 'low' or h.last_verified_at is not null)
  from huts h, nokkel n
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and case
          when length(n.k) >= 2 then
            h.name_key like '%' || n.k || '%'
            or exists (select 1 from unnest(h.alt_names) a where public.hut_name_key(a) like '%' || n.k || '%')
          else
            h.locked is true or h.booking_url is not null or h.info_url is not null or h.manager_verified is not null
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
  execute 'revoke execute on function public.set_hut_contact(uuid, text, text, text, text) from public';
  execute 'revoke execute on function public.hut_contact_list(text) from public';
  execute 'revoke all on public.huts_public from public';

  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;

  execute 'revoke all on public.huts_public from anon, authenticated';

  foreach v_fn in array array[
    'public.set_hut_contact(uuid, text, text, text, text)',
    'public.hut_contact_list(text)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from anon';
    execute 'grant execute on function ' || v_fn || ' to authenticated';
  end loop;
end;
$$;
