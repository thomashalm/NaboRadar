-- ---------------------------------------------------------------------------
-- features_near returnerer nå kildens egen ID og geometrien.
--
-- Bakgrunn: forurenset grunn vises som konkrete lokaliteter med navn, og en
-- lokalitet skal kunne tegnes som flate i kartet. Da trenger visningen både
-- `external_id` (kildens lokalitet-ID, vises under «Detaljer») og geometrien.
--
-- Geometrien forenkles til ~0,5 m før den sendes, og svært store geometrier
-- (over 5 000 punkter, typisk kvikkleiresoner) returneres som null i stedet for
-- å blåse opp svaret. Kallet er fortsatt ett rundturskall per søk.
-- ---------------------------------------------------------------------------
drop function public.features_near(double precision, double precision, double precision, text[], integer);

create function public.features_near(
  lat double precision,
  lng double precision,
  radius_m double precision,
  categories text[] default null,
  max_results integer default 300
)
returns table (
  id uuid,
  provider_id text,
  external_id text,
  category text,
  subtype text,
  title text,
  distance_m double precision,
  contains boolean,
  attributes jsonb,
  source_url text,
  source_url_type text,
  source_updated_at timestamptz,
  centroid jsonb,
  geometry jsonb
)
language sql
stable
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326) as g4326,
           st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select
    a.id, a.provider_id, a.external_id, a.category, a.subtype, a.title,
    st_distance(a.geom::geography, o.g),
    st_intersects(a.geom, o.g4326),
    a.attributes, a.source_url, a.source_url_type, a.source_updated_at,
    st_asgeojson(a.centroid, 6)::jsonb,
    case
      when st_npoints(a.geom) <= 5000
        then st_asgeojson(st_simplifypreservetopology(a.geom, 0.000005), 6)::jsonb
    end
  from area_features a, origin o
  where radius_m > 0 and radius_m <= 10000
    and a.removed_from_source_at is null
    and (categories is null or a.category = any (categories))
    and st_dwithin(a.geom::geography, o.g, radius_m)
  order by st_distance(a.geom::geography, o.g), a.title
  limit least(greatest(max_results, 1), 1000)
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.features_near(double precision, double precision, double precision, text[], integer) to anon, authenticated';
  end if;
end;
$$;
