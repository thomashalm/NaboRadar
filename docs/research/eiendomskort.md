# Eiendomskort

> Research. Undersøkt 2026-10-03. **Eiendomskortet er ikke bygget, og beslutningen avventer.**
> Samme dag ble to feil funnet i researchen rettet: bygningstype-kodelisten og kildene til det
> klikkbare eiendomskartet (se «Rettet 2026-10-03»). Den nasjonale adresse → bygning-koblingen er
> målt i en lokal PostgreSQL, ikke importert (se «DB-måling»).
> Byggeår og bruksareal kan ikke vises på en åpen nettside. Siste salg er lovlig, men krever
> virksomhet med organisasjonsnummer og innvilget tilgang hos Kartverket. Ingen søknad er sendt.
> Ingen ADR før kildevalget er tatt.

Bygger videre på [eiendom-discovery.md](../eiendom-discovery.md) (2026-09-24) og
[eiendomshistorikk-feasibility.md](eiendomshistorikk-feasibility.md) (2026-09-27). Den gamle
Oslo-løsningen (Saksinnsyn, eInnsyn) er ikke tatt opp igjen.

## Problemstilling
Hvilke opplysninger om boligen brukeren søkte på kan vi hente nasjonalt, lovlig, stabilt og med god
nok kvalitet til en kompakt faktaboks øverst på `/omrade`?

## Kort svar per ønsket felt
| Felt | Kan vises åpent? | Kilde | Vurdering |
|---|---|---|---|
| Bygningstype | **Ja** | Matrikkelen – Bygningspunkt (CC BY 4.0) | 90–97 % av adressene har ett entydig bygg |
| Bygningsstatus | **Ja** | Samme | Nyttig bare når bygget ikke er tatt i bruk |
| Gnr/bnr/fnr | **Ja** | Adresse-API (CC BY 4.0) | 49 av 49 i QA |
| Seksjonsnummer | **Ja**, per bruksenhet | Matrikkelen – Adresse leilighetsnivå (CC BY 4.0) | Adresse-API-et gir det ikke |
| Antall boenheter på adressen | **Ja** | Adresse-API / leilighetsnivå | Bruksenheter, ikke nødvendigvis boliger |
| Tomteareal | **Ja**, med forbehold | Teig (`lagretBeregnetAreal`, CC BY 4.0) | Gjelder matrikkelenheten. Er «tomt» bare for småhus på egen eiendom |
| **Byggeår** | **Nei** | Matrikkelen, bak avtale | Krever berettiget interesse **og** tilgangskontroll med søkebegrensning |
| **Bruksareal (BRA)** | **Nei** | Samme | Samme begrensning |
| Sist omsatt, kjøpesum, dato, type | **Ja, juridisk.** Ikke uten avtale | Grunnbok-API (Kartverket) | Gratis, men krever org.nr og innvilget søknad |
| Tidligere overdragelser | Som over | Samme | Samme |

## Kilder og vilkår

### Åpne data (CC BY 4.0, «© Kartverket», kan lagres og vises)
| Kilde | Felter | Tilgang | Status 2026-10-03 |
|---|---|---|---|
| Adresse-API `ws.geonorge.no/adresser/v1` | Adressetekst, adressekode, nummer, bokstav, gnr/bnr/fnr, `bruksenhetsnummer[]`, punkt | REST, uten nøkkel | Oppe |
| Eiendom-API `api.kartverket.no/eiendom/v1` | Teig ved punkt (`/punkt`), teigpolygoner for et matrikkelnummer (`/geokoding`). Ikke areal. Ett døgn etter matrikkelen | REST, uten nøkkel | Oppe |
| Matrikkelkart WMS `wms.geonorge.no/skwms1/wms.matrikkelkart` | `teiger`: matrikkelnummer, `lagretberegnetareal`, `teigmedflerematrikkelenheter`, tvist. `bygning_symbol`: bygningsnummer, type og status med beskrivelse | GetFeatureInfo | Oppe |
| Matrikkelen – Bygningspunkt | Bygningsnummer, type (NS 3457), status, punkt og **bruksenheter med `adresseId`, `bruksenhetId` og `matrikkelenhetId`** | WFS og nedlasting per kommune/land (GML, PostGIS, FGDB, SOSI), oppdatert daglig | **WFS nede (HTTP 500).** Nedlasting oppe |
| Matrikkelen – Adresse leilighetsnivå | Én rad per bruksenhet: `adresseId`, adressekode/nummer/bokstav, `bruksenhetsnummerTekst` (H0101), `bruksenhetId`, matrikkelnummer **med seksjonsnummer**, grunnkrets | Nedlasting | Oppe |
| Matrikkelen – Eiendomskart Teig | Teigpolygon, areal, matrikkelnummer | WFS og nedlasting (6,4 GB nasjonalt) | **WFS nede.** WMS og Eiendom-API dekker behovet |

**Driftsfunn:** alle tre matrikkel-WFS-ene hos Geonorge (`wfs.matrikkelen-bygningspunkt`,
`-eiendomskart-teig`, `-adresse`) svarte 500 («Connect to rin-ap2261:8081 timed out»). Det er samme
bakmaskin som tok ned stormflo-WFS-en ([ADR 015](../adr/015-publikumsprodukt-wms-og-kildefeil.md)).
Dagens klikkbare eiendomskart (`lib/property/lookup.ts`) bruker disse WFS-ene og er trolig nede så
lenge feilen varer. Et eiendomskort øverst på `/omrade` kan ikke hvile på dem.

### Bak avtale
| Kilde | Hva | Vilkår |
|---|---|---|
| Matrikkel-API (Kartverket) | Byggeår, BRA, etasjer, bruksenhetstype, eier m.m. | Bare virksomheter med org.nr. «Berettiget interesse» (§ 3 tredje ledd, § 4). På Internett bare med **tilgangskontroll og begrensning i antall søk** (§ 5 sjette ledd). SOAP |
| Grunnbok-API (Kartverket), rolle «berettiget interesse» | «Tinglyste hjemmelsoverføringer med kjøpesum», aktive og historiske, med overdragelsesdato og type, også borettslagsandeler. Endringslogg og massivuttrekk for lokal kopi, nær sanntid | Gratis. Bare virksomheter i Enhetsregisteret (ENK holder; privatperson kan ikke søke). Søknad i Altinn, standardvilkår, vedtak med klagerett. Formålet låses til søknaden. 99 % SLA. Kartverket kan endre vilkår ensidig, og data må slettes hvis tilgangen stenges |
| Norkart «API Omsetningsdata», Ambita | Ferdig vasket omsetningsdata | Pris på forespørsel. Forskriftens plikter følger med, og rett til åpen visning må avtales |

### Juss (forskrift 2013-12-18-1599, sist endret 2025-08-01; matrikkellova § 30)
- **§ 3 annet ledd, fritt for alle:** matrikkelnummer, areal, grenser, bygningsnummer, bygningstype,
  bygningsstatus, næringsgruppe, adresse og koordinater.
- **§ 3 tredje ledd, berettiget interesse:** eier, **byggeår**, bebygd areal, etasjer,
  **bruksareal**, heis, VA og energikilder.
- **§ 5 sjette ledd:** opplysninger kan bare vises på Internett med tilgangskontroll og
  søkebegrensning. Unntatt er **hjemmelsovergang** fra grunnboken og § 3 annet ledd-data.
- **Kjøpesum:** Kartverket regner den som del av hjemmelsovergangen («avisene kan fritt publisere
  opplysninger om endring av eierforhold og registrert kjøpesum»). Regjeringens veileder sier at
  unntaket også gjelder søkebegrensningen.
- **§ 5 tredje ledd:** ikke til direkte reklame.
- **§ 5 tiende ledd:** siden må opplyse at dataene kommer fra et privat register, ikke grunnboken.
- **§ 5 sjuende ledd og § 6:** dataene skal holdes oppdatert og ikke lagres lenger enn nødvendig.
  Kartverket kan stenge tilgangen.
- **Presedens:** eiendomssjekk.no viser dato og kjøpesum åpent, med avtale med Kartverket. De skriver
  selv at alt annet i grunnboken må ligge bak tilgangskontroll.
- Det finnes ikke noe åpent datasett med enkeltomsetninger. SSB har bare aggregater.

## Adresse → eiendom → bygning → bruksenhet
Den robuste kjeden i åpne data:

```
adresse (kommunenummer + adressekode + nummer + bokstav)      ← Adresse-API
  → adresseId                                                  ← Adresse leilighetsnivå
  → bruksenhet(er) (bruksenhetId, H0101 …, matrikkelnummer med seksjon)
  → bygning (bygningsnummer, type, status)                     ← Bygningspunkt (bruksenhet.adresseId)
  → matrikkelenhet (kommunenummer-gnr/bnr/fnr/snr) → teig(er) med areal   ← Eiendom-API / WMS
```

- **Canonical nøkler:**
  - Matrikkelenhet: `kommunenummer + gnr + bnr + fnr + snr`.
  - Bygning: `bygningsnummer` (nasjonalt unikt).
  - Bruksenhet: `bruksenhetId` (visningsverdi: `bruksenhetsnummerTekst`).
  - Adresse: `kommunenummer + adressekode + nummer + bokstav` (visning), `adresseId` (kobling).
- **Adresse-API-et gir ikke `adresseId` eller seksjonsnummer.** Koblingen til bygning går derfor via
  nedlastingen, ikke via API-et alene.
- **Geometri holder ikke:** Langmyrgrenda 26C (52/883) har ikke noe bygningspunkt på egen teig.
  Kjedehusets punkt ligger på naboteigen. Bygg må kobles via bruksenhet.
- Kommunenummer endres ved sammenslåinger. Nøkkelen må alltid ha gjeldende kommunenummer.

### Dekning målt på åtte kommuner (alle adresser med bruksenhet)
| Kommune | Adresser | 0 bygg | **1 bygg** | 2+ bygg | Seksjonert | Feste | 1 bruksenhet |
|---|---|---|---|---|---|---|---|
| Oslo | 106 259 | 1,8 % | **82,3 %** | 16,0 % | 31,8 % | 0,0 % | 71,0 % |
| Bergen | 77 181 | 1,1 % | **97,1 %** | 1,7 % | 17,8 % | 0,0 % | 76,5 % |
| Trondheim | 57 338 | 2,1 % | **97,2 %** | 0,7 % | 17,2 % | 0,8 % | 76,0 % |
| Stavanger | 49 209 | 0,6 % | **90,9 %** | 8,6 % | 14,7 % | 0,8 % | 86,5 % |
| Tromsø | 29 012 | 3,2 % | **90,2 %** | 6,7 % | 19,8 % | 0,3 % | 77,1 % |
| Hitra | 5 776 | 5,0 % | **92,2 %** | 2,8 % | 6,1 % | 1,6 % | 96,9 % |
| Vinje | 9 164 | 1,9 % | **92,4 %** | 5,6 % | 8,1 % | 6,3 % | 90,1 % |
| Engerdal | 2 909 | 5,8 % | **90,1 %** | 4,2 % | 0,2 % | 30,4 % | 98,4 % |

Bygningsstatus er nesten alltid «tatt i bruk» (TB) eller «ferdigattest» (FA). 2–4 % har midlertidig
brukstillatelse (MB), igangsettingstillatelse (IG) eller rammetillatelse (RA).

## Byggeår
- Feltet finnes ikke i åpne data. `oppdateringsdato` i Bygningspunkt er registerets endringsdato, ikke
  byggeår (dokumentert felle).
- Statuskodene (RA, IG, MB, FA, TB) sier hvor i byggeprosessen bygget er, ikke når.
- Med avtale: matrikkelens bygningshistorikk har datoer for tillatelse, tatt i bruk og ferdigattest.
  Kvaliteten er svak for eldre bygg (ofte tomt, eller masseregistrert), og feltet er uansett
  § 3 tredje ledd.
- **Konklusjon:** vis ikke byggeår. Estimater (jf. «estimert byggeperiode» hos andre) er utelukket av
  egne prinsipper.

## Areal
| Arealbegrep | Gjelder | Åpent? |
|---|---|---|
| Bruksareal bolig/annet/totalt (matrikkelen, BRA etter eldre NS 3940) | Bruksenhet og bygning | Nei (§ 3 tredje ledd) |
| Bebygd areal (BYA) | Bygning | Nei |
| BRA-i, BRA-e, BRA-b (NS 3940:2023), P-rom, BOA | Finnes i salgsoppgaver, ikke i matrikkelen | Ikke offentlig kilde |
| BTA | Ikke i åpne data | Nei |
| `lagretBeregnetAreal` (teig) | Matrikkelenhetens teig | **Ja** |

Vis ikke boligareal. Selv med avtale er BRA for en leilighet ofte tomt eller registrert på bygget.

## Tomteareal
- WMS-laget `teiger` gir registrert beregnet areal for teigen adressepunktet ligger i. I QA lå
  adressepunktet i teigen med samme matrikkelnummer i 48 av 49 tilfeller. Unntaket var en festetomt i
  Vinje uten egen teig. En annen festetomt hadde tomt arealfelt.
- Arealet gjelder **matrikkelenheten**, ikke boligen:

| Tilfelle (fra QA) | Areal | Riktig forståelse |
|---|---|---|
| Enebolig, Oslo (107/1037) | 994 m² | Tomten |
| Rekkehus, Stavanger (57/605) | 142 m² | Egen tomt |
| Rekkehus, Oslo (149/598) | 25 497 m² | Felles eiendom for hele rekkehusfeltet |
| Blokk med seksjoner, Tromsø (200/1677) | 248 m² | Sameiets fellestomt |
| Gårdsbruk, Hitra (32/12) | 16 teiger | Hele bruket med utmark |
| Enebolig, Vinje (152/3) | 83 425 m² | Enebolig på landbrukseiendom |

- Flere teiger: summen må hentes via Eiendom-API-et (`/geokoding` gir alle teigene). 9 av 49 hadde mer
  enn én teig.
- `teigmedflerematrikkelenheter`, `tvist` og `nøyaktighetsklasseteig` bør styre om arealet vises.
- **Trygt:**
  - «Tomt» bare for småhus (111–124, 161–163) som er eneste adresse på en useksjonert matrikkelenhet
    med én teig.
  - Ellers «Eiendommens areal», med «felles for N adresser» når det gjelder.
  - Utelates for festegrunn uten teig, ved tvist og ved flere matrikkelenheter på teigen.
- 17 av 49 i QA kvalifiserer til «Tomt». De øvrige med teig kan få «Eiendommens areal».

## Salg og kjøpesum
- **Lovlig å vise åpent** (§ 5 sjette ledd, Kartverkets praksis), uten navn.
- **Rute:** søknad til Kartverket om Grunnbok-API. Gratis, med endringslogg nær sanntid. Nye salg er
  synlige én virkedag etter tinglysing.
- **Forutsetning NaboRadar ikke oppfyller i dag:** organisasjonsnummer. Ansvarlig er en privatperson
  (jf. personvern-auditen), og privatpersoner kan ikke søke.
- **Omsetningstyper på skjøtet:** fritt salg, gave, ekspropriasjon, tvangsauksjon, uskifte,
  skifteoppgjør, opphør av samboerskap, annet.
- **Kvalitetsfeller:**
  - Gave kan stå med 0 kr eller lavt beløp.
  - Ett skjøte kan gjelde flere enheter eller en ideell andel.
  - Borettslagsandeler ligger på org.nr + andelsnummer, ikke matrikkelnummer, og kjøpesummen er uten
    fellesgjeld.
  - Aksje- og obligasjonsleiligheter er ikke i grunnboken.
- **Trygg visning når tilgangen finnes:** bare «fritt salg» av hel enhet (1/1), som «Sist tinglyst
  salg: 2021 · 12 500 000 kr». For borettslag: utelat, eller merk «uten fellesgjeld».
- **Aldri:** tvangssalg, skifte, uskifte, samboeropphør eller gave. Det er personhistorikk (jf.
  feasibility-fila § 11).
- Ikke scrape Eiendomsregisteret, Finn, Hjemla eller Eiendomsverdi.

## QA: 49 adresser i 8 kommuner
Utvalget er trukket fra matrikkeldataene per kategori og slått opp live mot Adresse-API, Eiendom-API
og WMS. Arbeidsfilene ligger i scratchpad.

| Kategori | Antall | Funn |
|---|---|---|
| Enebolig | 8 | Alle: ett bygg (111), én bruksenhet, egen teig. To ligger på landbrukseiendom (83–87 dekar) |
| Tomannsbolig | 4 | Type 121/122. Vertikaldelt: adresse per halvdel. Horisontaldelt: to bruksenheter på samme adresse |
| Rekkehus | 4 | Type 131. Tomt varierer fra egen (142 m²) til felles (25–33 dekar). Tromsø: under oppføring (IG) |
| Blokk, seksjonert | 5 | Bygningstype og antall bruksenheter på oppgangen (6–34). Seksjonsnummer per bruksenhet |
| Blokk, useksjonert | 3 | Trolig borettslag eller utleie. Matrikkelen sier ikke hvilket |
| Flere adresser i samme bygg | 2 | Bygget har 20–40 bruksenheter over 5–20 adresser |
| Flere bygg på adressen | 3 | F.eks. enebolig + fritidsbygg + annet. Kortet må velge eller liste |
| Gårdsbruk | 5 | Våningshus (113). 2–16 teiger |
| Fritidsbolig | 5 | Type 161. Flere på festegrunn |
| Festetomt | 2 | Festenummer i adressen. Én uten egen teig, én uten areal |
| Nybygg | 5 | Status MB, IG eller RA. Adressen finnes før bygget er ferdig |
| Uten bygg | 3 | Adresse med bruksenhet, men ingen kobling til bygg |

Felt som kunne vises trygt:
| Felt | Dekning i QA |
|---|---|
| Matrikkelnummer | 49 / 49 |
| Antall bruksenheter på adressen | 49 / 49 |
| Bygningstype og status | 46 / 49 (tre uten bygg; åtte har flere bygg eller delt bygg og trenger en regel) |
| Eiendommens areal | 47 / 49 |
| «Tomt» i snever forstand | 17 / 49 |
| Byggeår | 0 / 49 |
| Boligareal | 0 / 49 |
| Siste salg, kjøpesum | 0 / 49 uten avtale |

Kontroll mot offentlig innsyn: WMS-svaret er det samme som Kartverkets matrikkelkart viser.
Eiendomsregisteret ble ikke brukt maskinelt.

## Negative funn
- Byggeår og BRA kan ikke vises åpent, uansett kilde.
- Adresse-API-et mangler `adresseId` og seksjonsnummer.
- Borettslag kan ikke skilles fra utleieblokk i matrikkelen.
- Bruksenhetstype (bolig eller annet) er ikke i åpne data. «Antall boenheter» er egentlig «antall
  bruksenheter».
- Matrikkel-WFS-ene er ustabile (nede i dag).
- **Feil i koden (rettet samme dag):** tabellen `BYGNINGSTYPE` i `lib/property/lookup.ts` avvek fra
  SSB KLASS 31 for mange koder.
  - 719 er sykehus, men vises som «Annen beredskapsbygning».
  - 613 er barneskole, men vises som «Museum eller bibliotek».
  - 143–146 har feil etasjetall.
  - 171 og 181 er forskjøvet.

  Rettet 2026-10-03, se under.

## Rettet 2026-10-03

### Bygningstype fra SSB KLASS 31
- `lib/property/bygningstyper.json` er et uendret øyeblikksbilde av «Standard for bygningstype /
  Matrikkelen» (KLASS 31, versjon «Bygningstype / Matrikkelen 2000», sist endret hos SSB 2025-04-28):
  126 koder på nivå 3. Oppdateres med `npx tsx scripts/update-bygningstyper.ts`.
- Ingen egne betegnelser. Ukjent kode gir ingen tekst.
- Kontroll mot hele landet: 118 typekoder er i bruk i 4 416 740 bygg. Alle finnes i KLASS unntatt
  matrikkelens `999` (37 091 bygg, 0,84 %), som ikke får betegnelse.
- Regresjonstester for kodene som var feil (719 sykehus, 613 barneskole, 641 museum, 642 bibliotek,
  143–146, 171, 181) og én kode per hovedgruppe.

### Eiendomskartet på Eiendom-API og matrikkelkart-WMS
- Teig: `api.kartverket.no/eiendom/v1/punkt/omrader` (flaten som omslutter punktet, GeoJSON).
- Areal, kommunenavn og tvist: WMS `teiger`, bare når teig-id-en er den samme.
- Bygg: WMS `bygning_symbol` med `RADIUS=bbox` i teigens utsnitt, og punkt-i-polygon mot teigen.
- **Funn underveis:** WMS-en har også bygg som ikke står der (BR revet/brent, BA avlyst, BU utgått).
  Uten filter fikk Ullevål sykehus 52 bygg; det åpne datasettet har 42. Filteret er lagt inn.
- **QA, 19 adresser** (enebolig, kjedehus, rekkehus på felles tomt, seksjonert og useksjonert blokk,
  sykehus, tre gårdsbruk, tre festetomter, flere teiger; Oslo, Bergen, Trondheim, Stavanger, Tromsø,
  Hitra, Vinje, Engerdal):
  - matrikkelnummer lik adressens i 19 av 19 (festetomten uten egen teig gir grunneiendommen),
  - bygg identiske med den nasjonale nedlastingen i 19 av 19,
  - svartid 110–1 400 ms,
  - punkt i sjøen gir «ingen eiendom»; en utmarksteig på 277 km² gir eiendom med ukjent bygg.
- **Falt bort:** matrikkelenhetstype og flaggene for grunnforurensning og kulturminne på
  matrikkelenheten. De finnes ikke i de nye kildene.
- Kildevalget dekkes av [ADR 015](../adr/015-publikumsprodukt-wms-og-kildefeil.md) (datert merknad).
  Dagens løsning står i [håndbok §15](../naboradar-handbook.md#15-eiendomsfunksjonen).

## DB-måling: nasjonal adresse → bygning (2026-10-03)
Målt på Kartverkets nasjonale nedlasting, lastet i PostgreSQL 18 (PGlite) lokalt. Ingenting er lagt
i produksjon.

### Kildefilene
| Fil | Zippet | Utpakket | Datert |
|---|---|---|---|
| Matrikkelen – Bygningspunkt, hele landet (GML) | 603 MB | 7,74 GB | 2026-09-26 (ukentlig) |
| Matrikkelen – Adresse leilighetsnivå, hele landet (CSV) | 252 MB | 1,31 GB | 2026-10-03 (daglig) |

### Antall
| | |
|---|---|
| Adresser | 2 603 434 |
| Bruksenheter med adresse (rader i adressefila) | 3 617 322 (3 457 434 unike bruksenheter) |
| Bygg | 4 416 740 |
| Bruksenheter i bygg | 5 769 252 (2 094 833 uten adresse: garasjer, uthus o.l.) |
| Relasjoner adresse → bygg | 2 682 225 |
| Adresser med 0 / 1 / 2 / 3+ bygg | 3,8 % / 90,7 % / 4,7 % / 0,8 % |
| Rader med seksjonsnummer | 712 972 |

### Størrelse i PostgreSQL
| Modell | Rader | Tabell | Indeks | **Totalt** | Andel av 500 MB |
|---|---|---|---|---|---|
| Full normalisert: bygning + bygning_enhet + adresse_enhet | 13,8 mill. | 818 MB | 488 MB | **1 306 MB** | 261 % |
| – `bygning` (nummer, kommune, type, status, punkt) | 4 416 740 | 220 MB | 132 MB | 352 MB | |
| – `bygning_enhet` (to indekser) | 5 769 252 | 316 MB | 186 MB | 502 MB | |
| – `adresse_enhet` (to indekser) | 3 617 322 | 282 MB | 170 MB | 452 MB | |
| Minimal: én rad per adresse → bygg (kommune, adressekode, nummer, bokstav, bygningsnummer, type, status, enheter) | 2 681 975 | 133 MB | 77 MB | **211 MB** | 42 % |
| Minimal med én bigint-nøkkel (bare type og enheter) | 2 681 975 | 113 MB | 56 MB | **169 MB** | 34 % |
| Pakket: én rad per gate (kommune + adressekode) med tabeller for husnummer, bokstav, bygningsnummer, type, status, enheter | 107 973 | 43 MB | 2 MB | **46 MB** | 9 % |
| Pakket uten bygningsnummer og status | 107 973 | 29 MB | 2 MB | **31 MB** | 6 % |

- Produksjonsbasen er **145 MB av 500 MB** (Supabase Free), der `area_features` er 92 MB. En full base
  blir skrivebeskyttet.
- Radoverhodet i PostgreSQL (24 byte + linjepeker) dominerer de smale tabellene. Derfor er den pakkede
  modellen 4–5 ganger mindre enn rad-per-relasjon.
- Geometri trengs ikke i tabellen. Teig og areal slås opp live.
- Adresse-API-et gir ikke `adresseId`. Nøkkelen må derfor være kommunenummer + adressekode + nummer +
  bokstav, som finnes i begge kildene. Matrikkeladresser (37 138) har ikke adressekode.

### Oppdatering
- Adressefila: 425–1 000 rader endres en vanlig virkedag, med enkeltdager på 7 000–27 000.
  9 637 rader (0,27 %) siste 7 dager, 41 881 (1,16 %) siste 30 dager, 9,7 % siste år.
- Fordelt på gater: 1 041 av 108 522 gater (1,0 %) hadde en endret adresse siste 7 dager, 4 021
  (3,7 %) siste 30 dager.
- Bygningsfila har ingen endringsdato per bygg i nedlastingen. Statusendringer på bygg er derfor
  ikke målt.
- Sync-kostnad per kjøring: 855 MB nedlasting og strømmet lesing av 9 GB. Bygningsfila tok ca.
  3,5 minutter å lese lokalt, adressefila under ett minutt. Ukentlig er nok: bygningsfila er ukentlig.
- Inkrementelt uten å skrive uendrede rader: ja. Bygg tabellen i jobben, sammenlign en hash per rad
  (gate) med basen og skriv bare de som er endret, i størrelsesorden 1 000–2 000 rader i uka.

### Ny vurdering av eiendomskortet
| Alternativ | Kostnad | Vurdering |
|---|---|---|
| **A. Bygg nå med nasjonal kobling** | 46 MB (pakket) eller 211 MB (rad per relasjon), ukentlig jobb på ca. 10 minutter, ny sync-kode og en egen pakket lesevei | Mulig innenfor kvoten bare i pakket form. Gir type per adresse, antall enheter og seksjon. Verdien er fortsatt moderat |
| **B. Enklere kort uten bulkimport** | 0 MB. Ett live-oppslag (110–1 400 ms) per sidevisning | Oppslaget finnes allerede: eiendomskartet gir matrikkelnummer, areal og byggene på teigen med type. For enebolig på egen tomt er det nok. For blokk og felles tomt kan vi ikke peke ut adressens bygg, bare si hva som står på eiendommen |
| **C. Vent** til byggeår, BRA eller salg er tilgjengelig | 0 | Kortet får først høy verdi med salg. Det krever org.nr og innvilget tilgang |

**Anbefaling: C for eiendomskortet som eget produkt, ikke A nå.**
- A er teknisk forsvarlig i pakket form (9 % av kvoten), men gir fire felt brukeren stort sett ser
  selv (det er en enebolig), og det binder en ny ukentlig bulkjobb.
- B koster nesten ingenting og kan tas som et lite steg hvis ønskelig: vis det eksisterende
  eiendomsoppslaget for adressen brukeren søkte på. Det er en produktbeslutning, ikke bygget.
- Hvis salg blir aktuelt senere, er den pakkede tabellen riktig grunnlag, og målingen her gjelder.

## Salgsdata (ikke påbegynt)
- Kan være mulig senere.
- Krever virksomhet med organisasjonsnummer og godkjent tilgang fra Kartverket (Grunnbok-API).
- Bare frie salg av hel enhet er aktuelle for offentlig visning.
- Ingen personopplysninger: ikke navn, ikke gave, skifte, uskifte eller tvangssalg.
- Ingen søknad er sendt, og ingenting er bygget.

## Personvern
- Kortet viser fakta om eiendommen: type, matrikkelnummer, areal og antall enheter. Alt er
  § 3 annet ledd-data som «kan behandles av enhver».
- Ingen eiernavn, ingen beboere, ingen heftelser.
- Kjøpesum + adresse er personopplysning om eieren.
  - Det krever interesseavveining (GDPR art. 6 nr. 1 f), oppdatert personvernside og håndtering av
    innsigelser.
  - Kartverket håndterer skjermede adresser i kilden.
  - Uten navn er inngrepet lite, men det er et nytt behandlingsformål for NaboRadar.
- Historikk med gave, skifte og tvangssalg vises ikke.

## Foreslått modell (ikke bygget)
- `address_units` (fra leilighetsnivå): `kommunenummer, adressekode, nummer, bokstav, adresse_id,
  bruksenhet_id, bruksenhetsnummer, gnr, bnr, fnr, snr`.
- `buildings` (fra Bygningspunkt): `bygningsnummer, kommunenummer, type_kode, status_kode, punkt`.
- `building_units`: `bygningsnummer, bruksenhet_id, adresse_id, matrikkelenhet_id`.
- Teig og areal slås opp live (Eiendom-API + WMS) og mellomlagres. De lagres ikke nasjonalt (6,4 GB).
- `property_transfers` (først etter avtale): `matrikkelenhet eller borettslagsandel, tinglyst_dato,
  vederlag, omsetningstype, andel, source_updated_at`.
- Visningsreglene (ett bygg eller flere, tomt eller eiendomsareal) ligger i kode eller RPC, ikke i
  tabellene.

**Lagre eller slå opp live?** Adresse → bygning bør lagres. Koblingen finnes bare i nedlastingen, og
WFS-en er nede. En slank nasjonal tabell (ca. 2,6 mill. adresser, 4,3 mill. bygg, uten geometri
utover punkt) er anslagsvis noen hundre MB og oppdateres ukentlig fra Geonorge. Størrelsen må måles
mot Supabase-planen før beslutning. Alternativet er å starte med de største kommunene.

## Anbefalt MVP
1. **Felt i v1 (3–5):**
   - bygningstype,
   - eiendom (gnr/bnr, pluss feste- og seksjonsnummer når kjent),
   - «Tomt» eller «Eiendommens areal» etter regelen over,
   - antall boenheter på adressen når det er flere enn én,
   - bygningsstatus bare når bygget ikke er tatt i bruk («Under oppføring»).
2. **Droppes:** byggeår, bruksareal, eier, og siste salg i v1.
3. **Nasjonalt?** Ja. Alle kildene er landsdekkende, med 90–97 % entydig bygg per adresse (Oslo 82 %).
4. **Dekkes godt:** enebolig, tomannsbolig, rekkehus på egen tomt, fritidsbolig.
5. **Vanskelig:**
   - blokk og borettslag (ingen enhetsdata, felles tomt),
   - gårdsbruk (tomt = hele bruket),
   - feste,
   - flere bygg per adresse (Oslo 16 %),
   - nybygg,
   - adresser uten bygg (1–6 %).
6. **Knyttes til:** adressen, med bygning og matrikkelenhet som opplysninger. Ikke bruksenhet, for vi
   vet ikke hvilken leilighet brukeren mener og har ingen data per enhet.
7. **Manglende data:** utelat feltet. Under to sikre felt vises ikke kortet. Ingen «ukjent»-rader.
8. **Siste salg i v1?** Nei. Det er neste steg hvis NaboRadar får org.nr og Kartverket innvilger
   søknaden.
9. **Lagre eller live?** Lagre adresse → bygning. Slå opp teigareal live med cache.
10. **Bygge nå?**
    - Ja, som et lite kort. Type + eiendom + tomt gir en tydelig «dette er stedet du søkte på» for
      småhus.
    - Verdien er moderat uten byggeår og salg.
    - Den største gevinsten er at siste salg kan legges på samme kort senere.
    - Rett bygningstype-tabellen først.

## Plassering i `/omrade`
- Rett under adressen og radius/«Endre sted», før skolekrets. Kortet identifiserer stedet, og resten
  beskriver omgivelsene.
- Kompakt: én overskriftslinje («Enebolig · 107/1037») og to–tre faktalinjer. Ikke sammenleggbart, og
  uten egen forklaringstekst.
- Vises bare når minst to felt er sikre. Blokkadresser får en kortere variant («Boligblokk · 34
  boenheter på adressen · 53/822»).
- Kilde («Kartverket, matrikkelen») i den felles kildelisten, ikke i kortet.

## Hva vi bevisst ikke gjorde
Ikke bygget eiendomskort. Ingen tabeller, sync eller import i produksjon. Ingen salgshistorikk,
byggeår eller BRA. Ingen scraping. Ingen søknad sendt, og ikke opprettet organisasjonsnummer. Ingen
ny ADR.

## Åpne spørsmål
- Skal NaboRadar få organisasjonsnummer (ENK eller selskap)? Det er forutsetningen for Grunnbok-API.
- Tåler Supabase-planen en nasjonal adresse → bygning-tabell? Besvart i «DB-måling»: bare i pakket
  form.
- Skal dagens klikkbare eiendomskart flyttes fra WFS til WMS og Eiendom-API? Gjort 2026-10-03.
- Skal det eksisterende eiendomsoppslaget vises for den søkte adressen (alternativ B)?

## Hva som kan utløse ny vurdering
- Kartverket åpner byggeår eller BRA (forskriftsendring).
- Adresse-API-et får `adresseId` og seksjonsnummer.
- Innvilget Grunnbok-tilgang.
