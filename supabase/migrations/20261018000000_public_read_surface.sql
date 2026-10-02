-- ---------------------------------------------------------------------------
-- Offentlig leseflate: bare RPC, og bare kategorier som er publisert.
--
-- Bakgrunn (docs/data-architecture.md): før basen fylles med store nasjonale datasett må det
-- være mulig å lagre noe uten å publisere det. Det var det ikke. To hull:
--
--   1. anon og authenticated hadde SELECT rett på `area_features`, `events`, `event_documents`
--      og `providers`. Appen bruker bare RPC-ene, men REST-API-et lot hvem som helst med den
--      publiserbare nøkkelen lese hele tabellene side for side — også `events.raw_data`
--      (kildens rå egenskaper) og `providers.last_error`. RPC-enes grenser på radius og antall
--      var dermed ikke en grense, bare en vane.
--
--   2. En synket rad var offentlig i det øyeblikket den ble skrevet. `features_near` med
--      `categories => null` returnerer alt, så en ny kategori kunne ikke importeres og
--      kvalitetssikres før den ble synlig.
--
-- Derfor:
--   * `area_feature_categories` er registeret over kategorier, med domene og `is_public`.
--     Det erstatter CHECK-listen på `area_features.category`: en ny kategori er en rad, ikke en
--     ny constraint, og den er upublisert til noen sier noe annet.
--   * De fire lese-RPC-ene blir `security definer`, og `features_near` / `features_count_near`
--     returnerer bare publiserte kategorier.
--   * anon og authenticated mister direkte tabelltilgang til de fire tabellene.
--
-- Atferden for de elleve kategoriene som finnes i dag er uendret: alle er publisert.
--
-- I samme migrasjon: `datacenter_search_plan` og `research_review_interval_for` var
-- `security definer` og kjørbare av enhver innlogget bruker uten `is_admin()`-sjekk. Begge
-- kalles bare fra andre funksjoner, så de stenges for authenticated.
-- ---------------------------------------------------------------------------

-- 1. Kategoriregisteret ------------------------------------------------------

create table public.area_feature_categories (
  category   text primary key check (category ~ '^[a-z][a-z0-9_]*$'),
  -- Domenet grupperer kategorier (domene → kategori → subtype). Fritekst med formkrav, ikke
  -- enum: nye domener skal kunne komme uten typeendring.
  domain     text not null check (domain ~ '^[a-z][a-z0-9_]*$'),
  label      text not null check (length(trim(label)) > 0),
  -- Publisert = lese-RPC-ene returnerer kategorien. Standard er upublisert.
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.area_feature_categories is
  'Kategoriregister for area_features: domene → kategori. is_public styrer om lese-RPC-ene returnerer kategorien.';

insert into public.area_feature_categories (category, domain, label, is_public) values
  ('miljo',         'miljo',         'Forurenset grunn',                  true),
  ('grunnforhold',  'miljo',         'Grunnforhold',                      true),
  ('stoy',          'miljo',         'Støy',                              true),
  ('infrastruktur', 'infrastruktur', 'Kraftnett og tekniske anlegg',      true),
  ('industri',      'infrastruktur', 'Industri med utslippstillatelse',   true),
  ('tilfluktsrom',  'infrastruktur', 'Tilfluktsrom',                      true),
  ('oppvekst',      'naeromrade',    'Skoler og barnehager',              true),
  ('helse',         'naeromrade',    'Sykehus',                           true),
  ('servering',     'naeromrade',    'Skjenkesteder',                     true),
  ('omsorg',        'naeromrade',    'Omsorgstilbud',                     true),
  ('skolekrets',    'naeromrade',    'Skolekrets',                        true);

alter table public.area_features drop constraint area_features_category_check;
alter table public.area_features
  add constraint area_features_category_fkey
  foreign key (category) references public.area_feature_categories (category);

alter table public.area_feature_categories enable row level security;

-- 2. Lese-RPC-ene: security definer, og bare publiserte kategorier -----------
--
-- Kroppene er de samme som før, med ett tillegg: kategorien må være publisert. Listen hentes
-- én gang per kall (InitPlan), ikke per rad.

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
    and a.category = any (array(select c.category from area_feature_categories c where c.is_public))
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
    and a.category = any (array(select c.category from area_feature_categories c where c.is_public))
    and st_dwithin(a.geom::geography, o.g, radius_m)
  group by a.category
$$;

-- Uendrede kropper: bare rettighetsmodellen byttes. Begge har fast search_path fra før.
alter function public.events_within(double precision, double precision, double precision, date, text, integer)
  security definer;
alter function public.get_event(uuid, double precision, double precision)
  security definer;

-- 3. Tilganger ----------------------------------------------------------------

drop policy "offentlig lesing" on public.area_features;
drop policy "offentlig lesing" on public.events;
drop policy "offentlig lesing" on public.event_documents;
drop policy "offentlig lesing" on public.providers;

do $$
declare
  v_fn text;
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;

  -- Ingen direkte tabelltilgang. Supabase gir ALL på nye tabeller til begge rollene som
  -- standard, så dette må sies eksplisitt — også for den nye tabellen.
  execute 'revoke all on public.area_features, public.events, public.event_documents, '
       || 'public.providers, public.area_feature_categories from anon, authenticated';

  -- create or replace beholder eksisterende grants, men sier det likevel eksplisitt.
  foreach v_fn in array array[
    'public.features_near(double precision, double precision, double precision, text[], integer)',
    'public.features_count_near(double precision, double precision, double precision, text[])',
    'public.events_within(double precision, double precision, double precision, date, text, integer)',
    'public.get_event(uuid, double precision, double precision)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    execute 'grant execute on function ' || v_fn || ' to anon, authenticated, service_role';
  end loop;

  -- Security definer uten is_admin()-sjekk. Kalles bare fra andre funksjoner (kø og trigger),
  -- som selv kjører som eier — authenticated trenger dem ikke.
  execute 'revoke execute on function public.datacenter_search_plan(uuid) from public, anon, authenticated';
  execute 'revoke execute on function public.research_review_interval_for(uuid) from public, anon, authenticated';
end;
$$;
