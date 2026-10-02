-- ---------------------------------------------------------------------------
-- Hytter: adminlisten kan vise DNT-hyttene som mangler forening eller lenke.
--
-- `hut_contact_list()` uten søk viser låste hytter uten bestillingsside. DNT-hyttene som
-- mangler kontrollert forening eller offisiell lenke, er nesten alle ulåste, og sto derfor ikke
-- i noen liste — de kunne bare finnes ved å søke på navn.
--
-- Ny valgfri parameter `p_view`:
--   * null       som før
--   * 'dnt_gap'  hytter som vises, har eierkategori DNT og mangler kontrollert forening eller
--                lenke. Vanlige hytter (betjent, selvbetjent, ubetjent) står først; rastebuer
--                og nødbuer uten egen side er ventet og står sist.
--
-- Årsaken står i det interne notatet (`contact_note`), som listen allerede returnerer.
-- ---------------------------------------------------------------------------

drop function public.hut_contact_list(text);

create function public.hut_contact_list(p_q text default null, p_view text default null)
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
          when p_view = 'dnt_gap' then
            h.owner_kind = 'dnt'
            and (h.manager_verified is null or (h.booking_url is null and h.info_url is null))
            and (h.confidence <> 'low' or h.last_verified_at is not null)
          else
            h.locked is true and h.booking_url is null
            and (h.confidence <> 'low' or h.last_verified_at is not null)
        end
  order by
    (p_view = 'dnt_gap' and coalesce(h.type_override, h.hut_type) in ('rest_cabin', 'day_trip_hut')) asc nulls first,
    (h.info_url is not null) asc,
    (coalesce(h.manager_verified, h.manager_name) is not null) asc,
    h.name, h.id
  limit 100
$$;

do $$
begin
  execute 'revoke execute on function public.hut_contact_list(text, text) from public';
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;
  execute 'revoke execute on function public.hut_contact_list(text, text) from anon';
  execute 'grant execute on function public.hut_contact_list(text, text) to authenticated';
end;
$$;
