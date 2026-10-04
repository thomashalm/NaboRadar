-- ---------------------------------------------------------------------------
-- Registrerte tyttebærfunn i Oslo og Marka: internt researchlag i admin (Utforsk data).
--
-- Samme mønster som multefunnene (migrasjon 20261109000000): GBIF, CC BY 4.0 / CC0, den
-- upubliserte kategorien `natur_intern`, og ingen tidsplan. Leses bare gjennom admin-funksjonen
-- explore_area_features. Ingen score og intet habitatlag — se docs/research/tyttebaer-oslo.md.
-- ---------------------------------------------------------------------------

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('gbif-tyttebaerfunn-oslomarka', 'Registrerte tyttebærfunn, Oslo og Marka (GBIF)', 'area_feature', 'active',
   'Internt researchlag. Synkes for hånd.',
   'Per registrering: CC BY 4.0 eller CC0', 'https://creativecommons.org/licenses/by/4.0/',
   false, null, null, null);
