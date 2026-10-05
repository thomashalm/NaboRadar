# Tomtesjekk (`/tomt`): feasibility

> Research only. Undersøkt 2026-10-05. Ingenting er bygget, ingen migrasjoner, ingen endring i
> offentlig NaboRadar.
> **Konklusjon: delvis.** Fakta om eiendommen og hva som treffer selve tomta kan bygges nå, på åpne
> data og mest gjenbruk. Det brukerne egentlig spør om — hva planen tillater — kan ikke bygges
> nasjonalt: plandataene er ikke åpne, Oslo mangler helt, og bestemmelsene ligger i PDF-er vi ikke
> har lovlig maskinell tilgang til. **Anbefaling: en begrenset MVP på nivå 1, eller vent på DiBK.**

Bygger på [eiendomskort.md](eiendomskort.md) (matrikkel, juss, målinger),
[eiendomshistorikk-feasibility.md](eiendomshistorikk-feasibility.md) (byggesak) og
[planer-og-saker-v2.md](planer-og-saker-v2.md) (plankilder). Det som står der, er ikke gjentatt
her utover konklusjonene.

## Problemstilling
NaboRadar svarer på «hva finnes og skjer rundt boligen?». Tomtesjekk skal svare på «hva gjelder på
selve eiendommen, og hva kan være relevant for tilbygg, påbygg, garasje, ny bolig eller deling?».
Spørsmålet her er om det lar seg gjøre godt nok med åpne data.

## Metode
- Gjennomgang av dagens kode og datagrunnlag.
- Søk i Geonorges kartkatalog etter plan- og bygningsdata, med tilgangsvilkårene katalogen oppgir.
- Direkte kall mot hvert endepunkt som er nevnt. Ingenting er antatt ut fra at et kart finnes.
- Plantjenesten ble prøvd på 15 adresser i 14 kommuner (fem til ble ikke funnet i adressesøket).
- 12 eiendommer ble kjørt gjennom hele kjeden, med eiendommens **flate** mot hvert lag, ikke bare
  adressepunktet. Alt lesende. Arbeidsfilene ligger i scratchpad.
- Lovhenvisningene i I og O (veglova, jernbaneloven, plan- og bygningsloven) er skrevet etter
  hukommelsen og er **ikke kontrollert mot lovteksten** i denne runden.

## B. Hva kan gjenbrukes

| Del | Status | Merknad |
|---|---|---|
| Adressesøk og geokoding | Brukes direkte | Adresse-API-et gir punkt og gnr/bnr |
| Kart (MapLibre, kartlag-arkitekturen) | Brukes direkte | Flater, linjer, punkter, valgt objekt |
| Eiendomsoppslaget (`lib/property/lookup.ts`) | Brukes direkte | Teig, matrikkelnummer, areal, bygg med type, tvist. 200–450 ms i piloten |
| Punktoppslagene: flom, skred, radon, stormflo, støy | Tilpasses | Gjør om fra punkt til flate. Prøvd: ArcGIS-tjenestene tar en polygon |
| Kvikkleire faresoner, forurenset grunn, kraftnett | Brukes direkte | Ligger i `area_features` med PostGIS. Flatesnitt og avstand i én spørring (550–650 ms) |
| Planvarsler (DiBK, 1 564 saker) | Brukes direkte | Snitt mot eiendommen virker. Ingen av de 12 pilotene hadde treff |
| Overlappsanalysen fra Utforsk data | Tilpasses | Samme teknikk, andre lag, og «andel av tomta» i tillegg |
| Kildehåndtering, «feil er ikke fravær», tekstprinsipper | Brukes direkte | Viktigere her enn i `/omrade` |
| Admin, research, sync-rammeverk | Brukes direkte | |
| Gjeldende plan, formål, bestemmelser | Må bygges nytt | Og er avhengig av data vi ikke har lov til å bruke ennå |
| Bygningsomriss, avstand til grense | Må bygges nytt | Krever data som ikke er åpne |
| Vei, vassdrag, vern, kulturminner mot tomta | Må bygges nytt | Åpne kilder finnes. Rett fram |
| PDF/rapport | Finnes ikke i dag | Ikke nødvendig for en MVP |

## C. Eiendomsgrense og matrikkel
Besvart i [eiendomskort.md](eiendomskort.md) og bekreftet i piloten (12 av 12).

| Spørsmål | Svar |
|---|---|
| 1. Kan vi vise eiendomsgrenser? | **Ja.** Kartverkets Eiendom-API gir teigflaten som GeoJSON |
| 2. Adresse → eiendom? | **Ja.** Adresse-API-et gir gnr/bnr; Eiendom-API-et gir teigen under punktet |
| 3. Areal? | **Ja**, matrikkelens beregnede areal fra matrikkelkartets WMS. Vår egen beregning av flaten avvek 0–0,7 % |
| 4. Kan geometrien lagres? | **Ja.** CC BY 4.0 tillater lagring. Nasjonal kopi er 6,4 GB og er ikke aktuell; mellomlagring per oppslag er nok |
| 5. Offentlig og kommersielt? | **Ja.** Matrikkelnummer, areal, grenser, bygningsnummer, -type og -status er fritt for alle (utleveringsforskriften § 3 annet ledd), med «© Kartverket» |
| 6. Avtale, nøkkel, betaling? | **Nei** for dette. **Ja** for byggeår, BRA, bebygd areal, etasjer og eier: berettiget interesse, og på Internett bare med tilgangskontroll |

Forbehold som betyr mer for `/tomt` enn for `/omrade`:
- **Matrikkelenheten er ikke alltid «tomta».** I piloten var tre av tolv eiendommer felles grunn
  for flere bygg (6 dekar med to blokker, 61 dekar med 31 bygg, 30 dekar kommunal eiendom). En
  seksjonert leilighet har ingen egen tomt.
- Grensene har varierende nøyaktighet. Eldre grenser kan være skissert. Feltet for nøyaktighet
  finnes i kilden og må vises, ellers ser en usikker grense like sikker ut som en målt.
- Flere teiger, festegrunn og tvist må håndteres (9 av 49 hadde flere teiger i forrige runde).

## D. Bygninger

| Opplysning | Åpent? | Kilde |
|---|---|---|
| Antall bygg på eiendommen, bygningstype, status | **Ja** | Matrikkelen – Bygningspunkt (CC BY 4.0). I bruk i dag |
| Bygningsomriss (fotavtrykk) som vektor | **Nei** | FKB-Bygning: «Norge digitalt begrenset» |
| Bygningsomriss som kartbilde | **Uklart** | «FKB WMS» står som åpne data i kartkatalogen, men tjenesten oppgir selv «Fees: Norge digital». Må avklares før bruk |
| Avstand mellom bygg og tomtegrense | **Nei** | Krever omriss. Bygningspunktet er ett punkt et sted i bygget |
| Bebygd areal (BYA), BRA, etasjer, byggeår | **Nei** | Matrikkelen, bak avtale og tilgangskontroll |
| Høyde | **Nei** | Ikke i åpne bygningsdata |
| SEFRAK og fredete bygg | **Ja** | Riksantikvaren, åpne data. API-et svarte 503 på alle oppslag i testen |

OpenStreetMap har omriss for mange bygg (ODbL). Kvaliteten varierer, og en avstand til grense
regnet fra frivillig tegnede omriss og matrikkelgrenser med ukjent nøyaktighet er ikke noe vi kan
stå for. Ikke anbefalt.

**Konsekvens:** vi kan si hva som står på eiendommen, ikke hvor mye av den som er bebygd. Dagens
utnyttelse — utgangspunktet for nesten alle «kan jeg bygge mer?»-spørsmål — kan ikke regnes ut.

## E–G. Reguleringsplan, bestemmelser og kommuneplan
Dette er den kritiske delen, og den holder ikke.

### Hva som finnes
DiBKs nasjonale planbase (`nap.ft.dibk.no`) har WMS for reguleringsplaner, kommuneplaner og
planforslag. Tjenestene svarer uten nøkkel og gir attributter for et punkt.

### Lisens
Kartkatalogen oppgir **«Norge digitalt begrenset»** for alle tre, og «åpne data: nei». Tjenesten
selv sier «Opphavsrett Direktoratet for byggkvalitet 2025». At den svarer uten nøkkel, er ikke en
tillatelse. Spørsmålet står i [dibk-henvendelse-utkast.md](dibk-henvendelse-utkast.md), som ikke er
sendt. **Uten skriftlig svar fra DiBK kan dette ikke brukes i et offentlig produkt.**

### Dekning (15 adresser, sentrale strøk i 14 kommuner)

| | Antall |
|---|---|
| Adresser slått opp | 15 |
| Reguleringsplan funnet | 9 (én av dem, Levanger, uten kommuneplan) |
| Bare kommuneplan | 4 (én Bærum-adresse, Bergen, Lillestrøm, Hamar — alle i bebygde strøk) |
| Verken regulering eller kommuneplan | 2 (**Oslo**, Lillehammer) |

- **Oslo finnes ikke i planbasen**, verken regulering eller kommuneplan. Oslos egne plankart har
  ikke åpne data, og innsynsløsningen har `Disallow: /` ([ADR 004](../adr/004-no-scraping-oslo.md)).
- «Ingen treff» betyr ikke «uregulert». Midt i Bergen og Lillestrøm er det nesten sikkert
  reguleringsplaner som ikke er levert. Tjenesten har ikke noe dekningslag, så vi kan ikke skille
  «ingen plan» fra «ikke levert».
- **Ferskhet:** kopidatoen varierte fra 2026-02-02 til 2026-09-25. Flere kommuner var åtte måneder
  gamle. Én eiendom fikk to utgaver av samme kommuneplan.

### Hva de strukturerte dataene inneholder

| Ønsket | Strukturert? | Det vi fikk |
|---|---|---|
| Hvilken plan som gjelder på punktet | Ja, der planen er levert | Plannavn, plan-ID, plantype, ikrafttredelse, lenke til kommunens planregister |
| Gjeldende eller erstattet | Delvis | Planstatus finnes. Eldre og nyere planer oppå hverandre må ordnes selv |
| Arealformål | Ja | Kode (1110 boligbebyggelse, 1130 sentrumsformål …) og feltnavn («BFK1»). Planer fra før 2009 har eldre koder |
| Hensynssoner | Ja | Kode og navn («H570 Bevaringsverdig bebyggelse») |
| Bestemmelsesområder | Bare navnet | «#3», «#7 Prio. vekstområde». Ikke hva bestemmelsen sier |
| Byggegrenser | Som linje i kartet | Linjekode uten avstand. Kan tegnes, ikke forklares |
| Grad av utnytting | **Nei** | Ikke i svarene. Forrige runde fant feltet ødelagt |
| Høyde, etasjer | **Nesten aldri** | Eget lag for regulert høyde; ingen treff i 12 piloter |
| Minste tomtestørrelse, parkering, uteareal, antall boenheter, deling | **Nei** | Finnes bare i bestemmelsene |

### Bestemmelsene
- De ligger som PDF i kommunens planregister. Lenken i planbasen peker til arealplaner.no,
  PlanDialog eller kommunens egen løsning.
- arealplaner.no og PlanDialog har ingen åpen API og ingen vilkår for maskinell bruk. Vi bygger
  ikke kommune-for-kommune-skraping (jf. forrige runde).
- **Deterministisk uttrekk** er prøvd på planvarsel-dokumenter: 74 saker, og tall fra fri tekst
  var for upålitelige til å vises uten kontroll. Bestemmelser er vanskeligere: «BYA = 24 %» gjelder
  ett felt, har unntak tre avsnitt senere, og eldre planer bruker U-grad og TU med andre
  beregningsregler.
- Kommuneplanens generelle bestemmelser (parkering, uteareal, byggegrense mot vassdrag) er ett
  dokument per kommune. Det kan lenkes, ikke tolkes.

**Vurdering:** strukturert data gir planens navn, alder, formål og hensynssoner. Alt som avgjør
hva som kan bygges, må merkes «må leses i planbestemmelsene», med lenke. Det er nyttig, men det er
ikke en tomtesjekk.

### Kommuneplan der regulering mangler
Kommuneplanen kom ut for 12 av 15 adresser. Å forklare forholdet
riktig er vanskeligere enn å hente det: en eldre reguleringsplan kan være delvis satt til side av
en nyere kommuneplan, og det står i kommuneplanens bestemmelser, ikke i dataene. Vi kan vise begge
og si at begge finnes. Vi kan ikke si hvilken som går foran.

## H. Naturfare og grunnforhold: treffer eiendommen?
Prøvd med eiendommens flate.

| Tema | Treffer eiendommen? | Kilde og status | Fra piloten |
|---|---|---|---|
| Kvikkleire, kartlagt faresone | **Ja**, med andel av tomta | `area_features` (NVE). Har | «Stubban, 100 % av tomta» (Trondheim), «Sørum, 100 %» (Gjerdrum) |
| Kvikkleire, aktsomhet | **Ja** | NVE ArcGIS, flate | Treff på 9 av 12 — ligger under marin grense. Lite skillende |
| Flomsone (kartlagt) | **Ja**, per gjentaksintervall | NVE ArcGIS, flate | Lillestrøm: 1000-årsflom, også med klimapåslag |
| Flomaktsomhet | **Ja** | NVE ArcGIS, flate | Treff på 6 av 12 |
| Skredfaresoner | **Ja** | NVE ArcGIS, flate | Bergen: faresone 1/5000 |
| Jord- og flomskred, snø og stein (aktsomhet) | **Ja** | NVE ArcGIS. Raster- og dekningslag må holdes utenfor | Ingen reelle treff |
| Forurenset grunn | **Ja**, på og innen 100 m | `area_features` (Miljødirektoratet). Har | Ingen på eiendommen; 0–22 lokaliteter innen 100 m |
| Stormflo | Punkt i dag | Kartverket WMS | Ikke prøvd med flate |
| Radon | **Nei, bare området** | NGU aktsomhet, grov oppløsning | Sier noe om strøket, ikke tomta |
| Løsmasser, berggrunn | Bare området | NGU WMS, 1:50 000 eller grovere | Ikke prøvd med flate |
| Støy | Punkt i dag | Miljødirektoratet m.fl. | Kan gjøres om til flate |

Det som faktisk gir «treffer eiendommen»: kvikkleire-faresone, flomsone, skredfaresone,
forurenset grunn. Aktsomhetskartene treffer så mye at de må forklares, ikke bare listes.

## I. Infrastruktur og restriksjoner

| Tema | Data | Åpent? | Vurdering |
|---|---|---|---|
| Høyspent og transformator | `area_features` (NVE) | Ja. Har | Avstand fra tomtegrensa virker: «Bærum–Smestad 300 kV, 3 m» |
| Byggeforbudssoner langs kraftledninger | Statnett, WMS | Ja | Ga ikke treff på eiendommen 3 m fra 300 kV-linja. Dekning og innhold må undersøkes før bruk |
| Vei og veikategori | NVDB API Les v4 (krever `X-Client`-hode) | Ja | Kategori og avstand virker: «fylkesvei 12 m». Private veier kom uten kategori |
| Byggegrense mot vei | Følger av veikategori (veglova) når planen ikke sier annet | – | Kan bare vises som «generell regel, planen kan fastsette noe annet» |
| Jernbane | N50 (åpent). Bane NORs karttjeneste svarte ikke | Ja (N50) | Ikke prøvd. Generell byggegrense følger av jernbaneloven |
| Elv og bekk | NVE Elvenett | Ja | Avstand virker: «Hovinbekken innen 100 m». Byggegrensen fastsettes i kommuneplanen |
| Strandsone | Kystkontur (N50) og statlige planretningslinjer | Ja | Ikke prøvd. 100-metersbeltet kan regnes ut; unntak står i plan |
| Verneområder | Miljødirektoratet | Ja | Virker. Ingen treff i piloten |
| Naturtyper | Miljødirektoratet (NiN) | Ja | Virker. Ett treff (Bærum) |
| Kulturminner, SEFRAK | Riksantikvaren OGC API | Ja | **503 på alle oppslag i testen.** Ikke verifisert |

## J. Byggesak
Uendret fra [eiendomshistorikk-feasibility.md](eiendomshistorikk-feasibility.md):
- Det finnes ingen nasjonal kilde for byggesaker per eiendom.
- **Oslo:** gode data tilbake til 1960, søkbare på gnr/bnr, men `Disallow: /` og ingen avtale.
- **Stavanger, Kristiansand:** Public 360 med `Disallow: /`. **Bergen, Asker:** egne løsninger.
  **Bærum, Trondheim:** ikke nådd. Hver kommune er sin egen avtale.
- Dispensasjoner finnes som åpent datasett i én kommune (Fredrikstad). Det viser at det går an,
  ikke at det skalerer.
- **Det som finnes nasjonalt:** bygningsstatus i matrikkelen (rammetillatelse, igangsetting,
  midlertidig brukstillatelse, ferdigattest, godkjent revet), uten dato.

Realistisk i en MVP: «Bygg på eiendommen med tillatelse som ikke er fullført», og lenke til
kommunens innsyn. Ikke saker, ikke dispensasjoner, ikke ferdigattest med dato.

## K. Hvor langt kan vi gå?

| Nivå | Vurdering |
|---|---|
| **1. Fakta som gjelder eiendommen** | **Ja**, for eiendom, bygg, naturfare og infrastruktur. For plan bare med DiBK-avklaring, og da bare navn, formål og hensynssoner |
| **2. Forhold som kan være relevante for tiltaket** | **Delvis.** Som faste sjekklister per tiltak, der hvert punkt enten har et faktum fra nivå 1 eller sier «må undersøkes hos kommunen». Ikke som vurdering |
| **3. Dette ser mulig eller umulig ut** | **Nei.** Mangler utnyttelse i dag, tillatt utnyttelse, høyder, byggegrenser og avstand til nabogrense. Et svar ville vært gjetting |

Nivå 1 er riktig første versjon. Nivå 2 er forsvarlig hvis det er sjekklister og ikke konklusjoner.

## L. Brukstilfeller

| Tiltak | Trenger | Har | Mangler | Hvor sikkert |
|---|---|---|---|---|
| Tilbygg | Dagens BYA, tillatt BYA, avstand til grense, byggegrenser, hensynssone | Tomteareal, bygg og type, hensynssone (med DiBK), naturfare | BYA, omriss, tillatt utnyttelse | Nivå 1 |
| Påbygg | Tillatt høyde og etasjer, dagens høyde, bevaring | Hensynssone bevaring, SEFRAK | Alle høyder | Nivå 1, tynt |
| Garasje | Avstand til grense og vei, veikategori, BYA | Veikategori og avstand, tomteareal | Omriss, BYA, planens byggegrense | Nivå 1–2. Generelle regler kan nevnes |
| Ny bolig på tomta | Formål, utnyttelse, minste tomt, atkomst, VA, naturfare | Formål (med DiBK), tomteareal, naturfare, vei | Utnyttelse, minste tomt, VA | Nivå 1. Naturfare er den reelle verdien |
| Dele tomta | Minste tomtestørrelse, delingsbestemmelser, atkomst, formål | Areal, formål (med DiBK) | Alt som avgjør | Nivå 1. «Tomta er 1 240 m²; kravet står i planen» |
| Ekstra boenhet | Antall tillatte enheter, parkering, uteareal | Antall bruksenheter i dag, bygningstype | Alle krav | Nivå 1, tynt |
| Rivning og nybygg | Bevaring, SEFRAK, plan, naturfare | Hensynssone, SEFRAK, naturfare, forurenset grunn | Bestemmelsene | Nivå 1–2. Bevaring og grunnforhold er nyttige |

Mønsteret: vi har **tomta og farene**, ikke **reglene**. Naturfare og forurenset grunn er det som
kan stoppe eller fordyre et prosjekt uavhengig av plan, og det er der vi står sterkest.

## M. Pilot: 12 eiendommer
Uten personopplysninger. «Plan» er det planbasen svarte på adressepunktet.

| # | Eiendom | Areal | Bygg | Reguleringsplan | Kommuneplan | Treffer eiendommen |
|---|---|---|---|---|---|---|
| 1 | Oslo, Holmenkollveien | 6 367 m² | 2 boligblokker (3–4 etg.) | **Ingen data** | **Ingen data** | Flomaktsomhet |
| 2 | Oslo, Grünerløkka | 9 978 m² | 3 kontorbygg | **Ingen data** | **Ingen data** | Flomaktsomhet. Elv innen 100 m. 11 forurensede lokaliteter innen 100 m |
| 3 | Oslo, Økern | 61 436 m² | 31 bygg, mest blokker | **Ingen data** | **Ingen data** | Flomaktsomhet. Bekk innen 100 m. 22 lokaliteter innen 100 m. 47 kV 66 m unna |
| 4 | Bærum, tomannsbolig | 844 m² | Tomannsbolig, garasje | 1983, boligformål, felt B3 | 2023, boligbebyggelse | **300 kV-ledning 3 m fra grensa.** Fylkesvei 12 m |
| 5 | Bærum, nyere plan | 3 990 m² | 2 boligbygg | 2025, felt BFK1, bestemmelsesområde #3, byggegrense | 2023, sentrumsformål, H570 bevaring | Naturtype. Flomaktsomhet |
| 6 | Asker, eldre plan | 30 568 m² | Barnehage, skole, sykehjem | 1958, eldre formålskode | 2023, to bestemmelsesområder | Flomaktsomhet |
| 7 | Trondheim, enebolig | 971 m² | Enebolig, 2 garasjer | 1962 | 2025 | **Kvikkleiresone, 100 % av tomta** |
| 8 | Lillestrøm, tomannsbolig | 644 m² | Tomannsbolig, garasje | Ingen treff | 2023, boligbebyggelse (to utgaver) | **Flomsone, 1000-årsflom** |
| 9 | Gjerdrum, gårdsbruk | 71 712 m² | 2 eneboliger, driftsbygning m.m. | Ingen treff | 2012, LNF | **Kvikkleiresone, 100 %** |
| 10 | Bergen, enebolig | 575 m² | Enebolig, garasje | Ingen treff | 2019, tre H570-soner, kommunedelplan 2001 | **Skredfaresone 1/5000** |
| 11 | Kristiansand, sentrum | 477 m² | Forretningsbygg | 2024, felt KBA3 | Kommunedelplan 2014 | Ingen |
| 12 | Stavanger, Eiganes | 5 734 m² | Museum | 2003, bevaringsområde | 2024 | 14 lokaliteter innen 100 m |

Det piloten viser:
- **Eiendomsdelen virker i 12 av 12**, men bare 4 av 12 var en «tomt» slik en huseier mener det
  (4, 7, 8, 10). Tre adresser jeg valgte som villa eller småhus, viste seg å være blokker, kommunal
  eiendom og museum. En tomtesjekk må si fra tydelig når eiendommen ikke er en småhustomt.
- **Naturfare ga konkrete, eiendomsspesifikke funn i 5 av 12.** Dette er den sterkeste delen.
- **Plan manglet helt i 3 av 12 (Oslo)**, og reguleringsplan i 3 til.
- Der plan fantes, var svaret et navn, et årstall og en kode. Ikke én bestemmelse.
- Ingen pågående planvarsler traff noen av eiendommene.

## N. Informasjonsarkitektur for en MVP

1. **Eiendommen** — kart med grense, matrikkelnummer, areal, bygg med type. Tydelig merknad når
   eiendommen er felles grunn, har flere teiger eller usikker grense.
2. **På tomta** — bare det som treffer flaten: faresoner, flomsone, forurenset grunn, verneområde,
   naturtype, kulturminne. Med andel av tomta der det gir mening.
3. **Ved tomta** — avstand til høyspent, vei med kategori, elv og bekk, forurenset grunn innen
   100 m.
4. **Aktsomhet i området** — aktsomhetskart og radon, forklart som «området er ikke undersøkt
   nærmere», adskilt fra punkt 2.
5. **Plan** — uten DiBK-avklaring: pågående planvarsler og lenke til kommunens planinnsyn. Med
   avklaring: plannavn, år, formål, hensynssoner og «bestemmelsene må leses», med lenke.
6. **Bygg og tillatelser** — bygg med tillatelse som ikke er fullført. Lenke til kommunens innsyn.
7. **Hva bør undersøkes videre** — fast sjekkliste per tiltak, der punktene over er fylt inn.

Det som mangler, sies på siden. «Ikke kartlagt» og «kilden svarte ikke» er egne tilstander.

## O. Språkprinsipper
1. **Aldri «du kan» eller «du kan ikke».** Vi beskriver hva kildene viser.
2. **Plan er ikke tillatelse.** «Planen angir boligformål» sier ikke at noe kan bygges.
3. **Skill treff fra nærhet.** «Kartlagt kvikkleiresone dekker hele eiendommen» og «innen 100 m»
   er to setninger.
4. **Skill kartlagt fare fra aktsomhet.** Aktsomhet betyr at området ikke er vurdert nærmere.
5. **Fravær er ikke klarering.** «Ingen kartlagt flomsone på eiendommen» — ikke «ikke flomutsatt».
6. **Manglende data sies.** «Vi har ikke plandata for Oslo» — ikke «ingen plan funnet».
7. **Generelle lovregler merkes som generelle**, med «planen kan fastsette noe annet».
8. **Grenser har nøyaktighet.** Areal og avstander oppgis avrundet og med kilde.
9. **Ingen vurdering av sannsynlig utfall**, verken for søknad eller dispensasjon.
10. **Fast avslutning:** kommunen avgjør; siden er ikke rådgivning.

Eksempel: «Eiendommen ligger i felt B3 i reguleringsplanen Nordveien (1983), regulert til bolig.
Hvor mye som kan bygges, står i planbestemmelsene. Kommunen avgjør søknaden.»

## P. Ytelse og lagring

| Del | Valg | Hvorfor |
|---|---|---|
| Teig, areal, bygg | Live, kort mellomlagring | Finnes. 200–450 ms |
| Kvikkleire, forurenset grunn, kraftnett, planvarsler | Synket (har) | Én spørring, 550–650 ms |
| Flom, skred, vern, naturtyper, elv, vei | Live | 60–1 400 ms hver. Parallelt blir siden ca. 1,5–2 s |
| Plan (hvis avklart) | Live | 250–800 ms. Ikke lagre: 6+ GB nasjonalt, og ferskhet er et problem i kilden |
| Resultat per eiendom | Kan mellomlagres i et døgn | Ikke nødvendig i første versjon |
| Byggeår, BRA, eier | **Ikke hente, ikke lagre** | Krever avtale og tilgangskontroll |

- **Vekst i databasen: tilnærmet null** hvis alt nytt hentes live. Databasen er 167 MB av 500 MB.
- Supabase Free holder. Ingen ny betalt infrastruktur trengs.
- Store datasett som ikke bør inn: teiger (6,4 GB), bygningspunkt (7,7 GB utpakket), plandata.
- Kostnaden er avhengigheter: en side med 10–12 eksterne kall har 10–12 måter å bli treg på. I
  testen var tre tjenester nede eller ustabile: Riksantikvarens API (503), Bane NORs karttjeneste,
  og Adresse-API-et (én 502). Hver seksjon må tåle at kilden mangler.

## Q. Konklusjon

### 1. Kan dette bygges?
**Delvis.** Eiendom, bygg, naturfare og infrastruktur: ja. Plan og bestemmelser: nei, ikke
nasjonalt og ikke lovlig i dag.

### 2. Hva kan MVP-en gjøre?
- Vise eiendommen med grense, areal og bygg.
- Si hva som treffer selve tomta: kvikkleiresone, flomsone, skredfaresone, forurenset grunn,
  verneområde, naturtype — med andel av tomta.
- Si hva som ligger tett på: høyspent, vei med kategori, elv og bekk.
- Vise pågående planvarsler som berører eiendommen.
- Vise bygg med tillatelse som ikke er fullført.
- Gi en fast sjekkliste per tiltak, og lenke til kommunens plan- og byggesaksinnsyn.

### 3. Hva kan den ikke gjøre pålitelig?
- Si hva som kan bygges, eller om noe ser mulig ut.
- Oppgi utnyttelse, høyder, byggegrenser, minste tomtestørrelse, parkering eller uteareal.
- Regne ut dagens BYA eller avstand fra bygg til grense.
- Vise gjeldende plan i Oslo, eller garantere at planen er med i andre kommuner.
- Vise byggesaker, dispensasjoner eller ferdigattest.
- Gi en egen «tomt» for leiligheter og eiendommer på felles grunn.

### 4. Kritiske datakilder
- Kartverket: Adresse-API, Eiendom-API, matrikkelkart-WMS. Åpne. Har.
- NVE: faresoner og aktsomhet. Åpne. Har.
- DiBK nasjonal planbase. **Ikke åpen.** Avgjørende for plan-delen.
- Kommunenes planregistre for bestemmelsene. Ingen maskinell tilgang.

### 5. Hva må bygges nytt?
- Siden og oppslaget fra adresse til eiendom som utgangspunkt (i dag er det kartklikk).
- Flateversjoner av punktoppslagene, med «andel av tomta».
- Nye oppslag: vei, elv, vern, naturtyper, kulturminner.
- Regler for når eiendommen ikke er en småhustomt.
- Sjekklistene per tiltak.
- Eventuelt plan-delen, hvis DiBK svarer ja.

### 6. Hvor mye kan gjenbrukes?
**Rundt 60–70 % av det tekniske arbeidet i en nivå 1-MVP**: geokoding, kart, eiendomsoppslag,
naturfareoppslag, synkede lag, kildehåndtering og tekstprinsipper finnes. Tallet gjelder arbeidet,
ikke verdien. Den delen brukerne forventer av en tomtesjekk — reglene — har vi **0 %** av, og den
kan ikke løses med kode.

### 7. Største tekniske risiko
Mange eksterne kall per side, hos tjenester som har vist seg ustabile. Det er håndterbart med
mønsteret vi har, men siden blir aldri raskere enn den tregeste kilden vi venter på.

### 8. Største datarisiko
Plandata: ikke åpne, Oslo mangler, opptil åtte måneder gamle, uten dekningslag, og uten
bestemmelsene. Dernest at matrikkelenheten ofte ikke er «tomta».

### 9. Største juridiske risiko
- At siden leses som rådgivning. Navnet «Tomtesjekk» lover en sjekk, og en bruker som handler på
  «ingen funn» der vi mangler data, har fått et galt inntrykk av oss.
- Bruk av planbasen uten avklart lisens.
- Fristelsen til å hente byggeår, BRA og BYA: de krever avtale og tilgangskontroll.

### 10. Anbefaling
**Bygg en begrenset MVP — eller vent. Ikke bygg «Tomtesjekk» slik navnet lover.**

- Det som kan bygges nå, er en **eiendomsvisning med naturfare og nærhet**: «dette treffer selve
  tomta». Den er ærlig, nasjonal, på åpne data, og piloten ga reelle funn i 5 av 12. Den hører
  like naturlig hjemme som en seksjon i `/omrade` som en egen tjeneste.
- En egen tjeneste under navnet Tomtesjekk bør vente på minst én av to ting: skriftlig ja fra
  DiBK til bruk av planbasen, eller DiBKs varslede åpne plantjenester. Uten plan er navnet større
  enn innholdet.
- **Første steg koster ingenting:** send henvendelsen til DiBK (utkastet finnes), og spør
  samtidig om Oslo og om dekningslag.

## Negative funn
- FKB-Bygning, reguleringsplaner og kommuneplaner er «Norge digitalt begrenset».
- Oslo mangler i den nasjonale planbasen.
- Planbasen har ikke utnyttelse eller høyder i svarene, og ikke noe dekningslag.
- Statnetts byggeforbudssoner ga ikke treff 3 m fra en 300 kV-ledning.
- Riksantikvarens API svarte 503 på alle oppslag; Bane NORs karttjeneste svarte ikke.
- NGUs radon- og løsmassekart er for grove til å si noe om én tomt.
- Tre av mine egne «småhus»-piloter var ikke småhus. Adressen sier ikke hva slags eiendom det er.

## Hva vi bevisst ikke gjorde
Ingen kode i produktet, ingen migrasjoner, ingen import. Ingen henting fra arealplaner.no,
PlanDialog, Oslos innsyn eller andre kommunale portaler. Ingen tolkning av planbestemmelser.
Planbasen ble bare brukt til å måle hva den inneholder. Ingen henvendelse er sendt.

## Åpne spørsmål
- Får vi bruke planbasen offentlig? Når kommer de åpne tjenestene? Kommer Oslo med?
- Er «FKB WMS» åpen for visning i en offentlig tjeneste?
- Skal eiendomsvisningen være egen tjeneste eller en seksjon i `/omrade`?
- Hva inneholder Statnetts byggeforbudssoner?
- Lovhenvisningene må kontrolleres før noe skrives på en side.

## Hva som kan utløse ny vurdering
DiBK åpner planbasen eller svarer ja. Oslo publiserer plandata åpent. FKB-Bygning blir åpne data.
Kartverket åpner byggeår, BRA eller bebygd areal.

## Kilder
- Kartverket, Adresse-API: https://ws.geonorge.no/adresser/v1/
- Kartverket, Eiendom-API: https://api.kartverket.no/eiendom/v1/
- Kartverket, matrikkelkart WMS: https://wms.geonorge.no/skwms1/wms.matrikkelkart
- Kartverket, FKB WMS: https://wms.geonorge.no/skwms1/wms.fkb
- Geonorge kartkatalog (tilgangsvilkår per datasett): https://kartkatalog.geonorge.no/
- DiBK, nasjonal planbase: https://nap.ft.dibk.no/services/wms/reguleringsplaner/ og `/kommuneplaner/`
- NVE, karttjenester: https://kart.nve.no/enterprise/rest/services (Flomsoner2, Flomaktsomhet,
  KvikkleireskredAktsomhet, Skredfaresoner3, JordFlomskredAktsomhet, SkredSnoSteinAkt, Elvenett1)
- Miljødirektoratet: https://kart.miljodirektoratet.no/arcgis/rest/services/vern/MapServer og
  `/naturtyper_nin/MapServer`
- Statens vegvesen, NVDB API Les v4: https://nvdbapiles.atlas.vegvesen.no/
- Statnett, byggeforbudssoner: https://wms.geonorge.no/skwms1/wms.byggeforbudssoner
- Riksantikvaren, OGC API: https://api.ra.no/
- NGU: https://geo.ngu.no/mapserver/RadonWMS2 og `/LosmasserWMS2`
