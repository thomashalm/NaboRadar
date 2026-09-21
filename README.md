# NaboRadar

Hva skjer rundt deg? NaboRadar viser offentlige plan- og byggehendelser rundt en adresse, forklart på forståelig norsk.

**Status:** fase 3 (fundament) er ferdig: søk, resultatside og kart fungerer. Plandata fra DiBK kobles på i fase 4.

- [docs/data-sources.md](docs/data-sources.md) — testede datakilder, tilgang og lisens
- [docs/architecture.md](docs/architecture.md) — datamodell, providers, geo-strategi, sync, personvern
- [docs/adr/](docs/adr/) — arkitekturbeslutninger

## Kom i gang

Krever Node.js 20.9 eller nyere (utviklet på Node 24).

```bash
npm install
npm run dev
```

Åpne http://localhost:3000. Appen virker uten miljøvariabler: søk og kart bruker åpne Kartverket-tjenester, og Supabase er ikke nødvendig ennå.

| Kommando | Hva |
|---|---|
| `npm run dev` | Utviklingsserver |
| `npm run build && npm start` | Produksjonsbygg |
| `npm test` | Enhetstester (ingen nettverk) |
| `npm run test:network` | Integrasjonstester mot ekte Kartverket-API |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

`/dev` viser diagnostikk (status for Kartverket, kartkonfig, om Supabase er konfigurert, provider-status). Siden finnes bare i development.

## Miljøvariabler

Kopier `.env.example` til `.env.local`. Alle variabler er valgfrie i fase 3.

| Variabel | Hvor | Formål |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | klient + server | Supabase-prosjektets URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | klient + server | Publishable key (`sb_publishable_…`) eller legacy anon key. RLS beskytter data. |
| `SUPABASE_SECRET_KEY` | **kun server** | Secret key (`sb_secret_…`) eller legacy service_role. Brukes av sync fra fase 4. |
| `NEXT_PUBLIC_MAP_TILE_URL` | klient | XYZ-mal for bakgrunnskart. Standard er Kartverket topograatone. |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | klient | Attribusjon for kartet. Standard er `© Kartverket`. |
| `RUN_NETWORK_TESTS` | tester | `1` aktiverer integrasjonstester mot Kartverket |

Ekte nøkler skal aldri committes. `.env*.local` er git-ignorert.

## Hosted Supabase

1. Opprett et prosjekt på supabase.com (region: Stockholm `eu-north-1` eller Frankfurt).
2. **Database → Extensions:** aktiver `postgis` (migrasjonen gjør det også).
3. Kjør migrasjonen [`supabase/migrations/20260921000000_init.sql`](supabase/migrations/20260921000000_init.sql). Enten lim den inn i SQL Editor, eller bruk `npx supabase link --project-ref <ref>` og så `npx supabase db push`.
4. **Settings → API:** legg URL, publishable key og secret key i `.env.local`.
5. Sjekk `/dev`: begge Supabase-linjene skal vise «Konfigurert».

Migrasjonsfilene er source of truth for schemaet. Endringer gjøres i nye migrasjoner, ikke i dashboardet.

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

## Hva fungerer etter fase 3

- Forside med stort søkefelt og autocomplete mot Kartverket. Den kan brukes med tastatur og mus, og har loading-, tom- og feiltilstand.
- `/omrade` med valgt sted, radiusvalg (500 m / 1 km / 3 km) og Kartverket-kart med geografisk korrekt radius.
  - På desktop ligger innholdet til venstre og kartet til høyre (sticky).
  - På mobil kommer overskrift, radius, kart og saker under hverandre.
- «Endre sted» på resultatsiden, der radius følger med.
- Loading-skjelett, feilside, 404 og `/dev`-diagnostikk.
- Supabase-klienter for server og klient. De er valgfrie, og appen starter uten dem.

## Neste: fase 4

- `DibkPlanningStartedProvider`: henting, normalisering og deduplisering av ekte plandata.
- Sync-jobb til Supabase, og `events_within()` koblet til resultatsiden.
- Event-feed i «Saker i området» og polygoner på kartet.

## Kjente begrensninger

- Adresser med samme navn i flere kommuner (f.eks. «Karl Johans gate 1») kommer i Kartverkets rekkefølge. Undertittelen (postnummer og kommune) skiller dem.
- Geokodingscachen er per serverinstans.
- Kartverket bytter bakgrunnskart i 2026. Tile-URL-en er konfigurerbar av den grunn.
- TypeScript er låst til 6.0.x. TypeScript 7 mangler det klassiske compiler-API-et som `typescript-eslint` og Next.js-typesjekken bruker.
