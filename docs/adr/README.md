# Beslutningslogg (ADR)

Én fil per viktig arkitektur-, produkt-, data-, sikkerhets- eller SEO/AEO-beslutning: hva vi
valgte, hva vi valgte bort, og hva som skal til for å vurdere det på nytt. Hvordan løsningen
fungerer i dag, står i [håndboka](../naboradar-handbook.md). Hva vi fant underveis, står i
[research](../research/README.md).

ADR-er skrives ikke for spacing, tekststørrelse, små copy-endringer eller vanlige bugfikser.

## Regler

- En ADR endres ikke i ettertid for å passe dagens løsning. Blir den erstattet, settes status til
  **Erstattet av ADR NNN**, og den nye ADR-en forklarer hvorfor.
- Små presiseringer (lenker, en ny konsekvens vi har oppdaget) kan legges til med dato.
- **Akseptert** i ADR 001–004 betyr det samme som **Aktiv**.
- Nummerer fortløpende. Filnavn: `NNN-kort-navn.md`.

## Indeks

| ADR | Beslutning | Status | Dato |
|---|---|---|---|
| [001](001-provider-architecture.md) | Provider-arkitektur for datakilder | Akseptert | 2026-09-21 |
| [002](002-postgis-geospatial-model.md) | PostGIS som romlig modell | Akseptert | 2026-09-21 |
| [003](003-central-data-sync.md) | Sentral datasync | Akseptert | 2026-09-21 |
| [004](004-no-scraping-oslo.md) | Ingen scraping av Oslo byggesaker | Akseptert | 2026-09-21 |
| [005](005-cached-public-hut-pages.md) | Hyttesidene leses anonymt, caches i en time, og høyden lagres ved sync | Aktiv | 2026-10-03 |
| [006](006-address-first-not-a-trail-app.md) | Adressebasert produkt, ikke en turapp; bestilling og ledighet hos forvalteren | Aktiv | 2026-10-02 |
| [007](007-chaotic-sources-stable-core.md) | Kildene kan være kaotiske, kjernemodellen skal ikke være det | Aktiv | 2026-10-02 |
| [008](008-publish-what-the-agency-publishes.md) | Etatens publiserte produkt og kvalitetskontroll før nasjonal publisering | Aktiv | 2026-09-27 |
| [009](009-public-admin-security-model.md) | Offentlig og admin: lesing via RPC, publiseringsflagg per kategori | Aktiv | 2026-10-02 |
| [010](010-hut-sources.md) | Hytter: N50 som hovedkilde, Turrutebasen som sekundær, DNT/UT ikke som bulk | Aktiv | 2026-10-02 |
| [011](011-hut-access-semantics.md) | Hytter: tilgang, «Ikke for allmennheten» og midlertidig stengt | Aktiv | 2026-10-02 |
| [012](012-hut-seo-and-crawlers.md) | Hytter i søk og AI-søk: indeksering, canonical, faktatekst, robots | Aktiv | 2026-10-03 |
| [013](013-privacy-and-cookies.md) | Personvern og cookies: privat prosjekt, ingen samtykkebanner | Aktiv | 2026-10-03 |
| [014](014-county-pages-and-sitemap.md) | Fylkessider som eneste landingsnivå for hytter; sitemap uten kunstig lastmod | Aktiv | 2026-10-03 |
| [015](015-publikumsprodukt-wms-og-kildefeil.md) | Spør etter det etaten viser publikum (stormflo, flystøy); kildefeil er ikke «ingen treff»; delvis cache | Aktiv | 2026-10-03 |
| [016](016-plansaker-deterministisk-uttrekk-og-relevans.md) | Plansaker: tiltakstype og formål fra deterministisk dokumentuttrekk under synk, og forklarbar relevans | Aktiv | 2026-10-03 |
| [017](017-romlig-analyse-utforsk-data.md) | Romlig analyse i Utforsk data: asymmetrisk, eksplisitt per kombinasjon, i databasen, minst 10 m² felles areal | Aktiv | 2026-10-04 |

## Mal

```markdown
# ADR NNN: <beslutningen i én setning>

**Status:** Aktiv · YYYY-MM-DD        (eller: Erstattet av ADR NNN · YYYY-MM-DD)

## Bakgrunn
Hva som gjorde at vi måtte bestemme noe. Fakta, med lenke til research.

## Alternativer vurdert
- **A** — hvorfor ikke.
- **B** — hvorfor ikke.

## Beslutning
Det vi valgte, konkret: filer, tabeller, regler.

## Begrunnelse
Hvorfor dette og ikke alternativene.

## Konsekvenser
Hva som følger av valget, også det som blir vanskeligere.

## Kjente ulemper
Det vi vet er svakt eller usikkert.

## Revurderes når
Konkrete hendelser som skal utløse en ny vurdering.

## Relatert
Researchfiler, håndbokseksjoner, andre ADR-er.
```
