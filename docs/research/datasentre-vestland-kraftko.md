# Datasentre i Vestland og kraftkøen

> Discovery og verifisering, 2026-10-06 (datasenter-runde 17). Bare admin-research; ingenting er
> publisert.
> **Konklusjon:** alle sju prosjektene Bergens Tidende navngir, lå allerede i basen. Det nye er
> kraftsporet: Statnetts åpne liste har 19 datasentersaker i kø i Vestland, fordelt på 16
> prosjekter, og fem av dem er ikke anlegg i basen. Ingen av de fem er godt nok dokumentert til å
> bli et funn. Sju eksisterende funn er oppdatert med status, kraftdata og kilder. Datamodellen
> er ikke endret; to felt er foreslått.

Utgangspunktet var BT 06.10.2026, «20 datasentre planlagt bare i Vestland: – Nå trenger vi hjelp».
Artikkelen ligger bak betalingsmur. Bare tittel og ingress er lest, så den er brukt som lead og
ikke som kilde for enkeltfakta. Dagens modell og regler står i
[håndboka §37](../naboradar-handbook.md#37-datasenter-enrichment-og-refresh).

## Metode
- Dedup først: alle datasenterfunn i Vestland-kommunene ble lest ut av basen (20 funn av 128).
- Statnetts lister over kapasitetskø og reservasjoner ble lest rad for rad 06.10.2026 og filtrert
  på næringstype og stasjon.
- Fire parallelle søk: Dale i dybden, Sogn (Årdal og Luster), Nordhordland og Samnanger, og
  kraftkø, Nkom og øvrige Vestland-prosjekter.
- Primærkilder først: Statnett, Brønnøysund, kommunale plandokumenter, NVE, selskapenes egne
  sider. Presse bak betalingsmur er bare brukt med tittel og ingress, og er merket slik.
- Flere nettsider er lest gjennom et hentverktøy som oppsummerer. Sitater derfra bør kontrolleres
  mot originalen før de gjengis som sitat.

## 1–3. De navngitte prosjektene

| BT-navn | Funn i basen | Fantes? | Verifisert mot primærkilde |
|---|---|---|---|
| ASP Data Center, Dale (Vaksdal) | ASP Dalekvam | Ja | Selskap og kraft: ja. Dispensasjonssaken: bare presse |
| Bluefjords, Årdal | Notat på Bluefjords Gaupne | Ja, som lead | Nei. Bare presse (NRK, som viser til Sogn Avis) |
| Regn Data Center, Gulen | Skipavika datasenter, Gulen | Ja, se under | Delvis. Stedet er riktig, aktøren er uklar |
| Kitebrook, Matre | Kitebrook Matre, Masfjorden | Ja | Ja (kommunens plandokumenter, Statnett) |
| Kitebrook, Luster | Kitebrook Leirdøla, Gaupne | Ja | Ja (Luster kommune, Statnett) |
| Gaupne utvikling, Luster | Gaupne Datapark, Gaupnegrandane | Ja | Ja (Statnett, Brønnøysund, kommunens plan) |
| Regn / Kitebrook, Børdalen (Samnanger) | Kitebrook Børdalen | Ja | Ja (Brønnøysund, Statnett, vedtatt plan 2019) |

- **Sju av sju fantes.** Ingen nye funn er opprettet.
- **Seks av sju er verifisert** mot minst én primærkilde. Bluefjords i Årdal er bare dokumentert
  gjennom presse.
- **«Regn» er Kitebrooks tidligere navn.** Kitebrook AS (917 810 214) het Regn Datacenters AS til
  30.10.2024. «Regn / Kitebrook» i Statnetts lister og i BT er ett konsern.
- **Gulen er uklart.** Regn søkte NVE rundt 2018 om et datasenter på 5–20 MW i Skipavika
  Næringspark. Kitebrook nevner ikke Gulen i 2026. Dagens prosjekt i samme næringspark har en
  annen eier (BW Velora Skipavika Digital Sikkerhet AS) og 95 MW i kø. Om BT mener det ene eller
  det andre, kan ikke leses ut av det åpne.
- **Luster har tre anlegg, ikke to:** Bluefjords (i drift) og Kitebrook ligger i samme planområde
  i Jostedalen; Gaupne Datapark ligger 5 km unna i Gaupne sentrum. «Gaupne Utvikling AS» er det
  tidligere navnet på Gaupne Datapark AS.

## 4. De 14 andre i kraftkø

### Hva Statnetts liste viser (06.10.2026)
19 datasentersaker i kø i Vestland, til sammen 1 244 MW. Alt under er **køplass**, ikke tildelt
kapasitet. Kommune er vår lesning av stasjonsnavnet; Statnett oppgir stasjon, ikke kommune.

| Stasjon | Sluttkunde | MW i kø | Moden bestilling | Sak | I basen |
|---|---|---|---|---|---|
| Ålfoten (Bremanger) | Lefdal Mine Datasenter | 120 | 17.10.2024 | 25/01967 | Lefdal Mine Datacenter |
| Samnanger | Regn / Kitebrook | 100 | 18.11.2024 | 25/02232 | Kitebrook Børdalen |
| Sogndal | Vangsnes Utvikling AS | 90 | 30.10.2025 | 26/04019 | Vangsnes Datapark |
| Hove (Vik) | Vangsnes Utvikling AS | 120 | 18.05.2026 | 25/02609 | Vangsnes Datapark |
| Moskog (Sunnfjord) | Titan Group AS | 80 | 26.11.2025 | 25/02600 | Lefdal Moskog |
| Moskog | Arcem DC 16 AS | 40 | 19.03.2026 | 25/02605 | Arcem Sunnfjord |
| Moskog | Magnora ASA | 50 | 09.07.2026 | 26/03395 | **Nei** (notat på Lefdal Moskog) |
| Lindås (Alver) | Skipavika Næringspark AS | 45 | 09.01.2026 | 25/03004 | Skipavika datasenter |
| Lindås | BW Velora Skipavika Digital Sikkerhet AS | 50 | 13.02.2026 | 25/03021 | Skipavika datasenter |
| Lindås | NODC 100 AS | 75 | 07.05.2026 | 25/03020 | **Nei** |
| Lindås | Arcem DC 11 AS | 50 | 08.05.2026 | 26/03529 | **Nei** |
| Husnes (Kvinnherad) | Arcem GO-DC2 AS | 40 | 22.01.2026 | 25/02545 | Arcem Husnes |
| Husnes | Reikna AS | 50 | 19.05.2026 | 26/03432 | Reikna NDC Husnes |
| Sima (Eidfjord) | Eviny Havvind 1 AS | 90 | 26.03.2026 | 26/03524 | **Nei** |
| Haugsvær (Masfjorden) | KB IFS Matre AS | 70 | 06.05.2026 | 25/02560 | Kitebrook Matre |
| Dale (Vaksdal) | Asp Eiendom AS | 10 | 16.06.2026 | 26/03066 | ASP Dalekvam |
| Arna (Bergen) | Arcem DC 12 AS | 130 | 18.06.2026 | 25/02405 | Arcem Bergen |
| Borgund (Lærdal) | Håbakken Næringspark AS | 30 | 30.06.2026 | 26/04495 | **Nei** |
| Borgund | Håbakken Næringspark AS | 4 | 13.07.2026 | 26/04604 | **Nei** |

Reservert til datasenter i Vestland: Gaupne Utvikling AS 120 MW og Kitebrook Infrastructure AS
100 MW (begge Leirdøla), Lefdal 64 MW og Svelgen Property AS 5 MW (begge Ålfoten), og
«Regn / Kitebrook» 30 MW (Haugsvær). I tillegg står Dale Fabrikker med 20 MW reservert under
næringstypen **«Industri»**, ikke «Datasenter».

### Kan de 14 identifiseres?
- **Hvem som har talt BTs «14» og «20», er ikke funnet.** Statnetts liste er den eneste åpne kilden
  på saksnivå. Den gir 19 saker og 16 prosjekter. Tallet 14 kan nås på flere måter, og ingen av
  dem er bekreftet.
- **11 av de 16 prosjektene i køen er anlegg i basen fra før.**
- **Fem er ikke det**, og ingen av dem holder til et funn:

| Lead | Det som er kjent | Hvorfor ikke et funn |
|---|---|---|
| Eviny og Skygard, Simadalen (Eidfjord), 90 MW i kø | Pressemelding 12.05.2026: samarbeid i «tidligfase» om «mulig utvikling av datasenter i Simadalen». Køplassen står på Eviny Havvind 1 AS | Utredning, ikke prosjekt. Ingen tomt, ingen effekt i meldingen |
| Håbakken Næringspark (Lærdal), 30 + 4 MW i kø | KI-datasenter foreslått i juni 2026 ifølge Porten (bare tittel lest) | Bare presse bak betalingsmur |
| Magnora, Moskog, 50 MW i kø | Magnora omtaler 50 MW på et tidligere steinbrudd «nordvest i Norge» | Koblingen til Moskog er utledet av køraden |
| NODC 100 AS, Lindås, 75 MW i kø | Stiftet 05.11.2025, samme adresse som Arcem-selskapene (Inkognitogata 8, Oslo) | Bare en rad i køen. Sted ukjent |
| Arcem DC 11 AS, Lindås, 50 MW i kø | Arcem-selskap stiftet 10.12.2024 | Bare en rad i køen. Sted ukjent |

Disse følger regelen i håndboka: en post i Statnetts lister er et lead, ikke et anlegg.

Svakere spor som ikke er fulgt videre: Svelgen Property AS (Bremanger; 1,6 MW tilknyttet og 5 MW
reservert som datasenter, ingen omtale funnet), Tyssedal i Ullensvang (omtalt som trolig umulig på
grunn av skredfare), og Fortescue på Holmaneset i Bremanger (en datasenteridé i et brev, ikke et
prosjekt; reservasjonen gjelder ammoniakk).

## 5. Hvilke kraftkilder er åpne

| Kilde | Åpen | Innhold | Kan brukes systematisk |
|---|---|---|---|
| Statnett, «Statistikk om tilknytningssaker» | Ja | Per sak: saksnummer, stasjon, områdeplan, prisområde, nettselskap, sluttkunde, næringstype, MW, dato. Egne lister for kø, reservert, tilknyttet og tilbaketrukket | Ja. Fem Power BI-rapporter uten nedlasting; kan leses rad for rad |
| Nkoms datasenterregister | Delvis | Operatører med org.nr og kryptoandel. Ikke sted, ikke antall anlegg | Bare for anlegg i drift |
| Vestland fylkeskommune, «Kraftsituasjonen i Vestland» (2025) | Ja | Aggregerte tall | Nei |
| BKK/Eviny Nett, Linja, Sygnir, Fagne | Nei | Ingen åpen køliste funnet | Saker over 5 MW dukker opp hos Statnett |
| NVE og RME | Enkeltsaker | Konsesjonssaker for nettanlegg | Bare sak for sak |

Begrensninger i Statnetts liste:
- Saker under om lag 5 MW går ikke til Statnett og mangler.
- Næringstypen settes av nettselskapet. Dale står som «Industri», så et filter på «Datasenter»
  finner ikke alt.
- Sluttkunden er ofte et prosjektselskap uten sted («NODC 100 AS»).
- Bare modne saker vises. Forespørsler som ikke er vurdert modne, er ikke publisert.

## 6. Hva «kraftkø» betyr

| Trinn | Hva det er | Synlig hos Statnett |
|---|---|---|
| Forespørsel | Formell henvendelse til nettselskapet. Gir ingen rett | Nei |
| Moden bestilling | Prosjektet er vurdert modent (plan, finansiering, sted). Datoen gir plass i rekken | Ja, som dato |
| **I kø** | Modent, men uten ledig kapasitet i nettet | Ja |
| **Reservert** | Kapasitet er holdt av, med bindende framdriftsplan. Kan trekkes tilbake | Ja |
| **Tilknyttet** | Kapasiteten er i bruk | Ja |

Et prosjekt i kø har altså vist at det er reelt, men har **ikke** fått nettkapasitet. Det er
forskjellen mellom «omtalt» og «har fått strøm», og den kan bare leses hos Statnett.

Modellen i dag: `secured_power_mw` er reservert eller tilknyttet til det konkrete anlegget eller
prosjektselskapet. Køplasser står i notatet, ikke i feltet.

## 7. MW-tallene

| Anlegg | Reservert | I kø | Selskapets ambisjon | Sikkerhet |
|---|---|---|---|---|
| ASP Dalekvam | 20 MW (på «Dale Fabrikker», 2023, før Asps kjøp) | 10 MW | «Initial 20 MW», «up to 300 MW»; 110 MW og 300–1000 MW bare i bransjepresse | 20 og 10: sikre. Resten: utsagn |
| Kitebrook Matre | 30 MW (på «Regn / Kitebrook», 2020) | 70 MW | 100 MW, 82,5 MW IT i tre faser | Sikre (Statnett og kost-nytteanalysen) |
| Kitebrook Leirdøla | 100 MW (28.05.2026) | – | 100 MW | Sikker |
| Gaupne Datapark | 120 MW (uten dato) | – | 120 MW | Sikker, med forbehold om manglende dato |
| Kitebrook Børdalen | – | 100 MW | 100 MW | Sikker som køplass |
| Skipavika, Gulen | – | 45 + 50 MW | 95 MW i to campuser | Sikker som køplass |
| Bluefjords, Årdal | – | – | Ingen effekt oppgitt | Ukjent |

Dale er eksempelet på hvorfor tallene må holdes fra hverandre: 20 MW er reservert til eiendommen,
10 MW er bestilt og står i kø, og 300 MW er en ambisjon som ikke er bestilt noe sted.

## 8. Planstatus

| Anlegg | Planbehandling | Status | Kilde |
|---|---|---|---|
| ASP Dalekvam | Dispensasjon fra kommuneplanen | Vedtatt i kommunestyret 24.09.2026, 13 mot 7. Tre SV-representanter, blant dem varaordføreren, har krevd lovlighetskontroll | Vaksdalposten (ingress) |
| Kitebrook Matre | Endring av områdeplan (plan-ID 463420200001) | Under arbeid. Vedtak ikke funnet | Masfjorden kommune |
| Kitebrook Leirdøla | Endring av områdeplan Fonndøla–Hausamoen (2020011) | Oppstart vedtatt 12.05.2026 | Luster kommune |
| Gaupne Datapark | Detaljregulering Gaupnegrandane (2021005) | Utsatt i kommunestyret; folkemøte varslet | Luster kommune; Porten (ingress) |
| Kitebrook Børdalen | Detaljregulering, vedtatt oktober 2019 | Vedtatt. Plan-ID ikke funnet | NRK; plankonsulent |
| Skipavika, Gulen | Endring av vedtatt plan | Søknad 11.06.2026 | Gulen kommune (fra runde 16) |
| Bluefjords, Årdal | Ukjent | Ingen plansak funnet | – |

### Dale i dybden
- **Dispensasjonen:** formannskapet innstilte 10.09.2026 mot SVs stemme. Kommunestyret vedtok
  24.09.2026. SVs alternative forslag var å regulere området før bruksendring.
- **Lovlighetskontroll:** kravet er fremmet. Det er ikke funnet noen kilde som sier at
  Statsforvalteren har mottatt eller behandlet saken. Lovligheten er bestridt, ikke avgjort.
- **Ikke funnet:** saksnummer, saksframlegg, vedtakstekst og vilkår, også støyvilkår. Alt vi vet
  om plansporet, kommer fra Vaksdalposten og et leserinnlegg fra en av partene.
- **Støy:** en nabo har uttrykt bekymring (BA, 2025). SV krevde at TEK17 og NS 8175 skulle gjelde.
  Hva vedtaket faktisk sier, er ikke funnet.
- **Nett:** Statnett bygger ny Dalekvam transformatorstasjon for 420 kV. Statnett skriver at den
  får samme funksjon som dagens. At den åpner for 300–1000 MW, er Asps tolkning.
- **Bygget:** om lag 48 500 m² bygningsmasse og 733 dekar tomt. Brownfield. Kryptovault leide i
  fabrikken fra 2018 til 2022.

## Nkom-tallet
- Nkom oppgir «Antall registrerte datasentre (inkl. virksomhetsinterne): 113», sist oppdatert
  06.10.2026. Tallet gjelder **anlegg**. Samme side viser 60 kommersielle operatører.
- Registreringsplikten gjelder fra oppstart: en operatør skal registrere seg før virksomheten
  starter. **Planlagte prosjekter står derfor ikke der**, annet enn når operatøren har andre
  anlegg i drift.
- Listen er åpen for kommersielle operatører (navn, org.nr, kryptoandel), uten sted og uten
  antall anlegg. Virksomhetsinterne anlegg er skjult og inngår bare i totalen.
- **«Ikke funnet hos Nkom» er ikke et argument mot at et prosjekt finnes.** Det sier bare at
  anlegget ikke er i drift, eller at operatøren ikke har registrert seg.

## 9. Hva som er oppdatert
Sju eksisterende funn har fått notat og kilder fra denne runden. Ingen felt for effekt er endret:
de var riktige.

| Funn | Endring |
|---|---|
| ASP Dalekvam | Statnett-radene lest på nytt; reservasjonen er «Industri» og eldre enn kjøpet. Dispensasjon, stemmetall og krav om lovlighetskontroll. Org.nr. Åtte kilder |
| Bluefjords Gaupne | Årdal-leadet presisert: bygget er den tidligere Dooria-fabrikken; ingen effekt, ingen Statnett-rad |
| Skipavika datasenter, Gulen | Regns prosjekt fra 2018 i samme næringspark; begge køradene ført med saksnummer |
| Kitebrook Matre | Regn er Kitebrooks tidligere navn; IT-effekt per fase |
| Kitebrook Børdalen | Én aktør, ikke to; plan vedtatt 2019 |
| Kitebrook Leirdøla | Reservasjonen bekreftet |
| Gaupne Datapark | Plansaken utsatt; folkemøte |

## 10. Bør datamodellen endres?
**Ikke nå.** Dagens modell holder alt denne runden fant:

| Ønsket felt | Finnes som |
|---|---|
| `project_status` | `operational_status` (planlagt, under bygging, i drift …) |
| `current_mw` | `it_load_mw` og `operational_capacity_mw` |
| `reserved_mw` | `secured_power_mw` |
| `planned_max_mw` | `planned_capacity_mw` og `campus_potential_mw` |
| `developer`, `operator` | roller i parter-tabellen |
| `last_verified_at`, `evidence_date` | finnes på funnet og per kilde |
| `requested_mw` (kø) | **bare i notat** |
| `planning_status` | **bare i notat** |
| `grid_status` | **utledes, men lagres ikke** |
| `site_type` | **bare i notat** |

To felt ville gitt mest, hvis det skal gjøres en endring senere:
1. **`queued_power_mw`** — bestilt og i kø hos Statnett. Det er i dag det tydeligste signalet på
   at et prosjekt er reelt, og det kan ikke filtreres eller sorteres. Med feltet på plass kan
   nettstatus utledes: tilknyttet, reservert, i kø eller ingen rad.
2. **`planning_process`** — dispensasjon, detaljregulering, eksisterende formål, ukjent.

Statusmodellen i oppdraget (rumor, early_lead, grid_queue …) blander prosjektstatus, plan og nett
i én akse. Et prosjekt kan være «i kø» og «dispensasjon vedtatt» samtidig. Tre adskilte
opplysninger er riktigere enn én lang statusliste.

### Adminvisningen
Panelet i Utforsk data viser i dag type, status, parter og ett MW-tall med merkelapp. Det skiller
allerede «20 MW sikret kraft» fra potensial, så det viser aldri «300 MW kapasitet». Det viser ikke
køplass eller planbehandling, fordi de ikke er felt. Det er ikke bygget noe nytt: uten feltene
ville panelet måtte tolke fritekst.

## Uavklart
- Hvem som har talt BTs 14 og 20.
- Om BTs Gulen-prosjekt er dagens Skipavika-prosjekt eller Regns gamle.
- Dale: saksnummer, vedtakstekst, vilkår, og om Statsforvalteren har fått saken.
- Bluefjords i Årdal: effekt, nett, plan, tomt og kjøpende selskap.
- Hvor NODC 100 og Arcem DC 11 ved Lindås skal ligge.

## Hva vi bevisst ikke gjorde
Ingen nye funn. Ingen skjemaendring. Ingenting offentlig, og ingen endring i `/omrade`. Ingen
omgåelse av betalingsmur. Ingen juridisk vurdering av dispensasjonen.

## Kilder
- Statnett, statistikk om tilknytningssaker: https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/
- Statnett, slik fungerer tilknytningsprosessen: https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/slik-fungerer-tilknytningsprosessen/
- Statnett, Dalekvam transformatorstasjon: https://www.statnett.no/vare-prosjekter/region-vest/dalekvam-transformatorstasjon/
- Nkom, datasenteroversikt: https://nkom.no/datasenter/oversikt
- Nkom, registreringsplikt: https://nkom.no/datasenter/registreringsplikt
- Brønnøysundregistrene, Enhetsregisteret (Kitebrook AS 917810214, KB DC Børdalen AS 922363307,
  Asp Data Center AS 931764225, Dale Eigedom AS 830729992, NODC 100 AS 936718949, Arcem DC 11 AS
  934766970, Årdal Næringssenter AS 929735072): https://data.brreg.no/enhetsregisteret/
- Asp Data Center, kjøpet av Dale Fabrikker: https://www.aspdatacenter.no/news/asp-acquires-dalefabrikker
- Vaksdalposten 25.09.2026 (ingress): https://www.vp.no/fleirtalet-for-dispensasjon-sv-krev-lovlegkontroll-om-datasenter-i-fabrikken/s/80-134-4058
- Vaksdalposten 02.10.2026 (ingress): https://www.vp.no/tre-politikarar-krev-lovlegkontroll-etter-strid-om-datasenter/s/80-134-4121
- Vaksdalposten, leserinnlegg 15.09.2026: https://www.vp.no/datasenter-og-demokrati/s/80-134-2929
- Masfjorden kommune, kost-nytteanalyse Matre: https://aimblob.blob.core.windows.net/aimfiles/486e8dbd-968c-4574-b3da-0de54e0e291d.pdf
- Luster kommune, planinitiativ Bluefjords: https://www.luster.kommune.no/nyheiter/bluefjords-planinitiativ.13071.aspx
- NVE-sak 201835154 (Regn, Skipavika): https://webfileservice.nve.no/API/PublishedFiles/Download/201835154/2416318
- Kitebrook, pressemelding 28.04.2026: https://kommunikasjon.ntb.no/pressemelding/18880629/datasenterpionerene-byrne-murphy-og-william-conway-vender-tilbake-til-norden-for-a-utvikle-mer-enn-500-megawatt-datasenterinfrastruktur-med-banebrytende-baerekraftig-design?publisherId=17849809&lang=no
- Eviny og Skygard, pressemelding 12.05.2026: https://kommunikasjon.ntb.no/pressemelding/18900297/eviny-og-skygard-innleder-samarbeid-om-utvikling-av-datasenterkapasitet-i-vestland
- NRK 14.08.2026 (Bluefjords, Årdal): https://www.nrk.no/vestland/milliardinvestering-i-sogn-skal-gi-50-arbeidsplassar--1.17989594
- Bergens Tidende 06.10.2026 (betalingsmur): https://www.bt.no/politikk/i/mK6qW0/datasenter-planlagt-rundt-i-vestland-som-i-dale-gulen-matre-luster-og-samnanger
