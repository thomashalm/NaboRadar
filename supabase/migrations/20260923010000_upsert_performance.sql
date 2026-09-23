-- Ytelse i upsert-funksjonene.
--
-- 1. ST_MakeValid er dyr på store polygoner (NVEs største kvikkleiresone har 125 000 hjørner).
--    Den kjøres nå bare når geometrien faktisk er ugyldig — ST_IsValid er langt billigere.
-- 2. Supabase har en kort statement_timeout. Skriving av store geometrier trenger mer,
--    så vi setter et eget budsjett lokalt i transaksjonen (gjelder kun dette kallet).

create or replace function public.upsert_area_features(
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
  perform set_config('statement_timeout', '120s', true);

  for ft in select * from jsonb_array_elements(p_features)
  loop
    begin
      geom_in := st_setsrid(st_geomfromgeojson(ft->'geometry'), 4326);
      if st_dimension(geom_in) = 2 then
        geom_in := st_multi(
          case when st_isvalid(geom_in) then geom_in
               else st_collectionextract(st_makevalid(geom_in), 3) end);
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

create or replace function public.upsert_events(
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
  perform set_config('statement_timeout', '120s', true);

  for ev in select * from jsonb_array_elements(p_events)
  loop
    begin
      geom_in := st_setsrid(st_geomfromgeojson(ev->'geometry'), 4326);
      if st_dimension(geom_in) = 2 then
        geom_in := st_multi(
          case when st_isvalid(geom_in) then geom_in
               else st_collectionextract(st_makevalid(geom_in), 3) end);
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
