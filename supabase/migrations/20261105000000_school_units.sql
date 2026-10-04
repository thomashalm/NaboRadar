-- ---------------------------------------------------------------------------
-- Skolefilter for offentlig visning.
--
-- Udirs register fører også eksamenskontor, voksenopplæring, nettskoler, fagskoler og bibelskoler
-- som skoler. De er riktige i registeret, men er ikke det en boligkjøper mener med en skole i
-- nærområdet. `school_units` holder primær næringskode fra registeret og hvorfor en enhet
-- eventuelt ikke vises offentlig. Reglene bor i lib/schools/classification.ts.
--
-- Dette er et produktfilter, ikke en retting av kilden:
--   - radene i area_features er urørt, og synken skriver dem som før
--   - offentlige lesere (anon og vanlige innloggede) får ikke enheter med `hidden_reason`
--   - admin får alle, med grunnen i `attributes.offentligSkjult`
--   - en enhet uten rad her er ukjent, og vises. En feil hos Udir skjuler ingen skole.
--
-- Egen tabell og ikke et felt i `attributes`: synken skriver `attributes` på nytt fra kilden hver
-- gang, og næringskoden kommer ikke fra den kilden.
-- ---------------------------------------------------------------------------

create table public.school_units (
  -- Organisasjonsnummeret: `external_id` for udir-skoler i area_features.
  orgnr          text primary key,
  primary_nace   text,
  nace_codes     text[] not null default '{}',
  -- Null = ordinær skole. Satt = vises ikke i den offentlige skolelisten.
  hidden_reason  text check (hidden_reason in ('adult_education', 'exam_office', 'online_school',
                                               'vocational_college', 'bible_school', 'other_nonstandard')),
  -- Hvilken regel som skjulte enheten: næringskoden eller navnet.
  rule           text check (rule in ('nace', 'name')),
  -- Registerets `DatoEndret` da næringskoden ble hentet. Brukes til å hente bare det som er endret.
  nsr_changed_at timestamptz,
  checked_at     timestamptz not null default now(),
  check ((hidden_reason is null) = (rule is null))
);

alter table public.school_units enable row level security;
revoke all on public.school_units from public, anon, authenticated;

/** Skolene i area_features med det vi vet om dem. Sortert, fordi API-et gir 1 000 rader per kall. */
create function public.school_units_state()
returns table (
  orgnr text, title text, primary_nace text, nace_codes text[], nsr_changed_at timestamptz,
  hidden_reason text, rule text, has_row boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select a.external_id, a.title, s.primary_nace, s.nace_codes, s.nsr_changed_at, s.hidden_reason, s.rule, s.orgnr is not null
  from area_features a
  left join school_units s on s.orgnr = a.external_id
  where a.provider_id = 'udir-skoler' and a.removed_from_source_at is null
  order by a.external_id
$$;

/** Lagrer klassifiseringen. Rader for skoler som ikke finnes, hoppes over. */
create function public.upsert_school_units(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  antall integer;
begin
  insert into school_units as x (orgnr, primary_nace, nace_codes, hidden_reason, rule, nsr_changed_at, checked_at)
  select
    r->>'orgnr', r->>'primary_nace',
    coalesce(array(select jsonb_array_elements_text(r->'nace_codes')), '{}'),
    r->>'hidden_reason', r->>'rule', (r->>'nsr_changed_at')::timestamptz, now()
  from jsonb_array_elements(p_rows) r
  where exists (select 1 from area_features a where a.provider_id = 'udir-skoler' and a.external_id = r->>'orgnr')
  on conflict (orgnr) do update set
    primary_nace = excluded.primary_nace,
    nace_codes = excluded.nace_codes,
    hidden_reason = excluded.hidden_reason,
    rule = excluded.rule,
    nsr_changed_at = excluded.nsr_changed_at,
    checked_at = now();
  get diagnostics antall = row_count;
  return antall;
end;
$$;

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.school_units_state()',
    'public.upsert_school_units(jsonb)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    execute 'revoke execute on function ' || v_fn || ' from anon, authenticated';
    execute 'grant execute on function ' || v_fn || ' to service_role';
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lesefunksjonene: skjulte enheter ut for offentlige lesere, merket for admin.
-- Ellers uendret fra 20261103000000_features_near_custom_plan.sql.
-- ---------------------------------------------------------------------------

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
language plpgsql
stable
security definer
set search_path = public, extensions
set plan_cache_mode = force_custom_plan
as $$
#variable_conflict use_column
declare
  origin4326 geometry := st_setsrid(st_makepoint(lng, lat), 4326);
  origin geography := st_setsrid(st_makepoint(lng, lat), 4326)::geography;
  er_admin boolean := coalesce((select public.is_admin()), false);
  -- Kategoriene kallet får lese: publiserte (alle for admin), avgrenset til dem det ber om.
  lesbare text[] := array(
    select c.category
    from area_feature_categories c
    where (c.is_public or er_admin)
      and (categories is null or c.category = any (categories))
  );
begin
  if radius_m is null or radius_m <= 0 or radius_m > 10000 then
    return;
  end if;

  return query
  select
    a.id, a.provider_id, a.external_id, a.category, a.subtype, a.title,
    st_distance(a.geom::geography, origin),
    st_intersects(a.geom, origin4326),
    -- Admin ser også enhetene som er skjult offentlig, og hvorfor.
    case when s.orgnr is not null
      then a.attributes || jsonb_build_object('offentligSkjult', s.hidden_reason)
      else a.attributes
    end,
    a.source_url, a.source_url_type, a.source_updated_at,
    st_asgeojson(a.centroid, 6)::jsonb,
    case
      when st_npoints(a.geom) <= 5000
        then st_asgeojson(st_simplifypreservetopology(a.geom, 0.000005), 6)::jsonb
    end
  from area_features a
  left join school_units s
    on a.provider_id = 'udir-skoler' and s.orgnr = a.external_id and s.hidden_reason is not null
  where a.removed_from_source_at is null
    and a.category = any (lesbare)
    and (s.orgnr is null or er_admin)
    and st_dwithin(a.geom::geography, origin, radius_m)
  order by st_distance(a.geom::geography, origin), a.title
  limit least(greatest(max_results, 1), 1000);
end;
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
  from area_features a
  cross join origin o
  left join school_units s
    on a.provider_id = 'udir-skoler' and s.orgnr = a.external_id and s.hidden_reason is not null
  where radius_m > 0 and radius_m <= 10000
    and a.removed_from_source_at is null
    and (categories is null or a.category = any (categories))
    and a.category = any (array(select c.category from area_feature_categories c where c.is_public or (select public.is_admin())))
    and (s.orgnr is null or (select public.is_admin()))
    and st_dwithin(a.geom::geography, o.g, radius_m)
  group by a.category
$$;

-- Nye funksjoner må inn i API-ets skjemacache før de kan kalles.
notify pgrst, 'reload schema';
