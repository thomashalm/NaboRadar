# NaboRadar

Hva skjer rundt deg? NaboRadar viser offentlige plan- og byggehendelser rundt en adresse, forklart på forståelig norsk.

**Status:** fase 4 er ferdig. Adresse eller sted → radius → ekte planoppstarter fra DiBK → kart, feed og detaljside.

- [docs/data-sources.md](docs/data-sources.md) — testede datakilder, tilgang og lisens
- [docs/architecture.md](docs/architecture.md) — datamodell, providers, geo-strategi, sync, personvern
- [docs/adr/](docs/adr/) — arkitekturbeslutninger

## Kom i gang

Krever Node.js 20.9 eller nyere (utviklet på Node 24).

```bash
npm install
echo "LOCAL_DATABASE=pglite" > .env.local   # eller Supabase-variabler, se under
npm run sync:dibk                           # henter alle planoppstarter fra DiBK (~20 s)
npm run dev
```

Åpne http://localhost:3000.

- Søk og kart virker uten database, fordi de bruker åpne Kartverket-tjenester.
- Plansakene krever en database: hosted Supabase eller lokal PGlite.
- Uten database viser resultatsiden «Vi får ikke hentet plansaker akkurat nå.»

| Kommando | Hva |
|---|---|
| `npm run dev` | Utviklingsserver |
| `npm run build && npm start` | Produksjonsbygg |
| `npm test` | Enhetstester (ingen nettverk) |
| `npm run sync:dibk` | Full sync av DiBK-plandata (`-- --mode=incremental` for inkrementell) |
| `npm run sync:area` | Full sync av områdefakta (forurenset grunn, kvikkleire, nettanlegg, industri) |
| `npm run sync:worker` | Kjører forespørsler fra /admin og providere som er forfalt. Dette er kommandoen en scheduler skal kalle. |
| `npm run sync:status` | Helsetilstand per provider (samme regler som /admin og varsling) |
| `npm run alerts:check` | Vurderer helsetilstand og sender varsel-e-post (`-- --dry-run` skriver den bare ut) |
| `npm run db:push` | Kjør migrasjoner mot `SUPABASE_DB_URL` (Supabase CLI) |
| `npm run db:verify` | Verifiser PostGIS, RLS, grants og data i hosted database |
| `npm run test:network` | Integrasjonstester mot ekte Kartverket- og DiBK-API |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

`/dev` viser diagnostikk: DiBK-sync (siste kjøring, antall events, avviste) med «Sync now», Kartverket-status, kartkonfig, hvilken database som er i bruk, og provider-status. Siden og sync-knappen finnes bare i development. Server-action-en avviser kall utenfor development, selv om noen kaller den direkte.

## Miljøvariabler

Kopier `.env.example` til `.env.local`.

| Variabel | Hvor | Formål |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | klient + server | Supabase-prosjektets URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | klient + server | Publishable key (`sb_publishable_…`) eller legacy anon key. RLS beskytter data. |
| `SUPABASE_SECRET_KEY` | **kun server** | Secret key (`sb_secret_…`) eller legacy service_role. Kreves for sync. |
| `SUPABASE_DB_URL` | **kun lokalt/CI** | Postgres-tilkobling for `db:push` og `db:verify`. Brukes ikke av appen. |
| `LOCAL_DATABASE` | server | `pglite` gir lokal Postgres + PostGIS i `.data/pglite` når Supabase ikke er satt. Kun development/test. |
| `NEXT_PUBLIC_MAP_TILE_URL` | klient | XYZ-mal for bakgrunnskart. Standard er Kartverket topograatone. |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | klient | Attribusjon for kartet. Standard er `© Kartverket`. |
| `RUN_NETWORK_TESTS` | tester | `1` aktiverer integrasjonstester mot Kartverket og DiBK |

Ekte nøkler skal aldri committes. `.env*.local` er git-ignorert.

## Hosted Supabase (fra scratch)

Verifisert 2026-09-21 mot Supabase med PostgreSQL 17.6 og PostGIS 3.3.7.

1. **Opprett prosjekt** på supabase.com. Velg en region i EU, for eksempel `eu-west-1` (Irland) eller `eu-north-1` (Stockholm), og noter database-passordet.
2. **Legg nøkler i `.env.local`** (git-ignorert). Se `.env.example`.

   | Variabel | Hvor i dashboardet |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key |
   | `SUPABASE_SECRET_KEY` | Project Settings → API Keys → Secret key (kun server) |
   | `SUPABASE_DB_URL` | Connect → Connection string → **Session pooler** (port 5432), med passordet |

   `LOCAL_DATABASE=pglite` kan stå. Supabase brukes automatisk når variablene over er satt.
3. **Kjør migrasjonene:**
   ```bash
   npm run db:push -- --dry-run   # viser hva som vil kjøres
   npm run db:push                # kjører supabase/migrations/*.sql med offisiell Supabase CLI
   ```
   Historikken lagres i `supabase_migrations.schema_migrations`, så `supabase db push` og `db:push` kan brukes om hverandre. Passordet maskeres i all output. Migrasjonen aktiverer selv PostGIS i `extensions`-skjemaet.
4. **Verifiser skjemaet:**
   ```bash
   npm run db:verify
   ```
   Skriptet viser PostgreSQL- og PostGIS-versjon, en geografi-test, migrasjonshistorikk, RLS per tabell, tilganger per funksjon (anon skal bare ha `events_within`, `get_event` og `data_status`), antall rader og en sjekk av at ingen berørte parter er lagret.
5. **Hent data:**
   ```bash
   npm run sync:dibk
   ```
   Tar ca. 1 min mot hosted. En ny kjøring skal gi `Unchanged: <alle>`.
6. **Start appen** med `npm run dev`. `/dev` skal vise «Database: Hosted Supabase», og `/omrade` viser saker fra Supabase.

**Sikkerhet:**
- Appen leser med publishable key (RLS og funksjons-grants gjelder).
- Bare sync bruker secret key.
- `SUPABASE_DB_URL` trengs bare for migrasjoner og verifisering. Den brukes ikke av appen, og skal ikke settes i produksjonsmiljøet til webappen.
- Nøkler som har vært delt i klartekst (chat, e-post) bør roteres.

Migrasjonsfilene er source of truth. Endringer gjøres i nye migrasjoner, aldri i dashboardet.

## Deploy (Netlify)

Netlify bygger fra GitHub (`main`) med `netlify.toml`: `npm run build`, Node 24, og Next.js via OpenNext-adapteren, som Netlify legger til automatisk.

**Miljøvariabler i produksjon.** Kartlagt fra koden (`grep process.env`):

| Variabel | I Netlify? | Hvorfor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Ja** | `/omrade` og `/sak` leser plansaker (`events_within`, `get_event`, `data_status`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Ja** | Samme. Publishable key, der RLS og funksjons-grants begrenser tilgangen |
| `SUPABASE_SECRET_KEY` | **Nei** | Brukes bare av `npm run sync:dibk` og `/dev`, som gir 404 i produksjon |
| `SUPABASE_DB_URL` | **Nei** | Brukes bare av `db:push` og `db:verify` lokalt |
| `LOCAL_DATABASE` | **Nei** | Kun development. Ignoreres uansett når `NODE_ENV=production` |
| `NEXT_PUBLIC_MAP_TILE_URL` / `NEXT_PUBLIC_MAP_ATTRIBUTION` | Valgfritt | Standard er Kartverket topograatone |
| `RUN_NETWORK_TESTS` | Nei | Kun tester |

`NEXT_PUBLIC_*` bakes inn ved build. Endrer du dem, må du trigge en ny deploy.

**Data i produksjon:** syncen kjører ikke på Netlify ennå. Oppdater hosted data lokalt med `npm run sync:dibk`, med Supabase-nøklene i `.env.local`. Periodisk sync (cron) kommer senere.

**Produksjonsbundle:** PGlite og `.data/` er ekskludert fra serverfunksjonene (`outputFileTracingExcludes`), så den lokale databasen og 44 MB WASM aldri deployes.

## Geokoding (Kartverket)

Frontenden kaller aldri Kartverket direkte. Flyten er:

```
SearchBox (klient) → GET /api/geocode?q=… → KartverketGeocodingProvider → Adresse-API + Stedsnavn-API (parallelt)
```

- **Endepunkter:** `https://ws.geonorge.no/adresser/v1/sok` og `https://ws.geonorge.no/stedsnavn/v1/navn` (CC BY 4.0).
- **Søkestreng:** slutter søket med et husnummer, søkes det eksakt (`Karl Johans gate 1`); ellers som prefiks (`sognsv*`). Prefiks på et husnummer gir dårlige treff, og det er verifisert i discovery. `fuzzy` brukes ikke, fordi den gir mye støy og feiler sammen med `*` i Stedsnavn-API.
- **Rangering** ([`lib/geocoding/merge.ts`](lib/geocoding/merge.ts)):
  - Tekstrelevans først: eksakt treff, så «starter med», så «et ord starter med».
  - Adresser får et tillegg, så de vinner over stedsnavn ved lik relevans.
  - Relevante stedstyper (vann, stasjon, bydel, tettsted …) og norsk skrivemåte får ekstra vekt.
  - Havområder og offshore-installasjoner filtreres bort.
- **Delvis feil:** feiler én tjeneste, returneres treff fra den andre. Feiler begge, svarer API-et 503 og UI-et viser «Vi får ikke søkt etter steder akkurat nå. Prøv igjen.»
- **Timeout og retry:** 3,5 s per kall og ett nytt forsøk ved 5xx eller nettverksfeil. Ingen retry på 4xx.
- **Caching:**
  - In-memory TTL-cache i serverprosessen: 10 min, maks 500 søk.
  - Bare komplette svar caches. Feil og delvise svar caches aldri.
  - Nettleseren får `Cache-Control: private, max-age=300`.
  - Ingen Redis. Cachen deles ikke mellom serverinstanser, og det er akseptabelt for MVP.
- **Beskyttelse mot overbruk:** minst 2 tegn (server og klient), 250 ms debounce, og forrige forespørsel avbrytes ved nytt tastetrykk. Maks 100 tegn.
- **Personvern:** søketekst logges aldri. Valgt sted finnes bare i URL-en.

## Kart

- **MapLibre GL JS 6** med raster-fliser fra [`lib/map/config.ts`](lib/map/config.ts). Tile-URL og attribution defineres bare der og kan overstyres med env.
- **Standardkart:** `https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png`.
- **Radius:** tegnes som en geodetisk polygon, der hvert hjørne ligger nøyaktig `radius` meter fra sentrum (storsirkel, [`lib/geo/radius.ts`](lib/geo/radius.ts)). Kartet zoomes til sirkelens bounds.
- **Mobil:** kartet krever to fingre, så siden fortsatt kan scrolles. Rotasjon og pitch er slått av.
- **Worker:** MapLibre 6 laster web-workeren fra en fil ved siden av sin egen modul, og den fila kopierer ikke bundleren. [`scripts/copy-maplibre-worker.mjs`](scripts/copy-maplibre-worker.mjs) kopierer derfor workeren til `public/vendor/maplibre-gl-<versjon>/`. Det skjer automatisk ved `postinstall`, `predev` og `prebuild`.

## Resultat-URL

`/omrade?lat=59.97499&lng=10.72891&radius=3000&label=Sognsvann`

Alle parametre valideres med Zod ([`lib/area-params.ts`](lib/area-params.ts)):

| Parameter | Regel |
|---|---|
| `lat`/`lng` | Påkrevd, desimaltall innenfor fastlands-Norge, rundet til 5 desimaler. Ugyldig verdi gir siden «Vi klarte ikke å finne dette området.» med nytt søk. |
| `radius` | `500`, `1000` eller `3000`. Alt annet gir standardverdien 1 km. |
| `label` | Valgfri visningstekst. Kontrolltegn fjernes, og den kan være maks 120 tegn. |

## Plandata og sync

Kilde: DiBK «Planlegging igangsatt», collection `planomrade` (NLOD 2.0). Detaljer i [docs/data-sources.md](docs/data-sources.md).

```
DibkPlanningStartedProvider           lib/sync/run.ts                          Postgres (SQL-funksjoner)
  fetch: paginering (500/side),   →   samle alle sider                    →    upsert_events (ST_MakeValid, ST_Multi,
         timeout 20 s, 3 retry        normalize (provider, Zod)                 hash-sammenligning, dokumenter)
  normalize: Zod → NormalizedEvent    grupper på arealplan → MultiPolygon       mark_removed_from_source (kun full)
                                      contentHash → rader                       sync_run_start / sync_run_finish
```

- **Full sync** (standard i CLI):
  - Henter alle ~3 900 `planomrade`-features og alle tillatte dokumenter.
  - Grupperer til ~1 500 planer (én per `arealplan`).
  - Events som ikke lenger finnes i kilden får `removed_from_source_at`. De slettes ikke, og skjules i brukerspørringer.
- **Incremental:**
  - CQL `oppdateringsdato > siste vellykkede sync − 24 t`.
  - Deretter hentes hele gruppen (`?arealplan=`) og tillatte dokumenter for hver endret plan.
  - Markerer aldri noe som fjernet.
- **Anbefalt drift:** incremental hver 2. time og full hver natt ([ADR 003](docs/adr/003-central-data-sync.md)). Cron-oppsett kommer ved deploy.
- **Hash:** `contentHash` dekker kun normalisert kildeinnhold (tittel, geometri, datoer, lenke, attributter, dokumenter, rå metadata). Uendret hash gir `unchanged`, og bare `synced_at` oppdateres.
- **Feilhåndtering:**
  - En ugyldig feature blir `rejected`, og resten fortsetter.
  - En rad som ikke kan skrives blir `failed`, og status blir `partial`.
  - En ugyldig side eller et nettverksbrudd blir `failed`, og da gjøres ingen reconciliation.
- **Logging:** hver kjøring logges i `sync_runs` (fetched, accepted, rejected, inserted, updated, unchanged, removed, failed, feil). Payloads logges aldri.

```text
$ npm run sync:dibk
Provider:   dibk-planning-started (full)
Status:     success  (20.6 s)
Fetched:    3898
Accepted:   3898
Rejected:   0
Events:     1536  (etter gruppering på arealplan)
Documents:  3094
Inserted:   1536
Updated:    0
Unchanged:  0
Removed:    0
Failed:     0
```

Exit-kode 0 betyr OK, 1 fatal feil og 2 delvis feil. Med lokal PGlite kan CLI-en ikke kjøre mens dev-serveren holder databasen, fordi lockfila hindrer korrupsjon. Bruk da «Sync now» på `/dev`.

### Geografisk spørring

`events_within(lat, lng, radius_m, announced_since, sort)` bruker `ST_DWithin(geom::geography, punkt, radius)` mot hele planpolygonet. En sak tas med hvis noen del av polygonet ligger innenfor radius, og avstanden er til nærmeste kant (0 hvis punktet ligger inni). Centroid brukes bare til markør og popup. Resultatsiden viser saker varslet de siste 24 månedene. Dette er et visningsfilter, og eldre saker ligger fortsatt i databasen.

### Dokumenter og personvern

- Dokumentmetadata hentes kun med `?dokumenttype=` for allowlisten (`ref-data-as-pdf`, `PlanomraadePdf`, `ReferatOppstartsmoete`). `beroerteParter.json` blir derfor aldri forespurt.
- `isAllowedDocument()` avviser berørte parter og ukjente typer også hvis kilden skulle sende dem.
- Databasen har en CHECK-constraint som gjør det samme.
- Dokumentene lastes aldri ned. Vi lagrer tittel, type, dato og DiBK-URL, og brukeren åpner originalen hos kilden.

### Kildelenker

1. Feltet `link` brukes bare hvis det er en fullstendig http(s)-URL, og vises da som kommunens/forslagsstillers lenke.
2. Ellers lenker vi til DiBKs egen side for planen (verifisert 200).
3. Vi konstruerer aldri kommunale URL-er.

## Områdefakta («Hva bør du vite om området?»)

Objektive, dokumenterbare forhold rundt søkepunktet. Dette er **tilstander uten dato**, til forskjell fra plansaker (hendelser med dato), og ligger derfor i egen tabell `area_features` med egen spørring `features_near`.

| Kategori | Kilde | Lisens | Hvordan |
|---|---|---|---|
| Miljø | Forurenset grunn (Miljødirektoratet) | NLOD 2.0 | synk (15 936 lokaliteter) |
| Grunnforhold | Kartlagte kvikkleiresoner (NVE) | NLOD | synk (4 863 soner) |
| Grunnforhold | Aktsomhetsområde kvikkleireskred (NVE) | NLOD | direkte oppslag (148 235 polygoner) |
| Støy | Strategisk støykartlegging veg/bane (Miljødirektoratet) | NLOD | direkte oppslag (~300 MB polygoner) |
| Støy | Støyvarselkart veg T-1442 (Statens vegvesen) | NLOD | direkte oppslag |
| Støy | Flystøysoner T-1442 (Avinor) | Åpne data | direkte oppslag (kun GML) |
| Infrastruktur | Transformatorstasjoner og kraftledninger (NVE) | NLOD | synk (5 645 objekter) |
| Infrastruktur | Høyspent distribusjonsnett (NVE) | NLOD | direkte oppslag (141 401 linjer) |
| Industri og anlegg | Anlegg med utslippstillatelse (Miljødirektoratet) | NLOD | synk (866 aktive) |

```bash
npm run sync:area                                  # alle synkede kilder
npm run sync:area -- --provider=nve-kvikkleire-soner
```

**Spørring.** `features_near(lat, lng, radius_m, categories)` gir både `distance_m` og `contains` (ligger søkepunktet inne i objektet), samt kildens `external_id` og geometrien, slik at objektet kan tegnes i kartet. Geometrien forenkles til ~0,5 m, og objekter med over 5 000 punkter sendes uten geometri. Direkte oppslag kjøres parallelt med databasespørringen, med felles tidsbudsjett; kilder som ikke svarer, listes nøytralt i UI-et mens resten vises.

**Formuleringsregister.** All tekst kommer fra [`lib/facts/wording.ts`](lib/facts/wording.ts). UI-et setter aldri sammen egne setninger fra rådata, og ukjente typer vises ikke. Reglene:

- kildens egne klasser og ord («aktsomhet» er ikke «fare»)
- ingen score, ingen vurdering, ingen påstand om boligverdi
- kildens eget forbehold vises alltid
- år vises når kilden har det

**Forurenset grunn** vises som konkrete lokaliteter, ikke som et antall:

- Hvert kort navngir lokaliteten, sier om søkepunktet ligger **innenfor eller utenfor** den, og gjengir myndighetens vurdering i klartekst («ikke akseptabel tilstand, behov for tiltak») med kildens tallkode under «Detaljer».
- Kilden har **ingen stoffopplysninger** i åpne data, og for mange lokaliteter finnes de ikke i det hele tatt — heller ikke i Miljødirektoratets eget faktaark. Kortet sier derfor eksplisitt: «Kilden oppgir ikke hvilken type forurensning som er registrert.» Vi gjetter aldri stoff, årsak eller konsekvens for naboeiendommer.
- Standardvisningen er de nærmeste lokalitetene, pluss lokaliteter kilden mener trenger tiltak. Resten ligger bak «Se alle registreringer i området».
- Lokaliteter uten brukbar flate vises ikke: da kan vi ikke si hvor registreringen ligger.
- Flatene tegnes i kartet, med lenke til Miljødirektoratets faktaark per lokalitet.

**Kvikkleire** behandles i tre nivåer som aldri blandes:

| Nivå | Hva det betyr |
|---|---|
| Aktsomhetsområde | Kan være marin leire i skrånende terreng. Kvikkleire er ikke påvist. NVE krever geoteknisk vurdering ved tiltak. |
| Kartlagt sone | Vi viser om kvikkleire er **påvist** eller bare **mulig**, undersøkelsesnivå, utførte sikringstiltak og år. |
| Klassifisering | Faregrad × konsekvens → risikoklasse. Gjelder **sonen**, ikke eiendommen. |

Soner NVE har utredet til «ikke fare for områdeskred» vises aldri som fare, kun nøytralt når søkepunktet ligger inni.

**Personvern.** Vi lagrer kodede verdier fra kildene, og i tillegg lokalitetsnavnet i forurenset grunn — uten det kan brukeren ikke se hvilket sted en registrering gjelder, og navnet er publisert av forvaltningsmyndigheten sammen med flaten. Virksomhetsnavn og næringsgruppe lagres ikke, og NVEs bemerkningsfelt (kan inneholde gnr./bnr.) og oppdragsgiver lagres ikke. Sensitive institusjoner er ikke med i noen kilde vi bruker.

**Kraftsensitiv informasjon.** Vi viser bare det NVE selv publiserer. Jordkabler inngår ikke i datasettene, og vi kombinerer aldri kilder for å utlede kabeltraseer.

## Drift: sync og overvåking

Målet er at systemet skal oppdage at en kilde har sluttet å levere, også når den svarer
200 OK med for lite data.

### Sync-worker

`npm run sync:worker` gjør to ting, i rekkefølge:

1. tar forespørsler fra køen `sync_requests` («Kjør sync nå» i /admin)
2. kjører providere som er forfalt etter sin egen tidsplan (`sync_due()`)

Hver provider kjøres for seg. En kilde som feiler stopper aldri de andre: feilen havner på
providerens egen rad og i `sync_runs`, og workeren går videre. Exit-kode er **0** når alt gikk bra,
**2** når minst én kilde feilet eller så mistenkelig ut, og **1** ved fatal feil (ingen database).

Tidsplan per kilde ligger i `providers`-tabellen, ikke i koden:

| Kilde | Intervall | Full sync | Utdatert etter |
|---|---|---|---|
| DiBK planoppstart | 3 t (inkrementell) | hver 24 t | 24 t |
| Forurenset grunn, industri | 24 t (full) | hver 24 t | 72 t |
| Kvikkleiresoner, nettanlegg | 24 t (full) | hver 24 t | 168 t |

Kilder som spørres direkte per søk (støy, kvikkleire-aktsomhet, distribusjonsnett) har ingen
tidsplan og overvåkes ikke som sync.

### Scheduler (GitHub Actions)

`.github/workflows/sync.yml` kjører `npm run sync:worker` **hvert 15. minutt**, og deretter
`npm run alerts:check`. Det er den samme Node/TypeScript-koden som kjøres lokalt — ingen
parallell implementasjon i Edge/Deno. Workeren avgjør selv hva som er forfalt, så en kjøring
der ingenting skal gjøres koster to databasekall.

- Kjøringene er serialisert (`concurrency: naboradar-sync`), så to syncer aldri overlapper.
- Provider-feil (exit 2) feller ikke jobben — de håndteres av varslingen. Fatal feil (exit 1,
  for eksempel ingen database) feller jobben, og da sendes ingen heartbeat.
- Hemmelighetene ligger i **GitHub Actions Secrets**, ikke i Netlify. Webappen har fortsatt
  ingen skrivenøkkel.
- Steg som krever en hemmelighet vi ikke har satt opp, hopper over seg selv.

**Manuell kjøring:** GitHub → Actions → «Sync» → «Run workflow». Feltene er `provider`
(tom = alle forfalte), `mode` (`auto`/`full`/`incremental`) og `force` (godta unormalt datafall).
Tilsvarer `npm run sync:worker -- --provider=<id> --mode=full --force` lokalt.

**Merk:** GitHub deaktiverer planlagte workflows i repoer uten aktivitet på 60 dager. Dead man's
switchen under fanger det opp.

#### Secrets og variabler

| Navn | Type | Kreves | Hva |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | secret | ja | Prosjekt-URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | secret | ja | Publishable key |
| `SUPABASE_SECRET_KEY` | secret | ja | Skrivetilgang for sync. **Skal ikke ligge i Netlify.** |
| `HEALTHCHECK_URL` | secret | nei | Ping-URL fra Healthchecks.io |
| `RESEND_API_KEY` | secret | nei | Resend API-nøkkel |
| `ALERT_EMAIL_TO` | secret | nei | Mottaker(e), komma­separert |
| `ALERT_EMAIL_FROM` | variable | nei | Avsender, standard `NaboRadar <alerts@naboradar.no>` |
| `ALERT_ADMIN_URL` | variable | nei | Lenke i e-posten, standard `https://naboradar.no/admin` |

### Vakter mot unormale datadrop

`lib/sync/guards.ts` vurderer tallene fra hver kjøring mot forrige kjøring vi stolte på:

- antall poster faller mer enn **30 %** (ved referansetall ≥ 20)
- kilden svarer **uten data** når vi har historikk
- **25 %** eller mer av postene avvises i validering (advarsel fra 5 %)

Slår en av disse til, blir kjøringen markert `suspicious`: data skrives som normalt, men
**full reconciliation hoppes over** — ingenting markeres som fjernet fra kilden. En mistenkelig
kjøring oppdaterer verken `last_success_at` eller referansetallet, så kilden blir stale av seg selv
hvis problemet vedvarer. Er fallet reelt, brukes «Full sync og godta datafallet» i /admin (eller
`npm run sync:worker -- --provider=<id> --mode=full --force`).

### Stale-data

`lib/sync/health.ts` avgjør tilstanden per provider:

| Tilstand | Når | Alvorlighet |
|---|---|---|
| `ok` | fersk og feilfri | OK (advarsel fra 75 % av stale-vinduet) |
| `failing` | siste kjøring feilet, data fortsatt ferske | advarsel (kritisk fra 3 på rad) |
| `suspicious` | siste kjøring skrev data, men tallene så feil ut | kritisk |
| `stale` | ingen data vi stolte på innen kildens eget vindu | kritisk |
| `never_synced` | aktiv kilde som aldri har levert | kritisk |

### Varsling på e-post

`npm run alerts:check` kjøres etter hver sync. Den vurderer helsetilstanden, bestemmer hva som
skal sendes (`lib/alerts/state.ts`), bygger e-posten (`lib/alerts/email.ts`) og sender via Resend
(`lib/alerts/transport.ts`). Uten `RESEND_API_KEY`/`ALERT_EMAIL_TO` logges det som ville blitt
sendt, og jobben går OK.

Tilstandsmaskinen per provider:

```
ok ──(1. kritiske sjekk)──▶ pending ──(2. kritiske sjekk)──▶ alerted ──(frisk)──▶ ok
                               │                                │
                               └──(frisk, ingen e-post)─────────┘  påminnelse hver 12. time
```

- Varsler **kun** ved `critical`. Aldri ved `warning`.
- To påfølgende kritiske sjekker før første varsel, så en forbigående 503 ikke gir e-post.
- Høyst én påminnelse hver 12. time så lenge tilstanden varer.
- Recovery-e-post kun fra `alerted` — har vi aldri varslet, friskmelder vi ingenting.
- Alle providere samles i **én e-post per kjøring**.
- Innholdet er providernavn, tilstand, sist vellykkede sync, dataalder, antall objekter, feil på
  rad og en kort årsak (maks 200 tegn). Aldri nøkler, URL-er med token eller rådata.
- Feiler utsendingen, lagres tilstanden **uten** «varslet», slik at neste kjøring prøver igjen.

Tilstanden ligger i `providers.alert_state`, `alert_critical_streak` og `alert_notified_at`.

**Oppsett hos Resend** (gjøres én gang):

1. Opprett konto på resend.com og legg til domenet `naboradar.no`.
2. Legg inn DNS-postene Resend oppgir (SPF/DKIM, se rapport).
3. Lag en API-nøkkel med kun sending-rettighet, og legg den inn som `RESEND_API_KEY`.
4. Sett `ALERT_EMAIL_TO` til mottakeradressen.
5. Verifiser med `npm run alerts:check -- --dry-run` før første ekte utsending.

### Dead man's switch (Healthchecks.io)

Varslingen fanger ikke opp at hele workflowen slutter å kjøre. Derfor pinger workflowen
Healthchecks.io: `/start` når jobben begynner, ping ved suksess, og `/fail` ved fatal feil.
Uteblir pingen, varsler Healthchecks.

1. Opprett en sjekk på healthchecks.io: **Period 15 minutter, Grace 25 minutter**.
   Grace-perioden domineres av at GitHub forsinker planlagte kjøringer, ofte 5–15 minutter.
   15 + 25 gir varsel etter 40 minutter uten ping: én forsinket eller hoppet kjøring tolereres,
   mens en scheduler som faktisk har stoppet oppdages innen en drøy halvtime.
2. Legg ping-URL-en inn som GitHub-secret `HEALTHCHECK_URL` (uten `/start` eller `/fail` på slutten).
3. Sett opp e-postvarsling i Healthchecks, til samme adresse som `ALERT_EMAIL_TO`.

Ping-URL-en er en hemmelighet: den skal ikke i Netlify, ikke i klientkode og ikke i logger.
Skal løsningen byttes senere, er det tre `curl`-steg i workflowen.

### /admin

Innlogget driftsside i produksjon (`/admin`). Innlogging er Supabase Auth; tilgang krever at
e-posten står i tabellen `admin_users`. Siden viser status, dataalder, antall objekter, siste feil,
siste kjøringer og knappene «Kjør sync nå» og «Kjør full sync».

Knappene kjører ikke syncen i webrequesten: de legger en forespørsel i `sync_requests`, som
sync-worker plukker opp. Det er derfor **webappen ikke trenger `SUPABASE_SECRET_KEY`** —
databasefunksjonene sjekker selv at kalleren står i `admin_users`.

Ny admin-bruker:

1. Supabase-dashbordet → Authentication → Users → Add user (e-post + passord).
2. `insert into admin_users (email) values ('ny@adresse.no');`

### Feilsøke en provider

1. `npm run sync:status` — hvilken kilde er kritisk, og hvorfor.
2. `/admin` — siste kjøringer med hentet/avvist/poster, advarsler og siste feil.
3. `npm run sync:worker -- --provider=<id> --mode=full` — kjør kilden alene og se hele loggen.
4. Er kjøringen `suspicious`, er det datafall-vakten som har slått til. Stemmer fallet med kilden,
   brukes «Full sync og godta datafallet» i /admin eller `--force`.
5. GitHub → Actions → «Sync» viser loggen for hver planlagte kjøring.

`/dev` finnes fortsatt bare i development og er uendret.

## Lokal database (PGlite)

Uten Supabase kan `LOCAL_DATABASE=pglite` brukes i development:

- Det er Postgres + PostGIS kompilert til WASM, i `.data/pglite` (git-ignorert).
- Migrasjonene kjøres automatisk med de samme SQL-filene som i Supabase, pluss stubber for `auth`-skjemaet og rollene.
- Samme `Db.rpc()`-grensesnitt brukes mot begge, så koden er identisk.
- Testene bruker PGlite i minnet.

## Hva fungerer etter fase 4

- **Forside:** autocomplete mot Kartverket (adresser og stedsnavn).
- **`/omrade`:**
  - Ekte planoppstarter innen radius, med polygoner i kartet og feed.
  - Sortering: nærmest eller nyeste.
  - Valg synkronisert mellom kart og feed, med popup.
  - Lastetilstand ved bytte av radius, sortering og sted. Kartet beholdes.
  - Tom-tilstand med «Prøv 3 km», og feiltilstand når databasen mangler.
- **«Hva bør du vite om området?»** på `/omrade`: registrerte forhold gruppert i Miljø, Grunnforhold, Støy, Infrastruktur og Industri og anlegg, med avstand eller «Ved søkepunktet», kilde, år og forbehold.
- **`/sak/[id]`:** planområde i kart, avstand fra søkt sted (fra URL-kontekst), fakta fra kilden, beregnet areal, tillatte dokumenter og kildelenke.
- **Sync:** CLI og `/dev`-knapp, full og incremental, med reconciliation.

## Hva fungerte etter fase 3

- Forside med stort søkefelt og autocomplete mot Kartverket. Den kan brukes med tastatur og mus, og har loading-, tom- og feiltilstand.
- `/omrade` med valgt sted, radiusvalg (500 m / 1 km / 3 km) og Kartverket-kart med geografisk korrekt radius.
  - På desktop ligger innholdet til venstre og kartet til høyre (sticky).
  - På mobil kommer overskrift, radius, kart og saker under hverandre.
- «Endre sted» på resultatsiden, der radius følger med.
- Loading-skjelett, feilside, 404 og `/dev`-diagnostikk.
- Supabase-klienter for server og klient. De er valgfrie, og appen starter uten dem.

## Ikke implementert ennå

AI-oppsummering, varsling og utsending, innlogging, cron-oppsett i drift. Neste datalag (etter godkjenning): flomsoner, skredaktsomhet, radon, ÅDT, skoler og barnehager. Se [docs/area-facts-discovery.md](docs/area-facts-discovery.md).

## Kjente begrensninger

- **Kilden mangler felt:** DiBK har ikke formål, status eller sluttdato. Vi viser derfor bare «Planoppstart varslet …» og antyder aldri at arbeidet pågår.
- **Kommunenavn:** DiBK leverer bare kommunenummer, så detaljsiden viser nummeret.
- **Incremental sync:** fanger ikke planer med `oppdateringsdato = null` (~680 features), eller dokumenter som endres uten at planen gjør det. Nattlig full sync dekker dette.
- **Områdefakta vises ikke i kartet ennå**, bare som tekst med avstand.
- **Kvikkleiregeometri er generalisert til ~1 m** ved henting, fordi NVEs største sone har 125 000 hjørner.
- **Lokal PGlite:** én prosess om gangen. CLI og dev-server kan ikke bruke samme lokale database samtidig.

- Adresser med samme navn i flere kommuner (f.eks. «Karl Johans gate 1») kommer i Kartverkets rekkefølge. Undertittelen (postnummer og kommune) skiller dem.
- Geokodingscachen er per serverinstans.
- Kartverket bytter bakgrunnskart i 2026. Tile-URL-en er konfigurerbar av den grunn.
- TypeScript er låst til 6.0.x. TypeScript 7 mangler det klassiske compiler-API-et som `typescript-eslint` og Next.js-typesjekken bruker.
