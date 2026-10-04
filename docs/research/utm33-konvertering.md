# UTM 33 → WGS84: feil i den korte rekkeutviklingen

> Research only. Undersøkt 2026-10-04. Ingen kode eller produksjonsdata er endret.
> Funn: N50-hyttene er lagret med posisjoner regnet ut med den unøyaktige funksjonen. Feilen er
> under 1 m for 94 % av hyttene, 1–2 m på Vestlandet og 15–30 m for 19 hytter i Øst-Finnmark.
> Korrigering er foreslått nederst og venter på godkjenning.

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

## Forslag til korrigering (ikke utført)

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

- Antallet hytter som får endret posisjon ved seks desimaler er et anslag, ikke målt.
- Virkningen på terrenghøyde er ikke målt.
- De tre avvikene på 119–364 m er ikke forklart.
