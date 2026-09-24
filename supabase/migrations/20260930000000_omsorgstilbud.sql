-- ---------------------------------------------------------------------------
-- Ny kategori: omsorg — sykehjem, helsehus, behandlingssteder og institusjonsbaserte
-- botilbud, vist for brukeren som «Omsorgstilbud».
--
-- Et sted kommer bare inn når den ansvarlige aktøren selv publiserer både navnet og den
-- konkrete adressen: Oslo kommunes egen stedsindeks, eller Helsenorges oversikt over
-- behandlingssteder med offentlig tilbud. Steder uten publisert adresse, uten husnummer,
-- eller der adressen peker på et administrasjonsbygg, tas ikke inn. Fosterhjem,
-- beredskapshjem og administrative team er utelatt: det er private hjem og kontorer.
--
-- Den presise typen ligger i attributes.internalType for kvalitetssikring og filtrering.
-- Den er aldri etiketten brukeren ser. Vi lagrer ingen opplysninger om beboere, pasienter
-- eller barn — bare virksomheten og stedet.
-- ---------------------------------------------------------------------------
alter table public.area_features drop constraint area_features_category_check;
alter table public.area_features add constraint area_features_category_check
  check (category in ('miljo', 'grunnforhold', 'stoy', 'infrastruktur', 'industri', 'oppvekst', 'helse', 'servering', 'omsorg'));

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('omsorgstilbud', 'Omsorgstilbud (Oslo kommune og Helsenorge)', 'area_feature', 'active', null,
   'Norsk lisens for offentlige data (NLOD)', 'https://data.norge.no/nlod/no/2.0',
   false, 10080, 168, 336);
