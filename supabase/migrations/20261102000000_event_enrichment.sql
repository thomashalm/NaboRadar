-- ---------------------------------------------------------------------------
-- Planer og saker v2, trinn 1: tiltakstype og formål per plansak.
--
-- Kilden (DiBK Planlegging igangsatt) har ikke formål som felt. Det står i dokumentene:
-- planinitiativet og varselet. Synken henter nå også de to dokumenttypene, og et eget steg
-- (scripts/enrich-plans.ts) leser tekstlaget i PDF-ene og trekker ut én formålssetning med faste
-- tekstmønstre. Ingen AI, og ingen tolkning når siden vises.
--
-- Det uttrukne ligger i en egen tabell, ikke i events:
--   * kildedata overskrives ikke, og content_hash endres ikke av vår egen tolkning,
--   * en ny synk av saken sletter ikke uttrekket,
--   * parser_version og documents_fingerprint sier når uttrekket må gjøres om.
--
-- Bare det uttrukne lagres: tiltakstype, én setning og en referanse til dokumentet den kom fra.
-- Dokumentteksten lagres aldri.
-- ---------------------------------------------------------------------------

-- 1. To nye dokumenttyper fra samme kilde ------------------------------------

alter table public.event_documents drop constraint event_documents_type_check;
alter table public.event_documents add constraint event_documents_type_check
  check (type in ('ref-data-as-pdf', 'PlanomraadePdf', 'ReferatOppstartsmoete', 'Planinitiativ', 'Planvarsel'));

-- 2. Uttrekket ---------------------------------------------------------------

create table public.event_enrichment (
  event_id                     uuid primary key references public.events (id) on delete cascade,
  -- Versjonen av reglene i lib/plans. Økes når mønstrene endres, så alt leses på nytt.
  parser_version               integer not null check (parser_version > 0),
  -- Hvilke dokumenter og hvilken tittel uttrekket bygger på. Endres de, leses saken på nytt.
  documents_fingerprint        text not null,
  measure_type                 text not null check (measure_type in (
    'bolig', 'bolig_naering', 'fritidsbolig', 'naering', 'industri', 'datasenter', 'masseuttak',
    'samferdsel', 'skole_barnehage', 'helse_omsorg', 'hotell_servering', 'idrett_park', 'energi',
    'teknisk', 'transformasjon', 'annet')),
  measure_type_source          text check (measure_type_source in ('tittel', 'formaal')),
  -- Ordrett fra dokumentet. Mengder er erstattet med «[…]».
  purpose                      text check (purpose is null or length(purpose) between 25 and 300),
  -- event_documents slettes og settes inn på nytt ved synk, så referansen er kildens dokument-ID.
  purpose_document_external_id text,
  purpose_document_type        text,
  purpose_method               text check (purpose_method in ('skjemafelt', 'setning', 'skjemafelt_forste_setning')),
  updated_at                   timestamptz not null default now(),
  check ((purpose is null) = (purpose_document_external_id is null)),
  check ((purpose is null) = (purpose_document_type is null)),
  check ((purpose is null) = (purpose_method is null))
);

comment on table public.event_enrichment is
  'Tiltakstype og formålssetning per plansak, trukket ut deterministisk under synk. Aldri dokumenttekst.';

alter table public.event_enrichment enable row level security;
revoke all on public.event_enrichment from public, anon, authenticated;

/** Dokumentene uttrekket kan bygge på, som ett fingeravtrykk sammen med tittelen. */
create function public.event_enrichment_fingerprint(p_event_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select md5(
    e.title || '|' || coalesce((
      select string_agg(d.external_id || ':' || d.type, ',' order by d.external_id)
      from event_documents d
      where d.event_id = e.id
        and d.type in ('Planinitiativ', 'Planvarsel', 'ref-data-as-pdf', 'ReferatOppstartsmoete')
    ), '')
  )
  from events e
  where e.id = p_event_id
$$;

/** Sakene som mangler uttrekk, eller der reglene, tittelen eller dokumentene er endret. */
create function public.events_for_enrichment(p_parser_version integer, p_limit integer default 200)
returns table (event_id uuid, title text, fingerprint text, documents jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.title, f.fingerprint,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'external_id', d.external_id, 'type', d.type, 'url', d.url,
        'mime_type', d.mime_type, 'document_date', d.document_date
      ) order by d.document_date desc nulls last, d.external_id)
      from event_documents d
      where d.event_id = e.id
        and d.type in ('Planinitiativ', 'Planvarsel', 'ref-data-as-pdf', 'ReferatOppstartsmoete')
    ), '[]'::jsonb)
  from events e
  cross join lateral (select public.event_enrichment_fingerprint(e.id) as fingerprint) f
  left join event_enrichment x on x.event_id = e.id
  where e.removed_from_source_at is null
    and (x.event_id is null or x.parser_version <> p_parser_version or x.documents_fingerprint <> f.fingerprint)
  order by e.announced_at desc nulls last, e.id
  limit least(greatest(p_limit, 1), 1000)
$$;

/** Lagrer uttrekk. Rader for saker som ikke finnes lenger, hoppes over. */
create function public.upsert_event_enrichment(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  antall integer;
begin
  insert into event_enrichment as x (
    event_id, parser_version, documents_fingerprint, measure_type, measure_type_source,
    purpose, purpose_document_external_id, purpose_document_type, purpose_method, updated_at
  )
  select
    (r->>'event_id')::uuid, (r->>'parser_version')::integer, r->>'documents_fingerprint',
    r->>'measure_type', r->>'measure_type_source',
    r->>'purpose', r->>'purpose_document_external_id', r->>'purpose_document_type', r->>'purpose_method', now()
  from jsonb_array_elements(p_rows) r
  where exists (select 1 from events e where e.id = (r->>'event_id')::uuid)
  on conflict (event_id) do update set
    parser_version = excluded.parser_version,
    documents_fingerprint = excluded.documents_fingerprint,
    measure_type = excluded.measure_type,
    measure_type_source = excluded.measure_type_source,
    purpose = excluded.purpose,
    purpose_document_external_id = excluded.purpose_document_external_id,
    purpose_document_type = excluded.purpose_document_type,
    purpose_method = excluded.purpose_method,
    updated_at = now();
  get diagnostics antall = row_count;
  return antall;
end;
$$;

/** Feltene lese-RPC-ene legger til i `attributes`. Tomt objekt når saken ikke har uttrekk. */
create function public.event_enrichment_attributes(p_event_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce((
    select jsonb_strip_nulls(jsonb_build_object(
      'tiltakstype', x.measure_type,
      'formaal', x.purpose,
      'formaalDokumenttype', x.purpose_document_type,
      'formaalDokumentId', x.purpose_document_external_id
    ))
    from event_enrichment x
    where x.event_id = p_event_id
  ), '{}'::jsonb)
$$;

-- 3. Lese-RPC-ene: samme signatur, uttrekket lagt til i attributes -----------

create or replace function public.events_within(
  lat double precision,
  lng double precision,
  radius_m double precision,
  announced_since date default null,
  sort text default 'distance',
  max_results integer default 200
)
returns table (
  id uuid,
  type text,
  title text,
  announced_at date,
  source_updated_at timestamptz,
  distance_m double precision,
  computed_area_m2 double precision,
  centroid jsonb,
  geometry jsonb,
  municipality_number text,
  source_url text,
  source_url_type text,
  attributes jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  ),
  hits as (
    select e.*, st_distance(e.geom::geography, o.g) as dist
    from events e, origin o
    where radius_m > 0 and radius_m <= 10000
      and st_dwithin(e.geom::geography, o.g, radius_m)
      and e.removed_from_source_at is null
      and (announced_since is null or e.announced_at >= announced_since)
  )
  select
    h.id, h.type, h.title, h.announced_at, h.source_updated_at, h.dist,
    h.computed_area_m2,
    st_asgeojson(h.centroid, 6)::jsonb,
    st_asgeojson(h.geom, 6)::jsonb,
    h.municipality_number, h.source_url, h.source_url_type,
    h.attributes || public.event_enrichment_attributes(h.id)
  from hits h
  order by
    case when sort = 'newest' then h.announced_at end desc nulls last,
    h.dist,
    h.announced_at desc nulls last,
    h.id
  limit least(greatest(max_results, 1), 500)
$$;

create or replace function public.get_event(
  event_id uuid,
  lat double precision default null,
  lng double precision default null
)
returns table (
  id uuid,
  provider_id text,
  type text,
  title text,
  announced_at date,
  source_updated_at timestamptz,
  synced_at timestamptz,
  removed_from_source_at timestamptz,
  distance_m double precision,
  computed_area_m2 double precision,
  centroid jsonb,
  geometry jsonb,
  municipality_number text,
  municipality_name text,
  source_url text,
  source_url_type text,
  attributes jsonb,
  documents jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.id, e.provider_id, e.type, e.title, e.announced_at, e.source_updated_at, e.synced_at,
    e.removed_from_source_at,
    case when lat is not null and lng is not null
      then st_distance(e.geom::geography, st_setsrid(st_makepoint(lng, lat), 4326)::geography)
    end,
    e.computed_area_m2,
    st_asgeojson(e.centroid, 6)::jsonb,
    st_asgeojson(e.geom, 6)::jsonb,
    e.municipality_number, e.municipality_name, e.source_url, e.source_url_type,
    e.attributes || public.event_enrichment_attributes(e.id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'external_id', d.external_id, 'type', d.type, 'title', d.title, 'url', d.url,
        'mime_type', d.mime_type, 'document_date', d.document_date
      ) order by d.document_date desc nulls last, d.title)
      from event_documents d where d.event_id = e.id
    ), '[]'::jsonb)
  from events e
  where e.id = event_id
$$;

-- 4. Tilganger ---------------------------------------------------------------
-- Uttrekket skrives bare av synken (service role). Det leses bare gjennom events_within og
-- get_event, som allerede er åpne.

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.event_enrichment_fingerprint(uuid)',
    'public.events_for_enrichment(integer, integer)',
    'public.upsert_event_enrichment(jsonb)',
    'public.event_enrichment_attributes(uuid)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon, authenticated', fn);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.events_for_enrichment(integer, integer) to service_role';
    execute 'grant execute on function public.upsert_event_enrichment(jsonb) to service_role';
  end if;
end;
$$;
