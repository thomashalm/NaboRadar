-- ---------------------------------------------------------------------------
-- Datasenter-enrichment: strukturerte felt, roller, feltkilder og refresh-kø.
--
-- HVORFOR EGNE TABELLER OG IKKE FLERE KOLONNER I admin_research_items.
-- `admin_research_items` er felles for alle researchkategorier — gruver, forsvar, avløp,
-- datasentre. Legger vi `secured_power_mw` der, har vi gjort fellestabellen til en
-- datasentertabell, og neste kategori gjør det samme. Detaljene ligger derfor i en 1:1-tabell
-- som bare finnes for de funnene som faktisk er datasentre.
--
-- TRE TING DENNE MODELLEN NEKTER Å SLÅ SAMMEN:
--
--   1. ROLLER. Eier, operatør, kunde, investor, morselskap og grunneier er *ulike påstander* om
--      ulike juridiske enheter. TikTok kan være kunde i et anlegg Bulk driver og et fjerde
--      selskap eier. Én `owner`-kolonne ville tvunget fram et valg mellom dem, og valget ville
--      blitt usynlig etterpå. Derfor rader med `role`, ikke kolonner.
--
--   2. MW. «700 MW sikret kraft» og «700 MW i drift» er ikke samme opplysning, og forskjellen er
--      hele saken for en nabo. Det finnes bevisst **ingen** generisk `capacity_mw` her: et tall
--      uten semantikk er et tall vi ikke kan forsvare.
--
--   3. PÅSTAND OG KILDE. Hvert strukturert felt kan peke på kilden som bærer det. Uten det er et
--      MW-tall bare noe som står der.
--
-- SIKKERHET. Som resten av research: ingenting til anon, RLS på is_admin() for lesing, ingen
-- skriverettigheter på tabellene. All skriving går gjennom security definer-funksjoner som
-- sjekker is_admin() selv. Kategorien finnes ikke i area_features, så /omrade ser dem aldri.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Detaljer per anlegg
-- ---------------------------------------------------------------------------

create table public.admin_research_datacenter_details (
  research_item_id  uuid primary key
                      references public.admin_research_items (id) on delete cascade,

  /**
   * Kontrollert vokabular. Fritekstsynonymer («AI-datasenter», «AI/HPC», «hyperscale-campus»)
   * ville gjort filtrering umulig etter tjue funn. `unknown` er en gyldig verdi og skal brukes
   * framfor å gjette.
   */
  facility_type     text not null default 'unknown'
                      check (facility_type in ('colocation', 'hyperscale', 'ai_hpc', 'enterprise',
                             'crypto', 'network_pop', 'mixed', 'unknown')),

  -- MW. Fem spørsmål, fem felt. Se kommentaren øverst.
  /** Faktisk IT-last i drift. Det laveste og ærligste tallet. */
  it_load_mw              numeric(9, 2) check (it_load_mw is null or it_load_mw >= 0),
  /** Kapasitet som er i drift i dag, uavhengig av hvor mye av den som er i bruk. */
  operational_capacity_mw numeric(9, 2) check (operational_capacity_mw is null or operational_capacity_mw >= 0),
  /** Sikret eller tildelt nettkapasitet. Sier noe om taket, ikke om hva som står der. */
  secured_power_mw        numeric(9, 2) check (secured_power_mw is null or secured_power_mw >= 0),
  /** Planlagt kapasitet for dette prosjektet eller byggetrinnet. */
  planned_capacity_mw     numeric(9, 2) check (planned_capacity_mw is null or planned_capacity_mw >= 0),
  /** Hele campusens potensial hvis alt bygges ut. Det tallet pressen oftest gjengir. */
  campus_potential_mw     numeric(9, 2) check (campus_potential_mw is null or campus_potential_mw >= 0),

  expansion_notes   text,

  /** Året anlegget faktisk åpnet. Bare når det er dokumentert. */
  opening_year      integer check (opening_year is null or opening_year between 1960 and 2100),
  /**
   * Forventet åpning som tekst, ikke dato. Kildene sier «2031», «første halvår 2027» eller
   * «tidligst 2030» — å presse det inn i en date ville oppfunnet en presisjon som ikke finnes.
   */
  expected_opening  text,

  /** Investeringsbeløp i NOK, kun når det står i en kilde. */
  investment_nok    bigint check (investment_nok is null or investment_nok >= 0),
  investment_note   text,

  /** Sist noen faktisk kontrollerte enrichment-feltene. Skilt fra items.last_verified_at. */
  last_enriched_at  timestamptz,
  enrichment_notes  text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  /** Et anlegg i drift som har åpningsår, må ha åpnet i fortiden. */
  check (opening_year is null or opening_year <= extract(year from now()) + 1)
);

comment on table public.admin_research_datacenter_details is
  'Datasenter-spesifikke felt. 1:1 med admin_research_items, kun for funn som er datasentre.';

-- ---------------------------------------------------------------------------
-- 2. Roller: hvem er hvem
-- ---------------------------------------------------------------------------

create table public.admin_research_datacenter_parties (
  id                uuid primary key default gen_random_uuid(),
  research_item_id  uuid not null references public.admin_research_items (id) on delete cascade,

  /**
   * Rollen denne enheten har i *dette* anlegget. Samme selskap kan ha flere roller i samme
   * anlegg, og flere selskaper kan ha samme rolle — derfor rader, ikke kolonner.
   */
  role              text not null
                      check (role in ('owner', 'operator', 'customer', 'investor',
                             'parent_company', 'land_owner')),
  name              text not null check (length(trim(name)) > 0),
  /** Norsk organisasjonsnummer når enheten har ett. Gjør eierskapet etterprøvbart i Brreg. */
  org_number        text check (org_number is null or org_number ~ '^\d{9}$'),
  /**
   * Land, kun når det er dokumentert hvor den juridiske enheten hører hjemme. Feltet finnes for
   * å kunne si «eid av et selskap registrert i X», ikke for å rangere eierskap etter nasjonalitet.
   */
  country           text,

  confidence        text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  /** Kilden som bærer nettopp denne rollen. */
  source_id         uuid references public.admin_research_sources (id) on delete set null,
  note              text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  /**
   * KUNDE KREVER DOKUMENTASJON. En avisoverskrift som kaller noe «TikToks datasenter» er ikke
   * nok, og heller ikke at anlegget teknisk passer kunden. Regelen står i databasen og ikke bare
   * i en instruks, fordi den ellers ryker første gang noen har dårlig tid: en `customer` må ha
   * høy sikkerhet og en konkret kilde. Er det uklart, hører det hjemme i `notes` på funnet.
   */
  constraint kunde_krever_dokumentasjon
    check (role <> 'customer' or (confidence = 'high' and source_id is not null)),

  unique (research_item_id, role, name)
);

create index admin_research_dc_parties_item_idx
  on public.admin_research_datacenter_parties (research_item_id);
create index admin_research_dc_parties_role_idx
  on public.admin_research_datacenter_parties (role, name);

comment on table public.admin_research_datacenter_parties is
  'Eier, operatør, kunde, investor, morselskap og grunneier per anlegg. Aldri slått sammen.';

-- ---------------------------------------------------------------------------
-- 3. Feltkilder: hvorfor står dette tallet her
-- ---------------------------------------------------------------------------

/**
 * Ikke full event sourcing — det ville kostet mer enn det smaker på 67 funn. Bare koblingen
 * «dette feltet hviler på denne kilden», slik at et MW-tall kan spores til noe. Roller bærer
 * sin egen `source_id` inline, siden de allerede er rader.
 */
create table public.admin_research_datacenter_field_sources (
  research_item_id  uuid not null references public.admin_research_items (id) on delete cascade,
  field_name        text not null
                      check (field_name in ('facility_type', 'it_load_mw', 'operational_capacity_mw',
                             'secured_power_mw', 'planned_capacity_mw', 'campus_potential_mw',
                             'opening_year', 'expected_opening', 'investment_nok', 'expansion_notes')),
  source_id         uuid not null references public.admin_research_sources (id) on delete cascade,
  note              text,
  created_at        timestamptz not null default now(),

  primary key (research_item_id, field_name, source_id)
);

create index admin_research_dc_field_sources_source_idx
  on public.admin_research_datacenter_field_sources (source_id);

-- ---------------------------------------------------------------------------
-- 4. Refresh-kjøringer
--
-- Egen kø, ikke provider-sync. Den rører ikke DSB, NVE, Udir, planer eller resten av
-- researchbasen, og den kan kjøres uten deploy og uten at noe annet synkes.
--
-- Tellere er IKKE lagret. De utledes av `admin_research_datacenter_refresh_items`, slik at de
-- ikke kan drive fra virkeligheten — samme valg som for review_state i research-køen. Det
-- eneste som lagres er det som ikke kan utledes: når den ble startet, og om noen avbrøt den.
-- ---------------------------------------------------------------------------

create table public.admin_research_datacenter_refresh_runs (
  id              uuid primary key default gen_random_uuid(),

  mode            text not null check (mode in ('review_due', 'full')),
  /** Runden dette hører til i den vanlige research-loggen, så review-historikk kan peke hit. */
  research_run_id uuid references public.admin_research_runs (id) on delete set null,

  queued_at       timestamptz not null default now(),
  started_at      timestamptz,
  finished_at     timestamptz,
  cancelled_at    timestamptz,
  error           text,

  created_by      text,
  notes           text,

  check (started_at is null or started_at >= queued_at),
  check (finished_at is null or started_at is not null)
);

create index admin_research_dc_refresh_runs_queued_idx
  on public.admin_research_datacenter_refresh_runs (queued_at desc);

create table public.admin_research_datacenter_refresh_items (
  run_id            uuid not null
                      references public.admin_research_datacenter_refresh_runs (id) on delete cascade,
  research_item_id  uuid not null references public.admin_research_items (id) on delete cascade,
  queue_position    integer not null,

  state             text not null default 'pending'
                      check (state in ('pending', 'changed', 'unchanged', 'skipped', 'failed')),
  /** Hvorfor items havnet i køen. Gjør køen etterprøvbar i ettertid. */
  queued_reasons    text[] not null default '{}',
  /** Søkene som skal gjøres for dette anlegget, generert av `datacenter_search_plan()`. */
  search_plan       text[] not null default '{}',
  /** Feltene som faktisk endret seg, når state = 'changed'. */
  changed_fields    text[] not null default '{}',
  result_note       text,
  error             text,
  finished_at       timestamptz,

  primary key (run_id, research_item_id),
  check (state = 'pending' or finished_at is not null),
  check (state <> 'failed' or error is not null)
);

create index admin_research_dc_refresh_items_state_idx
  on public.admin_research_datacenter_refresh_items (run_id, state);

-- ---------------------------------------------------------------------------
-- 5. Tilgang
-- ---------------------------------------------------------------------------

alter table public.admin_research_datacenter_details       enable row level security;
alter table public.admin_research_datacenter_parties       enable row level security;
alter table public.admin_research_datacenter_field_sources enable row level security;
alter table public.admin_research_datacenter_refresh_runs  enable row level security;
alter table public.admin_research_datacenter_refresh_items enable row level security;

create policy "kun admin leser" on public.admin_research_datacenter_details
  for select to authenticated using (public.is_admin());
create policy "kun admin leser" on public.admin_research_datacenter_parties
  for select to authenticated using (public.is_admin());
create policy "kun admin leser" on public.admin_research_datacenter_field_sources
  for select to authenticated using (public.is_admin());
create policy "kun admin leser" on public.admin_research_datacenter_refresh_runs
  for select to authenticated using (public.is_admin());
create policy "kun admin leser" on public.admin_research_datacenter_refresh_items
  for select to authenticated using (public.is_admin());

do $$
declare
  v_tabeller text := 'public.admin_research_datacenter_details, '
                  || 'public.admin_research_datacenter_parties, '
                  || 'public.admin_research_datacenter_field_sources, '
                  || 'public.admin_research_datacenter_refresh_runs, '
                  || 'public.admin_research_datacenter_refresh_items';
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on ' || v_tabeller || ' from anon, authenticated';
    execute 'grant select on ' || v_tabeller || ' to authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Hvilke funn er datasentre
-- ---------------------------------------------------------------------------

/**
 * Ett sted å definere det, slik at kø, kart og rapporter ikke kan komme til å mene ulike ting.
 * Underkategori og ikke kategori: kategorien «Datasenter / industri / tekniske anlegg» rommer
 * også gruver, pukkverk og prosessindustri.
 */
create function public.is_datacenter_item(p_item public.admin_research_items)
returns boolean
language sql
immutable
as $$
  select p_item.subcategory = 'Datasenter'
$$;

-- ---------------------------------------------------------------------------
-- 7. Samlet lesevisning
--
-- Ett oppslag per funn, med rollene aggregert til tekst og MW oppsummert. Kartlista henter
-- denne og ikke kilder eller historikk — se `datacenter_sources()` for detaljene, som lastes
-- først når et kort åpnes.
-- ---------------------------------------------------------------------------

create view public.admin_datacenter_overview as
select
  i.id,
  i.title,
  i.municipality,
  i.address,
  i.latitude,
  i.longitude,
  i.operational_status,
  i.verification_status,
  i.confidence,
  i.interest_level,
  i.description,
  i.notes,
  s.review_state,
  s.next_review_at,
  i.last_verified_at,
  d.facility_type,
  d.it_load_mw,
  d.operational_capacity_mw,
  d.secured_power_mw,
  d.planned_capacity_mw,
  d.campus_potential_mw,
  d.expansion_notes,
  d.opening_year,
  d.expected_opening,
  d.investment_nok,
  d.investment_note,
  d.last_enriched_at,
  /** Rollene som tekst, én linje per rolle, i fast rekkefølge. */
  (select string_agg(p.name, ', ' order by p.name)
     from admin_research_datacenter_parties p
    where p.research_item_id = i.id and p.role = 'owner')          as owners,
  (select string_agg(p.name, ', ' order by p.name)
     from admin_research_datacenter_parties p
    where p.research_item_id = i.id and p.role = 'operator')       as operators,
  (select string_agg(p.name, ', ' order by p.name)
     from admin_research_datacenter_parties p
    where p.research_item_id = i.id and p.role = 'customer')       as customers,
  (select string_agg(p.name, ', ' order by p.name)
     from admin_research_datacenter_parties p
    where p.research_item_id = i.id and p.role = 'parent_company') as parent_companies,
  (select string_agg(p.name, ', ' order by p.name)
     from admin_research_datacenter_parties p
    where p.research_item_id = i.id and p.role = 'investor')       as investors,
  (select string_agg(p.name, ', ' order by p.name)
     from admin_research_datacenter_parties p
    where p.research_item_id = i.id and p.role = 'land_owner')     as land_owners,
  (select count(*) from admin_research_sources src where src.research_item_id = i.id) as source_count,
  /**
   * Feltene vi mener et datasenterfunn bør ha, i prioritert rekkefølge. Brukes både til å vise
   * hva som mangler og til å prioritere refresh-køen. Et felt som er undersøkt og ikke finnes
   * skal settes til `unknown` framfor å bli stående tomt — da forsvinner det herfra.
   */
  array_remove(array[
    case when not exists (select 1 from admin_research_datacenter_parties p
                           where p.research_item_id = i.id and p.role = 'operator') then 'operator' end,
    case when not exists (select 1 from admin_research_datacenter_parties p
                           where p.research_item_id = i.id and p.role = 'owner') then 'owner' end,
    case when i.operational_status = 'unknown' then 'status' end,
    case when d.it_load_mw is null and d.operational_capacity_mw is null
          and d.secured_power_mw is null and d.planned_capacity_mw is null
          and d.campus_potential_mw is null then 'mw' end,
    case when coalesce(d.facility_type, 'unknown') = 'unknown' then 'type' end,
    case when not exists (select 1 from admin_research_sources src
                           where src.research_item_id = i.id and src.primary_source) then 'primary_source' end,
    case when i.latitude is null then 'coordinates' end
  ], null) as missing_fields
from admin_research_items i
left join admin_research_datacenter_details d on d.research_item_id = i.id
left join admin_research_review_status s on s.id = i.id
where i.subcategory = 'Datasenter';

/**
 * Viewet er en intern definisjon, ikke en tilgangsflate. Den leser `admin_research_review_status`,
 * som bevisst nekter `authenticated` helt, og et security_invoker-view ville arvet den nektelsen
 * og blitt ubrukelig. Derfor: ingen grants, ingen direkte tilgang for noen. All lesing går
 * gjennom `datacenter_items()` og `datacenter_detail()`, som er security definer med is_admin().
 */
do $$
begin
  execute 'revoke all on public.admin_datacenter_overview from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.admin_datacenter_overview from anon, authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Søkeplan per anlegg
--
-- Metoden er fast: DISCOVERY → DEDUP → VERIFISERING → AKTIV OPPFØLGING → KLASSIFISERING.
-- Planen her er DISCOVERY-steget gjort konkret, slik at to runder søker likt og en runde kan
-- etterprøves. Den bygges av det vi allerede vet om anlegget — navn, kommune, kjente roller —
-- og ikke av en fast liste, fordi «Bulk» og «Vennesla» er det som gir treff, ikke «datasenter».
-- ---------------------------------------------------------------------------

create function public.datacenter_search_plan(p_item_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  with i as (select * from admin_research_items where id = p_item_id),
  roller as (
    select distinct name from admin_research_datacenter_parties
     where research_item_id = p_item_id and role in ('owner', 'operator', 'parent_company')
  ),
  -- Navnet uten det som står etter komma: «Bulk N01 Campus, Øvrebø» → «Bulk N01 Campus».
  kort as (select trim(split_part((select title from i), ',', 1)) as navn)
  select array_remove(array(
    select distinct e from unnest(array[
      (select navn from kort),
      (select navn from kort) || ' ' || coalesce((select municipality from i), ''),
      (select navn from kort) || ' MW',
      (select navn from kort) || ' kapasitet utvidelse',
      (select navn from kort) || ' eier operatør',
      (select navn from kort) || ' kunde leietaker',
      (select navn from kort) || ' AI HPC',
      (select navn from kort) || ' byggestart åpning',
      coalesce((select municipality from i), '') || ' datasenter kraft nettilknytning',
      coalesce((select address from i), ''),
      (select string_agg(name || ' datasenter', ' | ') from roller)
    ]) as e
     where e is not null and length(trim(e)) > 3
  ), null)
$$;

-- ---------------------------------------------------------------------------
-- 9. Refresh-kø: hvem trenger oppdatering, og hvorfor
--
-- To modi. `review_due` er den vanlige: bare det som faktisk trenger tilsyn. `full` går gjennom
-- alt som er aktivt eller planlagt, og er bevisst tyngre — den skal velges, ikke skje.
-- ---------------------------------------------------------------------------

create function public.datacenter_refresh_candidates(p_mode text default 'review_due')
returns table (
  id uuid, title text, municipality text, operational_status text,
  confidence text, interest_level text, next_review_at date, review_state text,
  missing_fields text[], queued_reasons text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.title, o.municipality, o.operational_status,
         o.confidence, o.interest_level, o.next_review_at, o.review_state,
         o.missing_fields,
         array_remove(array[
           case when o.review_state = 'overdue' then 'forfalt review' end,
           case when o.review_state = 'due' then 'review forfaller nå' end,
           case when o.operational_status = 'under_construction' then 'under bygging' end,
           case when o.operational_status = 'planned' then 'planlagt' end,
           case when o.interest_level = 'high' and o.confidence in ('low', 'medium')
                then 'høy interesse, usikker' end,
           case when cardinality(o.missing_fields) > 0
                then 'mangler ' || array_to_string(o.missing_fields, ', ') end
         ], null) as queued_reasons
    from admin_datacenter_overview o
   where public.is_admin()
     and o.verification_status not in ('rejected', 'archived')
     and case
           -- Full: alt som lever. Historiske og nedlagte anlegg endrer seg ikke.
           when p_mode = 'full' then o.operational_status in ('active', 'planned',
                                                              'under_construction', 'unknown')
           else (
             o.review_state in ('due', 'overdue')
             or o.operational_status in ('under_construction', 'planned')
             or (o.interest_level = 'high' and o.confidence in ('low', 'medium'))
             or cardinality(o.missing_fields) > 0
           )
         end
   -- Rekkefølgen er prioriteringen: mest mangelfullt og mest dynamisk først.
   order by
     case o.operational_status when 'under_construction' then 0 when 'planned' then 1 else 2 end,
     cardinality(o.missing_fields) desc,
     case o.interest_level when 'high' then 0 when 'medium' then 1 else 2 end,
     o.next_review_at nulls last,
     o.title
$$;

-- ---------------------------------------------------------------------------
-- 10. Start en kjøring
-- ---------------------------------------------------------------------------

create function public.start_datacenter_refresh(p_mode text default 'review_due')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id      uuid;
  v_research_id uuid;
  v_by          text := nullif(current_setting('request.jwt.claims', true)::jsonb->>'email', '');
  v_antall      integer;
begin
  if not public.is_admin() then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  if p_mode not in ('review_due', 'full') then
    raise exception 'Ukjent modus %', p_mode using errcode = '22023';
  end if;
  -- Én kjøring om gangen. To parallelle køer over samme funn ville gitt to sannheter om hva
  -- som er kontrollert, og review-historikken ville ikke kunne fortelle hvilken som gjorde hva.
  if exists (
    select 1 from admin_research_datacenter_refresh_runs
     where finished_at is null and cancelled_at is null and error is null
  ) then
    raise exception 'En datasenter-refresh kjører allerede' using errcode = '55006';
  end if;

  insert into admin_research_runs (label, scope, sources, created_by)
  values (
    'Datasenter-refresh (' || p_mode || ') ' || to_char(now(), 'YYYY-MM-DD'),
    'Kun funn med subcategory = Datasenter. Ingen providere, ingen andre researchkategorier.',
    array['operatørens egne sider', 'eier- og investorsider', 'Brønnøysundregistrene',
          'kommunale saker og planer', 'lokalpresse', 'riksdekkende presse',
          'nettselskap og kraftkilder', 'bransjekilder'],
    v_by
  )
  returning id into v_research_id;

  insert into admin_research_datacenter_refresh_runs (mode, research_run_id, created_by)
  values (p_mode, v_research_id, v_by)
  returning id into v_run_id;

  insert into admin_research_datacenter_refresh_items
    (run_id, research_item_id, queue_position, queued_reasons, search_plan)
  select v_run_id, k.id, row_number() over (), k.queued_reasons,
         public.datacenter_search_plan(k.id)
    from public.datacenter_refresh_candidates(p_mode) k;

  get diagnostics v_antall = row_count;
  if v_antall = 0 then
    -- Ingenting å gjøre er et gyldig utfall, ikke en feil. Kjøringen lukkes med én gang.
    update admin_research_datacenter_refresh_runs
       set started_at = now(), finished_at = now(), notes = 'Ingen funn trengte oppdatering'
     where id = v_run_id;
  end if;

  return v_run_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Status og framdrift
--
-- Alt utledes av køen. Det finnes ingen teller som kan bli stående feil.
-- ---------------------------------------------------------------------------

create view public.admin_datacenter_refresh_status as
select
  r.id,
  r.mode,
  r.research_run_id,
  r.queued_at,
  r.started_at,
  r.finished_at,
  r.cancelled_at,
  r.error,
  r.created_by,
  r.notes,
  coalesce(t.total, 0)                                                   as total,
  coalesce(t.total, 0) - coalesce(t.pending, 0)                          as checked,
  coalesce(t.changed, 0)                                                 as changed,
  coalesce(t.unchanged, 0)                                               as unchanged,
  coalesce(t.skipped, 0)                                                 as skipped,
  coalesce(t.failed, 0)                                                  as failed,
  case
    when r.cancelled_at is not null then 'cancelled'
    when r.error is not null        then 'failed'
    when r.finished_at is not null  then 'completed'
    when coalesce(t.total, 0) - coalesce(t.pending, 0) > 0 or r.started_at is not null then 'running'
    else 'queued'
  end                                                                    as status
from admin_research_datacenter_refresh_runs r
left join lateral (
  select count(*)::int                                          as total,
         count(*) filter (where state = 'pending')::int          as pending,
         count(*) filter (where state = 'changed')::int          as changed,
         count(*) filter (where state = 'unchanged')::int        as unchanged,
         count(*) filter (where state = 'skipped')::int          as skipped,
         count(*) filter (where state = 'failed')::int           as failed
    from admin_research_datacenter_refresh_items ri
   where ri.run_id = r.id
) t on true;

-- Samme som overview: intern definisjon, nås via datacenter_refresh_runs().
do $$
begin
  execute 'revoke all on public.admin_datacenter_refresh_status from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.admin_datacenter_refresh_status from anon, authenticated';
  end if;
end;
$$;

create function public.datacenter_refresh_runs(p_limit integer default 10)
returns setof public.admin_datacenter_refresh_status
language sql
stable
security definer
set search_path = public
as $$
  select * from admin_datacenter_refresh_status
   where public.is_admin()
   order by queued_at desc
   limit greatest(1, least(coalesce(p_limit, 10), 100))
$$;

/** Køen i én kjøring, i prioritert rekkefølge, med det kartlista trenger for å vise linjene. */
create function public.datacenter_refresh_queue(p_run_id uuid)
returns table (
  research_item_id uuid, queue_position integer, state text, queued_reasons text[],
  search_plan text[], changed_fields text[], result_note text, error text,
  finished_at timestamptz, title text, municipality text, operational_status text,
  missing_fields text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select ri.research_item_id, ri.queue_position, ri.state, ri.queued_reasons,
         ri.search_plan, ri.changed_fields, ri.result_note, ri.error,
         ri.finished_at, o.title, o.municipality, o.operational_status, o.missing_fields
    from admin_research_datacenter_refresh_items ri
    join admin_datacenter_overview o on o.id = ri.research_item_id
   where public.is_admin() and ri.run_id = p_run_id
   order by ri.queue_position
$$;

-- ---------------------------------------------------------------------------
-- 12. Lagring av enrichment-felt
--
-- HISTORIKK ER IKKE VALGFRITT. Funksjonen sammenligner mot det som står, finner hvilke felt som
-- faktisk endret seg, og skriver en review gjennom den eksisterende review-historikken. Et felt
-- som går 20 → 40 MW, en operatør som byttes, eller planned → active skal etterlate spor. Uten
-- det ville basen sagt hva vi tror nå, men aldri hva vi trodde før og hvorfor det endret seg.
-- ---------------------------------------------------------------------------

create function public.save_datacenter_details(
  p_item_id uuid,
  p_fields  jsonb,
  p_run_id  uuid default null
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_for      admin_research_datacenter_details;
  v_etter    admin_research_datacenter_details;
  v_endret   text[] := '{}';
  v_felt     text;
  v_by       text := nullif(current_setting('request.jwt.claims', true)::jsonb->>'email', '');
  v_research uuid;
begin
  if not public.is_admin() then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  if not exists (select 1 from admin_research_items where id = p_item_id and subcategory = 'Datasenter') then
    raise exception 'Funnet er ikke et datasenter' using errcode = '22023';
  end if;

  select * into v_for from admin_research_datacenter_details where research_item_id = p_item_id;

  insert into admin_research_datacenter_details as d (
    research_item_id, facility_type, it_load_mw, operational_capacity_mw, secured_power_mw,
    planned_capacity_mw, campus_potential_mw, expansion_notes, opening_year, expected_opening,
    investment_nok, investment_note, enrichment_notes, last_enriched_at
  )
  values (
    p_item_id,
    coalesce(nullif(p_fields->>'facility_type', ''), 'unknown'),
    nullif(p_fields->>'it_load_mw', '')::numeric,
    nullif(p_fields->>'operational_capacity_mw', '')::numeric,
    nullif(p_fields->>'secured_power_mw', '')::numeric,
    nullif(p_fields->>'planned_capacity_mw', '')::numeric,
    nullif(p_fields->>'campus_potential_mw', '')::numeric,
    nullif(p_fields->>'expansion_notes', ''),
    nullif(p_fields->>'opening_year', '')::integer,
    nullif(p_fields->>'expected_opening', ''),
    nullif(p_fields->>'investment_nok', '')::bigint,
    nullif(p_fields->>'investment_note', ''),
    nullif(p_fields->>'enrichment_notes', ''),
    now()
  )
  on conflict (research_item_id) do update set
    -- Et felt som ikke er med i kallet skal ikke nullstilles. Bare det som sendes, endres.
    facility_type           = coalesce(nullif(p_fields->>'facility_type', ''), d.facility_type),
    it_load_mw              = case when p_fields ? 'it_load_mw'              then nullif(p_fields->>'it_load_mw', '')::numeric              else d.it_load_mw end,
    operational_capacity_mw = case when p_fields ? 'operational_capacity_mw' then nullif(p_fields->>'operational_capacity_mw', '')::numeric else d.operational_capacity_mw end,
    secured_power_mw        = case when p_fields ? 'secured_power_mw'        then nullif(p_fields->>'secured_power_mw', '')::numeric        else d.secured_power_mw end,
    planned_capacity_mw     = case when p_fields ? 'planned_capacity_mw'     then nullif(p_fields->>'planned_capacity_mw', '')::numeric     else d.planned_capacity_mw end,
    campus_potential_mw     = case when p_fields ? 'campus_potential_mw'     then nullif(p_fields->>'campus_potential_mw', '')::numeric     else d.campus_potential_mw end,
    expansion_notes         = case when p_fields ? 'expansion_notes'         then nullif(p_fields->>'expansion_notes', '')                  else d.expansion_notes end,
    opening_year            = case when p_fields ? 'opening_year'            then nullif(p_fields->>'opening_year', '')::integer            else d.opening_year end,
    expected_opening        = case when p_fields ? 'expected_opening'        then nullif(p_fields->>'expected_opening', '')                 else d.expected_opening end,
    investment_nok          = case when p_fields ? 'investment_nok'          then nullif(p_fields->>'investment_nok', '')::bigint           else d.investment_nok end,
    investment_note         = case when p_fields ? 'investment_note'         then nullif(p_fields->>'investment_note', '')                  else d.investment_note end,
    enrichment_notes        = case when p_fields ? 'enrichment_notes'        then nullif(p_fields->>'enrichment_notes', '')                 else d.enrichment_notes end,
    last_enriched_at        = now(),
    updated_at              = now();

  select * into v_etter from admin_research_datacenter_details where research_item_id = p_item_id;

  foreach v_felt in array array['facility_type', 'it_load_mw', 'operational_capacity_mw',
                                'secured_power_mw', 'planned_capacity_mw', 'campus_potential_mw',
                                'expansion_notes', 'opening_year', 'expected_opening',
                                'investment_nok', 'investment_note']
  loop
    if to_jsonb(v_etter)->>v_felt is distinct from (to_jsonb(v_for)->>v_felt) then
      v_endret := v_endret || v_felt;
    end if;
  end loop;

  if cardinality(v_endret) > 0 then
    select research_run_id into v_research
      from admin_research_datacenter_refresh_runs where id = p_run_id;
    perform public.record_research_review_unchecked(
      p_item_id,
      jsonb_build_object(
        'outcome', 'updated',
        'summary', 'Datasenter-enrichment: ' || array_to_string(v_endret, ', '),
        'research_run_id', v_research
      ),
      coalesce(v_by, 'datacenter-refresh')
    );
  end if;

  return v_endret;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Roller
-- ---------------------------------------------------------------------------

create function public.save_datacenter_party(
  p_item_id   uuid,
  p_role      text,
  p_name      text,
  p_fields    jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_by text := nullif(current_setting('request.jwt.claims', true)::jsonb->>'email', '');
begin
  if not public.is_admin() then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;

  insert into admin_research_datacenter_parties as p
    (research_item_id, role, name, org_number, country, confidence, source_id, note)
  values (
    p_item_id, p_role, trim(p_name),
    nullif(p_fields->>'org_number', ''),
    nullif(p_fields->>'country', ''),
    coalesce(nullif(p_fields->>'confidence', ''), 'low'),
    nullif(p_fields->>'source_id', '')::uuid,
    nullif(p_fields->>'note', '')
  )
  on conflict (research_item_id, role, name) do update set
    org_number = coalesce(nullif(p_fields->>'org_number', ''), p.org_number),
    country    = coalesce(nullif(p_fields->>'country', ''), p.country),
    confidence = coalesce(nullif(p_fields->>'confidence', ''), p.confidence),
    source_id  = coalesce(nullif(p_fields->>'source_id', '')::uuid, p.source_id),
    note       = coalesce(nullif(p_fields->>'note', ''), p.note),
    updated_at = now()
  returning id into v_id;

  perform public.record_research_review_unchecked(
    p_item_id,
    jsonb_build_object('outcome', 'updated', 'summary', 'Rolle satt: ' || p_role || ' = ' || trim(p_name)),
    coalesce(v_by, 'datacenter-refresh')
  );
  return v_id;
end;
$$;

create function public.delete_datacenter_party(p_party_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item uuid;
  v_txt  text;
  v_by   text := nullif(current_setting('request.jwt.claims', true)::jsonb->>'email', '');
begin
  if not public.is_admin() then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  select research_item_id, role || ' = ' || name into v_item, v_txt
    from admin_research_datacenter_parties where id = p_party_id;
  if v_item is null then
    raise exception 'Fant ikke rollen %', p_party_id using errcode = 'P0002';
  end if;
  delete from admin_research_datacenter_parties where id = p_party_id;
  perform public.record_research_review_unchecked(
    v_item,
    jsonb_build_object('outcome', 'updated', 'summary', 'Rolle fjernet: ' || v_txt),
    coalesce(v_by, 'datacenter-refresh')
  );
end;
$$;

/** Knytter et strukturert felt til kilden som bærer det. */
create function public.set_datacenter_field_source(
  p_item_id uuid, p_field text, p_source_id uuid, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  insert into admin_research_datacenter_field_sources (research_item_id, field_name, source_id, note)
  values (p_item_id, p_field, p_source_id, nullif(p_note, ''))
  on conflict (research_item_id, field_name, source_id) do update set note = excluded.note;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Framdrift i køen
-- ---------------------------------------------------------------------------

create function public.record_datacenter_refresh_item(
  p_run_id   uuid,
  p_item_id  uuid,
  p_state    text,
  p_note     text default null,
  p_changed  text[] default '{}',
  p_error    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  if p_state not in ('changed', 'unchanged', 'skipped', 'failed') then
    raise exception 'Ugyldig tilstand %', p_state using errcode = '22023';
  end if;

  update admin_research_datacenter_refresh_items
     set state = p_state,
         result_note = nullif(p_note, ''),
         changed_fields = coalesce(p_changed, '{}'),
         error = case when p_state = 'failed' then coalesce(nullif(p_error, ''), 'ukjent feil') else null end,
         finished_at = now()
   where run_id = p_run_id and research_item_id = p_item_id;

  if not found then
    raise exception 'Funnet står ikke i denne køen' using errcode = 'P0002';
  end if;

  -- Første item som kontrolleres markerer at kjøringen er i gang.
  update admin_research_datacenter_refresh_runs
     set started_at = coalesce(started_at, now())
   where id = p_run_id;

  -- Siste item lukker den. Ingen egen «fullfør»-knapp som kan glemmes.
  update admin_research_datacenter_refresh_runs r
     set finished_at = now()
   where r.id = p_run_id
     and r.finished_at is null
     and not exists (
       select 1 from admin_research_datacenter_refresh_items ri
        where ri.run_id = p_run_id and ri.state = 'pending'
     );
end;
$$;

create function public.cancel_datacenter_refresh(p_run_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  update admin_research_datacenter_refresh_runs
     set cancelled_at = now(), notes = coalesce(nullif(p_reason, ''), notes)
   where id = p_run_id and finished_at is null and cancelled_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 15. Detaljer for ett anlegg. Lastes først når et kort åpnes.
-- ---------------------------------------------------------------------------

create function public.datacenter_detail(p_item_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_admin() then null else jsonb_build_object(
    'item', to_jsonb(o),
    'parties', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'role', p.role, 'name', p.name, 'org_number', p.org_number,
               'country', p.country, 'confidence', p.confidence, 'note', p.note,
               'source_id', p.source_id, 'source_name', s.source_name, 'source_url', s.source_url)
             order by p.role, p.name)
        from admin_research_datacenter_parties p
        left join admin_research_sources s on s.id = p.source_id
       where p.research_item_id = p_item_id), '[]'::jsonb),
    'field_sources', coalesce((
      select jsonb_agg(jsonb_build_object(
               'field_name', fs.field_name, 'source_id', fs.source_id,
               'source_name', s.source_name, 'source_url', s.source_url, 'note', fs.note)
             order by fs.field_name)
        from admin_research_datacenter_field_sources fs
        join admin_research_sources s on s.id = fs.source_id
       where fs.research_item_id = p_item_id), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'source_name', s.source_name, 'source_url', s.source_url,
               'publisher', s.publisher, 'source_type', s.source_type,
               'source_date', s.source_date, 'primary_source', s.primary_source,
               'supports_claim', s.supports_claim)
             order by s.primary_source desc, s.source_date desc nulls last)
        from admin_research_sources s where s.research_item_id = p_item_id), '[]'::jsonb)
  ) end
  from admin_datacenter_overview o where o.id = p_item_id
$$;

/** Lista til kartet og kortene. Ingen kilder, ingen historikk — bare det collapsed view viser. */
create function public.datacenter_items(p_search text default null)
returns setof public.admin_datacenter_overview
language sql
stable
security definer
set search_path = public
as $$
  select * from admin_datacenter_overview o
   where public.is_admin()
     and (p_search is null or trim(p_search) = '' or
          concat_ws(' ', o.title, o.municipality, o.address, o.owners, o.operators, o.customers)
            ilike '%' || trim(p_search) || '%')
   order by o.title
$$;

-- ---------------------------------------------------------------------------
-- 16. Tilganger. Begge halvdeler må revokes — se migrasjon 20261002000000.
-- ---------------------------------------------------------------------------

do $$
declare
  v_fn text;
  v_fns text[] := array[
    'public.datacenter_search_plan(uuid)',
    'public.datacenter_refresh_candidates(text)',
    'public.start_datacenter_refresh(text)',
    'public.datacenter_refresh_runs(integer)',
    'public.datacenter_refresh_queue(uuid)',
    'public.save_datacenter_details(uuid, jsonb, uuid)',
    'public.save_datacenter_party(uuid, text, text, jsonb)',
    'public.delete_datacenter_party(uuid)',
    'public.set_datacenter_field_source(uuid, text, uuid, text)',
    'public.record_datacenter_refresh_item(uuid, uuid, text, text, text[], text)',
    'public.cancel_datacenter_refresh(uuid, text)',
    'public.datacenter_detail(uuid)',
    'public.datacenter_items(text)'
  ];
begin
  foreach v_fn in array v_fns loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute 'revoke execute on function ' || v_fn || ' from anon';
      execute 'grant execute on function ' || v_fn || ' to authenticated';
    end if;
  end loop;
  -- is_datacenter_item er en ren hjelpefunksjon uten datatilgang, men følger samme regel.
  execute 'revoke execute on function public.is_datacenter_item(public.admin_research_items) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.is_datacenter_item(public.admin_research_items) from anon';
    execute 'grant execute on function public.is_datacenter_item(public.admin_research_items) to authenticated';
  end if;
end;
$$;
