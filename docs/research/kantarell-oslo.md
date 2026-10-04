# Kantarell i Oslo og Marka

> Undersøkt og bygget 2026-10-04. **Bygget:** registrerte funn som internt datasett i Utforsk data,
> med opptelling av funn i flere sesonger på samme sted. **Ikke bygget:** habitatscore,
> habitatlag og sesong- eller værvarsel.
> Samme område og mønster som [multer-oslo.md](multer-oslo.md) og [tyttebaer-oslo.md](tyttebaer-oslo.md).

## Problemstilling og hvorfor
«Hvor burde jeg gå og lete etter kantarell?» Tre mulige svar ble sammenlignet: registrerte funn,
en habitatmodell, og steder der kantarell er registrert i flere sesonger. Sopp skiller seg fra
bær: fruktlegemene er synlige noen uker, men mycelet lever i bakken i mange år. Et gammelt funn
kan derfor være interessant, og et sted med funn i mange år sier mer enn ett funn.

Avgrensning: boksen fra bærprosjektene, 59,78–60,30° N og 10,30–11,10° Ø.

## Kilder og lisens/vilkår
| Kilde | Hva | Lisens | Brukt til |
|---|---|---|---|
| GBIF, kantarell (*Cantharellus cibarius*, taxonKey 5249504) | 670 registreringer | CC BY 4.0 (648), CC BY-NC (20, utelatt), CC0 (2) | Datasettet og analysene |
| GBIF, andre sopper (rike Fungi) | 260 funn med samme krav | CC BY 4.0 | Bakgrunn: hvor soppfolk har vært |
| Kartverkets høyde-API | Høyde, terrengtype, helning og himmelretning | CC BY 4.0 | Habitat |
| NIBIO SR16 og markfuktighet (WMS) | Treslag, bonitet, kronedekning, overhøyde, dybde til vann | Markfuktighet åpen; SR16-rasteret uklart | Bare måling. Ikke lagret |
| Open-Meteo arkiv (ERA5-reanalyse) | Døgnnedbør og temperatur 2008–2026, ett punkt i Nordmarka | CC BY 4.0 | Test av værsignal |

Andre kilder: Artsobservasjoner er 587 av de 670 registreringene, og er samme data som GBIF.
Museenes soppherbarier har 51, mest eldre. Soppkontroll- og foreningsdata finnes ikke åpent.
NIBIO-oppslagene ble gjort ett om gangen.

## Kvalitetsfilter
| Steg | Antall |
|---|---|
| Rå registreringer | 670 |
| År 2000 eller senere | 649 |
| Presisjon ≤ 100 m | 559 |
| Åpen lisens | 547 |
| Ikke uverifisert eller automatisk godkjent i kilden | 544 |
| Én per 100 m-rute | **457** |

- Kilder etter filter: Artsobservasjoner 535 av 544, iNaturalist (research grade) 4, UiO 5.
- Alle 544 er CC BY 4.0.
- **Bilde:** 219 av 544 (40 %).
- **Kvalitetssikret i kilden:** 28 (validert eller «Approved»). 632 av de 670 rå registreringene
  har ikke noe i feltet for verifisering.
- 155 ulike observatører. De fem mest aktive står for 218 av 544 registreringer.

**Trenger sopp strengere artskvalitet?** For kantarell: lite. Den er en av de letteste
matsoppene å kjenne, og forvekslingsarten falsk kantarell er registrert som egen art. Vi tar ut
registreringer kilden selv merker som uverifiserte eller automatisk godkjent (3), og viser om
funnet har bilde og om kilden har kvalitetssikret det. Et krav om bilde eller validering ville
fjernet 60–95 % av funnene uten at noe tyder på at de er feil.

## Funn

### Gjentatte funn er det sterkeste signalet
| Rutestørrelse | Ruter med funn | 2+ år | 3+ år | 5+ år | 3+ år og 3+ observatører |
|---|---|---|---|---|---|
| 100 m | 457 | 37 | 10 | 4 | 6 |
| 250 m | 386 | 66 | 28 | 6 | 15 |
| 500 m | 325 | 69 | 32 | 8 | 15 |

- 17 % av rutene på 250 m har funn i to eller flere år, og 15 ruter har funn i minst tre år fra
  minst tre ulike observatører. Det siste er det nærmeste vi kommer uavhengig bekreftelse.
- Rutene med flest år ligger i Lillomarka og mot Grorud og Østmarka: én 250 m-rute ved
  59,934° N, 10,857° Ø har funn i 8 år (2015–2026) fra 5 observatører, og tre ruter rundt
  59,95° N, 10,83–10,84° Ø har 6 år hver fra 4–5 observatører.
- Målt per funn (alle brukbare registreringer innen 250 m): 198 av 457 har funn i to eller flere
  år i nærheten, 116 i tre eller flere, 60 i fem eller flere.

### Geografisk spredning
253 ruter på 1 km² og 79 på 25 km². Funnene er ujevnt fordelt: de fem tetteste 5 km-rutene har
232 av 544, og én har 99. Lillomarka og Grorud-siden har 160 funn, Østmarka 48 og Nordmarka-boksen
(59,975–60,25° N, 10,55–10,80° Ø) bare 33. Det er registreringsaktivitet — noen få observatører
som går de samme turene år etter år — og sier ikke at det er lite kantarell i Nordmarka.

### Habitat: eldre, sluttet skog på tørr mark
260 funn, 260 andre soppfunn og 260 tilfeldige punkter på land.

| Signal | Funn | Andre sopp | Areal | Løft mot areal | Løft mot andre sopp |
|---|---|---|---|---|---|
| I skog | 97,3 % | 83,5 % | 78,8 % | 1,2 | 1,2 |
| Overhøyde 15 m eller mer | 88,1 % | 68,4 % | 47,3 % | **1,9** | 1,3 |
| Overhøyde under 8 m (ungskog, hogstflate) | 3,5 % | 9,2 % | 16,2 % | **0,2** | 0,4 |
| Kronedekning 80 % eller mer | 75,8 % | 63,8 % | 36,2 % | **2,1** | 1,2 |
| Kronedekning under 60 % | 8,8 % | 10,4 % | 29,6 % | 0,3 | 0,85 |
| Gran | 61,5 % | 48,1 % | 51,5 % | 1,2 | 1,3 |
| Furu | 25,0 % | 15,4 % | 16,9 % | 1,5 | 1,6 |
| Lauv | 8,5 % | 14,6 % | 6,9 % | 1,2 | 0,6 |
| Bonitet 14 (middels) | 35,0 % | 19,2 % | 23,5 % | 1,5 | 1,8 |
| Vann innen 50 cm (markfuktighet) | 5,0 % | 10,7 % | 12,0 % | **0,4** | 0,5 |
| Nordvendt | 8,5 % | 13,1 % | 16,9 % | 0,5 | 0,65 |
| Flatt (under 3°) | 11,5 % | 17,3 % | 20,0 % | 0,6 | 0,7 |
| Helning 10° eller mer | 38,8 % | 36,5 % | 30,4 % | 1,3 | 1,1 |
| Myr innen 50 m | 5,4 % | 3,1 % | 8,1 % | 0,7 | 1,75 |
| 200–299 moh. | 48,1 % | 40,8 % | 20,4 % | 2,4 | 1,2 |

- **Det som skiller:** eldre skog med tett kronetak (overhøyde over 15 m: 88 % av funnene mot
  47 % av arealet, stabilt i holdout med 86 % og 90 %), nesten ingen funn i ungskog, få på våt
  mark, få i nordvendte lier og på flat mark.
- **Det som ikke skiller:** treslag. Gran, furu og lauv ligger nær arealandelen. I kildens
  habitatfelt (400 av funnene har det) er granskog vanligst (205), deretter barskog (49), løvskog
  (36), furuskog (33) og blandingsskog (20).
- **Mot andre soppfunn er løftene små** (1,2–1,6). Mye av signalet er altså «der soppfolk går»:
  eldre skog nær sti. Høydebåndet 200–299 m er tilgjengelighet, som i bærprosjektene.
- Folkelige råd som ikke fikk støtte: «ved myrkant» (0,7 mot areal) og «langs bekk» (for få
  punkter til å si noe: 4,6 % mot 3,1 %).

### Sesong
| Måned | jun | jul | aug | sep | okt | nov | des |
|---|---|---|---|---|---|---|---|
| Funn | 15 | 128 | 189 | 122 | 52 | 31 | 4 |

- Fordeling over året: 5 % av funnene er gjort innen 4. juli, 25 % innen 29. juli, halvparten
  innen 21. august, 75 % innen 17. september og 95 % innen 4. november.
- **Sesongstart:** dagen da 10 % av årets funn er gjort, er median 13. juli (16 år med minst 15
  funn), med 20. juni som tidligst (2021) og 4. august som senest (2009). Første funn kommer
  typisk mellom 19. juni og 5. juli.
- **Toppuker:** uke 31–35 (slutten av juli til slutten av august), med uke 32 øverst.
- **Høyde:** under 200 moh. er august toppen (41 %); over 300 moh. er juli svakere (13 %) og
  september sterkere (30 %). Sesongen er to–tre uker senere høyere opp.
- **Mellom år:** 2018, tørkesommeren, har 9 funn. Årene rundt har 23–43.
- Tre funn er datert i januar (alle 8. januar 2020). Det er feildatering i kilden, ikke vintersopp.

### Vær: et reelt signal
Nedbør fra Open-Meteos arkiv, ett punkt i Nordmarka. 252 uker i sesongen (uke 28–42, 2010–2026),
rangert etter nedbør før uka **sammenlignet med samme uke andre år**, så sesongen selv ikke blir
signalet.

| Nedbør de 14 dagene før uka | Funn per uke |
|---|---|
| Tørreste tredel | 0,97 |
| Midtre tredel | 1,50 |
| Våteste tredel | 2,47 |

Korrelasjonen mellom nedbørsrang og avvik i funn er 0,37 (0,36 for 30 dager). Uker etter våte
perioder har to og en halv gang så mange funn som uker etter tørre.

**Hva som realistisk kan gjøres:** dataene er åpne (Open-Meteo, eller METs seNorge og Frost, der
Frost krever en gratis klient-ID), og signalet er tydelig nok til å være verdt et forsøk. En
enkel regel — nedbør siste 14 dager mot normalen for uka, i sesongen — er mulig. Forbehold:
funnene måler registreringer, og folk går mer i soppskogen når det har regnet. Signalet er
dessuten målt for hele området med ett værpunkt. Ikke bygget.

## Vurdering: modell, funn eller gjentak?
1. **Bare funn:** nyttig, men ett funn er én person én dag.
2. **Habitatmodell:** svak. «Eldre, sluttet skog på tørr, ikke nordvendt mark» dekker rundt 40 %
   av landarealet og gir løft 2. Det er et skogkart. Ikke bygget.
3. **Tilbakevendende funn:** det sterkeste og mest spesifikke. 15 steder har funn i minst tre år
   fra minst tre observatører, på noen titalls mål hver. Det er dette som svarer på «hvor burde
   jeg gå».

Gjentak har samme svakhet som alt annet her: de viser hvor folk kommer tilbake og registrerer.
Men for sopp er det nettopp det som skjer når et sted leverer.

## Hva som ble bygget
- Datasettet **«Kantarell: registrerte funn»** i `/admin/research/utforsk`. Søkeord: `kantarell`,
  `kantareller`, `kantarellfunn`.
- 457 punkter, lagret i `area_features` under den upubliserte kategorien `natur_intern`, kilde
  `gbif-kantarellfunn-oslomarka`. Samme import som bærfunnene.
- **Gjentak:** ved import telles alle brukbare registreringer innen 250 m av hvert funn — også
  dem som tynnes bort — og lagres som antall funn, antall ulike år, årene, og antall ulike
  observatører. Observatørnavn brukes til å telle og lagres ikke.
- Listen viser stedene med flest sesonger først. Panelet har en egen blokk «Registrert her før»:
  «Registrert i 5 ulike år», «12 registrerte funn innen 250 m, fra 2018–2026», årene og antall
  observatører, med forbeholdet at dette er en opptelling og ikke en sannsynlighet.
- Panelet viser også om funnet har bilde hos kilden, og om kilden har kvalitetssikret det.
- Et funn som er ti år eller eldre får teksten «Mycelet kan leve lenge på samme sted, men funnet
  sier ikke om det kommer sopp i år.»
- Bare admin. Ingen tidsplan: `npm run sync:area -- --provider=gbif-kantarellfunn-oslomarka`.

## Hva vi bevisst ikke gjorde
Ingen score, intet habitatlag, ingen sesong- eller værindikator. Ikke lagret observatørnavn eller
stedsbeskrivelser. Ikke lagret SR16-data.

## Svakheter
- Fem observatører står for 40 % av registreringene, og én 5 km-rute har 99 av 544.
- Nordmarka er tynt dekket (33 funn). Fravær av funn der betyr lite.
- Habitatmålingen bygger på 260 punkter per gruppe; løft under 1,3 er innenfor støy.
- Værsignalet er forvekslet med turaktivitet, og målt med ett værpunkt.
- Folk registrerer ikke sine beste soppsteder. De stedene som finnes her, er dem noen har valgt
  å dele.

## Hva som kan utløse ny vurdering
- Ønske om «forholdene ser gode ut nå»: værsignalet er sterkt nok til å prøves, med nedbør per
  område og en test mot år som ikke er brukt til å lage regelen.
- Flere funn i Nordmarka, eller åpne data fra soppforeningene.
