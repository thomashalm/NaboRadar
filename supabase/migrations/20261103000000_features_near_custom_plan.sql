-- ---------------------------------------------------------------------------
-- features_near: planlegg med de faktiske argumentene.
--
-- Som SQL-funksjon ble spørringen planlagt uten å kjenne `categories`. Planleggeren kunne da
-- ikke vite at et kall bare gjaldt 556 tilfluktsrom, og gikk via romindeksen alene: alt innenfor
-- radien ble hentet fra disk, og kategorien sjekket etterpå.
--
-- Det merktes ikke med 500 m – 3 km. Det merktes da /tilfluktsrom begynte å lete etter nærmeste
-- offentlige tilfluktsrom ut til 10 km (2026-10-03). Rundt Langmyrgrenda 26C i Oslo betydde det
-- rundt 6 000 sider for å finne 37 rom. Med varm cache tar det 50 ms; med kald cache gikk det
-- over anon-rollens statement_timeout på 3 s, og siden viste «Kunne ikke hente tilfluktsrom».
--
-- Funksjonen er nå plpgsql med plan_cache_mode = force_custom_plan, slik at hver kjøring
-- planlegges med argumentene den faktisk fikk. Et kall på én liten kategori kombinerer da
-- kategori-indeksen med romindeksen. Spørringen er ellers uendret, bortsett fra at de to
-- kategorivilkårene er slått sammen til ett som kan bruke indeksen: listen over kategorier
-- kallet får lese. En kategori som ikke står i area_feature_categories ble allerede filtrert
-- bort av publiseringsfilteret, så resultatet er det samme.
--
-- Tilgangsmodellen er uendret (ADR 009): anon ser bare publiserte kategorier, admin alle.
-- Signaturen er uendret, så rettighetene på funksjonen står som før.
-- ---------------------------------------------------------------------------

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
language plpgsql
stable
security definer
set search_path = public, extensions
set plan_cache_mode = force_custom_plan
as $$
#variable_conflict use_column
declare
  origin4326 geometry := st_setsrid(st_makepoint(lng, lat), 4326);
  origin geography := st_setsrid(st_makepoint(lng, lat), 4326)::geography;
  -- Kategoriene kallet får lese: publiserte (alle for admin), avgrenset til dem det ber om.
  lesbare text[] := array(
    select c.category
    from area_feature_categories c
    where (c.is_public or (select public.is_admin()))
      and (categories is null or c.category = any (categories))
  );
begin
  if radius_m is null or radius_m <= 0 or radius_m > 10000 then
    return;
  end if;

  return query
  select
    a.id, a.provider_id, a.external_id, a.category, a.subtype, a.title,
    st_distance(a.geom::geography, origin),
    st_intersects(a.geom, origin4326),
    a.attributes, a.source_url, a.source_url_type, a.source_updated_at,
    st_asgeojson(a.centroid, 6)::jsonb,
    case
      when st_npoints(a.geom) <= 5000
        then st_asgeojson(st_simplifypreservetopology(a.geom, 0.000005), 6)::jsonb
    end
  from area_features a
  where a.removed_from_source_at is null
    and a.category = any (lesbare)
    and st_dwithin(a.geom::geography, origin, radius_m)
  order by st_distance(a.geom::geography, origin), a.title
  limit least(greatest(max_results, 1), 1000);
end;
$$;
