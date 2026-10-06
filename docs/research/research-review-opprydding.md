# Falske reviews fra `research:seed --review` (runde 16 og 17)

> Undersøkt 2026-10-06. **Skriptet er rettet. Produksjonsdata er ikke endret.**
> `--review` logget en review for hvert funn som fantes i basen, ikke bare for dem som ble
> kontrollert. To runder ga 537 falske reviews på 275 funn. Opprydding er mulig med regler, men
> ikke bit for bit, og er ikke gjort: forslaget står nederst og venter på en beslutning.

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
| Datasenter runde 16 | 2026-10-02, 12:34–12:37 | 268 | 268 | 0 fra seeden. Rundens 30 ekte reviews ble logget for seg, av en person |
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

## Anbefalt opprydding (ikke utført)
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
