# DNTs bookingløsning: ledighet, kalender og pris

> **Research only.** Undersøkt 2026-10-02. Ingenting her er implementert.
>
> - Ledighet, kalender og pris er **ikke** bygget i NaboRadar.
> - Automatisert kommersiell bruk av DNTs bookingdata er **ikke avklart**.
> - **Produktbeslutning 2026-10-02:** NaboRadar bygger ikke booking eller live ledighet. Vi
>   viser hytta og lenker videre til den som driver den. Se
>   [data-roadmap.md](../data-roadmap.md#12-friluft-skjult-lokal-innsikt-ikke-en-turapp).
>
> Dokumentet finnes for at researchen ikke skal måtte gjøres på nytt.

## Konklusjon

**Teknisk mulig, men rettighetene er uklare.** DNTs bookingløsning har åpne JSON-endepunkter
som gir ledighet og pris per hytte og dato uten innlogging. Ingen vilkår gir en tredjepart rett
til å bruke dem automatisk og kommersielt, og DNT forbyr nettopp det i vilkårene for UT.no. Det
som kan brukes uten avklaring, er en lenke til hyttas bookingside.

Omfang av undersøkelsen: rundt 25 lesekall, ingen reservasjon, ingen innlogging. De nedlastede
sidene ble slettet etterpå.

## Plattform

| | |
|---|---|
| Frontend | `hyttebestilling.dnt.no` — Next.js hos Vercel. Alle sider er merket `noindex` |
| Bookingmotor | VisBook (norsk bookingsystem). Hver hytte er en egen «web entity» med et `visbookId` |
| Mellomlag | DNTs egne ruter under `/api/booking/` videresender til VisBook |
| Hytteregister | Ligger hos DNT. 580 bestillbare hytter fra 56 foreninger: 347 ubetjente, 177 selvbetjente, 47 betjente |
| Dokumentasjon | VisBooks booking-API (8.39.60) er åpent dokumentert på `ws.visbook.com/8/docs`, uten lisens, vilkår eller kontaktpunkt i spesifikasjonen. DNTs egne ruter er udokumenterte |

## Endepunkter

Alle er GET og svarte uten cookies og uten innlogging.

| Endepunkt | Gir |
|---|---|
| `/api/booking/availability-calendar?cabinId&fromDate&toDate` | Ledighet per dag og per produkt |
| `/api/booking/cabin-availability?cabinId&fromDate&toDate` | Ledighet og prisgrupper for en periode |
| `/api/booking/available-price?cabinId&fromDate&toDate&numberOfGuests` | Priser, og hyttemetadata (forening, område, betjeningsgrad, senger, sesong) |
| `/kart` | Hele hytteregisteret, innebygd i HTML-en |

- `cabinId` er hyttas heltalls-ID — den samme som i adressen `ut.no/hytte/{id}`.
- `available` er antall ledige enheter per produkt og dato. En enhet er en seng, et rom eller
  hele hytta, avhengig av hytta.
- VisBooks eget API (`ws.visbook.com/8/api/{visbookId}/availability/{produkt}/{måned}`, ett
  testkall) oppgir i tillegg årsaken: `noAvailableUnits`, `closingPeriodException`,
  `blockationPeriod`.
- Svarene har `cache-control: public, max-age=0, must-revalidate`, ingen CORS-åpning og ingen
  oppgitte rate limits. Svartid 0,1–2,3 s.
- Ugyldig hytte-ID ga HTTP 500.
- Det finnes ikke noe kall for flere hytter på én gang. Lest i frontend-koden: DNTs egen side
  henter ledighet per hytte, og automatisk bare når lista har ti hytter eller færre.

## Lenker

| | |
|---|---|
| Bookingside | `https://hyttebestilling.dnt.no/hytte/{id}` |
| Med dato | `?fromDate=2026-10-14&toDate=2026-10-15` fylte ut datoene (testet) |
| Med antall personer | Ikke bekreftet. `guests=2` virket ikke |
| Område | `/kart?type=area&value={områdeId}` filtrerer kartet, men gir ikke ledighet |

## Vilkår

| Kilde | Hva den sier |
|---|---|
| `hyttebestilling.dnt.no` | Bare bestillings- og avbestillingsvilkår. Ingenting om bruk av nettstedet, data eller API. `robots.txt` finnes ikke |
| UT.no (oppdatert 09.03.2026) | Gjelder «UT.no, UT-appen og tilhørende tjenester», som eies av DNT: «Det er forbudt å benytte automatiske metoder eller programvare til å samle inn innhold fra Tjenesten til kommersiell bruk.» Om bookingløsningen er en «tilhørende tjeneste», står ikke |
| VisBook | Ingen publiserte vilkår for booking-API-et. Dataene tilhører kunden, altså DNT |

At noe er teknisk tilgjengelig, eller at `robots.txt` mangler, er ikke en gjenbruksrett.
Hytteregisteret er dessuten en database; systematisk uttrekk av store deler krever normalt
samtykke uansett hva vilkårene sier. Det siste er en vurdering, ikke juridisk rådgivning.

## Kobling mot våre hytter

Kontrollert mot piloten i Oslomarka, uten å lagre noe:

- Av 52 bookinghytter i pilotruta traff 41 en av våre (median avstand 9 m).
- Alle våre 35 DNT-hytter hadde treff.
- Elleve bookinghytter mangler hos oss, mest anneks på tun.
- Fem av våre hytter svarer til flere bookingenheter (Tømtehyttene, Svartvannshytta,
  Vikkelihytta m.fl.). En kobling må derfor være én-til-mange.

## Hvis sporet tas opp igjen

Det som må avklares med DNT (post@ut.no står i vilkårene; info@dnt.no er DNT sentralt):

1. om vi kan lagre hytte-ID, sengeplasser, nøkkeltype og sesong fra registeret,
2. om vi kan spørre etter ledighet per hytte og dato fra vår server, med avtalt volum og
   cache-tid,
3. om resultatet kan vises kommersielt med lenke til DNT,
4. om vi skal bruke DNTs ruter eller VisBooks API direkte.

Tekniske rammer en eventuell løsning må holde seg innenfor:

- Kall fra server, ikke nettleser (ingen CORS).
- Skille mellom «0 ledig», «stengt» og «fikk ikke svar». Ved feil: «Kunne ikke hente ledighet»
  og lenke til DNT — aldri «ingen ledighet».
- Cache på høyst noen få minutter. Endepunktene ber om ingen caching, og en påbegynt
  bestilling holder kapasitet i inntil 30 minutter.
- «Ledige hytter innen 50 km» fra Oslo betyr rundt 50 kall per søk med dagens API.
