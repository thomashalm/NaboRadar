# Produktreview av `/omrade`

> Produktreview, ikke implementering. Gjennomført 2026-10-03. Ingenting ble endret i UI, data,
> sortering eller tekst i reviewen. Anbefalingene er ikke tatt stilling til. Ingen ADR.
> Hovedfunn: siden er riktig i hver enkelt del, men den er ordnet etter hva vi har data om, ikke
> etter hva en boligkjøper må vite. Det sterkeste (støy, naturfare ved adressen, planer) ligger under
> en katalog over barnehager og skjenkesteder, og flere seksjoner vises fordi dataene finnes.

## Spørsmålet
«Hvis jeg vurderer å kjøpe denne boligen, hvilke ting på `/omrade` kan faktisk påvirke
beslutningen min, og hva mangler?»

## Metode
11 ekte adresser ble rendret mot produksjonsdata med radius 1 km. Den ferdige HTML-en, med alle
utvidere, ble lest for hver. Visuell kontroll ble gjort i nettleser på desktop og mobil (375 px).

| Adresse | Hvorfor |
|---|---|
| Langmyrgrenda 26C, Oslo | Rolig småhusområde |
| Karl Johans gate 1, Oslo | Sentrum, mye data |
| Bekkevollveien 10B, Oslo | Enebolig |
| Nordraaks gate 5, Oslo | Blokk |
| Ulvenveien 90A, Oslo | Ved E6/Ring 3 og Ulven transformatorstasjon |
| Olav V gate 100, Bodø | Ved flyplass |
| Alnabru, Oslo | Kartlagte kvikkleiresoner, 300 kV-ledning |
| Samuel Arnesens gate 5, Tromsø | Sju plansaker, stormflo |
| Engerdalsveien 1833, Engerdal | Landlig, lite data |
| Bryggen 5, Bergen | Ved sjøen |
| Sørkedalsveien 148, Oslo | Kraftledninger |

## Hva sidene faktisk viste
| Adresse | Nærområdet | Støy | Naturfare | Infrastruktur | Planer | Tilfluktsrom | Hytter |
|---|---|---|---|---|---|---|---|
| Langmyrgrenda | 2 skoler, 10 barnehager, 2 omsorg, 1 skjenkested | – | Radon (moderat til lav) | 1 trafo 680 m, 11 kV og 47 kV 470 m | Ingen | – | 9 innen 10 km |
| Karl Johan | 8 skoler, 9 barnehager, 1 omsorg, 1 anlegg, **532 skjenkesteder** | Veg 60–64, bane 55+ | Flom-aktsomhet, radon særlig høy, «ikke berørt av stormflo» | 3 trafo 630–780 m | 2 | 7 | 8 |
| Bekkevollveien | 6 skoler, 13 barnehager, 2 omsorg | – | Kvikkleire-aktsomhet, radon | Trafo 240 m, 47 kV 340 m | Ingen | – | 4 |
| Nordraaks gate | 5 skoler, 20 barnehager, 1 sykehus, 2 omsorg, 118 skjenkesteder | Veg 50–54 | Kvikkleire-aktsomhet, radon, kartlagt sone | Trafo 470 m | 1 | 5 | 9 |
| Ulvenveien | 3 skoler, 7 barnehager, 1 omsorg, 2 anlegg, 16 skjenkesteder | Veg 50–54 | Kvikkleire-aktsomhet, radon | 3 trafo (420 kV 470 m), 4 linjer (300 kV 320 m) | 1+ | – | 4 |
| Bodø | 6 skoler, 5 barnehager, 1 sykehus | **Rød flystøysone** | Flom-aktsomhet, radon | – | 2 | 3 | 3 innen 20 km |
| Alnabru | 2 anlegg, 3 skjenkesteder | Veg 50–54, bane 60+ | Radon, **5 kartlagte kvikkleiresoner** | 4 trafo, **300 kV 10 m unna** | Ingen | – | 5 |
| Tromsø | 2 skoler, 1 barnehage | – | Kvikkleire-aktsomhet, **stormflo ved framtidig havnivå** | Trafo 570 m | **7** | 1 | 3 |
| Engerdal | 1 barnehage | – | Radon | 22 kV 120 m, 132 kV 880 m | Ingen | – | 6 |
| Bergen | 9 skoler, 10 barnehager, 1 sykehus, 4 omsorg | Veg 55–59 | Kvikkleire-aktsomhet, radon, «ikke berørt av stormflo» | 3 trafo 530–990 m | Ingen | 6 | 9 innen 30 km |
| Sørkedalsveien | 5 skoler, 13 barnehager, 2 omsorg, 4 skjenkesteder | Veg 50–54 | Radon, 2 kartlagte soner | Trafo 700 m, 47 kV 260 m, 300 kV 760 m | Ingen | – | 9 |

Mønstre på tvers:
- **Radon står på alle 11 sidene**, 9 av 11 med «moderat til lav».
- **Infrastruktur står på 10 av 11.** Bare to funn ville endret en beslutning: 300 kV-ledningen 10 m
  unna på Alnabru, og 420 kV-stasjonen på Ulven.
- **Hytter står på alle 11**, også Karl Johans gate.
- **Nærområdet er størst på alle bysidene** og ligger først.
- **Støy mangler på 5 av 11.** Brukeren kan ikke se om det betyr «lite støy» eller «ikke kartlagt».
- **Planer og saker** ga treff på 5 av 11, og er den seksjonen som sier noe brukeren ikke kan se selv.

## B. Seksjon for seksjon

### Skolekrets (Oslo)
- **Sier:** hvilken barneskole adressen sogner til.
- **Påvirker kjøp:** ja, direkte, for barnefamilier.
- **Forståelig:** ja. Tre forbeholdslinjer under er i overkant, men riktige.
- **Dom:** behold. Styrkes med flere kommuner når lisensene er avklart.

### Nærområdet: skoler og barnehager
- **Sier:** alle skoler og barnehager innen radius, med avstand.
- **Påvirker kjøp:** nærmeste barneskole, ungdomsskole og barnehage gjør det. Resten er katalog.
- **Problemer funnet:**
  - Karl Johan: «8 skoler» der sju er videregående, og den første er «Eksamenskontoret i Akershus»,
    som ikke er en skole.
  - Nordraaks gate: 20 barnehager.
  - Videregående styres ikke av nærhet (fritt skolevalg i Oslo), så listen sier lite.
- **Dom:** styrk ved å vise mindre. Nærmeste barneskole og ungdomsskole med avstand, antall
  barnehager og de tre nærmeste. Videregående ut av standardvisningen. Enheter som ikke er
  undervisningssteder, filtreres bort.

### Nærområdet: helse og omsorg
- **Sier:** sykehus og omsorgstilbud i nærheten (omsorg nesten bare i Oslo).
- **Påvirker kjøp:** sjelden. Et sykehus 900 m unna endrer ikke et bud.
- **Problemer:**
  - «Villa Krogh akuttinstitusjon for barn» og «Blå Kors klinikk» står som nabolagsfakta uten at vi
    sier hvorfor de vises. Det leses lett som en advarsel vi ikke mener å gi.
  - Listen er «ikke uttømmende» og dekker nesten bare Oslo.
- **Dom:** nedton. Vis bare sykehus, og bare som én linje. Omsorgsinstitusjoner beholdes i admin, ikke
  offentlig, inntil vi vet hva brukeren skal bruke dem til.

### Nærområdet: virksomheter og anlegg
- **Sier:** anlegg med utslippstillatelse innen radius.
- **Påvirker kjøp:** ja når anlegget er tett på (lukt, støy, tungtrafikk). Et snøsmelteanlegg 980 m
  unna gjør det ikke.
- **Dom:** behold, men bare innen ca. 300–500 m. Overskriften «Virksomheter og anlegg» er for generell
  for det som er «anlegg med utslippstillatelse».

### Nærområdet: servering og uteliv
- **Sier:** steder med skjenkebevilling og tillatt stengetid (bare Oslo).
- **Påvirker kjøp:** bare som nattestøy helt inntil boligen. «532 steder innen 1 km» er ikke
  informasjon.
- **Dom:** vis bare ved treff av betydning: steder innen ca. 100 m med sen stengetid («3 utesteder
  innen 100 m har tillatt stengetid 03:30»). Ellers ikke vis seksjonen.

### Støy
- **Sier:** beregnet støynivå ved søkepunktet fra veg, bane og fly.
- **Påvirker kjøp:** ja, blant de sterkeste. Rød flystøysone i Bodø er et funn brukeren ellers ikke
  finner.
- **Problemer:**
  - Seksjonen forsvinner når det ikke er treff. Strategisk kartlegging dekker bare byområder og store
    veger, så fravær kan bety «ikke kartlagt».
  - «Lden 50–54 dB» sier lite uten referanse. Forklaringen ligger bak utvideren.
  - Ulvenveien, ved E6 og Ring 3, viser 50–54 dB. Det kan være riktig for punktet, men brukeren får
    ikke vite at 65+ ligger noen titalls meter unna.
- **Dom:** styrk og flytt opp.
  - Én menneskelig linje per nivå med kildens egne ord (gul og rød sone er definert i T-1442).
  - Si om området er kartlagt eller ikke.
  - Vurder «høyeste nivå innen 100 m» ved siden av nivået i punktet.

### Naturfare
- **Sier:** radon, flom, skred, kvikkleire og stormflo ved punktet og i nærheten.
- **Påvirker kjøp:** kartlagt faresone, flomsone og stormflo gjør det. «Moderat til lav radon» gjør det
  ikke, og står på 9 av 11 sider med samme tyngde som en kartlagt kvikkleiresone.
- **Problemer:**
  - Radon er overskriften i seksjonen når ingenting annet finnes, og står dobbelt (sammendrag og kort).
  - «Ikke berørt av kartlagte stormflonivåer» vises som eget kort. Det er et fravær.
  - «Aktsomhetsområde for kvikkleireskred» traff 5 av 9 byadresser. Det er riktig (marin leire), men
    så vanlig at det må leses som bakgrunn, ikke funn.
  - «Skredfaresoner … svarte ikke akkurat nå» sto på 5 av 11 sider under gjennomgangen.
    Kildesjekken etterpå var OK, så kilden er ustabil under last.
- **Dom:** styrk hierarkiet inne i seksjonen.
  - Først: kartlagt sone, eller funn som berører punktet (flomsone, skredfaresone, kvikkleiresone,
    stormflo).
  - Så: aktsomhetsområder.
  - Sist, på én linje: radon når klassen er moderat til lav, og fravær.
  - Høy og særlig høy radon beholdes som funn.
  - All læring fra radon- og stormflo-QA står ved lag (ADR 008 og 015).

### Infrastruktur
- **Sier:** transformatorstasjoner og luftledninger innen radius, med spenning og eier.
- **Påvirker kjøp:** en høyspentledning over eller ved tomta gjør det. En 11 kV-linje 470 m unna
  eller en transformatorstasjon 780 m unna gjør det ikke.
- **Problemer:**
  - Distribusjonslinjer (11–22 kV) er det samme som stolpene i enhver gate.
  - Alle objekter har samme vekt. 300 kV 10 m unna og 47 kV 700 m unna ser like ut.
  - Forbeholdet står dobbelt: «Jordkabler inngår ikke … Jordkabler inngår ikke i NVEs åpne data.»
  - Navnet «Infrastruktur» lover mer enn kraftnett.
- **Dom:** vis bare ved treff av betydning.
  - Regional- og transmisjonsnett (≥ 47 kV) innen ca. 100 m, og transformatorstasjoner innen ca. 200 m.
  - Distribusjonsnett ut.
  - Nytt navn: «Kraftledninger og transformatorstasjoner».
  - Ingen seksjon når ingenting er nær nok.

### Planer og saker
- **Sier:** varslede planarbeid, med tiltakstype og formål som sitat.
- **Påvirker kjøp:** ja. Havnehotellet 30 m fra Samuel Arnesens gate er nøyaktig det brukeren vil vite.
- **Vurdering av v2:**
  - «Mest relevant» ga riktig rekkefølge i Tromsø: saken i planområdet først, så 400 m, 470 m og 540 m.
  - Kortene er kompakte. Formålssitatet på 150 tegn er passe.
  - Forbeholdet én gang over lista fungerer.
  - Seksjonen ligger for langt ned til at brukeren ser den.
- **Dom:** behold og flytt opp. Neste styrking er kjent: bygg med tillatelse fra matrikkelen.

### Tilfluktsrom
- **Sier:** offentlige tilfluktsrom med plasser.
- **Påvirker kjøp:** nei.
- **Problem:** «Kilde:» står med tomt kildenavn i gruppen. Bør sjekkes som mulig feil.
- **Dom:** flytt nederst som én linje, eller bare lenke til `/tilfluktsrom`, som allerede finnes.

### Friluft i nærheten (hytter)
- **Sier:** hytter og koier innen 10–30 km.
- **Påvirker kjøp:** nei. «8 hytter innen 10 km» på Karl Johans gate er et eksempel på data vi viser
  fordi de finnes.
- **Dom:** ut av `/omrade` som liste. Én lenke nederst til `/hytter` holder. Hyttene er en egen
  utforsker (ADR 006).

### Kartet og toppen av siden
- På mobil fyller adressen, radiusvalget og kartet hele første skjerm. Første funn står under
  bretten.
- Skolekretsen er eneste funn over kartet på desktop.
- Det finnes ingen kort oppsummering av «det viktigste ved denne adressen».

## C–D. Hierarki
Dagens rekkefølge: Nærområdet → Støy → Naturfare → Infrastruktur → Planer og saker → Tilfluktsrom →
Friluft. Begrunnelsen var at Nærområdet er lettest å forstå og nesten alltid har innhold. Det er
riktig for en katalog, men feil for en kjøper: det som alltid har innhold, er sjelden det som avgjør
noe.

Forslag til rekkefølge, etter hvor mye det kan endre en beslutning:
1. **Ved adressen:** støy og naturfare som berører søkepunktet.
2. **Hva kan endre seg:** planer og saker.
3. **Hverdagen:** skolekrets, nærmeste skoler og barnehager (kollektiv og trafikk hører hjemme her
   når vi har dem).
4. **Tett på:** kraftledning, anlegg med utslippstillatelse og utesteder. Bare når de er nære.
5. **Nederst:** lenker til tilfluktsrom og hytter.

Nærområdet deles altså: skole og barnehage blir «Hverdagen», mens anlegg og servering flytter til
«Tett på» med avstandsterskel.

## I. Hva mangler
Rangert internt etter brukerverdi, datakvalitet, nasjonal dekning, kostnad, juss og hvor mye det
skiller NaboRadar fra boligportalene.

| # | Behov | Verdi | Kilde og dekning | Kostnad | Skiller oss ut | Vurdering |
|---|---|---|---|---|---|---|
| 1 | **Trafikk i gata:** ÅDT, andel tunge kjøretøy, fartsgrense | Høy | NVDB (Statens vegvesen), åpen, nasjonal for riks- og fylkesveg, varierende for kommunal veg | Lav–middels | Ja | Første nye datasett |
| 2 | **Bygg med tillatelse** (ramme/igangsetting) | Høy | Matrikkelen, CC BY 4.0, nasjonal. Uten dato | Middels | Ja | Trinn 2 av Planer og saker, research gjort |
| 3 | **Kollektivtilbud:** nærmeste holdeplass, avganger per time | Høy | Entur, åpen (NLOD), nasjonal | Middels | Delvis | Etter trafikk |
| 4 | **Kulturminner og vern** på eller ved eiendommen | Høy for eneboliger | Riksantikvaren (Askeladden, SEFRAK), åpen, nasjonal | Lav–middels | Ja | Sier hva du ikke får gjøre med huset |
| 5 | **Vedtatte planer og reguleringsformål** | Høy | Nasjonal planbase, ikke åpent lisensiert | – | Ja | Venter på DiBK |
| 6 | **Eiendomsfakta** (type, tomt) | Middels | Åpen matrikkel | Lav (live) | Nei | Research gjort, avventer |
| 7 | **Luftkvalitet** (luftsonekart) | Middels | Miljødirektoratet/kommuner, bare større byer | Lav | Delvis | Etter 1–4 |
| 8 | **Bredbånd og mobildekning** | Middels, høy på landet | Nkom, tilgang må undersøkes | Ukjent | Delvis | Research før vurdering |
| 9 | **Større prosjekter** (datasenter, industri) | Middels | Egen research i admin | Høy (manuelt) | Ja | Ikke nå |
| 10 | **Solforhold og terreng** | Høy interesse | Høydemodell, tung beregning | Høy | Ja | Ikke nå |
| 11 | **Siste salg** | Høy | Grunnboken, krever org.nr og tilgang | – | Nei | Avventer |
| 12 | **Skolekvalitet** | Etterspurt | Udir, etisk og metodisk vanskelig | – | – | Ikke bygg: rangerer steder |
| 13 | **Kriminalitet** | Etterspurt | Ingen åpen kilde på adressenivå, stigmatiserende | – | – | Ikke bygg |

## J. «Sjekk før bud»: seks områder
1. **Ved adressen:** støy og naturfare som berører boligen.
2. **Hva kan endre seg:** planarbeid, bygg med tillatelse og, senere, vedtatte planer.
3. **Hverdagen:** skolekrets, skole og barnehage, kollektiv, trafikk i gata.
4. **Tett på:** høyspent, anlegg med utslipp og utesteder helt inntil.
5. **Hva du kan gjøre med eiendommen:** kulturminne, vern og, senere, regulering.
6. **Eiendommen:** type, tomt og, senere, siste salg.

I dag dekker vi 1 godt, 2 delvis, 3 halvveis (skole ja, kollektiv og trafikk nei) og 4 med for mye
støy i visningen. 5 og 6 dekkes ikke. «Sjekk før bud» er først et ærlig løfte når 2 og 3 er
sterkere.

## K. Anbefaling
1. **Sterke, beholdes:** skolekrets, støy, naturfare (kartlagte soner, flom, stormflo), planer og saker.
2. **Styrkes:**
   - Støy: forklaring, kartlagt eller ikke, høyere på siden.
   - Naturfare: hierarki inne i seksjonen.
   - Skoler: nærmeste barneskole og ungdomsskole.
   - Planer: bygg med tillatelse.
3. **Nedtones:** radon ved moderat til lav, aktsomhetsområder som bakgrunn, helse og omsorg, anlegg
   langt unna.
4. **Fjernes fra `/omrade`** (data beholdes):
   - hytter som liste (lenke holder),
   - tilfluktsrom som seksjon (lenke),
   - distribusjonsnett,
   - skjenkesteder som katalog,
   - omsorgsinstitusjoner offentlig,
   - videregående skoler i standardvisningen.
5. **Mangler som bør prioriteres:** trafikk (ÅDT), bygg med tillatelse, kollektiv, kulturminner.
6. **Rekkefølge:** Ved adressen → Hva kan endre seg → Hverdagen → Tett på → lenker nederst.
7. **De neste tre stegene:**
   1. Omprioritering uten nye data: ny rekkefølge, avstandsterskler, kompaktere skoleliste, radon og
      fravær på én linje, tilfluktsrom og hytter som lenker, og retting av småfeilene under.
   2. Trafikk i gata fra NVDB (research først): ÅDT, tungtrafikk og fartsgrense for nærmeste veger.
   3. Bygg med tillatelse fra matrikkelen som trinn 2 av Planer og saker.
8. **Lar være nå:**
   - eiendomskort med bulkimport,
   - siste salg,
   - fiske og multe,
   - solforhold,
   - skolekvalitet og kriminalitet,
   - verdiestimat,
   - poengsum eller samlet «vurdering» av adressen,
   - flere kataloglag.

## Småfeil funnet underveis (ikke rettet)
- Forbeholdet under kraftlinjer står dobbelt («Jordkabler inngår ikke …» to ganger; to tekster i
  `lib/facts/wording.ts` slås sammen).
- «Eksamenskontoret i Akershus» vises som videregående skole.
- «Kilde:» uten kildenavn i tilfluktsromgruppen.
- Skredoppslaget feilet på 5 av 11 sider under rask gjennomgang, men var OK i kildesjekken etterpå.
- På mobil er første funn under bretten.

## Begrensninger ved reviewen
- Én radius (1 km) og 11 adresser. Ni er i Oslo eller andre byer.
- Ingen brukertesting. Vurderingene er produktskjønn, ikke målt atferd.
- Tersklene (100 m, 300 m, 500 m) er forslag og må prøves mot ekte adresser før de bygges.
