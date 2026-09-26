-- ---------------------------------------------------------------------------
-- Research freshness og review-kø.
--
-- Et research-item slutter ikke å endre seg fordi vi har verifisert det én gang. Et planlagt
-- datasenter blir bygget, forsinket eller kansellert; en gruve skifter eier; en tillatelse blir
-- avslått. Denne migrasjonen gir basen en eksplisitt idé om når hvert funn sist ble kontrollert,
-- når det bør kontrolleres igjen, og hvorfor.
--
-- DESIGNVALG.
--
--   * `last_checked_at` er omdøpt til `last_verified_at`. Feltet betydde allerede «sist innholdet
--     ble kontrollert mot kilder», og et nytt felt ved siden av det ville vært to navn på samme
--     ting. `last_reviewed_at` er nytt og betyr noe annet: at en review faktisk ble gjennomført,
--     også når ingenting endret seg. Det er forskjellen mellom «vi vet dette er riktig» og «vi
--     har sett på det».
--
--   * `updated_at` brukes aldri som freshness. Den sier bare at raden ble skrevet til — en
--     stavefeilretting ville ellers gjort et to år gammelt funn ferskt.
--
--   * Review-tilstand (`current`, `due`, `overdue`, …) lagres ikke. Den beregnes fra
--     `next_review_at` i viewet under, slik at ingen nattjobb kan komme ut av takt med
--     virkeligheten. Det samme gjelder review-grunner og prioritet.
--
--   * Intervallpolicyen ligger i én immutable funksjon, ikke spredt i komponentkode, og en
--     trigger holder `next_review_at` i takt med den. Endrer noen status fra `planned` til
--     `under_construction` — i UI, i seeden eller i SQL — flyttes neste review av seg selv.
--
--   * Historikken ligger i egen tabell. Vi vil kunne si «kontrollert fire ganger, sist endret
--     12.08.2026», og det krever at en review ikke overskriver den forrige.
--
-- SIKKERHET. Som resten av research: ingen rettigheter til anon, lesing bak `is_admin()` med RLS,
-- og all skriving gjennom security definer-funksjoner som sjekker `is_admin()` selv. Ingenting
-- her kan nå /omrade: kategorien finnes ikke i area_features, og reviewdata forlater aldri
-- admin-laget.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Felt på funnet
-- ---------------------------------------------------------------------------

alter table public.admin_research_items rename column last_checked_at to last_verified_at;

alter table public.admin_research_items
  /** Sist en review faktisk ble gjennomført, også hvis ingenting endret seg. */
  add column last_reviewed_at       timestamptz,
  /** Når funnet bør undersøkes igjen. Null betyr at det ikke trenger review. */
  add column next_review_at         date,
  /** Intervallet som ble brukt, slik at datoen kan forklares i UI. */
  add column review_interval_days   integer check (review_interval_days is null or review_interval_days between 1 and 3650),
  /**
   * Hvordan datoen settes.
   *   policy  — av intervallpolicyen under. Standard.
   *   manual  — satt av et menneske. Policyen rører den ikke.
   *   none    — skal ikke reviewes (`no_review_needed`).
   *   blocked — reviewen står på noe eksternt: kilden er nede, dokumentet kan ikke leses.
   */
  add column review_mode            text not null default 'policy'
                                      check (review_mode in ('policy', 'manual', 'none', 'blocked')),
  /** Hvorfor moden ikke er `policy`. Påkrevd for alt annet enn policy, se sjekken under. */
  add column review_mode_note       text,
  /** Antall reviews på rad uten endring. Forlenger intervallet. */
  add column review_unchanged_streak integer not null default 0 check (review_unchanged_streak >= 0),
  /** Sist en review faktisk fant en endring. Forkorter intervallet. */
  add column last_review_changed_at timestamptz,
  -- En manuell overstyring uten begrunnelse er ikke etterprøvbar, og forsvinner i stillhet.
  add constraint admin_research_items_review_mode_note_check
    check (review_mode = 'policy' or length(trim(coalesce(review_mode_note, ''))) > 0);

comment on column public.admin_research_items.last_verified_at is
  'Sist innholdet faktisk ble kontrollert mot kilder. Het last_checked_at før review-laget.';
comment on column public.admin_research_items.last_reviewed_at is
  'Sist en review ble gjennomført, uavhengig av om noe endret seg.';

create index admin_research_items_next_review_idx on public.admin_research_items (next_review_at)
  where review_mode <> 'none';

-- ---------------------------------------------------------------------------
-- 2. Historikk
--
-- En review er kontroll av ett funn. En research-run er en større runde på en kategori eller en
-- metode. De blandes ikke: en run kan generere hundre reviews, og en review kan peke tilbake på
-- runden den ble gjort i.
-- ---------------------------------------------------------------------------

create table public.admin_research_reviews (
  id                  uuid primary key default gen_random_uuid(),
  research_item_id    uuid not null references public.admin_research_items (id) on delete cascade,
  /** Runden reviewen ble gjort i, når den kom fra en. Null for enkeltreviews i UI. */
  research_run_id     uuid references public.admin_research_runs (id) on delete set null,

  reviewed_at         timestamptz not null default now(),
  /** E-post fra JWT-en, eller «seed»/«backfill» for maskinelle reviews. Satt av funksjonen. */
  reviewed_by         text,

  outcome             text not null
                        check (outcome in ('unchanged', 'updated', 'strengthened', 'weakened',
                               'status_changed', 'rejected', 'reopened', 'unresolved', 'snoozed')),
  /** Om reviewen faktisk endret noe. Skilt fra outcome fordi «updated» kan ende i null endring. */
  changed             boolean not null default false,

  previous_status     text,
  new_status          text,
  previous_confidence text,
  new_confidence      text,

  summary             text,
  /** Antall kilder som ble kontrollert i reviewen. */
  sources_checked     integer not null default 0 check (sources_checked >= 0),
  /** Kildene som ble lagt til eller kontrollert. Bare id-er — teksten står på kilden. */
  source_ids          uuid[] not null default '{}',
  /** Grunnene som gjaldt da reviewen ble gjort, slik de var beregnet. */
  review_reasons      text[] not null default '{}',
  /** Datoen reviewen satte. Lagret her også, slik at historikken kan leses alene. */
  next_review_at      date,

  created_at          timestamptz not null default now()
);

create index admin_research_reviews_item_idx on public.admin_research_reviews (research_item_id, reviewed_at desc);
create index admin_research_reviews_run_idx on public.admin_research_reviews (research_run_id);

alter table public.admin_research_reviews enable row level security;
create policy "kun admin leser" on public.admin_research_reviews
  for select to authenticated using (public.is_admin());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.admin_research_reviews from anon, authenticated';
    execute 'grant select on public.admin_research_reviews to authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Intervallpolicyen
--
-- Ett sted. Regelbasert med vilje: en gjennomsiktig regel som kan justeres er mer verdt enn en
-- score ingen forstår.
--
-- Basisintervallet følger hvor fort tingen faktisk endrer seg. Deretter justeres det: svak
-- sikkerhet, manglende primærkilde, manglende koordinat og tidligere endring forkorter, og
-- reviews på rad uten endring forlenger. Null betyr «trenger ikke review».
-- ---------------------------------------------------------------------------

create function public.research_review_interval(
  p_item_type         text,
  p_operational       text,
  p_verification      text,
  p_interest          text,
  p_confidence        text,
  p_public_candidate  boolean,
  p_has_coords        boolean,
  p_has_primary       boolean,
  p_unchanged_streak  integer,
  p_changed_before    boolean
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_base    integer;
  v_faktor  numeric := 1.0;
  v_dager   integer;
begin
  -- Avviste og arkiverte funn reviewes ikke. Skal et avvist funn opp igjen, gjøres det med
  -- `reopened`, som setter manuell modus — ikke ved at policyen holder dem i køen for alltid.
  if p_verification in ('rejected', 'archived') then
    return null;
  end if;

  v_base := case
    -- Det som endrer seg fortest.
    when p_operational = 'under_construction' then 30
    when p_operational = 'planned' then
      case when p_interest = 'high' or coalesce(p_public_candidate, false) then 45 else 60 end
    when p_operational = 'unknown' then
      case when p_interest = 'high' then 60 else 90 end
    -- Undersøkt uten å bli bekreftet: verdt å prøve igjen, men sjeldnere enn et byggeprosjekt.
    when p_verification = 'investigated_not_confirmed' then
      case p_interest when 'high' then 90 when 'medium' then 180 else 365 end
    when p_operational = 'active' then
      case p_interest when 'high' then 90 when 'medium' then 180 else 365 end
    -- Historisk og nedlagt: stabilt nok til å slippe review når kildene er sterke.
    when p_operational in ('historical', 'closed') then
      case
        when p_confidence = 'high' and p_interest <> 'high'
             and p_verification in ('verified_public_source', 'investigated_not_confirmed')
          then null
        else 365
      end
    else 180
  end;

  if v_base is null then
    return null;
  end if;

  -- Svak sikkerhet betyr at påstanden selv er usikker, ikke bare gammel.
  if p_confidence = 'low' then
    v_faktor := v_faktor * 0.5;
  elsif p_confidence = 'medium' then
    v_faktor := v_faktor * 0.75;
  end if;

  -- Noe som kan bli publisert skal ikke hvile på gammel research.
  if coalesce(p_public_candidate, false) then
    v_faktor := v_faktor * 0.75;
  end if;

  -- Et funn uten primærkilde er et funn vi ikke har lukket.
  if not coalesce(p_has_primary, false) then
    v_faktor := v_faktor * 0.75;
  end if;

  -- Koordinat gjelder bare det som er et sted. Et notat skal ikke jages for manglende punkt.
  if p_item_type in ('finding', 'lead') and not coalesce(p_has_coords, false) then
    v_faktor := v_faktor * 0.75;
  end if;

  -- Har det endret seg før, endrer det seg sannsynligvis igjen.
  if coalesce(p_changed_before, false) then
    v_faktor := v_faktor * 0.75;
  end if;

  -- Reviews på rad uten endring: opptil dobbelt så langt intervall.
  v_faktor := v_faktor * (1 + 0.25 * least(greatest(coalesce(p_unchanged_streak, 0), 0), 4));

  v_dager := greatest(14, least(730, round(v_base * v_faktor)::integer));

  -- Taket for public candidates er lavere uansett hvor stabilt funnet ser ut.
  if coalesce(p_public_candidate, false) then
    v_dager := least(v_dager, 120);
  end if;

  return v_dager;
end;
$$;

/**
 * Intervallet for ett funn, slått opp fra raden. Tar med kildebildet, som ligger i en annen
 * tabell — derfor stable og ikke immutable.
 */
create function public.research_review_interval_for(p_item_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select public.research_review_interval(
           i.item_type, i.operational_status, i.verification_status, i.interest_level,
           i.confidence, i.public_candidate, i.latitude is not null,
           exists (select 1 from admin_research_sources s
                    where s.research_item_id = i.id and s.primary_source and s.supports_claim),
           i.review_unchanged_streak, i.last_review_changed_at is not null)
  from admin_research_items i
  where i.id = p_item_id
$$;

-- ---------------------------------------------------------------------------
-- 4. Triggeren som holder datoen i takt
--
-- Beregner `next_review_at` når moden er `policy`. Rører aldri `last_reviewed_at` eller
-- `last_verified_at` — de settes bare av en faktisk review. Setter kallet datoen selv, får det
-- stå: da er det en bevisst overstyring.
-- ---------------------------------------------------------------------------

create function public.research_review_schedule()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_interval integer;
  v_base     date;
begin
  if new.review_mode <> 'policy' then
    return new;
  end if;

  -- På update: bare regn om når kallet ikke satte datoen selv.
  if tg_op = 'UPDATE' and new.next_review_at is distinct from old.next_review_at then
    return new;
  end if;

  v_interval := public.research_review_interval(
    new.item_type, new.operational_status, new.verification_status, new.interest_level,
    new.confidence, new.public_candidate, new.latitude is not null,
    exists (select 1 from admin_research_sources s
             where s.research_item_id = new.id and s.primary_source and s.supports_claim),
    new.review_unchanged_streak, new.last_review_changed_at is not null);

  new.review_interval_days := v_interval;
  if v_interval is null then
    new.next_review_at := null;
  else
    -- Fra siste review, ellers siste verifisering, ellers da funnet ble lagt inn.
    v_base := coalesce(new.last_reviewed_at, new.last_verified_at, new.first_seen_at)::date;
    new.next_review_at := v_base + v_interval;
  end if;
  return new;
end;
$$;

create trigger research_items_review_schedule
  before insert or update on public.admin_research_items
  for each row execute function public.research_review_schedule();

-- ---------------------------------------------------------------------------
-- 5. Beregnet tilstand: state, grunner og prioritet
--
-- Ett view, slik at kø, metrikker og detaljvisning ikke kan bli uenige om hva som er forsinket.
--
-- `due` har et slingringsmonn på 14 dager før noe regnes som `overdue`. Uten det ville alt som
-- passerte datoen med én dag sett like alvorlig ut som noe som har ligget i et halvår.
-- ---------------------------------------------------------------------------

create view public.admin_research_review_status as
with kilder as (
  select research_item_id,
         count(*) as antall,
         bool_or(primary_source and supports_claim) as har_primaerkilde,
         max(coalesce(source_date, accessed_at::date)) as nyeste_kilde
  from admin_research_sources
  group by research_item_id
),
siste as (
  select distinct on (research_item_id)
         research_item_id, reviewed_at, outcome, changed
  from admin_research_reviews
  order by research_item_id, reviewed_at desc
),
antall_reviews as (
  select research_item_id, count(*) as antall from admin_research_reviews group by research_item_id
)
select
  i.id,
  i.review_mode,
  i.review_mode_note,
  i.next_review_at,
  i.review_interval_days,
  i.last_reviewed_at,
  i.last_verified_at,
  i.review_unchanged_streak,
  i.last_review_changed_at,
  coalesce(ar.antall, 0)::integer as review_count,
  s.outcome as last_outcome,
  coalesce(k.antall, 0)::integer as source_count,
  coalesce(k.har_primaerkilde, false) as has_primary_source,
  k.nyeste_kilde as newest_source_date,
  (i.next_review_at - current_date)::integer as days_until_review,
  case when i.last_reviewed_at is null then null
       else (current_date - i.last_reviewed_at::date)::integer end as days_since_review,

  -- Tilstanden. Rekkefølgen i case-en er presedensen.
  case
    when i.review_mode = 'none' then 'no_review_needed'
    when i.review_mode = 'policy' and i.next_review_at is null then 'no_review_needed'
    when i.review_mode = 'blocked' then 'blocked'
    when s.outcome = 'unresolved' and i.next_review_at <= current_date then 'needs_followup'
    when i.next_review_at < current_date - 14 then 'overdue'
    when i.next_review_at <= current_date then 'due'
    when i.next_review_at <= current_date + 14 then 'due_soon'
    else 'current'
  end as review_state,

  -- Grunnene. Flere kan gjelde samtidig, og UI-et viser dem som de er.
  (
    array_remove(array[
      case when i.operational_status = 'under_construction' then 'under_construction' end,
      case when i.operational_status = 'planned' then 'planned_project' end,
      case when i.operational_status = 'unknown' then 'status_unknown' end,
      case when i.interest_level = 'high' then 'high_interest' end,
      case when i.confidence = 'low' then 'low_confidence' end,
      case when i.confidence = 'medium' then 'medium_confidence' end,
      case when i.public_candidate then 'public_candidate' end,
      case when not coalesce(k.har_primaerkilde, false) then 'missing_primary_source' end,
      case when i.item_type in ('finding', 'lead') and i.latitude is null then 'missing_coordinates' end,
      case when s.outcome = 'unresolved' then 'unresolved_lead' end,
      case when i.last_review_changed_at is not null then 'previously_changed' end,
      case when i.review_mode = 'manual' then 'manual_followup' end,
      case when i.review_mode = 'blocked' then 'blocked_source' end,
      case when i.last_reviewed_at is null then 'never_reviewed' end,
      -- Gammel kilde er et signal, ikke en feil: en kulturminneregistrering fra 2018 kan være
      -- helt gyldig. Derfor egen grunn, aldri egen konklusjon.
      case when k.nyeste_kilde is not null and k.nyeste_kilde < current_date - 730 then 'source_old' end
    ], null)
  ) as review_reasons,

  -- Prioritet. Lavere tall betyr «se på dette først».
  case
    when i.review_mode = 'none' then 90
    when i.verification_status in ('rejected', 'archived') then 80
    when i.operational_status = 'under_construction' then 1
    when i.operational_status = 'planned' then 2
    when i.interest_level = 'high' and i.confidence in ('low', 'medium') then 3
    when s.outcome = 'unresolved' then 4
    when i.public_candidate then 5
    when i.last_review_changed_at is not null then 6
    when i.next_review_at is not null and i.next_review_at < current_date - 14 then 7
    when i.operational_status = 'active' and i.interest_level = 'high' then 8
    when i.operational_status = 'unknown' then 9
    when i.interest_level = 'medium' then 10
    when not coalesce(k.har_primaerkilde, false) then 11
    when i.item_type in ('finding', 'lead') and i.latitude is null then 12
    when i.operational_status in ('historical', 'closed') then 20
    else 15
  end as review_priority
from admin_research_items i
left join kilder k on k.research_item_id = i.id
left join siste s on s.research_item_id = i.id
left join antall_reviews ar on ar.research_item_id = i.id;

-- Viewet arver RLS fra admin_research_items (security invoker), men ingen skal ha rettigheter
-- på det uansett: lesing skjer gjennom funksjonene under.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.admin_research_review_status from anon, authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Review-køen
--
-- Serverside filtrering, sortering og paginering: køen skal tåle å vokse uten at klienten laster
-- alt. `total_count` følger med hver rad gjennom count(*) over(), så UI-et slipper et ekstra kall.
--
-- Sorteringen svarer på «hva bør jeg undersøke først»: først det som er aktuelt nå, så prioritet,
-- så det som har ventet lengst.
-- ---------------------------------------------------------------------------

create function public.research_review_queue(
  p_states        text[] default array['needs_followup', 'overdue', 'due'],
  p_categories    text[] default null,
  p_operational   text[] default null,
  p_confidence    text[] default null,
  p_interest      text[] default null,
  p_reasons       text[] default null,
  p_municipality  text default null,
  p_search        text default null,
  p_limit         integer default 50,
  p_offset        integer default 0
)
returns table (
  id uuid, title text, item_type text, category text, subcategory text,
  municipality text, address text, city text,
  latitude double precision, longitude double precision,
  operational_status text, verification_status text, confidence text, interest_level text,
  public_candidate boolean, why_interesting text,
  review_state text, review_reasons text[], review_priority integer,
  next_review_at date, review_interval_days integer, review_mode text, review_mode_note text,
  last_reviewed_at timestamptz, last_verified_at timestamptz,
  days_since_review integer, days_until_review integer,
  review_count integer, source_count integer, has_primary_source boolean,
  last_outcome text, total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.title, i.item_type, i.category, i.subcategory,
         i.municipality, i.address, i.city, i.latitude, i.longitude,
         i.operational_status, i.verification_status, i.confidence, i.interest_level,
         i.public_candidate, i.why_interesting,
         st.review_state, st.review_reasons, st.review_priority,
         st.next_review_at, st.review_interval_days, st.review_mode, st.review_mode_note,
         st.last_reviewed_at, st.last_verified_at,
         st.days_since_review, st.days_until_review,
         st.review_count, st.source_count, st.has_primary_source,
         st.last_outcome,
         count(*) over () as total_count
  from admin_research_items i
  join admin_research_review_status st on st.id = i.id
  where public.is_admin()
    and (p_states       is null or st.review_state      = any(p_states))
    and (p_categories   is null or i.category           = any(p_categories))
    and (p_operational  is null or i.operational_status = any(p_operational))
    and (p_confidence   is null or i.confidence         = any(p_confidence))
    and (p_interest     is null or i.interest_level     = any(p_interest))
    and (p_reasons      is null or st.review_reasons && p_reasons)
    and (p_municipality is null or i.municipality ilike p_municipality)
    and (p_search is null or trim(p_search) = '' or
         concat_ws(' ', i.title, i.address, i.municipality, i.city, i.category, i.subcategory)
         ilike '%' || trim(p_search) || '%')
  order by
    case st.review_state
      when 'needs_followup' then 0 when 'overdue' then 0 when 'due' then 0
      when 'due_soon' then 1 when 'blocked' then 2 when 'current' then 3 else 4
    end,
    st.review_priority,
    st.next_review_at nulls last,
    st.last_reviewed_at nulls first,
    i.title
  limit greatest(1, least(coalesce(p_limit, 50), 500))
  offset greatest(0, coalesce(p_offset, 0))
$$;

/** Driftssignaler for review-laget. Én rad, billig nok til admin-navigasjonen. */
create function public.research_review_metrics()
returns table (
  total integer, with_policy integer, current integer, due_soon integer, due integer,
  overdue integer, needs_followup integer, blocked integer, no_review_needed integer,
  never_reviewed integer, planned_or_building_due integer, weak_high_interest_due integer,
  public_candidates_due integer, avg_days_since_review numeric, reviews_logged integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::integer,
    count(*) filter (where review_mode <> 'none' and next_review_at is not null)::integer,
    count(*) filter (where review_state = 'current')::integer,
    count(*) filter (where review_state = 'due_soon')::integer,
    count(*) filter (where review_state = 'due')::integer,
    count(*) filter (where review_state = 'overdue')::integer,
    count(*) filter (where review_state = 'needs_followup')::integer,
    count(*) filter (where review_state = 'blocked')::integer,
    count(*) filter (where review_state = 'no_review_needed')::integer,
    count(*) filter (where last_reviewed_at is null)::integer,
    count(*) filter (where review_state in ('due', 'overdue', 'needs_followup')
                       and review_reasons && array['planned_project', 'under_construction'])::integer,
    count(*) filter (where review_state in ('due', 'overdue', 'needs_followup')
                       and 'high_interest' = any(review_reasons)
                       and review_reasons && array['low_confidence', 'medium_confidence'])::integer,
    count(*) filter (where review_state in ('due', 'overdue', 'needs_followup')
                       and 'public_candidate' = any(review_reasons))::integer,
    round(avg(days_since_review), 1),
    (select count(*) from admin_research_reviews)::integer
  from admin_research_review_status
  where public.is_admin()
$$;

/** Reviewhistorikken for ett funn, nyeste først. */
create function public.research_reviews(p_item_id uuid)
returns table (
  id uuid, research_run_id uuid, run_label text, reviewed_at timestamptz, reviewed_by text,
  outcome text, changed boolean,
  previous_status text, new_status text, previous_confidence text, new_confidence text,
  summary text, sources_checked integer, source_ids uuid[], review_reasons text[],
  next_review_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.research_run_id, run.label, r.reviewed_at, r.reviewed_by, r.outcome, r.changed,
         r.previous_status, r.new_status, r.previous_confidence, r.new_confidence,
         r.summary, r.sources_checked, r.source_ids, r.review_reasons, r.next_review_at
  from admin_research_reviews r
  left join admin_research_runs run on run.id = r.research_run_id
  where public.is_admin() and r.research_item_id = p_item_id
  order by r.reviewed_at desc
$$;

/** Review-tilstanden for ett funn, til detaljvisningen. */
create function public.research_review_status(p_item_id uuid)
returns table (
  review_state text, review_reasons text[], review_priority integer,
  next_review_at date, review_interval_days integer, review_mode text, review_mode_note text,
  last_reviewed_at timestamptz, last_verified_at timestamptz,
  days_since_review integer, days_until_review integer, review_count integer,
  has_primary_source boolean, newest_source_date date, last_outcome text,
  review_unchanged_streak integer, last_review_changed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select st.review_state, st.review_reasons, st.review_priority,
         st.next_review_at, st.review_interval_days, st.review_mode, st.review_mode_note,
         st.last_reviewed_at, st.last_verified_at,
         st.days_since_review, st.days_until_review, st.review_count,
         st.has_primary_source, st.newest_source_date, st.last_outcome,
         st.review_unchanged_streak, st.last_review_changed_at
  from admin_research_review_status st
  where public.is_admin() and st.id = p_item_id
$$;

-- ---------------------------------------------------------------------------
-- 7. Å registrere en review
--
-- Én funksjon for alle utfall. Den skriver historikk, oppdaterer funnet og lar triggeren
-- beregne neste dato — bortsett fra når reviewen selv bestemmer datoen (snooze, manuell,
-- blokkert), som da er synlig i `review_mode`.
-- ---------------------------------------------------------------------------

/**
 * Kjernen. Ingen tilgangssjekk her — den ligger i innpakningen under, og på rettighetene:
 * funksjonen er revoked fra alle roller, så bare eieren kan kalle den direkte.
 *
 * Grunnen til at den finnes: seeden og backfill-skriptet kjører som eier uten JWT, og skal kunne
 * registrere reviewhistorikk uten å låne en admins identitet for å komme gjennom is_admin().
 * Alternativet — å skrive tabellene direkte fra skriptene — ville gitt to steder som må holde
 * streak, datoer og historikk i takt.
 */
create function public.record_research_review_unchecked(
  p_item_id uuid,
  p_fields jsonb,
  p_actor text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item      admin_research_items;
  v_outcome   text := p_fields->>'outcome';
  v_status    text := nullif(p_fields->>'new_status', '');
  v_conf      text := nullif(p_fields->>'new_confidence', '');
  v_changed   boolean;
  v_mode      text := nullif(p_fields->>'review_mode', '');
  v_note      text := nullif(p_fields->>'review_mode_note', '');
  v_next      date := nullif(p_fields->>'next_review_at', '')::date;
  v_reasons   text[];
  v_verified  boolean;
  v_review_id uuid;
  v_by        text;
begin
  if v_outcome is null then
    raise exception 'outcome mangler' using errcode = '22023';
  end if;

  select * into v_item from admin_research_items where id = p_item_id for update;
  if v_item.id is null then
    raise exception 'Fant ikke funnet %', p_item_id using errcode = 'P0002';
  end if;

  select review_reasons into v_reasons from admin_research_review_status where id = p_item_id;

  -- Endret? Enten fordi status eller sikkerhet faktisk flyttet seg, eller fordi utfallet sier det.
  v_changed := (v_status is not null and v_status <> v_item.operational_status)
            or (v_conf   is not null and v_conf   <> v_item.confidence)
            or v_outcome in ('updated', 'strengthened', 'weakened', 'status_changed', 'rejected', 'reopened');

  -- `unresolved` betyr at vi så på det uten å komme til bunnen: da er innholdet ikke verifisert.
  v_verified := coalesce((p_fields->>'verified')::boolean, v_outcome not in ('unresolved', 'snoozed'));

  insert into admin_research_reviews (
    research_item_id, research_run_id, reviewed_by, outcome, changed,
    previous_status, new_status, previous_confidence, new_confidence,
    summary, sources_checked, source_ids, review_reasons, next_review_at
  ) values (
    p_item_id,
    nullif(p_fields->>'research_run_id', '')::uuid,
    coalesce(nullif(p_actor, ''), nullif(p_fields->>'reviewed_by', ''),
             nullif(current_setting('request.jwt.claims', true)::jsonb->>'email', '')),
    v_outcome, v_changed,
    v_item.operational_status, coalesce(v_status, v_item.operational_status),
    v_item.confidence, coalesce(v_conf, v_item.confidence),
    nullif(p_fields->>'summary', ''),
    coalesce((p_fields->>'sources_checked')::integer, 0),
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(
               case when jsonb_typeof(p_fields->'source_ids') = 'array'
                    then p_fields->'source_ids' else '[]'::jsonb end) x), '{}'),
    coalesce(v_reasons, '{}'),
    v_next
  )
  returning id into v_review_id;

  /*
   * Modus og dato.
   *   snooze/manuell — datoen er gitt, og begrunnelsen kreves av tabellsjekken.
   *   reopened       — et avvist funn tas opp igjen. Policyen ville holdt det utenfor køen, så
   *                    dette settes manuelt med dato.
   *   ellers         — moden beholdes og triggeren regner ut datoen på nytt fra last_reviewed_at.
   */
  if v_outcome = 'snoozed' or v_mode in ('manual', 'blocked', 'none') then
    v_mode := coalesce(v_mode, 'manual');
    if v_note is null then
      raise exception 'Overstyring av review krever en begrunnelse' using errcode = '22023';
    end if;
  elsif v_outcome = 'reopened' then
    v_mode := 'manual';
    v_next := coalesce(v_next, current_date + 30);
    v_note := coalesce(v_note, 'Gjenåpnet etter review');
  else
    v_mode := null;  -- behold eksisterende
  end if;

  update admin_research_items set
    operational_status      = coalesce(v_status, operational_status),
    confidence              = coalesce(v_conf, confidence),
    verification_status     = case when v_outcome = 'rejected' then 'rejected'
                                   when v_outcome = 'reopened' and verification_status = 'rejected' then 'unverified'
                                   else verification_status end,
    notes                   = case when nullif(p_fields->>'notes', '') is not null
                                   then p_fields->>'notes' else notes end,
    last_reviewed_at        = now(),
    last_verified_at        = case when v_verified then now() else last_verified_at end,
    review_unchanged_streak = case when v_changed then 0 else review_unchanged_streak + 1 end,
    last_review_changed_at  = case when v_changed then now() else last_review_changed_at end,
    review_mode             = coalesce(v_mode, review_mode),
    review_mode_note        = case when v_mode is null then review_mode_note else v_note end,
    -- Settes bare når reviewen bestemmer datoen. Ellers står den urørt, og triggeren regner.
    next_review_at          = case when v_mode in ('manual', 'blocked') then v_next
                                   when v_mode = 'none' then null
                                   else next_review_at end,
    updated_at              = now()
  where id = p_item_id;

  -- Historikken skal ha datoen som faktisk gjelder, også når triggeren regnet den ut.
  update admin_research_reviews r
     set next_review_at = i.next_review_at
    from admin_research_items i
   where r.id = v_review_id and i.id = p_item_id and r.next_review_at is null;

  return v_review_id;
end;
$$;

/** Inngangen for admin-UI-et: sjekker tilgang, og lar kjernen gjøre jobben. */
create function public.record_research_review(p_item_id uuid, p_fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Krever driftstilgang' using errcode = '42501';
  end if;
  return public.record_research_review_unchecked(p_item_id, p_fields, null);
end;
$$;

/**
 * Manuell overstyring av planen, uten å registrere en review.
 *
 * Skilt fra record_research_review fordi «jeg vet at dette skal sees på i januar» ikke er det
 * samme som «jeg har kontrollert dette nå».
 */
create function public.set_research_review_plan(p_item_id uuid, p_fields jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text := coalesce(nullif(p_fields->>'review_mode', ''), 'policy');
  v_note text := nullif(p_fields->>'review_mode_note', '');
  v_next date := nullif(p_fields->>'next_review_at', '')::date;
begin
  if not public.is_admin() then
    raise exception 'Krever driftstilgang' using errcode = '42501';
  end if;
  if v_mode not in ('policy', 'manual', 'none', 'blocked') then
    raise exception 'Ugyldig review_mode %', v_mode using errcode = '22023';
  end if;
  if v_mode <> 'policy' and v_note is null then
    raise exception 'Overstyring av review krever en begrunnelse' using errcode = '22023';
  end if;
  if v_mode in ('manual', 'blocked') and v_next is null then
    raise exception 'Manuell review krever en dato' using errcode = '22023';
  end if;

  update admin_research_items set
    review_mode      = v_mode,
    review_mode_note = case when v_mode = 'policy' then null else v_note end,
    -- Tilbake til policy: null datoen, så triggeren regner den ut på nytt.
    next_review_at   = case when v_mode = 'policy' then null
                            when v_mode = 'none' then null
                            else v_next end,
    updated_at       = now()
  where id = p_item_id;

  -- Triggeren hopper over update-er som satte datoen selv, så policy-modus trenger en ny runde.
  if v_mode = 'policy' then
    update admin_research_items set updated_at = now() where id = p_item_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Kartet: filter på review-tilstand
--
-- research_map får to nye parametre. Signaturen endrer seg, så funksjonen må droppes og lages
-- på nytt — rettighetene settes igjen nederst.
-- ---------------------------------------------------------------------------

drop function if exists public.research_map(text, text[], text[], text[], text[], text[], text[],
  text, boolean, boolean, double precision, double precision, double precision, double precision, int);

create function public.research_map(
  p_search          text default null,
  p_categories      text[] default null,
  p_subcategories   text[] default null,
  p_confidence      text[] default null,
  p_interest        text[] default null,
  p_verification    text[] default null,
  p_operational     text[] default null,
  p_municipality    text default null,
  p_public_candidate boolean default null,
  p_only_with_coords boolean default true,
  p_min_lat double precision default null,
  p_max_lat double precision default null,
  p_min_lng double precision default null,
  p_max_lng double precision default null,
  p_limit int default 2000,
  /** Review-tilstander å vise. Null er alle — filteret er valgfritt, som de andre. */
  p_review_states text[] default null
)
returns table (
  id uuid, title text, item_type text, category text, subcategory text,
  address text, municipality text, city text,
  latitude double precision, longitude double precision,
  confidence text, interest_level text, verification_status text, operational_status text,
  public_candidate boolean, source_count bigint, updated_at timestamptz,
  review_state text, next_review_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.title, i.item_type, i.category, i.subcategory,
         i.address, i.municipality, i.city, i.latitude, i.longitude,
         i.confidence, i.interest_level, i.verification_status, i.operational_status,
         i.public_candidate,
         (select count(*) from admin_research_sources s where s.research_item_id = i.id),
         i.updated_at,
         st.review_state, st.next_review_at
  from admin_research_items i
  join admin_research_review_status st on st.id = i.id
  where public.is_admin()
    and (p_categories    is null or i.category            = any(p_categories))
    and (p_subcategories is null or i.subcategory         = any(p_subcategories))
    and (p_confidence    is null or i.confidence          = any(p_confidence))
    and (p_interest      is null or i.interest_level      = any(p_interest))
    and (p_verification  is null or i.verification_status = any(p_verification))
    and (p_operational   is null or i.operational_status  = any(p_operational))
    and (p_municipality  is null or i.municipality ilike p_municipality)
    and (p_public_candidate is null or i.public_candidate = p_public_candidate)
    and (p_review_states is null or st.review_state = any(p_review_states))
    and (not p_only_with_coords or i.latitude is not null)
    and (p_min_lat is null or (i.latitude between p_min_lat and p_max_lat
                               and i.longitude between p_min_lng and p_max_lng))
    and (p_search is null or trim(p_search) = '' or
         concat_ws(' ', i.title, i.address, i.municipality, i.city, i.category, i.subcategory,
                        i.description, i.notes)
         ilike '%' || trim(p_search) || '%')
  order by
    case i.interest_level when 'high' then 0 when 'medium' then 1 else 2 end,
    case i.confidence     when 'high' then 0 when 'medium' then 1 else 2 end,
    i.title
  limit greatest(1, least(p_limit, 5000))
$$;

-- ---------------------------------------------------------------------------
-- 9. Rettigheter
--
-- Begge halvdeler må revokes: «from public» alene holder ikke, se 20261002000000.
-- ---------------------------------------------------------------------------

do $$
declare fn text;
begin
  foreach fn in array array[
    'research_review_interval(text,text,text,text,text,boolean,boolean,boolean,integer,boolean)',
    'research_review_interval_for(uuid)',
    'research_review_schedule()',
    'research_review_queue(text[],text[],text[],text[],text[],text[],text,text,integer,integer)',
    'research_review_metrics()',
    'research_reviews(uuid)',
    'research_review_status(uuid)',
    'record_research_review(uuid,jsonb)',
    'set_research_review_plan(uuid,jsonb)',
    'research_map(text,text[],text[],text[],text[],text[],text[],text,boolean,boolean,' ||
      'double precision,double precision,double precision,double precision,int,text[])'
  ] loop
    execute format('revoke execute on function public.%s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function public.%s from anon', fn);
      execute format('grant execute on function public.%s to authenticated', fn);
    end if;
  end loop;
end;
$$;

-- Triggerfunksjonen kalles av triggeren, ikke av klienter. Kjernen i review-registreringen
-- kalles av innpakningen og av skript som kjører som eier — ingen rolle skal nå den.
do $$
begin
  execute 'revoke execute on function public.record_research_review_unchecked(uuid,jsonb,text) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.research_review_schedule() from authenticated';
    execute 'revoke execute on function public.record_research_review_unchecked(uuid,jsonb,text) from anon, authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Funksjoner som navnga den gamle kolonnen
--
-- `last_checked_at` er borte, og SQL- og plpgsql-kropper parses ved kjøring — ikke ved
-- opprettelse. Funksjonene som nevner kolonnen må derfor bygges på nytt, ellers feiler de
-- først når noen kaller dem.
--
-- Samtidig får listevisningen review-signalene sine: /admin/research skal kunne vise «review om
-- 12 dager» uten et ekstra kall per rad.
-- ---------------------------------------------------------------------------

drop function if exists public.research_items(text);

create function public.research_items(p_search text default null)
returns table (
  id uuid, item_type text, category text, subcategory text, title text, description text,
  municipality text, address text, postal_code text, city text,
  latitude double precision, longitude double precision,
  origin_type text, origin_provider text,
  verification_status text, operational_status text, sensitivity text, reason_not_public text,
  confidence text, interest_level text, why_interesting text, notes text,
  first_seen_at timestamptz, last_verified_at timestamptz, created_at timestamptz,
  updated_at timestamptz, created_by text, source_count bigint,
  public_candidate boolean, public_candidate_note text,
  last_reviewed_at timestamptz, next_review_at date, review_state text,
  review_interval_days integer, review_mode text, days_until_review integer,
  days_since_review integer, review_count integer
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
         i.first_seen_at, i.last_verified_at, i.created_at, i.updated_at, i.created_by,
         (select count(*) from admin_research_sources s where s.research_item_id = i.id),
         i.public_candidate, i.public_candidate_note,
         st.last_reviewed_at, st.next_review_at, st.review_state,
         st.review_interval_days, st.review_mode, st.days_until_review,
         st.days_since_review, st.review_count
  from admin_research_items i
  join admin_research_review_status st on st.id = i.id
  where public.is_admin()
    and (p_search is null or trim(p_search) = '' or exists (
      select 1 where concat_ws(' ', i.title, i.description, i.address, i.municipality, i.city,
                               i.category, i.subcategory, i.notes,
                               (select string_agg(s.source_name, ' ')
                                from admin_research_sources s where s.research_item_id = i.id))
             ilike '%' || trim(p_search) || '%'))
  order by i.updated_at desc
$$;

/**
 * Lagring av funn, bygget på nytt for det nye kolonnenavnet.
 *
 * Merk hva den *ikke* gjør: den rører ikke `last_reviewed_at`, `next_review_at`,
 * `review_mode` eller de andre planleggingsfeltene. Innhold og reviewplan er to forskjellige
 * ting, og en innholdsoppdatering skal ikke late som noen har kontrollert funnet.
 * Triggeren regner ut ny dato hvis innholdet endret forutsetningene.
 */
create or replace function public.save_research_item(p_id uuid, p_fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
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
      last_verified_at, created_by
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
      nullif(p_fields->>'last_verified_at', '')::timestamptz,
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
    last_verified_at    = case when p_fields ? 'last_verified_at' then nullif(p_fields->>'last_verified_at', '')::timestamptz else last_verified_at end,
    updated_at          = now()
  where id = p_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Fant ikke funnet %', p_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

do $$
begin
  execute 'revoke execute on function public.research_items(text) from public';
  execute 'revoke execute on function public.save_research_item(uuid,jsonb) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.research_items(text) from anon';
    execute 'revoke execute on function public.save_research_item(uuid,jsonb) from anon';
    execute 'grant execute on function public.research_items(text) to authenticated';
    execute 'grant execute on function public.save_research_item(uuid,jsonb) to authenticated';
  end if;
end;
$$;
