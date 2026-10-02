-- ---------------------------------------------------------------------------
-- Hytter: verifisert forvalterinformasjon kan korrigere Kartverket, felt for felt.
--
-- Kontrollen av piloten viste at N50 ikke alltid stemmer på feltnivå: Sæteren gård står som
-- ubetjent men drives som betjent, Bristol står som rastebu men er en åpen koie der man kan
-- overnatte, og fem hytter står som «Ulåst» selv om de har kodelås eller spesialnøkkel.
--
-- Prioriteten for den offentlige verdien er derfor, per felt:
--
--   type      type_override    > N50 > sekundærkilde
--   tilgang   access_override  > N50
--   forvalter manager_verified > Turrutebasen            (fra 20261021000000)
--
-- Kildens verdi skrives aldri over. `hut_type`, `locked` og `overnight` er fortsatt det synken
-- leste; overstyringen ligger i egne kolonner som synken ikke rører, og `huts_public` legger den
-- oppå. Dermed går det alltid an å se «N50 sa X, forvalteren sier Y».
--
-- I tillegg:
--   * `public_note`: én kort, kildebelagt setning brukeren trenger («Kun for skoler og
--     organisasjoner.»). Ikke det samme som `contact_note`, som er intern.
--   * `access_status` tas i bruk. Kolonnen har stått på 'unknown' for alle, og ingen kilde
--     skriver den. Nå kan den settes for hånd til 'closed' når forvalteren oppgir at hytta er
--     midlertidig stengt. En hytte som er borte for godt, avvises i stedet.
--   * En overstyring kan ikke lagres uten kilde: `override_source_url` og
--     `override_verified_at` kreves av en constraint.
--
-- Tilgang er en kontrollert liste, ikke fritekst:
--   locked_prebooking    N50 «Låst»: låst og krever forhåndsbooking
--   unlocked_or_dnt_key  N50 «Ulåst»: ulåst eller DNTs standardnøkkel
--   unlocked, dnt_key, code_lock, special_key, code_or_special_key   bare som overstyring
-- ---------------------------------------------------------------------------

alter table public.huts
  add column type_override text
    check (type_override is null or type_override in
           ('staffed_hut', 'self_service_hut', 'unstaffed_hut', 'rest_cabin', 'open_cabin', 'day_trip_hut', 'emergency_shelter')),
  add column access_override text
    check (access_override is null or access_override in
           ('unlocked', 'dnt_key', 'code_lock', 'special_key', 'code_or_special_key', 'locked_prebooking')),
  add column public_note text
    check (public_note is null or length(trim(public_note)) between 3 and 160),
  add column override_source_url text
    check (override_source_url is null or override_source_url ~ '^https://'),
  add column override_verified_at timestamptz;

comment on column public.huts.type_override is
  'Type etter forvalterens offisielle side, når den avviker fra kilden. Går foran hut_type offentlig.';
comment on column public.huts.access_override is
  'Tilgang etter forvalterens offisielle side. Går foran N50s Låst/Ulåst offentlig.';
comment on column public.huts.public_note is
  'Én kort, kildebelagt setning som vises offentlig. Ikke intern — se contact_note.';
comment on column public.huts.override_source_url is
  'Den offisielle siden overstyringene og merknaden er kontrollert mot. Returneres ikke offentlig.';

-- Ingen overstyring, merknad eller status uten en kilde og et kontrolltidspunkt.
alter table public.huts
  add constraint huts_overstyring_har_kilde
  check ((type_override is null and access_override is null and public_note is null and access_status = 'unknown')
         or (override_source_url is not null and override_verified_at is not null));

-- Tre nye kolonner til slutt; `hut_type` og `overnight` er nå den offentlige verdien.
create or replace view public.huts_public as
  select
    h.id, h.name,
    coalesce(h.type_override, h.hut_type) as hut_type,
    h.owner_kind,
    coalesce(h.manager_verified, h.manager_name) as manager_name,
    h.access_status, h.locked,
    -- Overnatting følger typen. En overstyrt type tar med seg sin egen definisjon: en åpen
    -- koie er til å overnatte i, en rastebu er det ikke.
    case
      when h.type_override in ('staffed_hut', 'self_service_hut', 'unstaffed_hut', 'open_cabin') then 'yes'
      when h.type_override in ('rest_cabin', 'day_trip_hut') then 'no'
      when h.type_override is not null then 'unknown'
      else h.overnight
    end as overnight,
    h.beds, h.booking_url, h.info_url, h.municipality_number,
    extensions.st_y(h.geom) as latitude, extensions.st_x(h.geom) as longitude,
    h.source_updated_at, h.last_seen_at, h.geom, h.name_key,
    h.alt_names || h.aliases as alt_names,
    array(select distinct f.provider_id
          from hut_sources s join area_features f on f.id = s.feature_id
          where s.hut_id = h.id and f.removed_from_source_at is null
          order by 1) as sources,
    coalesce(h.access_override,
             case h.locked when true then 'locked_prebooking' when false then 'unlocked_or_dnt_key' else 'unknown' end) as access_kind,
    h.public_note,
    -- Hvilke felt som avviker fra kilden. Lar siden si at informasjonen er kontrollert mot
    -- forvalteren, uten å vise kilden eller det interne notatet.
    array_remove(array[
      case when h.type_override is not null then 'type' end,
      case when h.access_override is not null then 'access' end,
      case when h.access_status <> 'unknown' then 'status' end,
      case when h.public_note is not null then 'note' end
    ], null) as overridden
  from huts h
  where h.archived_at is null
    and h.rejected_at is null
    and (h.confidence <> 'low' or h.last_verified_at is not null);

-- De offentlige funksjonene får de tre nye kolonnene. Kroppene er ellers uendret.

drop function public.huts_near(double precision, double precision, double precision, integer, text[], text[]);
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
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[],
  access_kind text, public_note text, overridden text[], distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g)
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources, p.access_kind, p.public_note, p.overridden,
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

drop function public.huts_in_bbox(double precision, double precision, double precision, double precision, text[], text[], integer);
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
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[],
  access_kind text, public_note text, overridden text[], total bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources, p.access_kind, p.public_note, p.overridden,
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

drop function public.huts_in_municipality(text, text[], text[], integer);
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
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[],
  access_kind text, public_note text, overridden text[]
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources, p.access_kind, p.public_note, p.overridden
  from huts_public p
  where public.huts_visible()
    and p.municipality_number = p_municipality_number
    and (types is null or p.hut_type = any (types))
    and (owners is null or p.owner_kind = any (owners))
  order by p.name, p.id
  limit least(greatest(max_results, 1), 2000)
$$;

drop function public.huts_search(text, integer);
create function public.huts_search(q text, max_results integer default 20)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, access_status text,
  locked boolean, overnight text, beds integer, booking_url text, info_url text,
  municipality_number text, latitude double precision, longitude double precision,
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[],
  access_kind text, public_note text, overridden text[]
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with nokkel as (select public.hut_name_key(q) as k)
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources, p.access_kind, p.public_note, p.overridden
  from huts_public p, nokkel n
  where public.huts_visible()
    and length(n.k) >= 2
    and (p.name_key like '%' || n.k || '%'
         or exists (select 1 from unnest(p.alt_names) a where public.hut_name_key(a) like '%' || n.k || '%'))
  order by (p.name_key like n.k || '%') desc, p.name, p.id
  limit least(greatest(max_results, 1), 50)
$$;

drop function public.get_hut(text);
create function public.get_hut(p_ref text)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, access_status text,
  locked boolean, overnight text, beds integer, booking_url text, info_url text,
  municipality_number text, latitude double precision, longitude double precision,
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[],
  access_kind text, public_note text, overridden text[]
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources, p.access_kind, p.public_note, p.overridden
  from huts_public p
  where public.huts_visible()
    and p_ref ~ '^[0-9a-f]{8}$'
    and p.id::text like p_ref || '-%'
  order by p.id
  limit 2
$$;

/**
 * Setter overstyringer, status og offentlig merknad på en hytte. Tomme verdier fjerner dem.
 *
 * Kilden er påkrevd så lenge noe er satt: en overstyring er en påstand om at Kartverket tar
 * feil, og den som lagrer, må kunne vise til den offisielle siden som sier det. Kildens egne
 * verdier (`hut_type`, `locked`) røres ikke.
 */
create function public.set_hut_overrides(
  p_hut_id uuid,
  p_type text,
  p_access text,
  p_status text,
  p_public_note text,
  p_source_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type   text := nullif(trim(coalesce(p_type, '')), '');
  v_access text := nullif(trim(coalesce(p_access, '')), '');
  v_status text := coalesce(nullif(trim(coalesce(p_status, '')), ''), 'unknown');
  v_note   text := nullif(trim(coalesce(p_public_note, '')), '');
  v_url    text := nullif(trim(coalesce(p_source_url, '')), '');
  v_tom    boolean;
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  v_tom := v_type is null and v_access is null and v_note is null and v_status = 'unknown';
  if not v_tom and v_url is null then
    raise exception 'En overstyring krever en kilde';
  end if;
  update huts set
    type_override = v_type,
    access_override = v_access,
    access_status = v_status,
    public_note = v_note,
    override_source_url = case when v_tom then null else v_url end,
    override_verified_at = case when v_tom then null else now() end,
    reviewed_by = public.request_email(),
    updated_at = now()
  where id = p_hut_id;
  if not found then
    raise exception 'Fant ikke hytta';
  end if;
end;
$$;

drop function public.hut_contact_list(text);

/**
 * Adminlisten over kontakt og overstyringer. Uten søk: låste hytter, og hytter som har fått
 * noe lagt inn for hånd — de som mangler mest, først. Med søk: hyttene som passer navnet.
 *
 * `hut_type` og `locked` er kildens verdier; `type_override` og `access_override` er det som
 * ligger oppå. Begge returneres, så det går an å se hvorfor siden avviker fra Kartverket.
 */
create function public.hut_contact_list(p_q text default null)
returns table (
  id uuid, name text, hut_type text, owner_kind text, locked boolean,
  manager_name text, manager_verified text, manager_source text,
  booking_url text, info_url text, links_verified_at timestamptz, contact_note text,
  aliases text[],
  municipality_number text, latitude double precision, longitude double precision,
  is_visible boolean,
  type_override text, access_override text, access_status text, public_note text,
  override_source_url text, override_verified_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with nokkel as (select public.hut_name_key(coalesce(p_q, '')) as k)
  select h.id, h.name, h.hut_type, h.owner_kind, h.locked,
         coalesce(h.manager_verified, h.manager_name), h.manager_verified, h.manager_name,
         h.booking_url, h.info_url, h.links_verified_at, h.contact_note, h.aliases,
         h.municipality_number, st_y(h.geom), st_x(h.geom),
         (h.confidence <> 'low' or h.last_verified_at is not null),
         h.type_override, h.access_override, h.access_status, h.public_note,
         h.override_source_url, h.override_verified_at
  from huts h, nokkel n
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and case
          when length(n.k) >= 2 then
            h.name_key like '%' || n.k || '%'
            or exists (select 1 from unnest(h.alt_names || h.aliases) a where public.hut_name_key(a) like '%' || n.k || '%')
          else
            h.locked is true or h.booking_url is not null or h.info_url is not null
            or h.manager_verified is not null or h.contact_note is not null
            or h.override_verified_at is not null
        end
  order by
    (h.locked is true) desc,
    (h.booking_url is not null) asc,
    (h.info_url is not null) asc,
    (coalesce(h.manager_verified, h.manager_name) is not null) asc,
    h.name, h.id
  limit 500
$$;

do $$
declare
  v_fn text;
begin
  execute 'revoke all on public.huts_public from public';
  execute 'revoke execute on function public.set_hut_overrides(uuid, text, text, text, text, text) from public';
  execute 'revoke execute on function public.hut_contact_list(text) from public';

  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;

  execute 'revoke all on public.huts_public from anon, authenticated';

  foreach v_fn in array array[
    'public.set_hut_overrides(uuid, text, text, text, text, text)',
    'public.hut_contact_list(text)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from anon';
    execute 'grant execute on function ' || v_fn || ' to authenticated';
  end loop;

  foreach v_fn in array array[
    'public.huts_near(double precision, double precision, double precision, integer, text[], text[])',
    'public.huts_in_bbox(double precision, double precision, double precision, double precision, text[], text[], integer)',
    'public.huts_in_municipality(text, text[], text[], integer)',
    'public.huts_search(text, integer)',
    'public.get_hut(text)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    execute 'grant execute on function ' || v_fn || ' to anon, authenticated, service_role';
  end loop;
end;
$$;
