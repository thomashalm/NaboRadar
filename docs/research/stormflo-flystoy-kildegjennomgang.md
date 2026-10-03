# Stormflo og flystøy: kilde- og QA-gjennomgang

> Undersøkt 2026-10-03. **Gjennomført samme dag** (se §10 og [ADR 015](../adr/015-publikumsprodukt-wms-og-kildefeil.md)):
> stormflo og flystøy spør nå WMS-ene, med sjø/land-kontroll, lufthavnnavn og delvis cache. Seksjon 1–9 er
> researchen slik den ble skrevet før endringen.
> Utløst av at `/omrade` viste «Disse kildene svarte ikke akkurat nå: Stormflo og havnivå,
> Flystøysoner» på alle adresser.
>
> **Konklusjon i én linje:** begge WFS-tjenestene er nede på grunn av en driftsfeil hos Geonorge, og
> de er ikke avviklet. Etatenes egne publikumskart bruker likevel ikke WFS-en. Stormflo bør følge
> Kartverkets publikumskart (WMS `GetFeatureInfo`), og flystøy bør bruke Geonorge-WMS-en, som gir
> samme svar som Avinors publikumskart i 200 av 200 kontrollpunkter.

## 1. Dagens implementasjon

| | Stormflo og havnivå | Flystøysoner |
|---|---|---|
| Kode | `KartverketStormfloLookup` i `lib/facts/lookups/naturfare.ts` | `FlystoyLookup` i `lib/facts/lookups/stoy.ts` |
| Endepunkt | `https://wfs.geonorge.no/skwms1/wfs.stormflo_havniva` | `https://wfs.geonorge.no/skwms1/wfs.stoylufthavn` |
| Spørring | WFS 2.0 `GetFeature`, `resulttype=hits`, `Intersects`-filter på `app:område`, punkt i EPSG:4326 | WFS 2.0 `GetFeature`, `typeNames=app:Støy`, bbox ±0,00002° (ca. 2 m) rundt punktet |
| Lag | `app:StormfloØvreEstimat_KlimaÅr2150` (port), `app:Stormflo20År_KlimaÅrNå`, `app:Stormflo200År_KlimaÅrNå`, `app:Stormflo200År_KlimaÅr2100` | `app:Støy` |
| Tolkning | Treffer ikke porten: ingenting. Ingen scenarioer: «Ikke berørt av kartlagte stormflonivåer». Ellers laveste gjentaksintervall i dag, og 200-års i 2100 | Første `støysonekategori` i svaret (R → rød, ellers gul), `støykildenavn` som «lufthavn», `beregnetÅr` |
| Seksjon | Naturfare (`grunnforhold`) | Støy |
| Tekst | «Kan bli berørt av stormflo (20-årsnivå)» + «Eiendommen ligger innenfor arealet …» | «Rød/Gul flystøysone (T-1442)» + «<støykildenavn> · beregnet <år>» |
| Tid | 5 s per kall, 1 nytt forsøk, 4 kall parallelt | 6 s, ingen nye forsøk |
| Feil | Kastes. `runLookups` legger kilden i `unavailableSources`, og siden viser «svarte ikke akkurat nå» | Samme |
| Cache | Hele oppslagssettet caches bare når **alle** oppslag lyktes (`lookupCache`, `lib/facts/queries.ts`) | Samme |

## 2. Hva som er galt (målt 2026-10-03, 10:15–13:10 UTC)

Alle kall mot de to WFS-tjenestene gir HTTP 500 etter ca. 3 s, også `GetCapabilities` og
`DescribeFeatureType`. Feilsiden er en Tomcat-side med meldingen:

- `wfs.stormflo_havniva`: **«Connect to rin-ap2261:8081 timed out»**
- `wfs.stoylufthavn` og `wfs.stoysonerforsvaretsflyplasser`: **«Connect to kv-vm-00594:8081 timed out»**

Andre WFS-er hos Geonorge (`wfs.elveg`) svarer 200. WMS-tjenestene for de samme datasettene
svarer 200.

**Midlertidig eller permanent?** Dette er en driftsfeil: Geonorges WFS-front når ikke to interne
bakmaskiner. Begge WFS-ene står fortsatt i Geonorge-katalogen med samme URL, og ingen er merket som
erstattet. Geonorge hadde ingen driftsmelding. Men:

- Stormflo-WFS-en står med status **«Under arbeid»** i katalogen, mens WMS-en er «Kontinuerlig
  oppdatert».
- Datasettet kom i ny utgave 2026-09-06, og objektene har `oppdateringsdato` 2026-10-02.
- WMS-lagene har nye navn (`stormflo200ar_klimaar2100`), mens WFS-koden vår bruker
  `Stormflo200År_KlimaÅrNå`. De interne objekttypene heter fortsatt det samme
  (`objtype=Stormflo200År_KlimaÅr2100` i WMS-svaret). At WFS-ens typenavn er uendret, kan ikke
  bekreftes mens den er nede.

**Følgefeil hos oss:** fordi to oppslag feiler, caches ingen områdeoppslag (se tabellen over).
Hver visning av `/omrade` kjører alle oppslagene på nytt og venter i opptil ~6 s på de to som
feiler. Feilene logges bare med `console.warn`; ingenting i admin viser dem.

## 3. Hva etatene selv publiserer

### Stormflo: Kartverket «Se havnivå i kart»
`https://kartverket.no/til-sjos/se-havniva/kart`. Kartet kaller:

- `wms.geonorge.no/skwms1/wms.stormflo_havniva`: `GetMap` og `GetFeatureInfo` på
  `stormflo200ar_klimaar2100` (standardvalg) og `dekningsomrade`
- `kartverket.no/api/floodedAreas/...`: statistikk over berørte bygg, veier og areal
- `kartverket.no/api/tidegauges`: vannstandsmålere

Valgene i kartet: sikkerhetsklasse **F1 (20-års), F2 (200-års), F3 (1000-års), Øvre estimat**, og
havnivå **Nå** eller **2100**. Kartet sier selv at bølger ikke er med, at landheving er tatt hensyn
til, og at tjenesten «passer ikke til detaljerte studier og for å ta avgjørelser på detaljnivå».

**Publikumsproduktet er WMS-en**, ikke WFS-en.

### Flystøy: Avinor «Støysonekart»
Produktlenken i Geonorge-katalogen (`avinor.maps.arcgis.com/apps/Viewer/...`) er en utgått ArcGIS-app
(«Item Replacement»). Avinor.no lenker nå til `https://experience.arcgis.com/experience/ed39c47ac2df499f8926b69866c0eadc`,
som henter sonene fra Avinors egen ArcGIS-tjeneste:

`https://services-eu1.arcgis.com/WCiVfG6duh6vR43N/arcgis/rest/services/Stoysoner_AVIGIS_v2/FeatureServer`
(lag 2 «Støysoner - flater»: `ICAO`, `STOYSONEKATEGORI`, `BEREGNETAAR`, `STOYKILDENAVN`; sist endret
2026-10-03 01:02, synkroniseres om natten; tjenestebeskrivelse «Støysonekart - avigistest»; ingen
lisens oppgitt på tjenesten).

### Forsvarets flyplasser: Forsvarsbygg
Eget datasett, «Støysoner for Forsvarets flyplasser» (NLOD, oppdatert 2026-05-06), WMS og WFS på
Geonorge. WFS-en er nede av samme grunn som Avinors. **NaboRadar bruker ikke dette datasettet.**

## 4. Lisens og vilkår

| Datasett / tjeneste | Lisens i Geonorge-katalogen |
|---|---|
| Stormflo og havnivå (datasett), WFS | NLOD |
| Stormflo og havnivå WMS | CC BY 4.0 |
| Støysoner Avinors lufthavner (datasett, WFS, WMS) | «No conditions apply» (åpne data) |
| Avinors ArcGIS-tjeneste `Stoysoner_AVIGIS_v2` | ikke oppgitt |
| Støysoner for Forsvarets flyplasser | NLOD |

Alle er åpne. Kreditering: Kartverket, Avinor, Forsvarsbygg.

## 5. Semantikk

### Stormflo
- **Hva laget er:** modellert areal som kan bli oversvømt ved en høy vannstand, i polygoner
  (målestokk ca. 1:80 000). Kartverket kaller det selv et **aktsomhetskart**, ikke egnet for
  detaljerte analyser.
- **Scenarier:** 20-, 200- og 1000-års stormflo (= sikkerhetsklasse F1/F2/F3 i TEK17), og «øvre
  estimat» (TEK17 § 7-2 første ledd). Med dagens havnivå, eller med klimapåslag til 2100 eller 2150
  (SSP3-7.0, 83-prosentil, inkludert landheving). Kildene er DSBs veileder
  «Havnivåstigning og høye vannstander i samfunnsplanlegging» (2024) og «Sea-Level Rise and
  Extremes in Norway» (2024).
- **Egenskaper per treff:** `sikkerhetsklasseflom` (F1/F2/F3) og `vannstandovernn2000` (cm over
  NN2000, lokal verdi), for eksempel 20-års i dag 160 cm i Oslo og 100 cm i Stavanger, 200-års i
  2100 220–270 cm.
- **Polygonene dekker sjøen også.** Et punkt i sjøen treffer alle scenarier, også 20-års i dag.
  Laget `middelhoyvann_klimaarna` er sjøen innenfor dagens middel høyvann, og skiller sjø fra land.
  Dagens kode sjekker ikke dette.
- **`dekningsomrade`** dekker innlandet også (Elverum), og vises bare i oversiktsmålestokk
  (`MinScaleDenominator` 80 000). Den er ubrukelig som port. Det samme fant vi med WFS-en tidligere.
- **Målestokkfelle:** scenariolagene har `MaxScaleDenominator` 80 000. `GetFeatureInfo` med en for
  stor bbox gir **tomt svar** selv der arealet er oversvømt. Spørringen må gjøres i detaljmålestokk
  (vi brukte bbox ±0,00005° og 3×3 px).
- **Et treff ved en adresse** betyr at adressepunktet ligger innenfor det modellerte arealet for
  scenarioet. Det sier ikke noe om bygget, bølger eller lokale forhold.

### Flystøy (Avinor)
- **Hva laget er:** gul og rød støysone etter retningslinje T-1442, én eller flere flater per
  lufthavn, `STOYKILDE=F` (fly). Ikke Lden-intervaller og ikke strategisk støykart.
- **Dekning:** 124 flater for **44 lufthavner** (ICAO-koder, deriblant ENGM, ENBR, ENZV, ENVA, ENTC,
  ENBO, ENEV og ENRY Rygge). Forsvarets flyplasser (blant annet Ørland) er ikke med.
- **År:** `BEREGNETAAR` er 2007–2023, og 18 av 124 flater har ikke år. Gardermoen 2022, Flesland
  2021, Sola 2020, Værnes 2023, Tromsø 2019 og Bodø 2016.
- **Sonene er adskilte:** gul er en ring rundt rød. Ingen kontrollpunkter traff begge.
- **`STOYKILDENAVN` er ICAO-koden** («ENBO»), ikke navnet. NaboRadar viser feltet som «lufthavn»,
  slik at brukeren ville sett «ENBO · beregnet 2016».

### Flystøy (Forsvarsbygg)
Rikere felt: `stoykildeidentifikasjon` («Ørland lufthavn»), `stoyintervall` (Lden 62),
`stoymalemetode` (NORTIM 4.1.004), referanse (SINTEF-rapport 2024:01297), og `beregnetar` **2031**,
som er et **prognoseår**. Kortteksten vår, «beregnet <år>», ville vært misvisende her.

## 6. QA

Skript og rådata ligger i arbeidskatalogen for økten. Tallene står her.

### Stormflo: WMS `GetFeatureInfo` mot Kartverkets eget kartbilde (`GetMap`, samme lag)
**Utvalg 1: 27 steder.**

- **Oslofjorden:** Bjørvika, Aker brygge, Sandvika, Drøbak, Grünerløkka, Holmenkollen.
- **Bergen:** Bryggen, Sandviken, Laksevåg, Fløyen.
- **Stavanger:** Vågen, Våland.
- **Trondheim:** Solsiden, Brattøra, Bakklandet, Tyholt.
- **Tromsø:** Storgata, Tromsdalen, Prestvannet.
- **Kristiansand:** Fiskebrygga, Kvadraturen, Lund.
- **Høyt ved kysten:** Preikestolen (348 m), Ulriken (630 m).
- **Innland:** Elverum, Lillehammer, Lillestrøm.

| Resultat | |
|---|---|
| Punktoppslag = kartbilde | **27 av 27** |
| Treff ved terreng over 4 m | 0 (ingen falske positive i høyden) |
| Treff i innlandet eller på høye kontrollpunkter | 0 |
| Punkter som lå i sjøen (Laksevåg, Fiskebrygga) | treffer alle scenarier, også 20-års i dag (se semantikk) |

**Utvalg 2: 14 lave landpunkter (0,4–2,0 m, `dtm1`) ved Bergen, Oslo, Kristiansund, Stavanger og
Tromsø.**

| Resultat | |
|---|---|
| Punktoppslag = kartbilde | **13 av 14**. Avviket er én piksel på kystlinjen i Stavanger (0,41 m), der kartbildet tegner middel høyvann og punktoppslaget ikke |
| Treff på 20- og 200-års i dag | ja, ved 0,7 m terreng (Bjørvika, Stavanger) |
| Vannstand mot terreng | konsistent i alle: treff bare der terrenget er under scenarioets vannstand |
| Kaipunkt i Tromsø (0,48 m) | ligger innenfor middel høyvann, altså sjø etter Kartverkets modell |

Ikke kontrollert: WFS mot WMS, fordi WFS-en er nede.

### Flystøy: Geonorge-WMS `GetFeatureInfo` mot Avinors publikumstjeneste
**Utvalg 1: 24 punkter.**

- Røde og gule soner ved Gardermoen, Flesland, Sola, Værnes, Tromsø og Bodø.
- Stjørdal, Bodø sentrum, Rygge og Evenes.
- Negative: Oslo, Bergen, Sandnes, Tromsø sentrum, Jessheim, Nannestad og Lillehammer.
- Ørland.

| Resultat | |
|---|---|
| Samme sonekategori i begge | **24 av 24** |
| Treff der Avinors kart har treff | alle |
| Ingen treff der Avinors kart ikke har treff | alle |
| Ørland | ingen sone hos Avinor; **rød sone hos Forsvarsbygg** |
| Rygge | rød sone hos både Avinor (2014) og Forsvarsbygg |

**Utvalg 2: grensetest.** Fire retninger fra rød sone ved seks lufthavner, steg på 250 m opptil 6 km,
og ved hver overgang fire punkter innenfor ±15 m av grensen.

| Resultat | |
|---|---|
| Grensepunkter | 176 |
| Avvik mellom Avinors tjeneste og Geonorge-WMS | **0** |

## 7. Begrensninger
- Varigheten av nedetiden er ukjent. Vi lagrer ikke oppslagsfeil. Observert 10:15–13:10 UTC
  2026-10-03.
- Stormflolagene er modellert i målestokk 1:80 000 og kan være upresise ved kai og strandkant.
  Kartverket sier selv at datasettet forbedres fortløpende.
- Avinors egen tjeneste har ingen oppgitt lisens og «test» i beskrivelsen. Den egner seg som
  kontroll, ikke som kilde.
- Det er ikke kontrollert om Forsvarsbyggs og Avinors soner overlapper andre steder enn Rygge.

## 8. Anbefaling (slik den ble levert, før beslutning)
- **Stormflo: bytt endepunkt og fiks semantikken.**
  - Bruk WMS `GetFeatureInfo` mot de samme lagene som Kartverkets publikumskart:
    `stormflo20ar_klimaarna`, `stormflo200ar_klimaarna`, `stormflo200ar_klimaar2100`, med
    `stormfloovreestimat_klimaar2150` som port. Spørringen må gjøres i detaljmålestokk.
  - Legg til en sjekk mot `middelhoyvann_klimaarna`: et punkt i sjøen skal ikke få «20-årsnivå».
  - Vannstanden over NN2000 kan vises senere.

  Begrunnelse: det er produktet Kartverket publiserer (ADR 008), WMS-en er «Kontinuerlig
  oppdatert», og den svarer nå.
- **Flystøy: bytt endepunkt og fiks visningen.**
  - Bruk Geonorge-WMS `stoylufthavn_wms` med `GetFeatureInfo`. Det er den formelle, åpne
    distribusjonen, og den ga 200 av 200 samme svar som Avinors publikumskart.
  - Vis lufthavnens navn, ikke ICAO-koden.
  - Behold Avinors ArcGIS-tjeneste som QA-referanse.
- **Forsvarsbygg:** egen beslutning. Det er et dekningshull (Ørland m.fl.), men en ny kilde med
  prognoseår krever egen ordlyd.
- **Feilhåndtering:**
  - Behold «svarte ikke akkurat nå» for midlertidige feil.
  - Cache de oppslagene som lyktes, selv om ett feiler, så én nede kilde ikke gjør hele siden treg.
  - Registrer oppslagsfeil, så admin kan se en kilde som har vært nede lenge.
  - Ikke skjul en kilde automatisk.

## 9. Gamle endepunkter (bevart)
- Stormflo WFS: `https://wfs.geonorge.no/skwms1/wfs.stormflo_havniva`, `app:<Type>`, `app:område`,
  `resulttype=hits`. Typene: `StormfloØvreEstimat_KlimaÅr2150`, `Stormflo20År_KlimaÅrNå`,
  `Stormflo200År_KlimaÅrNå`, `Stormflo200År_KlimaÅr2100`. Geometrispørringen ga 3,2 MB; `hits` ga ~50 byte.
- Flystøy WFS: `https://wfs.geonorge.no/skwms1/wfs.stoylufthavn`, `app:Støy`, punktfilter blokkert,
  bbox ±2 m; felt `støysonekategori`, `støykildenavn`, `beregnetÅr`.

## 10. Gjennomført 2026-10-03

Punkt 1, 2 og 4 i anbefalingen ble gjennomført. Forsvarsbygg tas i en egen runde.

**Kode:**

- `lib/facts/lookups/wms.ts`: felles WMS-punktoppslag.
  - Eksplisitt akserekkefølge per CRS.
  - Detaljmålestokk.
  - Bare gyldig `msGMLOutput` kan bety «ingen treff».
- `KartverketStormfloLookup` (WMS, ett kall for fem lag) og `FlystoyLookup` (WMS, EPSG:4326).
- `lib/facts/lufthavner.ts`: navn fra Avinors kart, og ENRY uten navn.
- `lib/facts/lookup-runner.ts`: cache per kilde, og 30 s pause etter feil.
- Migrasjon `20261031000000_lookup_source_status.sql` og `npm run lookups:check` i sync-jobben, med
  visning i `/admin`.

**Nytt funn under implementeringen:** Avinor-WMS-en navngir svarblokken `stoylufthavn_layer`, ikke
`stoylufthavn_wms_layer` som laget vi spør etter. Enhetstesten med påfunnet svar fanget det ikke, men
nettverkstesten gjorde. Flystøyoppslaget leser nå alle blokkene i svaret, siden det bare spør etter
ett lag. Testene bruker det ekte blokknavnet.

**Begrepet «beregnetÅr»:** SOSI-spesifikasjonen for støy (§ 3.3.7) sier at feltet «angir hvilket
beregningsår som ligger til grunn for støysonene» og «må ikke forveksles med når selve beregningene er
utført». Kortet sier derfor «beregningsår 2022», ikke «beregnet 2022».

### QA gjennom den nye koden
**Stormflo:** 41 punkter (utvalg 1 og 2), med fasit fra Kartverkets kartbilde og regelen
sjø → ingenting, ikke øvre estimat → ingenting, øvre uten scenario → «ikke berørt».

| Resultat | |
|---|---|
| Som forventet | **40 av 41** |
| Avvik | Stavanger Vågen, 0,41 m: kartbildet tegner middel høyvann (sjø) i pikselen, mens punktoppslaget sier land. NaboRadar viser 20-års i dag og 200-års i 2100. Det er et grensepunkt på strandkanten, der Kartverkets eget punktoppslag er fasiten vi følger |
| Sjøpunkter (Laksevåg, Fiskebrygga, kaipunkt Tromsø) | ingen uttalelse |
| Innland, høyt ved kysten, høye kontroller | ingen uttalelse |

**Flystøy:**

| Resultat | |
|---|---|
| 24 kontrollpunkter mot Avinors publikumstjeneste | **24 av 24** |
| 60 tilfeldige punkter 0–6 km fra seks lufthavner | **60 av 60** |
| Navn vist | Oslo lufthavn, Gardermoen · Bergen lufthavn, Flesland · Stavanger lufthavn, Sola · Trondheim lufthavn, Værnes · Tromsø lufthavn, Langnes · Bodø lufthavn · Harstad/Narvik lufthavn, Evenes |
| Rygge | rød sone, uten lufthavnnavn |
| Ørland | ingen uttalelse — **dekningshull**, ikke «ingen flystøy». Siden sier aldri «ingen flystøy», og metodeteksten for Avinor-kilden sier at Forsvarets flyplasser ikke er med |

**Nettverkstester** (`RUN_NETWORK_TESTS=1`) mot de ekte tjenestene, alle grønne:

- Bjørvika (20-års i dag), Bryggen (bare 2100), sjø, Fløyen og Majorstuen for stormflo.
- Gardermoen med navn, og Majorstuen uten sone, for flystøy.

Ikke relatert: `udir-skoler` svarte ikke på helsesjekk samme dag.

### Ytelse
**Før**, i produksjon med gammel kode, med stormflo- og flystøy-WFS nede, per besøk til siste byte:

| | Tid |
|---|---|
| Første besøk | 11,4 s |
| Alle senere, også samme adresse | 7,0–7,1 s, fordi ingenting ble cachet |

**Etter**, lokalt (`next start` mot produksjonsdata, eksterne kall telt):

| | Alle kilder oppe | Stormflo og flystøy simulert nede (500 etter 3 s) |
|---|---|---|
| Første besøk, kald cache | 0,5–0,65 s · 16 eksterne kall | 6,3 s · 18 kall (begge prøves to ganger) |
| Ny adresse innenfor pausen | — | 0,55–0,67 s · 14 kall (de to som feiler, spørres ikke) |
| Samme adresse igjen, varm cache | 0,1–0,45 s · **0 kall** | 0,1–0,4 s · **0 kall**, fortsatt med «svarte ikke» |

### Driftsobservasjon
Første `npm run lookups:check` mot produksjon 2026-10-03: alle ni kildene OK. Status per kilde
vises på `/admin` under «Direkte oppslag».
