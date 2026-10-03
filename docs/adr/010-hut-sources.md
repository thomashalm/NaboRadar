# ADR 010: Hytter — N50 Kartdata som hovedkilde, Turrutebasen som sekundærkilde, DNT/UT.no ikke som bulkbase

**Status:** Aktiv · 2026-10-02 (nedtegnet 2026-10-03)

## Bakgrunn
Ingen enkelt kilde dekker norske hytter og koier godt.

| Kilde | Hva den har | Svakhet |
|---|---|---|
| **Kartverket N50 Kartdata** (CC BY 4.0) | 1 880 hytteobjekter med type (betjent, selvbetjent, ubetjent, rastebu), eierkategori og «Låst/Ulåst» etter Kartverkets kodeliste | Ingen stabil ID. Eierkategorien er av og til feil. Har gapahuker og serveringshytter blandet inn |
| **Kartverket Turrutebasen** | 1 262 hytteposter, ofte med forvalternavn | Dubletter, svenske hytter, og hytter N50 ikke har som vi ikke kan bekrefte |
| **DNT / UT.no** | Forening, sengeplasser, sesong, booking for 600+ hytter | Ikke noe offentlig API. Nasjonal Turbase er nedlagt. UT.nos vilkår (09.03.2026) forbyr automatisk innhenting til kommersiell bruk |
| **Forvalternes egne sider** (DNT-foreninger, Statskog, fjellstyrer, Inatur, kommuner) | Det som faktisk gjelder: tilgang, nøkkel, bestilling | Én og én side, ulikt format |

## Alternativer vurdert
- **DNT/UT.no som bulkbase** — avvist. Ikke lov uten avtale, og ville dekket bare DNT.
- **Turrutebasen som hovedkilde** — avvist. Svakere typologi og flere dubletter enn N50.
- **Bare N50** — avvist. Turrutebasen gir forvalter og andre navn, og bekrefter N50s hytter.

## Beslutning
- **N50 er hovedkilden.** Den avgjør om en hytte finnes, typen, eierkategorien og tilgangen.
  Gapahuker (243), serveringshytter (112) og objekter uten navn (43) tas ikke inn.
- **Turrutebasen er sekundærkilde.** Den kobles til samme hytte på posisjon og navn, og gir
  forvalter og alternative navn (`alt_names`). En hytte som bare finnes i Turrutebasen, får
  `confidence = low` og vises ikke før et menneske har bekreftet den.
- **DNT/UT.no brukes ikke som datakilde i bulk.** DNT-hyttene er beriket for hånd fra DNTs og
  foreningenes egne sider: forening, bestillingslenke og tilgang. Ingen pris, ledighet,
  kalender eller sengetall er lagret, og UT.no er ikke åpnet
  ([research/hytter-dnt-berikelse.md](../research/hytter-dnt-berikelse.md)).
- **Berikelse fra forvalterne skjer per kategori, med kilde per felt.** Det gjelder DNT,
  Statskog, fjellstyrer og «Andre». Alt lagres som overstyringer oppå kilden
  ([ADR 007](007-chaotic-sources-stable-core.md)).
- **Lenker legges bare inn når de er kontrollert.** «Unknown er bedre enn gjetting.»

## Begrunnelse
N50 er åpen, nasjonal og har Kartverkets definisjoner bak hver verdi. Det gir et etterprøvbart
utgangspunkt. Det N50 ikke vet, vet forvalteren, og det henter vi for hånd, med kilde, i stedet for
å bygge på en kilde vi ikke har lov til å bruke.

## Konsekvenser
- `refresh_huts()` bygger kanoniske hytter fra begge kildene etter hver sync.
- Kontrollkøen i `/admin/hytter` har saker der kildene er uenige om typen, eller der to hytter
  ligger tett.
- Tallene per runde står i researchfilene. Ved import: 1 481 synlige, 190 skjult til kontroll.

## Kjente ulemper
- Sengeplasser, sesong og betjeningsperiode mangler for de fleste hyttene.
- Manuell berikelse må vedlikeholdes; lenker og forvaltere kan bli utdatert.
- N50 oppdateres sjelden (kildedato 2025-01-04 for de fleste hyttene i oktober 2026).

## Revurderes når
- DNT eller UT.no tilbyr et dokumentert API eller en avtale.
- Kartverket gir N50-hyttene stabile ID-er, eller lanserer et eget hyttedatasett.

## Relatert
[research/hytter-pilot-kildekontroll.md](../research/hytter-pilot-kildekontroll.md) ·
[research/hytter-nasjonal-import.md](../research/hytter-nasjonal-import.md) ·
[research/hytter-dnt-berikelse.md](../research/hytter-dnt-berikelse.md) ·
[research/hytter-statskog-berikelse.md](../research/hytter-statskog-berikelse.md) ·
[research/hytter-fjellstyre-berikelse.md](../research/hytter-fjellstyre-berikelse.md) ·
[research/hytter-andre-berikelse.md](../research/hytter-andre-berikelse.md) ·
[data-sources.md](../data-sources.md)
