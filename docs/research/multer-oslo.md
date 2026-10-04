# Mulig multeterreng i Oslo og Marka

> Undersøkt 2026-10-04. **Bygget samme dag:** det enkle adminlaget med registrerte funn og myr
> (se «Hva som ble bygget» nederst). Scoren er ikke bygget.
> **Anbefaling: ikke bygg en score nå.** Med åpne data vi kan måle på, blir modellen et myrkart
> med en kantsone rundt. Bygg heller et enkelt adminlag med registrerte funn og myr, og test
> tre variabler til (åpen/tresatt myr, markfuktighet, kronedekning) før en score vurderes.
> Bygger på den nasjonale undersøkelsen [multehabitat.md](multehabitat.md) (2026-10-03).

## Problemstilling og hvorfor
Et internt researchlag i admin: «dette området ser mer lovende ut enn andre — kanskje verdt å
sjekke». Ikke offentlig, ikke `/omrade`, ingen påstand om forekomst. Spørsmålet er om en enkel,
forklarbar score sier mer enn «her er det myr».

Avgrensning: en boks rundt Oslo og Marka, 59,78–60,30° N og 10,30–11,10° Ø (ca. 2 600 km²:
Nordmarka, Østmarka, Sørkedalen, Lillomarka, Krokskogen, Romeriksåsene, deler av Sørmarka).
Oslo kommune alene har for få funn (93) til å måle noe.

## Kilder og lisens/vilkår
| Kilde | Hva | Lisens | Brukt til |
|---|---|---|---|
| GBIF / Artskart, multe (*Rubus chamaemorus*, taxonKey 2998290) | 919 registreringer i boksen: Artsobservasjoner 571, UiO feltnotater 158, herbarier, iNaturalist 42, ANO | CC BY 4.0 (880), CC BY-NC (36, utelatt), CC0 (3) | Kalibrering og test |
| GBIF, andre karplanter i boksen | 388 069 registreringer fra 2000 med presisjon ≤ 100 m | CC BY 4.0 | «Målgruppebakgrunn»: hvor botanikere faktisk har vært |
| ANO (Miljødirektoratet) | 162 punkter i boksen, **2 med multe** | CC0 | Ekte fravær, men for få punkter |
| Kartverkets høyde-API (`ws.geonorge.no/hoydedata/v1/punkt`) | Høyde (DTM 1) og terrengtype per punkt (Myr, Skog, …, fra N50) | CC BY 4.0 | Høyde, myr, myr i nærheten, helning |
| NIBIO AR5 (WMS `wms.nibio.no/cgi-bin/ar5`) | Arealtype, treslag, bonitet, grunnforhold | **Ikke åpne data** (Geonorge: `IsOpenData: false`, Geovekst/Norge digitalt). Tjenesten er offentlig for innsyn | Bare oppslag for de 515 funnene. Kan ikke lagres eller vises som eget lag |
| NIBIO markfuktighet (DTW-klasser, WMS) | Dybde til vann i fem klasser | Åpen (nedlasting fylkesvis som GeoTIFF) | Bare for funnene, se «Begrensninger» |
| NIBIO SR16 kronedekning (WMS) | Kronedekning i % | Uklar, se multehabitat.md | Bare for funnene |
| NIBIO AR50 (WFS `ar50_2`) | Arealtype 1:50 000 | NLOD | Forkastet her: 40 % av punktoppslagene ga ingen flate |
| Miljødirektoratet naturtyper (NiN-instruks) | 29 «Sørlig nedbørsmyr», 16 «Platåhøymyr», 15 «Åpen myrflate» i boksen, ellers mest rikmyr og sumpskog | NLOD | Ikke brukt. Flekkvis dekning, kartlegger det sjeldne |
| LAVDAS (Kartverket m.fl.) | Landsdekkende våtmarksdatasett med KI, prosjekt 2024–2027, skal til Geonorge | Ikke publisert | Følg med |
| Drensgrøfter i myr (Miljødirektoratet, 2016) | Grøfter | NLOD | Ikke testet |

## Metode og testutvalg
- **Funn:** til stede, år 2000 eller senere, presisjon ≤ 100 m, CC BY/CC0, uten ANO, tynnet til én
  per 100 m-rute. **515 funn** (419 fra 2020 og senere), i 321 ruter på 1 km² og 85 på 25 km².
- **Målgruppebakgrunn:** 600 tilfeldig trukne funn av andre karplanter med samme krav. Viser hvor
  folk som registrerer planter går, og brukes til å skille «multe foretrekker dette» fra «folk går
  her».
- **Arealbakgrunn:** 700 tilfeldige punkter i boksen (hav og tettsted inkludert).
- **Bakgrunn innen myr:** 292 tilfeldige punkter som Kartverket klassifiserer som myr (av 14 000
  trukne: myr er 2,1 % av boksen, ca. 54 km²).
- For hvert punkt: høyde og terrengtype, og det samme i åtte retninger på 60 m og 150 m (myr i
  nærheten, vann i nærheten, høydeforskjell).
- **Holdout:** sjakkbrett av 10 km-ruter. Reglene har ingen tilpassede parametre utover «myr» og
  «200 m», så holdout viser stabilitet, ikke en trent modell.
- Løft = andel av funnene delt på andel av bakgrunnen.

## Funn

### Myr er signalet, og det er sterkt
| Regel | Funn | Målgruppe | Areal | Løft mot areal | Løft mot målgruppe |
|---|---|---|---|---|---|
| På myr (N50) | 31,3 % | 2,0 % | 1,9 % | 16,8 | 15,6 |
| Ikke på myr, men myr innen 60 m | 21,4 % | 2,2 % | 6,9 % | 3,1 | 9,9 |
| På eller innen 150 m fra myr | 61,4 % | 5,8 % | 16,0 % | 3,8 | 10,5 |
| Ingen myr innen 150 m | 38,6 % | 94,2 % | 84,0 % | 0,5 | 0,4 |
| Høyde ≥ 200 m | 90,3 % | 35,8 % | 64,1 % | 1,4 | 2,5 |
| På myr og ≥ 200 m | 27,4 % | 1,8 % | 1,9 % | 14,7 | 14,9 |
| På/innen 150 m fra myr og ≥ 200 m | 55,5 % | 4,7 % | 14,4 % | 3,8 | 11,9 |
| Ingen myr innen 150 m, ≥ 200 m | 34,8 % | 31,2 % | 49,7 % | 0,7 | 1,1 |

- Løftet står seg mot målgruppebakgrunnen. Botanikere registrerer sjelden noe på myr (2 %), så
  at 31 % av multefunnene ligger der, er ikke bare et turmønster.
- Holdout: «på/innen 150 m fra myr og ≥ 200 m» fanger 56 % av funnene i begge halvdeler, med
  12,3 % og 16,8 % av arealet. «På myr og ≥ 200 m» fanger 28 % og 27 %.
- **To av tre funn ligger utenfor N50-myr.** N50 er 1:50 000 og mangler små myrer. AR5 kaller 19 %
  av disse funnene myr og 29 % organisk jord; 40 % har vann innen 50 cm (markfuktighet); 43 %
  ligger på impediment eller lav bonitet. Resten står i vanlig skog på fastmark — multe som
  bunnvegetasjon i fuktig granskog.

### Høyde er en terskel utenfor myr, ikke en gradient
| Høyde | Funn | Målgruppe | Areal |
|---|---|---|---|
| under 100 m | 0,2 % | 35,2 % | 12,0 % |
| 100–199 m | 9,5 % | 29,0 % | 23,9 % |
| 200–299 m | 45,4 % | 24,5 % | 18,1 % |
| 300–399 m | 19,0 % | 6,2 % | 17,9 % |
| 400–499 m | 11,1 % | 1,8 % | 16,0 % |
| 500 m og over | 14,8 % | 3,3 % | 12,1 % |

Median for funn er 286 m (10–90 %: 201–538 m). Under 200 m er det nesten ingen funn utenfor myr.
**På myr gjelder ikke terskelen:** 12 % av myrfunnene ligger under 200 m, mot 8 % av tilfeldige
myrpunkter. Lave myrer finnes knapt, men de som finnes, har multe.

### Innen myr skiller ingenting vi kunne måle
Funn på myr (161) mot tilfeldige myrpunkter (292):

| Variabel | Funn på myr | Tilfeldig myr | Løft |
|---|---|---|---|
| Stor myr (≥ 6 av 8 naboer på 60 m er myr) | 6 % | 5 % | 1,1 |
| Liten myr eller kant (0–2 av 8) | 60 % | 63 % | 0,95 |
| Flatt (≤ 2 m på 60 m) | 15 % | 12 % | 1,2 |
| Vann innen 150 m | 18 % | 17 % | 1,1 |
| Høyde 200–299 m | 50 % | 26 % | 1,9 |
| Høyde 400 m og over | 19 % | 36 % | 0,5 |

Myrstørrelse, helning og nærhet til vann betyr ingenting. Høydebåndet 200–299 m ser bra ut, men
går mot økologien (nasjonalt øker multe med høyden i Sør-Norge, se multehabitat.md) og er
sannsynligvis tilgjengelighet: myrene folk når fra parkeringsplassene ligger på 200–300 m.

### Hva AR5 sier om funnene (uten bakgrunn å sammenligne med)
- Arealtype: skog 57 %, myr 37 %, ferskvann 4 %.
- Myr eller organisk jord: 48 %.
- Av funnene på AR5-myr: 59 % ikke tresatt, 36 % barskog på myr.
- Kronedekning (SR16) der den finnes: 60 % og over for 60 % av funnene, under 30 % for 18 %.
- Funn per måned: mai 48, juni 178, juli 139, august 90, september 36. Juni er blomstring. Mange
  registreringer er planten, ikke bær.

## Negative funn
- **Modellen slår ikke et myrkart på å rangere myrer.** Ingen av de åpne variablene skiller myr med
  funn fra myr uten.
- **ANO kan ikke brukes lokalt:** 162 punkter og 2 med multe (1,2 %). Det sier at multe er uvanlig
  per arealenhet her, men gir ingen statistikk.
- **AR50 via WFS** ga tomt svar for 40 % av punktene og ble forkastet.
- **AR5 er ikke åpne data.** Det beste myrkartet kan ikke ligge i databasen vår.
- **Bakgrunn for markfuktighet, kronedekning og AR5 mangler.** Oppslagene mot `wms.nibio.no` ble
  kjørt med seks samtidige kall; etter ca. 1 800 kall begynte tjenesten å gi tidsavbrudd og nektet
  deretter tilkoblinger fra denne maskinen resten av økten. Funnene rakk å bli slått opp, bakgrunnen
  ikke. Lærdom: ett kall om gangen mot NIBIO, eller last ned rasteret.
- Funnene har ikke fravær. De kan måle fanget andel, ikke presisjon.

## Kvalitetstest og realitetssjekk
- Toppklassen («på myr») fanger **31 % av funnene på 1,9 % av arealet**.
- Med kantsone («på eller innen 60 m fra myr») fanges **53 % på 8,7 %**.
- Med 150 m og høydeterskel: **56 % på 14 %**.
- Er det bedre enn «vis alle myrer»? **Nei, ikke for å velge mellom myrer.** Det eneste modellen
  legger til, er kantsonen (små myrer og myrkant som N50 mangler) og høydeterskelen utenfor myr.
- I praksis: dette er et myrkart med en ring rundt.

## Signaler, sortert etter hvor godt de er belagt
**Dokumentert økologi** (kilder i multehabitat.md):
- Fattig myr og nedbørsmyr framfor rikmyr. ANO nasjonalt: nedbørsmyr 79 % med multe, åpen
  jordvannsmyr 41 %, myr- og sumpskogsmark 41 %.
- Torvmose og sur, lite omdannet torv. Sterkeste enkeltindikator i ANO, finnes ikke som kart.
- Lys. Over 30 % kronedekning gir multe i 3,8 % av ANO-punktene, og planten setter lite bær i
  skygge. For bær er åpen myr viktigere enn for forekomst.
- Grøfting reduserer forekomsten.

**Målt her:** myr (løft 17), myr innen 60 m (løft 3), høyde ≥ 200 m utenfor myr.

**Svake hypoteser, ikke testet:**
- Åpen myr mot tresatt myr som rangering *innen* myr. Økologien støtter det, men vi mangler
  bakgrunn. Dette er den mest lovende variabelen å teste.
- Markfuktighet (DTW ≤ 50 cm) og impediment/lav bonitet for å finne «fuktig, fattig skog» utenfor
  myrkartet. 40–43 % av funnene utenfor myr har det, men uten bakgrunn vet vi ikke løftet.
- Kraftgater over fuktig mark: lysåpent, og det finnes et eget datasett med 13 multefunn i
  kraftgater i området. Vi har kraftnettet i Utforsk data allerede.
- Myrkant og tuer framfor myrflate. Støttes av litteraturen, kan ikke leses av kartene.

**Spekulasjon:**
- Frosthuler: myrer i forsenkninger får frost i blomstringen og gir sjeldnere bær. Plausibelt,
  men er et årssignal, ikke habitat.
- Avstand fra sti («mindre plukket»). Handler om konkurranse, ikke om terreng.
- Eksponering/himmelretning. Ingen støtte funnet.

## Årstid og avling (ikke bygg nå)
Bær i år styres av frost i blomstringen (slutten av mai–juni), pollinering og juniregn. MET har
åpne observasjoner og gridda temperatur (seNorge), så «frostnetter i juni i år» lar seg lage
senere. Det er et annet spørsmål enn habitat og holdes adskilt.

## Tilgjengelighet (ikke en del av habitatvurderingen)
Avstand til sti og parkering kan bli en egen «lett å undersøke»-markering. Funnene viser at den
ikke må blandes inn: høydebåndet 200–299 m på myr er nettopp tilgjengelighet som ser ut som
habitat.

## Forslag til enkel score, hvis vi bygger
Bare det som er målt:

| Kategori | Regel | Fanger | Areal |
|---|---|---|---|
| Mer lovende | På myr (N50) | 31 % | 1,9 % |
| Mulig | Ikke på myr, men myr innen 60 m | 21 % | 6,9 % |
| Lite lovende | Alt annet | 47 % | 91 % |

Registrert funn i nærheten vises som egne punkter og inngår **ikke** i kategorien. Ellers peker
modellen på steder folk allerede har vært.

Kan legges til etter test (se «Åpne spørsmål»): «åpen myr» løfter til toppklassen, «tresatt myr»
ned ett trinn; «fuktig, fattig skog ≥ 200 m» som tredje vei inn i «Mulig».

## Anbefalt kartvisning
I `/admin/research/utforsk`, som to datasett i registeret:
- **«Multe: registrerte funn»** — punkter, med år, måned, presisjon, kilde og lenke til Artskart.
  515 punkter i boksen. Etikett: «Registrert funn».
- **«Myr (N50)»** — flater, med kategori og hvorfor. Etikett: «Modellert mulig område».
- De to kan vises sammen med dagens to-lagsfunksjon, og «Finn overlapp» (myr med registrert funn)
  faller ut av mønsteret fra ADR 017.
- Panelet sier: «Eksperimentell vurdering for intern research. Ikke bekreftet forekomst.»
- Bare admin. Policy: åpent kart nei, `/omrade` nei.

## Anbefaling
1. **Ikke bygg en score nå.** Den ville vært «myr = lovende», og det ser man på et turkart.
2. **Bygg gjerne det enkle laget:** registrerte funn som punkter, og N50-myr som flater. Verdien
   ligger i funnene (515 presise, nyere punkter) sett mot myrene — særlig myrer *uten* funn nær
   myrer med funn. Krever import av N50-myr for boksen (åpent, CC BY) og funnene fra GBIF.
3. **Test tre variabler før en score:** åpen/tresatt myr, markfuktighet og kronedekning for de 292
   myr-bakgrunnspunktene og 300 skogpunkter. Det er ca. 1 800 oppslag med ett kall om gangen, eller
   én nedlasting av markfuktighet for Oslo og Akershus. Gir åpen myr løft over 1,5 innen myr, er
   det en score verdt å bygge.

## Hva vi bevisst ikke gjorde
Ingen modell, ingen import, ingen UI. Ingen maskinlæring. Ikke brukt CC BY-NC-kilder eller
brukerfora. Ingen bærprognose. Ikke lagret AR5-data.

## Åpne spørsmål
- Skiller åpen myr seg fra tresatt myr når vi har bakgrunn?
- Hvilken rett har vi til å bruke AR5 i et internt, ikke-offentlig lag? I dag: ingen.
- Blir LAVDAS publisert med myrtype eller bare våtmark/ikke våtmark?

## Hva som kan utløse ny vurdering
- LAVDAS på Geonorge.
- At testen i punkt 3 viser at åpen myr eller markfuktighet rangerer innen myr.
- AR5 som åpne data.

## Hva som ble bygget (2026-10-04)
Det enkle laget i anbefalingens punkt 2, i `/admin/research/utforsk`. Ingen score.

**Multe: registrerte funn**
- Kilde: GBIF (`api.gbif.org/v1/occurrence/search`, taxonKey 2998290), boksen over.
- Importert: **508 funn.** 486 fra Artsobservasjoner («Norwegian Species Observation Service»),
  resten fra mindre datasett (Stabbetorp 8, iNaturalist 6, ANO 2, BioDivAbove 2 m.fl.).
  506 er CC BY 4.0 og 2 er CC0. Hver registrering beholder datasett, lisens og lenke til GBIF.
- Utvalg: til stede, år 2000+, presisjon ≤ 100 m, CC BY 4.0 eller CC0, ikke Pl@ntNet (automatisk
  artsbestemt; 9 registreringer utelatt), én per 100 m-rute (nyeste, så lavest GBIF-nøkkel).
  Av 919 i GBIF ble 411 utelatt. ANO er med her (to punkter); i kalibreringen over var de holdt
  utenfor.
- Ikke lagret: observatør, finner, stedsbeskrivelse.
- Alder: median 2024. 413 av funnene er fra 2020 eller senere, 80 fra 2010–2019, 15 fra 2000–2009.

**Myr**
- Kilde: Kartverket N50 Kartdata, objekttypen `Myr` i arealdekke, CC BY 4.0. Lest per kommune
  fra samme arkiv som hyttene (21 kommuner som berører boksen).
- Importert: **7 354 flater, 49 km².** Median 3,5 dekar. 8 445 flater i de samme kommunene lå
  utenfor boksen og ble ikke tatt inn. Lagret geometri: 4 MB.
- AR5 er ikke brukt.

**Nærmeste funn**
- `explore_mires` gir for hver myr: areal, antall funn innen 500 m, og avstand til nærmeste funn
  innen 2 km. Avstanden måles fra myrflaten (0 når funnet ligger på myra), i UTM 33.
- 500 m ble beholdt. Fordeling: 793 myrer (11 %) har et funn innen 250 m, 1 730 (24 %) innen
  500 m, 3 612 (49 %) innen 1 km. 143 myrer har et funn på selve flaten, og 1 424 har ingen innen
  2 km.

**Lagring og tilgang**
- `area_features`, kategori `natur_intern` (upublisert). Bare admin-funksjonene
  `explore_area_features` og `explore_mires` leser dem. Kontrollert i produksjon: anon nektes,
  innlogget ikke-admin får 0 rader, og `features_near` gir ingen av dem.
- Ingen tidsplan. Oppdateres for hånd med `npm run sync:area -- --provider=…`.

**Observasjoner fra dataene (ikke en score)**
- Flest funn innen 500 m: en myr på 21 dekar på Krokskogen i Ringerike (60,096° N, 10,428° Ø)
  med 11. Rundt den ligger fire myrer til med 7–9. Det er den tydeligste klyngen: 10 ruter med
  funn på én kvadratkilometer, 16 registreringer.
- Myrer uten funn på flaten, men med mange rett ved: i Enebakk, sør i Østmarka (59,80° N,
  10,99° Ø), ligger myrer på 22, 94 og 13 dekar med 6–8 funn innen 500 m og nærmeste funn
  135–280 m unna.
- Andre klynger: Østmarka ved Lørenskog/Rælingen (59,86° N, 10,97° Ø og 59,98° N, 10,95° Ø),
  Romeriksåsene/Lunner (60,23–60,27° N, 10,61–10,70° Ø) og Nordmarka ved Tryvann–Kobberhaug
  (60,00° N, 10,66° Ø).
- Skjevhet: funnene ligger i 85 ruter på 5 × 5 km. De fem tetteste rutene har 127 av 508 funn,
  og én rute har 42. Det er steder noen har kartlagt grundig (Lokalflora Oslo og Akershus,
  Florakartlegging i Viken), ikke nødvendigvis steder med mer multe.
- 45 ruter på 100 m har flere enn ett funn (opptil 4): samme sted registrert flere ganger.

