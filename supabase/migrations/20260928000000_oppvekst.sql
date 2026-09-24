-- ---------------------------------------------------------------------------
-- Ny kategori: oppvekst (skoler og barnehager) under seksjonen «Nærområdet».
--
-- Kilde er Utdanningsdirektoratets egne registre via Geonorge-WFS. Begge har
-- koordinat, adresse og et «i drift»-flagg, og oppdateres av direktoratet selv.
--
-- To bevisste utelatelser, begge etter allowlist-prinsippet — vi tar bare med det
-- vi kan verifisere at hører hjemme i et offentlig kart:
--   * familiebarnehager og åpne barnehager. En familiebarnehage drives i et privat
--     hjem, og koordinaten peker da på noens bolig.
--   * spesialskoler, jf. at en skole ved en institusjon kan røpe institusjonen.
--     Flagget hentes fra NSR, som er den eneste kilden som har det.
-- ---------------------------------------------------------------------------
alter table public.area_features drop constraint area_features_category_check;
alter table public.area_features add constraint area_features_category_check
  check (category in ('miljo', 'grunnforhold', 'stoy', 'infrastruktur', 'industri', 'oppvekst'));

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('udir-skoler', 'Grunnskoler og videregående skoler (Utdanningsdirektoratet)', 'area_feature', 'active', null,
   'Creative Commons Navngivelse 4.0', 'https://creativecommons.org/licenses/by/4.0/',
   false, 1440, 24, 168),
  ('udir-barnehager', 'Barnehager (Utdanningsdirektoratet)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/1.0',
   false, 1440, 24, 168);
