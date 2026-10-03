# AI-søk / AEO: gjennomgang og oppfølging

> **Status 2026-10-03:** forbedring 1 (faste og raske hyttesider) er gjort, se
> [ADR 005](../adr/005-cached-public-hut-pages.md). Forbedring 2–4 og `lastmod`-delen av 5 er gjort i runde 2, se
> [ADR 014](../adr/014-county-pages-and-sitemap.md). Bing Webmaster Tools er ikke satt opp (gjøres utenfor koden). Beslutningene om
> indeksering, canonical og robots (OAI-SearchBot tillatt, GPTBot ikke avgjort) står i
> [ADR 012](../adr/012-hut-seo-and-crawlers.md).

Målet er at NaboRadar skal være lett å finne, forstå og sitere i AI-søk (ChatGPT search og lignende) uten tynne SEO-sider.
Gjennomgangen ble gjort 2026-10-03 mot produksjon, med OpenAI- og Google-robotenes user-agent, rå HTML uten JavaScript og
tellinger i databasen.

## Funn (2026-10-03)

**Robots.** Én regel for alle roboter: alt tillatt unntatt `/admin`, `/dev` og `/api/`.

- OAI-SearchBot (ChatGPT-søk) og ChatGPT-User er tillatt.
- GPTBot (modelltrening) er også tillatt via samme regel. Det er ikke endret, og skal avgjøres separat.
- En egen regel for OAI-SearchBot endrer ingenting i praksis. Hvis den legges til, må utelukkelsene gjentas i den.

**Tilgang.** Ingen svarte 403 eller 429, og ingen JS-utfordring:

- `/`, `/hytter`, `/personvern`, `/skolekrets`, `robots.txt`, `sitemap.xml` og hyttesider ga 200 for OAI-SearchBot, GPTBot,
  ChatGPT-User og Googlebot.
- 40 hyttesider hentet rett etter hverandre ga 40 × 200.
- Grensen på antall kall gjelder bare `/api/*` og `/omrade`.

**Server-rendret innhold.** Hyttesidene har alt i HTML-en: H1, type, kommune og fylke, «Kort om hytta», Fakta som
definisjonsliste, «Viktig å vite», offisielle lenker, kilde med dato og fem nabohytter med lenker. Unntak:

- `/hytter` har ingen hytter eller lenker i HTML-en. Lista lastes i nettleseren, så de 1 504 hyttesidene nås bare via
  sitemapen og nabolenkene.
- Hyttesidene var `no-store` og tok 0,5–3,9 s.
- Høyden ble hentet live og manglet av og til.

**Strukturerte data.** `Place` med navn, koordinater og kommune er riktig og nøkternt. Mulige forbedringer er `url`/`@id`,
fylke som område over kommunen, og `BreadcrumbList` når fylkessider finnes. Ikke `LodgingBusiness`, `Offer`, `Rating` eller
`FAQPage`.

**Oversiktssider.** 1 504 offentlige hytter i 15 fylker; hvert fylke har mellom 9 (Oslo) og 348 (Innlandet). 115 av 277 kommuner
har bare 1–2 hytter. Fylkessider gir en reell lenkestruktur. Sider per kommune, per type for hele landet og «nær sted» blir tynne.

**Forbedringer, i prioritert rekkefølge:**

1. Faste og raske hyttesider.
2. Fylkessider for hytter.
3. Server-rendret fylkesoversikt på `/hytter`.
4. Små rettelser i JSON-LD.
5. Riktig `lastmod` i sitemapen, og sitemapen sendt til Bing Webmaster Tools.

## Runde 1: faste og raske hyttesider (2026-10-03)

Beslutningen står i [ADR 005](../adr/005-cached-public-hut-pages.md). Kort fortalt:

- Hyttesiden leser anonymt og caches som ISR i en time.
- `/admin/hytter` tømmer cachen ved hver endring.
- Høyden lagres per hytte etter synken (`terrain_elevation_m`) i stedet for å hentes live.
- Kommuneregisteret har et øyeblikksbilde som reserve.

### Høyde: backfill og kontroll

- **Backfill.** Alle 1 653 ikke-arkiverte hytter. 1 645 fikk terrengmodellen (`dtm1`), 6 innsjøhøyde og 1 høydekurver. 1 hytte er
  uten høyde (Kutjaure Fjällstuga, utenfor dekning i Sverige).
- **Funn underveis.** I kall på 50 punkter spredt over landet svarte høydemodellen med høydekurver i stedet for `dtm1` for 949
  av hyttene, med avvik på opptil 23 m (Fløterhytta: 129 mot 106). Med 1–20 punkter per kall gir den `dtm1`. Vi slår nå opp ti
  om gangen, og et punkt som likevel får kurver, slås opp alene. De 973 hyttene uten `dtm1` ble beregnet på nytt.
- **Kontroll mot enkeltpunkt-API-et**, altså samme kall som hyttesiden brukte før, og samme avrunding: 52 hytter, 0 avvik.
  Utvalget var de 10 laveste (0–1 moh., kyst), de 10 høyeste (opptil 2 227 moh., Surtningssue), 12 nord for 68,5° N, kyst- og
  fjellhytter og 8 som først fikk høydekurver.
- **Kontroll mot høydene fra forrige runde** (enkeltpunkt, 1 510 hytter): 1 509 like. Avviket er Grovaskarsbu, 1106 mot 1100.
  Høydemodellen gir 1100 i dag (`dtm1`).

### Ytelse

**Før**, i produksjon med `Cache-Control: private, no-store`. Netlify cachet ingenting (Durable `bypass`, Edge `miss`):

| Hytte | 1. kall | 2.–4. kall |
|---|---|---|
| Aursjobu | 1,89 s | 0,78–1,16 s |
| Spiterstulen | 1,33 s | 0,72–1,18 s |
| Fulehuk | 0,90 s | 0,75–0,82 s |
| Glitterheim | 1,10 s | 0,53–0,77 s |
| Vardfjellkåta | 0,92 s | 0,74–0,96 s |
| Hindsæter | 0,65 s | 0,51–0,74 s |
| Skjult hytte (Grønlia, avvist) | 404, 0,62 s | 404, 0,40–0,62 s |

Åtte tilfeldige hytter, første kall: 0,87–1,85 s. I gjennomgangen tidligere samme dag: 0,8–3,9 s.

**Etter, lokalt** (`next start` mot produksjonsdata): første visning 0,18–0,82 s (`x-nextjs-cache: MISS`), deretter 2 ms (`HIT`).

**Etter, i produksjon** (commit `41eb3e3`). Hyttesidene caches nå hos Netlify (`Netlify Durable; hit; ttl≈3600`, Edge
`stored`/`hit`); nettleseren får `public, max-age=0, must-revalidate`.

| Hytte | 1. kall etter deploy (lages) | Cachet (6 kall) |
|---|---|---|
| Aursjobu | 1,01 s | 0,22–0,53 s |
| Spiterstulen | 0,88 s | 0,09–0,57 s |
| Fulehuk | 0,97 s | 0,09–0,45 s |
| Glitterheim | 0,45 s | 0,09–0,49 s |
| Vardfjellkåta | 0,61 s | 0,22–0,53 s |
| Hindsæter | 0,85 s | 0,09–0,46 s |
| Skjult hytte (Grønlia, avvist) | 404, 0,63 s | 404, 0,22–0,63 s (404 caches også) |

Treffene fra Edge svarer på 0,09 s. Svarene fra Durable (0,2–0,5 s) er nettverket mellom målepunktet og Netlifys lager, ikke
visningen. De åtte tilfeldige hyttene, første kall: 0,62–1,29 s (før: 0,87–1,85 s); den visningen caches så i en time. Høyden
var med i alle 22 målte sider. En forespørsel med innloggingscookie fikk samme cachede side.

### Sikkerhet

Kontrollert i produksjon:

- **Anonymt og innlogget uten admin:** ingen tilgang til `huts`, `hut_sources` eller `huts_public`, og heller ikke til
  `huts_needing_elevation` eller `set_hut_elevations`.
- **`get_hut`:** returnerer bare offentlige felt pluss høyden. Ingen `contact_note`, `override_source_url` eller kontrollfelt.
- **Skjulte hytter:** avviste og ubekreftede gir tomt svar.
- **Admin:** kan fortsatt liste, se kontrollkøen og overstyre.
- **`db:verify`:** ingen avvik.

### Begrensninger

- Endringer fra synken synes på hyttesidene innen en time. Det er ingen direkte tømming fra GitHub Actions.
- Ved en kommunereform må `lib/geo/kommuner-snapshot.json` hentes på nytt.
- Stale-while-revalidate: den første besøkende etter en time får forrige versjon, mens ny lages i bakgrunnen.

## Runde 2: fylkessider, fylkeslenker på /hytter, strukturerte data og sitemap (2026-10-03)

Beslutningen står i [ADR 014](../adr/014-county-pages-and-sitemap.md).

### Hvorfor fylker, og ikke kommuner, typer eller «nær sted»
Tallene fra gjennomgangen over:

- **Fylker:** alle 15 har mellom 9 og 348 hytter, så hver fylkesside har nok innhold til å stå
  alene.
- **Kommuner:** 115 av 277 har 1–2 hytter, og bare 23 har 15 eller flere. Kommunesider ville
  stort sett blitt tynne.
- **Typer for hele landet:** bare et filter over samme liste.
- **«Nær sted»:** ubegrenset antall nesten like sider.

Disse negative funnene står fortsatt. De er grunnen til at bare fylkesnivået er bygget.

### Det som ble bygget
- `/hytter/fylke/<slug>` for 15 fylker: H1, faktaingress, antall per type, kommunene som
  hopplenker, én H2 per kommune med hyttene alfabetisk og lenke til hver hytteside. Ingen kart.
- En server-rendret seksjon på `/hytter`: «Hytter og koier etter fylke», med antall og lenke, og en
  linje om 29 hytter uten kommune.
- Hyttesiden har fått fylket i den synlige brødsmulestien, og i `Place` `url`, `@id` og fylket
  over kommunen. Den har også `BreadcrumbList`. Fylkessiden har `BreadcrumbList`.
- Sitemapen har fylkessidene, og ikke lenger `lastmod`, `priority` eller `changefreq` på noen side.
- To lette RPC-er: `hut_index` (én spørring per fylkesside) og `hut_municipality_counts` (én
  spørring i timen for oversikten). Ingen N+1.

### QA (lokalt bygg mot produksjonsdata)
- Alle 15 fylkessider ga 200 med H1, tittel «Hytter og koier i <fylke> · NaboRadar», canonical til
  egen side og `index, follow`. Brødsmulestien pekte på `/hytter` og fylkets kanoniske adresse.
- Hytter og kommuner per fylke var identiske med databasen (`huts_public` uten `not_public`,
  gruppert med kommuneregisteret). Antallet på fylkessiden, i lenketeksten på `/hytter` og i
  databasen stemte for alle 15.
- 1 475 lenkede hytter, 0 dubletter, 0 skjulte, avviste eller `not_public`. 1 475 + 29 uten
  kommune = 1 504 offentlige.
- Alle 1 475 hyttelenker ga 200.
- Hyttesidene for Aursjobu, Kobberhaughytta, Knaben leirskole og Hindsæter:
  - `@id`, `url` og canonical er like.
  - Fylket ligger over kommunen. For Oslo står ett område, fordi kommune og fylke er det samme.
  - Brødsmulestien har riktige kanoniske adresser.
  - Hindsæter (uten kommune) har ingen brødsmulesti.
- Sitemapen har 1 524 URL-er: 5 faste sider, 15 fylker og 1 504 hytter. Ingen `lastmod`,
  `priority` eller `changefreq`.
- Mobil (375 px): ingen sideveis scroll på `/hytter`, fylkessidene eller hyttesiden.
- Ukjent fylke (`/hytter/fylke/finnes-ikke`) og `/hytter/fylke` gir 404.

| Fylkesside | Første visning | Cachet | HTML | gzip |
|---|---|---|---|---|
| Innlandet (348) | 0,15 s | 3,6 ms | 327 KB | 33 KB |
| Trøndelag (210) | 0,13 s | 2,6 ms | 206 KB | 22 KB |
| Vestland (179) | 0,13 s | 2,4 ms | 198 KB | 21 KB |
| Troms (79) | 0,13 s | 2,0 ms | 92 KB | 12 KB |
| Oslo (9) | 0,11 s | 1,5 ms | 24 KB | 5 KB |
| Finnmark (42) | 0,10 s | 1,9 ms | 58 KB | 8 KB |

Én databasespørring per fylkesside. Kommuneregisteret ligger i Nexts datacache (et døgn) med
øyeblikksbilde som reserve.

### Produksjon etter deploy (commit `1364c8a`)
- Samme QA mot naboradar.no: 15 fylker, 1 475 lenkede hytter, 0 dubletter, 0 skjulte. Antall og
  kommuner var identiske med databasen. Alle 1 475 hyttelenker ga 200.
- **Crawlere:** `/hytter`, seks fylkessider, en hytteside, `sitemap.xml` og `robots.txt` ga 200 for
  Googlebot, OAI-SearchBot og ChatGPT-User. Ingen 403, 429 eller JS-utfordring.
- **Rå HTML:** `/hytter` har 15 fylkeslenker. Fylkessidene har alle sine hyttelenker (Innlandet
  348, Trøndelag 210, Vestland 179, Troms 79, Oslo 9, Finnmark 42). Hyttesiden lenker til fylket.
- **Cache:** første visning etter deploy tok 0,15–1,40 s. Cachet svarte på 0,22–0,45 s
  (`Netlify Durable; hit; ttl≈3600`).
- **Store bokstaver:** `/hytter/fylke/Trondelag` og `/INNLANDET` gir 404 i produksjon. Avviket
  lokalt skyldtes macOS-filsystemet.
- **Sitemap:** 1 524 URL-er, 15 fylker, ingen `lastmod`, `priority` eller `changefreq`.

### Begrensninger
- 29 hytter uten kommune står ikke på noen fylkesside. De gjettes ikke inn i et fylke.
- HTML-en er stor for de største fylkene, fordi Next serialiserer innholdet to ganger. Komprimert
  er den liten.
- Lokalt på macOS kan en URL med store bokstaver (`/hytter/fylke/Trondelag`) treffe den cachede
  siden for `trondelag` én gang, fordi filsystemet ikke skiller på store og små bokstaver.
  Canonical peker uansett på den riktige adressen.
