# Discovery: klikkbare eiendommer og bygg

Testet 2026-09-24. Alle tekniske funn er ekte kall, ikke antakelser. Juridiske funn er sitert
fra forskrift og Kartverkets egen dokumentasjon; de er ikke en juridisk vurdering.

## 1. Hva som finnes, og hva vi faktisk får tak i

| Datasett | Innhold | Tilgang | Lisens |
|---|---|---|---|
| Matrikkelen – Eiendomskart Teig (WFS + nedlasting) | Teigpolygon, matrikkelnummer, areal, kommune, forurensning/kulturminne-flagg, tvist | **Åpne data** | CC BY 4.0 |
| Matrikkelen – Bygningspunkt (WFS + nedlasting) | Bygningspunkt, bygningsnummer, bygningstype, bygningsstatus, næringsgruppe, kobling til adresse og matrikkelenhet | **Åpne data** | CC BY 4.0 |
| Matrikkelen – Adresse / Adresse REST-API | Offisiell adresse, koordinat | **Åpne data** | CC BY 4.0 |
| Matrikkelkart WMS | Ferdig tegnet eiendomskart | **Åpne data** | CC BY 4.0 |
| FKB-Bygning (bygningsomriss) | Takkant/grunnriss som flate | **Norge digitalt begrenset** | avtale |
| Matrikkelen (hele registeret) | Eier, byggeår, bruksareal, etasjer, heis, VA … | **Norge digitalt begrenset** | avtale |
| Grunnboken | Hjemmelshaver, heftelser, hjemmelsovergang med kjøpesum | **Norge digitalt begrenset** | avtale |
| Matrikkelen WMS | Matrikkelkart med mer detalj | **Norge digitalt begrenset** | avtale |

Verifisert mot Geonorge-metadata (`AccessIsRestricted`, `DataAccess`) og ekte WFS-kall.

## 2. Ekte testkall

**Teig-WFS**, bbox rundt Majorstuen, `app:Teig`:

- Svarte 200 med GML 3.2 (ingen GeoJSON-utdata).
- Felter: `matrikkelnummerTekst`, `gardsnummer`, `bruksnummer`, `kommunenavn`, `lagretBeregnetAreal`,
  `teigareal`, `matrikkelenhetstype`, `harGrunnforurensing`, `harKulturminne`, `tvist`,
  `avklartEiere`, `oppdateringsdato`, `noyaktighetsklasseTeig`, `uuidTeig`, polygongeometri.
- Eksempel: `38/28`, Oslo, 2 131,7 m², 5-punkts polygon.
- **Ingen eier, ingen byggeår, ingen bruksareal.**

**Bygningspunkt-WFS**, samme område, `app:Bygning`:

- Felter: `bygningsnummer`, `bygningstype` (NS 3457-kode, f.eks. 143), `bygningsstatus` (f.eks. TB),
  `naringsgruppe`, `harKulturminne`, `harSefrakminne`, `representasjonspunkt`, samt bruksenheter med
  `adresseId` og `matrikkelenhetId`.
- **Ingen byggeår, ingen bruksareal.**

**bbox-oppførsel (viktig for klikk).** Filteret ser ut til å treffe på representasjonspunkt,
ikke på polygonet:

| Buffer rundt klikkpunkt | Teiger i svaret | Tid | Størrelse | Traff teigen som omslutter punktet |
|---|---|---|---|---|
| ±22 m | 0 | 0,09 s | 1 KB | nei |
| ±55 m | 4 | 0,11 s | 13 KB | ja (215/42) |
| ±111 m | 11 | 0,15 s | 36 KB | ja |
| ±222 m | 50 | 0,30 s | 162 KB | ja |

Et klikk må derfor spørre med buffer og gjøre punkt-i-polygon selv.

**Nedlastingsvolum** (PostGIS-dump, zippet, målt med range-request):

- Oslo kommune: **78 MB**
- Hele landet: **6,4 GB**

## 3. Juridisk: hva vi har lov til å vise

Forskrift 2013-12-18-1599 om utlevering, viderebruk og annen behandling av opplysninger fra
grunnboken og matrikkelen, sammenholdt med matrikkellova § 30.

**§ 3 annet ledd — fritt for alle.** Matrikkelnummer, type, areal, grenselinjer og -punkt,
kulturminner, forurensning i grunnen, bygningsnummer, næringsgruppe, bygningsstatus og
bygningstype (unntatt skjermingsverdige), offisiell adresse, koordinater.
§ 4 sjuende ledd: disse «kan behandles av enhver». Matrikkellova § 30 tredje ledd sier det samme:
informasjon som bare identifiserer, kartfester eller typebestemmer kan utleveres i alle høve.

**§ 3 tredje ledd — krever berettiget interesse.** Registrert eier og fester, **byggeår**,
bebygd areal, antall etasjer og bruksareal, heis, bygningshistorikk, vannforsyning, avløp,
energikilder, pålegg. Byggeår og areal ligger altså i samme kategori som eiernavn.

**§ 5 sjette ledd — nøkkelregelen for oss.**
«Opplysningene kan kun gjøres tilgjengelig for søking eller visning på Internett med
tilgangskontroll og begrensninger i antall søk. Krav om tilgangskontroll gjelder ikke opplysninger
fra grunnboken om hjemmelsovergang og opplysninger fra matrikkelen som nevnt i § 3 annet ledd.»

- § 3 annet ledd-data: kan vises åpent uten innlogging.
- Hjemmelsovergang fra grunnboken (salg, kjøpesum, dato): unntatt kravet om tilgangskontroll.
- Alt annet, inkludert eiernavn og byggeår: kun bak tilgangskontroll og med søkebegrensning.

**§ 5 tredje ledd:** ingen bruk til reklame eller markedsføring uten samtykke.
**§ 5 sjuende ledd:** hold oppdatert, ikke lagre lenger enn formålet krever.
**§ 5 tiende ledd:** private registre må opplyse brukerne om at data kommer fra et privat register.
**§ 5 niende ledd:** forespørsler om hjemmelshaver med fortrolig adresse håndteres av Kartverket.

Kartverkets egen FAQ bekrefter at hjemmelsovergang og tinglyst kjøpesum er offentlig og kan
publiseres fritt, uten mulighet for å reservere seg — unntatt for personer med skjermet adresse.

**Søk på personnavn** er ikke hjemlet noe sted i forskriften. Den regulerer forespørsler om
«en bestemt registerenhet». Kombinert med kravet om tilgangskontroll og søkebegrensning er
navnesøk den klart mest inngripende varianten, og bør ikke bygges uten juridisk vurdering.

## 4. Tilgang: hvem kan søke, og hva koster det

§ 4 tredje ledd lister hvem som får full elektronisk tilgang: advokater, banker, forsikring,
finansforetak, inkasso, kredittopplysningsforetak, namsmyndighet, stat/kommune/fylkeskommune,
eiendomsmeglerforetak, revisorer, domstoler, presseorgan til journalistiske formål, og
«andre etter særskilt samtykke fra Statens kartverk».

NaboRadar er ingen av de opplistede. To mulige veier:

1. **§ 4 femte ledd:** virksomhet med berettiget interesse etter matrikkellova § 30 annet ledd —
   eller som videreformidler til noen med slik interesse — kan få § 3 tredje ledd-opplysningene
   (eier, byggeår, areal) elektronisk.
2. **§ 4 tredje ledd bokstav m:** særskilt samtykke fra Kartverket.

Søknad går via Altinn og krever organisasjonsnummer, formål, hjemmelsgrunnlag, datakategorier og
en beskrivelse av bruken — inkludert om data skal **videreformidles** til kunder.
Privatpersoner kan ikke søke; virksomheter kan.

Pris: § 8 første ledd sier at § 3-opplysninger gis vederlagsfritt, og at elektronisk tilgang etter
§ 4 gis «mot betaling fastsatt av Statens kartverk», begrenset til kostnadsdekning. Kartverkets egen
side sier at «virksomheter kan få gratis sanntidsdata fra Matrikkelen og Grunnboka hvis de har
hjemmel og eget grensesnitt». Det som koster penger er tredjepartsløsningene.

## 5. Kommersielle alternativer

- **Ambita AS** (statlig eid): Infoland, «Vis Eiendommen», rapporter og datauttrekk, omsetnings-
  rapporter, hjemmelshavere. Leverer eiendomsdata og kartteknologi til mediehus.
  **DN Boligbasen kjører på Ambitas data og teknologi** — det fremgår av Ambitas egne sider,
  ikke av analyse av DN. Ingen offentlig prisliste.
- **Norkart AS**: «API Omsetningsdata» med salgshistorikk (beløp og dato), eiendomstype, eierform,
  bruksareal, matrikkelidentitet og adresse — hentet fra «Kartverkets synkroniserte kopi av grunnboka».
  Bruksareal krever dokumentert berettiget interesse. Også «API Eiendomsflater» og Eiendomsinnsyn.
  Ingen offentlig prisliste.
- **Eiendomsverdi AS** (bankeid): boligprisdatabase og verdiestimater, brukes av bank og megler.
  Ingen offentlig prisliste.

Felles: ingen av dem publiserer priser. Alle er mellomledd på de samme offentlige registrene.

## 6. Arkitektur for klikkbare eiendommer

Tre alternativer, vurdert mot at vi ikke skal laste Norge inn i klienten:

1. **WFS per klikk.** Ingen lagring, men GML-parsing, buffer-triks og punkt-i-polygon i vår kode,
   og vi er avhengige av at Geonorge svarer. 0,1 s og 13 KB per klikk målt.
2. **Egen PostGIS-kopi + viewport-spørring.** Samme mønster som `area_features`: last ned per
   kommune, `ST_Intersects` på klikkpunktet, returner én teig. Presist og raskt, men Oslo alene er
   78 MB og hele landet 6,4 GB — det sprenger dagens Supabase-plan.
3. **Vektorfliser.** Best for å tegne mange eiendommer flytende, men krever egen flisgenerering og
   -lagring. Overkill før vi vet at folk bruker funksjonen.

Anbefalt rekkefølge: (1) for en MVP i ett område, (2) når vi vet hvilke kommuner som betyr noe,
(3) bare hvis bruken forsvarer det.

## Implementert 2026-09-24: klikkbart eiendomskart

MVP-en fra punkt 6 er bygget på åpne data alene — ingen eier, byggeår, bruksareal eller
salgsopplysninger.

**Oppslag per klikk, ikke synk.** Teigene er 6,4 GB nasjonalt, så vi spør Geonorge per klikk og
mellomlagrer svaret i 10 minutter (CC BY 4.0 tillater det). Målt responstid på ferske oppslag:
198–421 ms. Mellomlagret: ~8 ms.

**Buffer og punkt-i-polygon.** bbox-filteret treffer representasjonspunktet, ikke flaten, så vi
spør med ~65 m buffer og avgjør selv hvilken teig som omslutter klikkpunktet. Finner vi ingen,
utvides bufferet én gang til ~275 m. Det er nødvendig for store eiendommer: Ullevål sykehus er
144 000 m², og representasjonspunktet kan ligge langt fra der brukeren klikker.

**Bygg kobles geometrisk.** Bygningspunkter hentes i teigens omsluttende rektangel og filtreres
med punkt-i-polygon mot teigen. Ullevål gir 21 bygg, en enebolig på Vinderen gir 2–3.

**Nøstet GML.** Arealet ligger i `teigareal.Areal.lagretBeregnetAreal`, og matrikkelflaggene under
`matrikkelenhet.Matrikkelenhet`. Et regulært uttrykk ville hentet feil felt; vi parser XML.

**Zoomterskel 14.** Målt i kartpanelet: zoom 14 gir 4,7 m per piksel, så en tomt på 20×30 m er
4×6 piksler. På zoom 13 er den 2×3 piksler. Under terskelen vises et diskret hint i stedet for at
vi spør kilden om noe brukeren ikke kan ha ment. På mobil (333×388 px panel) lander 500 m-søket på
zoom 13,2, så der må brukeren zoome ett hakk inn først.
