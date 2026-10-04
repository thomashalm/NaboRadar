-- ---------------------------------------------------------------------------
-- Utforsk data (admin): flater og punkter fra ett datasett, innenfor et avgrenset område.
--
-- Datautforskeren i /admin/research/utforsk viser strukturerte datasett direkte i kartet. De
-- offentlige lese-RPC-ene spør «hva ligger nær dette punktet», med radius på høyst 10 km. Her er
-- spørsmålet «hva finnes i denne kommunen» eller «i dette kartutsnittet», og det trenger en egen,
-- liten lesefunksjon.
--
-- Avgrenset med vilje:
--   - bare admin får rader (is_admin() sjekkes først; anon har ikke EXECUTE)
--   - alltid et utsnitt, og eventuelt en kommune- eller fylkesflate i tillegg
--   - høyst 2 000 objekter per kall, de største først; `total` sier hvor mange som fantes
--   - geometrien forenkles etter utsnittets bredde, så et helt fylke ikke blir megabyte
--
-- Ingen bulkeksport: funksjonen kan ikke gi mer enn det kartet skal tegne.
-- ---------------------------------------------------------------------------

create function public.explore_area_features(
  p_provider_id text,
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_area jsonb default null,
  p_limit integer default 1500
)
returns table (
  id uuid,
  external_id text,
  title text,
  subtype text,
  attributes jsonb,
  source_url text,
  source_updated_at timestamptz,
  geometry jsonb,
  center jsonb,
  total bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  -- Flaten og utsnittet regnes ut én gang. Som del av spørringen ble kommuneflaten — flere
  -- hundre kilobyte GeoJSON — tolket på nytt for hver rad, og Oslo tok halvannet minutt.
  utsnitt geometry := st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326);
  flate geometry := case when p_area is null then null else st_setsrid(st_geomfromgeojson(p_area::text), 4326) end;
  -- Rundt en fire-tusendel av bredden: usynlig i kartet, men holder svaret lite.
  toleranse double precision := greatest(0.00002, (p_max_lng - p_min_lng) / 4000);
begin
  if not coalesce(public.is_admin(), false) then
    return;
  end if;
  if p_min_lng is null or p_min_lat is null or p_max_lng is null or p_max_lat is null
     or p_min_lng >= p_max_lng or p_min_lat >= p_max_lat then
    return;
  end if;

  return query
  with treff as materialized (
    select a.id, a.external_id, a.title, a.subtype, a.attributes, a.source_url, a.source_updated_at, a.geom, a.centroid
    from area_features a
    where a.provider_id = p_provider_id
      and a.removed_from_source_at is null
      and a.geom && utsnitt
      and (flate is null or st_intersects(a.geom, flate))
  )
  select t.id, t.external_id, t.title, t.subtype, t.attributes, t.source_url, t.source_updated_at,
         st_asgeojson(st_simplifypreservetopology(t.geom, toleranse), 6)::jsonb,
         st_asgeojson(t.centroid, 6)::jsonb,
         count(*) over ()
  from treff t
  order by st_area(t.geom) desc, t.id
  limit least(greatest(coalesce(p_limit, 1500), 1), 2000);
end;
$$;

-- Begge halvdeler må revokes, se migrasjon 20261002000000.
revoke execute on function public.explore_area_features(
  text, double precision, double precision, double precision, double precision, jsonb, integer) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.explore_area_features(
      text, double precision, double precision, double precision, double precision, jsonb, integer) from anon';
    execute 'grant execute on function public.explore_area_features(
      text, double precision, double precision, double precision, double precision, jsonb, integer) to authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';
