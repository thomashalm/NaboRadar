-- ---------------------------------------------------------------------------
-- Utforsk data (admin): plansaker innenfor et avgrenset område, og romindeks for flatene.
--
-- Samme prinsipp som explore_area_features (20261106000000): bare admin, alltid et utsnitt,
-- eventuelt en kommune- eller fylkesflate i tillegg, et tak på antall og forenklet geometri.
-- Flaten og utsnittet tolkes én gang, i variabler — ikke per rad.
--
-- Plansakene har tiltakstype og formål i event_enrichment, og dokumentene i event_documents.
-- Begge følger med i svaret, slik at detaljpanelet ikke trenger et kall per sak.
-- ---------------------------------------------------------------------------

-- area_features hadde bare romindeks på geom::geography (til «nær et punkt»). Utforsk data
-- spør «innenfor et utsnitt», på geom. Uten denne ble hver rad i datasettet sammenlignet med
-- utsnittet — merkbart for forurenset grunn, som har 16 000 flater.
create index if not exists area_features_geom_gix on public.area_features using gist (geom);

create function public.explore_events(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_area jsonb default null,
  p_limit integer default 800
)
returns table (
  id uuid,
  title text,
  type text,
  municipality_number text,
  announced_at date,
  source_url text,
  area_m2 double precision,
  attributes jsonb,
  documents jsonb,
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
  with treff as materialized (
    select e.id, e.title, e.type, e.municipality_number, e.announced_at, e.source_url,
           e.computed_area_m2, e.attributes, e.geom, e.centroid
    from events e
    where e.removed_from_source_at is null
      and e.geom && utsnitt
      and (flate is null or st_intersects(e.geom, flate))
  ),
  valgt as (
    -- Nyeste varsel først: når taket nås, er det de eldste som faller ut.
    select t.*, count(*) over () as total
    from treff t
    order by t.announced_at desc nulls last, t.id
    limit least(greatest(coalesce(p_limit, 800), 1), 2000)
  )
  select v.id, v.title, v.type, v.municipality_number, v.announced_at, v.source_url, v.computed_area_m2,
         v.attributes || public.event_enrichment_attributes(v.id),
         coalesce((
           select jsonb_agg(jsonb_build_object('type', d.type, 'title', d.title, 'url', d.url, 'date', d.document_date)
                            order by d.document_date desc nulls last, d.title)
           from event_documents d
           where d.event_id = v.id
         ), '[]'::jsonb),
         st_asgeojson(st_simplifypreservetopology(v.geom, toleranse), 6)::jsonb,
         st_asgeojson(v.centroid, 6)::jsonb,
         v.total
  from valgt v
  order by v.announced_at desc nulls last, v.id;
end;
$$;

-- Begge halvdeler må revokes, se migrasjon 20261002000000.
revoke execute on function public.explore_events(
  double precision, double precision, double precision, double precision, jsonb, integer) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.explore_events(
      double precision, double precision, double precision, double precision, jsonb, integer) from anon';
    execute 'grant execute on function public.explore_events(
      double precision, double precision, double precision, double precision, jsonb, integer) to authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';
