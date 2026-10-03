# ADR 007: Kildene kan være kaotiske. Kjernemodellen skal ikke være det.

**Status:** Aktiv · 2026-10-02 (nedtegnet 2026-10-03)

## Bakgrunn
Kildene NaboRadar bygger på, bytter ID, navn, posisjon og klassifisering uten varsel. Konkrete
eksempler:

- **N50 Kartdata** har ingen stabil ID for hytter. Samme hytte får ny nøkkel når kartet oppdateres.
- **Turrutebasen** beskriver mange av de samme hyttene med andre navn og egne punkter.
- **N50s eierkategori** er av og til feil (Holmvasshytta står som Statskog, men tilhører
  KFUK-KFUM).
- **Fortegnsfeil i UTM 33** ville ha avvist 96 hytter på Vestlandet
  ([research/hytter-nasjonal-import.md](../research/hytter-nasjonal-import.md)).

Arkitekturgjennomgangen 2026-10-02 ([data-architecture.md](../data-architecture.md)) så samtidig
på hvordan modellen skal tåle nasjonale datasett med millioner av objekter, på Supabase Free med
500 MB.

## Alternativer vurdert
- **Vise kildens rader direkte** — avvist. Ingen stabil identitet, dubletter mellom kilder, og
  manuelle rettelser ville blitt skrevet over ved neste sync.
- **Rette kildedataene på stedet** — avvist. Da kan vi ikke lenger se hva kilden sa, og neste sync
  overskriver rettelsen.
- **Alt i `area_features`** — avvist for bulk-geometri. Én innsjø- eller myrflate per rad ville
  sprengt databasen og gitt ingenting å mene noe om per objekt.

## Beslutning
- **Kildeposter og kanoniske enheter holdes adskilt.** For hytter er kildepostene
  `area_features` med kategori `hytte_kilde` (aldri offentlig). De kanoniske hyttene er `huts`, med
  egen uuid, bygget av `refresh_huts()`, med koblinger i `hut_sources`.
- **Kildens verdi skrives aldri over.** Kontrollerte rettelser ligger i egne kolonner
  (`type_override`, `access_override`, `owner_override`, `manager_verified`, `public_note`) og
  legges oppå i `huts_public`. En overstyring krever kilde (`override_source_url`) og tidspunkt.
- **Identitet overlever kilden.** En hytte uten aktiv kildepost arkiveres og slettes ikke. Den
  hentes tilbake hvis kilden får den igjen. Avvisning og sammenslåing gjøres av et menneske.
- **Ekstern ID må bevises stabil** før den brukes som nøkkel (håndbok §12).
- **Før et stort datasett tas inn, avgjøres modellen:** kanonisk enhet, sted i `area_features`,
  bulk-lag i egen tabell eller vektorfliser, eller direkte oppslag. Spørsmålet som avgjør, er
  «er hvert objekt en ting noen kan mene noe om?» ([data-architecture.md §5](../data-architecture.md#5-kanoniske-enheter-eller-bulk-lag)).

## Begrunnelse
Det som gjør NaboRadar nyttig over tid — manuell kontroll, lenker, forvalter, sammenslåinger — må
overleve at kilden endrer seg. Det gjør det bare hvis kildens versjon og vår versjon er to
forskjellige ting, og hvis det alltid går an å se begge.

## Konsekvenser
- Hver ny kanonisk kategori trenger en egen «refresh»-funksjon og en dedup-regel som er testet
  (`tests/db/huts.test.ts` er mønsteret).
- Admin viser alltid «N50 sa X, forvalteren sier Y».
- Bulk-geometri (innsjøer, myr, stier) skal ikke inn i `area_features`. Geofilter-researchen
  brukte derfor N50-arealdekket lokalt uten å lagre det ([research/hytter-geografiske-filtre.md](../research/hytter-geografiske-filtre.md)).

## Kjente ulemper
- Mer kode og flere tabeller enn å vise kildedata direkte.
- Dedup på posisjon og navn kan ta feil; to hytter nær hverandre flagges for manuell kontroll i
  stedet for å slås sammen automatisk.
- Full sync skriver i dag om alle rader, også uendrede. Det skalerer ikke til hundretusener
  ([data-architecture.md §13](../data-architecture.md#13-sync)).

## Revurderes når
- Et datasett med flere hundre tusen rader skal inn (da gjelder planen for bulk-last og
  versjonering i data-architecture.md).
- Databasen nærmer seg grensen på Supabase-planen.

## Relatert
[data-architecture.md](../data-architecture.md) · [ADR 010](010-hut-sources.md) ·
[håndbok: Hytter og koier](../naboradar-handbook.md#hytter-og-koier) ·
[håndbok §12 Sync-arkitektur](../naboradar-handbook.md#12-sync-arkitektur)
