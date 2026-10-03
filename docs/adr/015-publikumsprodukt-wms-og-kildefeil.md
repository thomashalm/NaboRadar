# ADR 015: Vi spør etter det etaten viser publikum — og en kilde som feiler, er ikke et «ingen treff»

**Status:** Aktiv · 2026-10-03. Generaliserer [ADR 008](008-publish-what-the-agency-publishes.md).

> **2026-10-03, senere samme dag:** matrikkel-WFS-ene (`wfs.matrikkelen-eiendomskart-teig`,
> `-bygningspunkt`) sto nede på samme bakmaskin. Det klikkbare eiendomskartet er flyttet til
> Kartverkets Eiendom-API og matrikkelkartets WMS etter samme regel. Detaljer i
> [håndbok §15](../naboradar-handbook.md#15-eiendomsfunksjonen) og
> [research/eiendomskort.md](../research/eiendomskort.md). Ingen ny ADR: prinsippet er det samme.

## Bakgrunn
2026-10-03 viste `/omrade` «Disse kildene svarte ikke akkurat nå: Stormflo og havnivå, Flystøysoner» på
alle adresser. Begge WFS-tjenestene hos Geonorge (`wfs.stormflo_havniva`, `wfs.stoylufthavn`) svarte
500, fordi Geonorges WFS-front ikke nådde to interne maskiner. Ingen av dem var avviklet.

Kildegjennomgangen ([research/stormflo-flystoy-kildegjennomgang.md](../research/stormflo-flystoy-kildegjennomgang.md))
viste mer enn nedetid:

- **Stormflo:** Kartverkets publikumskart «Se havnivå i kart» bruker WMS-en
  `wms.stormflo_havniva`, ikke WFS-en. WFS-en står som «Under arbeid» i katalogen.
- **Flystøy:** Avinors publikumskart bruker en egen ArcGIS-tjeneste. Geonorge-WMS-en for samme
  datasett ga samme sone i 200 av 200 kontrollpunkter.
- **To semantiske feil:**
  - Stormfloflatene dekker sjøen. Et punkt i vannet fikk «20-årsnivå».
  - Flystøykortet viste ICAO-koden som lufthavn, og «beregnet <år>» der feltet er beregningsåret
    (trafikkgrunnlaget, ofte et prognoseår).
- **Følgefeil:** så lenge én kilde feilet, ble ingen oppslag cachet. Hvert besøk tok ~7 s.

Radon (ADR 008) var første gang vi lærte at det nyeste tekniske endepunktet ikke er det etaten viser
publikum. Dette er andre gang.

## Alternativer vurdert
- **Vente på at WFS-ene kommer tilbake** — avvist. De er ikke det publikumskartene bruker, og
  semantikkfeilene ville stått.
- **Avinors ArcGIS-tjeneste for flystøy** — avvist som kilde. Den har ingen oppgitt lisens og
  «test» i beskrivelsen. Den beholdes som kontrollreferanse.
- **Skjule en kilde automatisk når den har feilet lenge** — avvist. Brukeren skal se at noe mangler,
  ikke få en side som ser fullstendig ut.
- **Anonym skrivefunksjon for kildefeil fra webappen** — avvist. Den publiserbare nøkkelen er offentlig,
  og hvem som helst kunne fått en kilde til å se nede ut (ADR 009).

## Beslutning
- **Regel:** for et offentlig svar spør vi etter det etatens publikumskart faktisk viser. Vi finner det
  ved å åpne kartet og se hvilke tjenester det kaller (samme metode som ADR 008). Et teknisk
  endepunkt (WFS, API) brukes bare når det gir samme svar, og det er dokumentert.
- **Stormflo:** WMS `GetFeatureInfo` mot `wms.stormflo_havniva`, med lagene Kartverkets kart bruker
  (`stormflo20ar_klimaarna`, `stormflo200ar_klimaarna`, `stormflo200ar_klimaar2100`) og
  `stormfloovreestimat_klimaar2150` som port. Det er ett kall for alle lagene, i detaljmålestokk.
  Et punkt innenfor `middelhoyvann_klimaarna` (sjø) får ingen stormflovurdering. Det kommer ingen nye
  scenarioer og ingen ny visning.
- **Flystøy:** WMS `GetFeatureInfo` mot `wms.stoylufthavn` i EPSG:4326 (lat,lon).
  - Lufthavnens navn kommer fra `lib/facts/lufthavner.ts`, hentet fra Avinors eget kart. Uten navn
    vises ingen lufthavn, aldri koden.
  - Året vises som «beregningsår», SOSI-spesifikasjonens eget ord, og bare når det finnes.
- **Kildefeil er ikke fravær:**
  - Bare et gyldig svar kan bety «ingen treff».
  - WMS-unntak, HTML-feilsider, HTTP-feil og tidsavbrudd er kildefeil og vises som «svarte ikke
    akkurat nå» (`lib/facts/lookups/wms.ts`).
- **Delvis cache:**
  - Hvert direkte oppslag caches for seg (`lib/facts/lookup-runner.ts`).
  - En kilde som feilet, får 30 s pause per serverinstans og rapporteres som «svarte ikke» uten å
    holde siden igjen.
- **Driftsobservasjon:**
  - Sync-jobben sjekker hver kilde hvert 15. minutt (`npm run lookups:check`) og lagrer utfallet i
    `lookup_source_status`, med skriving bare for service role.
  - `/admin` viser siste OK, siste feil og hvor lenge kilden har feilet.
- **Forsvarsbygg** («Støysoner for Forsvarets flyplasser», Ørland m.fl.) er et kjent dekningshull og
  tas i en egen runde. Der er beregningsåret et prognoseår (Ørland 2031).

## Begrunnelse
Brukeren skal kunne slå opp svaret vårt i etatens eget kart og finne det samme. Det er tilliten
NaboRadar bygger på. Etatene viser publikum den tjenesten de holder i drift og forbedrer, og det er
den vi bør følge, ikke en tjeneste merket «Under arbeid».

## Konsekvenser
- Stormflo stemte med Kartverkets kartbilde på 40 av 41 kontrollpunkter. Avviket er en piksel på
  kystlinjen.
- Flystøy stemte med Avinors kart på 84 av 84 punkter gjennom den nye koden: 24 kontrollpunkter og 60
  tilfeldige punkter rundt seks lufthavner. I researchen stemte i tillegg 176 grensepunkter.
- Et WMS-lag som får nytt navn, gir et unntak, og dermed «svarte ikke», ikke et stille «ingen treff».
- Med to kilder nede tok `/omrade` 7,0–7,1 s per besøk. Etter endringen tar et varmt besøk 0,1–0,4 s
  med null eksterne kall.

## Kjente ulemper
- WMS-svar er MapServer-GML og ikke en stabil API-kontrakt. Feltnavn og blokknavn kan endres.
  Nettverkstestene (`RUN_NETWORK_TESTS=1`) fanger det.
- Stormflo er et aktsomhetskart i 1:80 000, så det er upresist ved kai og strandkant.
- Pausen per serverinstans betyr at en kortvarig feil kan gi «svarte ikke» i opptil 30 s.
- Avinors data har 18 av 124 soneflater uten beregningsår, og ENRY (Rygge) uten navn i Avinors kart.

## Revurderes når
- Kartverket eller Avinor bytter tjeneste i sine publikumskart.
- Forsvarsbyggs soner tas inn (egen runde).
- WFS-ene blir den formelt anbefalte distribusjonen igjen og gir samme svar som publikumskartene.

## Tillegg 2026-10-04: synkede datasett følger samme prinsipp

Beslutningen over gjelder direkte oppslag. For datasett vi synker gjelder det tilsvarende: der
utgiveren legger ut en ferdig landsdekkende fil, er den sync-kilden — ikke en WFS over de samme
dataene. Første tilfelle er offentlige tilfluktsrom, flyttet fra Geonorge-WFS til DSBs
nedlastingsfil etter at WFS-en hadde svart HTTP 500 i over en uke. Fila valideres før skriving,
og det er ingen reserve mot WFS-en. Se
[research/tilfluktsrom-naermeste-rom.md](../research/tilfluktsrom-naermeste-rom.md).

## Relatert
[ADR 008](008-publish-what-the-agency-publishes.md) · [ADR 009](009-public-admin-security-model.md) ·
[research/stormflo-flystoy-kildegjennomgang.md](../research/stormflo-flystoy-kildegjennomgang.md) ·
[håndbok §21](../naboradar-handbook.md#21-progressiv-lasting-og-feiltoleranse)
