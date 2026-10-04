-- ---------------------------------------------------------------------------
-- Skolelenkene til Nasjonalt skoleregister: /enhet/<orgnr> → /enheter/<orgnr>.
--
-- Alle skolene lenket til en rute som ikke finnes i registerets nettside, og ga «Siden finnes
-- ikke – feilkode 404». Provideren er rettet (lib/providers/udir/skoler.ts), men radene som
-- allerede ligger i databasen rettes ikke av seg selv: synken leser Geonorge-WFS-en for skoler,
-- som svarte HTTP 500 da feilen ble funnet (2026-10-04).
--
-- Bare lenken endres. Organisasjonsnummeret i adressen er det samme.
-- ---------------------------------------------------------------------------

update public.area_features
set source_url = replace(source_url, 'https://nsr.udir.no/enhet/', 'https://nsr.udir.no/enheter/')
where provider_id = 'udir-skoler'
  and source_url like 'https://nsr.udir.no/enhet/%';
