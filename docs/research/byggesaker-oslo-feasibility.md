# Feasibility: byggesakshistorikk i Oslo (oppfølging)

**Type:** research + pilot. Ingen kode, ingen tabeller, ingen import, ingenting publisert.
**Dato:** 2026-10-07
**Bygger på:** [eiendomshistorikk-feasibility.md](eiendomshistorikk-feasibility.md) (2026-09-27) og
[ADR 004](../adr/004-no-scraping-oslo.md). Les dem først — denne fila gjentar ikke kartleggingen, den
sier hva som er nytt ti dager senere og hva en pilot på ni Oslo-adresser viste.

---

## 0. Konklusjon

**Dataene finnes og er gode. Adgangen er den samme som i september: stengt for maskiner.**

- Oslos Saksinnsyn er fortsatt eneste kilde til saker, datoer, vedtak og ferdigattester per eiendom.
  `robots.txt` er uendret: `Disallow: /` med kommentaren «dette hindrer alle roboter fra å søke».
- Det finnes fortsatt ikke noe åpent datasett eller dokumentert API for byggesaker i Oslo. Søkt på
  nytt i Felles datakatalog og Geonorge 2026-10-07: null relevante treff.
- Den åpne kjeden adresse → eiendom → bygg → *dagens* bygningsstatus virket på 9 av 9 pilotadresser.
  Den gir ikke én eneste sak, dato eller historikk.
- Pilotadressene er derfor **ikke** slått opp i Saksinnsyn. Det er den crawlingen robots.txt og
  ADR 004 avviser, og oppdraget ba i tillegg om å lete etter underliggende JSON-kall — det er
  nettopp «reverse engineering av interne endepunkter».

**Anbefaling: B — én ekstra pilot, men ikke en teknisk.** Se kapittel 9.

---

## 1. Hva som er nytt siden 27. september

| Funn | Kilde | Betydning |
|---|---|---|
| PBE byttet saksbehandlingssystem 15.09.2025. Alle åpne saker ble avsluttet i gammelt system og videreført i **ny sak med nytt saksnummer** (`2024/00000`). Saksinnsyn viser koblingen | `saksinnsyn/omtjeneste.asp` (tillatt i robots.txt) | En tidslinje må slå sammen gammel og ny sak. «Avsluttet» på en sak fra 2025 kan bety «flyttet», ikke «ferdig» |
| Dekning, med etatens egne ord: komplette elektroniske saker **fra og med 2006**; eldre papirmapper er digitalisert og publisert; før 2006 ligger vedtak og tegninger i separate filer | samme + oslo.kommune.no «Tegninger og ferdigattester» | Strukturert saksgang fra 2006. Eldre saker er skannede mapper |
| **Tegninger krever innlogging** (ID-porten). Noen eldre dokumenter er merket «ikke tilgjengelig på internett» og bestilles på e-post | samme | Dokumenter kan uansett bare lenkes til, ikke vises |
| Eiendomssaker (oppmåling, deling, seksjonering, adressering): dokumentfiler bare for saker opprettet etter 01.09.2022 | samme | Seksjoneringshistorikk er tynnere enn byggesakshistorikk |
| Publisering skjer normalt to dager etter registrering, etter dokumentkontroll. Offentlige dokumenter kan likevel være unntatt publisering | samme | «Aktiv sak» er alltid minst to dager gammel. Hull i dokumentlisten er normalt |
| Postlisten går sju år tilbake | samme | Ikke en historikkilde |
| Abonnement på nye saker per grunnkrets (558 kretser) finnes, men er e-post bak ID-porten | `saksinnsyn/omabonnement.asp` (tillatt) | Ingen maskinlesbar strøm |
| `developer.oslo.kommune.no`: fortsatt «Denne siden finnes ikke lenger» | HTTP 200 med den teksten | Uendret |
| eInnsyn: `einnsyn.no` sperrer `/api/`, `/sok`, `/saksmappe`. `api.einnsyn.no/robots.txt` er `Disallow: /` | robots.txt | Uendret |
| Siste publisering i Saksinnsyn: 07.10.2026 | `omtjeneste.asp` | Tjenesten er levende og daglig oppdatert |

Ingen vilkår for viderebruk er publisert, verken på oslo.kommune.no eller i Saksinnsyn. Som i
september: fravær av vilkår er uavklart, ikke fritt.

---

## 2. Oslos kilder, samlet

| Kilde | Innhold | Strukturert? | Tilgang | Kan NaboRadar bruke den? |
|---|---|---|---|---|
| **Saksinnsyn** (`innsyn.pbe.oslo.kommune.no/saksinnsyn/`) | Byggesaker, plansaker, eiendomssaker, heissaker. Saksnummer, tittel, mottatt/avsluttet, status, gnr/bnr, adresse, dokumentliste med dato og inn/ut | Ja på saksnivå. Vedtaket selv er et dokument | Åpen for mennesker. `Disallow: /` for roboter | **Nei, uten avtale.** Lenke ut er greit |
| Saksinnsyn «Saker i kart» / Planinnsyn | Pågående byggesaker som kartsymboler | Ukjent — ikke undersøkt, samme vert og samme sperre | Samme | Nei |
| Postlisten | Journalposter per dag, sju år | Ja | Samme vert | Nei |
| eInnsyn | Oslo PBEs journalposter | Ja, men uten adressenøkkel | robots sperrer | Nei |
| DiBK NAP (nabovarsel/planvarsel) | Varsler kommunen selv sender inn, med `link` til Saksinnsyn | Ja | I bruk i dag | **Ja — allerede i NaboRadar** |
| Matrikkelen – Bygningspunkt (WFS) | Bygningstype og **dagens** bygningsstatus (RA, IG, MB, FA, TB, GR …) per bygg | Ja | Åpen, CC BY 4.0 | **Ja** |
| Matrikkelen – Eiendomskart Teig (WFS) | Teigpolygon per gnr/bnr | Ja | Åpen, CC BY 4.0 | **Ja** |
| Kartverket Adresse-API | Adresse → kommunenr, gnr, bnr, bruksenheter | Ja | Åpen | **Ja — i bruk** |
| Matrikkel-API (bygningshistorikk, byggeår, datoer for RA/IG/MB/FA) | Statusdatoer per bygg | Ja | Krever avtale med Kartverket | Bare med avtale |
| FKB-Tiltak (Geovekst) | Omriss av tiltak under behandling/bygging | Ja | «Norge digitalt begrenset» | Nei |
| Byarkivet | Bygningshistorie før PBEs arkiv | Nei | Manuell | Nei |

**Primærkilde for det oppdraget beskriver: Saksinnsyn.** Ingen annen kilde har saker.

---

## 3. Pilot: ni adresser gjennom den åpne kjeden

Adressene er valgt mekanisk fra matrikkelen etter bygningstype og status i fire områder (Røa,
Nordstrand, Løren, Grünerløkka), ikke etter hvem som bor der. Kjeden: Adresse-API → teig (WFS) →
bygningspunkt i teigen (WFS). Kjørt 2026-10-07.

| # | Adresse | Type | Gnr/bnr | Bygg i teigen (type · status) | Bruksenheter | Det den åpne kjeden kan si |
|---|---|---|---|---|---|---|
| 1 | Harald Løvenskiolds vei 17 | Enebolig | 12/270 | 111 enebolig · TB; 181 garasje · TB | 1 | Bygd og tatt i bruk. Ingenting om når eller hva som er søkt |
| 2 | Griniveien 28 | Enebolig, **aktiv sak** | 12/260 | 111 · **GR** og 181 · **GR**; to nye 111 · **RA** | – | Eksisterende hus og garasje godkjent revet; rammetillatelse for to nye eneboliger. Registeret oppdatert 05. og 08.2024 |
| 3 | Melumveien 57B | Enebolig, **under bygging** | 12/282 | 111 · FA; ny 111 · **IG**; ny 181 · **IG** | – | Ny enebolig og garasje har igangsettingstillatelse. Eksisterende hus har ferdigattest |
| 4 | Kittel-Nielsens vei 63 | Tomannsbolig | 183/247 | 121 · FA | 2 (to matrikkelenheter) | Ferdigattest finnes. Ikke for hva, ikke når |
| 5 | Lindbäckveien 33 | Rekkehus | 183/360 | 131 · FA | 1 | Samme |
| 6 | Fossveien 9 | Eldre bygård | 228/29 | 142 · TB, SEFRAK | 10 (én matrikkelenhet) | Tatt i bruk. Null om alle saker en gård fra 1800-tallet har hatt |
| 7 | Frydenbergveien 50 | Nyere leilighetsbygg | 126/158 | 146 · FA | 38 (én matrikkelenhet) | Ferdigattest finnes |
| 8 | Frydenbergveien 54 | Leilighetsbygg, seksjonert | 126/160 | 143 · TB | 40 (40 matrikkelenheter) | Tatt i bruk. Registeret oppdatert 28.09.2026 — uten at vi kan se hva som endret seg |
| 9 | Thorvald Meyers gate 9 | Bygård/næring, **kjent sak** | 225/280 | tre bygg 311 · TB | – | Tatt i bruk. **Bruksendringen med rammetillatelse 2021 og ferdigattest 2022 (dokumentert i september) synes ikke** |

### Hva piloten viser

1. **Adresse → eiendom → bygg er løst: 9 av 9.** Eksakt gnr/bnr fra Adresse-API-et, ett teigpolygon
   hver, og bygningspunktene inni.
2. **Nybygg og riving synes. Alt annet synes ikke.** Adresse 2 og 3 gir et riktig og nyttig svar
   («godkjent revet, rammetillatelse for to nye hus»). Adresse 9 er motbeviset: en hel byggesak med
   ramme, igangsetting, brukstillatelse og ferdigattest endret ingenting i det åpne registeret, fordi
   den gjaldt et eksisterende bygg. Tilbygg, påbygg, fasadeendring og bruksendring er
   bygningsendringer i matrikkelen, og de er ikke med i det åpne datasettet (ingen løpenummer i
   `Bygning`-objektet).
3. **Ingen datoer.** `oppdateringsdato` er registerets dato, ikke vedtaksdato. For adresse 2 passer
   den med saken; for adresse 1, 5 og 7 er den 15.06.2020 — en masseoppdatering.
4. **Ingen historikk.** Statusfeltet er ett felt med dagens verdi. Et hus som fikk ferdigattest i 1998
   og et som fikk det i 2024, ser like ut.

### Tidslinjen en bruker kunne fått i dag, uten Saksinnsyn

```
Griniveien 28 (12/260)
  Bolig og garasje: godkjent revet
  To nye eneboliger: rammetillatelse gitt — ikke registrert igangsatt
  Kilde: matrikkelen. Datoer og saksdokumenter: se Oslos Saksinnsyn →

Thorvald Meyers gate 9 (225/280)
  Tre bygg: tatt i bruk
  Kilde: matrikkelen. Viser ikke saker på eksisterende bygg.
```

Det andre eksempelet er det ærlige bildet for de fleste adresser: ingenting å vise.

### Tidslinjen oppdraget ber om

Den finnes for én sak, hentet for hånd i september (kapittel 5 i forrige fil):

```
2021 – Bruksendring av underetasje til klatrehall (sak 202114553)
  Søknad om rammetillatelse   17.09.2021
  Rammetillatelse             09.11.2021
  Igangsettingstillatelse     16.11.2021
  Midlertidig brukstillatelse 03.02.2022
  Ferdigattest                08.07.2022
  Status hos kommunen: «Saken er avsluttet» (09.11.2022)
```

Den er mulig å bygge fordi dokumentlisten har type og dato. Den er ikke mulig å hente lovlig.

---

## 4. Eiendomskoblingen

| Ledd | Kan vi vite det sikkert? | Grunnlag |
|---|---|---|
| Adresse → kommunenr + gnr/bnr | **Ja** | Adresse-API, eksakt |
| Gnr/bnr → teig | **Ja** | Teig-WFS. Kommunenummer må alltid med |
| Teig → bygg | **Ja, med forbehold** | Punkt-i-polygon. Bygg på grensen og eiendommer med flere teiger må håndteres |
| Bygg → bruksenheter → matrikkelenheter | **Ja** | `bruksenhet.matrikkelenhetId`: adresse 7 har 38 enheter på én matrikkelenhet (ikke seksjonert), adresse 8 har 40 på 40 (seksjonert) |
| Eiendom → byggesak | **Ja hos kommunen, ikke hos oss** | Saksinnsyn fører gnr/bnr på hver sak. I september ga gnr/bnr-søk 65 saker uten falske treff; adressesøk ga falske treff |
| Bygg → byggesak | **Nei** | Vi har ikke sett bygningsnummer på saker. På eiendommer med flere bygg (adresse 2, 3, 9) vet vi ikke hvilket bygg en sak gjelder uten å lese tittelen |
| Seksjon → byggesak | **Nei** | Se kapittel 5 |

Kjente feller: hjørnegårder med flere adresser (samme gnr/bnr, så de løser seg selv),
gammel adresse i eldre saker (gnr/bnr er nøkkelen, ikke adressen), sammenføyde og delte
eiendommer (saken blir liggende på det gamle bruksnummeret), og fra 2025 gammelt og nytt
saksnummer for samme sak.

---

## 5. Leiligheter

For adresse 6, 7 og 8 kan vi telle bruksenheter og se om bygget er seksjonert. Vi kan ikke koble en
sak til en seksjon:

- sakene føres på gnr/bnr; om seksjonsnummer er et søkbart felt er ikke undersøkt,
- de fleste saker i en bygård gjelder hele bygget (fasade, tak, heis, loftsutbygging),
- en sak som gjelder én leilighet (bad, sammenslåing, bruksendring) sier det i tittelen, i fritekst.

**Anbefaling:** vis «Byggesaker for bygget og eiendommen». Aldri «byggesaker på din leilighet». Det
gjelder også om tilgangen en dag åpner seg.

---

## 6. Status: hva som kan sies, og hva som ikke kan

Uendret fra september, med ett tillegg: saksstatus er *arkivstatus*. «Saken er avsluttet» betyr at
mappen er lukket — og fra september 2025 kan det bety at saken fortsatte under nytt nummer.

Forslag til normalisering, **ikke bygget**. Statusen utledes av hvilke dokumenttyper som finnes, og
originalen beholdes:

| `source_status` / dokument funnet | `naboradar_status` | Tekst til bruker |
|---|---|---|
| Bare søknad | `RECEIVED` | Søknad mottatt |
| Rammetillatelse, ikke IG | `APPROVED_NOT_STARTED` | Rammetillatelse gitt |
| Igangsettingstillatelse / ett-trinns tillatelse | `APPROVED_IN_PROGRESS` | Tillatelse til å bygge gitt |
| Midlertidig brukstillatelse | `IN_USE_NOT_COMPLETE` | Midlertidig brukstillatelse — ferdigattest mangler |
| Ferdigattest | `COMPLETED` | Ferdigattest gitt |
| Avslag | `REJECTED` | Søknaden ble avslått |
| «Sak trukket» | `WITHDRAWN` | Trukket |
| Henlagt | `DROPPED` | Henlagt — sier ikke om noe ble bygget |
| Avsluttet uten vedtaksdokument | `UNKNOWN` | Avsluttet hos kommunen. Utfallet er ikke kjent |
| Videreført i ny sak (2025) | `CONTINUED` | Fortsetter i sak … |

Aldri «godkjent» som samleord. Rammetillatelse er ikke lov til å bygge, og midlertidig
brukstillatelse er ikke ferdig. Klage og omgjøring er ikke med: et vedtak kan være opphevet uten at
dokumenttypene viser det.

---

## 7. Dokumenter

- Saksnivået er strukturert: tittel, datoer, gnr/bnr, og en dokumentliste med dato, retning og tittel.
  Det meste av verdien — tiltak, når, hvilke tillatelser — ligger i dokument*titlene*, ikke i innholdet.
- Vedtaket er et dokument. «Avslag» og vilkår står i PDF-en.
- Fra 2006: maskinlesbare PDF-er, sannsynligvis. Før 2006: skannede mapper. Ikke kontrollert.
- Tegninger krever innlogging. Dokumentfilene svarte 302 uten sesjon i september.
- Personopplysninger: etaten sier selv at sakene inneholder «alminnelige opplysninger om søker,
  tiltakshaver eller andre parter». På små tiltak er det privatpersoner. Nabomerknader er dokumenter.

**Anbefaling hvis det bygges:** bare saksmetadata og dokumenttitler med dato. Ingen navn, ingen
dokumentinnhold, ingen dokumentparser. Dokumenter lenkes til, og brukeren åpner dem hos kommunen.

---

## 8. Lovlighet, robusthet og moat

**Tilgang.** Dataene er offentlige for mennesker. Roboter er uttrykkelig bedt om å holde seg unna, og
vilkår for viderebruk finnes ikke. Om caching av metadata er greit, er et spørsmål til PBE — ikke
noe vi kan slutte oss til. Endepunktene er klassisk ASP fra en egenutviklet løsning; etaten byttet
nettopp fagsystem, så formatet kan endre seg.

**Hva som er lett å kopiere:** adresse → gnr/bnr → bygg (åpne API-er, én dag), og selve hentingen
hvis den først er tillatt.

**Hva som kan bli en dataeiendel — i denne rekkefølgen:**

1. **Avtalen med PBE.** Den kan ikke skrapes fram, og den tar tid å få.
2. **Statusnormaliseringen** fra dokumenttyper, med «ukjent» som gyldig svar. Redaksjonelt arbeid av
   samme slag som naturfare-ordforrådet.
3. **Sammenslåing av saker som hører sammen:** gammelt/nytt saksnummer, ferdigattest søkt i egen sak
   år senere, ramme og IG i ulike saker.
4. **Egen historikk:** `first_seen` / `last_seen` og statusendringer over tid. Kommunen viser bare
   dagens tilstand; den som har fulgt med, vet når noe endret seg.
5. Sak → bygg-kobling og stabile egne ID-er. Nyttig, men følger av 1–3.

Ingen av delene bygges nå.

---

## 9. Anbefaling

**B — én ekstra pilot. Men piloten er et brev og en manuell kontroll, ikke kode.**

1. **Spør PBE.** To spørsmål, uendret fra september: kan NaboRadar hente saksmetadata (ikke navn,
   ikke dokumentinnhold) maskinelt, og på hvilke vilkår — og finnes det et datasett vi ikke har
   funnet? Nytt argument: etaten har nettopp byttet fagsystem, og det er nå de vet hva det kan
   levere. Om brevet fra september ble sendt, står ikke i repoet.
2. **Manuell kontroll av de ni pilotadressene.** Et menneske slår opp gnr/bnr i Saksinnsyn og fyller
   ut tabellen i kapittel 3: antall saker, eldste sak, om ferdigattest kan leses av dokumentlisten,
   og om adresse 9 og 2 stemmer med det matrikkelen viser. Det tar en time, og svarer på punkt 4–6
   i oppdraget med reelle tall.
3. **Ikke A.** En Oslo-MVP uten svar fra PBE bryter ADR 004 og hviler på udokumenterte ASP-sider i
   et system som nettopp er byttet ut.

### Det som kan lages uten Saksinnsyn — hvis det er ønsket

Ikke anbefalt som «byggesakshistorikk», fordi det ikke er det. Men det er lovlig og lite:

- bygningsstatus fra matrikkelen der den ikke er TB/FA («godkjent revet», «rammetillatelse gitt»,
  «under bygging», «midlertidig brukstillatelse»), og
- en lenke: «Se byggesakene for gnr 12 bnr 260 hos Oslo kommune».

Det første ble vurdert og lagt bort i september («ikke prioritert»). Det andre er en lenke brukeren
klikker på selv. Hvordan lenken må se ut for å lande på riktig eiendom, er ikke kontrollert i denne
runden — den må prøves for hånd i en nettleser først.

### Hva en MVP ikke skal love, uansett tilgang

- ikke «alle byggesaker» — dokumenter kan være unntatt publisering, og eldre saker er skannede mapper,
- ikke «godkjent» — bare den konkrete tillatelsen,
- ikke «ferdig» uten ferdigattest,
- ikke «din leilighet»,
- ikke at fravær av saker betyr at ingenting er bygget,
- ikke at et vedtak står seg — klage og omgjøring er ikke med.

### Arbeidsmengde hvis PBE sier ja

Grovt, og avhengig av hva de tilbyr: 1–2 uker for adapter, statusregler, tidslinje på én eiendom og
QA mot pilotadressene. Leverer de et API, er det mindre. Må vi lese sidene deres, er det mer
vedlikehold enn utvikling.

---

## 10. Metode og begrensninger

- Lest: `robots.txt` for `innsyn.pbe.oslo.kommune.no`, `od2.pbe.oslo.kommune.no`,
  `www.oslo.kommune.no`, `einnsyn.no`, `api.einnsyn.no`; de to sidene robots.txt uttrykkelig
  tillater (`omtjeneste.asp`, `omabonnement.asp`); oslo.kommune.no om innsyn og om tegninger og
  ferdigattester.
- Søkt: Felles datakatalog («byggesak», «byggesaker», «ferdigattest», «plan- og bygningsetaten») og
  Geonorge kartkatalog («byggesak», «Oslo kommune byggesak», «tiltak»). Ingen datasett med saker.
- Kjørt: åpen kjede for ni adresser mot Kartverkets Adresse-API og to Geonorge-WFS-er.
- **Ikke gjort:** oppslag i Saksinnsyn, «Saker i kart», Planinnsyn eller postlisten; nettverksinspeksjon
  av de samme; eInnsyn-API. Tallene om Saksinnsyn (65 saker på 225/280, eldste 1960, én komplett sak)
  er fra september og er ikke kontrollert på nytt.
- Ikke kontrollert: om seksjonsnummer eller bygningsnummer er felt på en sak; andel skannede
  dokumenter; hvor ofte dokumentlisten har hull; om `od2.pbe.oslo.kommune.no` har dokumenterte
  karttjenester med saker (robots-fila der er feilstavet og sperrer i praksis ingenting, men det er
  ikke en invitasjon).
- Pilotadressene er vanlige adresser valgt etter bygningstype. Ingen beboere, eiere eller søkere er
  slått opp eller notert.
