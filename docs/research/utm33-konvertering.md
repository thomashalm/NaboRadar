# UTM 33 → WGS84: feil i den korte rekkeutviklingen

> Rettet 2026-10-04. N50-hytteimporten bruker nå den nøyaktige omregningen, og produksjon er
> synket på nytt: 742 hytter flyttet, 0 nye, 0 fjernet. Se «Korrigering utført» nederst.
> Avsnittene over det er undersøkelsen slik den sto før rettingen.

## Problemstilling

Ved kildebyttet for tilfluktsrom ([tilfluktsrom-naermeste-rom.md](tilfluktsrom-naermeste-rom.md))
viste `utm33ToWgs84` i `lib/geo/utm.ts` seg å bomme med inntil 42 m langt fra sone 33. Den er en
kort rekkeutvikling rundt 15° øst. Spørsmålet her: hvor brukes den, og er lagrede data forskjøvet?

## Hvor funksjonene brukes

| Funksjon | Brukt av | Berørt |
|---|---|---|
| `utm33ToWgs84` (kort rekke) | `lib/providers/kartverket/n50-hytter.ts` — eneste bruk | **Ja** |
| `utm32ToWgs84` (samme rekke, sone 32) | Oslo skolekretser og skjenkebevillinger | Nei. Oslo ligger 1,7° fra sentralmeridianen. Tre punkter mot Kartverkets transformasjonstjeneste: 0,0001 m avvik |
| `utm33ToWgs84Exact` (Krüger) | Tilfluktsrom | Nei |

Turrutebasen-hyttene kommer i EPSG:4326 fra WFS og regnes ikke om. Ingen andre datasett bruker
UTM 33.

## Er de kanoniske hyttene berørt?

Ja. `huts.geom` hentes fra kildeposten, ikke fra en egen vei:

| | Antall |
|---|---|
| Kanoniske hytter (aktive) | 1 676 (1 653) |
| Posisjon lik N50-kildeposten | 1 483 |
| Posisjon lik Turrutebasen-posten | 171 |
| Annet (manuelt koblet) | 22 |
| Offentlige hytter | 1 510, hvorav 1 481 har N50-posisjon |

## Metode

- **Alle 1 483 N50-kildeposter:** UTM-koordinaten ble gjenfunnet ved å invertere den gamle
  funksjonen numerisk (rest 0,0000 m), og regnet om på nytt med Krüger-rekkene. Feilen er
  avstanden mellom lagret og riktig punkt.
- **Fasit:** 217 hytter i 28 kommuner ble lest på nytt fra Kartverkets N50-filer (rå UTM 33) og
  regnet om med Kartverkets egen transformasjonstjeneste
  (`ws.geonorge.no/transformering/v1`, 25833 → 4258). Kommunene dekker nord (Sør-Varanger,
  Båtsfjord, Vardø, Kautokeino, Karasjok, Alta, Tromsø), sør (Kristiansand, Lindesnes, Sirdal),
  vest (Sandnes, Stavanger, Suldal, Bergen, Kinn, Stad, Volda, Hustadvika), øst og grensenært
  (Trysil, Elverum, Narvik, Hamarøy, Røros, Lierne, Halden, Aremark) og midt i sonen (Oslo,
  Ringerike, Notodden, Sandefjord).
- Krüger-funksjonen mot Kartverkets tjeneste på de samme 217: **0,00 m** avvik, alle.

## Funn

### Hele bestanden (1 483 N50-poster)

| | Feil |
|---|---|
| Median | 0,02 m |
| p95 | 1,13 m |
| Maks | 29,6 m |
| Over 1 m | 90 hytter |
| Over 10 m | 19 hytter |

### Feilen følger avstanden fra 15° øst

| Lengdegrad | Hytter | Median | Maks |
|---|---|---|---|
| under 6° | 90 | 1,21 m | 2,08 m |
| 6–9° | 470 | 0,20 m | 0,80 m |
| 9–12° | 511 | 0,01 m | 0,05 m |
| 12–18° | 301 | 0,00 m | 0,00 m |
| 18–21° | 56 | 0,01 m | 0,04 m |
| 21–24° | 29 | 0,26 m | 0,64 m |
| 24–27° | 7 | 1,38 m | 2,03 m |
| 27° og over | 19 | 18,6 m | 29,6 m |

Per fylke: Finnmark maks 29,6 m (23 hytter over 1 m), Vestland maks 2,1 m (47 over 1 m), Rogaland
maks 1,9 m (19 over 1 m), Møre og Romsdal maks 1,1 m (1 over 1 m). Alle andre fylker under 0,6 m.

De 19 over 10 m ligger alle i Sør-Varanger (5605) og Båtsfjord (5632): Indre Syltevik 30 m,
Lionshytta 26 m, Vardenhytta 26 m, Ragnarokk 22 m, aPod 22 m, Bjørnhytta 22 m, Heimdal 20 m,
Oksvannskoia 19 m, Raijabää 19 m, Helheim 19 m, Vestkoia 18 m, Ellentjørnkoia 17 m,
Lerkevannskoia 17 m, Gjøkvassbu 17 m, Holmenkoia 16 m, Høvasskoia 16 m, Sortbrysttjern koia 16 m,
Føllvannskoia 15 m, Pilolaporten 15 m. Forskyvningen går mot øst.

### Fasitutvalget (217 hytter)

Lagret posisjon mot Kartverkets transformasjon: median 0,05 m, p95 19,2 m. Mønsteret er det samme
som over — Båtsfjord median 22 m, Sør-Varanger median 17 m, Bergen 1,6 m, Stad 1,3 m, Stavanger
1,0 m, og under 0,1 m i Oslo, Trysil, Narvik, Røros og Tromsø.

Tre hytter avvek med 119–364 m (Grautheller i Sandnes, Ringkolltoppen i Ringerike, Tømmerstø i
Kristiansand). Det er ikke omregningen: de avviker like mye fra den gamle funksjonen. Enten har
Kartverket flyttet punktet siden siste sync, eller navnet traff en annen hytte med samme navn i
kommunen. Ikke undersøkt videre.

## Hva som kan være påvirket

| | Påvirket? |
|---|---|
| Kartmarkør og koordinater på hyttesiden | Ja, med feilen over |
| Kommune og fylke | Nei. Kommunenummeret kommer fra N50-arkivet hytta lå i, ikke fra punktet |
| Terrenghøyde | Mulig for de 19 i Øst-Finnmark: høyden er slått opp 15–30 m fra hytta. Ikke målt hvor mye det utgjør |
| Nærmeste hytter, «hytter innen 10 km» på `/omrade` | I praksis nei. Avstander vises i kilometer med én desimal |
| Kobling N50 ↔ Turrutebasen | Ikke funnet. Tersklene er 50 m (posisjon) og 300 m (navn). Ingen ukoblede par innen 400 m øst for 24° |
| Ekstern ID for hytter med likt navn | Nei. Den bygges av rå UTM-koordinat |
| Punkt-i-polygon | Brukes ikke for hytter |

## Korrigering utført 2026-10-04

Én linje i `lib/providers/kartverket/n50-hytter.ts`: `utm33ToWgs84` → `utm33ToWgs84Exact`.
Turrutebasen, sone 32-omregningen, ID-regler, koblingsterskler og overstyringer er ikke rørt.

### Før synken

Hele fersk N50 ble lest lokalt uten å skrive: 357 kommuner, 1 483 hytter — de samme eksterne
ID-ene som i databasen, ingen nye og ingen borte. Navn, type, attributter og kildedato var like
på alle. Bare posisjonen skilte.

### Synken

`kartverket-n50-hytter`, full: 1 483 poster, **0 nye, 742 oppdatert, 741 uendret, 0 fjernet**.
Alle 1 483 kildeposter endte på nøyaktig den posisjonen som var beregnet på forhånd. Ingen andre
hyttekilder ble kjørt; Turrutebasen-postene er uendret.

### Flytting (kanoniske hytter)

| | |
|---|---|
| Flyttet | 742 av 1 676 |
| Median / p95 / maks blant de flyttede | 0,21 m / 1,57 m / 29,6 m |
| Over 1 m | 89 |
| Over 5 m og over 10 m | 19 |

| Fylke | Hytter | Flyttet | Median | Maks | Over 1 m |
|---|---|---|---|---|---|
| Finnmark | 42 | 42 | 1,69 m | 29,6 m | 23 |
| Vestland | 180 | 180 | 0,57 m | 2,07 m | 46 |
| Rogaland | 74 | 74 | 0,68 m | 1,88 m | 19 |
| Møre og Romsdal | 99 | 97 | 0,15 m | 1,09 m | 1 |
| Agder | 80 | 79 | 0,29 m | 0,54 m | 0 |
| Telemark | 43 | 35 | 0,06 m | 0,34 m | 0 |
| Innlandet | 348 | 136 | 0,00 m | 0,26 m | 0 |
| Buskerud | 83 | 50 | 0,06 m | 0,22 m | 0 |
| Troms | 79 | 21 | 0,00 m | 0,19 m | 0 |
| Østfold, Vestfold, Akershus, Trøndelag | 313 | 28 | 0,00 m | 0,11 m | 0 |
| Nordland, Oslo | 142 | 0 | – | – | 0 |

Flest over 1 m per kommune: Sør-Varanger 14, Kinn 6, Båtsfjord 5, Karmøy 5, Bremanger 5.
Tallet 89 (ikke 90 som i undersøkelsen) skyldes avrundingen til seks desimaler ved lagring.

### Høyde

Terrenghøyden ble slått opp på nytt for alle 742 flyttede hytter (`dtm1`), og ingen står igjen
med høyde for gammel posisjon. 44 fikk endret høyde, alle med minst 1 m; 3 med 3 m eller mer.
Ingen ikke-flyttede hytter fikk ny høyde.

| Hytte (Øst-Finnmark) | Flyttet | Høyde før → etter |
|---|---|---|
| Indre Syltevik | 29,6 m | 8 → 7 |
| Lionshytta | 26,5 m | 81 → 76 |
| Vardenhytta | 26,4 m | 190 → 192 |
| Ragnarokk | 22,5 m | 407 → 408 |
| aPod | 22,1 m | 3 → 3 |
| Bjørnhytta | 21,8 m | 100 → 98 |
| Heimdal | 20,4 m | 406 → 406 |
| Oksvannskoia | 19,1 m | 161 → 162 |
| Raijabää | 19,1 m | 239 → 236 |
| Helheim | 18,6 m | 353 → 354 |
| Vestkoia | 17,9 m | 193 → 192 |
| Ellentjørnkoia | 16,9 m | 72 → 72 |
| Lerkevannskoia | 16,8 m | 209 → 211 |
| Gjøkvassbu | 16,8 m | 99 → 102 |
| Holmenkoia | 16,5 m | 80 → 80 |
| Høvasskoia | 15,8 m | 118 → 118 |
| Sortbrysttjern koia | 15,8 m | 117 → 117 |
| Føllvannskoia | 15,2 m | 177 → 178 |
| Pilolaporten | 14,5 m | 167 → 167 |

Høydekilden er `dtm1` før og etter for alle 19. Største utslag er Lionshytta (−5 m). Utenfor
Finnmark er største endring 2 m (Moldahytta i Bremanger). Én hytte blant de 742 byttet
høydekilde; den er ikke blant de 19.

### Identitet, koblinger og overstyringer

Sammenlignet rad for rad, alle 1 676 kanoniske hytter før og etter:

- 0 nye, 0 borte. 1 510 offentlige før og etter.
- Ingen andre felt enn posisjon og høyde er endret: navn, type, forvalter, info- og
  bookinglenke, tilgang, overstyringer, notater, vurderingsstatus og arkivering er like.
- Kildekoblingene (`hut_sources`) er identiske: samme poster, samme grunnlag, samme bekreftelse.
  Eksisterende koblinger vurderes ikke på nytt når en post flytter seg, så terskelnære par
  (opptil 46 m på posisjon, 192 m på navn) er urørt.
- Adressen til en hytteside bygges av navn og ID, så ingen URL er endret.

### De tre avvikene på 119–364 m

Grautheller (Sandnes), Ringkolltoppen (Ringerike) og Tømmerstø (Kristiansand) er ikke feil. Hver
av dem finnes som **to** objekter med samme navn i samme kommune i N50, 119–364 m fra hverandre.
Begge er importert som egne poster, skilt på posisjon i den eksterne ID-en
(`1108:grautheller@3556_658090` og `…@3553_658126`). Kontrollutvalget koblet på navn og traff
tvillingen. Kartverket har ikke flyttet punktene (kildedato 2025-01-04 på alle seks), og ingen
kanonisk hytte peker på feil geometri. Etter synken flyttet de seks postene seg 0–0,4 m som alle
andre i samme område.

### Offentlig kontroll

Hyttesidene for Indre Syltevik, Lionshytta, Ragnarokk, Vardenhytta, Kinn, Vindbalhytta, Aursjobu,
Storlihytta, Fuglemyrhytta og Gjendesheim (lokalt mot produksjonsdata): samme adresse som før,
ny posisjon og høyde på de flyttede, uendret på de andre. Hyttesidene i produksjon er
forhåndsbygget og fornyes innen en time.

## Opprinnelig forslag (utført over)



1. Bytt `utm33ToWgs84` til `utm33ToWgs84Exact` i N50-provideren. Én linje.
2. Kjør full sync for `kartverket-n50-hytter`. Posisjonen lagres med seks desimaler (ca. 0,1 m),
   så anslagsvis 800–900 hytter får endret posisjon, de fleste med noen desimeter, 90 med over
   1 m og 19 med 15–30 m. Identiteten er uendret, så ingen hytter opprettes eller fjernes.
3. `refresh_huts` flytter de kanoniske hyttene, og etter-sync-steget slår opp terrenghøyde på nytt
   for flyttede hytter. Det bør bekreftes i en lokal kjøring før produksjon, sammen med at ingen
   koblinger eller manuelle overstyringer endres.
4. Før/etter-diff som for tilfluktsrom: antall, koblinger, høyde og offentlige sider.
5. Vurder å fjerne den korte `utm33ToWgs84` etterpå, så den ikke brukes på landsdekkende data igjen.

## Begrensninger

- Kartmarkør og «nærmeste hytter» er ikke sett visuelt etter rettingen; posisjonen på sidene er
  lest fra HTML.
- Den korte `utm33ToWgs84` finnes fortsatt i `lib/geo/utm.ts`, nå uten brukere.
