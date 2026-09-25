-- ---------------------------------------------------------------------------
-- Gjør scheduler-funksjonene portable i miljøer uten pg_cron, pg_net og Vault.
--
-- Den forrige migrasjonen opprettet scheduler_status() som ren SQL. Den formen slår opp
-- cron.job og net._http_response allerede ved opprettelse, og brøt dermed testoppsettet,
-- som spiller av hele historikken mot PGlite. Begge funksjonene erstattes av versjoner
-- som sjekker at avhengighetene finnes før de brukes.
--
-- Produksjon får samme resultat som før: der finnes både pg_cron, pg_net og Vault.
-- ---------------------------------------------------------------------------
drop function if exists public.scheduler_status();
drop function if exists public.trigger_sync_workflow();

create function public.trigger_sync_workflow()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if to_regproc('net.http_post') is null then
    raise notice 'pg_net er ikke installert — workflow ikke utløst.';
    return;
  end if;

  execute $q$
    select decrypted_secret from vault.decrypted_secrets
    where name = 'github_workflow_dispatch_token'
  $q$ into v_token;

  if v_token is null or length(trim(v_token)) = 0 then
    -- Ingen hemmelighet ennå. Si fra i cron-loggen, men ikke feil.
    raise notice 'Ingen GitHub-token i Vault (github_workflow_dispatch_token) — workflow ikke utløst.';
    return;
  end if;

  -- pg_net er asynkron: kallet legges i kø og sendes av bakgrunnsprosessen. Headeren med
  -- tokenet ligger i net.http_request_queue til forespørselen er sendt, og slettes da.
  -- Skjemaet net er ikke eksponert gjennom API-et.
  perform net.http_post(
    url := 'https://api.github.com/repos/thomashalm/NaboRadar/actions/workflows/sync.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'naboradar-scheduler',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('ref', 'main'),
    timeout_milliseconds := 10000
  );
exception
  -- Vault finnes ikke i testmiljøet. Da er det ingenting å utløse, og det er greit.
  when undefined_table or undefined_function or invalid_schema_name then
    raise notice 'Scheduler-avhengigheter mangler — workflow ikke utløst.';
end;
$$;

revoke execute on function public.trigger_sync_workflow() from public;

-- Hvert 15. minutt. cron.schedule oppdaterer jobben hvis navnet finnes fra før.
do $$
begin
  if to_regproc('cron.schedule') is not null then
    perform cron.schedule('naboradar-sync-dispatch', '*/15 * * * *',
                          'select public.trigger_sync_workflow()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- scheduler_status: siste utløsning, til /admin.
--
-- Uten dette ville vi bare sett fraværet av en sync, ikke hvilket ledd som røk.
-- Healthchecks fanger at kjeden er brutt; denne sier om det var klokka.
--
-- plpgsql med dynamisk SQL, slik at funksjonen kan opprettes også der cron-skjemaet
-- ikke finnes. Da returnerer den ingen rader, og admin viser ikke feltet.
-- ---------------------------------------------------------------------------
create function public.scheduler_status()
returns table (
  jobname text,
  schedule text,
  active boolean,
  last_run timestamptz,
  last_status text,
  last_message text,
  last_http_status integer,
  last_http_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.request_role() = 'service_role') then
    return;
  end if;
  if to_regclass('cron.job') is null then
    return;
  end if;

  return query execute $q$
    select
      j.jobname::text,
      j.schedule::text,
      j.active,
      d.start_time,
      d.status::text,
      left(d.return_message, 200),
      r.status_code,
      r.created
    from cron.job j
    left join lateral (
      select start_time, status, return_message
      from cron.job_run_details x
      where x.jobid = j.jobid
      order by x.start_time desc
      limit 1
    ) d on true
    -- Siste utgående kall fra pg_net. Vi er eneste bruker, så dette er vårt.
    left join lateral (
      select status_code, created from net._http_response order by created desc limit 1
    ) r on true
    where j.jobname = 'naboradar-sync-dispatch'
  $q$;
end;
$$;

revoke execute on function public.scheduler_status() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.scheduler_status() to authenticated';
  end if;
end;
$$;
