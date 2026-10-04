# Tyttebær i Oslo og Marka

> Undersøkt og bygget 2026-10-04. **Bygget:** registrerte funn som eget, internt datasett i
> Utforsk data. **Ikke bygget:** habitatscore og habitatlag — de beste signalene (furu, lav
> bonitet) gir løft på rundt 2, og tyttebær står nesten overalt der det er skog.
> Samme mønster og samme område som [multer-oslo.md](multer-oslo.md).

## Problemstilling og hvorfor
Et internt researchlag i admin: «her finnes registrerte funn, og dette kan være interessant å
undersøke». Tre spørsmål måtte besvares før noe ble bygget: er funnene gode nok, kan kildene skille
plante fra bær, og finnes det et habitatsignal som er verdt et eget lag?

Avgrensning: samme boks som multe, 59,78–60,30° N og 10,30–11,10° Ø (Oslo, Nordmarka, Østmarka,
Krokskogen, Romeriksåsene).

## Kilder og lisens/vilkår
| Kilde | Hva | Lisens | Brukt til |
|---|---|---|---|
| GBIF, tyttebær (*Vaccinium vitis-idaea*, taxonKey 2882835) | 2 674 registreringer i boksen | CC BY 4.0 (2 538), CC BY-NC (95, utelatt), CC0 (41) | Datasettet, og kalibrering |
| GBIF, andre karplanter | 500 funn med samme krav | CC BY 4.0 | Målgruppebakgrunn: hvor botanikere har vært |
| Kartverkets høyde-API | Høyde, terrengtype (N50), og høyde i åtte retninger på 50 m | CC BY 4.0 | Høyde, helning, himmelretning, myr og vann i nærheten |
| NIBIO SR16 (WMS) | Treslag (gran/furu/lauv), kronedekning, bonitet, overhøyde | Uklar for rasteret, se multehabitat.md | Bare måling. Ikke lagret |
| NIBIO AR50 (WFS) | Barskog/lauvskog og bonitet i 1:50 000 | NLOD | Vurdert som habitatlag, ikke bygget |
| FKB-AR5 | | Ikke åpne data | Ikke brukt |

Oppslagene mot NIBIO ble denne gangen gjort ett om gangen med pause (1 500 kall på ca. 25
minutter), etter at seks samtidige kall under multeresearchen fikk tjenesten til å stenge oss ute.

## Metode og testutvalg
- **Funn:** samme regler som multe — til stede, år 2000+, presisjon ≤ 100 m, CC BY 4.0 eller CC0,
  ikke automatisk artsbestemt (Pl@ntNet), én per 100 m-rute (nyeste, så lavest GBIF-nøkkel).
- **Måling:** hvert tredje funn (500), 500 andre plantefunn, og 500 tilfeldige punkter, hvorav
  435 på land. Løft er regnet mot landpunktene («areal») og mot de andre plantefunnene
  («målgruppe»).
- **Holdout:** sjakkbrett av 10 km-ruter.

## Funn

### Datagrunnlaget
| Steg | Antall |
|---|---|
| Rå registreringer | 2 674 |
| Til stede | 2 523 |
| År 2000 eller senere | 2 117 |
| Presisjon ≤ 100 m | 1 895 |
| Åpen lisens | 1 831 |
| Ikke Pl@ntNet automatisk | 1 776 |
| Én per 100 m-rute | **1 559** |

- Kilder: Artsobservasjoner 1 347, Stabbetorp 109, ANO 35, iNaturalist 23, BioDivAbove 19, andre 26.
- Lisens: 1 523 CC BY 4.0 og 36 CC0.
- Alder: 1 114 fra 2020 eller senere, 402 fra 2010–2019, 43 fra 2000–2009.
- Presisjon: 1 217 av funnene har 10 m eller bedre.
- Spredning: 708 ruter på 1 km² og 101 på 25 km². De fem tetteste 5 km-rutene har 377 funn, og
  én har 102. Median avstand til nærmeste andre funn er 234 m; 75 % har et annet funn innen 500 m.

### Plante eller bær? Kildene sier det ikke
- `reproductiveCondition` er fylt ut for **7 av 2 674** registreringer (3 «fruits or seeds»,
  3 «no flowers or fruits», 1 «flowers»). Etter filteret står **én** igjen («flowers»).
- `lifeStage`: 17 registreringer, 16 av dem «Unknown».
- Fritekstfeltene handler om prosjekt og naturtype («bærlyngskog», «NINA prosjektnr.»), ikke om bær.
- 95 funn har bilde. Det kunne vist bær, men å lese det av bildene er ikke noe vi gjør.

Det går altså **ikke** an å skille «registrert plantefunn» fra «registrert med frukt/bær».
Datasettet sier det i beskrivelsen: funnene gjelder planten.

### Sesong: funnene følger botanikernes sesong, ikke bærsesongen
| Måned | jan | feb | mar | apr | mai | jun | jul | aug | sep | okt | nov | des |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Funn | 13 | 13 | 18 | 133 | 224 | 346 | 281 | 202 | 138 | 110 | 29 | 17 |

Toppen er juni. 54 % av de frie observasjonene (Artsobservasjoner, iNaturalist) er fra mai–juli,
30 % fra august–oktober. Tyttebær er vintergrønn og kjennes igjen hele året, og registreringene
er planteobservasjoner fra kartleggingsturer — ikke bærplukking. Datoene kan derfor ikke brukes
til «når er tyttebær modne her».

### Habitat: svake signaler
| Regel | Funn | Målgruppe | Areal | Løft mot areal | Løft mot målgruppe |
|---|---|---|---|---|---|
| I skog (SR16) | 96,6 % | 70,4 % | 78,4 % | 1,2 | 1,4 |
| Furu | 36,8 % | 21,6 % | 16,8 % | **2,2** | 1,7 |
| Gran | 43,4 % | 19,2 % | 51,3 % | 0,85 | 2,3 |
| Lauv | 8,2 % | 17,0 % | 6,9 % | 1,2 | 0,5 |
| Bonitet ≤ 8 | 22,6 % | 12,8 % | 12,9 % | 1,8 | 1,8 |
| Bonitet ≤ 11 | 41,2 % | 23,4 % | 27,1 % | 1,5 | 1,8 |
| Furu og bonitet ≤ 11 | 23,6 % | 10,6 % | 11,7 % | **2,0** | 2,2 |
| Kronedekning < 30 % | 12,6 % | 15,0 % | 17,2 % | 0,7 | 0,8 |
| Overhøyde < 8 m (ungskog, hogstflate) | 14,6 % | 21,2 % | 15,4 % | 0,95 | 0,7 |
| Sør- eller vestvendt, helning ≥ 5° | 37,0 % | 32,6 % | 32,2 % | 1,15 | 1,1 |
| Myr (N50) | 5,0 % | 1,8 % | 2,1 % | 2,4 | 2,8 |
| 200–299 moh. | 45,8 % | 24,2 % | 20,5 % | 2,2 | 1,9 |
| 400 moh. og over | 11,8 % | 5,8 % | 30,8 % | 0,4 | 2,0 |

- **Furu og lav bonitet er reelle signaler**, og de står seg i holdout (furu: 38 % og 36 % av
  funnene mot 16 % og 18 % av arealet). Det stemmer med økologien: tyttebær er karakterart i
  bærlyng- og lyngfuruskog.
- **Men løftet er 2, ikke 17.** Multe hadde 31 % av funnene på 1,9 % av arealet. Den beste
  tyttebærregelen har 24–37 % av funnene på 12–17 % av arealet. 43 % av funnene står i granskog.
- **Ingen støtte i dataene for:** glissen skog (kronedekning under 30 % er underrepresentert),
  hogstflater og ungskog, og sør- og vestvendte lier.
- **Høyde** viser tilgjengelighet, som for multe: båndet 200–299 m er overrepresentert, og alt
  over 400 m er underrepresentert mot arealet, men overrepresentert mot de andre plantefunnene.
- I `habitat`-feltet (434 av funnene har det) er «bærlyngskog» vanligst (78), deretter barskog,
  blåbærskog og kalkfuruskog. Det bekrefter bildet, men er fritekst fra noen få prosjekter.

## Vurdering

### Er en habitatmodell bedre enn å vise funnene?
Nei. En regel «furu og lav bonitet» ville markert 12 % av landarealet og fanget en firedel av
funnene. Det er et generelt furuskogkart. Den sier lite man ikke ser i terrenget, og den ville
«ikke lovende» tre av fire steder der tyttebær faktisk er registrert.

### Habitatlag
Ikke bygget. De åpne kandidatene:
- **N50 skog** skiller ikke treslag, og dekker 75 % av landarealet.
- **AR50** (åpent) har barskog og bonitet, men ikke furu mot gran. «Barskog på lav bonitet eller
  impediment» tilsvarer omtrent «bonitet ≤ 11»: løft 1,5 på 27 % av arealet. Det er et dårlig lag.
- **SR16** har furu, men er et raster med uklar lisens for lagring.

### Radius for nærmeste funn
Uten habitatflater er det ikke noe å regne fra. Målt mellom funnene: 53 % har et annet funn innen
250 m, 75 % innen 500 m og 92 % innen 1 km. Hvis et flatelag kommer senere, er 250 m et bedre
utgangspunkt enn 500 m — funnene ligger tre ganger så tett som multefunnene.

## Sammenlignet med multe
| | Multe | Tyttebær |
|---|---|---|
| Rå registreringer i boksen | 919 | 2 674 |
| Etter filter | 508 | 1 559 |
| 5 km-ruter med funn | 85 | 101 |
| Sterkeste habitatsignal | myr, løft 17 | furu, løft 2,2 |
| Funn utenfor «habitatet» | 2 av 3 utenfor N50-myr | nesten 2 av 3 utenfor furuskog |
| Toppmåned | juni | juni |
| Skiller kilden plante fra bær? | nei | nei |

Tyttebær er **vanskeligere** å modellere enn multe: planten er en generalist i barskog, og det
finnes ikke noe avgrenset habitat å peke på. Til gjengjeld er funnene tre ganger så mange og
jevnere spredt, så selve punktkartet sier mer. For begge gjelder at observasjonene viser hvor
planten er sett, ikke hvor det er bær.

## Hva som ble bygget
- Datasettet **«Tyttebær: registrerte funn»** i `/admin/research/utforsk`. Søkeord: `tyttebær`,
  `tyttebaer`, `tyttebærfunn`, `tyttebær funn`.
- 1 559 punkter, lagret i `area_features` under den upubliserte kategorien `natur_intern`,
  kilde `gbif-tyttebaerfunn-oslomarka`. Samme import som multefunnene
  (`lib/providers/gbif/multefunn.ts`), med en annen art.
- Panelet viser art, dato, år, presisjon, datasett, prosjekt, lisens og lenke til GBIF, og
  «Registrert observasjon – sier ikke noe sikkert om forekomst i dag.» Datasettet sier at funnene
  gjelder planten, og at kildene ikke sier om den hadde bær.
- Bare admin. Ingen tidsplan: `npm run sync:area -- --provider=gbif-tyttebaerfunn-oslomarka`.

## Hva vi bevisst ikke gjorde
Ingen score. Intet habitatlag. Ingen sesongindikator. Ingen tolkning av bilder. Ikke lagret
observatør eller stedsbeskrivelse. Ikke lagret SR16- eller AR5-data.

## Svakheter
- Funnene er tilstedeværelse uten fravær, og følger kartleggingsprosjekter og stier.
- Én 5 km-rute har 102 av 1 559 funn.
- Målingen av habitat bygger på 500 funn og 435 landpunkter; løft under 1,3 er innenfor støy.
- SR16 er modellert fra laser og satellitt, og treslaget gjelder en rute på 16 m, ikke stedet
  planten sto.

## Hva som kan utløse ny vurdering
- En åpen kilde som faktisk sier om det var bær (f.eks. at Artsobservasjoner begynner å levere
  aktivitet/fenologi til GBIF).
- Et åpent vektorlag med furuskog. Da er «furuskog med funn i nærheten» et rimelig lag nummer to.
