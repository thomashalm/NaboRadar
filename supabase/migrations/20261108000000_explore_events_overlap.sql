-- ---------------------------------------------------------------------------
-- Utforsk data (admin): plansaker som overlapper et referanselag.
--
-- «Finn overlapp» i /admin/research/utforsk. Spørsmålet er asymmetrisk: plansakene er det vi
-- leter etter, referanselaget er det de testes mot. Svaret er plansaker — aldri en blanding.
--
-- Referanselaget velges med en fast nøkkel, ikke med fritekst og ikke med dynamisk SQL:
--   'kvikkleire'        kartlagte kvikkleiresoner (flater; områder utredet uten fare er ikke med)
--   'forurenset-grunn'  registrerte lokaliteter (flater)
--   'kraftnett'         kraftledninger (linjer) og transformatorstasjoner (punkter)
-- En annen nøkkel gir ingen rader.
--
-- HVA «OVERLAPPER» BETYR
--   Flate mot flate: minst 10 m² felles areal. Planområder og lokaliteter er ofte tegnet langs
--   samme eiendomsgrense, og to slike flater «overlapper» med en flis på noen få kvadratmeter
--   uten at de har noe med hverandre å gjøre. Målt i produksjon 2026-10-04: ingen par berørte
--   bare i grenselinjen, men forurenset grunn hadde fliser på 1–6 m². Planer som bare har slike,
--   telles i `edge_only` — de er ikke treff, men heller ikke skjult.
--   Flate mot linje eller punkt: linjen eller punktet treffer planområdet.
--
-- Analysen bruker geometrien slik den ligger i databasen. Bare flaten som sendes til kartet,
-- er forenklet. Arealet regnes på ellipsoiden (geography).
--
-- Avgrenset som explore_events: bare admin, alltid et utsnitt, høyst 2 000 plansaker, og høyst
-- 40 referanseobjekter beskrevet per plansak (`hit_count` sier hvor mange det var).
-- ---------------------------------------------------------------------------

create function public.explore_events_overlap(
  p_ref text,
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_area jsonb default null,
  p_limit integer default 800
)
returns table (
  id uuid,
  title text,
  type text,
  municipality_number text,
  announced_at date,
  source_url text,
  area_m2 double precision,
  attributes jsonb,
  documents jsonb,
  geometry jsonb,
  center jsonb,
  hits jsonb,
  hit_count integer,
  total bigint,
  area_total bigint,
  edge_only bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  utsnitt geometry := st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326);
  flate geometry := case when p_area is null then null else st_setsrid(st_geomfromgeojson(p_area::text), 4326) end;
  toleranse double precision := greatest(0.00002, (p_max_lng - p_min_lng) / 4000);
  kilde text := case p_ref
    when 'kvikkleire' then 'nve-kvikkleire-soner'
    when 'forurenset-grunn' then 'mdir-forurenset-grunn'
    when 'kraftnett' then 'nve-nettanlegg'
  end;
  minste_m2 constant double precision := 10;
begin
  if not coalesce(public.is_admin(), false) then
    return;
  end if;
  if kilde is null then
    return;
  end if;
  if p_min_lng is null or p_min_lat is null or p_max_lng is null or p_max_lat is null
     or p_min_lng >= p_max_lng or p_min_lat >= p_max_lat then
    return;
  end if;

  return query
  with plan as materialized (
    select e.id, e.title, e.type, e.municipality_number, e.announced_at, e.source_url,
           e.computed_area_m2, e.attributes, e.geom, e.centroid
    from events e
    where e.removed_from_source_at is null
      and e.geom && utsnitt
      and (flate is null or st_intersects(e.geom, flate))
  ),
  par as materialized (
    -- Felles areal bare for flater. Linjer og punkter har ikke areal: der er treffet nok.
    select p.id as plan_id, a.id as ref_id, a.external_id, a.title as ref_title, a.subtype, a.attributes as ref_attributes,
           case when st_dimension(a.geom) = 2 then st_area(st_intersection(p.geom, a.geom)::geography) end as m2
    from plan p
    join area_features a
      on a.provider_id = kilde
     and a.removed_from_source_at is null
     and a.geom && p.geom
     and st_intersects(a.geom, p.geom)
     -- Et område som er utredet uten fare, er ikke en kvikkleiresone, og er ikke et treff.
     and a.subtype <> 'kvikkleire_utredet_uten_fare'
  ),
  rangert as (
    select r.*, row_number() over (partition by r.plan_id order by r.m2 desc nulls last, r.ref_title, r.ref_id) as nr
    from par r
    where r.m2 is null or r.m2 >= minste_m2
  ),
  per as (
    select r.plan_id,
           count(*)::integer as n,
           jsonb_agg(jsonb_build_object('id', r.ref_id, 'external_id', r.external_id, 'title', r.ref_title,
                                        'subtype', r.subtype, 'attributes', r.ref_attributes)
                     order by r.nr) filter (where r.nr <= 40) as hits
    from rangert r
    group by r.plan_id
  ),
  valgt as (
    select p.*, t.n, t.hits, count(*) over () as total
    from plan p
    join per t on t.plan_id = p.id
    order by p.announced_at desc nulls last, p.id
    limit least(greatest(coalesce(p_limit, 800), 1), 2000)
  )
  select v.id, v.title, v.type, v.municipality_number, v.announced_at, v.source_url, v.computed_area_m2,
         v.attributes || public.event_enrichment_attributes(v.id),
         coalesce((
           select jsonb_agg(jsonb_build_object('type', d.type, 'title', d.title, 'url', d.url, 'date', d.document_date)
                            order by d.document_date desc nulls last, d.title)
           from event_documents d
           where d.event_id = v.id
         ), '[]'::jsonb),
         st_asgeojson(st_simplifypreservetopology(v.geom, toleranse), 6)::jsonb,
         st_asgeojson(v.centroid, 6)::jsonb,
         v.hits,
         v.n,
         v.total,
         (select count(*) from plan),
         (select count(distinct r.plan_id) from par r where not exists (select 1 from per t where t.plan_id = r.plan_id))
  from valgt v
  order by v.announced_at desc nulls last, v.id;
end;
$$;

-- Begge halvdeler må revokes, se migrasjon 20261002000000.
revoke execute on function public.explore_events_overlap(
  text, double precision, double precision, double precision, double precision, jsonb, integer) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.explore_events_overlap(
      text, double precision, double precision, double precision, double precision, jsonb, integer) from anon';
    execute 'grant execute on function public.explore_events_overlap(
      text, double precision, double precision, double precision, double precision, jsonb, integer) to authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';
