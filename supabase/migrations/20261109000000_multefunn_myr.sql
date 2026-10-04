-- ---------------------------------------------------------------------------
-- Multefunn og myr i Oslo og Marka: internt researchlag i admin (Utforsk data).
--
-- Bakgrunn: docs/research/multer-oslo.md. En habitatscore ble i praksis et myrkart, så vi lagrer
-- dataene i stedet: registrerte multefunn (GBIF, CC BY 4.0 / CC0) og myrflater (Kartverket N50,
-- CC BY 4.0). Ingen score og ingen sannsynlighet.
--
-- ALDRI OFFENTLIG. Kategorien `natur_intern` er upublisert, så de offentlige lese-RPC-ene
-- (features_near m.fl.) gir den ikke. Dataene leses bare gjennom admin-funksjonene
-- explore_area_features og explore_mires.
--
-- Kildene har ingen tidsplan (sync_interval_minutes er null): de synkes for hånd med
-- `npm run sync:area -- --provider=<id>`.
-- ---------------------------------------------------------------------------

insert into public.area_feature_categories (category, domain, label, is_public) values
  ('natur_intern', 'natur', 'Multefunn og myr (intern research)', false);

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('gbif-multefunn-oslomarka', 'Registrerte multefunn, Oslo og Marka (GBIF)', 'area_feature', 'active',
   'Internt researchlag. Synkes for hånd.',
   'Per registrering: CC BY 4.0 eller CC0', 'https://creativecommons.org/licenses/by/4.0/',
   false, null, null, null),
  ('kartverket-n50-myr-oslomarka', 'Myr i N50 Kartdata, Oslo og Marka (Kartverket)', 'area_feature', 'active',
   'Internt researchlag. Synkes for hånd.',
   'Creative Commons Navngivelse 4.0 (CC BY 4.0)', 'https://creativecommons.org/licenses/by/4.0/',
   false, null, null, null);

-- ---------------------------------------------------------------------------
-- explore_mires: myrflatene i et avgrenset område, med registrerte multefunn i nærheten.
--
-- For hver myr: areal, antall registrerte funn innen 500 m, og avstanden til det nærmeste funnet
-- hvis det ligger innen 2 km. Avstand måles fra myrflaten (0 når funnet ligger på myra), på
-- ellipsoiden. Dette er observasjonskontekst — hvor noen har registrert planten — ikke en
-- sannsynlighet og ikke en vurdering av myra.
--
-- Søket etter funn er avgrenset med en boks rundt myra (ca. 2,2 km), så den romlige indeksen
-- brukes. Et funn lenger unna enn 2 km gir «ingen innen 2 km», ikke en avstand.
--
-- Avgrenset som explore_area_features: bare admin, alltid et utsnitt, høyst 2 000 flater (de
-- største først), forenklet geometri til kartet.
-- ---------------------------------------------------------------------------

create function public.explore_mires(
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
  valgt as (
    select m.*, count(*) over () as total
    from myr m
    order by m.area_m2 desc, m.id
    limit least(greatest(coalesce(p_limit, 1500), 1), 2000)
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
    select count(*) filter (where f.m <= 500) as innen_500,
           min(f.m) as naermeste_m,
           (array_agg(f.id order by f.m, f.id))[1] as naermeste_id,
           (array_agg(f.aar order by f.m, f.id))[1] as naermeste_aar
    from (
      select b.id, (b.attributes ->> 'aar')::integer as aar, st_distance(b.geom::geography, v.geom::geography) as m
      from area_features b
      where b.provider_id = 'gbif-multefunn-oslomarka'
        and b.removed_from_source_at is null
        -- Ca. 2,2 km i hver retning ved 60° nord. Holder søket på indeksen.
        and b.geom && st_expand(v.geom, 0.04, 0.02)
    ) f
    where f.m <= 2000
  ) n on true
  order by v.area_m2 desc, v.id;
end;
$$;

-- Begge halvdeler må revokes, se migrasjon 20261002000000.
revoke execute on function public.explore_mires(
  double precision, double precision, double precision, double precision, jsonb, integer) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.explore_mires(
      double precision, double precision, double precision, double precision, jsonb, integer) from anon';
    execute 'grant execute on function public.explore_mires(
      double precision, double precision, double precision, double precision, jsonb, integer) to authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';
