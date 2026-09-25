-- ---------------------------------------------------------------------------
-- Scheduler: pg_cron utløser GitHub-workflowen hvert 15. minutt.
--
-- GitHubs egen `schedule` er best effort. Målt over 41 timer opprettet den 11 av rundt
-- 165 kjøringer, med hull på opptil 338 minutter — se docs/drift-scheduler.md. Klokka
-- flyttes derfor hit, mens alt annet står: samme worker, samme workflow, samme secrets,
-- samme «Run workflow»-knapp. GitHubs schedule beholdes som reserve.
--
-- Tokenet står ikke her. Funksjonen leser det fra Vault under navnet
-- «github_workflow_dispatch_token». Uten et token gjør jobben ingenting — den skal ikke
-- feile hvert kvarter mens hemmeligheten ennå ikke er satt opp.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

create function public.trigger_sync_workflow()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'github_workflow_dispatch_token';

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
end;
$$;

revoke execute on function public.trigger_sync_workflow() from public;

-- Hvert 15. minutt. cron.schedule oppdaterer jobben hvis navnet finnes fra før.
select cron.schedule('naboradar-sync-dispatch', '*/15 * * * *', $job$select public.trigger_sync_workflow()$job$);

-- ---------------------------------------------------------------------------
-- scheduler_status: siste utløsning, til /admin.
--
-- Uten dette ville vi bare sett fraværet av en sync, ikke hvilket ledd som røk.
-- Healthchecks fanger at kjeden er brutt; denne sier om det var klokka.
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
language sql
stable
security definer
set search_path = public
as $$
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
    and (public.is_admin() or public.request_role() = 'service_role');
$$;

revoke execute on function public.scheduler_status() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.scheduler_status() to authenticated';
  end if;
end;
$$;
