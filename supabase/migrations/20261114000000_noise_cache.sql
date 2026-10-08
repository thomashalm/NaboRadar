-- ---------------------------------------------------------------------------
-- Langlivet cache for strategisk støykartlegging (Miljødirektoratet), per søkepunkt.
--
-- Strategiske støykart lages i runder på rundt fem år (vei: situasjonen i 2022, bane: 2017).
-- Kilden er en treg ArcGIS-tjeneste som til tider ikke svarer. Svaret for et punkt endrer seg
-- ikke mellom rundene, så vi lagrer det: neste søk på samme punkt spør ikke kilden, og når kilden
-- er nede, har vi sist kjente svar.
--
-- Hva som lagres: bare gyldige svar. «Ingen treff» og «ikke dekket» er svar og lagres. En
-- kildefeil er ikke et svar og kommer aldri hit — den kan derfor aldri overskrive et godt svar.
--
-- Tilgang:
--   * Tabellene har RLS uten policyer og ingen grants til anon/authenticated. Ingen leser eller
--     skriver dem direkte.
--   * noise_cache_get(nøkkel) er åpen for anon: den gir støysvaret for ett punkt, det samme
--     /omrade allerede viser alle. Den kan ikke liste eller søke.
--   * noise_cache_put(token, …) er også kallbar av anon — webappen har med vilje ingen
--     skrivenøkkel til databasen — men gjør ingenting uten riktig token. Databasen kjenner bare
--     SHA-256 av tokenet (app_write_tokens). Tokenet ligger som NOISE_CACHE_WRITE_TOKEN på
--     serveren og kan bare én ting: skrive støycache-rader. Uten rad i app_write_tokens avvises
--     alle skrivinger, og appen oppfører seg som før cachen fantes.
--
-- Raden settes inn for hånd etter db:push (aldri i en migrasjon — hemmeligheter hører ikke i Git):
--   insert into public.app_write_tokens (name, token_sha256)
--   values ('noise_cache', sha256(convert_to('<tokenet>', 'UTF8')));
-- ---------------------------------------------------------------------------

create table public.app_write_tokens (
  name          text primary key,
  token_sha256  bytea not null,
  created_at    timestamptz not null default now()
);
alter table public.app_write_tokens enable row level security;
revoke all on public.app_write_tokens from anon, authenticated;

create table public.noise_cache (
  -- «59.96646,10.74715»: bredde og lengde med fem desimaler, samme avrunding som /omrade bruker.
  cache_key          text primary key check (cache_key ~ '^-?\d{1,2}\.\d{5},-?\d{1,3}\.\d{5}$'),
  latitude           double precision not null check (latitude between 57 and 72),
  longitude          double precision not null check (longitude between 4 and 32),
  -- hit: punktet ligger i et støyintervall. no_hit: dekket av kartleggingen, under laveste
  -- intervall. not_covered: kartleggingen dekker ikke stedet. Kildefeil er ingen tilstand.
  road_state         text not null check (road_state in ('hit', 'no_hit', 'not_covered')),
  rail_state         text not null check (rail_state in ('hit', 'no_hit', 'not_covered')),
  -- by: byområde (alle gater modellert). hoved: bare de mest trafikkerte strekningene. ingen.
  road_coverage      text not null check (road_coverage in ('by', 'hoved', 'ingen')),
  rail_coverage      text not null check (rail_coverage in ('by', 'hoved', 'ingen')),
  -- Intervallet slik oppslaget tolket det: { niva, nedre, ovre, byomrade }. Null uten treff.
  road_result        jsonb,
  rail_result        jsonb,
  -- Året støymodellen beskriver. Ikke når vi hentet svaret.
  source_round_road  integer not null check (source_round_road between 2000 and 2100),
  source_round_rail  integer not null check (source_round_rail between 2000 and 2100),
  -- Når NaboRadar hentet svaret fra kilden.
  fetched_at         timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((road_state = 'hit') = (road_result is not null)),
  check ((rail_state = 'hit') = (rail_result is not null)),
  check ((road_state = 'not_covered') = (road_coverage = 'ingen' and road_result is null)),
  check ((rail_state = 'not_covered') = (rail_coverage = 'ingen' and rail_result is null))
);
alter table public.noise_cache enable row level security;
revoke all on public.noise_cache from anon, authenticated;

-- Lesing: ett punkt, på nøkkel. Primærnøkkelen er den eneste indeksen cachen trenger.
create function public.noise_cache_get(p_key text)
returns table (
  cache_key text, road_state text, rail_state text, road_coverage text, rail_coverage text,
  road_result jsonb, rail_result jsonb, source_round_road integer, source_round_rail integer,
  fetched_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.cache_key, c.road_state, c.rail_state, c.road_coverage, c.rail_coverage,
         c.road_result, c.rail_result, c.source_round_road, c.source_round_rail, c.fetched_at
  from public.noise_cache c
  where c.cache_key = p_key;
$$;

-- Skriving: bare med riktig token. Feil eller manglende token gir en feil, ingen rad.
create function public.noise_cache_put(
  p_token text,
  p_key text,
  p_latitude double precision,
  p_longitude double precision,
  p_road_state text,
  p_rail_state text,
  p_road_coverage text,
  p_rail_coverage text,
  p_road_result jsonb,
  p_rail_result jsonb,
  p_source_round_road integer,
  p_source_round_rail integer
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash bytea;
  v_fetched timestamptz := now();
begin
  select t.token_sha256 into v_hash from public.app_write_tokens t where t.name = 'noise_cache';
  if v_hash is null or p_token is null or length(p_token) < 32
     or sha256(convert_to(p_token, 'UTF8')) <> v_hash then
    raise exception 'noise_cache_put: ikke tillatt' using errcode = '42501';
  end if;

  -- Nøkkelen må være punktets egen, så en rad ikke kan legges på et annet sted enn den gjelder.
  if p_key <> to_char(p_latitude, 'FM990.00000') || ',' || to_char(p_longitude, 'FM990.00000') then
    raise exception 'noise_cache_put: nøkkelen stemmer ikke med koordinaten' using errcode = '22023';
  end if;

  insert into public.noise_cache as c (
    cache_key, latitude, longitude, road_state, rail_state, road_coverage, rail_coverage,
    road_result, rail_result, source_round_road, source_round_rail, fetched_at
  ) values (
    p_key, p_latitude, p_longitude, p_road_state, p_rail_state, p_road_coverage, p_rail_coverage,
    p_road_result, p_rail_result, p_source_round_road, p_source_round_rail, v_fetched
  )
  on conflict (cache_key) do update set
    road_state = excluded.road_state,
    rail_state = excluded.rail_state,
    road_coverage = excluded.road_coverage,
    rail_coverage = excluded.rail_coverage,
    road_result = excluded.road_result,
    rail_result = excluded.rail_result,
    source_round_road = excluded.source_round_road,
    source_round_rail = excluded.source_round_rail,
    fetched_at = excluded.fetched_at,
    updated_at = v_fetched;

  return v_fetched;
end;
$$;

revoke all on function public.noise_cache_get(text) from public;
revoke all on function public.noise_cache_put(text, text, double precision, double precision, text, text, text, text, jsonb, jsonb, integer, integer) from public;
grant execute on function public.noise_cache_get(text) to anon, authenticated, service_role;
grant execute on function public.noise_cache_put(text, text, double precision, double precision, text, text, text, text, jsonb, jsonb, integer, integer) to anon, authenticated, service_role;
