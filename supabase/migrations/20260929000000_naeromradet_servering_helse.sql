-- ---------------------------------------------------------------------------
-- To nye kategorier under seksjonen «Nærområdet»:
--
--   servering — steder med skjenkebevilling, fra Næringsetatens eget kart i Oslo.
--               Bevillingsmyndighetens egen oversikt, oppdatert daglig, med punktet
--               satt på adressen. Vi lagrer ikke bevillingshaver: for et
--               enkeltpersonsforetak er det en privatperson.
--
--   helse     — sykehus. Kurert liste, bygget av scripts/build-sykehus.ts og
--               verifisert mot to uavhengige kilder: Helsenorges oversikt over
--               behandlingssteder med offentlig tilbud, og næringskode 86.101
--               (somatiske sykehustjenester) på underenheten i Enhetsregisteret.
--               Psykiatri, rus og private klinikker uten sykehusstatus er ikke med.
--
-- Skjenkestedene er tette: 539 innen 1 km av Karl Johan, 1 150 innen 3 km. Spørringen
-- i lib/facts/queries.ts henter derfor serveringssteder for seg, slik at de ikke
-- fortrenger de andre kategoriene innenfor radgrensen.
-- ---------------------------------------------------------------------------
alter table public.area_features drop constraint area_features_category_check;
alter table public.area_features add constraint area_features_category_check
  check (category in ('miljo', 'grunnforhold', 'stoy', 'infrastruktur', 'industri', 'oppvekst', 'helse', 'servering'));

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('oslo-skjenkebevilling', 'Skjenkebevillinger i Oslo (Næringsetaten)', 'area_feature', 'active', null,
   'Lisens ikke oppgitt av kilden', 'https://od2.pbe.oslo.kommune.no/xkart/skjenkebevilling/',
   false, 1440, 24, 168),
  ('helsenorge-sykehus', 'Sykehus (Helsenorge og Enhetsregisteret)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/2.0',
   false, 10080, 168, 336);
