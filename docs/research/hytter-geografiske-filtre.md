# Hytter: geografiske filtre («Ved sjøen», «Ved vann», «På fjellet»)

> **Research only. Ikke bygget.** Undersøkt 2026-10-03, nedtegnet samme dag fra rapporten.
>
> - Ingen databaseendringer, ingen UI og ingen endring i produksjonsdata ble gjort. De nedlastede
>   kartfilene ble slettet etter analysen.
> - **Produktbeslutning 2026-10-03:** «Ved sjøen» og «Ved vann» droppes. Stedssøk på `/hytter` ble
>   bygget i stedet. «På fjellet» ble ikke bygget, fordi regelen målte «over tregrensen», ikke det
>   folk mener med en fjellhytte.
>
> Dokumentet finnes for at researchen ikke skal måtte gjøres på nytt, og for at de negative funnene
> ikke skal gå tapt.

## Problemstilling
Kan `/hytter` få filtre for «Ved sjøen», «Ved vann» og «På fjellet», beregnet fra dokumenterte
geografiske data og ikke gjettet fra navn eller beskrivelse? Én høydegrense for hele Norge skulle
ikke brukes hvis den ga dårlige resultater.

## Kilder og lisens

| Behov | Kilde | Lisens |
|---|---|---|
| Hav og fjord | N50 Kartdata, arealdekke `Havflate` (fjordene er med) | CC BY 4.0 |
| Innsjøer | N50 arealdekke `Innsjø`, `InnsjøRegulert`, med flateareal | CC BY 4.0 |
| Skog og åpent terreng | N50 arealdekke `Skog` (inkludert bjørkeskog), `ÅpentOmråde`, `SnøIsbre`, `Myr` | CC BY 4.0 |
| Høyde over havet | Kartverkets høydemodell, `hoydedata/v1/punkt` | CC BY 4.0 |

Ingen ny leverandør og ingen ny lisens. Arealdekket ligger i de samme kommunearkivene som
hyttene hentes fra.

## Metode
- Arealdekket for 37 kommuner ble lastet ned og analysert lokalt (2,5 GB). Analysen tok 17 s etter
  nedlasting.
- Avstand fra hyttepunktet til nærmeste havflate og innsjø, skogandel innen 500 m, og terrenghøyde.
- Reglene ble kalibrert mot et testutvalg og deretter beregnet for alle 344 hytter i de 37
  kommunene. Estimatet for hele landet ble skalert mot terrenghøyden for alle 1 510 hytter.

## Reglene som ble testet
- **Ved sjøen:** innen 200 m fra havflate og høyst 60 moh. Høydegrensen holder ute hytter høyt over
  en fjord.
- **Ved vann:** innen 250 m fra en innsjø på minst 10 ha, eller innen 100 m fra en på minst 1 ha.
  Tjern under 1 ha og hav teller ikke.
- **På fjellet:** høyst 25 % skog på landarealet innen 500 m, og over et regionalt høydegulv:
  600 moh sør for 62° N, 450 til 65° N, 250 til 68° N, 150 nord for det. Skogandelen fungerer som
  tregrense; gulvet holder bare ute kystlynghei og lave holmer. 25 % og 35 % skog ga nesten likt
  resultat.

En hytte kunne ha flere merker samtidig; i utvalget hadde 17 % to.

## Testutvalg og funn
56 kjente hytter fra Hvaler til Magerøya: kyst, fjord, marka, skog, fjell, høyfjell og lave
fjellhytter i nord. 8 ble merket ved sjøen, 19 ved vann og 23 på fjellet.

**Ved sjøen — ingen kjente feil.**
- Traff: Fulehuk, Homlungen, Langøyene, Ytre Vassholmen, Bekkenstein, Tarhalsen, Nord-Kvaløy og
  Selfjordhytta (fjord).
- Traff ikke, riktig: Vannfjordhytta (1,3 km fra sjøen) og Kjerag nødbu (870 moh over Lysefjorden).

**Ved vann — stort sett riktig, med grensetilfeller.**
- Riktig: Rondvassbu, Finsehytta, Bjellåvasstua, Kikutstua, Sølenvika, Gjendesheim, Joatkajávri,
  Lyngbua, Rauhelleren og Skåpet.
- Preikestolen fjellstue (251 m fra Revsvatnet) falt så vidt utenfor.
- Haugen gård (320 m fra Femunden) falt utenfor.
- Memurubu og Gjendebu fikk ikke Gjende, fordi Gjende ligger i nabokommunens fil. Feilen finnes
  ikke i en nasjonal kjøring.

**På fjellet — riktig etter regelen, men regelen er «over tregrensen» (negativt funn).**
- Riktig: Juvasshytta, Fannaråkhytta, Skålatårnet, Krossbu, Spiterstulen, Olavsbu, Rondvassbu,
  Finse, Tuva, Kjerag og Skåpet.
- Lave fjellhytter i nord kom med: Hollenderhytta og Steinbøhytta i Tromsø, Munkebu i Lofoten,
  Niingshytta og Bjellåvasstua.
- **Klassiske fjellhytter i bjørkebeltet kom ikke med:** Memurubu (36 % skog), Storerikvollen,
  Nedalshytta og Trollheimshytta.
- På Finnmarksvidda kom Mollisjok med, men ikke Joatkajávri (90 % skog) og Ravnastua (96 %).
- Vannfjordhytta på Magerøya, 219 moh, ble «på fjellet» fordi det ikke er skog der.

## Grensetilfeller
- **500–1 000 m fra vann:** faller utenfor, som tenkt. Juvasshytta (199 m til Juvatnet) er med,
  Haugen gård (320 m) er ikke.
- **Lite tjern:** under 1 ha teller ikke. Mellom 1 og 10 ha må hytta ligge innen 100 m (Olavsbu,
  Kobberhaughytta).
- **Fjord:** teller som sjø, fordi Kartverket fører fjordene som havflate.
- **Høyt i skoggrensa:** hytter med 25–40 % skog vipper. Det er den største svakheten ved
  fjellregelen.
- **Lave fjellhytter i nord:** fanges opp av gulvet på 150 m nord for 68° N.

## Begrensninger
- N50 (1:50 000) og hyttepunktet kan begge være 20–50 m unna virkeligheten.
- Elver teller ikke som vann. Straumshytta ligger 34 m fra en elveflate.
- «Skog» i N50 inkluderer bjørkeskog, så fjellmerket blir ujevnt i bjørkebeltet og på vidda.
- Testkommunene var valgt rundt kjente hytter og har mye fjell, så estimatet for fjell er heller
  høyt enn lavt.

## Estimat for hele landet

| Merke | Utvalget | Hele landet (ca.) |
|---|---|---|
| Ved sjøen | 10 % | 100–120 |
| Ved vann | 33 % | 450–550 |
| På fjellet (over tregrensen) | 40 % | 450–550 |
| Ingen av dem | 34 % | ca. 500 |

## Datamodell og UX som ble foreslått
- Lagre beregnede fakta per hytte, ikke ferdige merker: avstand til sjø, avstand til innsjø (over
  1 ha og over 10 ha), skogandel innen 500 m, høyde og tidspunkt. Merkene avledes, så tersklene kan
  justeres uten ny beregning.
- Arealdekket skal ikke inn i Supabase ([ADR 007](../adr/007-chaotic-sources-stable-core.md)).
  Beregningen kjøres i synken, kommune for kommune, i strøm.
- En egen filtergruppe «Omgivelser», der valgene betyr «og», i motsetning til type og eier.

## Alternativer
- Kalle fjellmerket ærlig «Over tregrensen».
- En egen runde med 100 fjellhytter til, og en regel som tar med bjørkebeltet. Det krever trolig en
  lokal tregrense fra høydemodellen.

## Beslutning
**Ingen av filtrene ble bygget** (2026-10-03). Anbefalingen var å bygge «Ved sjøen» og «Ved vann»
og vente med «På fjellet». Produkteieren valgte å droppe alle tre og prioritere stedssøk på
`/hytter` («søk etter Harstad»), som gir mer verdi for flere.

## Hva vi bevisst ikke gjorde
- Ingen lagring av arealdekke eller beregnede fakta.
- Ingen merking basert på navn («-fjellstue», «-seter») eller beskrivelser.

## Åpne spørsmål
- Finnes det en lokal tregrense (fra høydemodell og skogdata) som skiller bjørkebeltet riktig?
- Skal elver telle som vann?

## Hva som kan utløse ny vurdering
- Brukere ber om å filtrere på omgivelser.
- Høyden er nå lagret per hytte (`terrain_elevation_m`, [ADR 005](../adr/005-cached-public-hut-pages.md)), så en del av
  grunnlaget finnes allerede.
- Kartverket publiserer et tregrense- eller vegetasjonslag med bedre oppløsning.
