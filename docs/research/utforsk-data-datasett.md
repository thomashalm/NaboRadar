# Utforsk data: hvilke datasett bør inn

> Produkt- og datareview, 2026-10-04.
> **Delvis bygget samme dag:** plansaker, kraftnett, forurenset grunn (bare admin) og to lag
> samtidig. Dagens løsning står i [håndboka](../naboradar-handbook.md) under «Utforsk data».
> Resten av anbefalingen er ikke bygget.
> Utgangspunkt: `/admin/research/utforsk` har kvikkleire og datasentre.

## Hva vi har

Lokalt i databasen (tall fra produksjon):

| Datasett | Antall | Geometri | Publisert | Lesevei i dag |
|---|---|---|---|---|
| Plansaker (DiBK planoppstart) | 1 563, alle med tiltakstype, 934 med formål | flater | ja | `events_within` (radius) |
| Kraftnett (NVE): kraftledninger og transformatorstasjoner | 5 656 | linjer og punkter | ja | `features_near` |
| Forurenset grunn (Miljødirektoratet) | 15 974 | flater | nei, internt | `features_near` for admin |
| Kartlagte kvikkleiresoner (NVE) | 4 865 | flater | ja | i Utforsk data |
| Barnehager / skoler (Udir) | 4 493 / 3 101 | punkter | ja | `features_near` |
| Hytter (kanoniske) | 1 653 | punkter | ja | `huts_in_bbox`, `huts_in_municipality` |
| Skjenkesteder (Oslo) | 1 406 | punkter | ja | `features_near` |
| Industri med utslippstillatelse | 865 | punkter | ja | `features_near` |
| Tilfluktsrom | 556 | punkter | ja | `features_near` |
| Omsorgstilbud / sykehus | 367 / 80 | punkter | ja | `features_near` |
| Skolekretser (Oslo) | 105 | flater | ja | `features_near` |
| Research-funn | ca. 270, hvorav 128 datasentre | punkter | nei | `research_map` |

Ikke lokalt — slås opp direkte hos kilden per punkt: aktsomhet kvikkleire, flom, skred, radon,
stormflo, strategisk støy, støyvarselkart veg, flystøy, høyspent distribusjonsnett (141 000
linjer), og eiendom/bygg fra Kartverket.

Alt som ligger i `area_features` kan leses av `explore_area_features` uten ny database­kode.
Plansaker og hytter ligger i egne tabeller. De direkte oppslagene har ingen flater hos oss.

## Vurdering

Skala 1–5. Kostnad: 1 = nesten gratis. Sensitivitet: 1 = ufølsomt.

| Datasett | Research | Kart | Datakvalitet | Kostnad | Sensitivitet | Admin | Åpent kart | `/omrade` |
|---|---|---|---|---|---|---|---|---|
| Plansaker | 5 | 5 | 3 | 2 | 1 | ja | ja, senere | ja (i dag) |
| Kraftnett | 4 | 5 | 4 | 1 | 2 | ja | kanskje | ja (i dag) |
| Forurenset grunn | 4 | 4 | 4 | 1 | 2 | ja | nei (besluttet) | nei (besluttet) |
| Skoler og barnehager | 3 | 3 | 3 | 1 | 1 | ja | ja | ja (i dag) |
| Tilfluktsrom | 2 | 3 | 5 | 1 | 1 | ja | ja | ja (i dag) |
| Industri med utslippstillatelse | 3 | 3 | 4 | 1 | 1 | ja | ja | ja (i dag) |
| Øvrige research-funn | 3 | 3 | 2 | 2 | 4 | ja | nei | nei |
| Naturfare som kartbilde (flom, skred, aktsomhet, stormflo) | 4 | 5 | 4 | 4 | 1 | ja | ja, senere | ja (i dag, per punkt) |
| Støy som kartbilde | 4 | 5 | 3 | 4 | 1 | ja | ja, senere | ja (i dag, per punkt) |
| Omsorg og sykehus | 2 | 2 | 3 | 1 | 4 | ja | nei | ja (i dag) |
| Skolekretser | 2 | 3 | 4 | 1 | 1 | ja | Oslo | ja (i dag) |
| Hytter | 2 | 3 | 4 | 2 | 1 | ja | finnes (`/hytter`) | ja (i dag) |
| Skjenkesteder | 1 | 2 | 3 | 1 | 1 | ja | nei | ja (i dag) |
| Militære objekter | 1 | 1 | 2 | 2 | 5 | nei | nei | nei |
| Eiendom og bygg | 3 | 2 | 4 | 4 | 3 | senere | nei | ja (kartklikk i dag) |

### Merknader

- **Plansaker** er det datasettet det finnes minst oversikt over geografisk i dag. `/omrade`
  viser dem rundt én adresse; ingen flate viser «alle plansaker i Bærum» eller «alle med
  tiltakstype bolig». Datakvaliteten er ujevn: formål mangler for 40 %, og dekningen varierer
  mellom kommuner — nettopp derfor er kartvisning nyttig for å se hull.
- **Kraftnett** er det billigste av de verdifulle: ligger i `area_features`, og trenger bare
  linjestil i kartlaget. Verdien øker kraftig i kombinasjon med datasentre og plansaker.
- **Forurenset grunn** er besluttet internt. Utforsk data er stedet det skal bo — i dag ses det
  bare rundt én adresse i admins adressevisning.
- **Skoler og barnehager** har lav kartverdi alene, men høy QA-verdi etter skolefilteret:
  hvilke enheter er skjult, hvor mangler trinn, hvor ligger eksamenskontorene.
- **Naturfare og støy** er det mest visuelt nyttige vi ikke har som flater. De finnes bare som
  punktoppslag. Å vise dem krever etatenes kartbilder oppå kartet, som betyr en ny lagtype og
  at sikkerhetspolicyen for bilder åpnes for NVE, Kartverket og Miljødirektoratet. Én gang
  bygget, dekker den alle fem–seks kildene.
- **Militære objekter:** 17 research-funn, hvorav 13 er kulturminner. Lav verdi, høy
  sensitivitet. Ikke verdt et eget lag. De er allerede søkbare i research-kartet.
- **Hytter** har eget offentlig kart og egen adminkontroll. Marginal gevinst.
- **Eiendom og bygg** er kartklikk mot Kartverket. Nyttig som tillegg senere, ikke som datasett.

## Kombinasjoner

Utforsk data viser ett datasett om gangen. Flere av datasettene er mest verdt sammen:

- **Datasenter + kraftnett:** ligger anlegget ved en transformatorstasjon eller regionalnett?
- **Plansaker + kvikkleire:** planoppstart i eller ved en kartlagt sone.
- **Plansaker + kraftnett:** planområder krysset av kraftledninger.
- **Plansaker + forurenset grunn:** utbygging på registrert lokalitet.
- **Skoler + støy:** krever støy som kartbilde.

Det taler for å bygge «to lag samtidig» etter at de neste datasettene er inne, ikke før.

## Anbefaling

### Nå
1. **Plansaker.** Størst researchverdi, og ingen geografisk oversikt finnes. Trenger en avgrenset
   admin-lesefunksjon for `events` (samme mønster som `explore_area_features`) eller en liten
   utvidelse av den. Opplevelse: «planer Bærum» → planområdene som flater, listen med
   tiltakstype og formål, panel med status, dato, dokumenter og lenke til saken.
2. **Kraftnett.** Nesten gratis, og nøkkelen til de beste kombinasjonene. `nve-nettanlegg` i
   `area_features`, lest med `explore_area_features`. Opplevelse: «kraftlinjer Oslo» → linjer og
   transformatorstasjoner, panel med spenning, eier og navn.
3. **Forurenset grunn.** Internt datasett uten et sted å bo. Samme vei som kvikkleire.
   Opplevelse: «forurenset grunn Trondheim» → lokaliteter som flater, panel med myndighetens
   vurdering, påvirkningsgrad og lenke til faktaarket.
4. **Skoler og barnehager, med filterstatus.** QA-verktøyet skolefilteret mangler. Samme vei,
   pluss `school_units`. Opplevelse: «skoler Lørenskog» → alle enheter, skjulte i egen farge,
   panel med trinn, næringskode og hvorfor enheten eventuelt ikke vises offentlig.
5. **To lag samtidig.** Ikke et datasett, men det som gjør 1–3 verdt mer enn summen.

Tilfluktsrom og industri med utslippstillatelse kan tas med i samme runde som 2 eller 3: de er
punkter i `area_features` og koster en adapter på noen linjer hver.

### Senere
- Naturfare og støy som kartbilde (krever ny lagtype og endret sikkerhetspolicy for bilder).
- Øvrige research-funn som eget datasett (industri, renseanlegg) — finnes i research-kartet i dag.
- Skolekretser, omsorg og sykehus.
- Eiendomsoppslag ved kartklikk.

### Ikke verdt det nå
- Militære objekter.
- Skjenkesteder.
- Hytter.
- Strategisk støy og høyspent distribusjonsnett som egne flater/linjer hos oss (for store).
