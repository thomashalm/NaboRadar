-- ---------------------------------------------------------------------------
-- explore_mires: raskere avstandsberegning.
--
-- Første versjon målte avstanden fra hver myr til funnene på ellipsoiden (geography). Det var
-- riktig, men tok 0,85 s for Oslo og 2 s for et fylke. Nå regnes myrene og funnene om til UTM 33
-- én gang, og avstanden måles i planet. Målestokkfeilen i UTM 33 ved Oslo er ca. 0,03 % — 15 cm
-- på 500 m — og panelet runder til ti meter. Arealet regnes fortsatt på ellipsoiden.
--
-- Samme signatur, samme svar, samme rettigheter.
-- ---------------------------------------------------------------------------

create or replace function public.explore_mires(
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
  area_m2 double precision,
  finds_500 integer,
  nearest_m double precision,
  nearest_id uuid,
  nearest_year integer,
  total bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  utsnitt geometry := st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326);
  flate geometry := case when p_area is null then null else st_setsrid(st_geomfromgeojson(p_area::text), 4326) end;
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
  with myr as materialized (
    select a.id, a.external_id, a.title, a.subtype, a.attributes, a.source_url, a.source_updated_at, a.geom, a.centroid,
           st_area(a.geom::geography) as area_m2
    from area_features a
    where a.provider_id = 'kartverket-n50-myr-oslomarka'
      and a.removed_from_source_at is null
      and a.geom && utsnitt
      and (flate is null or st_intersects(a.geom, flate))
  ),
  valgt as materialized (
    select m.*, st_transform(m.geom, 25833) as utm, count(*) over () as total
    from myr m
    order by m.area_m2 desc, m.id
    limit least(greatest(coalesce(p_limit, 1500), 1), 2000)
  ),
  -- Funnene i og rundt utsnittet, regnet om til UTM 33 én gang. Det er noen hundre punkter.
  funn as materialized (
    select b.id, (b.attributes ->> 'aar')::integer as aar, st_transform(b.geom, 25833) as utm
    from area_features b
    where b.provider_id = 'gbif-multefunn-oslomarka'
      and b.removed_from_source_at is null
      and b.geom && st_expand(utsnitt, 0.04, 0.02)
  )
  select v.id, v.external_id, v.title, v.subtype, v.attributes, v.source_url, v.source_updated_at,
         st_asgeojson(st_simplifypreservetopology(v.geom, toleranse), 6)::jsonb,
         st_asgeojson(v.centroid, 6)::jsonb,
         v.area_m2,
         coalesce(n.innen_500, 0)::integer,
         n.naermeste_m,
         n.naermeste_id,
         n.naermeste_aar,
         v.total
  from valgt v
  left join lateral (
    select count(*) filter (where x.m <= 500) as innen_500,
           min(x.m) as naermeste_m,
           (array_agg(x.id order by x.m, x.id))[1] as naermeste_id,
           (array_agg(x.aar order by x.m, x.id))[1] as naermeste_aar
    from (
      select f.id, f.aar, st_distance(f.utm, v.utm) as m
      from funn f
      -- Boksen først: avstanden regnes bare ut for funn som kan ligge innen 2 km.
      where f.utm && st_expand(v.utm, 2000)
    ) x
    where x.m <= 2000
  ) n on true
  order by v.area_m2 desc, v.id;
end;
$$;


notify pgrst, 'reload schema';
