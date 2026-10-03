-- ---------------------------------------------------------------------------
-- Hytter: terrenghøyden lagres per hytte i stedet for å hentes live på hyttesiden.
--
-- Før ble høyden slått opp i Kartverkets høydemodell (ws.geonorge.no/hoydedata) ved hver
-- visning, med tre sekunders frist og en cache som bare levde i minnet til én serverinstans.
-- Samme hytte fikk derfor noen ganger høyde og andre ganger ikke, og siden kunne ikke caches.
--
-- Nå beregnes høyden etter hyttesynken (og ved en nasjonal backfill) og lagres her:
--
--   terrain_elevation_m          avrundet til hel meter, samme regel som før; null når
--                                høydemodellen svarte uten verdi (utenfor dekning)
--   terrain_elevation_source     høydemodellens egen datakilde for punktet, f.eks. «dtm1»
--   terrain_elevation_checked_at når høydemodellen sist svarte for denne posisjonen
--   terrain_elevation_geom       posisjonen høyden gjelder. Flytter synken hytta, er den
--                                ulik `geom`, og høyden beregnes på nytt
--
-- En feil eller et tidsavbrudd skriver ingenting: da står forrige verdi til neste forsøk.
-- Kolonnene skrives bare av service role, via funksjonene nederst.
-- ---------------------------------------------------------------------------

alter table public.huts
  add column terrain_elevation_m integer,
  add column terrain_elevation_source text,
  add column terrain_elevation_checked_at timestamptz,
  add column terrain_elevation_geom extensions.geometry(Point, 4326);

comment on column public.huts.terrain_elevation_m is
  'Terrenghøyde i kartpunktet fra Kartverkets høydemodell, avrundet til hel meter. Beregnes etter sync, ikke ved visning.';
comment on column public.huts.terrain_elevation_geom is
  'Posisjonen terrain_elevation_m ble beregnet for. Ulik geom betyr at høyden må beregnes på nytt.';

-- Samme kolonner som før, pluss høyden til slutt. De offentlige funksjonene leser herfra.
create or replace view public.huts_public as
  select
    h.id, h.name,
    coalesce(h.type_override, h.hut_type) as hut_type,
    coalesce(h.owner_override, h.owner_kind) as owner_kind,
    coalesce(h.manager_verified, h.manager_name) as manager_name,
    h.access_status, h.locked,
    case
      when h.type_override in ('staffed_hut', 'self_service_hut', 'unstaffed_hut', 'open_cabin') then 'yes'
      when h.type_override in ('rest_cabin', 'day_trip_hut') then 'no'
      when h.type_override is not null then 'unknown'
      else h.overnight
    end as overnight,
    h.beds, h.booking_url, h.info_url, h.municipality_number,
    extensions.st_y(h.geom) as latitude, extensions.st_x(h.geom) as longitude,
    h.source_updated_at, h.last_seen_at, h.geom, h.name_key,
    h.alt_names || h.aliases as alt_names,
    array(select distinct f.provider_id
          from hut_sources s join area_features f on f.id = s.feature_id
          where s.hut_id = h.id and f.removed_from_source_at is null
          order by 1) as sources,
    coalesce(h.access_override,
             case h.locked when true then 'locked_prebooking' when false then 'unlocked_or_dnt_key' else 'unknown' end) as access_kind,
    h.public_note,
    array_remove(array[
      case when h.type_override is not null then 'type' end,
      case when h.access_override is not null then 'access' end,
      case when h.access_status <> 'unknown' then 'status' end,
      case when h.public_note is not null then 'note' end,
      case when h.owner_override is not null then 'owner' end
    ], null) as overridden,
    h.terrain_elevation_m
  from huts h
  where h.archived_at is null
    and h.rejected_at is null
    and (h.confidence <> 'low' or h.last_verified_at is not null);

-- Hyttesiden får høyden fra databasen. Samme filter og synlighet som før.
drop function public.get_hut(text);
create function public.get_hut(p_ref text)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, access_status text,
  locked boolean, overnight text, beds integer, booking_url text, info_url text,
  municipality_number text, latitude double precision, longitude double precision,
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[],
  access_kind text, public_note text, overridden text[], terrain_elevation_m integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources, p.access_kind, p.public_note, p.overridden,
         p.terrain_elevation_m
  from huts_public p
  where public.huts_visible()
    and p_ref ~ '^[0-9a-f]{8}$'
    and p.id::text like p_ref || '-%'
  order by p.id
  limit 2
$$;

/**
 * Hyttene som mangler høyde for posisjonen sin: aldri beregnet, eller flyttet siden sist.
 * Arkiverte hopper vi over; avviste og ubekreftede tas med, så de er klare hvis de godkjennes.
 */
create function public.huts_needing_elevation(p_limit integer default 500)
returns table (id uuid, latitude double precision, longitude double precision)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select h.id, extensions.st_y(h.geom), extensions.st_x(h.geom)
  from huts h
  where h.archived_at is null
    and (h.terrain_elevation_checked_at is null
         or h.terrain_elevation_geom is null
         or not extensions.st_orderingequals(h.terrain_elevation_geom, h.geom))
  order by h.terrain_elevation_checked_at nulls first, h.id
  limit least(greatest(coalesce(p_limit, 500), 1), 5000)
$$;

/**
 * Lagrer høyder fra høydemodellen. Hver rad: {id, lat, lng, elevation_m, source}.
 *
 * Skriver bare når hytta fortsatt står på posisjonen høyden ble slått opp for — har synken
 * flyttet den i mellomtiden, står raden urørt og plukkes opp neste gang. `elevation_m` kan være
 * null når høydemodellen svarte uten verdi; feil og tidsavbrudd sendes aldri hit.
 */
create function public.set_hut_elevations(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows må være en liste';
  end if;
  update huts h set
    terrain_elevation_m = (r->>'elevation_m')::integer,
    terrain_elevation_source = nullif(left(coalesce(r->>'source', ''), 40), ''),
    terrain_elevation_checked_at = now(),
    terrain_elevation_geom = h.geom
  from jsonb_array_elements(p_rows) r
  where h.id = (r->>'id')::uuid
    and extensions.st_y(h.geom) = (r->>'lat')::double precision
    and extensions.st_x(h.geom) = (r->>'lng')::double precision;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

do $$
declare
  v_fn text;
begin
  execute 'revoke all on public.huts_public from public';
  execute 'revoke all on public.huts_public from anon, authenticated';

  execute 'revoke execute on function public.get_hut(text) from public';
  execute 'grant execute on function public.get_hut(text) to anon, authenticated, service_role';

  -- Bare synken skriver høyder.
  foreach v_fn in array array[
    'public.huts_needing_elevation(integer)',
    'public.set_hut_elevations(jsonb)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    execute 'revoke execute on function ' || v_fn || ' from anon, authenticated';
    execute 'grant execute on function ' || v_fn || ' to service_role';
  end loop;
end;
$$;
