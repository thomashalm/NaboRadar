# Hytter og koier: nasjonal import

> Importert 2026-10-02. Kategorien er upublisert: bare innlogget admin ser hyttene.
> Backup av hyttedataene før importen ligger lokalt i `.data/backups/` (ikke i git).

## Resultat

| | Før | Etter |
|---|---|---|
| Kildeposter N50 | 55 | 1 482 |
| Kildeposter Turrutebasen | 47 | 1 262 |
| Hytter | 58 | 1 675 |
| Klare til å vises | 54 | 1 481 |
| Avvist | 4 | 4 |
| Skjult til kontroll (bare sekundærkilde) | 0 | 190 |
| Database | 133 MB | 136 MB |

Anslaget før importen var rundt 1 680 hytter og 1 480 synlige. Av de 1 481 står 553 bare i
N50 og 927 i begge kilder; én (Heidehaugen) er en godkjent hytte fra sekundærkilden.

N50 har 1 880 hytteobjekter. 398 tas ikke inn: 243 gapahuker, 112 serveringshytter og 43 uten
navn (nesten alle rastebuer). Alt manuelt arbeid fra piloten — 52 forvaltere, 53 hytter med
lenke, 9 overstyringer, 4 avvisninger — sto urørt etter importen.

**En feil ble funnet og rettet før importen.** Øst-koordinaten i UTM 33 er negativ på hele
Vestlandet, og leseren tok ikke med fortegnet. 96 hytter i Rogaland og Vestland ville blitt
avvist. Feilen ble oppdaget i en øving mot lokal database.

## Dekning per fylke

Hytter som er klare til å vises. «Bare sekundær» er skjult; «i kø» er saker til kontroll.

| Fylke | Hytter | Betjent | Selvbetj. | Ubetjent | Rastebu | DNT | Statskog | Fjellstyre | Andre | Låst | Bare sekundær | I kø |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Innlandet | 348 | 30 | 32 | 181 | 105 | 87 | 66 | 106 | 89 | 110 | 34 | 50 |
| Trøndelag | 211 | 10 | 28 | 128 | 45 | 37 | 52 | 87 | 35 | 124 | 40 | 51 |
| Vestland | 180 | 23 | 44 | 48 | 65 | 90 | 1 | 9 | 80 | 19 | 11 | 19 |
| Nordland | 133 | 2 | 0 | 83 | 48 | 69 | 39 | 0 | 25 | 23 | 15 | 23 |
| Møre og Romsdal | 98 | 9 | 29 | 39 | 21 | 49 | 1 | 15 | 33 | 11 | 8 | 16 |
| Buskerud | 82 | 15 | 2 | 47 | 18 | 43 | 15 | 8 | 16 | 11 | 3 | 3 |
| Agder | 80 | 3 | 22 | 36 | 19 | 40 | 15 | 4 | 21 | 22 | 10 | 14 |
| Troms | 79 | 0 | 1 | 53 | 25 | 29 | 28 | 0 | 22 | 22 | 28 | 46 |
| Rogaland | 74 | 3 | 14 | 27 | 30 | 35 | 2 | 4 | 33 | 6 | 8 | 14 |
| Akershus | 54 | 2 | 0 | 48 | 4 | 25 | 1 | 0 | 28 | 22 | 0 | 2 |
| Telemark | 43 | 7 | 9 | 21 | 6 | 32 | 4 | 0 | 7 | 3 | 10 | 14 |
| Finnmark | 42 | 3 | 2 | 10 | 27 | 8 | 0 | 0 | 34 | 2 | 11 | 15 |
| Østfold | 24 | 0 | 0 | 20 | 4 | 10 | 1 | 0 | 13 | 15 | 5 | 8 |
| Vestfold | 24 | 0 | 0 | 20 | 4 | 12 | 0 | 0 | 12 | 13 | 0 | 0 |
| Oslo | 9 | 2 | 1 | 6 | 0 | 6 | 0 | 0 | 3 | 2 | 0 | 0 |
| Utenfor Norge | 0 | | | | | | | | | | 8 | 8 |
| **Sum** | 1 481 | 109 | 184 | 767 | 421 | 572 | 225 | 233 | 451 | 405 | 191 | 283 |

(Tabellen er tatt før en liten navneregel fjernet én skjult hytte; summen i kø er nå 282.)

**Mulige hull i dekningen.** Tallene er det kildene har, ikke fasit på hvor det finnes hytter.

- Troms har 79 synlige og 28 bare i sekundærkilden — høyest andel i landet. N50 mangler
  trolig flere hytter der.
- Nordland har ingen selvbetjente og bare to betjente; Troms har ingen betjente. Det kan være
  riktig, men bør kontrolleres mot turlagene.
- Rundt Trondheim finnes ingen hytter innen 30 km. Markastuene i Bymarka (Skistua, Grønlia)
  er serveringshytter i N50 og tas ikke inn.
- Finnmark har 42, hvorav 27 rastebuer. Fjellstuene der står ofte uten treff i
  stedsnavnregisteret.

## Kvalitetssikring mot Kartverket

**Alle 1 482 N50-hyttene** er sammenlignet med et uavhengig uttrekk av de samme N50-filene
(navn, kommune, koordinat, type, eierkategori, tilgang): ingen avvik.

**Et utvalg på 112 hytter**, 8–10 per fylkesgruppe og spredt på eier, type og tilgang, er
kontrollert mot Kartverkets åpne tjenester:

| Kontroll | Resultat |
|---|---|
| Kommunen i punktet er den hytta står med | 112 av 112 |
| Stedsnavn innen 300 m med samme navn | 68 |
| … med navn som delvis stemmer | 19 |
| … uten navnetreff | 25 (15 har andre navn i nærheten, 10 ingen) |
| Navneobjekttype ved treff | 65 «Turisthytte», resten fritidsbolig, seter, bruk o.l. |
| Terreng i punktet | 56 åpent område, 45 skog; ett punkt i innsjø |
| Høyde | 2–1 486 moh., ingen under havnivå |

De 25 uten navnetreff er mest rastebuer og fjellstuer i Finnmark som ikke står i
stedsnavnregisteret. Det er ikke funnet noen hytte med feil kommune, og ingen koordinater
utenfor Norge blant hyttene som vises.

## Kontrollkøen: 282 saker

| Grunn | Antall |
|---|---|
| Finnes bare i sekundærkilden | 190 |
| Mulig dublett | 73 |
| Kildene er uenige om type | 45 |

(En sak kan ha to grunner.)

**Bare i sekundærkilden (190, skjult).** 140 ubetjente, 35 betjente, 16 selvbetjente. 87 har
ingen forvalter. Tre mønstre:

- 13 er dubletter *i Turrutebasen selv*: samme navn på samme punkt som en hytte som allerede
  har en Turrutebasen-post (Innerdalshytta, Trollvassbu, Nonsbu og flere i Troms). Regelen om
  at én kilde bare kan ha én post per hytte, gjør dem til egne, skjulte hytter. En trygg
  regel — samme kilde, samme navn, innen 50 m = samme hytte — ville tatt disse.
- 8 ligger i Sverige (Padjelanta: Svenska Turistföreningen, Badjelánnda Laponia Turism).
  Turrutebasen fører dem fordi rutene krysser grensen. De bør avvises.
- Resten er hytter N50 ikke har, hoteller og fjellstuer ført som «betjent», og private tilbud
  («Privat overnattingstilbud kalt Storeng fjellgård»).

**Mulig dublett (73).** Par innen 100 m: 13 er to N50-objekter (tun med flere hytter: Holden
fjellgård, Holmvassbu og Gamle Holmvassbu, Årestuer ved Tverråga), 17 er en N50-hytte og en
skjult sekundærpost, ett par er to sekundærposter. Ingen to synlige hytter har samme navn på
samme punkt.

**Uenighet om type (45).** 35 av dem er ett mønster: N50 sier rastebu, Turrutebasen sier
ubetjent hytte. Det er samme spørsmål som Bristol i piloten.

| N50 | Turrutebasen | Antall |
|---|---|---|
| ubetjent | ubetjent | 452 |
| selvbetjent | selvbetjent | 167 |
| betjent | betjent | 94 |
| rastebu | (uten type) | 133 |
| **rastebu** | **ubetjent** | **35** |
| ubetjent | (uten type) | 34 |
| ubetjent / selvbetjent | motsatt | 6 |
| andre kombinasjoner | | 6 |

Turrutebasen har ingen opplysning om tilgang, så det finnes ingen målbar konflikt på tilgang
mellom kildene. Piloten viste at feilene der bare kommer fram mot forvalterens egen side.

## Eier, forvalter og lenker

| Eierkategori | Hytter | Med navngitt forvalter | Med lenke | Låste | Låste med forvalter |
|---|---|---|---|---|---|
| DNT | 572 | 115 | 35 | 22 | 3 |
| Andre | 451 | 79 | 18 | 138 | 25 |
| Fjellstyre | 233 | 8 | 0 | 153 | 6 |
| Statskog | 225 | 2 | 0 | 92 | 2 |
| **Sum** | 1 481 | 204 | 53 | 405 | 36 |

1 277 hytter mangler navngitt forvalter og 1 428 mangler lenke. Utenfor piloten kommer
forvalternavnene fra Turrutebasen: 82 ulike navn, de fleste DNT-foreninger («Narvik og Omegn
Turistforening» 14, «Sulitjelma og Omegn Turistforening» 6, «DNT Drammen og Omegn» 6). Noen er
ikke forvaltere («Romsdal.com», 24).

**Tilgang:** 405 låste, 1 075 ulåste, 1 ukjent. Av de låste har 12 bestillingsside, 5 infoside
og 36 navngitt forvalter; 369 står uten neste steg og viser teksten om at vi ikke har funnet
en verifisert kontakt.

**Hvor berikelse gir mest:** DNT (572 hytter, få foreninger, én bestillingsløsning), så
Statskog (225, én aktør), så de største fjellstyrene (233, men 153 av dem låste).

## Rastebuer: 421

212 har eierkategori «Andre», 129 Statskog, 48 DNT, 32 fjellstyre. 169 er koblet til en post
i Turrutebasen; 35 av dem er der ført som ubetjent overnattingshytte. 242 har navn som slutter
på -bu, -koie eller -hytte. Bare 3 ligger innen 300 m av en overnattingshytte. Ytterligere 43
rastebuer i N50 mangler navn og er ikke tatt inn.

Ingen er gjort om til «åpen koie». De 35 der Turrutebasen sier ubetjent, er de første å
kontrollere.

## Serveringshytter og gapahuker (ikke importert)

112 serveringshytter står utenfor. 12 av dem er ført som overnattingshytte i Turrutebasen og
kan være feilaktig utelatt: Storlihytta, Langdalsbu, Furukollen Turhytte / Lionshytta,
Sinober, Sørsetra, Torsætra, Sagvollstallen, Skistua, Grønlia, Julvollhytta, Pienehytta og
Trollhytta. 243 gapahuker står utenfor; 4 har en overnattingshytte fra Turrutebasen innen 300 m.

## Ytelse og kostnad

| Måling | Resultat |
|---|---|
| Synk N50 (357 kommunearkiv) | 33–35 s |
| Synk Turrutebasen | 10–12 s |
| Alle hytter i landet i ett kall (`huts_in_bbox`) | 1 481 rader, 0,8 MB JSON, 24 ms i basen, 72 ms med nettverk |
| Et fylkesutsnitt, et søk, én hytte | 38–43 ms |
| Høyde-oppslag hos Kartverket | median 174 ms, p95 332 ms, 0 feil av 112 |
| Databasevekst | 3,6 MB (hytter 2,7 MB, koblinger 0,5 MB, kildeposter 1,7 MB data) |

Høyden hentes fortsatt når hyttesiden vises og caches et døgn; det er ikke grunn til å lagre
den. Kartet klynger på lave zoomnivåer og trenger ingen flislegging. Supabase Free (500 MB)
holder med god margin.

**Uendrede rader skrives på nytt.** En synk uten endringer oppdaterer `synced_at` på alle
2 744 kildeposter. For hytter er det ubetydelig. Svakheten er den samme som i
arkitekturgjennomgangen, og må fortsatt løses før et datasett på over 100 000 rader.

## Det som bør gjøres før publisering

1. Avvis de 8 hyttene i Sverige, og slå sammen de 13 dublettene fra Turrutebasen.
2. Bestem hva de 35 «rastebu i N50, ubetjent i Turrutebasen» skal vises som.
3. Berik DNT-hyttene med forvalter og bestillingslenke, forening for forening.
4. Vurder de 12 serveringshyttene som trolig har overnatting.
