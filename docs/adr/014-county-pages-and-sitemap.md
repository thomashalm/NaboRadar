# ADR 014: Fylkessider som eneste landingsnivå for hytter, og sitemap uten kunstige signaler

**Status:** Aktiv · 2026-10-03. Utvider [ADR 012](012-hut-seo-and-crawlers.md).

## Bakgrunn
AI-søk-gjennomgangen ([research/ai-sok-aeo-audit.md](../research/ai-sok-aeo-audit.md)) fant tre svakheter:

- `/hytter` hadde ingen hytter eller hyttelenker i HTML-en. Kart og liste lastes i nettleseren, så de
  1 504 hyttesidene ble bare nådd via sitemapen og «Andre hytter i nærheten».
- Ingen side svarte på «hvilke hytter finnes i Trøndelag?».
- Sitemapen satte `lastmod` til «nå» på faste sider, med `priority` og `changefreq` uten grunnlag.

Datagrunnlaget, med offentlige hytter uten `not_public`:

- 15 fylker, alle med mellom 9 (Oslo) og 348 (Innlandet) hytter.
- 277 kommuner, der 115 har bare 1–2 hytter og 23 har 15 eller flere.
- 29 hytter uten kommune i kilden.

## Alternativer vurdert
- **Kommunesider** — ikke nå. De fleste ville blitt tynne (1–2 hytter), og mange nesten like sider
  er det vi vil unngå.
- **Typesider for hele landet** («ubetjente hytter», «åpne koier») — avvist. De er bare et filter
  over samme liste, opptil 773 hytter uten struktur.
- **«Hytter nær <sted>»** — avvist. I praksis uendelig mange og nesten like sider. Stedssøket på
  `/hytter` dekker behovet.
- **Liste alle 1 500 hyttene på `/hytter`** — avvist. Det gir en tung side som konkurrerer med
  kartet.
- **Kart på fylkessidene** — droppet. Det gir kompleksitet og vekt uten å gi noe lista ikke gir.
  Kartet finnes på `/hytter`.
- **Egen RPC som kjenner fylkene** — unødvendig. Databasen har kommunenummeret; fylket kommer fra
  kommuneregisteret i appen.

## Beslutning
- **`/hytter/fylke/<slug>`** for hvert fylke med offentlige hytter, 15 i dag. Siden er tekst uten kart:
  - brødsmulesti tilbake til `/hytter`, H1 «Hytter og koier i Innlandet», og en kort faktaingress
    (antall, antall kommuner, kilde),
  - antall per type,
  - kommunene som hopplenker, så én H2 per kommune med hyttene alfabetisk og en lenke til hver
    hytteside.

  Hytter uten kommune, og hytter som ikke er for allmennheten, står ikke der.
- **`/hytter`** har en server-rendret seksjon under kartet, «Hytter og koier etter fylke», med
  antall og lenke per fylke, og en linje om hyttene uten kommune. Lenkeveien er `/hytter` → fylke →
  hytte, uten JavaScript.
- **Data:** to lette offentlige RPC-er (`20261030000000_hut_index.sql`).
  - `hut_index(p_municipalities)` gir id, navn, type og kommune. Fylkessiden kaller den én gang med
    fylkets kommunenummer.
  - `hut_municipality_counts()` gir antall per kommune til oversikten.

  Begge har samme synlighet som de andre hyttefunksjonene, og utelater `not_public`. Sitemapen
  bruker `hut_index` i stedet for `huts_in_bbox`.
- **Cache:**
  - Fylkessidene er ISR i en time, som hyttesidene.
  - Antallet på `/hytter` caches i en time med `unstable_cache` og taggen `hytter-oversikt`, fordi
    `/hytter` selv er dynamisk.
  - `/admin/hytter` tømmer hyttesidene, fylkessidene og taggen.
- **Strukturerte data:**
  - Hyttesidens `Place` har fått `url`, `@id` (kanonisk URL + `#sted`) og fylket som område over
    kommunen.
  - Hyttesiden har `BreadcrumbList` (Hytter og koier → fylke → hytte) når fylket er kjent.
  - Fylkessiden har `BreadcrumbList` (Hytter og koier → fylke).
  - Fortsatt ikke `LodgingBusiness`, `Offer`, `priceRange`, `aggregateRating` eller `FAQPage`.
- **SEO:** egen tittel, beskrivelse og canonical per fylke, `index, follow`, og plass i sitemapen.
- **Sitemap:** ingen `lastmod`, `priority` eller `changefreq` på noen side. Vi har ingen meningsfull
  endringsdato, og tidspunktet sitemapen genereres, er ikke en.

## Begrunnelse
Fylket er det eneste nivået der hver side har nok innhold til å stå alene, URL-en er stabil, og
sidene er tydelig forskjellige. Det gir en ekte lenkestruktur ned til hver hytte uten å
masseprodusere sider.

## Konsekvenser
- Hyttesidene har nå tre veier inn: sitemap, fylkesside og nabohytter.
- Fylkessidens innhold er bare navn, type og kommune. Den kan ikke bli bedre enn dataene.
- 29 hytter uten kommune står bare i kartet, i sitemapen og som naboer. `/hytter` sier det.

## Kjente ulemper
- Innlandet gir en side på ca. 320 KB ukomprimert (33 KB med gzip), mest Next sin
  serialisering av samme innhold.
- Endringer fra synken synes på fylkessidene først etter inntil en time.
- Fylket kommer fra kommuneregisteret; ved en kommunereform må øyeblikksbildet oppdateres
  ([ADR 005](005-cached-public-hut-pages.md)).

## Revurderes når
- Search Console eller Bing viser at fylkessidene behandles som tynt innhold, eller at de gir
  trafikk som rettferdiggjør kommunenivå for de største kommunene.
- Hyttedatasettet får beskrivende felt (sesong, sengeplasser) som gjør flere landingsnivåer
  meningsfulle.

## Relatert
[ADR 012](012-hut-seo-and-crawlers.md) · [ADR 005](005-cached-public-hut-pages.md) ·
[research/ai-sok-aeo-audit.md](../research/ai-sok-aeo-audit.md) ·
[håndbok §34](../naboradar-handbook.md#34-synlighet-og-indeksering)
