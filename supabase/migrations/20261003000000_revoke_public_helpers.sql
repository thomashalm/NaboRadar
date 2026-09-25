-- ---------------------------------------------------------------------------
-- Hjelpefunksjonene som fortsatt lå åpne via PUBLIC.
--
-- Forrige migrasjon fjernet de eksplisitte anon/authenticated-grantene, men de
-- fem funksjonene under fikk aldri en «revoke … from public» da de ble laget.
-- En rolle får EXECUTE hvis den har grantet selv *eller* PUBLIC har det, så de
-- var fortsatt kjørbare for anon. Bekreftet 2026-09-25: request_role() svarte
-- HTTP 200 «anon» med bare den publiserbare nøkkelen.
--
-- Eksponeringen var liten — de forteller bare noe om kalleren selv, og anon
-- fikk `false`, `{"role":"anon"}`, `"anon"` og `""` — men rettigheten er ikke
-- i bruk, og en funksjon ingen skal kalle utenfra skal ikke stå åpen.
--
-- Logikken i funksjonene er uendret.
-- ---------------------------------------------------------------------------

revoke execute on function public.is_admin()       from public;
revoke execute on function public.is_privileged()  from public;
revoke execute on function public.request_claims() from public;
revoke execute on function public.request_role()   from public;
revoke execute on function public.request_email()  from public;

-- Hvem trenger dem etterpå:
--
--   postgres, service_role  eksplisitt grant fra før — sync-worker kaller
--                           provider_health(), sync_run_*() og resten som
--                           service_role.
--   authenticated           kun is_admin(). RLS-policyene på admin_users,
--                           sync_runs og sync_requests kaller den på vegne av
--                           kalleren, så uten den ser en innlogget admin
--                           ingenting på /admin.
--   anon                    ingen.
--
-- De fire øvrige kalles bare innenfra security definer-funksjoner
-- (is_admin, provider_health, recent_sync_runs, request_sync, scheduler_status).
-- De kjører som eier, altså postgres, og trenger derfor ikke noe grant til
-- kalleren. De offentlige lesefunksjonene — features_near, features_count_near,
-- events_within, get_event, data_status — rører ingen av dem.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.is_admin() to authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Skjemaet net (pg_net): akseptert plattformstandard, ikke et hull vi lar stå.
--
-- Supabase gir selv USAGE på net og EXECUTE på net.http_post til PUBLIC, anon
-- og authenticated, med supabase_admin som grantor. postgres kan ikke tilbake-
-- kalle en annen rolles grant, så «revoke … from anon» her er en stille no-op.
-- Vi kan altså ikke fjerne den, og later ikke som om vi har gjort det.
--
-- Hvorfor det likevel ikke er nåbart: PostgREST ruter bare til de eksponerte
-- skjemaene (public), ikke til net. En anonym klient har ingen vei dit.
--
-- Regelen som faktisk beskytter oss, og som skal håndheves ved hver ny funksjon:
-- ingen funksjon i public som bruker net.* skal være kjørbar av anon eller
-- authenticated. I dag gjelder det trigger_sync_workflow() (kun postgres og
-- service_role) og scheduler_status(), som leser net._http_response og er stengt
-- for anon. npm run db:verify feiler hvis dette endrer seg.
-- ---------------------------------------------------------------------------
