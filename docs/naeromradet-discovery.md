# Discovery: «Nærområdet» — institusjoner og virksomheter

Undersøkt 2026-09-24. Tekniske funn er ekte kall. Juridiske og etiske vurderinger er begrunnet,
men er ikke en juridisk betenkning.

Målet med seksjonen er nøytralt: vise hva som faktisk finnes rundt en adresse, uten å signalisere
at det er bra eller dårlig. Brukeren vurderer selv.

## Kilder som ble undersøkt

| Kategori | Kilde | Maskinlesbar | Koordinater | Vurdering |
|---|---|---|---|---|
| Industri og anlegg | Miljødirektoratet, anlegg med utslippstillatelse | Ja, ArcGIS REST (allerede synket) | Ja, punkt | **Valgt først** |
| Avfall og gjenvinning | Samme kilde | Ja | Ja | Inngår i samme lag |
| Sykehus / behandling | RESH (Norsk helsenett) | Nei — bak helsenettet | – | Ikke tilgjengelig |
| Sykehus / sykehjem | Enhetsregisteret, NACE 86.1/87.1 | Ja, åpent REST | Nei, må geokodes | Mulig neste, med kuratering |
| Barnevernsinstitusjoner | Bufdir «Finn institusjon» | Nei — kun søkeside | Nei | Ikke importert, se under |
| Barnevern / botilbud | Enhetsregisteret, NACE 87.991/87.201 | Ja | Nei | **Bevisst ikke brukt** |
| Datasentre | Nkom datasenterregister | Ja, CSV daglig | **Nei — lokasjon publiseres ikke** | Ikke mulig |
| Institusjoner i kartdata | Geonorge | Ingen relevante datasett | – | – |

## Enhetsregisteret og begrensningene

Enhetsregisteret er åpent (NLOD), raskt (~0,25 s) og har underenheter som er faktiske driftssteder:
562 barneverninstitusjoner, 314 somatiske sykehus, 291 psykiatriske, 228 botilbud, 140
spesialinstitusjoner. Feltene er navn, beliggenhetsadresse, næringskode, antall ansatte og
oppstartsdato. Ingen koordinater — adressene må geokodes.

To begrensninger ble bekreftet ved test av 12 adresser i Oslo:

**Geokodingen holder.** 11 av 12 traff eksakt husnummer mot Kartverket. Én bommet på bokstavsuffiks.

**Næringskoden sier ikke hva som ligger på adressen.** Blant de fire første «somatiske sykehusene»
i Oslo lå et holdingselskap og en privat klinikk. Blant barnevernsunderenhetene lå et kontor i
Karl Johans gate. Et lag bygget rått på næringskode blir en blanding av institusjoner,
hovedkontorer og enkeltklinikker.

## Hvorfor barnevern og botilbud ikke importeres rått

Testen plottet, på sekunder, det som ser ut som faktiske boadresser til barnevernsinstitusjoner
på husnummernivå. Dataene er formelt åpne, men det er ikke avgjørende:

1. **Rammen stigmatiserer.** I et produkt som svarer på «hva bør du vite om denne adressen», blir
   en barnevernsinstitusjon presentert som et forhold ved området uansett hvor nøytral teksten er.
2. **Vi kan ikke skille.** Regelen vår er at et sted bare skal inn hvis det er klart og ordinært
   publisert som offentlig institusjon av ansvarlig myndighet. Bufdir publiserer navn og kommune
   for alle, men adresse bare for noen. Enhetsregisteret skiller ikke mellom de to. Å ta med alt
   er en denylist, ikke en allowlist.
3. **Kilden er ikke ment for dette.** Bufdir har ingen API eller CSV. Den eneste maskinlesbare
   veien går utenom fagmyndigheten som selv har valgt å ikke publisere strukturert.

Arkitekturen stenger likevel ikke for slike steder. Finner vi senere en fagmyndighet som
eksplisitt og ordinært publiserer et konkret sted som offentlig institusjon, kan det vurderes
enkeltvis og legges inn som en kategori i «Nærområdet». Regelen er: vi viser stedet, aldri
opplysninger om beboere, pasienter, barn eller andre privatpersoner.

## Hvorfor datasenterlokasjoner ikke brukes

Nkom har registreringsplikt for datasenteroperatører fra januar 2025 og publiserer en liste som
oppdateres daglig. Listen inneholder **operatørnavn og organisasjonsnummer — ingen adresser**.
Nkom skriver: «Av hensyn til sikkerhet og beredskap kan informasjon om hvilke aktører som har
virksomhetsinterne datasentre være sensitiv. Vi publiserer derfor ikke navn eller detaljer om
disse.»

Å utlede lokasjonene ved å kombinere andre kilder ville vært samme type sammenstilling som vi
allerede har avvist for kraftsensitiv informasjon. Kategorien kan tas inn hvis det senere kommer
en legitim offentlig lokasjonskilde.

## Hvorfor industri og anlegg ble valgt først

- Dataene finnes allerede i `area_features`: 866 anlegg, synket, med koordinat.
- Kilden er et **tillatelsesregister** — hvert punkt betyr noe konkret, og feltene er
  etterprøvbare: navn, bransje (NACE), utslipp til luft og vann, ansvarlig myndighet,
  siste rapporteringsår, lenke til faktaark.
- Ingen personvernrisiko: dette er virksomheter med offentlig utslippstillatelse.
- Tettheten er lav nok til at kartet ikke trenger klynging. Målt innen 3 km: Majorstuen 3,
  Oslo S 4, Forus 5, Alnabru 6, Mo i Rana 11.

## Sykehus og legevakt som mulig neste kategori

Nytteverdien er reell og risikoen lav, men næringskoden alene holder ikke. Anbefalingen er en
**allowlist av organisasjonsnumre** for helseforetak og legevakter — i størrelsesorden hundre
enheter — geokodet mot Kartverket og verifisert manuelt én gang. Dette er den svakeste av de to
anbefalingene; skal noe droppes, droppes denne.

## Runde 2: skoler og barnehager (bygget 2026-09-24)

Helsekategoriene ble undersøkt på nytt og forkastet: RESH ligger bak helsenettet, legevakt
finnes bare som årlig XLSX uten lisens, og SSR er et navneregister med svært ujevn dekning —
innen 5 km av sentrum, kun aktive navn: Oslo 11 sykehus og 5 helseinstitusjoner, Bergen 1 og 0,
Trondheim 3 og 30, Stavanger 1 og 2, Tromsø 2 og 0. Bergen mangler Haraldsplass helt. Det er
registreringspraksis som varierer, ikke virkeligheten.

Utdanningsdirektoratet har derimot ekte virksomhetsregistre:

| Kilde | Tilgang | Innhold |
|---|---|---|
| Grunnskoler og videregående, Geonorge-WFS | Åpne data, CC BY 4.0 / NLOD | navn, org.nr, koordinat, besøksadresse, trinn, elevtall, ansatte, eierforhold, i drift |
| Barnehager, Geonorge-WFS | Åpne data, NLOD, månedlig | navn, org.nr, koordinat, barnehagetype, aldersgruppe, antall barn, eierforhold, i drift |
| NSR (data-nsr.udir.no) | Åpent JSON-API | flagget `ErSpesialskole`, som WFS-en mangler |

Begge WFS-ene leverer bare GML, ikke GeoJSON. Elementene er nøstet — `adressenavn` finnes både
under besøksadresse og postadresse — så vi parser XML i stedet for å lete med regulære uttrykk.

**Hva vi utelater, og hvorfor.** 275 familiebarnehager og 80 åpne barnehager, pluss 26 uten
oppgitt type. En familiebarnehage drives i et privat hjem, så koordinaten peker på noens bolig.
Mangler typen, tar vi den ikke med — allowlist, ikke denylist. I tillegg utelates spesialskoler,
fordi en skole ved en institusjon kan røpe institusjonen; flagget finnes bare i NSR, så vi slår
opp der og kobler på organisasjonsnummer.

Resultat etter synk: **3 103 skoler og 4 493 barnehager**, av 3 725 og 4 874 hentede.

Datasettene har ingen personopplysninger. Elevtall, barnetall og ansatte er aggregater.

## Prinsippet bak «Nærområdet»

Seksjonen er nøytral i både navn og ordlyd. «Anlegg med utslippstillatelse · 240 m unna», ikke
«forurensende anlegg» eller «risiko i nabolaget». Kilden er et register over tillatelser, ikke en
vurdering av om anlegget er et problem, og teksten skal ikke si mer enn kilden gjør.

Teknisk er seksjonen en visningsgruppe over én eller flere lagringskategorier
(`AREA_SECTIONS` i `types/area-feature.ts`). En ny type legges til ved å føre kategorien inn i
seksjonens `categories` — ikke ved å endre UI-et.

## Runde 3: datasentre, sykehus, sykehjem, fabrikker og skjenkesteder (2026-09-24)

Seks kategorier ble undersøkt. To ble bygget, fire ble lagt bort med begrunnelse. Alle tall
under er ekte kall gjort denne dagen.

| Kategori | Kilde som faktisk virker | Maskinlesbar | Koordinat | Dekning | Vurdering |
|---|---|---|---|---|---|
| Skjenkesteder | Næringsetatens kart, WFS med GeoJSON | Ja, hele Oslo på 0,4 s | Ja, på adressepunktet | Oslo | **Bygget** |
| Sykehus | Helsenorge-API ∧ Enhetsregisteret 86.101 | Ja, begge åpne | Geokodet hos Kartverket | Nasjonal | **Bygget** |
| Sykehjem | oslo.kommune.no, 46 oppføringer i HTML | Nei | Nei | Oslo | Utsatt |
| Fabrikker | Ingen ut over dagens utslippsregister | – | – | – | Ikke bygget |
| Datasentre | Operatørenes egne sider | Nei | Delvis | Vilkårlig | Ikke bygget |
| Åpningstider | Finnes ikke offentlig strukturert | – | – | – | Ikke bygget |

### Skjenkesteder (bygget)

Næringsetaten publiserer alle steder med skjenkebevilling i Oslo i et kart laget av
Plan- og bygningsetaten. Bak kartet ligger en WFS som svarer med GeoJSON:

```
https://od2.pbe.oslo.kommune.no/cgi-bin/wms?map=AAPNING&service=wfs&version=1.1.0
  &request=GetFeature&typename=skjenkebevilling_punkt&outputformat=geojson&bbox=…
```

Hele Oslo: **1 406 steder**, 541 KB, 0,4 s. Feltene er `OBJEKTNAVN`, `OBJEKTADRESSE`,
postnummer/-sted, `EIERNAVN`, `ORGNR`, `INNE_TID`, `UTE_TID` og `KOPIDATO`. Kopidatoen var
dagens dato, så kilden oppdateres daglig.

**Tidene.** Kilden kaller selv feltene «tillatte åpningstider», og kartet skriver: «Faktiske
åpningstider på stedene kan variere fra de tillatte tidene.» Dette er altså *tillatt stengetid*
inne og ute — verken skjenketid (som etter alkoholloven slutter før stengetid) eller stedets
faktiske åpningstid. Vi gjengir tallet med kildens egen betegnelse og regner aldri om mellom de
tre. 1 380 steder har innetid, 1 036 har utetid.

**Bevillingshaver lagres ikke.** `EIERNAVN` er som regel et selskap, men 73 av 1 406 mangler
selskapssuffiks, og blant dem står navn som «Loan Rishovd» — enkeltpersonsforetak, altså
privatpersoner. Vi lagrer verken navnet eller organisasjonsnummeret bak stedet.

**Koordinatene** kommer i EPSG:25832, og tjenesten overser `srsName`. Omregningen ligger i
`lib/geo/utm.ts`. Kontroll mot Kartverkets adressepunkt for samme adresse: 49 av 49 punkter
innenfor 41 m, median 0 m — Næringsetaten legger punktet nøyaktig på adressen.

**Tetthet** (målt i datasettet): Karl Johan 201 innen 500 m, 539 innen 1 km, 1 150 innen 3 km.
Grünerløkka 98/252/1 206. Røa 3/4/16. Holmlia 1/7/17. Derfor tre grep: egen databasespørring
for kategorien så den ikke spiser radgrensen fra de andre, `features_count_near` for å få riktig
antall i teksten selv når listen er kuttet, og tak på 30 markører i kartet med en merknad om det.

**Lisens er ikke avklart.** Tjenesten oppgir ingen lisens, og datasettet står ikke i Felles
datakatalog. Oslo kommune bruker NLOD på sine åpne datasett ellers. Vi navngir Næringsetaten,
lenker til kartet, og skriver «lisens ikke oppgitt» i kildelisten fremfor å anta. Bør bekreftes
skriftlig med Næringsetaten.

### Sykehus (bygget)

Ingen enkeltkilde svarer på «hva er et sykehus»: RESH ligger fortsatt bak helsenettet,
Enhetsregisteret sier bare hva enheten er registrert som, og Helsenorges oversikt over
behandlingssteder blander sykehus, distriktspsykiatri, rusbehandling og private klinikker.

Et sted tas derfor bare med når to uavhengige offentlige kilder er enige:

1. Helsenorge fører det som behandlingssted med offentlig tilbud innen **fysisk helse**
   (`tjenester.helsenorge.no/proxy/velgbehandlingssted/api/v1/Behandlingssteder`, åpent JSON,
   596 steder, 172 innen fysisk helse).
2. Enhetsregisteret har næringskode **86.101 somatiske sykehustjenester** på enheten.

Regelen skiller godt: av de 172 er 87 kodet 86.101, mens 63 er 86.910 (laboratorier og
bildediagnostikk), 13 er 86.221, 5 er 86.210 og 1 er 86.102 (voksenpsykiatri). Etter
dedupe på adresse — Helsenorge har egne rader for f.eks. rehabiliteringsavdelinger i samme bygg —
står **80 sykehus** igjen, 67 offentlige og 13 private. Koordinat hentes fra Kartverkets
adresse-API på besøksadressen.

Resultatet ligger i `data/sykehus.json` med `verifisert`-dato per sted, bygget av
`scripts/build-sykehus.ts`. Uten `--skriv` viser skriptet bare forskjellen mot dagens fil, slik
at endringer leses før de committes. Et sted som legges ned settes til `nedlagt` og blir
stående som historikk uten å vises.

Psykiatriske og rusrelaterte behandlingssteder er bevisst holdt utenfor, jf. regelen om at vi
ikke masseplasserer skjermede eller sårbare institusjoner i kartet.

### Sykehjem (utsatt, ikke forkastet)

Det finnes ingen nasjonal åpen kilde med adresser. Oslo kommune har en egen oversikt med
**46 oppføringer** med navn, telefon og adresse
(`oslo.kommune.no/helse-og-omsorg/omsorgsbolig-og-sykehjem/sykehjem/alle-sykehjem-og-helsehus/`),
men den er HTML uten API, og den blander langtidshjem, helsehus, dagsentre, «Inn på tunet» og
forsterket rehabilitering. Å skille sykehjem fra dagsenter krever kuratering per oppføring.

Dette er den nærmeste kandidaten til neste runde: kilden er kommunens egen, stedene er ordinært
offentlig kjente, og volumet er håndterbart. Men da må typene skilles, og dekningen vil være
Oslo alene — samme forbehold som for skjenkestedene.

### Fabrikker og produksjonsanlegg (ikke bygget)

Vi har allerede 866 anlegg med utslippstillatelse fra Miljødirektoratet, og det er fortsatt den
eneste kilden som forteller hva som faktisk finnes på et sted. Enhetsregisteret gir
næringskode på en adresse, ikke bevis for at det produseres noe der — samme svakhet som ble
dokumentert for helsekategoriene i runde 1, der holdingselskaper og kontorer lå blant
«somatiske sykehus». Uten en uavhengig kilde som bekrefter at adressen er et produksjonssted,
ville laget blitt en blanding av fabrikker og hovedkontorer. Det er verre enn ingenting.

### Datasentre (ikke bygget)

Nkoms register gir operatørnavn uten adresser, og etaten sier selv at lokasjoner kan være
sensitive (runde 1). Operatørene publiserer ujevnt: Green Mountain oppgir bare region for sine
fem norske anlegg («Stavanger · Mountain hall», «Telemark · Hydropower valley»), mens Lefdal
Mine oppgir full adresse, «Gate 1 nr 101, 6700 Måløy». Presise koordinater for de øvrige finnes
bare hos kommersielle datasenterkataloger, som verken er operatøren, eieren eller en offentlig
myndighet.

Et lag der ett datasenter dukker opp i Måløy mens de større i Rjukan og Enebakk mangler, er
misvisende i seg selv. Kategorien tas inn den dagen operatørene eller kommunene publiserer
lokasjonene ordinært — vi rekonstruerer dem ikke.

### Åpningstider (ikke bygget)

Ingen offentlig strukturert kilde for ordinære åpningstider. Det eneste som finnes er de
tillatte tidene i bevillingsdataene, og de er allerede med, med kildens egen betegnelse.

### Hva som er automatisk og hva som er kurert

| | Skjenkesteder | Sykehus |
|---|---|---|
| Henting | WFS ved hver sync | Fil i repoet |
| Frekvens | Daglig | Ukentlig sync, manuell reverifisering |
| Endring oppdages av | Vanlig provider/sync-system, med guards | `build-sykehus.ts` viser diff |
| Nedlagt sted | Forsvinner fra kilden, merkes `removed_from_source_at` | Settes til `nedlagt` i fila |
| Sist verifisert | `KOPIDATO` fra kilden | `verifisert` per sted |

### Personvern og sikkerhet

Skjenkesteder er virksomheter med offentlig bevilling; bevillingshaver lagres ikke, fordi det
kan være en privatperson. Sykehus er offentlig kjente institusjoner. Ingen av datasettene
inneholder opplysninger om pasienter, gjester eller andre privatpersoner. Psykiatri, rus,
barnevern og skjermede botilbud er fortsatt holdt utenfor, og reglene fra runde 1 gjelder
uendret.

### Dekningsforbehold

Skjenkesteder finnes bare for Oslo. Utenfor Oslo vises gruppen ikke i det hele tatt — det
betyr «vi har ikke data», ikke «her finnes ingen serveringssteder». Det samme vil gjelde
sykehjem hvis den kategorien bygges på Oslo-kilden.

## Runde 4: omsorgstilbud (2026-09-24)

Én visningstype ut mot brukeren — «Omsorgstilbud» — for sykehjem, helsehus, behandlingssteder
og institusjonsbaserte botilbud. Den presise typen lagres internt for kvalitetssikring og
filtrering, og vises ikke.

### Verifikasjonsregelen

Et sted tas bare inn når **den ansvarlige aktøren selv publiserer både navnet og den konkrete
adressen**. Ikke tredjepartskataloger, ikke karttjenester, ikke næringskode alene. At et sted
finnes i Google Maps er et signal om at lokasjonen er kjent, men aldri en kilde: hvert sted her
er hentet fra myndighetens egen publisering.

### Kilder som virker

| Kilde | Ansvarlig | Innhold | Tilgang | Koordinat |
|---|---|---|---|---|
| Oslo kommunes stedsindeks, «Sykehjem, helsehus og dagsentre» | Oslo kommune | 46 steder med navn, adresse, koordinat | Kommunens egen søkeindeks (Algolia), offentlig lesenøkkel i deres eget nettsted | Kommunens egen |
| Samme indeks, «Barnevernsinstitusjoner og -tiltak» | Oslo kommune | 23 oppføringer, 13 med publisert adresse | Samme | Kommunens egen |
| Helsenorge, behandlingssteder med offentlig tilbud | Helsedirektoratet | 346 innen psykisk helse eller rus, 340 med besøksadresse | Åpent JSON-API | Kartverkets adressepunkt |

Kommunens indeks gir per sted: navn, `card_data.address`, `map_data.coordinates`, og
`meta.parent_name` som sier hvilken liste stedet hører til. Det er dermed kommunens egen
strukturerte publisering, ikke skraping av HTML.

**Koordinatene er kontrollert.** For de 57 Oslo-stedene ble kommunens koordinat sammenlignet
med Kartverkets adressepunkt for samme adresse: median 0 m, p90 51 m. Eneste store avvik er
«Hauger gård – Inn på tunet», som ligger utenfor Oslo og der adressesøket treffer en annen gate.

### Resultat: 367 omsorgstilbud

| internalType | Antall | Kilde |
|---|---|---|
| psykisk_helse | 197 | Helsenorge |
| rusbehandling | 111 | Helsenorge |
| sykehjem | 40 | Oslo kommune |
| barnevern | 10 | Oslo kommune |
| helsehus | 4 | Oslo kommune |
| akuttinstitusjon | 3 | Oslo kommune |
| dagsenter | 2 | Oslo kommune |

Sykehjem, helsehus, dagsentre og barnevern dekker Oslo. Psykisk helse og rus er nasjonalt.

### Villa Krogh — verifisert, tatt inn

Villa Krogh akuttinstitusjon for barn er en akutt- og korttidsinstitusjon for barn i alderen
2–12 år, drevet av Oslo kommune ved Barne- og familieetaten. Oslo kommune publiserer selv
stedet med navn, adresse **Øvre Langåsvei 11, 0880 Oslo**, telefonnummer, koordinat
(59.96449, 10.75537) og en egen side under «Barnevernsinstitusjoner og -tiltak».

Det oppfyller regelen: ansvarlig aktør, eksplisitt publisert adresse, egen side å lenke til.
Stedet vises som «Omsorgstilbud».

### Korsvoll — samme sted, annet navn

«Korsvoll akuttinstitusjon for barn» finnes som navn i karttjenester, men ikke i Oslo kommunes
egen oversikt. Koordinaten kommunen publiserer for Villa Krogh ligger på Korsvoll, og adressen
er den samme. Konklusjonen er at det er samme sted under et annet navn, og vi bruker navnet den
ansvarlige aktøren selv bruker. Ingen egen oppføring er lagt inn for «Korsvoll».

### Hva som ble forkastet

48 oppføringer, alle med begrunnelse i `scripts/build-omsorg.ts --forkastet`:

* **7 ideelle barnevernsinstitusjoner** der kommunens strukturerte oppføring mangler adresse
  (Othilie, Soldammen, Sortatunet, Lertrøa, Vulubekken, Hiimsmoenkollektivet, Visterflo).
  Tre av dem har adresse i HTML-listen, men ikke i den strukturerte kilden. Regelen er at tvil
  betyr nei.
* **3 oppføringer som ikke er steder med tilbud på adressen**: Beredskapshjemavdelingen og
  Tangen omsorgshjem og spesialiserte fosterhjem — fosterhjem er private hjem — og
  Arenafleksibelt team Borger With, som er et team.
* **Adresser som peker på et administrasjonsbygg** i stedet for institusjonen selv.
* **Adresser uten husnummer** («Rutlin», «Vegsund», «Sykehuset Innlandet»): en posisjon vi
  måtte gjettet oss fram til er ikke presis nok.
* Behandlingssteder der Helsenorge ikke oppgir besøksadresse.

### Slik filtreres skjermede og private adresser

Filteret er en allowlist, ikke en denylist: et sted må ha publisert adresse med husnummer fra
en navngitt ansvarlig aktør for å komme inn. Publiserer ikke aktøren adressen, finnes stedet
ikke i datasettet — det er slik de skjermede adressene holdes ute, uten at vi trenger å vite
hvilke de er. I tillegg kan et sted settes til `skjult` i fila hvis adressen ikke lenger skal
være offentlig; da blir raden stående som historikk, men synkes ikke.

### Personvern

Datasettet inneholder navn på virksomheten, adresse, koordinat, driftsansvarlig og kilde.
Ingen opplysninger om beboere, pasienter, barn eller brukere. Ingen telefonnumre eller
kontaktpersoner. Vi kartlegger stedet, ikke menneskene som bruker det.

### En begrensning ved den nøytrale etiketten

Etiketten er «Omsorgstilbud» overalt, og den interne typen vises aldri. Men navnet kommer fra
den ansvarlige aktøren, og enkelte navn sier selv hva slags tilbud det er — «Villa Krogh
akuttinstitusjon for barn», «Bakkehaugen ungdomshjem». Den nøytrale etiketten skjuler altså
ikke typen når navnet gjør det. Alternativet er å vise adresse uten navn, men da blir stedet
vanskeligere å kjenne igjen og etterprøve. Vi viser navnet aktøren selv publiserer, og lar
valget stå åpent.

### Vedlikehold

`scripts/build-omsorg.ts` bygger `data/omsorgstilbud.json` på nytt fra kildene og viser
forskjellen før noe skrives. Hvert sted bærer `kilde`, `kildeUrl`, `kildeType`, `verifisert`,
`koordinatKilde` og `status`. Et sted kan settes til `nedlagt` eller `skjult` i fila; slike
rader beholdes ved neste kjøring og kommer ikke tilbake automatisk.
