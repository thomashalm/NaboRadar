# Falske reviews fra `research:seed --review` (runde 16 og 17)

> Undersøkt og ryddet 2026-10-06. **Skriptet er rettet, og de falske reviewene er fjernet.**
> `--review` logget en review for hvert funn som fantes i basen, ikke bare for dem som ble
> kontrollert. To runder ga 537 falske reviews på 275 funn. De ble slettet 2026-10-06 kl. 15:37
> med `npm run review:cleanup -- --apply`, og reviewfeltene er satt tilbake fra historikken som
> står igjen. Resultatet står under «Opprydding utført». Avsnittene før det er undersøkelsen slik
> den ble skrevet, før oppryddingen.

## Rotårsak
`scripts/seed-research.ts` gikk gjennom alle funn i `scripts/research/funn.ts`. Var `--review`
satt, kalte den `record_research_review_unchecked()` for **hvert funn som fantes fra før**:

```ts
if (runId && finnes.rows[0]) { await loggReview(...) }
```

Funn uten endring fikk utfallet `unchanged` og teksten «Gjennomgått i runden uten at innholdet
endret seg». At funnet sto i fila, ble altså regnet som at det var kontrollert. Kommentaren øverst
i skriptet sa «en review per funn som faktisk ble oppdatert»; koden gjorde noe annet. Håndboka
advarte om det i §37, men skriptet lot seg likevel kjøre slik.

## Hva en falsk review endret
`record_research_review_unchecked()` gjør dette for hvert kall:

| Felt | Endring |
|---|---|
| Ny rad i `admin_research_reviews` | Utfall `unchanged`, aktør `seed`, knyttet til runden |
| `last_reviewed_at` | Satt til kjøretidspunktet |
| `last_verified_at` | Satt til kjøretidspunktet |
| `review_unchanged_streak` | Økt med 1 |
| `next_review_at` | Regnet ut på nytt av triggeren, fra ny dato og lengre streak |
| `updated_at` | Satt til kjøretidspunktet |

Status, sikkerhet, notater og `review_mode` ble ikke rørt.

## Omfang (lest fra produksjon 2026-10-06, bare lesing)

| Runde | Kjørt | Reviews fra seeden | Falske (`unchanged`) | Ekte |
|---|---|---|---|---|
| Datasenter runde 16 | 2026-10-02, 12:34–12:37 | 268 | 268 | 0 fra seeden. Rundens 40 ekte reviews (30 med endring, 10 uten) ble logget for seg, av en person |
| Datasenter runde 17 | 2026-10-06, 09:21–09:23 | 276 | 269 | 7 (`updated`) |

- **537 falske rader på 275 funn.** 126 av funnene er ikke datasentre i det hele tatt (pukkverk,
  gruver, avløp, forsvar), i to runder som bare gjaldt datasentre.
- **154 funn har ingen andre reviews.** De sto som «aldri kontrollert» før runde 16. Nå står alle
  med `last_reviewed_at` 06.10.2026, streak 2 og neste review mellom november 2026 og april 2028.
- **121 funn har også ekte reviews** fra før.
- Ingen eldre runder er berørt: seeden har ikke logget reviews før runde 16.

Usikkerheten i runde 16: de 268 radene kom i én sammenhengende kjøring der seeden ikke endret noe
innhold, og rundens ekte arbeid ble logget separat. Alle 268 regnes derfor som falske. Det kan
ikke utelukkes at noen av de 119 datasenterfunnene faktisk ble sett på i runden uten at det ga en
egen review. For de 126 som ikke er datasentre, er det sikkert.

## Kan det rekonstrueres?

| Hva | Kan gjenskapes? | Hvordan |
|---|---|---|
| Hvilke rader som er falske | **Ja** | Aktør `seed`, utfall `unchanged`, runde 16 eller 17. Radene bærer runde-ID |
| `last_reviewed_at` | **Ja** | Nyeste gjenværende ekte review, ellers tom («aldri kontrollert») |
| `review_unchanged_streak` | **Ja** | Telles opp fra de gjenværende reviewene |
| `next_review_at` | **Som regel, ikke som verdi** | Alle funn har `review_mode = policy`. Triggeren regner datoen på nytt. For de 154 uten review satte backfillen en spredt førstedato; den kan settes på nytt med `review:backfill`, men blir ikke nødvendigvis samme dag |
| `last_verified_at` | **Bare tilnærmet** | Den forrige verdien er ikke lagret noe sted. Regelen den ble satt etter, er kjent: nyeste ekte review som verifiserte, ellers nyeste kildedato, ellers datoen funnet ble lagt inn. En manuell endring i mellomtiden ville gått tapt |
| `updated_at` | **Nei** | Ikke lagret. Seeden setter den uansett på hver kjøring |

- **Git** har ikke reviewdata: `funn.ts` inneholder innhold, ikke reviewplanen.
- **Databasehistorikk:** det finnes ingen revisjonslogg for `admin_research_items`, og Supabase
  Free har ikke gjenoppretting til et tidspunkt.
- **Reviewtabellen** er den eneste historikken, og den er nok til datoer og streak.

Konklusjon: de falske **radene** kan fjernes sikkert. **Feltene** kan settes tilbake etter
reglene de opprinnelig ble satt med, men ikke som en eksakt tilbakeføring.

## Anbefalt opprydding (skrevet før den ble utført)
Ett skript, med tørrkjøring først, i én transaksjon:

1. Skriv ut hva som blir endret per funn: dagens og ny verdi for de fire feltene. Stopp der i
   tørrkjøring.
2. Slett de 537 radene (aktør `seed`, utfall `unchanged`, runde 16 og 17).
3. For hvert av de 275 funnene: sett `last_reviewed_at` og streak fra gjenværende reviews, og
   `last_verified_at` etter regelen over.
4. Nullstill `next_review_at` for de samme funnene og la triggeren regne. Kjør `review:backfill`
   for dem som igjen står uten review.
5. Kontroller: antall «aldri kontrollert» skal være 154 høyere enn i dag, og ingen funn utenfor
   de 275 skal være endret.

Alternativet er å la det stå og bare merke radene som ugyldige. Det bevarer historikken, men køen
vil fortsatt tro at 154 ukontrollerte funn er ferske til 2027–2028. Det fraråder jeg: reviewkøen
finnes for nettopp de funnene.

Dette gjøres ikke uten et uttrykkelig ja.

## Opprydding utført 2026-10-06

Godkjent samme dag. Skript: `scripts/research-review-cleanup.ts` (`npm run review:cleanup`), med
kjernen i `scripts/research/review-opprydding.ts`. Tørrkjøring er standard; `--apply` skriver.
Alt skjer i én transaksjon, og skriptet stopper uten å endre noe hvis tallene i basen ikke
stemmer med tabellen over.

### Hva som regnes som falskt
Alle vilkårene må holde: aktør `seed`, utfall `unchanged`, `changed = false`, ingen kilder
kontrollert, seedens faste tekst, og knyttet til runde 16 eller 17. En seed-rad i de samme rundene
som ikke passer alt dette, beholdes og rapporteres som tvilstilfelle. Det var ingen.

### Reglene, og kontrollen av dem
| Felt | Regel | Kontroll før apply |
|---|---|---|
| `last_reviewed_at` | Tidspunktet for nyeste gjenværende review, ellers tom | Stemte for 277 av 277 funn mot dagens historikk |
| `review_unchanged_streak` | Antall reviews uten endring etter den siste med endring | 277 av 277 |
| `last_verified_at`, funn med ekte review | Tidspunktet for nyeste gjenværende review som verifiserte (alle utfall unntatt `unresolved` og `snoozed`) | 277 av 277. Review-funksjonen setter feltet til samme `now()` som reviewens tidspunkt, og ingen annen kode i appen eller skriptene skriver feltet |
| `last_verified_at`, funn uten review | Ankeret `review:backfill` setter: nyeste kildedato, ellers datoen funnet ble lagt inn | Alle 154 er opprettet 25.–26.09.2026 og har ikke fått en eneste ny kilde etter 26.09 — før review-laget fantes. Ankeret er derfor det samme som da det ble satt |
| `next_review_at` | Ikke satt av skriptet. Triggeren regner den når ankrene endres | – |
| `updated_at` | Ikke rørt | Uendret på alle 275 |

`last_verified_at` ble altså skrevet, fordi regelen lot seg kontrollere uten avvik for begge
gruppene. Det er ikke en eksakt tilbakeføring fra lagret historikk — den finnes ikke — men en
utledning som gir samme verdi som mekanismene som opprinnelig satte feltet.

### Tørrkjøring og apply
Tørrkjøringen (15:35) og den faktiske kjøringen (15:37, UTC 13:37:16) ga samme tall:

| | Antall |
|---|---|
| Review-rader slettet | 537 (268 fra runde 16, 269 fra runde 17) |
| Funn berørt | 275 |
| Tilbake til «aldri kontrollert» | 154 |
| Beholder minst én ekte review | 121 |
| Øvrige reviews før og etter | 853 og 853 |
| Endret `last_reviewed_at` | 269 |
| Endret streak | 269 |
| Endret `last_verified_at` | 269 (115 fra nyeste ekte review, 154 fra kildeankeret) |
| Endret `next_review_at` (av triggeren) | 255, alle til en tidligere dato |
| Endret `updated_at` | 0 |
| Tvilstilfeller beholdt | 0 |
| Funn utenfor oppryddingen som ble endret | 0 |

Seks av de sju funnene fra runde 17 fikk ingen feltendring: de mistet bare den falske raden fra
runde 16, og den ekte reviewen fra runde 17 var fortsatt den nyeste.

Etterpå ble `npm run review:backfill` kjørt. Den satte ingen nye ankre (alle hadde ett) og ga de
31 funnene i prioritetsklassene uten review en første dato: 12 forfalt nå, 19 fordelt over tre
uker. Det er samme mekanisme som ga dem en plan første gang.

### Verifisert etterpå
- Ingen falske rader står igjen. Runde 16 har 40 reviews, alle fra en person; runde 17 har de sju
  ekte fra seeden.
- 853 reviews totalt, som før oppryddingen minus de falske.
- 154 funn står som aldri kontrollert, 123 har review.
- `last_reviewed_at` er lik nyeste review for alle funn. Neste review følger policyen for alle
  funn med review.
- Køen: 12 forfalt, 1 forsinket, 15 snart, 234 ferske, 15 uten reviewbehov. Før oppryddingen var
  den tom: 262 ferske og ingen forfalt.
- Stikkprøver: ASP Dalekvam og Kitebrook Matre (runde 17) har reviewen fra 06.10 som nyeste.
  Arcem Bergen og Lefdal (eldre ekte reviews) har datoene fra 1. og 2. oktober. Franzefoss Pukk
  Lierskogen og Akershus festning (aldri kontrollert) har ingen reviews, anker 26.09 og neste
  review etter policy. Nussir kobbergruve (under bygging, aldri kontrollert) er forfalt nå.

### Idempotent
En ny tørrkjøring og en ny `--apply` etterpå ga begge «0 falske reviews å rydde. Ingenting er
endret.»

### Hva som ikke kunne gjenskapes
- **`updated_at`:** ikke lagret, ikke rørt.
- **Eksakte tidligere datoer for neste review** for de 31 prioriterte funnene: backfillen fordeler
  på nytt fra dagens dato, så de fikk nye førstedatoer, ikke de gamle.
- **Runde 16:** alle 268 seed-rader er regnet som falske. For de 119 datasenterfunnene kan det
  ikke utelukkes at noen ble sett på i runden uten en egen review. De ekte reviewene fra runden
  står.
- **`last_verified_at`** er utledet etter kontrollerte regler, ikke hentet fra en lagret verdi.

## Hva som er rettet
Se [håndboka §36](../naboradar-handbook.md#36-research-lifecycle-freshness-og-review-kø), «Reviews
fra en researchrunde».

- En review registreres bare for funn som er merket `gjennomgatt_i: "<rundeetikett>"` i
  `funn.ts`. At et funn står i fila, er aldri nok.
- `--review` uten merkede funn stopper **før noe er skrevet**, også innholdet.
- Samme runde kan kjøres to ganger uten doble reviews.
- Kjernen ligger i `scripts/research/seed.ts` og testes mot PGlite i
  `tests/db/research-seed.test.ts` (åtte tester).
- De sju funnene fra runde 17 er merket i `funn.ts`.
