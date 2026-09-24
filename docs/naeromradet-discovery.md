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
