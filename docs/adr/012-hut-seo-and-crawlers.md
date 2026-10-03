# ADR 012: Hytter i søk og AI-søk — én indekserbar side per hytte, ett kanonisk kart, faktatekst og åpen robots

**Status:** Aktiv · 2026-10-03

> **Utvidet 2026-10-03 av [ADR 014](014-county-pages-and-sitemap.md):** fylkessider er bygget, `/hytter` har
> server-rendrede fylkeslenker, hyttesidene har `url`, `@id`, fylke og `BreadcrumbList`, og sitemapen har ikke lenger
> `lastmod`, `priority` eller `changefreq`. Teksten under beskriver beslutningen slik den ble tatt.

## Bakgrunn
Etter lanseringen 2026-10-02 ([ADR 009](009-public-admin-security-model.md)) skulle hyttene kunne
finnes i Google og i AI-søk som ChatGPT search, uten tynne SEO-sider.

- `/hytter` er et kart der tilstanden (valgt hytte, utsnitt, startpunkt) står i URL-en.
- Hver hytte har en fast side, `/hytter/<navn>-<8 tegn av uuid>`.
- Gjennomgangen av AI-søk ([research/ai-sok-aeo-audit.md](../research/ai-sok-aeo-audit.md)) viste:
  - at hyttesidene har alt innhold i HTML-en,
  - at `/hytter` ikke har noen hytter i HTML-en,
  - at sidene ikke var cachet.

## Alternativer vurdert
- **`noindex` på `/hytter` og hyttesidene til datasettet var «ferdig»** — forlatt ved lansering.
- **Egen indekserbar URL per kartvisning (`?hytte=`)** — avvist. Det gir tusenvis av nesten like
  sider. Den valgte hytta skrives med `history.replaceState`, og canonical er `/hytter`.
- **Landingssider per kommune, type eller «nær sted»** — ikke nå. 115 av 277 kommuner har bare 1–2
  hytter, og typefiltre over hele landet er bare filtre. Fylkessider (15) er den eneste varianten
  med nok innhold, og er ikke bygget ennå.
- **Generert tekst for lengde, eller schema for overnatting** (`LodgingBusiness`, `Offer`,
  `AggregateRating`, `FAQPage`) — avvist. Vi har ikke data til det, og det ville antydet booking.
- **Blokkere eller eksplisitt tillate GPTBot** — utsatt. Se under.

## Beslutning
- **Indeksering:**
  - `/hytter` og `/hytter/[ref]` indekseres.
  - Hytter med `not_public` er `noindex, follow` og står ikke i sitemapen.
  - Avviste og skjulte hytter gir 404.
- **Canonical:**
  - Hyttesiden har canonical til adressen med gjeldende navn, så gamle lenker med gammelt navn ikke
    blir egne sider.
  - Alle parametervarianter av `/hytter` har canonical `/hytter`, og de står ikke i sitemapen.
- **Sitemap:** `/hytter` og alle hytter en anonym besøkende kan se (`listPublicHuts`). Ingen
  `lastmod`, fordi Kartverkets dato ikke sier når vi sist endret forvalter eller lenke.
- **Tittel og beskrivelse:** tittelen er «Aursjobu – hytte i Skjåk». Beskrivelsen bygges av type,
  sted, forvalter og tilgang (`hutPageTitle`, `hutMetaDescription` i `lib/huts/wording.ts`).
- **Strukturerte data:** `Place` med navn, koordinater og kommune. Ikke mer enn siden viser.
- **«Kort om hytta»** (`hutIntroText`): én til fire setninger rett under tittelen, server-rendret
  fra strukturerte felt.
  - Fire setninger er et tak, ikke et mål. Ingen fri generering, ingen generell avslutning, og
    ingen omskriving av merknader.
  - Høyden står bare fra 100 moh.
  - «Bestilling skjer via/hos X» står bare med en dokumentert bestillingslenke, og ikke når hytta
    er stengt eller ikke for allmennheten.
- **Robots:** én regel for alle, med `Allow: /` utenom `/admin`, `/dev` og `/api/`.
  - OAI-SearchBot (ChatGPT-søk) har full tilgang. Det er en aktiv beslutning: tjenesten skal kunne
    finnes.
  - GPTBot (modelltrening) er i praksis også tillatt, fordi ingen regel nevner den. **Det er ikke
    en beslutning.** Om innholdet skal kunne brukes til modelltrening, avgjøres separat.
- Hyttesidene caches og er like for alle ([ADR 005](005-cached-public-hut-pages.md)).

## Begrunnelse
Det som gjør en side lett å sitere, er det samme som gjør den lett å lese: fakta i HTML-en, kilden
ved siden av påstanden, stabile URL-er. Én side per fysisk hytte gir det. Nesten like sider per
filter gjør ikke.

## Konsekvenser
- Hyttesidene nås av roboter via sitemapen og nabolenkene. `/hytter` har ingen hyttelenker i
  HTML-en ennå.
- Tekst og metadata kommer fra samme felt som Fakta. En rettelse i admin endrer alt samtidig.

## Kjente ulemper
- `/hytter` er tynn uten JavaScript.
- Ingen `BreadcrumbList` og ingen fylkesnivå i `Place` ennå.
- `lastmod` på de faste sidene i sitemapen er alltid «nå».

## Revurderes når
- Fylkessider bygges (da kommer brødsmulesti og hyttelenker fra `/hytter`).
- Det tas en beslutning om GPTBot.
- Search Console eller Bing viser at hyttesidene behandles som tynt innhold.

## Relatert
[research/ai-sok-aeo-audit.md](../research/ai-sok-aeo-audit.md) ·
[håndbok §34 Synlighet og indeksering](../naboradar-handbook.md#34-synlighet-og-indeksering) ·
[ADR 005](005-cached-public-hut-pages.md) · [ADR 011](011-hut-access-semantics.md)
