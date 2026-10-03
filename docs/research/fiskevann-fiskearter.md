# Fiskevann og fiskearter

> **Ikke prioritert / ikke bygg nå** (besluttet 2026-10-03). Årsak: arter kan bare vises trygt for
> rundt 870 innsjøer med datert prøvefiske eller kartlegging, skjevt fordelt mot sør og øst, og det
> finnes ingen åpen kilde for fiskekort eller forvalter. Tas opp igjen ved hendelsene under «Hva som
> kan utløse ny vurdering».
>
> Research only. Undersøkt 2026-10-03. Ingenting er bygget, importert eller lagret.
> Anbefaling: innsjøer nasjonalt fra NVE, arter bare der det finnes en strukturert, datert
> registrering knyttet til innsjø-ID, og ingen fiskekortdata i første versjon. Ingen ADR før vi tar en
> produktbeslutning.

## Problemstilling og hvorfor
Kan NaboRadar vise «Fiske i nærheten» på `/omrade` (vann i nærheten, dokumenterte arter, forvalter
og fiskekort der det er offentlig dokumentert), og senere en egen utforsker? Spørsmålet er ikke om
det finnes data om fisk i Norge. Det gjør det. Spørsmålet er om dataene sier noe om **i dag**, om de
kan knyttes til **riktig innsjø**, og om vi har **lov** til å bruke dem.

## Kilder og lisens/vilkår

### Grunndata (kan lagres og vises, med kildehenvisning)
| Kilde | Hva | Lisens | Tilgang | Innsjø-ID | Rolle |
|---|---|---|---|---|---|
| NVE Innsjødatabase | 267 194 innsjøpolygoner, navn, høyde, areal, kommune, magasin | NLOD 1.0 (CC BY-kompatibel; Geonorge 823b8639…) | ArcGIS REST `kart.nve.no/enterprise/rest/services/Innsjodatabase2/MapServer/5` (2000/side), WMS, nedlasting.nve.no (Shape/SOSI) | **vatnLnr** | Kanonisk innsjø |
| Kartverket N50 Innsjø | Innsjøflater | CC BY 4.0 | Geonorge-nedlasting | Bærer NVEs `vatnLøpenummer`, har ikke navn | Bare geometri ved behov |
| Kartverket Stedsnavn | Navn, navnetype (Innsjø, Vann, Tjern …), `stedsnummer` | CC BY 4.0 | `ws.geonorge.no/stedsnavn/v1` | Nei (bare `stedsnummer`) | Navn og alias, koblet romlig til NVE |
| Vann-nett vannforekomster | 6 855 innsjøvannforekomster med status | NLOD 2.0 | ArcGIS REST (kart3.miljodirektoratet.no), karteksport | Vannforekomst-ID, ikke vatnLnr | Kryssnøkkel for Vannmiljø. Ingen artsdata |
| Vannmiljø – artsforekomster (GBIF `46293000…`) | Prøvefiske (garn, trål, el-fiske) fra overvåking | CC BY 4.0 (GBIF), NLOD (Miljødirektoratet) | GBIF API/nedlasting med DOI. Vannmiljøs eget API krever nøkkel | Vannlokalitet-ID og vannforekomstkode i fritekst, ikke vatnLnr | **Grunnlag for nyere artsdata** |
| Norwegian freshwater lake fish inventory (GBIF `ea0bb0f7…`) | Spørreskjema 2015, til stede/fravær, `establishmentMeans` | CC BY 4.0 | GBIF | **vatnLnr** i `locationID` | Grunnlag, merket «spørreskjema» |
| NINA Vanndata fisk (GBIF `a639542a…`) | 84 979 registreringer, bare «til stede» | CC BY 4.0 | GBIF | Nei. Lokalitetsnavn, kommune, avrundede koordinater | Grunnlag for eldre registreringer, merket med år |
| Huitfeldt-Kaas 1918 (GBIF `e306fa70…`) | 1 745 innsjøer, til stede/fravær, «innført» | CC0 | GBIF | **vatnLnr** | Bare historikk |

### Kun research og verifikasjon
| Kilde | Hvorfor ikke grunnlag |
|---|---|
| Artskart public API (Artsdatabanken) | CC BY 4.0, åpent og uten nøkkel, men samler de samme datasettene som GBIF og mister vannforekomstkoden. Brukes til kontroll. Arealfilter må være UTM33-WKT; `filter.bounds` ble stille ignorert |
| Artsobservasjoner (GBIF `b124e1e0…`) | Innbyggerrapporter. Nyttige som «registrerte observasjoner», aldri som bestand |
| NHMO DNA-bank, fiskeskjell (GBIF `de2875e4…`) | Prøver, ofte mange fra én innsjø (129 i Lutvannet). Bekrefter forekomst, men ikke i dag |
| Fiskemerking og telemetri (OTN, NS Southern Upland, Ims, NTNU Nidelva m.fl.) | Over 1 million ørretregistreringer, ofte i fjord og elv. Må filtreres bort |
| Datasett med CC BY-NC (f.eks. «Fishes of INEP and NFH collections») | Ikke kommersielt. Utelates |
| Rapporter (NINA, NIVA, LFI, Statsforvalteren), OFAs sider, fjellstyrenes sider | Fasit i QA. Opphavsrett, ikke strukturert |

### Fiskekort og forvalter
| Kilde | Funn |
|---|---|
| Inatur | Den viktigste salgskanalen (Statskog, de fleste fjellstyrer, OFA). **Ingen offentlig API, ingen lisens.** Salgsflatene er tegnet polygoner eller fritekst, ikke innsjø-ID. Strukturerte data krever en avtale med Inatur Norge AS |
| Statskog | Norgeskortet gjelder det meste av statsgrunn utenfor statsallmenningene. Et åpent ArcGIS-lag (`ags.statskog.no/…/StatskogEiendom_SK/MapServer/0`, «Statsallmenninger») har eier og kategori, men **ingen oppgitt lisens** og ingen Geonorge-oppføring |
| Fjellstyrene (fjellstyrene.no) | «Finn fjellstyre»-kart med forbehold om at grensene ikke er eksakte. Ingen data, ingen lisens |
| Kartverket matrikkel | Teiger er CC BY 4.0, men **eiere deles ikke**. Fiskerett følger grunneier eller står i grunnboka, så det finnes ingen åpen kilde til hvem som har fiskeretten |
| OFA (Oslomarka) | Utsettingslister med NVE-nummer, men «© OFA» og ingen lisens |
| NJFF, Fiskeguiden, Perfish | Ingen data, ingen lisens. Brukerforum og guider er ikke faktakilde |
| Lakseregisteret og anadrome datasett | NLOD, men bare elver |

GBIF og bruk: CC BY 4.0 og CC0 tillater kommersiell bruk og lokal lagring med kildehenvisning. GBIFs
vilkår krever DOI-sitering. Søke-API-et gir ingen DOI, så en import må gå via GBIFs nedlastings-API
(krever konto) eller en «derived dataset»-DOI.

## Metode og testutvalg
- Datasettmetadata og fasetter i GBIF-API-et: art, år, fylke, status, `establishmentMeans`,
  `samplingProtocol`.
- Huitfeldt-Kaas og spørreskjema-datasettet ble hentet i sin helhet (koblet på vatnLnr).
  Vannmiljøs garn- og trålregistreringer ble også hentet i sin helhet (5 154 registreringer).
- NINA Vanndata fisk kunne ikke hentes i sin helhet. GBIFs søke-API rate-begrenser (HTTP 429), og dype
  offset tok over 90 s. Utvalg: de første 300 per fylke (5 100 registreringer, 2 523 unike punkter).
- Kobling: punkt-i-polygon mot NVE lag 5 via REST, og for punkter utenfor en 150 m-buffer.
- QA: 50 innsjøer i alle landsdeler (store, små, høyfjell, bynære, magasiner, grensesjøer, dublettnavn).
  Alle GBIF-registreringer av 43 ferskvannsarter i innsjøens bbox ble hentet, med telemetri utelatt via
  `basisOfRecord`, og hver ble testet mot polygonet. Resultatet ble sammenlignet med offentlig
  dokumentasjon (rapporter, OFA, fjellstyrer, kommunesider). Wikipedia ble ikke brukt.
- Arbeidsfilene ligger i scratchpad og er ikke lagt i repoet.

## Funn

### Innsjøer: nasjonalt og godt
| | Antall |
|---|---|
| Innsjøer i NVE | 267 194 |
| med navn | 51 405 |
| ≥ 0,03 km² (3 dekar) | 48 182 |
| ≥ 0,1 km² | 19 189 |
| ≥ 1 km² | 2 219 |
| i mer enn én kommune | 4 833 |
| regulert (har magasinnummer) | 2 537 |

Navn er ikke en nøkkel. Av de 2 000 vanligste navnene deles hvert av flere innsjøer, til sammen
15 856. «Langvatnet» finnes 276 ganger, «Storvatnet» 199 og «Svarttjønna» 196.

### Arter: noe nyere data, mye gammelt, tynt i nord
| Kilde | Innsjøer med innsjø-ID | Periode | Kan si «til stede i dag»? |
|---|---|---|---|
| Vannmiljø garn/trål | 441 (470 av 510 lokaliteter ligger inne i et NVE-polygon) | 2008–2025, 251 innsjøer med prøvefiske 2015+ | Nærmest: datert prøvefiske |
| Spørreskjema 2015 | 453 | 2015 | Delvis: 88 % har `establishmentMeans` = «uncertain» |
| Huitfeldt-Kaas | 1 745 | 1902–1918 | Nei |
| NINA Vanndata fisk | Anslagsvis 13 000–16 000 (16 155 distinkte lokalitetsnavn, 80 % koblingsrate) | Toppen ligger 1975–2004. Bare 1 399 registreringer fra 2005 og senere, ingen etter 2011 | Nei, bare «registrert år X» |
| **Med innsjø-ID (unionen av de tre første)** | **2 464** | | |
| **Nyere enn 2015 (Vannmiljø + spørreskjema)** | **874** | | |

Dekning etter størrelse (union med innsjø-ID): 717 av 2 219 innsjøer ≥ 1 km² (32 %), og 1 261 av om
lag 17 000 innsjøer på 0,1–1 km² (7 %).

Regional skjevhet (innsjøer ≥ 0,1 km², nye fylker etter NVEs kommunenummer):
| Fylke | NVE ≥ 0,1 km² | Huitfeldt-Kaas | Nyere (2015/Vannmiljø) |
|---|---|---|---|
| Oslo | 31 | 14 | 4 |
| Akershus | 297 | 126 | 33 |
| Østfold | 146 | 76 | 9 |
| Buskerud | 847 | 83 | 71 |
| Vestfold | 52 | 31 | 2 |
| Telemark | 1 144 | 80 | 82 |
| Agder | 1 782 | 166 | 138 |
| Rogaland | 1 026 | 96 | 50 |
| Vestland | 2 357 | 198 | 107 |
| Møre og Romsdal | 744 | 66 | 31 |
| Innlandet | 1 730 | 329 | 143 |
| Trøndelag | 2 037 | 301 | 100 |
| Nordland | 1 991 | 73 | 31 |
| Troms | 1 163 | 48 | 13 |
| Finnmark | 3 760 | 45 | 57 |

Finnmark har flest innsjøer og minst data per innsjø. Telemark, Agder og Innlandet er best dekket.

### Kobling til fysisk innsjø
- **Huitfeldt-Kaas:** 55 av 60 tilfeldige registreringer har koordinat inne i polygonet med samme
  vatnLnr, 5 ligger utenfor alle polygoner, og ingen ligger i en annen innsjø. vatnLnr-en er pålitelig
  i datasettet, men datasettet sier selv at historiske navn ikke alltid lar seg matche (se Svartediket
  under QA).
- **NINA Vanndata fisk** (600 tilfeldige unike punkter):
  - 483 (80,5 %) ligger inne i én innsjø.
  - 15 har én innsjø innen 150 m, og 3 har flere.
  - 99 (16,5 %) har ingen innsjø innen 150 m: avrundede koordinater, elver og bekker, eller
    «Ukjent» som lokalitet.

  Av treffene inne i en innsjø har 334 samme navn som NVE, 37 har en NVE-innsjø uten navn, og 112 har
  annet navn. De fleste av de 112 er skrivemåter («Breidavatn»/«Breiavatnet»,
  «Tryttavatnet»/«Tryftavatnet»), men noen er en annen innsjø («Torbuvatnet» → «Langvatnet»,
  «Engsetvatnet» → «Fyllingsvatnet»). Det betyr feil koordinat eller feil navn, og vi kan ikke avgjøre
  hvilket.
- **Navnefeller funnet i QA:**
  - «Nøklevann» gir ett treff i NVE, i Indre Østfold. Oslos vann heter «Nøklevannet».
  - «Røssvatnet» gir fire små tjern. Norges nest største innsjø heter «Røsvatnet» i NVE.
  - «Lutvann», «Lundevatn» og «Rostavatnet» finnes ikke under de navnene.
- **Kommunefeltet:** Mjøsa har `kommune` = Ringsaker, selv om den ligger i 7 kommuner. Store Le og
  Rostojávri har tom kommune. Kommune må utledes av geometrien (lag 6 er kommunefordelt).
- **Vannmiljø:** koordinatusikkerheten er hardkodet til 99 m. 40 av 510 lokaliteter ligger utenfor
  innsjøpolygonene (utløp, elv, strand).

### Artssemantikk i dataene
- NINA Vanndata fisk: alt er `PRESENT`, uten fravær og uten opprinnelse.
- Huitfeldt-Kaas: 46 891 fravær og 3 714 til stede, 331 merket «introduced».
- Spørreskjema 2015: `native` 41, `introduced` 71, `uncertain` 853.
- Vannmiljø: bare `PRESENT`, men `samplingProtocol` sier hvordan (garnfiske, trål, el-fiske).
- Ingen kilde har «utdødd» eller «fjernet». At en art er borte (rotenon, forsuring), finnes bare i
  rapporter.

## QA: 50 innsjøer
Datagrunnlag per innsjø:
- **Nyere strukturerte data (prøvefiske 2015+ eller spørreskjema 2015), 25:** Gjersjøen, Mjøsa,
  Femunden, Gjende, Randsfjorden, Storsjøen, Bygdin, Rondvatnet, Selbusjøen, Snåsavatnet, Limingen,
  Aursunden, Hornindalsvatnet, Jølstravatnet, Vangsvatnet, Tyin, Røsvatnet, Altevatnet, Takvatnet,
  Iešjávri, Stuorajávri, Byglandsfjorden, Lundevatnet, Øyeren, Nisser.
- **Bare eldre registreringer eller innbyggerobservasjoner, 23:** blant annet Sognsvann,
  Maridalsvannet (siste prøvefiske 2011), Bjørnsjøen, Theisendammen, Svartediket, Storglomvatnet,
  Prestvannet, Garsjøen, Rore og Store Le.
- **Ingenting brukbart, 2:** et lite Svarttjern i Oslo (én gullfisk) og Ellendalsvatnet i Tromsø.

Sammenlignet med offentlig dokumentasjon:
| Innsjø | Data sier | Offentlig dokumentasjon | Vurdering |
|---|---|---|---|
| Theisendammen (Trondheim) | NINA 1993–2001: gjedde, mort, røye, stingsild, ørret | TOFA: rotenonbehandlet 2016, tømt, gjenåpnet 2019 med utsatt ørret | **Gamle registreringer er feil i dag.** Hovedeksempelet |
| Sognsvann | Huitfeldt-Kaas 1918: abbor, røye, ål, ørekyt. Artsobs til 1998: abbor | OFA 2021: ørret, abbor, gjedde, karuss, stingsild, mort | Data mangler ørret og gjedde, og røye og ål er hundre år gamle |
| Lutvannet | 1918: røye. 2008/2019: canadarøye | OFA 2020: canadarøye (satt ut 1985) og bekkerøye | Data stemmer, men bare med år og «innført» |
| Bjørnsjøen | Bare 1918: abbor, mort, ørekyt | OFA 2021: ørret | **Hovedarten mangler** |
| Svartediket (Bergen) | 1918: gjedde, røye. 1989: ørret | Rådgivende Biologer 1995: bare aure | Mest trolig feil navnematch i 1918-dataene |
| Årungen | Gjedde, abbor, mort, suter, brasme, sørv … og «laks» (NINA 1989) | NINA 2012: gjedde, abbor, mort, suter, gjørs | Gjørs mangler, og «laks» er tvilsom |
| Storglomvatnet | Ørret 1992 | Statsforvalteren 2004: ørret, røye | Ufullstendig |
| Iešjávri | Vannmiljø 2022: 7 arter | Ingen offentlig dokumentasjon funnet | Dataene er bedre enn dokumentasjonen |
| Mjøsa, Øyeren, Femunden, Randsfjorden | 15–25 arter, prøvefiske 2017–2023 | NINA/LFI: 20–25 arter | Stemmer godt |
| Gjende, Rondvatnet, Tyin, Røsvatnet, Takvatnet, Selbusjøen, Hornindalsvatnet, Byglandsfjorden | Prøvefiske 2016–2024 | Fjellstyrer og rapporter | Stemmer. Bleke i Byglandsfjorden er registrert som `Salmo salar` (laks), så navn må vises med forbehold |
| Prestvannet (Tromsø) | Karuss, stingsild | Lokalhistoriewiki: karuss innført 1882 | Stemmer |

**Konklusjon fra QA:**
- Der det finnes datert prøvefiske, stemmer dataene med dokumentasjonen.
- Der det bare finnes eldre registreringer, var 5 av 9 kontrollerte innsjøer gale eller ufullstendige
  på en måte en lokalkjent ville sett med en gang.

## Semantikk og ordlyd
Bevistyper, fra sterkest til svakest:
1. **Prøvefiske** (Vannmiljø garn/trål, med år): «Påvist ved prøvefiske 2022: røye, ørret, ørekyt».
2. **Spørreskjema/kartlegging** (2015, med `establishmentMeans`): «Registrert i kartlegging 2015».
   «Innført» vises når kilden sier det.
3. **Enkeltregistrering** (NINA, DNA-bank, Artsobservasjoner): «Registrerte observasjoner: abbor
   (1998), gjedde (1989)». Alltid med år.
4. **Historisk** (Huitfeldt-Kaas): «Nevnt i 1918: …». Vises ikke på `/omrade`.
5. **Utsatt:** ingen åpen strukturert kilde, så det vises ikke.
6. **Forventet/sannsynlig:** vises aldri.
7. **Ukjent:** «Vi har ingen registreringer av fisk i dette vannet». Ikke «ingen fisk».

Regler:
- Aldri «Det finnes ørret her» eller «Arter:» uten verb og år. «Dokumenterte arter» brukes bare for
  type 1 og 2 og med årstall.
- Fravær vises aldri som fakta («ikke registrert» er ikke «finnes ikke»).
- Én art = én linje med sterkeste bevis og siste år. Svakere bevis skjules når sterkere finnes.
- En registrering eldre enn ~20 år viser året tydelig. Eldre enn 1950 vises bare i en utforsker, ikke
  på `/omrade`.
- Artsnavn kommer fra en kontrollert liste. Vitenskapelig navn brukes når norsk navn er tvetydig
  (bleke/laks, canadarøye/røye).
- Ingen vurdering av vannet («bra fiskevann»), ingen fangstsjanse og ingen rangering.

## Foreslått datamodell (ikke bygget)
- `water_bodies`: `vatnlnr` (PK), navn, høyde, areal, geometri (forenklet), regulert, grensesjø,
  `source_updated_at`.
- `water_body_municipalities`: fra NVE lag 6 (kommunefordelt).
- `water_body_names`: alias fra Stedsnavn (`stedsnummer`) og kildenes egne navn, koblet romlig.
- `water_body_source_ids`: `vatnlnr` ↔ vannforekomst-ID, Vannmiljø-lokalitet og NOFA-ID, med
  `match_method` (`source_id` | `point_in_polygon` | `buffer_150m` | `name_and_municipality`) og
  `match_confidence`.
- `fish_evidence`: én rad per kildeoppføring, med
  - `vatnlnr`, `taxon` (kontrollert liste), `evidence_type`
    (`survey_netting` | `inventory` | `observation` | `specimen` | `historical`),
  - `status` (`present` | `absent`), `establishment` (`native` | `introduced` | `uncertain` | null),
  - `observed_year`, `source_dataset`, `source_record_id`, `source_license`, `source_updated_at`,
    `match_method`.
- Visningsregelen («sterkeste bevis, siste år») ligger i en RPC, ikke i tabellen. Kildedata
  overskrives ikke.
- `fishing_management` (egen tabell, egen runde): `vatnlnr` eller område, `manager`, `manager_type`,
  `fishing_info_url`, `fishing_permit_url`, `source`, `verified_at`. **Den kobles aldri til
  `fish_evidence`.** Et fiskekort sier ingenting om hvilke arter som finnes.

## Negative funn
- Ingen åpen kilde kobler innsjø → rettighetshaver → fiskekort. Inatur har ingen API og ingen lisens.
  Statskogs lag har ingen lisens. Matrikkelen deler ikke eiere.
- Ingen åpen strukturert kilde for utsettinger eller for arter som er borte.
- NINA Vanndata fisk har ingen innsjø-ID, ingen fravær, ingen opprinnelse og ingen registreringer
  etter 2011.
- GBIF-søk på `classKey=204` (strålefinnefisk) gir 0. Backbone-en mangler klasse for fisk, så det må
  filtreres på arts- eller ordensnøkler.
- Ørret i GBIF domineres av telemetri (over 1 million registreringer i fjorder og elver).
- Vannmiljøs eget API krever nøkkel. Vannmiljøs nettside blokkerer curl (WAF).
- Artskart dropper vannforekomstkoden og ignorerer lon/lat-`bounds` uten feilmelding.

## Begrensninger
- NINA-dekningen er et anslag fra utvalg, ikke en full koblingskjøring.
- QA-fasiten er offentlige dokumenter av varierende alder, og noen var bare tilgjengelige som
  søkeutdrag.
- QA-hentingen for Mjøsa og Store Le stoppet ved 3 000 registreringer i bbox.

## Produktvurdering
1. **Kan vi lage en god første versjon?** Ja, for innsjøer. For arter bare som en smal, ærlig versjon:
   om lag 870 innsjøer har nyere data, og de ligger skjevt (sør og øst).
2. **Trygt nasjonalt:** nærmeste innsjøer med navn, areal, høyde, regulert/ikke regulert og
   kommune(r), fra NVE. Det er fakta for alle 267 000.
3. **Bare der det er dokumentert:** arter med bevistype og år, primært prøvefiske og kartlegging 2015.
   Eldre enkeltregistreringer bare som «registrerte observasjoner (år)», helst bare i utforskeren.
4. **Rekkefølge:** først vann, så vann + arter (begrenset til type 1–3 med år), og vann + arter +
   fiskekort først etter en avtale med Inatur eller lisensavklaring med Statskog. Inntil da kan vi
   lenke til Inatur-søk uten å påstå hvilket kort som gjelder.
5. **Egen `/fiske`-utforsker?** Ikke ennå. Med 874 av 19 000 innsjøer ≥ 0,1 km² med nyere data blir
   kartet for det meste tomt, og tomhet leses som «ingen fisk». Vurderes når vi har fullimport og
   koblingsrate per fylke.
6. **På `/omrade`:** en kort liste over 3–5 nærmeste vann (navn, avstand, areal). Arter bare der
   prøvefiske eller kartlegging finnes, med «Påvist ved prøvefiske 2022: …». Ellers ingenting om arter,
   ingen «ukjent» per vann og ingen fiskekortlenke.

## Hva vi bevisst ikke gjorde
Ingen database, ingen UI, ingen import og ingen scraping (Inatur, OFA, fjellstyrer). Brukerforum er
ikke brukt som faktakilde. Ingen vurdering av vann, ingen fangstsjanse og ingen arter uten
dokumentasjon. Ingen ADR.

## Åpne spørsmål
- Skal vi be Statskog om lisens for statsallmenning-laget, og Inatur om en dataavtale?
- Skal vi be Miljødirektoratet om API-nøkkel til Vannmiljø? Det gir vannforekomst-ID direkte.
- GBIF-konto for nedlasting med DOI ved en eventuell import.
- Hvor gammel kan en registrering være før den ikke vises på `/omrade`? (Forslaget her: 2005.)

## Hva som kan utløse ny vurdering
Et åpent fiskekort- eller forvalterdatasett, et nasjonalt prøvefiskeprogram med innsjø-ID, eller at
NOFA (NINAs innsjø-fiskedatabase) publiseres med vatnLnr og opprinnelse.
