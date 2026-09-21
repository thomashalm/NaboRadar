-- NaboRadar — initial schema
-- Se docs/architecture.md og docs/adr/002-postgis-geospatial-model.md for begrunnelser.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- providers: én rad per kjent datakilde. Status kan overstyre kodens defaultStatus.
-- ---------------------------------------------------------------------------
create table public.providers (
  id              text primary key,
  name            text not null,
  status          text not null check (status in ('active', 'disabled', 'unsupported', 'error')),
  status_reason   text,
  license_name    text,
  license_url     text,
  last_sync_at    timestamptz,
  last_success_at timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into public.providers (id, name, status, status_reason, license_name, license_url) values
  ('dibk-planning-started', 'Planlegging igangsatt', 'active', null,
   'Norsk lisens for offentlige data (NLOD) 2.0', 'https://data.norge.no/nlod/no/2.0'),
  ('dibk-regulation', 'Reguleringsplaner (NAP)', 'unsupported',
   'HTTP 401 – krever Norge Digitalt-innlogging (testet 2026-09-21).', null, null),
  ('dibk-regulation-proposal', 'Reguleringsplanforslag / høring (NAP)', 'unsupported',
   'HTTP 401 – krever Norge Digitalt-innlogging (testet 2026-09-21).', null, null),
  ('oslo-building-case', 'Byggesaker Oslo', 'disabled',
   'Ingen dokumentert offentlig API funnet (ADR 004).', null, null);

-- ---------------------------------------------------------------------------
-- events: normaliserte hendelser. Dedupliseres på (provider_id, external_id).
-- ---------------------------------------------------------------------------
create table public.events (
  id                    uuid primary key default gen_random_uuid(),
  provider_id           text not null references public.providers (id),
  external_id           text not null,
  type                  text not null check (type in (
                          'planning_started', 'building_case', 'regulation',
                          'regulation_hearing', 'road_work', 'public_hearing')),
  title                 text not null,

  -- WGS84 lon/lat. Radius-spørringer bruker geom::geography (meter) med egen indeks.
  geom                  extensions.geometry(Geometry, 4326) not null
                          check (extensions.st_geometrytype(geom) in ('ST_Polygon', 'ST_MultiPolygon', 'ST_Point')),
  -- Punkt garantert på/inni geometrien. Kun for markør/label, ikke for radiusfilter.
  centroid              extensions.geometry(Point, 4326)
                          generated always as (extensions.st_pointonsurface(geom)) stored,
  -- Beregnet av NaboRadar, ikke oppgitt av kilden. Vises som «Beregnet planområde».
  computed_area_m2      double precision
                          generated always as (
                            case when extensions.st_dimension(geom) = 2
                                 then extensions.st_area(geom::extensions.geography)
                            end) stored,

  municipality_number   text check (municipality_number ~ '^\d{4}$'),
  municipality_name     text,

  announced_at          date,          -- når saken ble varslet/kunngjort (kilde)
  source_updated_at     timestamptz,   -- når dataposten sist ble endret i kilden
  first_seen_at         timestamptz not null default now(),  -- første gang NaboRadar så saken
  synced_at             timestamptz not null default now(),  -- siste gang NaboRadar hentet saken
  removed_from_source_at timestamptz,  -- forsvant fra kilden ved full sync; slettes ikke

  source_url            text check (source_url ~* '^https?://'),
  source_url_type       text check (source_url_type in ('municipal', 'provider_page', 'document')),

  attributes            jsonb not null default '{}'::jsonb,
  raw_data              jsonb not null default '{}'::jsonb,
  content_hash          text not null,

  unique (provider_id, external_id),
  check ((source_url is null) = (source_url_type is null))
);

create index events_geog_gix on public.events using gist ((geom::extensions.geography));
create index events_geom_gix on public.events using gist (geom);
create index events_announced_at_idx on public.events (announced_at desc);
create index events_provider_updated_idx on public.events (provider_id, source_updated_at);

-- ---------------------------------------------------------------------------
-- event_documents: kun metadata + lenke. Allowlist håndheves også her.
-- ---------------------------------------------------------------------------
create table public.event_documents (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  external_id   text not null,
  type          text not null check (type in ('ref-data-as-pdf', 'PlanomraadePdf', 'ReferatOppstartsmoete')),
  title         text not null check (title !~* '(beroert|berørt|berort)'),
  url           text not null check (url ~* '^https?://'),
  mime_type     text check (mime_type is distinct from 'application/json'),
  document_date date,
  unique (event_id, external_id)
);

-- ---------------------------------------------------------------------------
-- sync_runs: logg per sync-kjøring.
-- ---------------------------------------------------------------------------
create table public.sync_runs (
  id           uuid primary key default gen_random_uuid(),
  provider_id  text not null references public.providers (id),
  mode         text not null check (mode in ('full', 'incremental')),
  status       text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  fetched      integer not null default 0,
  inserted     integer not null default 0,
  updated      integer not null default 0,
  unchanged    integer not null default 0,
  removed      integer not null default 0,
  failed       integer not null default 0,
  error        text
);

create index sync_runs_provider_started_idx on public.sync_runs (provider_id, started_at desc);

-- ---------------------------------------------------------------------------
-- watched_areas: opprettes KUN når en bruker eksplisitt velger «Følg dette området».
-- Anonyme søk lagres aldri.
-- ---------------------------------------------------------------------------
create table public.watched_areas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,  -- nullable i prototype
  name          text not null,
  address_label text,
  latitude      double precision not null check (latitude between 57 and 72),
  longitude     double precision not null check (longitude between 4 and 32),
  radius_m      integer not null check (radius_m between 1 and 10000),
  point         extensions.geography(Point, 4326)
                  generated always as (
                    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
                  ) stored,
  created_at    timestamptz not null default now()
);

create index watched_areas_point_gix on public.watched_areas using gist (point);
create index watched_areas_user_idx on public.watched_areas (user_id);

-- ---------------------------------------------------------------------------
-- notifications: opprettes av sync (pending). Ingen utsending før e-postleverandør er konfigurert.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  watched_area_id uuid not null references public.watched_areas (id) on delete cascade,
  event_id        uuid not null references public.events (id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  channel         text,
  error           text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  unique (watched_area_id, event_id)
);

create index notifications_pending_idx on public.notifications (created_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- events_within: alle events der geometrien helt eller delvis ligger innen radius_m meter fra punktet.
-- Bruker faktisk geometri (ikke centroid/hjørner). distance_m = 0 når punktet ligger inni.
-- ---------------------------------------------------------------------------
create function public.events_within(
  lat double precision,
  lng double precision,
  radius_m double precision,
  announced_since date default null,
  include_removed boolean default false
)
returns table (
  id uuid,
  provider_id text,
  external_id text,
  type text,
  title text,
  geometry jsonb,
  centroid jsonb,
  computed_area_m2 double precision,
  municipality_number text,
  municipality_name text,
  announced_at date,
  source_updated_at timestamptz,
  source_url text,
  source_url_type text,
  attributes jsonb,
  distance_m double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select
    e.id, e.provider_id, e.external_id, e.type, e.title,
    st_asgeojson(e.geom)::jsonb,
    st_asgeojson(e.centroid)::jsonb,
    e.computed_area_m2,
    e.municipality_number, e.municipality_name,
    e.announced_at, e.source_updated_at,
    e.source_url, e.source_url_type,
    e.attributes,
    st_distance(e.geom::geography, o.g) as distance_m
  from public.events e, origin o
  where radius_m > 0 and radius_m <= 10000
    and st_dwithin(e.geom::geography, o.g, radius_m)
    and (announced_since is null or e.announced_at >= announced_since)
    and (include_removed or e.removed_from_source_at is null)
  order by distance_m, e.announced_at desc nulls last
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security. Skriving til events/providers/sync_runs skjer kun med service role (bypasser RLS).
-- ---------------------------------------------------------------------------
alter table public.providers       enable row level security;
alter table public.events          enable row level security;
alter table public.event_documents enable row level security;
alter table public.sync_runs       enable row level security;
alter table public.watched_areas   enable row level security;
alter table public.notifications   enable row level security;

create policy "offentlig lesing" on public.providers       for select to anon, authenticated using (true);
create policy "offentlig lesing" on public.events          for select to anon, authenticated using (true);
create policy "offentlig lesing" on public.event_documents for select to anon, authenticated using (true);
-- sync_runs: ingen policy → kun service role.

create policy "eier leser"    on public.watched_areas for select to authenticated using (user_id = auth.uid());
create policy "eier oppretter" on public.watched_areas for insert to authenticated with check (user_id = auth.uid());
create policy "eier endrer"   on public.watched_areas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eier sletter"  on public.watched_areas for delete to authenticated using (user_id = auth.uid());

create policy "eier leser" on public.notifications for select to authenticated using (
  exists (select 1 from public.watched_areas w where w.id = watched_area_id and w.user_id = auth.uid())
);
