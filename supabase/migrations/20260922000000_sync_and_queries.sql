-- NaboRadar — fase 4: sync-funksjoner og spørringer for resultat- og detaljside.
-- All skriving skjer via funksjoner som kun service role (secret key) kan kjøre.

-- ---------------------------------------------------------------------------
-- sync_runs: skill mellom akseptert/avvist (validering) og failed (skriving).
-- ---------------------------------------------------------------------------
alter table public.sync_runs
  add column accepted integer not null default 0,
  add column rejected integer not null default 0;

-- ---------------------------------------------------------------------------
-- upsert_events: skriver én batch normaliserte events + dokumenter.
-- p_events: jsonb-array der hvert element har feltene under (se lib/sync/rows.ts).
-- Polygoner lagres alltid som MultiPolygon (ST_Multi) etter ST_MakeValid.
-- Returnerer tellere + feil per external_id (uten payload).
-- ---------------------------------------------------------------------------
create function public.upsert_events(
  p_provider_id text,
  p_events jsonb,
  p_synced_at timestamptz
)
returns table (inserted integer, updated integer, unchanged integer, failed integer, errors jsonb)
language plpgsql
set search_path = public, extensions
as $$
declare
  ev jsonb;
  geom_in geometry;
  existing record;
  new_id uuid;
  n_inserted integer := 0;
  n_updated integer := 0;
  n_unchanged integer := 0;
  n_failed integer := 0;
  errs jsonb := '[]'::jsonb;
begin
  for ev in select * from jsonb_array_elements(p_events)
  loop
    begin
      geom_in := st_setsrid(st_geomfromgeojson(ev->'geometry'), 4326);
      if st_dimension(geom_in) = 2 then
        geom_in := st_multi(st_collectionextract(st_makevalid(geom_in), 3));
      end if;
      if geom_in is null or st_isempty(geom_in) then
        raise exception 'tom geometri etter validering';
      end if;

      select e.id, e.content_hash, e.removed_from_source_at into existing
      from events e
      where e.provider_id = p_provider_id and e.external_id = ev->>'external_id';

      if not found then
        insert into events (
          provider_id, external_id, type, title, geom, municipality_number, municipality_name,
          announced_at, source_updated_at, source_url, source_url_type, attributes, raw_data,
          content_hash, first_seen_at, synced_at
        ) values (
          p_provider_id, ev->>'external_id', ev->>'type', ev->>'title', geom_in,
          ev->>'municipality_number', ev->>'municipality_name',
          (ev->>'announced_at')::date, (ev->>'source_updated_at')::timestamptz,
          ev->>'source_url', ev->>'source_url_type',
          coalesce(ev->'attributes', '{}'::jsonb), coalesce(ev->'raw_data', '{}'::jsonb),
          ev->>'content_hash', p_synced_at, p_synced_at
        )
        returning id into new_id;
        n_inserted := n_inserted + 1;
      elsif existing.content_hash = ev->>'content_hash' and existing.removed_from_source_at is null then
        update events set synced_at = p_synced_at where id = existing.id;
        n_unchanged := n_unchanged + 1;
        continue;
      else
        update events set
          type = ev->>'type',
          title = ev->>'title',
          geom = geom_in,
          municipality_number = ev->>'municipality_number',
          municipality_name = ev->>'municipality_name',
          announced_at = (ev->>'announced_at')::date,
          source_updated_at = (ev->>'source_updated_at')::timestamptz,
          source_url = ev->>'source_url',
          source_url_type = ev->>'source_url_type',
          attributes = coalesce(ev->'attributes', '{}'::jsonb),
          raw_data = coalesce(ev->'raw_data', '{}'::jsonb),
          content_hash = ev->>'content_hash',
          synced_at = p_synced_at,
          removed_from_source_at = null
        where id = existing.id;
        new_id := existing.id;
        n_updated := n_updated + 1;
        delete from event_documents where event_id = new_id;
      end if;

      insert into event_documents (event_id, external_id, type, title, url, mime_type, document_date)
      select new_id, d->>'external_id', d->>'type', d->>'title', d->>'url', d->>'mime_type',
             (d->>'document_date')::date
      from jsonb_array_elements(coalesce(ev->'documents', '[]'::jsonb)) d;
    exception when others then
      n_failed := n_failed + 1;
      errs := errs || jsonb_build_array(jsonb_build_object(
        'external_id', ev->>'external_id', 'error', left(sqlerrm, 200)));
    end;
  end loop;

  return query select n_inserted, n_updated, n_unchanged, n_failed, errs;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_removed_from_source: etter en KOMPLETT full sync. Events som ikke ble sett i denne
-- kjøringen (synced_at < p_run_synced_at) markeres, men slettes ikke.
-- p_keep_external_ids: poster som ble avvist/feilet i kjøringen — de er ikke bevist borte.
-- ---------------------------------------------------------------------------
create function public.mark_removed_from_source(
  p_provider_id text,
  p_run_synced_at timestamptz,
  p_keep_external_ids text[] default '{}'
)
returns integer
language sql
set search_path = public
as $$
  with marked as (
    update events
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
-- sync_runs: start/slutt. Slutt oppdaterer også providers-raden.
-- ---------------------------------------------------------------------------
create function public.sync_run_start(p_provider_id text, p_mode text)
returns uuid
language sql
set search_path = public
as $$
  insert into sync_runs (provider_id, mode) values (p_provider_id, p_mode) returning id
$$;

create function public.sync_run_finish(p_run_id uuid, p_status text, p_counts jsonb, p_error text default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_provider text;
begin
  update sync_runs set
    status = p_status,
    completed_at = now(),
    fetched = coalesce((p_counts->>'fetched')::integer, 0),
    accepted = coalesce((p_counts->>'accepted')::integer, 0),
    rejected = coalesce((p_counts->>'rejected')::integer, 0),
    inserted = coalesce((p_counts->>'inserted')::integer, 0),
    updated = coalesce((p_counts->>'updated')::integer, 0),
    unchanged = coalesce((p_counts->>'unchanged')::integer, 0),
    removed = coalesce((p_counts->>'removed')::integer, 0),
    failed = coalesce((p_counts->>'failed')::integer, 0),
    error = left(p_error, 1000)
  where id = p_run_id
  returning provider_id into v_provider;

  update providers set
    last_sync_at = now(),
    last_success_at = case when p_status in ('success', 'partial') then now() else last_success_at end,
    last_error = case when p_status = 'success' then null else left(p_error, 1000) end,
    updated_at = now()
  where id = v_provider;
end;
$$;

-- Tidspunktet siste vellykkede kjøring startet — grunnlag for incremental sync.
create function public.last_successful_sync_start(p_provider_id text)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select max(started_at) from sync_runs
  where provider_id = p_provider_id and status in ('success', 'partial')
$$;

-- ---------------------------------------------------------------------------
-- provider_overview: for /dev.
-- ---------------------------------------------------------------------------
create function public.provider_overview()
returns table (
  id text, status text, last_sync_at timestamptz, last_success_at timestamptz, last_error text,
  active_events bigint, removed_events bigint, documents bigint,
  last_run jsonb
)
language sql
stable
set search_path = public
as $$
  select
    p.id, p.status, p.last_sync_at, p.last_success_at, p.last_error,
    (select count(*) from events e where e.provider_id = p.id and e.removed_from_source_at is null),
    (select count(*) from events e where e.provider_id = p.id and e.removed_from_source_at is not null),
    (select count(*) from event_documents d join events e on e.id = d.event_id where e.provider_id = p.id),
    (select to_jsonb(r) - 'provider_id' from sync_runs r where r.provider_id = p.id order by r.started_at desc limit 1)
  from providers p
  order by p.id
$$;

-- ---------------------------------------------------------------------------
-- events_within v2: sortering, lavere koordinatpresisjon i GeoJSON (~0,1 m), attributter.
-- Treff = polygonet ligger helt eller delvis innen radius (ST_DWithin på faktisk geometri).
-- ---------------------------------------------------------------------------
drop function public.events_within(double precision, double precision, double precision, date, boolean);

create function public.events_within(
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
    h.municipality_number, h.source_url, h.source_url_type, h.attributes
  from hits h
  order by
    case when sort = 'newest' then h.announced_at end desc nulls last,
    h.dist,
    h.announced_at desc nulls last,
    h.id
  limit least(greatest(max_results, 1), 500)
$$;

-- ---------------------------------------------------------------------------
-- get_event: detaljside. Avstand beregnes kun hvis søkepunkt er oppgitt.
-- Viser også events som er fjernet fra kilden (markert), slik at delte lenker ikke brekker.
-- ---------------------------------------------------------------------------
create function public.get_event(
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
    e.municipality_number, e.municipality_name, e.source_url, e.source_url_type, e.attributes,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'type', d.type, 'title', d.title, 'url', d.url,
        'mime_type', d.mime_type, 'document_date', d.document_date
      ) order by d.document_date desc nulls last, d.title)
      from event_documents d where d.event_id = e.id
    ), '[]'::jsonb)
  from events e
  where e.id = event_id
$$;

-- ---------------------------------------------------------------------------
-- data_status: offentlig. Når ble aktive kilder sist hentet? Lar UI skille
-- «ingen saker» fra «data ikke hentet ennå».
-- ---------------------------------------------------------------------------
create function public.data_status()
returns table (provider_id text, name text, last_success_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.last_success_at from providers p where p.status = 'active' order by p.id
$$;

-- ---------------------------------------------------------------------------
-- Tilganger. Supabase gir nye funksjoner EXECUTE til public/anon som standard — stram inn.
-- ---------------------------------------------------------------------------
revoke execute on function public.upsert_events(text, jsonb, timestamptz) from public;
revoke execute on function public.mark_removed_from_source(text, timestamptz, text[]) from public;
revoke execute on function public.sync_run_start(text, text) from public;
revoke execute on function public.sync_run_finish(uuid, text, jsonb, text) from public;
revoke execute on function public.last_successful_sync_start(text) from public;
revoke execute on function public.provider_overview() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.upsert_events(text, jsonb, timestamptz) from anon, authenticated';
    execute 'revoke execute on function public.mark_removed_from_source(text, timestamptz, text[]) from anon, authenticated';
    execute 'revoke execute on function public.sync_run_start(text, text) from anon, authenticated';
    execute 'revoke execute on function public.sync_run_finish(uuid, text, jsonb, text) from anon, authenticated';
    execute 'revoke execute on function public.last_successful_sync_start(text) from anon, authenticated';
    execute 'revoke execute on function public.provider_overview() from anon, authenticated';
    execute 'grant execute on function public.events_within(double precision, double precision, double precision, date, text, integer) to anon, authenticated';
    execute 'grant execute on function public.get_event(uuid, double precision, double precision) to anon, authenticated';
    execute 'grant execute on function public.data_status() to anon, authenticated';
  end if;
end;
$$;
