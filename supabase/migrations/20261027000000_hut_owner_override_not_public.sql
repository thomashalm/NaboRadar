-- ---------------------------------------------------------------------------
-- Hytter: eierkategori kan korrigeres, og en hytte kan stå som «ikke åpen for allmennheten».
--
-- To hull som berikelsen avdekket:
--
-- 1. N50s eierkategori er noen ganger feil. Holmvasshytta i Sunnfjord står som Statskog og
--    tilhører KFUK-KFUM; Besso står som DNT og er en privat turisthytte; Krusgravbua står som
--    fjellstyre og tilhører en bygdeallmenning. Forvalteren har vært riktig, men «Eier» på
--    hyttesiden har vist kildens feil. Ny kolonne `owner_override` ligger oppå, som for type og
--    tilgang:
--
--      eier   owner_override > N50
--
--    Kildens `owner_kind` skrives aldri over. Overstyringen krever samme kilde og
--    kontrolltidspunkt som de andre, og brukes bare når en offisiell side viser at kategorien
--    er feil — ikke for å bygge en eiermodell.
--
-- 2. Noen hytter er ikke for turgåere: bare for medlemmer, skoler eller jegere, eller ikke i
--    utleie. De har hatt en merknad, men har ellers sett ut som en vanlig hytte — en låst hytte
--    uten lenke har fått teksten «må bestilles på forhånd». Ny tilgangsverdi `not_public`
--    («Ikke for allmennheten») i den kontrollerte listen. Den er noe annet enn midlertidig
--    stengt (status) og låst (dør): den sier hvem hytta er for.
-- ---------------------------------------------------------------------------

alter table public.huts
  add column owner_override text
    check (owner_override is null or owner_override in ('dnt', 'statskog', 'fjellstyre', 'kommune', 'other'));

comment on column public.huts.owner_override is
  'Eierkategori etter forvalterens offisielle side, når N50s kategori er feil. Går foran owner_kind offentlig.';

alter table public.huts drop constraint huts_access_override_check;
alter table public.huts
  add constraint huts_access_override_check
  check (access_override is null or access_override in
         ('unlocked', 'dnt_key', 'code_lock', 'special_key', 'code_or_special_key', 'locked_prebooking', 'not_public'));

alter table public.huts drop constraint huts_overstyring_har_kilde;
alter table public.huts
  add constraint huts_overstyring_har_kilde
  check ((type_override is null and access_override is null and owner_override is null and public_note is null and access_status = 'unknown')
         or (override_source_url is not null and override_verified_at is not null));

-- Kolonnene er de samme; `owner_kind` er nå den offentlige verdien, og `overridden` kan
-- inneholde 'owner'. De offentlige funksjonene leser fra visningen og er uendret.
create or replace view public.huts_public as
  select
    h.id, h.name,
    coalesce(h.type_override, h.hut_type) as hut_type,
    -- Eierkategorien er kildens, med mindre forvalterens egen side viser at kategorien er feil.
    coalesce(h.owner_override, h.owner_kind) as owner_kind,
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
      case when h.public_note is not null then 'note' end,
      case when h.owner_override is not null then 'owner' end
    ], null) as overridden
  from huts h
  where h.archived_at is null
    and h.rejected_at is null
    and (h.confidence <> 'low' or h.last_verified_at is not null);

drop function public.set_hut_overrides(uuid, text, text, text, text, text, integer);

/**
 * Som før, pluss eierkategori. `p_owner` er null når den som kaller ikke sier noe om eier
 * (da står overstyringen urørt), og tom streng når den skal fjernes.
 */
create function public.set_hut_overrides(
  p_hut_id uuid,
  p_type text,
  p_access text,
  p_status text,
  p_public_note text,
  p_source_url text,
  p_review_days integer default null,
  p_owner text default null
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
  v_days   integer := least(greatest(coalesce(p_review_days, 60), 7), 365);
  v_owner  text;
  v_tom    boolean;
begin
  if not public.is_admin() then
    raise exception 'Krever admin' using errcode = '42501';
  end if;
  select case when p_owner is null then h.owner_override else nullif(trim(p_owner), '') end
    into v_owner from huts h where h.id = p_hut_id;
  if not found then
    raise exception 'Fant ikke hytta';
  end if;
  v_tom := v_type is null and v_access is null and v_owner is null and v_note is null and v_status = 'unknown';
  if not v_tom and v_url is null then
    raise exception 'En overstyring krever en kilde';
  end if;
  update huts set
    type_override = v_type,
    access_override = v_access,
    owner_override = v_owner,
    access_status = v_status,
    public_note = v_note,
    override_source_url = case when v_tom then null else v_url end,
    override_verified_at = case when v_tom then null else now() end,
    status_review_at = case when v_status = 'closed' then now() + make_interval(days => v_days) else null end,
    reviewed_by = public.request_email(),
    updated_at = now()
  where id = p_hut_id;
end;
$$;

drop function public.hut_contact_list(text, text);

create function public.hut_contact_list(p_q text default null, p_view text default null)
returns table (
  id uuid, name text, hut_type text, owner_kind text, locked boolean,
  manager_name text, manager_verified text, manager_source text,
  booking_url text, info_url text, links_verified_at timestamptz, contact_note text,
  aliases text[],
  municipality_number text, latitude double precision, longitude double precision,
  is_visible boolean,
  type_override text, access_override text, access_status text, public_note text,
  override_source_url text, override_verified_at timestamptz,
  owner_override text
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
         h.override_source_url, h.override_verified_at,
         h.owner_override
  from huts h, nokkel n
  where public.is_admin()
    and h.archived_at is null
    and h.rejected_at is null
    and case
          when length(n.k) >= 2 then
            h.name_key like '%' || n.k || '%'
            or exists (select 1 from unnest(h.alt_names || h.aliases) a where public.hut_name_key(a) like '%' || n.k || '%')
          when p_view = 'dnt_gap' then
            h.owner_kind = 'dnt'
            and (h.manager_verified is null or (h.booking_url is null and h.info_url is null))
            and (h.confidence <> 'low' or h.last_verified_at is not null)
          else
            h.locked is true and h.booking_url is null
            and (h.confidence <> 'low' or h.last_verified_at is not null)
        end
  order by
    (p_view = 'dnt_gap' and coalesce(h.type_override, h.hut_type) in ('rest_cabin', 'day_trip_hut')) asc nulls first,
    (h.info_url is not null) asc,
    (coalesce(h.manager_verified, h.manager_name) is not null) asc,
    h.name, h.id
  limit 100
$$;

do $$
declare
  v_fn text;
begin
  execute 'revoke execute on function public.set_hut_overrides(uuid, text, text, text, text, text, integer, text) from public';
  execute 'revoke execute on function public.hut_contact_list(text, text) from public';
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'Rollene anon/authenticated finnes ikke — hopper over grants.';
    return;
  end if;
  foreach v_fn in array array[
    'public.set_hut_overrides(uuid, text, text, text, text, text, integer, text)',
    'public.hut_contact_list(text, text)'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from anon';
    execute 'grant execute on function ' || v_fn || ' to authenticated';
  end loop;
end;
$$;
