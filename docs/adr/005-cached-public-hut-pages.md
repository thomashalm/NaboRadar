# ADR 005: Hyttesidene leses anonymt, caches i en time, og høyden lagres ved sync

**Status:** Akseptert · 2026-10-03

## Kontekst
AI-søk-gjennomgangen ([research/ai-sok-aeo-audit.md](../research/ai-sok-aeo-audit.md)) fant tre svakheter ved de 1 504
offentlige hyttesidene:

- De ble laget på nytt ved hver visning (`Cache-Control: no-store`), med 0,5–1,9 s til første byte.
- Hyttespørringene brukte Supabase-klienten med brukerens cookies. Det var en rest fra pilotfasen, da en innlogget admin skulle
  se hyttene før kategorien ble publisert. Det gjorde hele siden dynamisk.
- Høyden ble slått opp live i Kartverkets høydemodell ved hver visning, med tre sekunders frist og cache bare i minnet. Samme
  hytte fikk noen ganger høyde og andre ganger ikke.

Søkemotorer og AI-søk skal se det samme som mennesker, og samme hytte skal gi samme side hver gang.

## Beslutning
- **Egen offentlig lesesti.** `getHut` og nabohyttene leser med den anonyme klienten (publishable key, ingen cookies), via de
  samme RPC-ene som før (`get_hut`, `huts_near`). Det er ingen nye grants eller tabelltilganger. Kartet, søket og nærområdet
  leser fortsatt med brukerens sesjon; de sidene er dynamiske uansett.
- **ISR med én times TTL.** `app/hytter/[ref]/page.tsx` har `revalidate = 3600` og en tom `generateStaticParams`. Hver hytte
  lages første gang den besøkes, caches og lages på nytt i bakgrunnen etter en time. Next og Netlify gir
  `s-maxage=3600, stale-while-revalidate`.
- **Invalidering.** Hver handling i `/admin/hytter` (kontroll, lenker, overstyringer, status) kaller
  `revalidatePath("/hytter/[ref]", "page")`, så endringen synes ved neste besøk. Endringer fra synken (GitHub Actions) synes
  innen en time.
- **Feil caches ikke.** Svarer ikke databasen, verken for hytta eller naboene, kaster siden en feil. Next cacher ikke en feilet
  visning og beholder forrige versjon.
- **Høyden lagres per hytte.** Kolonnene `terrain_elevation_m`, `_source`, `_checked_at` og `_geom` ligger på `huts`. Høyden
  beregnes etter hyttesynken (`afterSync` på hyttekildene) for nye og flyttede hytter. Den kan også kjøres med
  `npm run huts:elevation`. En feil skriver ingenting, så forrige verdi står. Skrivingen går bare gjennom
  `set_hut_elevations`/`huts_needing_elevation`, som bare `service_role` kan kalle.
- **Kommuneregisteret har reserve.** Kommune- og fylkesnavn hentes som før fra Kartverket, men caches et døgn i Nexts datacache.
  Svarer ikke registeret, brukes et øyeblikksbilde i koden (`lib/geo/kommuner-snapshot.json`).

## Begrunnelse
Det er den minste endringen som gjør siden cachebar: samme RPC-er, samme sikkerhetsmodell, ingen nye offentlige flater.
Admin-forhåndsvisning på de offentlige sidene trengs ikke etter lanseringen. Skjulte og avviste hytter kontrolleres i
`/admin/hytter`. Høyden er en fast egenskap ved et punkt og hører hjemme i databasen sammen med posisjonen den gjelder.

## Konsekvenser
- En innlogget admin ser nøyaktig samme hyttesider som alle andre.
- En hytte som blir offentlig via SQL (kategoriflagget) eller synken, kan stå som 404 i opptil en time.
- Høydemodellen svarer med høydekurver i stedet for terrengmodellen i store kall (50 punkter). Derfor slår vi opp ti om gangen,
  og et punkt som likevel får kurver, slås opp alene.
- Ved en kommunereform må øyeblikksbildet av kommuneregisteret hentes på nytt.

## Revurderes når
Hyttesidene trenger innhold som er ulikt per bruker, eller synken skal kunne tømme cachen direkte (krever et eget,
autentisert revalideringsendepunkt).
