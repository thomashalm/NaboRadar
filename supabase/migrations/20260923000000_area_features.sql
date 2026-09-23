-- NaboRadar — «Hva bør du vite om området?»
-- Områdefakta er TILSTANDER (uten dato), til forskjell fra events som er HENDELSER (med dato).
-- De ligger derfor i en egen tabell med egen spørring, men bruker samme sync-maskineri.

create table public.area_features (
  id                     uuid primary key default gen_random_uuid(),
  provider_id            text not null references public.providers (id),
  external_id            text not null,

  -- Gruppering i UI. Hver provider leverer én kategori.
  category               text not null check (category in ('miljo', 'grunnforhold', 'stoy', 'infrastruktur', 'industri')),
  -- Hva slags objekt det er. Styrer formuleringen (lib/facts/wording.ts).
  subtype                text not null,
  title                  text not null,

  geom                   extensions.geometry(Geometry, 4326) not null
                           check (extensions.st_geometrytype(geom) in
                             ('ST_Polygon', 'ST_MultiPolygon', 'ST_Point', 'ST_LineString', 'ST_MultiLineString')),
  centroid               extensions.geometry(Point, 4326)
                           generated always as (extensions.st_pointonsurface(geom)) stored,

  /*
   * Kun kodede verdier fra kilden (klasser, år, spenning …) — aldri fritekst, navn på
   * privatpersoner, adresser eller bemerkningsfelt. Se docs/area-facts-discovery.md.
   */
  attributes             jsonb not null default '{}'::jsonb,

  source_url             text check (source_url ~* '^https://'),
  source_url_type        text check (source_url_type in ('provider_page', 'factsheet', 'report')),
  source_updated_at      timestamptz,

  first_seen_at          timestamptz not null default now(),
  synced_at              timestamptz not null default now(),
  removed_from_source_at timestamptz,
  content_hash           text not null,

  unique (provider_id, external_id),
  check ((source_url is null) = (source_url_type is null))
);

create index area_features_geog_gix on public.area_features using gist ((geom::extensions.geography));
create index area_features_category_idx on public.area_features (category, subtype);
create index area_features_provider_idx on public.area_features (provider_id, synced_at);

-- ---------------------------------------------------------------------------
-- Providers for områdefakta. Kilder som må spørres direkte (for store til synk)
-- er registrert med status 'lookup' og eget flagg, se providers.kind.
-- ---------------------------------------------------------------------------
alter table public.providers add column kind text not null default 'event'
  check (kind in ('event', 'area_feature', 'area_lookup'));

alter table public.providers drop constraint providers_status_check;
alter table public.providers add constraint providers_status_check
  check (status in ('active', 'disabled', 'unsupported', 'error'));

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url) values
  ('mdir-forurenset-grunn', 'Forurenset grunn (Miljødirektoratet)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD) 2.0', 'https://data.norge.no/nlod/no/2.0'),
  ('mdir-industri-tillatelse', 'Industri med utslippstillatelse (Miljødirektoratet)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0'),
  ('nve-kvikkleire-soner', 'Kartlagte kvikkleiresoner (NVE)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0'),
  ('nve-nettanlegg', 'Transformatorstasjoner og kraftledninger (NVE)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0'),
  ('nve-kvikkleire-aktsomhet', 'Aktsomhetsområder kvikkleireskred (NVE)', 'area_lookup', 'active',
   'Spørres direkte: 148 235 polygoner nasjonalt.', 'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0'),
  ('nve-hoyspent-distribusjon', 'Høyspent distribusjonsnett (NVE)', 'area_lookup', 'active',
   'Spørres direkte: 141 401 linjer nasjonalt.', 'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0'),
  ('mdir-stoy-strategisk', 'Strategisk støykartlegging (Miljødirektoratet)', 'area_lookup', 'active',
   'Spørres direkte: polygonene er ~300 MB nasjonalt.', 'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0'),
  ('svv-stoysone-veg', 'Støyvarselkart veg T-1442 (Statens vegvesen)', 'area_lookup', 'active',
   'Spørres direkte: 49 471 soner nasjonalt.', 'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0'),
  ('avinor-stoysone-fly', 'Flystøysoner T-1442 (Avinor)', 'area_lookup', 'active',
   'Spørres direkte: kun GML fra kilden.', 'Åpne data (ingen bruksbegrensning oppgitt)', 'https://kartkatalog.geonorge.no/metadata/1489f7f8-40c8-4dc4-83b6-bcf277b56506');

-- ---------------------------------------------------------------------------
-- upsert_area_features: samme mønster som upsert_events, uten dokumenter.
-- ---------------------------------------------------------------------------
create function public.upsert_area_features(
  p_provider_id text,
  p_features jsonb,
  p_synced_at timestamptz
)
returns table (inserted integer, updated integer, unchanged integer, failed integer, errors jsonb)
language plpgsql
set search_path = public, extensions
as $$
declare
  ft jsonb;
  geom_in geometry;
  existing record;
  n_inserted integer := 0;
  n_updated integer := 0;
  n_unchanged integer := 0;
  n_failed integer := 0;
  errs jsonb := '[]'::jsonb;
begin
  for ft in select * from jsonb_array_elements(p_features)
  loop
    begin
      geom_in := st_setsrid(st_geomfromgeojson(ft->'geometry'), 4326);
      if st_dimension(geom_in) = 2 then
        geom_in := st_multi(st_collectionextract(st_makevalid(geom_in), 3));
      end if;
      if geom_in is null or st_isempty(geom_in) then
        raise exception 'tom geometri etter validering';
      end if;

      select a.id, a.content_hash, a.removed_from_source_at into existing
      from area_features a
      where a.provider_id = p_provider_id and a.external_id = ft->>'external_id';

      if not found then
        insert into area_features (
          provider_id, external_id, category, subtype, title, geom, attributes,
          source_url, source_url_type, source_updated_at, content_hash, first_seen_at, synced_at
        ) values (
          p_provider_id, ft->>'external_id', ft->>'category', ft->>'subtype', ft->>'title', geom_in,
          coalesce(ft->'attributes', '{}'::jsonb),
          ft->>'source_url', ft->>'source_url_type', (ft->>'source_updated_at')::timestamptz,
          ft->>'content_hash', p_synced_at, p_synced_at
        );
        n_inserted := n_inserted + 1;
      elsif existing.content_hash = ft->>'content_hash' and existing.removed_from_source_at is null then
        update area_features set synced_at = p_synced_at where id = existing.id;
        n_unchanged := n_unchanged + 1;
      else
        update area_features set
          category = ft->>'category',
          subtype = ft->>'subtype',
          title = ft->>'title',
          geom = geom_in,
          attributes = coalesce(ft->'attributes', '{}'::jsonb),
          source_url = ft->>'source_url',
          source_url_type = ft->>'source_url_type',
          source_updated_at = (ft->>'source_updated_at')::timestamptz,
          content_hash = ft->>'content_hash',
          synced_at = p_synced_at,
          removed_from_source_at = null
        where id = existing.id;
        n_updated := n_updated + 1;
      end if;
    exception when others then
      n_failed := n_failed + 1;
      errs := errs || jsonb_build_array(jsonb_build_object(
        'external_id', ft->>'external_id', 'error', left(sqlerrm, 200)));
    end;
  end loop;

  return query select n_inserted, n_updated, n_unchanged, n_failed, errs;
end;
$$;

create function public.mark_area_features_removed(
  p_provider_id text,
  p_run_synced_at timestamptz,
  p_keep_external_ids text[] default '{}'
)
returns integer
language sql
set search_path = public
as $$
  with marked as (
    update area_features
    set removed_from_source_at = p_run_synced_at
    where provider_id = p_provider_id
      and removed_from_source_at is null
      and synced_at < p_run_synced_at
      and not (external_id = any (p_keep_external_ids))
    returning 1
  )
  select count(*)::integer from marked
$$;

-- ---------------------------------------------------------------------------
-- features_near: områdefakta innen radius.
-- `contains` = søkepunktet ligger inne i objektet (polygon), `distance_m` = 0 da.
-- Geometri returneres ikke: fakta vises som tekst, ikke som kartlag (ennå).
-- ---------------------------------------------------------------------------
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
  category text,
  subtype text,
  title text,
  distance_m double precision,
  contains boolean,
  attributes jsonb,
  source_url text,
  source_url_type text,
  source_updated_at timestamptz,
  centroid jsonb
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
    a.id, a.provider_id, a.category, a.subtype, a.title,
    st_distance(a.geom::geography, o.g),
    st_intersects(a.geom, o.g4326),
    a.attributes, a.source_url, a.source_url_type, a.source_updated_at,
    st_asgeojson(a.centroid, 6)::jsonb
  from area_features a, origin o
  where radius_m > 0 and radius_m <= 10000
    and a.removed_from_source_at is null
    and (categories is null or a.category = any (categories))
    and st_dwithin(a.geom::geography, o.g, radius_m)
  order by st_distance(a.geom::geography, o.g), a.title
  limit least(greatest(max_results, 1), 1000)
$$;

-- ---------------------------------------------------------------------------
-- provider_overview utvides med områdefakta (brukes av /dev).
-- ---------------------------------------------------------------------------
drop function public.provider_overview();

create function public.provider_overview()
returns table (
  id text, kind text, status text, last_sync_at timestamptz, last_success_at timestamptz, last_error text,
  active_events bigint, removed_events bigint, documents bigint,
  active_features bigint, removed_features bigint,
  last_run jsonb
)
language sql
stable
set search_path = public
as $$
  select
    p.id, p.kind, p.status, p.last_sync_at, p.last_success_at, p.last_error,
    (select count(*) from events e where e.provider_id = p.id and e.removed_from_source_at is null),
    (select count(*) from events e where e.provider_id = p.id and e.removed_from_source_at is not null),
    (select count(*) from event_documents d join events e on e.id = d.event_id where e.provider_id = p.id),
    (select count(*) from area_features a where a.provider_id = p.id and a.removed_from_source_at is null),
    (select count(*) from area_features a where a.provider_id = p.id and a.removed_from_source_at is not null),
    (select to_jsonb(r) - 'provider_id' from sync_runs r where r.provider_id = p.id order by r.started_at desc limit 1)
  from providers p
  order by p.kind, p.id
$$;

-- data_status: ta med områdefakta-providere som er synket.
drop function public.data_status();

create function public.data_status()
returns table (provider_id text, name text, kind text, last_success_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.kind, p.last_success_at from providers p where p.status = 'active' order by p.kind, p.id
$$;

-- ---------------------------------------------------------------------------
-- RLS og tilganger.
-- ---------------------------------------------------------------------------
alter table public.area_features enable row level security;
create policy "offentlig lesing" on public.area_features for select to anon, authenticated using (true);

revoke execute on function public.upsert_area_features(text, jsonb, timestamptz) from public;
revoke execute on function public.mark_area_features_removed(text, timestamptz, text[]) from public;
revoke execute on function public.provider_overview() from public;
revoke execute on function public.data_status() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.upsert_area_features(text, jsonb, timestamptz) from anon, authenticated';
    execute 'revoke execute on function public.mark_area_features_removed(text, timestamptz, text[]) from anon, authenticated';
    execute 'revoke execute on function public.provider_overview() from anon, authenticated';
    execute 'grant execute on function public.features_near(double precision, double precision, double precision, text[], integer) to anon, authenticated';
    execute 'grant execute on function public.data_status() to anon, authenticated';
  end if;
end;
$$;
