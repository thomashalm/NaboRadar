-- ---------------------------------------------------------------------------
-- Hytter: offisielle lenker, manuell kontroll og fast adresse.
--
-- Produktbeslutningen bak (docs/data-roadmap.md): NaboRadar viser hytta og sender brukeren
-- videre til den som driver den. Vi bygger ikke booking, ledighet eller pris.
--
-- 1. LENKER. `booking_url` og `info_url` fantes fra før, men ingenting satte dem. En lenke
--    skal være kontrollert av et menneske, komme rett fra en kilde vi kan bruke, eller være
--    bygget av en stabil ID vi lovlig har. Derfor `links_verified_at`: en lenke uten
--    kontrolltidspunkt kan ikke lagres. `booking_url` er en side der man faktisk bestiller;
--    `info_url` er den offisielle infosiden. Ingen av dem kreves for at hytta skal vises.
--
-- 2. KONTROLL. Køen fantes, men ingen måte å avgjøre en sak på. Tre utfall:
--      approve  hytta er riktig. For en hytte som bare står i en sekundærkilde er det dette
--               som gjør den synlig.
--      reject   dette er ikke en hytte vi skal vise (et hotell, et serveringssted). Raden blir
--               stående med kildepostene sine, slik at neste sync ikke oppretter den på nytt.
--      merge    to rader er samme hytte. Kildepostene flyttes til den som beholdes.
--
-- 3. FAST ADRESSE. `get_hut` slår opp én hytte på de åtte første tegnene i uuid-en, som er
--    det som står i /hytter/<navn>-<id>. Navnet i adressen er pynt; ID-en er nøkkelen.
-- ---------------------------------------------------------------------------

alter table public.huts
  add column links_verified_at timestamptz,
  add column rejected_at       timestamptz,
  add column reviewed_at       timestamptz,
  add column reviewed_by       text,
  add column review_note       text;

alter table public.huts
  add constraint huts_links_er_kontrollert
  check ((booking_url is null and info_url is null) or links_verified_at is not null);

-- 1. Synlighet: en avvist hytte vises aldri. Resten er som før.
create or replace view public.huts_public as
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
    and h.rejected_at is null
    -- En hytte som bare finnes i en sekundærkilde vises ikke før et menneske har bekreftet den.
    and (h.confidence <> 'low' or h.last_verified_at is not null);

-- 2. refresh_huts: avviste hytter gir ikke dublettflagg og teller ikke i køen. ----------------

create or replace function public.refresh_huts()
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
    where a.rejected_at is null and b.rejected_at is null
      and exists (select 1 from hut_sources s join area_features f on f.id = s.feature_id
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
  where h.archived_at is null and h.rejected_at is null and h.review_reason is not null
    and h.review_reason is distinct from h.review_dismissed;

  return query select n_linked, n_created, n_unmatched, n_archived, n_restored, n_flagged;
end;
$$;

-- 3. Én hytte, for den faste adressen ---------------------------------------------------------

create function public.get_hut(p_ref text)
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
    and p_ref ~ '^[0-9a-f]{8}$'
    and p.id::text like p_ref || '-%'
  order by p.id
  limit 2
$$;

-- Navnesøket returnerer nå de samme feltene som resten, slik at et treff kan vises uten et
-- oppslag til.
drop function public.huts_search(text, integer);

create function public.huts_search(q text, max_results integer default 20)
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
  with nokkel as (select public.hut_name_key(q) as k)
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources
  from huts_public p, nokkel n
  where public.huts_visible()
    and length(n.k) >= 2
    and (p.name_key like '%' || n.k || '%'
         or exists (select 1 from unnest(p.alt_names) a where public.hut_name_key(a) like '%' || n.k || '%'))
  order by (p.name_key like n.k || '%') desc, p.name, p.id
  limit least(greatest(max_results, 1), 50)
$$;

-- 4. Admin: køen, avgjørelsen og lenkene ------------------------------------------------------

drop function public.hut_review_queue();

/**
 * Hytter som trenger et menneske: kildene er uenige, to ligger tett, eller hytta står bare i
 * en sekundærkilde. For hver sak følger kildepostene og de nærmeste andre hyttene, som er det
 * som trengs for å avgjøre om den er riktig, feil eller en dublett.
 */
create function public.hut_review_queue()
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, municipality_number text,
  latitude double precision, longitude double precision, confidence text, is_visible boolean,
  review_reason text, sources jsonb, nearby jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select h.id, h.name, h.hut_type, h.owner_kind, h.manager_name, h.municipality_number,
         st_y(h.geom), st_x(h.geom), h.confidence,
         (h.confidence <> 'low' or h.last_verified_at is not null),
         h.review_reason,
         (select jsonb_agg(jsonb_build_object(
                   'provider_id', f.provider_id, 'external_id', f.external_id, 'title', f.title,
                   'hut_type', f.attributes->>'hut_type', 'match_basis', s.match_basis,
                   'distance_m', round(s.distance_m::numeric, 1)) order by f.provider_id)
          from hut_sources s join area_features f on f.id = s.feature_id
          where s.hut_id = h.id and f.removed_from_source_at is null),
         (select jsonb_agg(n order by (n->>'distance_m')::numeric)
          from (
            select jsonb_build_object(
                     'id', o.id, 'name', o.name, 'hut_type', o.hut_type, 'owner_kind', o.owner_kind,
                     'distance_m', round(st_distance(o.geom::geography, h.geom::geography)::numeric)) as n
            from huts o
            where o.id <> h.id and o.archived_at is null and o.rejected_at is null
              and st_dwithin(o.geom::geography, h.geom::geography, 2000)
            order by o.geom::geography <-> h.geom::geography
            limit 3
          ) x)
  from huts h
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and h.review_reason is not null
    and h.review_reason is distinct from h.review_dismissed
  order by (h.confidence = 'low') desc, h.name
$$;

/**
 * Avgjør en kontrollsak.
 *
 *   approve  bekrefter hytta. Den forlater køen, og en hytte fra en sekundærkilde blir synlig.
 *   reject   hytta vises aldri. Kildepostene beholdes, så den oppstår ikke på nytt.
 *   merge    kildepostene flyttes til `p_target`, og denne raden arkiveres.
 */
create function public.review_hut(p_hut_id uuid, p_action text, p_target uuid default null, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hut  huts%rowtype;
  v_hvem text := public.request_email();
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  select * into v_hut from huts where id = p_hut_id;
  if not found then
    raise exception 'Fant ikke hytta';
  end if;

  if p_action = 'approve' then
    update huts set last_verified_at = now(), rejected_at = null, review_dismissed = review_reason,
                    reviewed_at = now(), reviewed_by = v_hvem, review_note = p_note, updated_at = now()
     where id = p_hut_id;

  elsif p_action = 'reject' then
    update huts set rejected_at = now(), review_dismissed = review_reason,
                    reviewed_at = now(), reviewed_by = v_hvem, review_note = p_note, updated_at = now()
     where id = p_hut_id;

  elsif p_action = 'merge' then
    if p_target is null or p_target = p_hut_id then
      raise exception 'Merge krever en annen hytte som mål';
    end if;
    if not exists (select 1 from huts where id = p_target and archived_at is null and rejected_at is null) then
      raise exception 'Målet finnes ikke, eller er arkivert eller avvist';
    end if;
    update hut_sources set hut_id = p_target, match_basis = 'manual', confirmed_by = v_hvem, linked_at = now()
     where hut_id = p_hut_id;
    update huts set reviewed_at = now(), reviewed_by = v_hvem,
                    review_note = coalesce(p_note, 'Slått sammen med ' || p_target::text), updated_at = now()
     where id = p_hut_id;
    update huts set last_verified_at = now(), reviewed_at = now(), reviewed_by = v_hvem, updated_at = now()
     where id = p_target;
    -- Regner feltene på målet på nytt og arkiverer raden som nå står uten kildeposter.
    perform public.refresh_huts();

  else
    raise exception 'Ukjent handling: %', p_action;
  end if;
end;
$$;

/**
 * Setter de offisielle lenkene på en hytte. Tomme verdier fjerner lenken. Å kalle denne er
 * selve kontrollen: den som lagrer en lenke, går god for at den peker riktig.
 */
create function public.set_hut_links(p_hut_id uuid, p_booking_url text, p_info_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking text := nullif(trim(coalesce(p_booking_url, '')), '');
  v_info    text := nullif(trim(coalesce(p_info_url, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  update huts set
    booking_url = v_booking,
    info_url = v_info,
    links_verified_at = case when v_booking is null and v_info is null then null else now() end,
    reviewed_by = public.request_email(),
    updated_at = now()
  where id = p_hut_id;
  if not found then
    raise exception 'Fant ikke hytta';
  end if;
end;
$$;

-- 5. Tilganger -----------------------------------------------------------------------------

revoke all on public.huts_public from public;

do $$
declare
  v_fn text;
begin
  execute 'revoke execute on function public.hut_review_queue() from public';
  execute 'revoke execute on function public.review_hut(uuid, text, uuid, text) from public';
  execute 'revoke execute on function public.set_hut_links(uuid, text, text) from public';
  execute 'revoke execute on function public.refresh_huts() from public';

  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;

  execute 'revoke all on public.huts_public from anon, authenticated';
  execute 'revoke execute on function public.refresh_huts() from anon, authenticated';

  foreach v_fn in array array[
    'public.hut_review_queue()',
    'public.review_hut(uuid, text, uuid, text)',
    'public.set_hut_links(uuid, text, text)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from anon';
    execute 'grant execute on function ' || v_fn || ' to authenticated';
  end loop;

  foreach v_fn in array array[
    'public.get_hut(text)',
    'public.huts_search(text, integer)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    execute 'grant execute on function ' || v_fn || ' to anon, authenticated, service_role';
  end loop;
end;
$$;
