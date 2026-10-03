-- ---------------------------------------------------------------------------
-- Forurenset grunn ut av den offentlige leseflaten (produktbeslutning 2026-10-03).
--
-- Datasettet beholdes og synkes som før, men vises ikke lenger i offentlig /omrade: en
-- registrering i nærheten har normalt begrenset verdi for en boligkjøpsbeslutning. Kategorien
-- «miljo» avpubliseres, slik kategoriregisteret er laget for (ADR 009).
--
-- Admin skal fortsatt se dataene i sin adressevisning, som bruker de samme lese-RPC-ene. De
-- returnerer derfor upubliserte kategorier når kallet kommer fra en innlogget admin. For anon og
-- vanlige innloggede brukere er oppførselen uendret: bare publiserte kategorier.
--
-- is_admin() leser e-posten fra JWT-kravene i kallet og slår opp i admin_users. Funksjonene er
-- security definer, så de kan kalle den selv om anon ikke har EXECUTE på den.
-- ---------------------------------------------------------------------------

update public.area_feature_categories set is_public = false where category = 'miljo';

create or replace function public.features_near(
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
security definer
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
    and a.category = any (array(select c.category from area_feature_categories c where c.is_public or (select public.is_admin())))
    and st_dwithin(a.geom::geography, o.g, radius_m)
  order by st_distance(a.geom::geography, o.g), a.title
  limit least(greatest(max_results, 1), 1000)
$$;

create or replace function public.features_count_near(
  lat double precision,
  lng double precision,
  radius_m double precision,
  categories text[] default null
)
returns table (category text, antall bigint)
language sql
stable
security definer
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
    and a.category = any (array(select c.category from area_feature_categories c where c.is_public or (select public.is_admin())))
    and st_dwithin(a.geom::geography, o.g, radius_m)
  group by a.category
$$;
