# Tilfluktsrom: nærmeste rom og deep-link fra spesialverktøyene

> Bygget. Undersøkt og rettet 2026-10-03.
> Regelen står i [håndboka](../naboradar-handbook.md#tilfluktsrom-viser-nærmeste-offentlige-rom-omrade-følger-valgt-radius):
> `/tilfluktsrom` viser nærmeste offentlige rom, `/omrade` følger valgt radius.

## Problemstilling

Søk fra `/tilfluktsrom` på Langmyrgrenda 26C i Oslo ga en resultatside uten noe om tilfluktsrom,
og landet øverst på siden. Spørsmålet var om NaboRadar manglet rom som Sivilforsvaret har, eller
om feilen lå et annet sted.

## Kilder

- «Tilfluktsrom – Offentlige», DSB/Sivilforsvaret, Geonorge (NLOD 1.0), datasett
  `dbae9aae-10e7-4b75-8d67-7f0e8828f3d8`. Landsdekkende GML hentet fra Geonorges
  nedlastings-API 2026-10-03 (`datauttaksdato` 2026-10-03T01:40:56).
- NaboRadars produksjonsdatabase, `area_features` med kategori `tilfluktsrom`.
- Adresser: Kartverkets adresse-API.

WFS-en syncen bruker (`wfs.geonorge.no/skwms1/wfs.tilfluktsrom_offentlige`) svarte HTTP 500 denne
dagen — samme bakmaskinfeil som for matrikkel-WFS. Sammenligningen ble derfor gjort mot
nedlastingsfilen, som er samme datasett.

## Funn

### Dataene var riktige

| Kontroll | Resultat |
|---|---|
| Rom i offisielt uttrekk / aktive i databasen | 556 / 556 |
| Mangler i databasen / mangler i kilden (koblet på `romnr`) | 0 / 0 |
| Avvik i antall plasser | 0 |
| Avvik i stedsbeskrivelse | 0 |
| Største koordinatavvik | 0,06 m |

Siste vellykkede sync var 2026-09-26. Databasen var likevel identisk med uttrekket fra 2026-10-03.
Ingen feil i koordinatsystem, akserekkefølge, filter eller cache. Datasettet har bare offentlige
rom; det finnes ingen private rader å filtrere bort.

### Rotårsaken

Nærmeste offentlige tilfluktsrom til Langmyrgrenda 26C er **Bentsegt 21-25, 3 287 m unna**.
Det er utenfor 1 km, og utenfor 3 km også. `/tilfluktsrom` gjorde ikke noe eget oppslag — den
sendte brukeren til `/omrade` med standardradius 1 km, og der falt seksjonen bort når den var
tom. «Ingen innen radius» ble behandlet som «ingenting å vise».

| Nærmeste rom, Langmyrgrenda 26C | Plasser | Avstand |
|---|---|---|
| Bentsegt 21-25 | 250 | 3 287 m |
| Kingosgt 17 | 260 | 4 063 m |
| Vøyensvingen 4 | 486 | 4 087 m |
| Fagerheimgt 22 | 330 | 4 157 m |

### Dette gjelder mye av Oslo

Avstand til nærmeste offentlige rom for 327 adresser fra et rutenett over hele kommunen
(adressepunkter fra Kartverket; utvalget er flatevektet, ikke befolkningsvektet):

| Innen | Andel av adressene |
|---|---|
| 500 m | 10 % |
| 1 km | 17 % |
| 3 km | 61 % |
| 5 km | 93 % |
| 10 km | 100 % |

Median 2,5 km, 90-persentil 4,7 km, lengst 7,3 km. Med standardradius 1 km fikk altså de fleste
Oslo-adresser et tomt svar fra et verktøy som heter «Finn tilfluktsrom».

### To feil funnet underveis

- **Oppslaget ut til 10 km fikk tidsavbrudd med kald cache.** `features_near` var en SQL-funksjon
  og ble planlagt uten å kjenne `categories`. Den gikk via romindeksen alene: rundt 6 000 sider
  for å finne 37 rom rundt Langmyrgrenda. Varm cache: 50 ms. Kald cache: over anon-rollens
  `statement_timeout` på 3 s. Migrasjon `20261103000000_features_near_custom_plan.sql` gjør
  funksjonen til plpgsql med `plan_cache_mode = force_custom_plan`. Målt i en tilbakerullet
  transaksjon mot produksjon: 6 037 → 300 sider (Langmyrgrenda), 1 980 → 100 (Trondheim),
  serveringsoppslaget 3 328 → 663. Åtte ulike kall ga identisk svar før og etter.
- **Tilfluktsrom manglet i kilderegisteret.** Gruppen sto med en tom «Kilde:», og datasettet var
  ikke med i «Kilder og metode». Rettet.

## QA mot Sivilforsvarets uttrekk

Nærmeste rom og antall innen 500 m / 1 km / 3 km, regnet fra det offisielle uttrekket og fra
databasen hver for seg. Alle 14 adresser ga identisk svar.

| Adresse | Nærmeste rom | Plasser | Avstand | Antall 500 m / 1 km / 3 km |
|---|---|---|---|---|
| Langmyrgrenda 26C | Bentsegt 21-25 | 250 | 3 287 m | 0 / 0 / 0 |
| Karl Johans gate 1 | Fred Olsensgt 11 | 300 | 104 m | 4 / 7 / 31 |
| Kirkeveien 64A (Majorstuen) | Majorstuveien 38 | 555 | 110 m | 3 / 5 / 24 |
| Bogstadveien 22 | Bogstadveien 30 | 160 | 106 m | 4 / 7 / 27 |
| Trondheimsveien 235 | Olav Schousvei 2-8 plan A | 472 | 1 021 m | 0 / 0 / 10 |
| Vækerøveien 200A | Nils Leuchsvei 40 | 465 | 1 274 m | 0 / 0 / 5 |
| Grefsenveien 60 | Bentsegt 21-25 | 250 | 1 486 m | 0 / 0 / 9 |
| Maridalsveien 300 | Bentsegt 21-25 | 250 | 1 787 m | 0 / 0 / 7 |
| Sørkedalsveien 150A | Nils Leuchsvei 40 | 465 | 2 066 m | 0 / 0 / 4 |
| Kjelsåsveien 100 | Bentsegt 21-25 | 250 | 2 772 m | 0 / 0 / 1 |
| Ekebergveien 200A | Klemetsrud, Lofsrudveien 6 | 5 600 | 2 803 m | 0 / 0 / 1 |
| Holmenkollveien 119 | Nils Leuchsvei 40 | 465 | 3 069 m | 0 / 0 / 0 |
| Stovner Senter 3 | Nordlifaret 50, Skårerhallen | 4 000 | 4 932 m | 0 / 0 / 0 |

Trondheimsveien 235 er grensetilfellet: nærmeste rom ligger 21 m utenfor 1 km. `/omrade` viser
det ikke innen 1 km, og verktøyet viser det som «utenfor 1 km».

## QA i nettleser

Lokalt mot produksjonsdata, 2026-10-03.

| Tilfelle | Resultat |
|---|---|
| Langmyrgrenda 26C fra `/tilfluktsrom`, 1 km | Lander på seksjonen under topplinjen. «Ingen offentlige tilfluktsrom innen 1 km», og Bentsegt 21-25 (3,3 km), Kingosgt 17 (4,1 km), Vøyensvingen 4 (4,1 km) |
| Samme, 3 km | «… innen 3 km», samme tre rom som «utenfor 3 km» |
| Langmyrgrenda 26C, vanlig `/omrade` | Lander øverst. «Ingen offentlige tilfluktsrom innen 1 km.» + «Finn nærmeste offentlige tilfluktsrom →» |
| Lenken «Finn nærmeste …» | Lander på seksjonen med de tre rommene |
| Tilbake / fram | Tilbake: vanlig side. Fram: seksjonen, åpen, på plass |
| Åpnet direkte og lastet på nytt | Lander på seksjonen når dataene er inne |
| Karl Johans gate 1 | 7 rom innen 1 km, gruppen åpen |
| Majorstuen (Kirkeveien 64A) | 5 rom innen 1 km, gruppen åpen |
| Stovner Senter 3 (ytre Oslo) | Ingen innen 1 km; nærmeste Skårerhallen 4,9 km |
| Finse (ingen innen 10 km) | Verktøyet: «Ingen offentlige tilfluktsrom innen 10 km.» Vanlig `/omrade`: ingen seksjon |
| Skolekrets, Kirkeveien 64A fra `/skolekrets` | Lander på notisen, åpen: Majorstuen skole. Ingen andre grupper åpnet |
| Skolekrets, Drammen fra `/skolekrets` | «Skolekrets vises foreløpig bare for adresser i Oslo. …» |
| Skolekrets, Drammen, vanlig `/omrade` | Ingen notis, som før |
| Oppslaget feiler (tidsavbrudd, før migrasjonen) | «Kunne ikke hente tilfluktsrom akkurat nå.» — ikke «ingen» |

## Begrensninger

- **Scrollposisjon på mobil er ikke målt.** Nettleserpanelet som ble brukt til QA mistet layout
  etter første sidelasting, så posisjonen kunne bare måles på desktop (direkte åpning, lenke,
  tilbake/fram, skolekrets). Innholdet er kontrollert på begge bredder. Mekanismen er den samme
  på mobil, men bør ses på en telefon.
- Fordelingen er målt på et rutenett av adresser, ikke vektet etter hvor folk bor.
- Kildens WFS var nede. Syncen har ikke kjørt siden 2026-09-26, men dataene er identiske med
  dagens uttrekk. Blir feilen stående, bør syncen kunne lese nedlastingsfilen
  ([ADR 015](../adr/015-publikumsprodukt-wms-og-kildefeil.md)).

## Hva vi bevisst ikke gjorde

- Økte ikke radien for å få et treff. `/omrade` har fortsatt 500 m, 1 km og 3 km.
- La ikke til private tilfluktsrom, ruter eller noen anbefaling om hvilket rom man skal gå til.
- Laget ikke en egen datavei for verktøyet. Det er samme funksjon, med større radius og tre treff.
- Tegner ikke rom utenfor radius i kartet på `/omrade`.
