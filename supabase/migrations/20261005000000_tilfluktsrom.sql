-- ---------------------------------------------------------------------------
-- Ny kategori: tilfluktsrom — offentlige tilfluktsrom fra Sivilforsvaret/DSB.
--
-- 556 rom i hele landet, fra Geonorge-WFS-en DSB publiserer under NLOD. Datasettet heter
-- «Tilfluktsrom - Offentlige», og det er hele avgrensningen: private tilfluktsrom publiseres
-- ikke av DSB, så det finnes ingen private rader å filtrere bort.
--
-- Kilden gir fire opplysninger om rommet: romnummer, antall plasser, en stedsbeskrivelse og
-- et punkt. Den gir ikke areal, type eller status. Vi viser derfor bare det som faktisk står
-- der, og finner ikke på resten.
--
-- Seksjonen ligger sist på resultatsiden. Dette er referanseinformasjon om beredskap, ikke et
-- funn om området, og skal ikke leses som et varsel eller som en anvisning om hvor noen skal
-- gå. Ordlyden er strammet inn deretter — se lib/facts/wording.ts.
-- ---------------------------------------------------------------------------
alter table public.area_features drop constraint area_features_category_check;
alter table public.area_features add constraint area_features_category_check
  check (category in ('miljo', 'grunnforhold', 'stoy', 'infrastruktur', 'industri', 'oppvekst',
                      'helse', 'servering', 'omsorg', 'skolekrets', 'tilfluktsrom'));

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('dsb-tilfluktsrom', 'Offentlige tilfluktsrom (DSB)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0',
   -- Datasettet endres sjelden. Ukentlig sjekk, stale etter et halvt år.
   false, 10080, 168, 4380);
