-- ---------------------------------------------------------------------------
-- Privat research: funn og leads som bare drift ser.
--
-- To tabeller, fordi provenance er poenget. Et funn kan hvile på flere kilder, og en enkelt
-- source_url-kolonne ville tvunget oss til å velge én — eller til å lime sammen lenker i en
-- tekststreng. admin_research_sources lar hvert funn bære så mange kilder det faktisk har,
-- hver med sin egen dato, utgiver og vurdering av om den støtter påstanden.
--
-- Modellen dekker både manuelle leads og importerte funn. Forskjellen ligger i origin_type,
-- ikke i to parallelle tabeller: et manuelt lead som senere bekreftes av en synket kilde skal
-- kunne beholde sin historikk i stedet for å bli opprettet på nytt.
--
-- SIKKERHET. Dette er interne data, og ingenting her skal noen gang nå en offentlig side.
--   * RLS med kun én select-policy: authenticated som består is_admin().
--   * Ingen skriverettigheter på tabellene i det hele tatt. All skriving går gjennom
--     security definer-funksjoner som sjekker is_admin() selv, slik request_sync gjør.
--     Da er RLS andre forsvarslinje for lesing, og eneste vei inn for skriving er en
--     funksjon som må slippe deg gjennom.
--   * Kategorien finnes ikke i area_features, så features_near kan ikke returnere research.
--     Det offentlige kartet og /omrade ser dem aldri.
--
-- Research publiseres aldri automatisk. Et funn som skal ut til brukerne må gjennom den
-- vanlige veien: en provider, en kilde med lisens, og en visningsregel.
-- ---------------------------------------------------------------------------

create table public.admin_research_items (
  id                  uuid primary key default gen_random_uuid(),

  item_type           text not null default 'finding'
                        check (item_type in ('finding', 'lead', 'note', 'data_issue')),
  category            text not null,
  subcategory         text,

  title               text not null check (length(trim(title)) > 0),
  description         text,

  municipality        text,
  address             text,
  postal_code         text check (postal_code is null or postal_code ~ '^\d{4}$'),
  city                text,
  -- Samme grenser som resten av basen: Fastlands-Norge med margin.
  latitude            double precision check (latitude is null or latitude between 57 and 72),
  longitude           double precision check (longitude is null or longitude between 4 and 32),
  geom                extensions.geometry(Geometry, 4326),

  origin_type         text not null default 'manual' check (origin_type in ('manual', 'imported')),
  /** Provider-id når funnet kom fra en synk. Null for manuelle leads. */
  origin_provider     text,

  verification_status text not null default 'unverified'
                        check (verification_status in ('unverified', 'partially_verified',
                               'verified_public_source', 'investigated_not_confirmed',
                               'rejected', 'archived')),
  operational_status  text not null default 'unknown'
                        check (operational_status in ('active', 'planned', 'under_construction',
                               'historical', 'closed', 'unknown')),
  -- Manuelle leads er interne til noen har bestemt noe annet.
  sensitivity         text not null default 'internal_only'
                        check (sensitivity in ('normal', 'internal_only', 'do_not_publish')),
  reason_not_public   text,

  confidence          text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  interest_level      text not null default 'medium' check (interest_level in ('low', 'medium', 'high')),
  why_interesting     text,
  notes               text,

  first_seen_at       timestamptz not null default now(),
  last_checked_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  /** Hvem som la det inn. E-post fra JWT-en, satt av funksjonen — ikke av kalleren. */
  created_by          text,

  -- Et importert funn skal kunne spores til kilden sin.
  check (origin_type = 'manual' or origin_provider is not null),
  -- Koordinat er enten helt satt eller helt fraværende.
  check ((latitude is null) = (longitude is null))
);

create index admin_research_items_geom_idx on public.admin_research_items
  using gist ((geom::extensions.geography));
create index admin_research_items_category_idx on public.admin_research_items (category);
create index admin_research_items_municipality_idx on public.admin_research_items (municipality);

create table public.admin_research_sources (
  id                  uuid primary key default gen_random_uuid(),
  research_item_id    uuid not null references public.admin_research_items (id) on delete cascade,

  source_name         text not null check (length(trim(source_name)) > 0),
  source_url          text check (source_url is null or source_url ~* '^https?://'),
  publisher           text,
  source_type         text not null default 'web'
                        check (source_type in ('web', 'register', 'map_service', 'document',
                               'regulation', 'news', 'correspondence', 'other')),
  source_date         date,
  accessed_at         timestamptz not null default now(),
  /** Om dette er hovedkilden for påstanden. Flere kan være sanne; ingen må være det. */
  primary_source      boolean not null default false,
  /**
   * Om kilden støtter påstanden. En kilde som ble undersøkt og *ikke* fant noe er like mye
   * verdt å ta vare på — det er den som gjør investigated_not_confirmed etterprøvbar.
   */
  supports_claim      boolean not null default true,
  excerpt_or_summary  text,
  notes               text,
  created_at          timestamptz not null default now()
);

create index admin_research_sources_item_idx on public.admin_research_sources (research_item_id);

-- ---------------------------------------------------------------------------
-- Tilgang: lesing bak is_admin(), ingen skriverettigheter på tabellene.
-- ---------------------------------------------------------------------------
alter table public.admin_research_items   enable row level security;
alter table public.admin_research_sources enable row level security;

create policy "kun admin leser" on public.admin_research_items
  for select to authenticated using (public.is_admin());
create policy "kun admin leser" on public.admin_research_sources
  for select to authenticated using (public.is_admin());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    -- Ingen rettigheter til anon i det hele tatt, og kun select til authenticated.
    execute 'revoke all on public.admin_research_items, public.admin_research_sources from anon, authenticated';
    execute 'grant select on public.admin_research_items, public.admin_research_sources to authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lesefunksjoner. Security definer med is_admin()-sjekk, som resten av admin-laget.
-- ---------------------------------------------------------------------------

/**
 * Alle funn, med antall kilder. Fritekstsøket dekker tittel, beskrivelse, adresse, kommune,
 * sted, kategori, underkategori, notater og kildenavn — altså også kilder, slik at et søk på
 * «Enhetsregisteret» finner funnene som hviler på det.
 */
create function public.research_items(p_search text default null)
returns table (
  id uuid, item_type text, category text, subcategory text, title text, description text,
  municipality text, address text, postal_code text, city text,
  latitude double precision, longitude double precision,
  origin_type text, origin_provider text,
  verification_status text, operational_status text, sensitivity text, reason_not_public text,
  confidence text, interest_level text, why_interesting text, notes text,
  first_seen_at timestamptz, last_checked_at timestamptz, created_at timestamptz,
  updated_at timestamptz, created_by text, source_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.item_type, i.category, i.subcategory, i.title, i.description,
         i.municipality, i.address, i.postal_code, i.city, i.latitude, i.longitude,
         i.origin_type, i.origin_provider,
         i.verification_status, i.operational_status, i.sensitivity, i.reason_not_public,
         i.confidence, i.interest_level, i.why_interesting, i.notes,
         i.first_seen_at, i.last_checked_at, i.created_at, i.updated_at, i.created_by,
         (select count(*) from admin_research_sources s where s.research_item_id = i.id)
  from admin_research_items i
  where public.is_admin()
    and (
      p_search is null or length(trim(p_search)) = 0
      or concat_ws(' ', i.title, i.description, i.address, i.municipality, i.city,
                   i.category, i.subcategory, i.notes, i.why_interesting,
                   (select string_agg(s.source_name, ' ') from admin_research_sources s
                     where s.research_item_id = i.id))
         ilike '%' || trim(p_search) || '%'
    )
  order by i.interest_level desc, i.updated_at desc
$$;

/** Kildene til ett funn. */
create function public.research_sources(p_item_id uuid)
returns table (
  id uuid, source_name text, source_url text, publisher text, source_type text,
  source_date date, accessed_at timestamptz, primary_source boolean, supports_claim boolean,
  excerpt_or_summary text, notes text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.source_name, s.source_url, s.publisher, s.source_type, s.source_date,
         s.accessed_at, s.primary_source, s.supports_claim, s.excerpt_or_summary, s.notes,
         s.created_at
  from admin_research_sources s
  where public.is_admin() and s.research_item_id = p_item_id
  order by s.primary_source desc, s.source_date desc nulls last, s.source_name
$$;

/**
 * Funn innenfor radius, til admins adressesøk.
 *
 * Bare funn med koordinat. Et lead uten posisjon hører hjemme i /admin/research, ikke på et
 * kart — vi plasserer det ikke i nærheten av noe.
 */
create function public.research_near(
  lat double precision,
  lng double precision,
  radius_m double precision
)
returns table (
  id uuid, category text, subcategory text, title text, description text,
  address text, municipality text,
  latitude double precision, longitude double precision, distance_m double precision,
  verification_status text, operational_status text, sensitivity text,
  confidence text, interest_level text, source_count bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g)
  select i.id, i.category, i.subcategory, i.title, i.description, i.address, i.municipality,
         i.latitude, i.longitude,
         st_distance(st_setsrid(st_makepoint(i.longitude, i.latitude), 4326)::geography, o.g),
         i.verification_status, i.operational_status, i.sensitivity,
         i.confidence, i.interest_level,
         (select count(*) from admin_research_sources s where s.research_item_id = i.id)
  from admin_research_items i, origin o
  where public.is_admin()
    and i.latitude is not null
    and radius_m > 0 and radius_m <= 10000
    and i.verification_status not in ('rejected', 'archived')
    and st_dwithin(st_setsrid(st_makepoint(i.longitude, i.latitude), 4326)::geography, o.g, radius_m)
  order by 11
$$;

-- ---------------------------------------------------------------------------
-- Skrivefunksjoner. Tabellene har ingen skriverettigheter; dette er eneste vei inn.
-- ---------------------------------------------------------------------------

/**
 * Oppretter eller oppdaterer et funn. p_id null oppretter.
 *
 * Feltene tas som jsonb slik at kallet ikke må endres hver gang modellen får et felt til.
 * Ukjente nøkler ignoreres, og alt som ikke sendes beholder sin verdi ved oppdatering —
 * en redigering av tittelen skal ikke nullstille notatene.
 */
create function public.save_research_item(p_id uuid, p_fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_lat double precision := nullif(p_fields->>'latitude', '')::double precision;
  v_lng double precision := nullif(p_fields->>'longitude', '')::double precision;
begin
  if not public.is_admin() then
    raise exception 'Krever driftstilgang' using errcode = '42501';
  end if;

  if p_id is null then
    insert into admin_research_items (
      item_type, category, subcategory, title, description,
      municipality, address, postal_code, city, latitude, longitude, geom,
      origin_type, origin_provider, verification_status, operational_status,
      sensitivity, reason_not_public, confidence, interest_level, why_interesting, notes,
      last_checked_at, created_by
    ) values (
      coalesce(nullif(p_fields->>'item_type', ''), 'finding'),
      p_fields->>'category',
      nullif(p_fields->>'subcategory', ''),
      p_fields->>'title',
      nullif(p_fields->>'description', ''),
      nullif(p_fields->>'municipality', ''),
      nullif(p_fields->>'address', ''),
      nullif(p_fields->>'postal_code', ''),
      nullif(p_fields->>'city', ''),
      v_lat, v_lng,
      case when v_lat is not null then extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326) end,
      coalesce(nullif(p_fields->>'origin_type', ''), 'manual'),
      nullif(p_fields->>'origin_provider', ''),
      coalesce(nullif(p_fields->>'verification_status', ''), 'unverified'),
      coalesce(nullif(p_fields->>'operational_status', ''), 'unknown'),
      coalesce(nullif(p_fields->>'sensitivity', ''), 'internal_only'),
      nullif(p_fields->>'reason_not_public', ''),
      coalesce(nullif(p_fields->>'confidence', ''), 'low'),
      coalesce(nullif(p_fields->>'interest_level', ''), 'medium'),
      nullif(p_fields->>'why_interesting', ''),
      nullif(p_fields->>'notes', ''),
      nullif(p_fields->>'last_checked_at', '')::timestamptz,
      nullif(public.request_email(), '')
    )
    returning id into v_id;
    return v_id;
  end if;

  update admin_research_items set
    item_type           = coalesce(nullif(p_fields->>'item_type', ''), item_type),
    category            = coalesce(nullif(p_fields->>'category', ''), category),
    subcategory         = case when p_fields ? 'subcategory' then nullif(p_fields->>'subcategory', '') else subcategory end,
    title               = coalesce(nullif(p_fields->>'title', ''), title),
    description         = case when p_fields ? 'description' then nullif(p_fields->>'description', '') else description end,
    municipality        = case when p_fields ? 'municipality' then nullif(p_fields->>'municipality', '') else municipality end,
    address             = case when p_fields ? 'address' then nullif(p_fields->>'address', '') else address end,
    postal_code         = case when p_fields ? 'postal_code' then nullif(p_fields->>'postal_code', '') else postal_code end,
    city                = case when p_fields ? 'city' then nullif(p_fields->>'city', '') else city end,
    latitude            = case when p_fields ? 'latitude' then v_lat else latitude end,
    longitude           = case when p_fields ? 'longitude' then v_lng else longitude end,
    geom                = case
                            when p_fields ? 'latitude' and v_lat is not null
                              then extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)
                            when p_fields ? 'latitude' then null
                            else geom
                          end,
    verification_status = coalesce(nullif(p_fields->>'verification_status', ''), verification_status),
    operational_status  = coalesce(nullif(p_fields->>'operational_status', ''), operational_status),
    sensitivity         = coalesce(nullif(p_fields->>'sensitivity', ''), sensitivity),
    reason_not_public   = case when p_fields ? 'reason_not_public' then nullif(p_fields->>'reason_not_public', '') else reason_not_public end,
    confidence          = coalesce(nullif(p_fields->>'confidence', ''), confidence),
    interest_level      = coalesce(nullif(p_fields->>'interest_level', ''), interest_level),
    why_interesting     = case when p_fields ? 'why_interesting' then nullif(p_fields->>'why_interesting', '') else why_interesting end,
    notes               = case when p_fields ? 'notes' then nullif(p_fields->>'notes', '') else notes end,
    last_checked_at     = case when p_fields ? 'last_checked_at' then nullif(p_fields->>'last_checked_at', '')::timestamptz else last_checked_at end,
    updated_at          = now()
  where id = p_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Fant ikke funnet %', p_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

/** Legger til en kilde på et funn. */
create function public.add_research_source(p_item_id uuid, p_fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Krever driftstilgang' using errcode = '42501';
  end if;

  insert into admin_research_sources (
    research_item_id, source_name, source_url, publisher, source_type, source_date,
    primary_source, supports_claim, excerpt_or_summary, notes
  ) values (
    p_item_id,
    p_fields->>'source_name',
    nullif(p_fields->>'source_url', ''),
    nullif(p_fields->>'publisher', ''),
    coalesce(nullif(p_fields->>'source_type', ''), 'web'),
    nullif(p_fields->>'source_date', '')::date,
    coalesce((p_fields->>'primary_source')::boolean, false),
    coalesce((p_fields->>'supports_claim')::boolean, true),
    nullif(p_fields->>'excerpt_or_summary', ''),
    nullif(p_fields->>'notes', '')
  )
  returning id into v_id;

  update admin_research_items set updated_at = now() where id = p_item_id;
  return v_id;
end;
$$;

/** Sletter en kilde. Funnet beholdes — en kilde kan vise seg å være feil uten at funnet er det. */
create function public.delete_research_source(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Krever driftstilgang' using errcode = '42501';
  end if;
  delete from admin_research_sources where id = p_id;
end;
$$;

-- Ingen av disse skal kunne kalles av anon. Begge halvdeler må revokes — se migrasjon
-- 20261002000000 og 20261003000000 for hvorfor «from public» alene ikke holder.
do $$
declare fn text;
begin
  foreach fn in array array[
    'research_items(text)', 'research_sources(uuid)',
    'research_near(double precision,double precision,double precision)',
    'save_research_item(uuid,jsonb)', 'add_research_source(uuid,jsonb)',
    'delete_research_source(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function public.%s from anon', fn);
      execute format('grant execute on function public.%s to authenticated', fn);
    end if;
  end loop;
end;
$$;
