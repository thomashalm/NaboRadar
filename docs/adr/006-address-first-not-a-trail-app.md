# ADR 006: Adressebasert produkt, ikke en turapp — bestilling og ledighet ligger hos forvalteren

**Status:** Aktiv · 2026-10-02 (nedtegnet 2026-10-03)

## Bakgrunn
NaboRadar startet som «hva skjer rundt en adresse»: planer, grunnforhold, støy, forurenset grunn,
nærområdet. Høsten 2026 ble en bred modul, «Friluftsliv der du bor», vurdert. Den ville gjort
NaboRadar til en konkurrent til Google Maps, UT.no og turappene, på deres premisser.

Samtidig viste research at DNTs bookingløsning har åpne JSON-endepunkter med ledighet og pris,
men at ingen vilkår gir en tredjepart rett til å bruke dem automatisk og kommersielt, og at UT.nos
vilkår forbyr nettopp det ([research/dnt-booking-ledighet.md](../research/dnt-booking-ledighet.md)).

## Alternativer vurdert
- **Bred friluftsmodul** (stier, parker, lekeplasser, badeplasser, generelle POI-er) — lagt bort.
  Andre gjør det bedre, og det gir ikke lokal innsikt folk ikke allerede har.
- **Booking eller live ledighet og pris for hytter** — lagt bort. Rettighetene er uavklarte, det
  krever en løpende relasjon til hver forvalter, og feil ledighet er verre enn ingen.
- **Smal friluftsdel: det som er vanskelig å få oversikt over andre steder** — valgt.

## Beslutning
- NaboRadar er **adresse-først**. Friluftsdata tas bare inn når de er vanskelige å få oversikt
  over andre steder, gir lokal innsikt, kan overraske, og har geografisk verdi rundt en adresse.
  Kriteriene står i [data-roadmap.md §12](../data-roadmap.md#12-friluft-skjult-lokal-innsikt-ikke-en-turapp).
- Første kategori er hytter og koier. `/omrade` viser hytter i nærheten; `/hytter` er et eget kart
  over det samme datasettet.
- **All bestilling skjer hos den som driver hytta.** Vi viser en kontrollert lenke
  (`booking_url`/`info_url`) og hvem lenken går til. Vi viser aldri pris, ledighet, kalender eller
  antall senger som live data, og vi viser aldri «åpen».
- «Bestilling skjer via Inatur.» og lignende står bare når det finnes en dokumentert
  bestillingslenke ([ADR 012](012-hut-seo-and-crawlers.md)).

## Begrunnelse
Verdien er å oppdage hytter man ikke visste om, få oversikt over et område og gå rett videre til
den som driver hytta. Det kan vi gjøre godt med åpne kartdata og manuell kontroll. Ledighet og pris
kan vi ikke gjøre godt uten avtaler, og et feil svar der koster brukeren en tur.

## Konsekvenser
- Lekeplasser, parker, vanlige turstier og badeplasser står fortsatt under «ikke verdt det nå» i
  roadmapen.
- Hyttesiden må alltid si at «tilgang» ikke betyr åpen eller ledig ([ADR 011](011-hut-access-semantics.md)).
- Nye friluftskategorier (fiskevann, multe) vurderes mot kriteriene, ikke mot hva som er teknisk
  tilgjengelig.

## Kjente ulemper
- Brukere som vil vite om en hytte er ledig, må alltid videre. Det er en ekstra klikk vi velger.
- Geografiske filtre som «På fjellet» ble undersøkt og ikke bygget
  ([research/hytter-geografiske-filtre.md](../research/hytter-geografiske-filtre.md)).

## Revurderes når
- En forvalter (DNT, Statskog, Inatur) tilbyr et dokumentert API med vilkår som tillater visning
  av ledighet hos tredjepart.
- Brukerdata viser at friluftsdelen brukes mer enn adressesøket, og produktretningen endres
  bevisst.

## Relatert
[data-roadmap.md §12](../data-roadmap.md#12-friluft-skjult-lokal-innsikt-ikke-en-turapp) ·
[research/dnt-booking-ledighet.md](../research/dnt-booking-ledighet.md) ·
[håndbok: Hytter og koier](../naboradar-handbook.md#hytter-og-koier)
