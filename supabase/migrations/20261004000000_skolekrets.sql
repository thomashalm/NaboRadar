-- ---------------------------------------------------------------------------
-- Ny kategori: skolekrets — veiledende inntaksområde for barneskole i Oslo.
--
-- Dette er den første kategorien som ikke svarer på «hva finnes i nærheten?», men på
-- «hvilket område ligger søkepunktet inne i?». Avstand er meningsløs her: en krets 200 meter
-- unna er ikke adressens krets, den er naboens. Oppslaget filtrerer derfor på at punktet
-- faktisk dekkes av polygonet, og kategorien står med vilje utenfor AREA_SECTIONS.
--
-- Kilden dekker bare Oslo. Utenfor Oslo finnes det ingen polygon som dekker punktet, og da
-- vises ingen notis — ikke «ingen treff», som ville vært en påstand vi ikke har dekning for.
--
-- Grensene revideres av Utdanningsetaten hver høst. Kilden har ingen datostempling, så
-- innholdshashen i sync-laget er vårt eneste signal om at de har endret seg.
--
-- Ungdomsskole er ikke med: i Oslo bestemmes den av hvilken barneskole eleven hadde
-- nærskolerett ved, ikke av en egen geografi. Det er en oppslagstabell, ikke et kartlag.
-- ---------------------------------------------------------------------------
alter table public.area_features drop constraint area_features_category_check;
alter table public.area_features add constraint area_features_category_check
  check (category in ('miljo', 'grunnforhold', 'stoy', 'infrastruktur', 'industri', 'oppvekst',
                      'helse', 'servering', 'omsorg', 'skolekrets'));

insert into public.providers (id, name, kind, status, status_reason, license_name, license_url,
                              supports_incremental, sync_interval_minutes, full_sync_interval_hours, stale_after_hours)
values
  ('oslo-skolekrets', 'Skolekretser i Oslo (Plan- og bygningsetaten)', 'area_feature', 'active', null,
   -- Tjenesten oppgir «Copyright Plan- og bygningsetaten i Oslo kommune» og ingen åpen lisens.
   -- Vi navngir kilden og lenker til kartet, og gjenbruken er ikke avklart. Se håndboken.
   'Lisens ikke avklart med kilden', 'https://od2.pbe.oslo.kommune.no/xkart/skoler/',
   -- Revideres én gang i året. Ukentlig sjekk er rikelig; stale etter et halvt år.
   false, 10080, 168, 4380);
