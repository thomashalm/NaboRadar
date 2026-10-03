-- ---------------------------------------------------------------------------
-- Driftsobservasjon for de direkte oppslagene på /omrade (flom, radon, stormflo, støy …).
--
-- De direkte oppslagene synkes ikke, så provider_health ser dem ikke. Da stormflo og flystøy var
-- nede 2026-10-03, var det bare console.warn i Netlify-loggen som viste det. Sync-jobben
-- (GitHub Actions, hvert 15. minutt) spør nå hver kilde én gang mot et fast punkt og lagrer
-- utfallet her. Ett rad per kilde: siste sjekk, siste OK, siste feil, og hvor lenge den har feilet
-- sammenhengende. Ikke et overvåkingssystem — bare nok til å se at en kilde har vært nede lenge.
--
-- Skrives bare av service role. Ingen anonym skrivevei: den publiserbare nøkkelen ligger i
-- klientbundlen, og en åpen skrivefunksjon kunne fått en kilde til å se nede ut. Leses bare av admin.
-- ---------------------------------------------------------------------------

create table public.lookup_source_status (
  lookup_id            text primary key check (length(lookup_id) between 1 and 80),
  name                 text not null,
  last_checked_at      timestamptz not null,
  last_ok_at           timestamptz,
  last_error_at        timestamptz,
  last_error           text,
  -- Første feil i en sammenhengende feilperiode. Null når siste sjekk var OK.
  failing_since        timestamptz,
  consecutive_failures integer not null default 0
);

alter table public.lookup_source_status enable row level security;
revoke all on public.lookup_source_status from public, anon, authenticated;

/** Ett sjekkresultat for én kilde. Feilmeldingen kortes til 300 tegn. */
create function public.record_lookup_check(p_lookup_id text, p_name text, p_ok boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into lookup_source_status as s
    (lookup_id, name, last_checked_at, last_ok_at, last_error_at, last_error, failing_since, consecutive_failures)
  values
    (p_lookup_id, p_name, now(),
     case when p_ok then now() end,
     case when p_ok then null else now() end,
     case when p_ok then null else left(coalesce(p_error, 'ukjent feil'), 300) end,
     case when p_ok then null else now() end,
     case when p_ok then 0 else 1 end)
  on conflict (lookup_id) do update set
    name = excluded.name,
    last_checked_at = now(),
    last_ok_at = case when p_ok then now() else s.last_ok_at end,
    last_error_at = case when p_ok then s.last_error_at else now() end,
    last_error = case when p_ok then s.last_error else left(coalesce(p_error, 'ukjent feil'), 300) end,
    failing_since = case when p_ok then null else coalesce(s.failing_since, now()) end,
    consecutive_failures = case when p_ok then 0 else s.consecutive_failures + 1 end;
end;
$$;

/** Til /admin. Tom for alle som ikke er admin, som scheduler_status(). */
create function public.lookup_source_status()
returns table (
  lookup_id text, name text, last_checked_at timestamptz, last_ok_at timestamptz,
  last_error_at timestamptz, last_error text, failing_since timestamptz, consecutive_failures integer
)
language sql
stable
security definer
set search_path = public
as $$
  select s.lookup_id, s.name, s.last_checked_at, s.last_ok_at, s.last_error_at, s.last_error,
         s.failing_since, s.consecutive_failures
  from lookup_source_status s
  where public.is_admin()
  order by s.failing_since nulls last, s.name
$$;

do $$
begin
  execute 'revoke execute on function public.record_lookup_check(text, text, boolean, text) from public';
  execute 'revoke execute on function public.record_lookup_check(text, text, boolean, text) from anon, authenticated';
  execute 'grant execute on function public.record_lookup_check(text, text, boolean, text) to service_role';

  execute 'revoke execute on function public.lookup_source_status() from public';
  execute 'revoke execute on function public.lookup_source_status() from anon';
  execute 'grant execute on function public.lookup_source_status() to authenticated, service_role';
end;
$$;
