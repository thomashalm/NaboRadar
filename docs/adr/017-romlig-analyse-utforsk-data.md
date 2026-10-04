# ADR 017: Romlig analyse i Utforsk data er asymmetrisk, eksplisitt per kombinasjon og gjøres i databasen

**Status:** Aktiv · 2026-10-04.

## Bakgrunn
Utforsk data (`/admin/research/utforsk`) viser to lag i samme kart. Å se alle plansaker og alle
kvikkleiresoner oppå hverandre svarer ikke på det admin lurer på: *hvilke plansaker overlapper
faktisk kvikkleire?* Det er første romlige analyse i NaboRadar, og mønsteret vil bli brukt igjen.

Målt i produksjon før noe ble bygget (plansaker i kommunen mot referanselaget):

| Kommune | Referanse | Plansaker | Treffer geometrisk | Bare felles grenselinje | Under 10 m² felles | 10–100 m² |
|---|---|---|---|---|---|---|
| Oslo | kvikkleire (inkl. utredet uten fare) | 53 | 10 | 0 | 0 | 0 |
| Oslo | forurenset grunn | 53 | 39 | 0 | 3 | 3 |
| Bærum | kvikkleire | 39 | 7 | 0 | 0 | 0 |
| Bærum | forurenset grunn | 39 | 15 | 0 | 0 | 0 |
| Trondheim | kvikkleire | 55 | 5 | 0 | 0 | 0 |
| Trondheim | forurenset grunn | 55 | 33 | 0 | 2 | 3 |

Ingen par berørte hverandre bare i grenselinjen. Det som finnes, er fliser: planområder og
lokaliteter for forurenset grunn er ofte tegnet langs samme eiendomsgrense, og to slike flater har
1–6 m² felles uten å ha noe med hverandre å gjøre. Minste kvikkleireoverlapp var 102 m².

## Beslutning
1. **Asymmetrisk.** Hovedlaget er det som filtreres; det andre laget er referansen. Svaret er
   hovedlagets objekter, aldri en blanding. «Plansaker + kvikkleire» er ikke det samme som
   «kvikkleire + plansaker».
2. **Eksplisitt per kombinasjon.** Et datasett sier selv hvilke referanselag det kan testes mot
   (`ExploreDataset.overlap`). I dag: plansaker mot kvikkleire, forurenset grunn og kraftnett.
   Andre kombinasjoner vises sammen, og «Finn overlapp» er deaktivert med en forklaring.
3. **I databasen.** Analysen er én avgrenset admin-RPC, `explore_events_overlap`, som tar en fast
   nøkkel for referanselaget. Ingen dynamisk SQL, ingen analyse i nettleseren.
4. **Regelen for «overlapper»:**
   - flate mot flate: **minst 10 m² felles areal**, regnet på ellipsoiden. Planer som bare har en
     flis felles, telles for seg og nevnes («3 plansaker til har under 10 m² felles … og er ikke
     regnet med»), så de verken er treff eller skjult.
   - flate mot linje eller punkt: linjen eller punktet treffer flaten. De heter ikke «overlapp»:
     en kraftledning *krysser* planområdet, en transformatorstasjon *ligger innenfor*.
   - områder NVE har *utredet uten fare* er ikke kvikkleiresoner, og er ikke treff.
5. **Original geometri.** Analysen bruker geometrien slik den ligger i databasen. Bare flaten
   som sendes til kartet, er forenklet.
6. **Geometrisk observasjon, ikke faglig vurdering.** Tekstene sier at flater overlapper, ikke at
   noe er farlig, problematisk eller «planlagt på kvikkleire». Resultatet står i en egen blokk i
   panelet, merket «NaboRadars romlige analyse», og blandes ikke med kildens opplysninger.
7. **Bare admin.** Analysen er ikke offentlig og endrer ikke `/omrade`.

## Alternativer vurdert
- **`ST_Intersects` alene** — avvist for flater. Ville gitt 39 treff i Oslo mot forurenset grunn,
  hvorav 3 er fliser på 1–3 m². Målingen fant ingen rene berøringer, så `NOT ST_Touches` ville
  ikke fjernet dem.
- **Krav om en andel av planområdet** — avvist. Et stort planområde kan ha et lite, men reelt
  overlapp med en sone (E18-korridoren: 493 m², 0,1 %).
- **Generell spørringsbygger for alle lag** — avvist. To hundre kombinasjoner vi ikke har sett på
  dataene til, er to hundre tall vi ikke kan stå for.
- **Analyse i nettleseren** — avvist. Krever at begge lag lastes fullt, og forenklet kartgeometri
  gir falske treff.

## Konsekvenser
- Antall soner telles etter navn: NVE har løsneområdet og utløpsområdet til en sone som hver sin
  flate, og to flater med samme navn i ett planområde er én sone.
- Overlappareal i m² og andel av planområdet **vises ikke**. Summen per plansak blir feil når
  sonene overlapper hverandre (Ny bru Nypan: 191 % av planområdet), så en andel krever at
  referanseflatene slås sammen først. Det er ikke gjort.
- For forurenset grunn viser vi hver lokalitets egen vurdering, og ingen «høyeste klasse» for
  planen: det ville vært vår sammenstilling, ikke myndighetens.
- Kartet viser høyst 1 500 referanseobjekter (Oslo har 2 899 lokaliteter). Analysen bruker alle;
  en lokalitet som er truffet, men ikke i kartet, står som tekst i panelet.

## Hva som kan utløse ny vurdering
- En ny kombinasjon der fliser ser annerledes ut enn her: terskelen på 10 m² er målt på disse to.
- Ønske om avstandsanalyse («innen 100 m») eller overlappandel i UI.
- At analysen skal brukes utenfor admin.

## Relatert
Håndboka, «Utforsk data». Migrasjon `20261108000000_explore_events_overlap.sql`.
`lib/admin/explore/plansak-overlapp.ts`. [utforsk-data-datasett.md](../research/utforsk-data-datasett.md).
