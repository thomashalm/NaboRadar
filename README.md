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

AI-oppsummering, varsling og utsending, innlogging, cron-oppsett i drift, og flere datakilder.

## Kjente begrensninger

- **Kilden mangler felt:** DiBK har ikke formål, status eller sluttdato. Vi viser derfor bare «Planoppstart varslet …» og antyder aldri at arbeidet pågår.
- **Kommunenavn:** DiBK leverer bare kommunenummer, så detaljsiden viser nummeret.
- **Incremental sync:** fanger ikke planer med `oppdateringsdato = null` (~680 features), eller dokumenter som endres uten at planen gjør det. Nattlig full sync dekker dette.
- **Lokal PGlite:** én prosess om gangen. CLI og dev-server kan ikke bruke samme lokale database samtidig.

- Adresser med samme navn i flere kommuner (f.eks. «Karl Johans gate 1») kommer i Kartverkets rekkefølge. Undertittelen (postnummer og kommune) skiller dem.
- Geokodingscachen er per serverinstans.
- Kartverket bytter bakgrunnskart i 2026. Tile-URL-en er konfigurerbar av den grunn.
- TypeScript er låst til 6.0.x. TypeScript 7 mangler det klassiske compiler-API-et som `typescript-eslint` og Next.js-typesjekken bruker.
