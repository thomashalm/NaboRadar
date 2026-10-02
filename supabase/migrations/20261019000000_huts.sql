-- ---------------------------------------------------------------------------
-- Hytter og koier: kanonisk tabell over kildeposter.
--
-- Første friluftskategori. Modellen følger docs/data-architecture.md:
--
--   KILDEPOSTER   area_features, kategori `hytte_kilde` — én rad per objekt per kilde, skrevet av
--                 den vanlige synken. Kategorien publiseres aldri: en kildepost er ikke en hytte.
--   KANONISK      huts — én rad per fysiske hytte, med egen uuid som ikke avhenger av navn,
--                 koordinat eller kildens ID.
--   KOBLING       hut_sources — hvilke kildeposter som beskriver hvilken hytte, og hvorfor.
--   PUBLISERT     huts_*-funksjonene, som bare svarer når kategorien `hytte` er publisert
--                 (eller kalleren er admin).
--
-- Hvorfor et kanonisk lag og ikke bare kildepostene: hovedkilden (Kartverkets N50) har ingen
-- stabil ID — `gml:id` genereres på nytt for hvert uttrekk — og samme hytte finnes i flere
-- kilder. Uten dette laget ville en hytte byttet identitet hver gang kilden ble skrevet om, og
-- stått to ganger i kartet.
--
-- Feltene her er bare de kildene faktisk fyller. Sengeplasser, sesong, booking og status
-- finnes i modellen fordi neste kilde kan ha dem, men ingen av dagens kilder setter dem, og
-- ingenting utledes: en hytte som finnes i et register er ikke dermed åpen.
-- ---------------------------------------------------------------------------

insert into public.area_feature_categories (category, domain, label, is_public) values
  -- Publiseringsflagget for huts_*-funksjonene. Upublisert til piloten er kontrollert.
  ('hytte',       'friluft', 'Hytter og koier',               false),
  -- Kildepostene bak. Skal aldri publiseres; features_near skal aldri returnere dem.
  ('hytte_kilde', 'friluft', 'Hytter og koier – kildeposter', false);

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('kartverket-n50-hytter', 'Turisthytter i N50 Kartdata (Kartverket)', 'area_feature', 'active',
   'Pilot: Oslomarka. Kommunelisten ligger i provideren.',
   'Creative Commons Navngivelse 4.0 (CC BY 4.0)', 'https://creativecommons.org/licenses/by/4.0/',
   -- N50 oppdateres ukentlig hos Kartverket.
   false, 10080, 168, 720),
  ('kartverket-turrutebasen-hytter', 'Hytter i Tur- og friluftsruter (Kartverket)', 'area_feature', 'active',
   'Pilot: Oslomarka. Avgrensningen ligger i provideren.',
   -- Metadataene sier «No conditions apply to access and use». Kartverket navngis uansett.
   'Åpne data fra Kartverket (ingen bruksvilkår oppgitt)', 'https://kartkatalog.geonorge.no/metadata/turrutebasen/d1422d17-6d95-4ef1-96ab-8af31744dd63',
   false, 10080, 168, 720);

-- 1. Tabellene ---------------------------------------------------------------

/** Navn redusert til det som skiller: små bokstaver, uten mellomrom og tegn. */
create function public.hut_name_key(p_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9æøåäöéèü]', '', 'g')
$$;

create table public.huts (
  id                  uuid primary key default gen_random_uuid(),

  name                text not null check (length(trim(name)) > 0),
  name_key            text not null,
  -- Navn fra andre kilder enn den som ga `name`. Til søk, ikke til visning.
  alt_names           text[] not null default '{}',

  /*
   * Kontrollert typologi. Bare verdier en kilde faktisk sier:
   *   staffed_hut / self_service_hut / unstaffed_hut — kildens egen betjeningsgrad
   *   rest_cabin   — rastebu/dagshytte/nødbu (N50s «Rastebu»)
   * De øvrige er reservert for kilder som skiller dem ut. `unknown` er bedre enn gjetting.
   */
  hut_type            text not null default 'unknown'
                        check (hut_type in ('staffed_hut', 'self_service_hut', 'unstaffed_hut', 'rest_cabin',
                                            'open_cabin', 'day_trip_hut', 'emergency_shelter', 'other', 'unknown')),

  geom                extensions.geometry(Point, 4326) not null,
  municipality_number text check (municipality_number is null or municipality_number ~ '^\d{4}$'),

  -- Eierkategorien slik kilden oppgir den. `other` er kildens «Andre» — uspesifisert, ikke ukjent.
  owner_kind          text not null default 'unknown'
                        check (owner_kind in ('dnt', 'statskog', 'fjellstyre', 'kommune', 'other', 'unknown')),
  -- Navngitt forvalter, når en kilde oppgir en. Ikke det samme som eier.
  manager_name        text,

  -- Ingen av dagens kilder sier om en hytte er åpen. Feltet står på `unknown` til en gjør det.
  access_status       text not null default 'unknown'
                        check (access_status in ('open', 'seasonal', 'closed', 'unknown')),
  -- Kildens «Låst»/«Ulåst». Null = ikke oppgitt.
  locked              boolean,
  overnight           text not null default 'unknown' check (overnight in ('yes', 'no', 'unknown')),
  beds                integer check (beds is null or beds > 0),
  booking_url         text check (booking_url is null or booking_url ~* '^https://'),
  info_url            text check (info_url is null or info_url ~* '^https://'),
  attributes          jsonb not null default '{}'::jsonb,

  -- high = to kilder er enige om typen, medium = hovedkilden står alene eller kildene er
  -- uenige, low = bare en sekundærkilde. `low` vises ikke offentlig før hytta er bekreftet.
  confidence          text not null default 'medium' check (confidence in ('low', 'medium', 'high')),

  source_updated_at   timestamptz,
  first_seen_at       timestamptz not null default now(),
  -- Sist en aktiv kildepost pekte hit. Settes av refresh_huts().
  last_seen_at        timestamptz not null default now(),
  -- Bare et menneske setter denne. Synken gjør det ikke.
  last_verified_at    timestamptz,
  -- Satt når ingen aktiv kildepost lenger beskriver hytta. Raden slettes ikke.
  archived_at         timestamptz,

  /*
   * Manuell kontroll bare ved konflikt: kildene er uenige om typen, eller to hytter ligger så
   * nær hverandre at de kan være samme. `review_dismissed` er årsaken en admin har sett og
   * avvist; køen viser bare rader der de to er forskjellige.
   */
  review_reason       text,
  review_dismissed    text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index huts_geog_gix on public.huts using gist ((geom::extensions.geography));
create index huts_geom_gix on public.huts using gist (geom);
create index huts_municipality_idx on public.huts (municipality_number);
create index huts_name_key_idx on public.huts (name_key);

create table public.hut_sources (
  -- En kildepost beskriver høyst én hytte.
  feature_id   uuid primary key references public.area_features (id) on delete cascade,
  hut_id       uuid not null references public.huts (id) on delete cascade,
  /*
   * Hvorfor posten ble koblet:
   *   new            ingen hytte passet; posten opprettet en
   *   name_distance  samme navn innen 300 m, eller det ene navnet innleder det andre
   *   position       innen 50 m, uavhengig av navn (samme sted, annen skrivemåte eller ny ID)
   *   manual         satt av et menneske
   */
  match_basis  text not null check (match_basis in ('new', 'name_distance', 'position', 'manual')),
  distance_m   double precision,
  linked_at    timestamptz not null default now(),
  confirmed_by text
);

create index hut_sources_hut_idx on public.hut_sources (hut_id);

alter table public.huts enable row level security;
alter table public.hut_sources enable row level security;

-- 2. Fra kildeposter til hytter ---------------------------------------------

/** Hovedkilden først. Styrer både koblingsrekkefølgen og hvilken kilde som vinner et felt. */
create function public.hut_source_priority(p_provider_id text)
returns integer
language sql
immutable
as $$
  select case p_provider_id
           when 'kartverket-n50-hytter' then 1
           when 'kartverket-turrutebasen-hytter' then 2
           else 9
         end
$$;

/**
 * Kobler nye kildeposter til hytter, regner de kanoniske feltene på nytt og arkiverer hytter
 * uten aktiv kilde. Kjøres etter hver sync av en hyttekilde. Idempotent.
 *
 * Koblingsreglene, i rekkefølge:
 *   1. samme navn innen 300 m (eller at det ene navnet er begynnelsen på det andre)
 *   2. innen 50 m uansett navn
 *   3. ellers ny hytte — men bare når kilden sier hva slags hytte det er
 * En hytte får aldri to aktive poster fra samme kilde: to poster fra samme kilde er to hytter,
 * også når de ligger vegg i vegg. Navnelikhet alene kobler aldri noe.
 */
create function public.refresh_huts()
returns table (linked integer, created integer, unmatched integer, archived integer, restored integer, flagged integer)
language plpgsql
set search_path = public, extensions
as $$
declare
  src        record;
  v_hut      uuid;
  v_dist     double precision;
  v_basis    text;
  n_linked   integer := 0;
  n_created  integer := 0;
  n_unmatched integer := 0;
  n_archived integer := 0;
  n_restored integer := 0;
  n_flagged  integer := 0;
begin
  for src in
    select f.id, f.provider_id, f.title, hut_name_key(f.title) as k, f.geom, f.attributes
    from area_features f
    where f.category = 'hytte_kilde'
      and f.removed_from_source_at is null
      and not exists (select 1 from hut_sources s where s.feature_id = f.id)
    order by hut_source_priority(f.provider_id), f.provider_id, f.external_id
  loop
    v_hut := null;

    if src.k <> '' then
      select h.id, st_distance(h.geom::geography, src.geom::geography) into v_hut, v_dist
      from huts h
      where st_dwithin(h.geom::geography, src.geom::geography, 300)
        -- Samme navn, eller det ene navnet er begynnelsen på det andre («Snellingen» og
        -- «Snellingen DNT hytta»). Bare innenfor 300 m: navnet alene kobler ingenting.
        and (h.name_key = src.k
             or (least(length(h.name_key), length(src.k)) >= 5
                 and (h.name_key like src.k || '%' or src.k like h.name_key || '%')))
        and not exists (
          select 1 from hut_sources s join area_features f2 on f2.id = s.feature_id
          where s.hut_id = h.id and f2.provider_id = src.provider_id and f2.removed_from_source_at is null)
      order by 2
      limit 1;
      v_basis := 'name_distance';
    end if;

    if v_hut is null then
      select h.id, st_distance(h.geom::geography, src.geom::geography) into v_hut, v_dist
      from huts h
      where st_dwithin(h.geom::geography, src.geom::geography, 50)
        and not exists (
          select 1 from hut_sources s join area_features f2 on f2.id = s.feature_id
          where s.hut_id = h.id and f2.provider_id = src.provider_id and f2.removed_from_source_at is null)
      order by 2
      limit 1;
      v_basis := 'position';
    end if;

    if v_hut is null then
      -- En post som ikke sier hva den er, kan støtte en hytte, men ikke opprette en.
      if src.attributes->>'hut_type' is null or trim(src.title) = '' then
        n_unmatched := n_unmatched + 1;
        continue;
      end if;
      insert into huts (name, name_key, geom)
      values (src.title, src.k, st_pointonsurface(src.geom))
      returning id into v_hut;
      v_basis := 'new';
      v_dist := 0;
      n_created := n_created + 1;
    else
      n_linked := n_linked + 1;
    end if;

    insert into hut_sources (feature_id, hut_id, match_basis, distance_m)
    values (src.id, v_hut, v_basis, v_dist);
  end loop;

  -- Kanoniske felt: for hvert felt vinner den høyest prioriterte kilden som faktisk har en verdi.
  with aktive as (
    select s.hut_id, f.title, f.geom, f.attributes, f.source_updated_at,
           hut_source_priority(f.provider_id) as prio
    from hut_sources s
    join area_features f on f.id = s.feature_id
    where f.removed_from_source_at is null
  ),
  samlet as (
    select
      a.hut_id,
      (array_agg(a.title order by a.prio) filter (where trim(a.title) <> ''))[1] as name,
      (array_agg(a.geom order by a.prio))[1] as geom,
      (array_agg(a.attributes->>'hut_type' order by a.prio) filter (where a.attributes->>'hut_type' is not null))[1] as hut_type,
      (array_agg(a.attributes->>'owner_kind' order by a.prio) filter (where a.attributes->>'owner_kind' is not null))[1] as owner_kind,
      (array_agg(a.attributes->>'manager_name' order by a.prio) filter (where a.attributes->>'manager_name' is not null))[1] as manager_name,
      (array_agg((a.attributes->>'locked')::boolean order by a.prio) filter (where a.attributes->>'locked' is not null))[1] as locked,
      (array_agg(a.attributes->>'overnight' order by a.prio) filter (where a.attributes->>'overnight' is not null))[1] as overnight,
      (array_agg((a.attributes->>'beds')::integer order by a.prio) filter (where a.attributes->>'beds' is not null))[1] as beds,
      (array_agg(a.attributes->>'municipality_number' order by a.prio) filter (where a.attributes->>'municipality_number' is not null))[1] as municipality_number,
      max(a.source_updated_at) as source_updated_at,
      count(distinct a.attributes->>'hut_type') filter (where a.attributes->>'hut_type' is not null) as typer,
      count(*) filter (where a.attributes->>'hut_type' is not null) as poster_med_type,
      min(a.prio) as beste_prio,
      array_agg(distinct a.title) filter (where trim(a.title) <> '') as navn
    from aktive a
    group by a.hut_id
  )
  update huts h set
    name                = coalesce(s.name, h.name),
    name_key            = hut_name_key(coalesce(s.name, h.name)),
    alt_names           = coalesce(array(select n from unnest(s.navn) n where n <> coalesce(s.name, h.name) order by n), '{}'),
    geom                = st_pointonsurface(s.geom),
    hut_type            = coalesce(s.hut_type, 'unknown'),
    owner_kind          = coalesce(s.owner_kind, 'unknown'),
    manager_name        = s.manager_name,
    locked              = s.locked,
    overnight           = coalesce(s.overnight, 'unknown'),
    beds                = s.beds,
    municipality_number = s.municipality_number,
    source_updated_at   = s.source_updated_at,
    confidence          = case when s.typer = 1 and s.poster_med_type >= 2 then 'high'
                               when s.beste_prio = 1 then 'medium'
                               else 'low' end,
    review_reason       = case when s.typer > 1 then 'Kildene er uenige om hyttetype'
                               when s.beste_prio > 1 then 'Finnes bare i en sekundærkilde' end,
    last_seen_at        = now(),
    updated_at          = now()
  from samlet s
  where s.hut_id = h.id;

  -- Mulige dubletter: to aktive hytter innen 100 m, eller samme navn innen 2 km. Regelen
  -- flagger; den slår aldri sammen.
  update huts h set review_reason = concat_ws('; ', h.review_reason, 'Mulig dublett: ' || d.navn)
  from (
    select a.id, string_agg(b.name, ', ' order by b.name) as navn
    from huts a
    join huts b on b.id <> a.id
      and (st_dwithin(a.geom::geography, b.geom::geography, 100)
           or (a.name_key = b.name_key and a.name_key <> ''
               and st_dwithin(a.geom::geography, b.geom::geography, 2000)))
    where exists (select 1 from hut_sources s join area_features f on f.id = s.feature_id
                  where s.hut_id = a.id and f.removed_from_source_at is null)
      and exists (select 1 from hut_sources s join area_features f on f.id = s.feature_id
                  where s.hut_id = b.id and f.removed_from_source_at is null)
    group by a.id
  ) d
  where d.id = h.id;

  -- Arkivering og gjenoppliving følger kildene. Ingenting slettes.
  with uten_kilde as (
    update huts h set archived_at = now(), updated_at = now()
    where h.archived_at is null
      and not exists (select 1 from hut_sources s join area_features f on f.id = s.feature_id
                      where s.hut_id = h.id and f.removed_from_source_at is null)
    returning 1
  )
  select count(*) into n_archived from uten_kilde;

  with tilbake as (
    update huts h set archived_at = null, updated_at = now()
    where h.archived_at is not null
      and exists (select 1 from hut_sources s join area_features f on f.id = s.feature_id
                  where s.hut_id = h.id and f.removed_from_source_at is null)
    returning 1
  )
  select count(*) into n_restored from tilbake;

  select count(*) into n_flagged from huts h
  where h.archived_at is null and h.review_reason is not null
    and h.review_reason is distinct from h.review_dismissed;

  return query select n_linked, n_created, n_unmatched, n_archived, n_restored, n_flagged;
end;
$$;

-- 3. Offentlig lesing --------------------------------------------------------

/** Hyttene er synlige når kategorien er publisert — eller for admin, som skal kunne kontrollere før. */
create function public.huts_visible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select c.is_public from area_feature_categories c where c.category = 'hytte'), false)
      or public.is_admin()
$$;

/**
 * Feltene som er offentlige. Intern view uten grants — bare funksjonene under leser den.
 * Kontrollfeltene (review_*, confidence, attributes) er ikke med.
 */
create view public.huts_public as
  select
    h.id, h.name, h.hut_type, h.owner_kind, h.manager_name, h.access_status, h.locked,
    h.overnight, h.beds, h.booking_url, h.info_url, h.municipality_number,
    extensions.st_y(h.geom) as latitude, extensions.st_x(h.geom) as longitude,
    h.source_updated_at, h.last_seen_at, h.geom, h.name_key, h.alt_names,
    array(select distinct f.provider_id
          from hut_sources s join area_features f on f.id = s.feature_id
          where s.hut_id = h.id and f.removed_from_source_at is null
          order by 1) as sources
  from huts h
  where h.archived_at is null
    -- En hytte som bare finnes i en sekundærkilde vises ikke før et menneske har bekreftet
    -- den. Sekundærkilden skiller ikke godt nok mellom turisthytter og andre overnattingssteder.
    and (h.confidence <> 'low' or h.last_verified_at is not null);

/**
 * Hytter rundt et punkt, nærmest først. Radius inntil 50 km — hytter er ikke butikker, og
 * «i nærheten» er lenger enn for resten av områdesiden. KNN på indeksen, ikke radius + sortering.
 */
create function public.huts_near(
  lat double precision,
  lng double precision,
  radius_m double precision default 30000,
  max_results integer default 5,
  types text[] default null,
  owners text[] default null
)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, access_status text,
  locked boolean, overnight text, beds integer, booking_url text, info_url text,
  municipality_number text, latitude double precision, longitude double precision,
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[], distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g)
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources,
         st_distance(p.geom::geography, o.g)
  from huts_public p, origin o
  where public.huts_visible()
    and radius_m > 0 and radius_m <= 50000
    and st_dwithin(p.geom::geography, o.g, radius_m)
    and (types is null or p.hut_type = any (types))
    and (owners is null or p.owner_kind = any (owners))
  order by p.geom::geography <-> o.g, p.name
  limit least(greatest(max_results, 1), 100)
$$;

/**
 * Hytter i et kartutsnitt. `total` er antallet som passer filteret i utsnittet, slik at
 * klienten vet om svaret er kuttet. Grensen er høy nok til at hele landet får plass.
 */
create function public.huts_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  types text[] default null,
  owners text[] default null,
  max_results integer default 2000
)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, access_status text,
  locked boolean, overnight text, beds integer, booking_url text, info_url text,
  municipality_number text, latitude double precision, longitude double precision,
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[], total bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources,
         count(*) over ()
  from huts_public p
  where public.huts_visible()
    and min_lng < max_lng and min_lat < max_lat
    and min_lng >= -180 and max_lng <= 180 and min_lat >= -90 and max_lat <= 90
    and p.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    and (types is null or p.hut_type = any (types))
    and (owners is null or p.owner_kind = any (owners))
  order by p.name, p.id
  limit least(greatest(max_results, 1), 5000)
$$;

/** Hytter i én kommune. */
create function public.huts_in_municipality(
  p_municipality_number text,
  types text[] default null,
  owners text[] default null,
  max_results integer default 500
)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, access_status text,
  locked boolean, overnight text, beds integer, booking_url text, info_url text,
  municipality_number text, latitude double precision, longitude double precision,
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[]
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources
  from huts_public p
  where public.huts_visible()
    and p.municipality_number = p_municipality_number
    and (types is null or p.hut_type = any (types))
    and (owners is null or p.owner_kind = any (owners))
  order by p.name, p.id
  limit least(greatest(max_results, 1), 2000)
$$;

/** Navnesøk. Noen tusen rader: et vanlig delstrengsøk holder, og pg_trgm kan vente. */
create function public.huts_search(q text, max_results integer default 20)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text,
  municipality_number text, latitude double precision, longitude double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with nokkel as (select public.hut_name_key(q) as k)
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.municipality_number, p.latitude, p.longitude
  from huts_public p, nokkel n
  where public.huts_visible()
    and length(n.k) >= 2
    and (p.name_key like '%' || n.k || '%'
         or exists (select 1 from unnest(p.alt_names) a where public.hut_name_key(a) like '%' || n.k || '%'))
  order by (p.name_key like n.k || '%') desc, p.name, p.id
  limit least(greatest(max_results, 1), 50)
$$;

-- 4. Admin: kontrollkøen -----------------------------------------------------

/** Hytter med en konflikt noen bør se på. Tom for alle andre enn admin. */
create function public.hut_review_queue()
returns table (
  id uuid, name text, hut_type text, owner_kind text, municipality_number text,
  latitude double precision, longitude double precision, confidence text, review_reason text, sources jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select h.id, h.name, h.hut_type, h.owner_kind, h.municipality_number,
         st_y(h.geom), st_x(h.geom), h.confidence, h.review_reason,
         (select jsonb_agg(jsonb_build_object(
                   'provider_id', f.provider_id, 'external_id', f.external_id, 'title', f.title,
                   'hut_type', f.attributes->>'hut_type', 'match_basis', s.match_basis,
                   'distance_m', round(s.distance_m::numeric, 1)) order by f.provider_id)
          from hut_sources s join area_features f on f.id = s.feature_id
          where s.hut_id = h.id and f.removed_from_source_at is null)
  from huts h
  where public.is_admin()
    and h.archived_at is null
    and h.review_reason is not null
    and h.review_reason is distinct from h.review_dismissed
  order by h.name
$$;

-- 5. Tilganger. Begge halvdeler må revokes — se migrasjon 20261002000000. ---------------

revoke all on public.huts_public from public;

do $$
declare
  v_fn text;
begin
  execute 'revoke execute on function public.refresh_huts() from public';
  execute 'revoke execute on function public.hut_name_key(text) from public';
  execute 'revoke execute on function public.hut_source_priority(text) from public';
  execute 'revoke execute on function public.huts_visible() from public';
  execute 'revoke execute on function public.hut_review_queue() from public';

  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;

  execute 'revoke all on public.huts, public.hut_sources, public.huts_public from anon, authenticated';

  foreach v_fn in array array[
    'public.refresh_huts()',
    'public.hut_name_key(text)',
    'public.hut_source_priority(text)',
    'public.huts_visible()'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from anon, authenticated';
  end loop;

  execute 'revoke execute on function public.hut_review_queue() from anon';
  execute 'grant execute on function public.hut_review_queue() to authenticated';

  foreach v_fn in array array[
    'public.huts_near(double precision, double precision, double precision, integer, text[], text[])',
    'public.huts_in_bbox(double precision, double precision, double precision, double precision, text[], text[], integer)',
    'public.huts_in_municipality(text, text[], text[], integer)',
    'public.huts_search(text, integer)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    execute 'grant execute on function ' || v_fn || ' to anon, authenticated, service_role';
  end loop;
end;
$$;
