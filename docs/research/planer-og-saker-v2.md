# Planer og saker v2

> Undersøkt 2026-10-03. **Trinn 1 er bygget samme dag**, se «Trinn 1: bygget og målt» nederst og
> [ADR 016](../adr/016-plansaker-deterministisk-uttrekk-og-relevans.md). Bygg med tillatelse fra
> matrikkelen, tall fra fri tekst og bruk av Nasjonal planbase er ikke bygget.
> Opprinnelig anbefaling: seksjonen kan bli vesentlig bedre med åpne data vi allerede har lisens til. Hent
> planinitiativ og planvarsel fra DiBK (vi synker dem ikke i dag), trekk ut formålet deterministisk
> ved synk, og legg til «bygg med tillatelse» fra matrikkelen. Antall boliger, etasjer og areal kan
> bare vises som sitat fra dokumentet eller etter kontroll. Ingen ADR før produktbeslutning.

## Problemstilling
«Planoppstart 420 m» sier at det finnes en prosess, ikke hva som kan endre området. Spørsmålet er
om vi fra offentlige, åpne kilder kan si **hva** som planlegges, **hvor stort** det er og **hvor
langt** det er kommet, uten AI i produktet og uten å scrape kommunale innsynsløsninger.

## A. Dagens data
- **Kilde:** DiBK Fellestjenester Plan, `plandata.ft.dibk.no/services/rest/planleggingigangsatt`
  (OGC API Features, NLOD 2.0, uten nøkkel). Én provider: `dibk-planning-started`.
- **Omfang i basen:** 1 563 saker i 291 kommuner, varslet 2024-05 til 2026-10 (385 i 2024, 577 i
  2025, 601 hittil i 2026). 68 kommuner har bare én sak. Oslo har 50, Trondheim 39 og Bergen 30.
- **Sakstype:** bare «varsel om oppstart av planarbeid».
  - Detaljregulering: 1 322
  - Forenklet endring: 114
  - Mindre reguleringsendring: 84
  - Områderegulering: 38
- **Forslagsstiller:** Foretak 1 460, Privatperson 103. **Ingen offentlige forslagsstillere:**
  tjenesten har bare varsler sendt gjennom verktøy koblet til Fellestjenester Plan. Kommunale og
  statlige planoppstarter mangler.
- **Felter per sak:** `plannavn`, `plantype`, `forslagsstillertype`,
  `kunngjøringsdatoVarselOmPlanoppstart`, `nasjonalArealplanId` (kommunenummer + planid),
  `lovreferanse` (tom i 887), `link` (satt i 429, mest til konsulentens nettside), `oppdateringsdato`.
- **Geometri:** planavgrensning som flate. Median 3,3 hektar; kvartiler 1,1 og 13 hektar.
- **Ingen** formål, beskrivelse, størrelse, status eller sluttdato i de strukturerte feltene.
- **Dokumenter vi synker (3 170):**
  - `PlanomraadePdf` (kart): 1 670
  - `ReferatOppstartsmoete`: 1 239, i 1 179 saker (75 %)
  - `ref-data-as-pdf`: 261
- **Dokumenter kilden har som vi ikke synker** (13 207 totalt):
  - **`Planvarsel`: 1 365**
  - **`Planinitiativ`: 1 230**
  - `Planprogram`: 294
  - `Annet`: 3 099
  - Kart i SOSI/GML
  - 1 536 uten type (`beroerteParter.json`, som vi bevisst aldri henter)

Tre rå saker (strukturerte felt):
| Tittel | Kommune | Plantype | Areal | Lenke |
|---|---|---|---|---|
| «Fv.496 Sømsveien gs, Randesundheimen - Sømskleiva» | 4204 Kristiansand | Detaljregulering | 4,3 ha | byvekstavtalen.no |
| «Industriområde Steinhaugvegen» | 1149 Karmøy | Detaljregulering | 17,4 ha | tom |
| «Furnesvegen 111» | 3403 Hamar | Detaljregulering | 1,4 ha | tom |

Den siste er typisk: tittelen er en adresse. Planinitiativet sier «etablering av dagligvare (REMA 1000)
og kontor», 1 200 m² BTA.

## B–C. Hva kan utvinnes

### Fra tittelen alene
En ordliste over tiltakstyper (bolig, hytte, næring/industri, skole/barnehage, helse/omsorg, vei,
bane, masseuttak, energi, datasenter, teknisk anlegg, idrett/park, sentrum) treffer **589 av 1 563
titler (38 %)**. Resten er adresser, gårdsnavn og plannumre («Dalabekk 2», «Plan 543 - Stykket»).

### Fra dokumentene (74 saker, stratifisert på tiltakstype)
Metode: tekstlaget i PDF-ene ble lest med `pypdf`, og faste regulære uttrykk ble kjørt. Ingen AI.

| | Antall | Andel |
|---|---|---|
| Saker med minst ett dokument med tekstlag | 74 av 74 | 100 % (59 av 74 med dagens dokumenttyper) |
| PDF-er med tekstlag | 180 av 183 | 98 % (3 skannede referater) |
| Saker med planinitiativ | 50 | 68 % |
| Saker med planvarsel | 56 | 76 % |
| **Formålssetning funnet** («Formålet med planarbeidet er …», «legge til rette for …») | 57 | 77 % |
| – hentet fra planinitiativ / planvarsel / referat | 40 / 11 / 6 | |
| – ren og brukbar ved manuell lesing | ca. 46 | **ca. 62 %** |
| Tiltakstype fra tittel + formålssetning | 62 | 84 % (noen feil, se under) |
| Antall boenheter/hytter nevnt | 19 | 26 % |
| Etasjer nevnt | 15 | 20 % |
| Areal (BRA/BTA) nevnt | 23 | 31 % |
| Byggehøyde nevnt | 21 | 28 % |
| Utnyttelsesgrad nevnt | 12 | 16 % |

Eksempler der uttrekket er godt:
| Sak | Deterministisk uttrekk |
|---|---|
| Rådhusgata 18 og 20 (Indre Østfold) | «boligbebyggelse med næringslokaler … i første etasje … og leiligheter i øvrige etasjer»; «ca 125 leiligheter»; «5 til 7 etasjer» |
| Detaljregulering for Solvang | «endre arealformål fra allmennyttig formål til boligformål … konsentrert småhusbebyggelse»; «inntil 22 boenheter»; «2 etasjer» |
| Bratsbergvegen 2 (Trondheim) | «studentboliger med mulighet for tilhørende tjenesteyting/forretning»; «inntil 10 etasjer» |
| Nye Narvik videregående skole | «etablering av Nye Narvik videregående skole»; «15 000 m2 BRA»; «inntil 6 etasjer» |
| Furnesvegen 111 (Hamar) | «etablering av dagligvare (REMA 1000) og kontor»; «1200 m2 BTA» |
| Myra industriområde (Sandnes) | «kraftkrevende industri i form av datasenter»; «byggehøyde opp til 30 m» |
| Utneset masseuttak | «fortsatt drift og uttak av løsmasser … samt utvidelse av masseuttaket» |

Feil og feller funnet i de samme 74:
- **Tall uten sammenheng:**
  - «100 m2 BRA» er parkeringsnormen, ikke prosjektet (minst 6 saker).
  - «125 m² BRA» er størrelsen per hytte.
  - «ca. 800 boliger» i saken om en flomvei gjelder naboområdet.
  - «2 Boliger» er en overskrift med kapittelnummer.
  - «23 etasjer» er «2–3 etasjer» med tapt bindestrek.
- **Flere tall i samme sak:** «58 nye boenheter», «16 boenheter» og «9 boenheter» (delfelt). Uten
  tolkning vet vi ikke hvilket som er totalen.
- **Kotehøyder** («kote 145») fanges som byggehøyde, men er terrenghøyder.
- **Feil formålssetning:** «mellomlagring av løsmasser og at dette bør nevnes» (referat),
  «i tråd med overordnet plan» og «å legge til rette for utbygging av ca» (avkuttet ved punktum).
- **Ligaturer i noen PDF-er:** «legge l re e for», «aku medisinsk». Må oppdages og forkastes.
- **Feil type fra ordliste:** «parkering» i en formålssetning om boliger ga «vei».

**Konklusjon:**
- Formålssetningen kan trekkes ut deterministisk og vises som **sitat fra dokumentet** i rundt 60 %
  av sakene.
- Tiltakstype kan settes for 70–80 % med ordliste, og må ha «annet/ukjent» som ærlig rest.
- Tall (boliger, etasjer, areal) finnes i en fjerdedel til en tredjedel av sakene, og minst hver
  tredje tallforekomst er feil uten sammenheng. De kan ikke vises som fakta uten kontroll.

## D. Kilder
| Kilde | Dekning | Åpen? | Faser | Strukturerte felt | Bruk |
|---|---|---|---|---|---|
| DiBK `planleggingigangsatt` | 301 kommuner, private forslagsstillere, fra 2024-05 | Ja, NLOD 2.0 | Varslet oppstart | Navn, type, dato, flate, dokumenter | I bruk. **Utvid dokumenttypene** |
| DiBK NAP – Reguleringsplanforslag (WMS `nap.ft.dibk.no`) | Bred, **Oslo ser ut til å mangle** | Svarer uten nøkkel, men metadata sier «Norge digitalt begrenset» | Oppstart og planforslag (planstatus 1–2) | Planstatus, navn, flate, arealformål, lenke til kommunens planregister | **Ikke uten skriftlig avklaring med DiBK** |
| DiBK NAP – Reguleringsplaner (vedtatte) | Samme | Samme | Vedtatt | Ikrafttredelsesdato, arealformål per felt, regulert høyde. Utnyttelsestall er ødelagt i svaret | Samme |
| Matrikkelen – Bygningspunkt | Nasjonal | **Ja, CC BY 4.0** | Rammetillatelse (RA), igangsettingstillatelse (IG), godkjent revet (GR), ferdig | Bygningstype, status, punkt, antall bruksenheter | **Ja. Ny undertype «bygg med tillatelse»** |
| NVE PlanNett, Vindkraft, Solkraft (ArcGIS REST) | Nasjonal | Åpen uten nøkkel, lisens må bekreftes | Planlagt → søknad → konsesjon → bygging | Stadium, MW, eier, forventet år, flate, sakslenke | Ja, for energi og nett |
| NVDB vegnett, fase «under bygging» | Nasjonal | Ja | Bare veier under bygging | Vegreferanse, geometri | Smalt. Planlagte veier finnes ikke |
| arealplaner.no (Norkart), ISY PlanDialog | Flere hundre kommuner | Nei. Ingen åpen API eller vilkår; robots sperrer nedlasting og AI-agenter | Hele løpet | – | Bare som lenke fra NAP-feltet `link` |
| eInnsyn | Stat, Oslo og noen kommuner | API krever nøkkel, robots sperrer | Journalposter | Tittel, dato | Nei |
| DiBK Fellestjenester Bygg, FKB-Tiltak | – | Nei | Byggesøknader | – | Nei |
| SSB | Nasjonal | Ja | Aggregater per kommune | – | Bare kontekst |
| Bane NOR, Statens vegvesen, Nye Veier (prosjekter) | – | Ingen åpne geodata funnet | – | – | Nei |

DiBK overtok den nasjonale planbasen fra Kartverket 2026-01-01. De gamle Geonorge-tjenestene for
plan er døde. DiBK har varslet åpne tjenester for høring og offentlig ettersyn «i løpet av 2026»; de
finnes ikke ennå.

### Matrikkelen som byggesignal (målt på nedlastingen fra eiendomskort-runden)
| Kommune | RA | IG | Godkjent revet | Boligbygg med RA/IG | Enheter i rekkehus/blokk med RA/IG |
|---|---|---|---|---|---|
| Oslo | 1 376 | 2 758 | 935 | 1 312 | 5 345 |
| Trondheim | 524 | 913 | 320 | 818 | 4 758 |
| Hitra | 290 | 806 | 74 | 33 | 78 |

- Nasjonalt: 23 383 bygg med rammetillatelse og 111 970 med igangsettingstillatelse.
- I Oslo er 1 966 av RA/IG-byggene garasjer og uthus. De må filtreres bort.
- Det åpne datasettet har ingen dato for statusen. En gammel igangsettingstillatelse som aldri ble
  fullført, ser ut som en ny.

## E. Hva NaboRadar kan si sikkert (74 saker)
| Nivå | Andel | Hva |
|---|---|---|
| Alltid, fra strukturerte felt | 100 % | At planarbeid er varslet, dato, plantype, planområdets størrelse, avstand, om søkepunktet ligger i planområdet, privat forslagsstiller |
| Tiltakstype fra tittel | 38 % | «Masseuttak», «skole», «hyttefelt» |
| Formål som sitat fra dokument | ca. 60 % | «Formålet er å legge til rette for …» |
| Tiltakstype fra tittel + formål | 70–80 % | Med «annet» som rest |
| Tall (boliger, etasjer, areal) | 20–30 % nevnt, hvorav rundt to tredjedeler riktige | Bare som sitat med dokumentlenke, eller etter kontroll |
| Ingenting utover tittel | ca. 15–20 % | Kart-PDF alene, skannet referat, eller ingen formålssetning |

Etter type i utvalget:
- **Godt beskrevet:** masseuttak, skole, omsorg, datasenter og energi (tittel + formål), og
  boligprosjekter med planinitiativ (formål + ofte antall).
- **Dårlig beskrevet:** mindre reguleringsendringer («oppdatere bestemmelser knyttet til vann og
  avløp») og store samferdselsplaner (E6, kryssingsspor), som har planprogram i stedet for
  planinitiativ.

## F. Dokumenttolkning uten AI
- **Mulig ved synk:** last ned planinitiativ, planvarsel og referat, les tekstlaget, kjør faste
  mønstre og lagre resultatet som felter med kildedokument og tekstutdrag. Ingen AI, og ingen tolkning
  i runtime.
- **Trygt automatisk:**
  - formålssetningen som sitat, med kvalitetsfilter (lengde, ikke avkuttet, ingen ligaturfeil, ikke
    «i tråd med»),
  - tiltakstype fra ordliste.
- **Bare med kontroll:** tall. Admin har allerede review-flyt. En kø der uttrekket godkjennes eller
  forkastes per sak er realistisk for 50–110 nye saker i måneden.
- **Strukturerte kilder til tall** (arealformål og utnyttelse i plan-GML, planregister) finnes for
  vedtatte planer i NAP, men er ikke åpent lisensiert, og utnyttelsestallene er ødelagt i tjenesten.
- **Personvern:**
  - Planvarsel og planinitiativ kan nevne grunneiere og privatpersoner. Vi lagrer bare uttrukne
    faktafelt og formålssetningen, ikke dokumentteksten.
  - 103 saker har privatperson som forslagsstiller. Navn vises ikke.
  - `beroerteParter.json` hentes fortsatt aldri.

## G. Relevans (forklarbar, ikke normativ)
Synlighet bestemmes av dokumenterte egenskaper, i denne rekkefølgen:
1. Søkepunktet ligger **i** planområdet.
2. Avstand til planområdets kant (ikke sentrum).
3. Størrelse: planområdets areal, og plantype (områderegulering > detaljregulering > mindre endring).
4. Tiltakstype: nytt byggeområde, masseuttak, industri, energi og samferdsel foran
   «endring av bestemmelser».
5. Alder: varslet siste 12 måneder foran eldre.

Forslag: «fremhevet» når (1), eller når avstanden er under 300 m og saken ikke er en mindre endring.
Ellers «normal». Mindre endringer over 500 m unna og saker eldre enn 24 måneder tones ned bak «Vis
flere». Ingen poengsum vises. Ingen ord som «negativt» eller «risiko». Bare «Dette kan endre området».

## H. Status og livssyklus
| Fase | Kan vi vite det nasjonalt fra åpne data? |
|---|---|
| Varslet planoppstart | Ja, for private forslag via Fellestjenester (DiBK) |
| Planforslag, offentlig ettersyn | Nei. NAP har planstatus 2, men ikke åpent lisensiert, uten høringsfrist, uten Oslo |
| Vedtatt plan | Nei (samme) |
| Rammetillatelse / igangsettingstillatelse per bygg | Ja (matrikkelen), uten dato |
| Ferdig bygg | Ja (matrikkelen) |
| Avsluttet, trukket eller utgått plan | **Nei.** Ingen kilde sier at et planarbeid er lagt bort |
| Byggesøknad før vedtak, nabovarsel, dispensasjon, klage, innsigelse | Nei |

Konsekvens: en sak fra DiBK må alltid stå som «Varslet [måned år]» med setningen «Vi vet ikke om
planen senere er vedtatt, endret eller lagt bort.» Ordet «aktiv» brukes ikke.

## I. Forslag til seksjonen (ikke bygget)
```
PLANER OG SAKER

Boligprosjekt · 320 m unna                      [fremhevet]
Rådhusgata 18 og 20
«… boligbebyggelse med næringslokaler i første etasje og leiligheter i øvrige etasjer»
Varslet januar 2026 · planområde 1,0 hektar
  Utvid: sitat-kilde (planinitiativ), dokumentene, planområdet i kart, forbehold om status

Bygg med igangsettingstillatelse · 180 m unna
Boligblokk, 48 boenheter (matrikkelen)
```
- Overskriften er tiltakstypen når vi har den, ellers «Planarbeid».
- Formålet står som sitat med anførselstegn og kilde. Tall vises bare når de er kontrollert, da
  som «ca. 125 boliger (planinitiativet)».
- Resten av `/omrade` endres ikke.

## J. Tom tilstand
Dagens «Ingen varslede planoppstarter innen 1 km siste 24 måneder» er riktig, men leses som «ingen
planer». Tryggere:

> Ingen varslede planoppstarter fra private forslagsstillere innen 1 km siden mai 2024.
> Kommunale og statlige planer, vedtatte planer og byggesaker er ikke med.

Med matrikkelen i tillegg: «… og ingen bygg med ramme- eller igangsettingstillatelse innen 500 m.»

## Negative funn og dekningshull
- DiBK har ingen åpne søstertjenester for planforslag, høring eller vedtak.
- NAP er teknisk tilgjengelig, men lisensiert «Norge digitalt begrenset». Oslo ser ut til å mangle.
- Ingen nasjonal åpen kilde for byggesøknader, nabovarsel, dispensasjoner eller høringsfrister.
- Offentlig initierte planoppstarter mangler i DiBK-tjenesten.
- 66 av landets kommuner har ingen saker i tjenesten.
- Ingen kilde sier at et planarbeid er avsluttet.
- arealplaner.no og PlanDialog har ingen åpen tilgang. Det bygges ikke kommune-for-kommune-scraping.
- Matrikkelstatus har ingen dato i det åpne datasettet.
- Tre av 183 PDF-er var skannet uten tekstlag. Enkelte har ligaturfeil i tekstlaget.
- Matrikkel-WFS-en var nede under undersøkelsen. Tallene er fra nedlastingen.

## K. Svar på produktspørsmålene
1. **Kan seksjonen bli vesentlig bedre med dagens offentlige data?** Ja. Den viktigste gevinsten
   ligger i dokumenter vi ikke henter i dag, hos en kilde vi allerede bruker.
2. **Uten dokumentparsing:**
   - tiltakstype fra tittel (38 %),
   - størrelse og plantype,
   - avstand til kant, og «ligger i planområdet»,
   - bedre relevanssortering,
   - ærlig tom tilstand,
   - lenke til planinitiativ og planvarsel,
   - bygg med tillatelse fra matrikkelen.
3. **Med deterministisk parsing:** formålet som sitat i rundt 60 % av sakene, tiltakstype i 70–80 %,
   og tall som kandidater til kontroll.
4. **Nasjonal dekning:** 291 kommuner, men bare private planforslag og bare fra mai 2024. Matrikkelen
   er landsdekkende.
5. **Sakstyper med mest verdi:**
   - boligprosjekter,
   - næring, industri og datasenter,
   - masseuttak og deponi,
   - samferdsel,
   - bygg med tillatelse (matrikkelen).
6. **Trygg statusinformasjon:** «Varslet [dato]» og «ramme-/igangsettingstillatelse gitt
   (matrikkelen)». Ikke «aktiv», «vedtatt» eller «avsluttet».
7. **v1 bør inneholde:**
   - planinitiativ, planvarsel og planprogram i synken (med samme personvernregler som i dag),
   - tiltakstype og formålssitat trukket ut ved synk,
   - relevansregelen i G,
   - ny tom tilstand,
   - statusforbeholdet.

   «Bygg med tillatelse» som trinn 2, fordi det krever et nytt datasett.
8. **Ikke bygg:**
   - AI i runtime,
   - automatiske tall uten kontroll,
   - scraping av kommunale planregistre eller eInnsyn,
   - bruk av NAP før DiBK har svart,
   - vurderinger («negativt for boligen»),
   - poengsum,
   - status vi ikke kan dokumentere.
9. **Verdt å prioritere som neste store funksjon?** Ja. Det er den seksjonen som svarer på det en
   boligkjøper ikke finner selv, kilden er åpen og allerede i drift, og v1 er hovedsakelig
   synk- og tekstarbeid, ikke nye avtaler.

## Åpne spørsmål
- Brev til DiBK (ftb@dibk.no):
  - Kan NAP-tjenestene brukes og resultatene vises offentlig?
  - Når kommer de åpne høringstjenestene?
  - Hvilke kommuner leverer, og er Oslo med?
- Skal tall godkjennes manuelt i admin, eller holdes utenfor v1?
- Lisens for NVEs kartlag (PlanNett, vindkraft, solkraft) må bekreftes.

## Hva som kan utløse ny vurdering
DiBK åpner høring/planforslag som OGC API, NAP blir åpne data, eller matrikkelen får statusdato i
det åpne datasettet.

## Trinn 1: bygget og målt (2026-10-03)
Produktbeslutning: bygg en avgrenset v1 med tiltakstype, formål som sitat, forklarbar relevans, ny
tom tilstand og statusforbehold. Ingen tall fra fri tekst, ingen manuell godkjenning, ingen
matrikkelstatus. Beslutningen står i [ADR 016](../adr/016-plansaker-deterministisk-uttrekk-og-relevans.md),
dagens løsning i [håndbok §14 Planer](../naboradar-handbook.md#planer).

### Hva som ble bygget
- Synken henter også `Planinitiativ` og `Planvarsel`. Dokumentene i basen gikk fra 3 170 til 5 633
  (1 162 planinitiativ, 1 301 planvarsler). Identiteten er fortsatt planen (arealplan-ID hos DiBK);
  gjentatte varsler om samme plan-ID slås sammen ved visning som før (92 plan-ID-er har flere varsler).
- `npm run plans:enrich` leser tekstlaget og lagrer tiltakstype og én formålssetning i
  `event_enrichment`. Lese-RPC-ene legger feltene til i `attributes`.
- Kortet viser tiltakstype, tittel, formål som sitat, og avstand og dato på én linje. Sakssiden viser
  hele sitatet med lenke til dokumentet, plan-ID og metode.

### Regler som ble endret av målingene
Mønstrene ble kjørt mot de 74 sakene fra researchen og deretter mot alle 1 563. Dette ble rettet
underveis:
- **Skjemafeltet «Hensikten med planarbeidet»** i varselskjemaet er det nærmeste kilden har et
  strukturert formål, og brukes først. Feltet brukes også til møteinnkallinger («Dette er en påminner
  om nabomøte 8. september»), så første setning godtas bare når den beskriver et tiltak.
- **Tapte ligaturer** («legge l re e for», «arealeffek v», «=lre9elegge») gjelder hele varselskjemaer
  fra enkelte verktøy. De forkastes, og neste dokument prøves.
- **Kuttede setninger:** punktum i «gnr.», «ca.», datoer og desimaltall avslutter ikke setningen.
  Setninger som ender på en forkortelse («… Skippergata og Fred», «… 3-8 et») forkastes.
- **Mengder** erstattes med «[…]», også «2etasjer», «8-mannsbolig» og tallord. Vegnummer, gnr/bnr,
  husnummer, feltnavn og årstall blir stående.
- **Tiltakstype:**
  - Gateadresser og gatenavn er ikke signaler («Skoleveien 5», «Stadionvegen Øst»,
    «Tornaas' vei 8»).
  - «E7» som feltnavn er ikke en europavei.
  - Et vegnummer teller bare når tittelen åpner med det.
  - Sisteledd i sammensatte ord teller («Havnehotell», «ungdomsskole»).
  - «Jernbane og deponier» gir ukjent type.

### Treffrate (alle 1 563 saker i produksjon)
| | Antall | Andel |
|---|---|---|
| Brukbar formålssetning | 934 | 60 % |
| – fra planinitiativ / skjemafelt i varsel / referat / setning i varsel | 573 / 232 / 97 / 24 | |
| – første setning i skjemafeltet (svakeste metode) | 10 | |
| Tiltakstype satt | 874 | 56 % |
| – fra tittelen / fra formålet | 513 / 361 | |
| Ukategorisert («Planarbeid») | 689 | 44 % |
| Fallback: tittelen står alene, uten formål | 629 | 40 % |
| Verken tiltakstype eller formål | 420 | 27 % |
| Vises som «Planendring» | 199 | 13 % |

Tittelen alene ga tiltakstype for 34 %. Formålet løfter det til 56 %.

Fordeling av tiltakstype: bolig 254, næring 141, samferdsel 69, teknisk infrastruktur 69,
fritidsbolig 53, skole/barnehage 52, helse/omsorg 42, industri 41, masseuttak 40, hotell/servering 30,
bolig og næring 27, idrett/park 26, energi 16, datasenter 14, transformasjon 2.

### QA
- **Automatisk, alle 934 formål:**
  - Ingen mengde foran en enhet.
  - Alle har lenke til dokumentet hos DiBK.
  - Ingen har rester av tapte ligaturer.
  - Lengden er 33–292 tegn.
- **Manuell lesing, 74 saker fra researchen** (stratifisert på type, med PDF-ene lokalt):
  - Formål funnet i 51. Alle 51 gjengir dokumentet riktig.
  - Tiltakstype satt i 62. Ingen var feil; 12 ble stående som ukjent.
- **Manuell lesing, 60 tilfeldige saker i produksjon:**
  - 36 hadde formål. Alle unntatt to sa hva saken gjelder.
  - To var korrekt sitert, men handlet om noe annet enn hovedtiltaket: en overordnet plan
    («… tomt til transformatorstasjon og lagervirksomhet») og vann og avløp i en sak om fortau.
  - Tiltakstype: tre feil ble funnet og rettet i reglene («inkl. Fv 4494», «Superb Hotel»,
    «detaljhandel»). Før rettingen sto 30 av de 60 som ukjent.
- **Visning:** kontrollert i nettleser på desktop og mobil (Tromsø sentrum, seks saker), sakssiden
  (Skoppum miljølandsby) og tom tilstand (punkt uten saker).
- **Avstand** er uendret: korteste avstand fra søkepunktet til planområdets kant, beregnet i PostGIS.

### Kjente svakheter etter trinn 1
- 40 % av sakene viser bare tittelen.
- Et sitat kan være riktig gjengitt og likevel handle om en overordnet plan eller et følgetiltak.
- Varselskjemaer med ødelagt tekstlag gir ikke formål, selv om et menneske kan lese dem.
- Dekningen er uendret: private forslagsstillere, fra mai 2024, ingen status etter varselet.

### Ikke bygget
Matrikkelstatus for bygg, byggesaker, manuell kontroll, tall fra fri tekst, kommunevis scraping og AI.
Utkast til henvendelse til DiBK ligger i [dibk-henvendelse-utkast.md](dibk-henvendelse-utkast.md) og
er ikke sendt.
