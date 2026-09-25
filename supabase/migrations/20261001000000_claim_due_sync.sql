-- ---------------------------------------------------------------------------
-- claim_next_due_sync: gjør «hva er forfalt» til et krav, ikke et spørsmål.
--
-- sync_due() er read-only. To workere som spurte samtidig fikk samme svar, og kunne
-- begge kjøre samme provider. I praksis har GitHub Actions' concurrency-gruppe hindret
-- det, fordi bare én kjøring av workflowen går av gangen. Når vi nå legger til en
-- scheduler til, skal garantien ikke hvile på en enkelt leverandørs køfunksjon.
--
-- Denne stempler last_attempt_at i samme setning som den velger providere. Den andre
-- workeren ser da ingenting forfalt, fordi raden ikke lenger oppfyller betingelsen.
-- `for update skip locked` gjør at to samtidige kall ikke venter på hverandre.
--
-- Én provider av gangen, med vilje: krasjer workeren midtveis, er det bare den ene som
-- må vente til neste intervall. Ville vi stemplet alle forfalte på én gang, ville resten
-- blitt stående et helt døgn.
--
-- sync_due() beholdes uendret som lesespørring for admin og tester.
-- ---------------------------------------------------------------------------
create function public.claim_next_due_sync(p_now timestamptz default now())
returns table (provider_id text, mode text, reason text)
language plpgsql
set search_path = public
as $$
begin
  return query
  with kandidat as (
    select p.id
    from providers p
    where p.status in ('active', 'error')
      and p.kind in ('event', 'area_feature')
      and p.sync_interval_minutes is not null
      and (p.last_attempt_at is null
           or p.last_attempt_at < p_now - make_interval(mins => p.sync_interval_minutes))
    order by p.last_attempt_at nulls first, p.id
    limit 1
    for update skip locked
  )
  update providers p
  set last_attempt_at = p_now, updated_at = now()
  from kandidat k
  left join lateral (
    select max(r.started_at) as last_full
    from sync_runs r
    where r.provider_id = k.id and r.mode = 'full' and r.status in ('success', 'partial')
  ) lf on true
  where p.id = k.id
  returning
    p.id,
    case when not p.supports_incremental
           or lf.last_full is null
           or lf.last_full < p_now - make_interval(hours => p.full_sync_interval_hours)
         then 'full' else 'incremental' end,
    -- Stemplet vi nettopp satte er ikke interessant; det er forrige forsøk som forklarer hvorfor.
    'forfalt ' || to_char(p_now at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || 'Z';
end;
$$;

revoke execute on function public.claim_next_due_sync(timestamptz) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.claim_next_due_sync(timestamptz) from anon, authenticated';
  end if;
end;
$$;
