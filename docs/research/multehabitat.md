# Multehabitat

> **Ikke prioritert / ikke bygg nå** (besluttet 2026-10-03). Årsak: med åpne nasjonale kart blir det
> et grovt myrkart som fanger ca. 30 % av forekomstene med ca. 50 % presisjon, det kan ikke si noe om
> bær i år, og i Nordland, Troms og Finnmark kan eier forby plukking på multebærland. Tas opp igjen
> hvis vilkårene under «Anbefaling» endrer seg.
>
> Research only. Undersøkt 2026-10-03. Ingenting er bygget eller lagret.
> Vurdering: det er faglig mulig å lage et grovt, ærlig habitatlag, men med åpne nasjonale kart blir
> det et «myr i nærheten»-kart med moderat treffsikkerhet. Anbefaling: ikke bygg nå. Ingen ADR.

## Problemstilling og hvorfor
Kan NaboRadar vise «områder med forhold som ofte passer multe» uten å påstå «her finner du multer»?
Det avgjørende er ikke om vi kan lage et kart. Det er om kartet sier mer enn «her er det myr», og om
vi kan **måle** det.

## Kritisk vurdering først
- Multe er ikke sjelden. Den finnes i hele landet, på store deler av all fattig myr og i mye fjell og
  skog i nord. Et habitatkart blir derfor i praksis et myrkart med høydebånd.
- Det folk egentlig vil vite, er hvor det er **bær i år**. Det styres av frost i blomstringen,
  pollinering, juniregn og kjønnsfordelingen i klonene, ikke av habitatet. Det kan vi ikke si noe om.
- I Nordland, Troms og Finnmark kan eier forby plukking på «multebærland» (friluftsloven § 5). Et kart
  som peker på de beste multemyrene, peker også på arealer der plukking kan være forbudt. Plukkesteder
  er dessuten en sterk lokal norm.
- Det gode: det finnes et uvanlig godt datasett for å teste ærlig (ANO, under). Vi kan vite hvor godt
  kartet er før vi viser det.

## Kilder og lisens/vilkår

### Observasjoner av multe (Rubus chamaemorus, GBIF taxonKey 2998290)
| Kilde | Antall i Norge | Lisens | Egnethet |
|---|---|---|---|
| **ANO – Arealrepresentativ naturovervåking** (Miljødirektoratet; GBIF `edb656a0…`; nedlasting `naturovervaking_eksport.gpkg.zip`, 12,8 MB) | 20 240 punkter (250 m²-sirkler, 2019–2024), 2 308 med multe og dekning i %. Ellers full artsliste per punkt, så **fravær er reelt** | CC0 (GBIF). Kartkatalog 2054 | **Den beste kilden.** Tilfeldig, arealrepresentativt utvalg med NiN-hovedtype, økosystem, tresjikt- og torvmosedekning per punkt. Til validering, og til trening hvis vi går videre |
| Artsobservasjoner (`b124e1e0…`) | 12 388 | CC BY 4.0 | Bare tilstedeværelse. Ligger nær vei, sti og bebyggelse. Kun supplement |
| Feltnotater og herbarier (UiO, NTNU, UiA m.fl.) | ~7 600 | CC BY 4.0 | Mest historiske (1930–1990). Kun supplement |
| iNaturalist, Observation.org | ~2 050 | **Hovedsakelig CC BY-NC** (iNaturalist: 302 av 1 747 er CC0/CC BY) | Utelates, bortsett fra de åpent lisensierte |
| Pl@ntNet | 617 | CC BY 4.0 | Automatisk artsbestemt. Utelates |
| Totalt i GBIF | 27 682 (27 338 til stede, 344 fravær), 11 040 fra 2020-tallet | | Presisjon fra 0,01 m til over 7 km. Fravær bare i tre små prosjektdatasett |

Til sammenligning har Sverige 107 606 GBIF-registreringer og Finland 26 874.

### Kartlag (prediktorer)
| Datasett | Dekning | Oppløsning | Lisens | Vekt | Bruk |
|---|---|---|---|---|---|
| N50 Kartdata arealdekke (myr, skog, åpent) | Nasjonal | 1:50 000 | CC BY 4.0 | ~1 GB, PostGIS-dump | Ja |
| NIBIO AR50 (myr = 60) | Nasjonal | 1:20–100 000 | NLOD 1.0 | Noen hundre MB, WFS | Ja (testet under) |
| Kartverket DTM 10 | Nasjonal | 10 m | CC BY 4.0 | 3–4 GB | Ja (høyde, helning) |
| MET seNorge_2018-normaler 1991–2020 og vekstsesong (`gsl`) | Nasjonal | 1 km | NLOD / CC BY 4.0 | ~0,5 GB | Ja |
| NIBIO SR16 kronedekning | Nasjonal (skog) | 16 m | **Uklar** (WMS NLOD, raster «Norge digitalt») | Flere GB | Kanskje, etter avklaring |
| Copernicus HRL Tree Cover Density | Nasjonal | 10 m | Copernicus åpen | 1–3 GB | Kanskje (alternativ til SR16) |
| Drensgrøfter i myr (Miljødirektoratet) | Nasjonal | 1:5 000 | NLOD 2.0 | Moderat | Kanskje (trekker ned) |
| NGU Løsmasser «Torv og myr» | N250 nasjonalt, detalj flekkvis | | NLOD 1.0 | ~1 GB | Kanskje |
| Bioklimatiske soner (Artsdatabanken) | Nasjonal | Grov | CC BY 4.0 | Liten | Kanskje (regioner) |
| Naturtyper NiN (V1/V3) | Noen få prosent av landet | 1:5 000 | NLOD 2.0 | Liten | Nei som prediktor, ja til kontroll |
| **FKB-AR5** (detaljert myr) | Nasjonal | 1:1–5 000 | **Norge digitalt, ikke åpen nedlasting** | | Nei |
| NINA «Åpen våtmark i Sør-Norge (NiN)» | Sør-Norge | | Ikke frigitt | | Følg med |
| WorldClim | Global | | Ikke-kommersiell | | Nei |

Det finnes ingen åpen nasjonal torvdybde, skoggrense eller detaljert NiN-dekning.

### Forskning
- **Forekomst:** ombrotrof og fattig myr (NiN V3 nedbørsmyr, fattig V1), tuer og fast mattemark, sur
  og lite omdannet torvmosetorv (pH ~3–4,5), åpent eller glissent tresjikt, kjølig klima og stabilt
  snødekke. Grøfting reduserer forekomsten.
  - EUNIS: https://eunis.eea.europa.eu/habitats/8078
  - Artsdatabanken: https://artsdatabanken.no/arter/artshandbok-norges-torvmoser/hvor-i-myra
  - Āboliņa et al. 2023, *Plants* 12:528
  - Taylor 1971, *J. Ecol.* 59
- **Bær det enkelte året:** frost i blomstringen, insektpollinering (fruktsetting falt fra ~90 % til
  ~15 % uten insekter, *Am. J. Bot.* 2009) og juniregn. Tahvanainen et al. 2019, *Forests* 10:385:
  klima og pris forklarte 40–55 % av årsvariasjonen. Andelen hunnplanter er ofte under 25–30 %
  (Ågren et al. 1986, NIBIO). Forrige års forhold hadde liten effekt (Wallenius 1999).
- **Modeller:** ingen publisert habitatmodell for multe i Fennoskandia ble funnet. Hamilton et al. 2024
  (Alaska) fikk AUC > 0,7 med høyde, jord og januar- og julitemperatur. Finske bærmodeller (Luke, NFI)
  finnes for blåbær og tyttebær, ikke multe.
- **Lov:**
  - Friluftsloven § 5: eier kan forby plukking på multebærland i Nordland, Troms og Finnmark (Rt-1968-24).
  - Finnmarksloven § 23 og § 25: utenbygds kan plukke til eget husholdsbruk på FeFo-grunn.
  - Loven fra 1970 om «moltekart» (umodne bær) ble opphevet i 2004.

## Metode
- Statistikk fra GBIF-fasetter (datasett, år, presisjon, status).
- ANO-pakken ble lastet ned fra Miljødirektoratet. Hvert av de 17 954 undersøkte punktene ble merket
  med om multe ble registrert.
- Høyde for 5 000 tilfeldige punkter ble hentet fra Kartverkets høyde-API (10 punkter per kall, jf.
  høydefeilen fra hytterunden).
- AR50-arealtype for 2 500 tilfeldige punkter ble hentet fra NIBIOs WFS.
- En enkel regel ble testet mot ANO: AR50 myr, et regionalt høydebånd, og begge.

## Funn

### Hvor multe faktisk står (ANO, 17 954 punkter, multe i 12,9 %)
| NiN-hovedtype (250 m²) | n | med multe |
|---|---|---|
| Nedbørsmyr | 317 | **78,9 %** |
| Åpen jordvannsmyr | 2 170 | 41,1 % |
| Myr- og sumpskogsmark | 287 | 40,8 % |
| Boreal hei | 392 | 14,8 % |
| Fjellhei, leside og tundra | 3 568 | 12,2 % |
| Skogsmark / fastmarksskogsmark | 6 065 | ~6 % |
| Snøleie, rabbe, blokkmark, eng, åker | | < 2 % |

- **Etter økosystem:** 44,6 % av våtmarkspunktene har multe, mot 7,7 % i fjell og 6,0 % i skog. Men
  **42 % av alle multepunkter ligger utenfor våtmark** (fjell 496, skog 390), med lav dekning (median
  2–3 % mot 5 % på myr).
- **Torvmosedekning** er den sterkeste enkeltindikatoren: over 50 % torvmose gir multe i 47,1 % av
  punktene, ingen torvmose gir 5,1 %. Den finnes ikke som nasjonalt kart.
- **Tresjikt** (våtmark og skog): 1–30 % kronedekning gir multe i ~10 %, over 30 % gir 3,8 %.

### Høyde varierer med landsdel (5 000 punkter)
| Region (UTM33 N) | Beste høyde | Multe i beste bånd | Under/over |
|---|---|---|---|
| Sør (< 7 000 km) | 400–1 000 m | 14–20 % | 0,8 % under 200 m, 1,5 % over 1 400 m |
| Midt (7 000–7 400) | 0–700 m (topp 400–600) | 14–25 % | 8,6 % over 800 m |
| Nord (≥ 7 400) | 0–500 m | 15–21 % | 0 % over 800 m |

På myr i nord har 58–62 % av punktene under 600 m multe. Én nasjonal høyderegel blir feil, så
modellen må deles i regioner eller bruke klima (temperatur og vekstsesong) i stedet for høyde.

### Hvor godt et åpent nasjonalt kart treffer (2 500 punkter, multe i 14,0 %)
| Regel | Andel av arealet | Multe der (presisjon) | Andel av alle multepunkter fanget |
|---|---|---|---|
| AR50 myr | 8,8 % | **46,2 %** (3,3 × grunnraten) | **29,1 %** |
| Regionalt høydebånd | 72,8 % | 17,9 % | 92,9 % |
| AR50 myr + høydebånd | 8,0 % | 48,3 % | 27,6 % |
| (AR50 myr eller åpen fastmark) + bånd | 35,6 % | 23,8 % | 60,4 % |

- **AR50 bommer på mye myr:** av punktene ANO kartla som våtmark, kaller AR50 bare **41 %** myr. Små
  myrer forsvinner i 1:50 000. Der AR50 sier myr, er det våtmark i 81 % av tilfellene.
- Multepunktene fordeler seg på AR50 åpen fastmark (133), skog (114) og myr (97).
- Presisjonen for myr + bånd varierer med region: Sør 50,5 %, Midt 30,4 % og Nord 58,1 %.
- N50 er ikke testet, men har samme målestokk og forventes å oppføre seg likt. FKB-AR5 ville vært
  bedre, men er ikke åpen.

## Observasjoner av multe: data, skjevhet og bruk til validering
Skillet gjelder hele fila. «Multe er registrert her» er observasjonsdata. «Området har forhold som
ligner kjente multehabitater» er modell. De vises aldri sammen som om de var samme ting.

### Artskart (Artsdatabanken)
- **API:** `artskart.artsdatabanken.no/publicapi/api/observations/list?filter.taxons=63374`, åpent og
  uten nøkkel. Hele utvalget (27 493 av 27 610) ble hentet i 28 kall à 1 000.
- **Felt:** institusjon, samling, dato, finner, kommune, `Latitude`/`Longitude`, UTM33 `East`/`North`,
  `Precision` (m), lokalitet og habitat (nesten alltid tomt).
- **Lisens:** CC BY 4.0 per leverandør. Importen fra GBIF-noder utenfor Norge (iNaturalist m.fl.) har
  sine egne lisenser, ofte CC BY-NC.
- **Samme pool som GBIF:** Artskart har 27 610 registreringer, GBIF 27 682. Det er ikke to uavhengige
  kilder.

| Samling i Artskart | Antall |
|---|---|
| Artsobservasjoner (Norsk botanisk forening, «so2-vascular») | 12 473 |
| NHM UiO feltnotater (vxl) | 4 728 |
| GBIF-noder utenfor Norge (iNaturalist, Observation.org, Pl@ntNet) | 2 897 |
| **ANO (Miljødirektoratet)** | 2 277 |
| NTNU Vitenskapsmuseet (xl) | 1 762 |
| Agder naturmuseum, herbarier, NINA, BioFokus, NMBU, NIBIO m.fl. | ~3 500 |

- **År:** 2 026 er fra før 1950. 19 793 er fra 2000 og senere, 16 477 fra 2010 og senere, og 10 956
  fra 2020 og senere.
- **Presisjon:**
  - ≤ 10 m: 11 096
  - 11–100 m: 3 948
  - 101–1 000 m: 6 352
  - > 1 000 m: 4 392
  - ukjent: 1 705
- **Dubletter:**
  - Mellom samlinger er det bare 27 tilfeller med samme dato og posisjon (mest Artsobservasjoner ↔
    GBIF-import).
  - Innen samme samling er det 883 eksakte dubletter (samme dato, posisjon og samling).
  - Det store problemet er ikke dubletter, men **klynger**: 12 524 brukbare registreringer ligger i
    7 823 ruter på 1 km², med opptil 41 i samme rute.
- **iNaturalist direkte (Norge):** 1 747 registreringer, 1 731 «research grade». Bare **302** har
  CC0/CC BY, 1 011 har CC BY-NC, og resten har ingen eller restriktiv lisens.
- **Andre brukergenererte kilder:** Observation.org (CC BY-NC i GBIF) og Pl@ntNet (automatisk
  artsbestemt). Fora, blogger og «mine multeplasser»-innlegg har verken lisens eller troverdig
  posisjon og er ikke brukt.

### Uavhengig valideringssett
Utvalget utelater ANO og krever år 2000 eller senere og presisjon ≤ 100 m (Svalbard utelatt). Det gir
**12 524 registreringer**: 9 918 Artsobservasjoner, 1 857 GBIF-import og resten museer og konsulenter.
2 500 tilfeldige ble sammenlignet med ANO-punkter med multe (215) og et tilfeldig ANO-utvalg (1 500).

| | Observasjoner | ANO, punkter med multe | ANO, alle punkter |
|---|---|---|---|
| AR50 myr | 23 % | 28 % | 9 % |
| AR50 åpen fastmark | 29 % | 37 % | 43 % |
| AR50 skog | 43 % | 33 % | 45 % |
| **Adresse innen 500 m** | **49 %** | 23 % | 27 % |
| Andel i Sør / Midt / Nord | 71 / 10 / 19 % | 40 / 25 / 35 % | 50 / 19 / 31 % |
| Median høyde, Sør | 518 m | 812 m | |
| Median høyde, Midt | 240 m | 411 m | |
| Median høyde, Nord | 61 m | 232 m | |

**Hva det viser:**
- **Observasjonene følger folk.** Dobbelt så mange ligger innen 500 m fra en adresse som et tilfeldig
  punkt i landet eller et tilfeldig multepunkt. De ligger 200–300 m lavere enn ANO-multe i alle
  landsdeler, og Sør-Norge er overrepresentert.
- **Habitatsignalet er det samme.** Andelen på myr (23 % mot 28 %) er nær ANO, og 2,5 ganger
  bakgrunnen (9 %). Observasjonene bekrefter at myr er riktig hovedregel, og at mye multe står på
  fastmark og i skog.
- **Høydebåndet slår ulikt ut:**
  - Målt på ANO beholder «myr + høydebånd» nesten alle myrtreffene (26 av 28 %).
  - Målt på observasjonene faller fanget andel fra 23 til 13 %, fordi observasjonene ligger lavt og
    nær bebyggelse.
  - Med observasjonene som fasit ville vi feilaktig konkludert med at høydebåndet er dårlig. Trent på
    dem ville modellen lært «lavt og nær vei».
  - Observasjonene viser også ekte lavlandsforekomster (høymyrer i Østfold og Akershus) som et
    høydebånd fra ANO ville kalt uegnet. Det er en reell falsk negativ å ta med i regelen.
- **Brukbarhet:** observasjonene kan **ikke** måle presisjon (de har ikke fravær). De kan måle
  **fanget andel** (sensitivitet), og bare etter at skjevheten er korrigert.

### Forslag: geografisk holdout med begge kildene
1. **Blokker:** del landet i romlige blokker, f.eks. bioklimatiske seksjoner × fylke, eller 50 × 50 km.
   ANO-flatene (500 × 500 m) holdes samlet.
2. **Trening og kalibrering:** bare ANO, på blokkene som ikke holdes ut (leave-one-block-out, eller fem
   folder etter region).
3. **Test i de utelatte blokkene:**
   - Mot ANO: presisjon, fanget andel og løft per klasse. Dette er hovedmålet.
   - Mot observasjoner: bare fanget andel, etter
     - tynning til én registrering per 1 km-rute,
     - stratifisering etter avstand til adresse (< 500 m, 500 m–2 km, > 2 km), med rapport per stratum,
     - bare CC0/CC BY og presisjon ≤ 100 m.

   Hvis fanget andel bare er god nær bebyggelse, har modellen lært folks turmønster.
4. **Krav:** modellen skal ha omtrent samme fanget andel i ANO og i observasjoner langt fra bebyggelse.
   Store avvik betyr skjevhet i modell eller data.
5. **Aldri** tren og test på samme blokk, og aldri bruk observasjoner til både å sette regelen og
   bekrefte den.

## Negative funn
- Ingen publisert multemodell for Norden.
- Ingen åpen detaljert myrkartlegging (AR5 er lukket), ingen torvdybde og ingen nasjonal NiN.
- Fravær finnes nesten bare i ANO. GBIF har 344 fraværsregistreringer i tre små prosjekter.
- Artsobservasjoner og iNaturalist er tilstedeværelse med kjent vei- og sti-skjevhet, og iNaturalist
  er CC BY-NC.
- Elevation-API-et må fortsatt kalles med små batcher.

## Modellvurdering
1. **Regelbasert** (myr fra N50/AR50 + regionalt klima- eller høydebånd + åpent tresjikt): forklarbar
   og billig.
   - Målt: 3,3–3,5 ganger grunnraten der kartet sier «egnet», men fanger bare ~30 % av forekomstene.
   - Ærlig om det formidles som «myr av typen multe ofte vokser på», ikke som en sannsynlighet.
2. **Habitatmodell trent på ANO** (logistisk regresjon eller GAM med myrandel i 250 m, klima, høyde,
   kronedekning og helning; tilstedeværelse/fravær fra et tilfeldig utvalg):
   - Faglig det riktige nivået, og ANO gjør det mulig uten bakgrunnspunkter og uten vei-skjevhet.
   - Gevinsten over regelen er usikker, fordi den viktigste forklaringen (torvmose, myrtype) ikke
     finnes som nasjonalt kart.
3. **Avansert ML** (random forest, boosting, MaxEnt på alle observasjoner): ikke forsvarlig.
   - Kartlagene er for grove til at kompleksitet gir mer enn overtilpasning.
   - MaxEnt på Artsobservasjoner lærer hvor folk går tur.

**Anbefalt hvis vi bygger:** nivå 1, kalibrert og validert mot ANO. Nivå 2 bare hvis det slår nivå 1 på
geografisk holdout.

## Validering
- **Fasit:** ANO-punktene (tilfeldig utvalg, ekte fravær). Artsobservasjoner brukes ikke som fasit.
- **Geografisk holdout:** del på ANO-flater (500 × 500 m-ruter, 18 punkter per flate), aldri på punkt.
  Hold ut hele fylker eller bioklimatiske seksjoner i tur og orden (leave-one-region-out).
- **Mål:**
  - presisjon og andel fanget per klasse,
  - løft over grunnraten,
  - AUC bare for nivå 2,
  - kalibrering: andelen med multe skal stige jevnt fra lav til middels til høy klasse.

  Mål i hver region for seg, ikke bare nasjonalt.
- **Positive kontroller:** kjente multemyrer fra offentlig dokumentasjon (verneplaner, NiN V3-polygoner
  i Naturbase).
- **Negative kontroller:** jordbruk, tett skog, snøleie og blokkmark. ANO viser 0–2 % der, og
  modellen skal gi «lav».
- **Krav før publisering** (forslag):
  - «Høy» skal ha multe i minst 40 % av ANO-punktene i **hver** region.
  - «Lav» skal ha under grunnraten.
  - Resultatet skrives i researchfila (ADR 008).

## Nasjonal dekning
- **Sør-Norge:** fungerer, med fjell- og skogsmyr 400–1 000 m. Lavland og kyst gir få treff.
- **Fjell:** delvis. Multe i fjellhei (12 %) fanges ikke av myrkart.
- **Trøndelag (midt):** svakest presisjon (30 %). Mye multe utenfor kartlagt myr.
- **Nordland, Troms, Finnmark:** best presisjon (58 %), men her gjelder eiers rett til å forby plukking
  på multebærland.
- **Konklusjon:** ikke én nasjonal regel. Bruk tre regioner (Sør, Midt, Nord) eller bioklimatiske
  soner med egne høyde- og klimabånd.

## Produktsemantikk
- **Trygt:** «Myrområde med forhold som ofte passer multe», «Habitat, ikke bær: sier ingenting om hvor
  mye bær det er i år» og «Grovt kart (1:50 000). Små myrer mangler».
- **Kategorier:** bare «egnet» eller ingenting, eventuelt «høy/middels». Ingen prosent og ingen
  0–100-score. Presisjonen er ~50 % i beste klasse og varierer med region, så tall gir falsk presisjon.
- **Aldri:** «her finner du multer», rangering av myrer, «beste multemyr», bærprognose, eller
  punktnivå.
- **Navn hvis bygget:** «Multemyr-forhold» eller «Myr som ofte passer multe». Ikke «Multekart».

## Produktidé
- **Lag i `/omrade`:** naturligst. Én linje, for eksempel «Det er myr av typen multe ofte vokser på
  innen 2 km», med forbehold. Liten verdi per adresse.
- **`/multe` eller egen utforsker:** feil signal. Det blir et sankekart, uansett hva vi skriver.
- **Kompleksitet:**
  - nasjonal myrimport (N50 eller AR50) og klima-raster,
  - forhåndsberegnet rutenett,
  - QA-skript mot ANO,
  - regionale regler,
  - juridisk forbehold i nord.

  Dette er mye for et lag som i beste fall er riktig halvparten av gangene og bommer på 70 % av
  forekomstene.

## Risikoer
- **Falske positive:** halvparten av «egnet»-arealet har ikke multe i ANO-punktet.
- **Falske negative:** små myrer og fjellhei mangler i 1:50 000.
- **Gamle observasjoner:** 9 000+ registreringer er fra før 2000. Om de brukes, kan grøftet eller
  gjengrodd myr se egnet ut.
- **Observasjonsskjevhet:** Artsobservasjoner følger vei og sti. Unngås ved å bruke ANO.
- **Regional variasjon:** høydeoptimum flytter seg ~500 m fra sør til nord.
- **Habitat er ikke bær:** et godt habitat kan gi null bær et frostår.
- **Rettigheter og normer:** multebærland i nord, FeFo-regler, og at plukkesteder er hemmelige. Et
  presist kart kan skape konflikt og trafikk på privat grunn.
- **Lisens:** SR16 er uklar, og AR5 er ikke åpen.

## Anbefaling
- **Ikke bygg nå.**
  - Med åpne kart blir dette et grovt myrkart. Det fanger under en tredjedel av multeforekomstene og
    har ~50 % presisjon.
  - Den største brukerverdien (bær i år) kan vi ikke levere.
  - Risikoen i nord er reell.
- **Vurder igjen** hvis:
  - NINAs modellerte våtmarkskart (NiN) blir frigitt nasjonalt,
  - AR5 eller SR16 blir åpne,
  - NaboRadar får et generelt «natur i nærheten»-lag der «myr» uansett vises. Da er en multelinje med
    forbehold billig.
- ANO bør uansett noteres som en verdifull kilde for andre naturlag. Den har NiN-hovedtype for 20 000
  tilfeldige punkter, CC0.

## Hva vi bevisst ikke gjorde
Ingen modell, ingen import, ingen UI og ingen ADR. Ikke brukt iNaturalist (CC BY-NC) eller
brukerfora. Ingen bærprognose. Ingen punktvisning av observasjoner.
