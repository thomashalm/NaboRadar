# Data-roadmap for NaboRadar

Source of truth for hvilke dataområder vi bygger, i hvilken rekkefølge, og hvorfor. Skrevet
27.09.2026 etter en gjennomgang av faktisk dekning i kode og database, teknisk test av kandidat-
kilder og research på konkurrentene.

Ny datakategori vurderes mot dette dokumentet før den implementeres. Se
[beslutningsregelen](#11-beslutningsregel-for-nye-idéer).

---

## 1. Formål

NaboRadar skal ikke være best på hvert enkelt datapunkt. Flom finnes hos NVE, priser hos
Eiendomsverdi, kafeer hos Google. Å kjempe om ett lag av gangen er en kamp vi taper, og den er
uinteressant.

Målet er å bli ekstremt sterk på **kombinasjonen** rundt én adresse:

- hva som finnes rundt adressen
- hva som er på vei
- hvor stort det er
- hvilken status det har
- hvor sikkert vi vet det
- hvor nylig det er kontrollert
- hvilke forhold som er relevante før et boligkjøp

Konkurransefortrinnet skal komme fra alle disse sammen, ikke fra rådata:

| Byggestein | Hva den gir |
|---|---|
| Nasjonale strukturerte kilder | bredde og dekning uten manuelt arbeid |
| Research på det som ikke finnes strukturert | det ingen andre har fordi det ikke kan lastes ned |
| Deduplisering til fysisk sted | ett anlegg, ikke seks tillatelser eller fire katalogoppføringer |
| Kapasitet og størrelse | «650 MW planlagt» slår «det ligger et datasenter der» |
| Status | planlagt, under bygging, i drift, nedlagt — og når det endret seg |
| Historikk | hva vi trodde før, og hva som faktisk skjedde |
| Confidence | hvor godt vi vet det, sagt høyt |
| Interest | hva som betyr noe for en som bor der |
| Review og freshness | at basen er levende, ikke et arkiv |

Rådata kan kopieres på en ettermiddag. De åtte punktene over tar år.

---

## 2. Nåværende dekning

Verifisert mot kode og produksjonsdatabase 27.09.2026.

### Synkede nasjonale data — 11 providere, ~37 400 aktive rader

| Data | Rader | Kilde | Dekning |
|---|---|---|---|
| Forurenset grunn | 15 954 | Miljødirektoratet | nasjonal |
| Kraftledninger og transformatorstasjoner | 5 647 | NVE | nasjonal |
| Kvikkleiresoner (+ utredet uten fare) | 4 865 | NVE | nasjonal |
| Barnehager | 4 493 | Udir | nasjonal, 352 av ~357 kommuner |
| Skoler (grunnskole + videregående) | 3 103 | Udir | nasjonal |
| Industri- og avfallsanlegg med utslippstillatelse | 866 | Miljødirektoratet | nasjonal |
| Offentlige tilfluktsrom | 556 | DSB | nasjonal |
| Sykehus | 80 | Helsenorge | nasjonal, 59 kommuner |

### Delvis eller lokal dekning

| Data | Rader | Status |
|---|---|---|
| Skjenkesteder | 1 406 | **kun Oslo** |
| Omsorgstilbud | 367 | **Oslo**; Bærums 14 publiserte tilbud ikke tatt inn |
| Skolekrets (inntaksområder barneskole) | 105 | **kun Oslo**; lisens for Bærum og Asker ikke avklart |

### Direkte oppslag per søk

Kilder som er for store å synke, eller som bare svarer på «ligger punktet innenfor?»:
kvikkleire aktsomhet (NVE), strategisk støy (Miljødirektoratet), støyvarselkart veg (Statens
vegvesen / NorStøy), flystøy (Avinor), høyspent distribusjonsnett (NVE).

### Planer

1 553 varsler om planoppstart fra DiBK, fordelt på **290 kommuner**, hvorav 773 siste år og 154
siste kvartal. 1 313 er detaljreguleringer. Dette er reelt nasjonalt, og det er det tidligste
offentlige signalet om at noe skal skje.

**Vedtatte planer og planer på høring er ikke tilgjengelige.** DiBKs NAP-tjeneste svarer 403 og
krever Norge Digitalt-tilgang. Verifisert på nytt 27.09.2026. Det betyr at vi ser hva som
*starter*, ikke hva som ble vedtatt — og at «hva ble det til» er et research-problem, ikke et
API-problem.

### Researchbasen

216 funn og 521 kilder i 82 kommuner, med review-kø og freshness-policy
([håndboken, kapittel 36](naboradar-handbook.md#36-research-lifecycle-freshness-og-review-kø)).

| Kategori | Funn |
|---|---|
| Datasenter, industri og tekniske anlegg | 132 |
| Miljø, grunn og VA | 34 |
| Forsvar og militært | 20 |
| Infrastruktur og større prosjekter | 11 |
| Kilder og datakvalitet | 14 |
| Støy, omsorg | 5 |

---

## 3. Hovedprinsipp: hygiene eller moat

Hver kategori er én av to ting, og de forvaltes ulikt.

### Hygiene-data

Det en boligkjøper forventer at vi har: **flom, skred, radon, stormflo, trafikkmengde,
jernbanestøy, skolekrets, kulturminner.**

Disse gjør produktet komplett. De er som regel nasjonale, strukturerte og stabile, og de koster
lite å drifte. De er ikke et konkurransefortrinn alene — Ambita selger dem allerede, og
easyeiendom har flere av dem gratis. Men uten dem ser produktet uferdig ut, og de er billige.

Regelen for hygiene-data: **ta dem raskt, ta dem riktig, og ikke bruk måneder på dem.**

### Moat-data

Der verdien bygges over tid: **store prosjekter, datasentre, industri, energianlegg, VA,
mineraluttak og andre større fysiske anlegg.**

Her skal NaboRadar være bedre enn råkildene, gjennom dedup, fysisk sted framfor selskapsrad,
kapasitet, status, aliases, verifisering, review og bevart historikk. Det er arbeid som ikke kan
lastes ned, og som blir mer verdt for hvert år det vedlikeholdes.

Regelen for moat-data: **her tåler vi at det tar tid, og her skal vi aldri ta en snarvei som
ødelegger identitet eller historikk.**

---

## 4. Konkurransebildet

Research 27.09.2026. Beskrivelsene er hva tjenestene selv oppgir eller viser offentlig.

| Tjeneste | Ser ut til å være sterk på | Har ikke |
|---|---|---|
| **Nabolagsprofil (FINN / nabolag.no)** | avstander til holdeplasser, skoler, barnehager og butikker; demografi; vurderinger fra lokalkjente; reiseplanlegger | naturfare, planer, industri, støy |
| **Ambita Infoland «Områdeanalyse»** | flom, skred, kvikkleire, radon, støy, forurenset grunn, kulturminner, sikringssoner, SEFRAK — den reelle konkurrenten på innhold | gratis forbrukerflate; research på fysiske anlegg; status og kapasitet over tid |
| **easyeiendom.no/labs** | gratis adresseverktøy: flomrisiko (NVE), nabolagsprofil, reguleringsplan (kommunale planregistre, **kun vedtatte planer**), byggesakssjekk, risikosammendrag med flom/skred/radon/støy | planer som er på vei; verifiserte anlegg med kapasitet og status |
| **Hjemla / Eiendomsverdi / Virdi** | pris, verdiestimat, transaksjonshistorikk, eierskap | omgivelser |
| **Kommunale kartportaler** | alt, gratis og autoritativt for sin egen kommune | én adresse på tvers av kilder; nasjonal sammenlignbarhet; at brukeren vet hva hen skal se etter |

**Vi er ikke først på naturfare.** Det skal vi si åpent internt, så vi ikke prioriterer som om vi
var det.

Vi skal **ikke** konkurrere med Google Maps på POI-er, med Eiendomsverdi og Hjemla på pris og
verdi, eller med Nabolagsprofil på demografi.

Vi skal være sterkere på: **hva som faktisk finnes og skjer rundt adressen, planlagte endringer,
større fysiske anlegg, verifisert status og størrelse, og løpende review.** Konkret: easyeiendom
viser vedtatte planer; vi viser hva som er på vei. Ambita viser at det ligger industri der; vi
viser hvilket anlegg, hvor stort, i hvilken status, sist kontrollert når.

---

## 5. Prioritert roadmap

### NÅ

Fire løft. Rekkefølgen er bevisst: de tre første er hygiene og tar uker, den fjerde er
konkurransefortrinnet og tar måneder.

#### 1. Naturfarepakken ✅ levert 27.09.2026

Bygget som fire direkte oppslag, ikke som providere — se
[håndboken → Naturfare](naboradar-handbook.md#naturfare). To premisser endret seg underveis og er
verdt å ta med videre: NVEs aktsomhetstjenester har **rasteriserte oversiktslag ved siden av
polygonlagene**, og et `identify` mot feil lag gir treff overalt; og Kartverkets `Dekningsområde`
for stormflo dekker praktisk talt hele landet, så det kan ikke brukes som port for om en adresse er
i spill. Begge ble bare synlige i QA mot ekte adresser.

| | |
|---|---|
| **Innhold** | flom, jord- og flomskred, snøskred og steinsprang der relevant, radon, stormflo |
| **Kilder** | NVE Flomsoner (WFS), NVE aktsomhetskart jord-/flomskred og snø/stein, NGU Radon aktsomhet (OGC API Features), Kartverket Stormflo og havnivå (WFS + REST) |
| **Verifisert** | alle svarte 27.09.2026 |
| **Modell** | provider der datamengden tillater synk, direkte oppslag der lagene er for store — samme vurdering som for kvikkleire |
| **Freshness** | stabil, lavt vedlikehold |
| **Mål** | gjøre naturfaredekningen komplett sammen med kvikkleiresonene vi allerede har |

Brukerhistorie: *«Jeg vurderer et hus 80 meter fra en elv»* og *«Området har høy
radonaktsomhet»*. Det er de to tingene alle norske boligkjøpssjekklister ber folk sjekke, og svaret
i dag er «spør kommunen».

#### 2. Trafikkmengde (ÅDT)

| | |
|---|---|
| **Kilde** | Statens vegvesen, Trafikkmengde (WFS via Geonorge) |
| **Verifisert** | svarte 27.09.2026 |
| **Hent** | ÅDT, tungtrafikkandel hvis den finnes, og året målingen gjelder |
| **Modell** | provider |
| **Freshness** | moderat — oppdateres årlig |

Mål: erstatte «det går en vei der» med «17 000 biler i døgnet, 9 % tunge, målt 2025». Kombineres
senere med vegstøy, industri og pukkverk til produktet **tungtrafikk rundt adressen**, som ingen
norsk forbrukertjeneste har i dag.

Året for målingen skal alltid vises. Et trafikktall uten årstall er en påstand.

#### 3. Jernbanestøy

| | |
|---|---|
| **Kilde** | Bane NOR, støysoner for jernbanenettet |
| **Verifisert** | tilgjengelig via Geonorge 27.09.2026 |
| **Modell** | provider eller direkte oppslag |
| **Freshness** | stabil |

Mål: komplettere støydekningen nasjonalt. I dag har vi veg, fly og strategisk støy — og strategisk
støy dekker bare de store byområdene, mens Bane NORs egne soner dekker hele nettet. Dette er den
billigste av de fire med reell verdi.

#### 4. Store prosjekter

**Den viktigste moat-investeringen.** Ikke bygg dette som enda et providerlag.

| | |
|---|---|
| **Modell** | **hybrid** |
| **Strukturert discovery** | plansaker og planvarsler vi allerede har (1 553 i 290 kommuner), kommunale planregistre der de er tilgjengelige |
| **Research** | faktisk størrelse, antall boliger, byggehøyder, næringsareal, infrastruktur, status, byggetrinn, planlagt byggestart, ferdigstillelse, utbygger, aliases |
| **Freshness** | svært dynamisk — hyppig review |

Vi har 1 553 plansaker, men vet ikke hva de ble. Brukeren spør ikke «er det varslet planoppstart
400 meter unna», men *«er det regulert 800 nye boliger og en ny vei 400 meter unna»*. Avstanden
mellom de to spørsmålene er research, og det er nettopp der review-systemet tjener seg inn.

Merk at vedtatte planer og planer på høring **ikke** er åpent tilgjengelige (NAP, 403). Det er en
grunn til at dette må være hybrid, ikke en provider — og det er samtidig grunnen til at ingen kan
kopiere resultatet ved å kjøpe et datasett.

### SNART

| Kategori | Hvorfor nå snart, og ikke nå |
|---|---|
| **Skolekrets nasjonalt** | Høyest SEO-verdi av alt vi kan gjøre, men i dag 105 inntaksområder i Oslo. Blokkeringen er lisensavklaring per kommune — et brev, ikke kode. Det brevet har ligget uskrevet siden research-runde 2 |
| **Kulturminner og vern** | Riksantikvaren har OGC API Features, nasjonalt og stabilt. Påvirker både hva naboen kan gjøre og hva du selv kan gjøre. Billig |
| **Kollektiv (Entur)** | Verifisert mot `stopPlacesByBbox`, nasjonalt og gratis. Men Google Maps gjør ruteplanlegging bedre — vår verdi er «nærmeste holdeplass og avganger per time» som objektiv kvalitet, ikke en reiseplanlegger. Derfor snart, ikke nå |
| **Masseuttak og pukkverk** | Underkategorien er tom fordi Direktoratet for mineralforvaltnings tjenester svarte 503 gjennom hele forrige runde. Fullfør når den svarer |
| **Mer komplett skreddekning** | Snøskred og steinsprang som utvidelse av pakken over, når grunnlaget står |

### SENERE

| Kategori | Hvorfor senere |
|---|---|
| Brannstasjon og beredskap (DSB WFS, Politiet WFS) | Billig og nasjonalt, men lav beslutningsverdi før et boligkjøp |
| Energianlegg utenfor dagens dekning: fjernvarme, biogass, batteriparker, sol og vind | Ingen brukbar nasjonal kilde. Rent research, svært dynamisk. Verdifullt, men dyrt per funn |
| Kommunale byggesaker i de største kommunene | Hybrid med per-kommune API-arbeid. Stor verdi, men skalerer dårlig. **Avgjort september 2026: ikke prioritert** — se [Eiendomshistorikk / byggesakshistorikk](#eiendomshistorikk--byggesakshistorikk) |
| Havnivåscenarier over tid | Naturfarepakken dekker dagens stormflo først |
| Skolekapasitet og planlagte skoleendringer | Ligger i kommunale saksdokumenter. Research, moderat dynamisk, høy verdi for familier — men 357 kommuner |

### IKKE VERDT DET NÅ

| Kategori | Hvorfor ikke |
|---|---|
| Dagligvare, kafé, apotek, lege | Google Maps og Nabolagsprofil gjør det bedre. Vi tilfører ingenting |
| Lekeplasser, parker, turstier, badeplasser | Samme. Dette er den største fellen i en «positive kvaliteter»-liste: det føles nyttig og er gratis å foreslå, men vi ville vedlikeholdt et dårligere Google Maps |
| Pris, verdiestimat, prishistorikk | Eiendomsverdi, Hjemla og Virdi eier dette. Dyrt, delvis regulert, og ikke vår vinkel |
| Byggeår, boligtype, tomteareal | Låst bak Matrikkelen, og står i annonsen allerede |
| Demografi og levekårsdata | Nabolagsprofil har det. «Hvem bor her» er dessuten en framstilling vi bevisst holder oss unna |
| Live luftkvalitetsmålinger | For få stasjoner, og en måleverdi nå er ikke en egenskap ved adressen. Vi dekker *kildene* bedre gjennom industri og trafikk |
| Mobildekning og master | Helseframingen er et minefelt, og dekning måles bedre av operatørene selv |
| Historiske flyfoto | Norge i bilder gjør det. Det er en nettleseropplevelse, ikke et datapunkt |
| **Eiendomshistorikk / byggesakshistorikk** | Ikke prioritert nå. Se beslutningen under tabellen |

Disse kan vurderes på nytt hvis premissene endrer seg. Men de skal ikke inn «fordi de var enkle».

#### Eiendomshistorikk / byggesakshistorikk

**Ikke prioritert nå.** Bevisst produktbeslutning, september 2026.

- **Full byggesakshistorikk** vurderes på nytt dersom det blir tilgjengelig dokumentert
  maskinlesbar tilgang til kommunale byggesaksdata, eller eksplisitt tilgang fra en relevant
  kommune — for eksempel Oslo PBE.
- **Bygningsstatus og SEFRAK** bygges ikke nå, fordi forventet brukerverdi ikke forsvarer
  kompleksiteten. Dette gjelder eiendomshistorikk-pakken; kulturminner og vern fra Riksantikvaren
  står fortsatt i [SNART](#snart) som en egen sak.
- Feasibility-kartleggingen ligger i
  [docs/research/eiendomshistorikk-feasibility.md](research/eiendomshistorikk-feasibility.md).
  Den dokumenterer kildelandskapet slik det faktisk er, testet mot live tjenester, slik at en
  ny vurdering ikke må starte på nytt.

**Dette er en produktbeslutning, ikke en teknisk blokkering vi skal følge opp aktivt.** Vi
overvåker ikke kildene, og ingen har ansvar for å sjekke om noe har endret seg. Blir tilgangen
tilgjengelig, vil det være synlig av seg selv.

---

## 6. Dataarkitektur-prinsipp

For hver ny kategori avgjøres **først** hvilken av tre modeller den hører til.

| Modell | Når | Konsekvens |
|---|---|---|
| **Provider** | God nasjonal strukturert kilde med stabil identitet | synkes regelmessig, lever i `area_features` eller `events` |
| **Research** | Ingen strukturert sannhet finnes. Krever websøk, planer, PDF-er, lokalaviser, operatørsider | lever i `admin_research_items` med kilder, confidence og review |
| **Hybrid** | Strukturert discovery finnes, men sier ikke det brukeren trenger å vite | provider gir kandidater, research gir størrelse, status og verifisering |

**Ikke press research-problemer inn i provider-arkitekturen.** Et datasett som svarer på «hvem har
tillatelse» er ikke et datasett som svarer på «hva ligger her og hvor stort er det». Forsøk på å
tvinge det siste ut av det første er hvordan man ender med 866 registerrader som later som de er
866 steder.

Motsatt gjelder også: ikke gjør noe til research fordi det er lettere å skrive enn en provider.
Hvis kilden finnes strukturert og nasjonalt, skal den synkes.

---

## 7. Freshness

Hver kategori klassifiseres, og klassifiseringen styrer review-intervallet
([kapittel 36](naboradar-handbook.md#36-research-lifecycle-freshness-og-review-kø)).

| Klasse | Eksempler | Review |
|---|---|---|
| **Stabil** | radon, flomsoner, kulturminner, historiske anlegg, fredede bygg | sjelden eller ingen |
| **Moderat dynamisk** | aktiv fabrikk, renseanlegg, pukkverk i drift, aktiv gruve | periodisk |
| **Svært dynamisk** | planlagt datasenter, byggeprosjekt, ny gruve, planlagt vei, alt med status `planned` eller `under_construction` | hyppig |

En kategori som er svært dynamisk og som vi ikke har kapasitet til å reviewe, skal ikke bygges.
Utdatert data om et byggeprosjekt er verre enn ingen data, fordi brukeren tror det er sjekket.

---

## 8. Kildekrav

Hver ny provider eller research-kategori dokumenterer:

- **kilde** og eier
- **lisens** (og at den tillater vår bruk)
- **geografisk dekning** — nasjonal, regional eller én kommune, sagt eksplisitt
- **oppdateringsfrekvens** hos kilden
- **identitetsstrategi** — hva som er `externalId`, og hvorfor
- **om ekstern ID er bevist stabil** over flere uttrekk
- **hvordan sletting og endring oppdages** — reconciliation eller ikke
- **fallback hvis kilden er nede**

### Regelen om ekstern ID

> **En ekstern ID behandles ikke som permanent før stabilitet er bevist over flere uttrekk.**
> Hent kilden to ganger med tid mellom, og sammenlign ID-mengdene før feltet tas i bruk.
>
> **Lik objektmengde kombinert med massiv `inserted` og `removed` samtidig er et
> datakvalitetssignal**, ikke en normal kjøring.

Regelen kom av DSB tilfluktsrom: `lokalId` så ut som en varig UUID, men ble generert på nytt for
hvert uttrekk, og 0 av 556 ID-er var felles mellom to uttrekk et døgn fra hverandre. Vakten i
`lib/sync/guards.ts` flagger nå mønsteret automatisk, men signalet skal kjennes igjen manuelt
også — vakten er en sikring, ikke en erstatning for å sjekke.

---

## 9. Produktprinsipp: research er bred, visningen er kuratert

**Ikke vis alt bare fordi vi har dataen.**

Researchbasen kan og skal være bred: negative funn, svake leads, datakvalitetsavvik og notater
hører hjemme der. Offentlig NaboRadar skal være kuratert.

Et funn vurderes for offentlig visning etter:

- **størrelse** — et anlegg på 650 MW er ikke samme sak som et teknisk rom
- **type** — hva slags anlegg det er
- **avstand** — hva som er nært nok til å betyr noe for denne adressen
- **status** — planlagt, i drift, nedlagt
- **dokumentert lokal relevans** — lukt, støy, tungtrafikk, sprengning: bare når det er dokumentert,
  aldri antatt fordi anleggstypen «vanligvis» gir det
- **confidence** — vi publiserer ikke noe vi selv kaller usikkert

Små tekniske installasjoner skal normalt ikke vises. `public_candidate` settes aldri ukritisk, og
kravet står i databasen: koordinat og `verified_public_source`.

---

## 10. Mål på 2–3 år

Researchbasen kan vokse fra dagens hundrevis til 1 000, 5 000 eller 20 000+ funn.

**Målet er ikke antallet.** 20 000 udokumenterte rader er et dårligere produkt enn 2 000 som er
stedfestet, deduplisert, dokumentert, statussatt, regelmessig reviewet og med bevart historikk.

Retningen er en levende kunnskapsbase der vi om to år kan si: *«dette prosjektet er kontrollert
seks ganger, sist endret status i mars, og her er kildene for hver endring.»* Det er ikke noe
noen kan kjøpe seg til.

De kategoriene som gir mest igjen for historikk er de svært dynamiske: store prosjekter,
datasentre, energianlegg og mineraluttak. Det er også de som er dyrest å drifte. Derfor er
prioriteringen i kapittel 5 som den er — hygiene tas billig og raskt, slik at kapasiteten kan gå
til moat.

---

## 11. Beslutningsregel for nye idéer

Før en ny kategori bygges:

1. Er dette faktisk viktig før et boligkjøp?
2. Finnes det en troverdig kilde?
3. Kan det holdes oppdatert?
4. Tilfører vi mer enn Google, FINN eller andre?
5. Blir kombinasjonen med eksisterende NaboRadar-data sterkere?
6. Er dette hygiene eller moat?
7. Er verdien stor nok til å forsvare vedlikeholdet?

**Er svaret stort sett nei, ikke bygg det.** Og skriv det ned i «ikke verdt det nå» over, med
begrunnelsen — så slipper vi å vurdere samme idé på nytt om et halvår.

---

## 12. Neste byggepakke

I rekkefølge:

1. ~~**Naturfarepakken** — flom, jord-/flomskred, radon, stormflo~~ — levert 27.09.2026
2. **ÅDT** — trafikkmengde fra Statens vegvesen
3. **Jernbanestøy** — Bane NORs støysoner
4. **Store prosjekter** — design av research- og hybridmodellen, ikke et providerlag

Ingenting av dette er implementert. Dette dokumentet er roadmap og beslutningsgrunnlag.
