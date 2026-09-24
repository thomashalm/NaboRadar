-- ---------------------------------------------------------------------------
-- features_count_near: hvor mange objekter kilden faktisk har i området.
--
-- features_near har en radgrense, fordi vi ikke vil sende hundrevis av rader til
-- nettleseren. Da blir antallet i «73 steder med skjenkebevilling innen 1 km» feil
-- så snart grensen treffes. Tellingen gjøres derfor i databasen, på nøyaktig samme
-- filter som features_near, slik at teksten er sann selv når listen er kuttet.
-- ---------------------------------------------------------------------------
create function public.features_count_near(
  lat double precision,
  lng double precision,
  radius_m double precision,
  categories text[] default null
)
returns table (category text, antall bigint)
language sql
stable
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select a.category, count(*)
  from area_features a, origin o
  where radius_m > 0 and radius_m <= 10000
    and a.removed_from_source_at is null
    and (categories is null or a.category = any (categories))
    and st_dwithin(a.geom::geography, o.g, radius_m)
  group by a.category
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.features_count_near(double precision, double precision, double precision, text[]) to anon, authenticated';
  end if;
end;
$$;
