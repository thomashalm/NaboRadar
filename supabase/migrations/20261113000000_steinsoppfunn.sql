-- ---------------------------------------------------------------------------
-- Registrerte steinsoppfunn (Boletus edulis) i Oslo og Marka: internt researchlag i admin.
--
-- Samme mønster som kantarellfunnene (migrasjon 20261112000000): GBIF, CC BY 4.0 / CC0, den
-- upubliserte kategorien `natur_intern`, ingen tidsplan, og lesing bare gjennom admin-funksjonen
-- explore_area_features. Funn i flere sesonger telles opp ved import. Ingen score og intet
-- habitatlag — se docs/research/steinsopp-oslo.md.
-- ---------------------------------------------------------------------------

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('gbif-steinsoppfunn-oslomarka', 'Registrerte steinsoppfunn, Oslo og Marka (GBIF)', 'area_feature', 'active',
   'Internt researchlag. Synkes for hånd.',
   'Per registrering: CC BY 4.0 eller CC0', 'https://creativecommons.org/licenses/by/4.0/',
   false, null, null, null);
