# Feasibility: eiendomshistorikk / byggesakshistorikk per eiendom

**Type:** ren research. Ingen kode, ingen databaseendring, ingen provider, ingenting publisert i `/omrade`.
**Dato:** 2026-09-27 · **Alle funn under er testet mot live tjenester samme dag.**

---

## 0. Beslutning (september 2026)

> **Ikke prioritert.**
>
> * **Full byggesakshistorikk:** revurderes dersom det kommer eksplisitt maskinell tilgang til
>   kommunale byggesaksdata.
> * **Bygningsstatus og SEFRAK:** bygges ikke nå. Forventet brukerverdi forsvarer ikke plass og
>   kompleksitet.

Beslutningen overstyrer anbefalingene lenger nede i dokumentet. Kapitlene under er beholdt
uendret som **dokumentasjon av kildelandskapet**, ikke som en plan: de sparer neste runde for å
måtte gjøre kartleggingen på nytt, og de sier presist hva som må ha endret seg før saken tas opp
igjen. Der teksten sier «bygg dette nå» eller «neste datapakke», er det den opprinnelige
vurderingen fra researchen — ikke gjeldende prioritering.

**Utløser for ny vurdering:** at en kommune eller et nasjonalt organ publiserer et dokumentert,
maskinlesbart grensesnitt mot byggesaksdata — eller at Oslo PBE svarer ja på en avtale. Ingen av
delene krever at vi følger med aktivt; det vil være synlig når det skjer.

---

## 1. Konklusjon først (opprinnelig research-vurdering)

**Dette høres bedre ut enn det er — men det inneholder én liten, undervurdert gullklump.**

Delt i tre:

| Del | Dom | Hvorfor |
|---|---|---|
| **Byggesakshistorikk (saker og dokumenter) nasjonalt** | ❌ **Ikke verdt tiden nå** | Ingen nasjonal kilde finnes. Verken register, API eller datasett. Kartleggingen må gjøres kommune for kommune, og de to rutene som faktisk har data er begge `Disallow`-et i robots.txt |
| **Byggesakshistorikk i Oslo** | ⏸ **Realistisk, men sperret på juss — ikke på teknikk** | Dataene er utmerkede og komplette tilbake til 1960. Teknisk er det en ukes arbeid. Men Oslos robots.txt sier `Disallow: /`, og vår egen [ADR 004](../adr/004-no-scraping-oslo.md) forbyr det. Krever skriftlig avtale med PBE først |
| **Bygningens livsløpsstatus fra matrikkelen** | ✅ **Bygg dette. Snarest.** | Nasjonalt, CC BY 4.0, én åpen WFS, ingen avtale, ingen scraping. Svarer på «er det gitt tillatelse her som ikke er fullført?» for hele Norge. Dette er den høyeste verdien per arbeidstime i hele ideen — og den lå skjult inne i et datasett vi allerede kjenner |

**Kort sagt:** ideen «vi viser byggesakshistorikken på eiendommen» skalerer ikke. Men det viktigste
*spørsmålet* ideen svarer på — *har noen fått lov til å bygge noe her, og ble det bygget?* — kan besvares
nasjonalt i morgen, fra en kilde vi allerede har lisens til.

Anbefaling: **ta matrikkel-sporet nå. Send brev til Oslo. Ikke bygg Oslo-integrasjonen før svaret er ja.**

---

## 2. Metode, og én ting jeg bevisst ikke gjorde

Fast researchmetode: DISCOVERY → DEDUP → VERIFISERING → AKTIV OPPFØLGING → KLASSIFISERING.
Hvert funn under er en faktisk HTTP-respons, ikke en antagelse. Negative kontroller er brukt overalt.

**Det jeg ikke gjorde:** oppgaven ba om å teste 10–20 reelle Oslo-adresser i PBE Saksinnsyn.
Jeg gjorde fire oppslag — nok til å bevise at dataene finnes og hvordan de ser ut — og **stoppet der**.

Grunnen er selve hovedfunnet: `innsyn.pbe.oslo.kommune.no/robots.txt` er

```
User-agent: *
Disallow: /
Allow: /sidinmening
```

Et automatisert sveip over 10–20 adresser er nettopp den crawlingen den linjen avviser, og ADR 004 sier
eksplisitt at vi ikke gjør det «heller ikke eksperimentelt». At sveipet ikke kan kjøres uten Oslos samtykke
**er** svaret på om dette er en god satsing — og det er mer nyttig å vite enn hva 20 adresser hadde vist.
Sveipet er derfor foreslått som steg 1 i piloten i kapittel 25, betinget av at Oslo sier ja.

---

## 3. Realisme: hva finnes egentlig

### A. Nasjonalt, åpent, per adresse — byggesaker
**Finnes ikke.** Verifisert:

- Felles datakatalog (`search.api.fellesdatakatalog.digdir.no`): 24 treff på «byggesak», 2 på «ferdigattest».
  Alle er *innsendingstjenester* (DiBK: «Søknad om ferdigattest», «Søknad om dispensasjon») eller
  *rapportering* (SSB «eKOSTRA Byggesak RS-0788» — kommunen rapporterer aggregert statistikk til SSB).
  **Ingen leser ut saker per eiendom.**
- `developer.oslo.kommune.no` svarer nå «Denne siden finnes ikke lenger». Oslos utviklerportal er borte.
  Situasjonen er altså *dårligere* enn da ADR 004 ble skrevet for et år siden.

### B. Nasjonalt, åpent, per adresse — bygningens historikk
**Finnes, delvis, og er undervurdert.** Se kapittel 9.

### C. Kommunevis
Oslo er i praksis den eneste med dyp, adresse-søkbar historikk offentlig tilgjengelig. Se kapittel 21.

### D. Bak avtale
Byggeår og bruksareal ligger i Matrikkel-API-et (SOAP, `nd.matrikkel.no` / `www.matrikkel.no`), som
**krever avtale med Kartverket**. `ws.geonorge.no/matrikkel/v1/` svarer 403. Grunnboken (eierhistorikk)
deles ikke på Geonorge i det hele tatt — og vi vil den ikke.

---

## 4. Oslo som pilot: hva som faktisk ligger der

Testet `main.asp?mode=all&text=…` og `casedet.asp?mode=all&caseno=…`.

**Adressesøk «Thorvald Meyers gate 9»:** 21 unike saker — men søket er en fritekst-AND på ord, så
treffene inkluderer Thorvald Meyers gate **34**, **81** og **7** fordi «9» matcher hvor som helst i tittelen.
Adresse er altså **ikke** en brukbar nøkkel i Oslos eget søk.

**Gnr/bnr-søk «225/280»:** 65 unike saker, **eldste fra 1960**, nyeste 2026-07-07. Presist, uten falske treff.

Feltene på en sak er ferdig strukturerte:

| Felt | Verdi i testsaken |
|---|---|
| Saksnummer | `202114553 - Byggesak` |
| Mottatt / avsluttet | 18.09.2021 / 09.11.2022 |
| Status | «Saken er avsluttet» |
| Gnr/Bnr | 225/280 |
| Adresse | THORVALD MEYERS GATE 9 |
| Bydel / område | 3 – SAGENE / Torshov rode 1 |
| Søker / tiltakshaver | KRITT ARKITEKTER AS / THV MEYERSGT 7-9-11 AS |
| Dokumenter | 16 (14 saksgang, 9 tegninger) |

Dette er så nær en ferdig datamodell som en kommunal nettside kommer. Det er derfor frustrerende at
ruten er stengt.

---

## 5. Én komplett sak, rekonstruert

Sak `202114553`, Thorvald Meyers gate 9 — bruksendring av underetasje til klatrehall.
Hele kjeden, uten hull i logikken:

| # | Dato | I/U | Dokument |
|---|---|---|---|
| 1 | 17.09.2021 | I | Søknad om rammetillatelse |
| 2 | 22.09.2021 | U | Sak mottatt |
| 5 | 14.10.2021 | U | Behov for tilleggsopplysninger |
| 6 | 18.10.2021 | I | Tilleggsdokumentasjon |
| 7 | 29.10.2021 | I | Plantegninger og søknad om dispensasjon fra KDP 4 |
| 8–9 | 05.–08.11.2021 | I | Samtykke fra Arbeidstilsynet |
| 3 | 09.11.2021 | U | **Rammetillatelse** |
| 10 | 11.11.2021 | I | Søknad om igangsettingstillatelse |
| 11 | 16.11.2021 | U | **Igangsettingstillatelse** |
| 12 | 17.01.2022 | I | Søknad om midlertidig brukstillatelse |
| 14 | 31.01.2022 | I | Bekreftelse på sikkerhet |
| 13 | 03.02.2022 | U | **Brukstillatelse** |
| 15 | 17.05.2022 | U | Påminnelse om frist for ferdigattest |
| 16 | 06.07.2022 | I | Søknad om ferdigattest |
| 17 | 08.07.2022 | U | **Ferdigattest** |

**Tre ting dette avslører, som en modell må tåle:**

1. **Dokumentnummer ≠ kronologi.** Dok 3 (rammetillatelsen) er datert *etter* dok 5–9. Sorter på dato, aldri på nummer.
2. **Det er hull i nummereringen.** Dok 4 finnes ikke i det offentlige innsynet. Vi vet ikke om det er
   unntatt, slettet eller aldri journalført. **En tidslinje må kunne si «det mangler noe her», ikke lyve om at den er komplett.**
3. **Noe er skjermet på dokumentnivå.** Tre dokumenter er merket «Unntatt offentlighet Offl.§14,1.ledd»
   (gebyrskjemaer). PDF-lenkene (`showfile.asp?jno=…&fileid=…`) svarer **302** uten sesjon — filene er
   ikke fritt nedlastbare selv om de listes.

---

## 6. Sak vs dokument: hvordan det må modelleres

Tre nivåer, ikke to:

```
Eiendom (kommunenr + gnr/bnr)     ← den stabile nøkkelen
  └─ Sak (saksnummer)             ← ett tiltak, én beslutningskjede
       └─ Dokument (journalpost)  ← inn/ut, med dato og type
```

**Saken er enheten brukeren bryr seg om**, ikke dokumentet. «Bruksendring til klatrehall, godkjent 2021,
ferdigattest 2022» er én linje. De 16 dokumentene er dokumentasjonen bak, ikke innholdet.

Konsekvens: en eventuell datamodell skal ha `sak` som førsteklasses objekt med en **utledet** tilstand
(søkt / under behandling / tillatelse gitt / under bygging / tatt i bruk / ferdigattest / trukket / avvist),
og `dokument` som barn — ikke motsatt. Samme prinsipp som `review_state` i research-basen: utledet, ikke lagret.

---

## 7. Statusvokabular: det finnes ikke ett

Oslo bruker minst disse, som fritekst i tittel eller statusfelt:
«Avsluttet», «Saken er avsluttet», «Siste dok. <dato>», «Sak trukket», «Sak avsluttet»,
«Ulovlighet opphørt», «søknad om ferdigattest på henlagt sak <nr>».

Merk siste: sak `202605253` er *«søknad om ferdigattest på henlagt sak 201114155»* — altså en sak fra
2026 som rydder opp i en sak fra 2011. **Saker refererer til hverandre, og «henlagt» betyr ikke «ikke bygget».**

Noe av dette kan normaliseres. Men «Avsluttet» i Oslo betyr *arkivert*, ikke *fullført* — og skillet er
hele poenget for en boligkjøper. Et normalisert vokabular må derfor **ikke** ta status fra sakstittelen.
Det må ta det fra hvilke dokumenttyper som faktisk finnes i saken (fikk den ferdigattest eller ikke),
og ellers si «ukjent».

---

## 8. «Ble det faktisk bygget?» — og her snur analysen

Dette er spørsmålet som gir eiendomshistorikk verdi. Og det kan besvares **nasjonalt, åpent, uten avtale**.

`Matrikkelen - Bygningspunkt` (WFS på Geonorge, **CC BY 4.0**, «Åpne data», hjemlet i matrikkelloven §30)
har feltet `bygningsstatus` per bygning. Kodene, verifisert mot Geonorge-registeret:

| Kode | Betydning |
|---|---|
| RA | Rammetillatelse gitt |
| IG | Igangsettingstillatelse gitt |
| MB | Midlertidig brukstillatelse |
| FA | Ferdigattest |
| TB | Tatt i bruk |
| MT / MF | Meldingssak registrert / fullført |
| FS | Fritatt for søknadsplikt (< 50 m²) |
| IP | Ikke pliktig registrert |
| GR | Godkjent revet eller brent |
| BR | Revet eller brent |
| BF | Bygning flyttet |

**Faktisk fordeling, målt på 4 000 bygningspunkter i sentrale Oslo (59.900–59.960 N, 10.700–10.800 Ø):**

```
TB  2926   tatt i bruk
FA   887   ferdigattest
IG    79   under bygging
RA    39   tillatelse gitt, ikke igangsatt
GR    30   godkjent revet eller brent
MB    24   midlertidig brukstillatelse
FS    13   fritatt for søknadsplikt
MF     2   meldingssak fullført
```

Les de tre midterste linjene igjen. **118 bygninger i denne ruten har tillatelse men ikke ferdigattest,
og 30 er godkjent revet.** Det er byggesakshistorikk — komprimert til ett felt, nasjonalt, lisensiert,
uten en eneste kommunal integrasjon.

Samme uttrekk ga også `harSefrakminne: true` for **1 028 av 4 000** bygninger og `harKulturminne: true` for 76.

**Koblingen adresse → bygning er bevist og helt åpen:**

1. `ws.geonorge.no/adresser/v1/sok` gir `kommunenummer` + `gardsnummer` + `bruksnummer` (eksakt, ikke fuzzy)
2. `wfs.matrikkelen-eiendomskart-teig` gir teig-polygonet. Filter `matrikkelnummerTekst = "225/280"`
   svarer `numberMatched=2` — **gnr/bnr er ikke unikt nasjonalt, så kommunenummer må alltid med**
3. `wfs.matrikkelen-bygningspunkt` gir bygningspunktene i polygonet, med status

Alle tre er åpne, alle er CC BY 4.0, alle svarer i dag. Dette er samme mønster som `AreaLookup`-ene i
naturfarepakken: punkt/polygon-oppslag per søk, ikke sync av et nasjonalt lag.

### Hva bygningspunkt-WFS-en *ikke* har
Verifisert mot `DescribeFeatureType` — full feltliste, ingen gjetting:

> `bygningsnummer, bygningsstatus, bygningstype, naringsgruppe, harKulturminne, harSefrakminne,
> sefrakIdent, sefrakKommune, sefrakMinneId, registreringskretsnummer, huslopenummer, bruksenhet
> (adresseId, bruksenhetId, matrikkelenhetId, uuidBruksenhet), representasjonspunkt, kommunenummer,
> kommunenavn, opprinnelse, stedfestingVerifisert, uuidBygning, bygningId, navnerom, versjonId,
> datauttaksdato, oppdateringsdato`

**Ingen `byggeår`. Ingen `bruksareal`. Ingen `etasjer`.** Kartverkets egen side bekrefter at det åpne
settet er «Bygningspunkt (med type, nummer og status)» — byggeår krever Matrikkel-API med avtale.
Merk også at `oppdateringsdato` er *registerets* oppdatering (2020 for testbygget), **ikke byggeår**.
Å presentere den som byggeår ville vært feil, og det er en felle verdt å skrive ned.

Sidenote som støtter funnet: easyeiendom.no/labs kaller sitt eget kart «Byggeår-kart» med
«**estimert** byggeperiode». Konkurrenten har altså ikke byggeår åpent heller.

---

## 9. SEFRAK: den eneste reelle bygningshistorikken som er åpen

`wfs.geonorge.no/skwms1/wfs.sefrak` er åpen og påfallende rik:

> `bygningsendring, bygningsendringskode, endringsgrad, kulturminneDateringInfo, kulturminneVerneverdi,
> vernevedtak, fredning, etasjetall, fasade, takform, taktekking, yttervegg, underbygningKonstr,
> kjeller, antallSkorsteiner, lengde, bredde, sefrakStatus, sefrakFunksjon, askeladdenID,
> feltregistrertAv, vurdertDato`

Dette er faktisk *bygningshistorie* — datering, endringer over tid, konstruksjon. Men: SEFRAK dekker
bygninger fra **før 1900**, feltregistrert på 1970–90-tallet. Det er en historisk kilde om historiske hus,
ikke et levende register. Den er utmerket som **kontekstlag** («dette er et SEFRAK-registrert bygg fra
ca. 1880, registrert endret i 1962»), verdiløs for nybygg, og må aldri presenteres som oppdatert.

---

## 10. eInnsyn: den store overraskelsen, og den store skuffelsen

`einnsyn.no` har et **udokumentert men fungerende JSON-API**: `POST /api/result`, OpenAPI på `/api/v3/api-docs`.

Det returnerer ferdig strukturert Noark-data: `journalposttype` (inngående/utgående),
`journaldato`, `dokumentetsDato`, `saksnummer`, `journalpostnummer`, `offentligTittel`,
`korrespondansepart[]`, `dokumentbeskrivelse[]` med `dokumentobjekt[]`. Eldste treff på «rammetillatelse»
er **02.03.2000**, totalt **78 650** treff.

### Tre grunner til at dette likevel ikke bærer

**1. robots.txt sier nei.**
```
disallow: /api/
disallow: /sok
disallow: /saksmappe
```
Samme sperre som Oslo, på en kilde drevet av Digdir.

**2. Det finnes ingen adressenøkkel.** Indeksen har ingen adresse, ingen gnr/bnr, ingen geometri —
bare fritekst. Testet på tolv byer:

| Søk | Hva jeg faktisk fikk |
|---|---|
| «Nordre gate 11» (Trondheim) | Oslos «Nils Huus gate 11», «Nedre Skøyen Vei 2» |
| «Storgata 20» (Bodø) | Oslos Storgata 36 og 40, Grimstad kommune |
| «Torgallmenningen 8» (Bergen) | Torgallmenningen **1A**, Riksantikvaren om Harbitz-bygget |

Presisjonen er ubrukelig. Gnr/bnr finnes bare som fritekst i tittelen, i minst fire formater jeg observerte:
`Gbnr 114/151`, `gnr 138/2200`, `225/280`, `102/954`.

**3. Dekningen er Oslo pluss en lang hale.** Av de 1 000 nyeste «rammetillatelse»-treffene:

```
Oslo kommune          241        (Plan- og bygningsetaten 186)
Stat                  102        (Statsforvalteren, SVV, Bane NOR, Statsbygg …)
Kommune                45        (Tvedestrand 14, Arendal 13, Vennesla 10, Grimstad 4, Malvik 4, Risør 2, Åmli 2 …)
Fylke                  14
```

Bergen, Trondheim, Bærum, Kristiansand, Drammen, Tromsø, Ålesund: adressesøk i disse byene gir
nesten utelukkende **statlige** organer — Arbeidstilsynet, Bane NOR, Statens vegvesen, DSB,
Riksantikvaren — ikke kommunens eget byggesaksarkiv. Bergens Torgallmenningen 8 ga **null** journalposter
fra Bergen kommune byggesak.

eInnsyn er altså *Oslo på nytt*, med dårligere presisjon.

---

## 11. Personvern: den viktigste enkeltoppdagelsen

eInnsyn returnerer **to varianter av hvert navnefelt**:

```
korrespondansepartNavn           "*"                        ← maskert
korrespondansepartNavn_SENSITIV  "THV MEYERSGT 7-9-11 AS"   ← rå verdi
offentligTittel_SENSITIV         …
tittel_SENSITIV                  …
```

API-et leverer altså de umaskerte feltene. For et *foretak* er det uproblematisk. For en garasjesøknad
på en enebolig er `korrespondansepartNavn_SENSITIV` navnet på en privatperson.

**Absolutt regel hvis dette noen gang bygges:** `*_SENSITIV`-felter leses ikke, lagres ikke, og finnes
ikke i skjemaet. Ikke «filtreres bort i visningen» — **aldri hentet inn.**

Samme gjelder Oslo: `Søker` og `Tiltakshaver` er ofte selskaper, men på små tiltak er de privatpersoner.
Og NVEs flomhendelsesbase har feltene `skaddePersoner` og `dodsfall`.

Grensen brukeren satte, oversatt til teknikk:

| Vises | Vises ikke |
|---|---|
| Tiltaket: «bruksendring til klatrehall» | Hvem som søkte |
| Beslutningen: «rammetillatelse gitt 09.11.2021» | Hvem som var nabo eller klaget |
| Bygningens status: «ferdigattest» | Hvem som eide, når, eller hvorfor de solgte |
| Dokumenterte hendelser på grunnen | Dødsbo, konkurs, tvangssalg, skilsmisse, dødsfall |

**Dødsbo / konkurs / tvangssalg: ut.** Det er ikke eiendomshistorikk, det er personhistorikk med en
adresse festet på. At det står i en offentlig kunngjøring gjør det ikke riktig å samle og gjøre søkbart
per adresse. Dette er også et GDPR-spørsmål (art. 6 / formålsbegrensning), ikke bare et smaksspørsmål —
og NaboRadar har ingen grunn til å ta den risikoen.

---

## 12. Historiske hendelser: én kilde holder, én er en felle

Jeg testet NVEs hendelsesbaser med positive og negative kontroller, nøyaktig fordi
`JordFlomskredAktsomhet`-fellen i naturfarepakken satt friskt i minne.

**✅ `Mapservices/SkredHendelser` — brukbar.**
18 466 utløsningspunkt, 49 817 utløpspunkt, 1 313 utløsningsområde-polygon, 6 706 utløpsområde-polygon.
Felt: `skredTidspunkt`, `skredType`, `noySkredTidspunkt` (tidsangivelsens nøyaktighet — viktig, mange
historiske skred er datert omtrentlig), `stedfestingMetode`, `regStatus`.

**❌ `Mapservices/Flomhendelser1` lag 3 — felle. Ikke bruk.**
234 polygoner, med lekre felt (`aar`, `flomStorrelse`, `skadeBeskrivelse`, `kostnaderSkade`).
Men punkttest på Grünerløkka, midt i en bykvartal uten flomhistorikk, gir **14 treff**. Grunnen:

```
1957 | Østlandet
1960 | Sør-Norge
2001 | Oslo,Akershus
1976 | Sørlandet og nær Oslofjorden
```

`berortOmrade` er en **navngitt region**, ikke et flomutbredelse-polygon. Laget svarer «flommen i 1957
rammet Østlandet», ikke «denne eiendommen sto under vann». Brukt som point-in-polygon ville det
produsert setningen *«Eiendommen ble berørt av flommen i 1957»* for hver adresse på Østlandet.
Presis den typen falskt funn som ødelegger tillit.

**Viktig strategisk poeng:** dette sporet hører ikke til byggesakshistorikk i det hele tatt. Skredhendelser
er en naturlig, billig utvidelse av **naturfarepakken** som allerede er levert — samme `AreaLookup`-mønster,
samme ordforråd, samme seksjon. Det bør vurderes der, ikke her.

---

## 13. Sameie og borettslag: kan ikke løses fra Brreg

Enhetsregisteret har 3 076 borettslag i Oslo. Men `forretningsadresse` er **forvalterens** adresse:

```
952743813  A/L EIKBO BORETTSLAG        c/o OBOS Vestfold, Storgaten 20, 3126
942632215  A/L Munkegaten Borettslag   c/o OBOS Vestfold, Storgaten 20, 3126
950386223  ABELLUND BORETTSLAG         OBOS Hammersborg torg 1, 0179
```

Tre borettslag, ingen av dem med bygningens adresse. **Bygning → borettslag kan ikke utledes fra Brreg.**
Koblingen finnes i matrikkelen (matrikkelenhet/borettslagsandel), som krever avtale.
Sporet er stengt for nå. Ikke gjett, og ikke bruk forvalteradressen som om den var byggets.

---

## 14. Nøkkel: gnr/bnr, ikke adresse — med to forbehold

Empirien er entydig. I Oslo ga adressesøk 21 saker med falske treff; gnr/bnr ga 65 saker uten.
Adresse er et *presentasjonslag*; gnr/bnr er identiteten.

To forbehold:

1. **Gnr/bnr er ikke unikt nasjonalt.** `matrikkelnummerTekst = "225/280"` matcher 2 teiger i landet.
   Nøkkelen må alltid være `kommunenummer + gnr + bnr (+ festenr + seksjonsnr)`.
2. **Kommunenummer endrer seg.** Kommunesammenslåingene i 2020 og reverseringene etter flyttet
   gnr/bnr-serier. Historiske saker fra før en sammenslåing ligger under det gamle nummeret.
   En historikk som strekker seg til 1960 må tåle at nøkkelen selv har historikk — og det er en
   ikke-trivielt stor jobb som ingen har gjort for oss.

---

## 15. Automatisering vs. research

| Del | Kan automatiseres? |
|---|---|
| Adresse → kommunenr + gnr/bnr | ✅ Helt. Åpen API, eksakt |
| Gnr/bnr → teig → bygningspunkt → status | ✅ Helt. Åpne WFS-er, point-in-polygon |
| SEFRAK-flagg og -attributter | ✅ Helt |
| Skredhendelser i nærheten | ✅ Helt (som naturfare-utvidelse) |
| Byggeår, bruksareal | ⛔ Krever avtale — men da også automatiserbart |
| Oslo: gnr/bnr → sakliste | ⛔ Sperret av robots.txt og ADR 004 |
| Sak → normalisert tilstand | ⚠️ Delvis. Krever regler, og må kunne si «ukjent» |
| Sakens *betydning* for en kjøper | ❌ Aldri. Det er redaksjonelt arbeid |

Grovt: **matrikkel-sporet er ~90 % automatiserbart. Oslo-sporet er ~70 % automatiserbart og 0 % lovlig
uten avtale.** Det andre tallet er det som avgjør.

---

## 16. Ingen AI i runtime — og jeg fant ingen grunn til å bryte det

Brukeren var klar: NaboRadar skal ikke være avhengig av AI for å fungere, og «AI leser byggesaken live»
skal ikke bygges. Researchen støtter det uavhengig av prinsippet:

Byggesaksdokumentene er PDF-er bak sesjon (302 uten cookie), tre av 16 er unntatt offentlighet, og
nummereringen har hull. En AI-tolkning av et ufullstendig dokumentsett ville produsert selvsikre
sammendrag av noe den ikke hadde sett — og vi hadde ikke hatt noen måte å vite når.

Tidslinjen skal bygges av **dokumenttyper og datoer**, som er strukturerte felt, ikke av
dokumentinnhold. Da er den etterprøvbar, og da kan den si «her mangler noe».

---

## 17. Freshness og drift

Hvis noe av dette bygges, hører det i to helt ulike ferskhetsklasser:

| Kilde | Endringstakt | Regime |
|---|---|---|
| Bygningspunkt (status) | Kontinuerlig, men treg per bygning | Per-søk oppslag. Ingen sync, ingen kø, ingen drift |
| SEFRAK | Praktisk talt frosset | Per-søk oppslag. Merkes eksplisitt som historisk |
| Skredhendelser | Nye hendelser sporadisk | Per-søk oppslag |
| Oslo byggesaker | Daglig | Ville krevd provider, sync, kø, guards, reconcile |

Poenget: **de tre første koster ingen drift.** De er `AreaLookup`-er, som naturfare — de arver
budsjettet, `Promise.allSettled`, `failed`-listen og guards som allerede finnes. Oslo-sporet ville
alene lagt til en ny provider med egne feilmoduser, egen kø, egen identitetsproblematikk
(saksnummer er stabilt, men dokumentnummer har hull) og egen overvåking. Det er en betydelig del
av kostnaden, og den treffer bare én kommune.

---

## 18. Nasjonal skalerbarhet

| Rute | Kommuner dekket | Marginalkostnad per ny kommune |
|---|---|---|
| Matrikkel (bygningsstatus, SEFRAK) | **356 av 356** | **0** |
| eInnsyn | Oslo + ~10 små, uten adressenøkkel | Ingen kontroll — avhenger av om kommunen publiserer |
| Kommunale portaler | 1 om gangen | Full integrasjon, egen avtale, egen parser, egen drift |

Den tabellen er hele argumentet. Den ene ruten som skalerer, er også den billigste og den mest
lisensrene — og den vi nesten overså fordi den ikke ser ut som «byggesakshistorikk».

---

## 19. Leverandørkartlegging

Testet HTTP, server-signatur og robots.txt:

| Kommune | Løsning | Robots |
|---|---|---|
| Oslo | Egenutviklet klassisk ASP på IIS 10 (`main.asp`, `casedet.asp`, ISO-8859-1) | **`Disallow: /`** |
| Stavanger | Public 360 (`opengov.360online.com/Cases/STAVANGER`), IIS | **`Disallow: /`** |
| Kristiansand | Public 360, IIS | **`Disallow: /`** |
| Lillestrøm | Public 360 (svarer 200) | ingen robots.txt |
| Bergen | Egen løsning (`bergen.kommune.no/innsynpb/`) | delvis |
| Asker | Egen portal under `asker.kommune.no/innsyn/` | – |
| Trondheim, Bærum, Drammen, Tromsø | Ikke nådd på testede mønstre | – |

**Konsekvensen av leverandørbildet:** Public 360 hos flere kommuner *ser* ut som en mulighet for én
adapter til mange kommuner. Men alle de testede Public 360-instansene som svarte, svarte `Disallow: /`
— og hver kommune er en egen behandlingsansvarlig som må si ja for seg. Det er ikke én avtale,
det er N avtaler. En felles adapter reduserer kodekostnaden, ikke den juridiske kostnaden,
og den juridiske er den store.

---

## 20. Juss og bruksvilkår, samlet

| Kilde | Lisens / vilkår | Dom |
|---|---|---|
| Matrikkelen Bygningspunkt | **CC BY 4.0**, «Åpne data», matrikkelloven §30 + forskrift om utlevering og viderebruk | ✅ Rett fram |
| Matrikkelen Eiendomskart Teig | **CC BY 4.0** | ✅ |
| Kartverket adresse-API | Åpen | ✅ |
| SEFRAK / Riksantikvaren | Åpen via Geonorge | ✅ |
| NVE SkredHendelser | NLOD / åpen | ✅ |
| Matrikkel-API (byggeår, bruksareal) | Krever avtale med Kartverket | ⏸ Mulig, men en beslutning |
| Grunnbok (eiere) | Deles ikke på Geonorge | ⛔ Og vi vil den ikke |
| Oslo Saksinnsyn | robots.txt `Disallow: /`, ingen publiserte vilkår, ADR 004 | ⛔ Uten avtale |
| eInnsyn API | robots.txt `disallow: /api/`, udokumentert, `*_SENSITIV`-felter | ⛔ Uten avtale |

Et poeng som er lett å overse: **fravær av bruksvilkår er ikke tillatelse.** Oslo har ingen publisert
vilkårsside for Saksinnsyn (`omsaksinnsyn.asp` er 404). Det gjør ikke bruken fri — det gjør den uavklart,
som er verre, fordi vi ikke kan vise til noe hvis noen spør. Dette er samme situasjon som det ubesvarte
brevet til Oslo/Bærum/Asker om skolekrets-lisensene.

---

## 21. Moat

Er dette en forsvarsposisjon?

**For byggesakshistorikk: nei, men ikke fordi konkurrentene har det.** Ingen har det.
easyeiendom har utnyttelsesgrad, solforhold, «estimert» byggeår og historiske flyfoto — ingen
byggesakstidslinje. Ambita selger områdeanalyser B2B per rapport. At ingen har bygget det, etter alle
disse årene, i et marked med flere velfinansierte aktører, er **informasjon, ikke en åpning.**
De har sannsynligvis truffet den samme robots.txt-en.

Den *reelle* moaten ligger et annet sted: hvis vi faktisk får en skriftlig avtale med Oslo PBE, er
*avtalen* moaten — ikke koden. Den tar tid å kopiere og kan ikke skrapes fram.

**For matrikkel-sporet: en liten, ekte moat.** Ikke fordi dataene er hemmelige, men fordi
det å oversette `bygningsstatus = RA` til *«Det er gitt rammetillatelse for et bygg her som ennå ikke
er igangsatt»* — med riktige forbehold, uten alarmerende språk, uten å påstå mer enn koden sier — er
redaksjonelt arbeid av samme type som naturfare-ordforrådet. Det er det NaboRadar faktisk er god til,
og det er det som er vanskelig å kopiere.

---

## 22. Kvalitativ feasibility-dom

| | Verdi for kjøper | Teknisk kostnad | Juridisk risiko | Skalerer | Dom |
|---|---|---|---|---|---|
| Bygningsstatus fra matrikkelen | **Høy** | **Lav** | **Ingen** | **356/356** | ✅ **NÅ** |
| SEFRAK / kulturminne-flagg | Middels | Lav | Ingen | 356/356 | ✅ NÅ (samme pakke) |
| Skredhendelser i nærheten | Middels | Lav | Ingen | 356/356 | ✅ Men som naturfare-utvidelse |
| Byggeår og bruksareal | Høy | Middels | Krever avtale | 356/356 | ⏸ SNART — verdt et avtalespor |
| Oslo byggesakstidslinje | **Svært høy** | Middels | **Høy uten avtale** | 1/356 | ⏸ SENERE, gated på brev |
| Flomhendelser per eiendom | Ville vært høy | — | — | — | ❌ Kilden finnes ikke i brukbar form |
| Sameie/borettslag fra Brreg | Lav | — | — | — | ❌ Kan ikke utledes |
| Eier-, dødsbo-, konkurshistorikk | — | — | — | — | ❌ **Utenfor produktet** |

---

## 23. Konkret pilotforslag

**Ikke** «pilot i Oslo». Piloten som gir avkastning er nasjonal og tar dager, ikke uker.

### Steg 1 — Nasjonalt byggestatus-oppslag (foreslått som neste datapakke)
Én ny `AreaLookup` etter mønsteret fra `lib/facts/lookups/naturfare.ts`:

- adresse → `kommunenummer + gnr/bnr` (Kartverket adresse-API, allerede i bruk)
- → teig-polygon (`wfs.matrikkelen-eiendomskart-teig`)
- → bygningspunkter i polygonet (`wfs.matrikkelen-bygningspunkt`)
- → fakta: bygningsstatus, bygningstype, SEFRAK/kulturminne-flagg

Nye `describeFact`-tilfeller med samme disiplin som naturfare:
`RA`/`IG` → «Det er gitt tillatelse til et bygg her som ikke er registrert fullført»,
`GR`/`BR` → «En bygning på eiendommen er registrert revet eller brent»,
`FS` → «Registrert som fritatt for søknadsplikt».
Obligatorisk forbehold, etter mønsteret av radon-setningen:
**«Dette er bygningsstatus i matrikkelen, ikke en byggesak. Kommunen kan ha saker som ikke er
registrert her.»**
QA-script med reelle koordinater og både positive og negative kontroller, som `qa:naturfare`.

Krever ingen migrasjon, ingen provider, ingen sync, ingen ny drift.

### Steg 2 — Brevet (parallelt, koster ingen utviklingstid)
Ett brev, to spørsmål, til Oslo kommune PBE:

1. Kan NaboRadar hente saksmetadata (saksnummer, tittel, dato, gnr/bnr, dokumenttyper og -datoer —
   **ikke** navn, **ikke** dokumentinnhold) fra Saksinnsyn programmatisk, og på hvilke vilkår?
2. Finnes det et datasett eller API vi ikke har funnet?

Legg det i samme runde som det ubesvarte brevet om skolekrets-lisenser. Hvis svaret er ja: da, og
først da, kjøres 10–20-adressers-sveipet, og Oslo-tidslinjen vurderes på nytt med reelle data.
Hvis svaret er nei eller ingenting: saken er lukket, og vi har spart ukene.

### Steg 3 — Vurder Matrikkel-API-avtale for byggeår (eget spor)
Byggeår er sannsynligvis den mest etterspurte enkeltopplysningen i hele denne ideen. Det er en
avtale- og kostnadsbeslutning, ikke et teknisk problem. Verdt å hente inn vilkår og pris — men ikke
verdt å blokkere steg 1 på.

---

## 24. Hva vi ikke bør gjøre

- **Ikke scrape Oslo Saksinnsyn.** `Disallow: /`, ADR 004, og personopplysninger i søker/tiltakshaver.
- **Ikke bruke eInnsyns API.** `disallow: /api/`, udokumentert, og `*_SENSITIV`-feltene gjør at vi ville
  hentet inn navn vi ikke skal ha.
- **Ikke bruke `Flomhendelser1` lag 3 som stedfestet hendelse.** Den er regional og ville sagt
  «berørt av flommen i 1957» om hele Østlandet.
- **Ikke presentere `oppdateringsdato` fra matrikkelen som byggeår.** Det er registerets dato.
- **Ikke bygge eierhistorikk, dødsbo, konkurs eller tvangssalg.** Personhistorikk med adresse påklistret.
- **Ikke bruke privatpersoner som researchmål.** Gjaldt denne runden, gjelder videre.
- **Ikke bygge «AI leser byggesaken».** Dokumentsettet er ufullstendig; sammendraget ville vært selvsikkert og feil.
- **Ikke bygge en risikoscore eller «trygg/utrygg eiendom».** Samme regel som naturfare.
- **Ikke påstå at en tidslinje er komplett.** Dok 4 manglet i den ene saken vi rakk å lese.
- **Ikke bygge én kommune om gangen.** 1/356 med full drift per kommune er feil retning for et
  nasjonalt forbrukerprodukt.

---

## 25. Plassering i roadmapen

Beslutningen i kapittel 0 gjelder. Etter [docs/data-roadmap.md](../data-roadmap.md) sin inndeling:

- **IKKE PRIORITERT:** bygningsstatus og SEFRAK/kulturminne-flagg fra matrikkelen. Teknisk billig og
  lisensrent, men brukerverdien forsvarer ikke plassen i produktet og kompleksiteten det legger til.
- **REVURDERES VED ENDRET TILGANG:** full byggesakshistorikk, inkludert Oslo. Utløseren er eksplisitt
  maskinell tilgang til kommunale byggesaksdata — ikke ledig utviklingskapasitet.
- **IKKE VERDT TIDEN:** byggesakshistorikk kommune for kommune · eiendomshistorikk via eInnsyn ·
  sameie/borettslag fra Brreg · flomhendelser per eiendom
- **UTENFOR PRODUKTET:** eier-, dødsbo-, konkurs- og tvangssalgshistorikk

Skredhendelser (kapittel 12) hører ikke til denne saken og er ikke omfattet av beslutningen. Det er
en eventuell utvidelse av naturfarepakken og vurderes for seg.
