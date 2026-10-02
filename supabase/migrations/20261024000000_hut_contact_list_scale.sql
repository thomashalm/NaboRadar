-- ---------------------------------------------------------------------------
-- Hytter: adminlisten etter nasjonal import og DNT-berikelse.
--
-- `hut_contact_list()` uten søk returnerte alle låste hytter og alle som hadde fått noe lagt
-- inn for hånd. Med hele landet er det over 900 rader, og listen ble kuttet på 500. Listen skal
-- vise det som trenger arbeid, ikke alt som er gjort:
--
--   * uten søk: låste hytter som mangler bestillingsside, de som mangler mest først, høyst 100
--   * med søk: som før — alle hytter som passer navnet
--
-- Tellingen som sto over listen, regnes nå i databasen (`hut_contact_summary`), så den gjelder
-- alle låste hytter og ikke bare dem som fikk plass i listen.
-- ---------------------------------------------------------------------------

drop function public.hut_contact_list(text);

create function public.hut_contact_list(p_q text default null)
returns table (
  id uuid, name text, hut_type text, owner_kind text, locked boolean,
  manager_name text, manager_verified text, manager_source text,
  booking_url text, info_url text, links_verified_at timestamptz, contact_note text,
  aliases text[],
  municipality_number text, latitude double precision, longitude double precision,
  is_visible boolean,
  type_override text, access_override text, access_status text, public_note text,
  override_source_url text, override_verified_at timestamptz
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
         (h.confidence <> 'low' or h.last_verified_at is not null),
         h.type_override, h.access_override, h.access_status, h.public_note,
         h.override_source_url, h.override_verified_at
  from huts h, nokkel n
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and case
          when length(n.k) >= 2 then
            h.name_key like '%' || n.k || '%'
            or exists (select 1 from unnest(h.alt_names || h.aliases) a where public.hut_name_key(a) like '%' || n.k || '%')
          else
            h.locked is true and h.booking_url is null
            and (h.confidence <> 'low' or h.last_verified_at is not null)
        end
  order by
    (h.info_url is not null) asc,
    (coalesce(h.manager_verified, h.manager_name) is not null) asc,
    h.name, h.id
  limit 100
$$;

/**
 * Hvor langt vi har kommet med neste steg for de låste hyttene som vises. Samme fire tilstander
 * som `hutNextStep` i applikasjonen.
 */
create function public.hut_contact_summary()
returns table (kind text, antall bigint)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select case
           when h.booking_url is not null then 'booking_link'
           when h.info_url is not null then 'info_link'
           when coalesce(h.manager_verified, h.manager_name) is not null then 'manager_only'
           else 'unknown'
         end,
         count(*)
  from huts h
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and (h.confidence <> 'low' or h.last_verified_at is not null)
    and h.locked is true
  group by 1
$$;

do $$
declare
  v_fn text;
begin
  execute 'revoke execute on function public.hut_contact_list(text) from public';
  execute 'revoke execute on function public.hut_contact_summary() from public';
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;
  foreach v_fn in array array['public.hut_contact_list(text)', 'public.hut_contact_summary()'] loop
    execute 'revoke execute on function ' || v_fn || ' from anon';
    execute 'grant execute on function ' || v_fn || ' to authenticated';
  end loop;
end;
$$;
