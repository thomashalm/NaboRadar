# Hvorfor Healthchecks flapper: GitHub kjører ikke cron-en vår

Undersøkt 2026-09-25, etter en nedetid på 4 t 57 min som endte kl. 14:19. Alle tall under er
hentet fra GitHub Actions-API-et for workflowen `Sync` (id 365240889).

## Kort fortalt

GitHub oppretter ikke de planlagte kjøringene. Koden vår er ikke årsaken: **hver eneste
kjøring som faktisk ble startet, gikk gjennom alle stegene og sendte heartbeat**. Det finnes
ikke én feilet, avbrutt eller køblokkert kjøring i historikken.

## Tidslinje for nedetiden

| Tidspunkt (CEST) | Hendelse |
|---|---|
| 08:40:36 | Planlagt kjøring startet, `success` på 32 s, «Heartbeat: kjøring OK» sendt |
| ~09:22 | Healthchecks går DOWN (15 min periode + grace etter forrige ping) |
| 09:00–14:00 | **Ingen kjøring opprettet av GitHub.** Ingen køet, ingen avbrutt, ingen feilet |
| 14:18:34 | Neste planlagte kjøring startet, `success` på 33 s |
| 14:19 | Heartbeat mottatt, Healthchecks går UP |

Hullet mellom de to kjøringene er **338 minutter (5 t 38 min)**. Trekker man fra periode og
grace etter pingen kl. 08:41, gir det nøyaktig den rapporterte nedetiden på 4 t 57 min.

## Hele historikken

I perioden 23.09 19:04 – 25.09 12:18 UTC (41,2 timer) skulle `*/15 * * * *` gitt rundt **165
kjøringer**. GitHub opprettet **11**, altså 6 %.

Hull mellom planlagte kjøringer, i minutter: 144, 148, 193, 194, 241, 259, 307, 312, 338, 338.
Median 259 min, snitt 247 min. Den faktiske kjørefrekvensen er altså omtrent hver fjerde time,
ikke hvert kvarter.

Alle 13 kjøringer i historikken — 11 planlagte og 2 manuelle — har `conclusion: success`.

## Hva loggene utelukker

| Hypotese | Svar |
|---|---|
| A. GitHub starter ikke workflowen | **Ja. Dette er årsaken.** |
| B. Workflowen starter, men heartbeat sendes ikke | Nei. Steg 6 og 9 er `success` i alle kjøringer |
| C. Heartbeat sendes, men kommer ikke fram | Nei. Healthchecks går UP innen ett minutt etter hver kjøring |
| D. Cancelled eller blokkert av concurrency | Nei. Ingen kjøring har status `cancelled`, og hver kjøring tar 25–311 s, langt under 15 minutter |

## Workflow-filen er gjennomgått

Logikken gjør det den skal, og dataene bekrefter det:

* Heartbeat sendes på `success()`, ikke på «noe ble synket». En kjøring der ingen provider er
  forfalt avslutter med kode 0 og sender heartbeat.
* Exit-kode 2 (én kilde feilet) hindrer ikke heartbeat: bare kode 1 gjør steget rødt.
* `concurrency` har `cancel-in-progress: false`, så en ny kjøring køes i stedet for å avbryte.
  Det har uansett aldri skjedd — ingen kjøring varer i nærheten av 15 minutter.
* Secrets-sjekken hopper over sync og heartbeat når Supabase-nøklene mangler. Det er med vilje:
  en dead man's switch skal ikke melde «frisk» for et system som ikke kjører.

Ingenting av dette trenger å endres.

## Dette er kjent oppførsel hos GitHub

GitHub dokumenterer at `schedule` er best effort: kjøringer kan forsinkes ved høy last, og
«hvis lasten er høy nok, kan køede jobber bli forkastet». Effekten er størst rundt hele timer
og for repoer med lite aktivitet. Praktisk gulv for cron er fem minutter, men det er ingen
garanti for at et gitt tidspunkt faktisk gir en kjøring — noe historikken vår viser tydelig.

## Alternativer

Kravene: omtrent hvert 15. minutt, samme Node/TypeScript-worker, secrets på serversiden,
jobber som kan vare noen minutter, manuell rerun, rimelig drift.

| Alternativ | Treffer kravene | Merknad |
|---|---|---|
| **Ekstern scheduler → `workflow_dispatch`** | Ja | Beholder alt: samme worker, samme secrets, samme logger og rerun i GitHub. Bytter bare ut klokka. Krever en PAT med `actions: write` hos den eksterne tjenesten |
| Netlify Scheduled Functions | Nei | 10 s kjøretid på gratisplan, 30 s på betalt. Syncen vår bruker 25–311 s |
| Supabase `pg_cron` + Edge Function | Nei | Edge Functions er Deno. Det ville betydd en parallell implementasjon av workeren, som vi har unngått med vilje |
| Render / Railway / Fly.io cron | Ja | Egen liten container som kjører `npm run sync:worker`. Reell cron, men ny plattform å drifte og ~1–7 $/mnd |
| Google Cloud Scheduler + Cloud Run Job | Ja | Samme container-tanke, romslig gratisnivå, men mest oppsett |

## Anbefaling

Behold GitHub Actions som kjøremiljø, og flytt bare selve klokka ut. En ekstern scheduler som
kaller `workflow_dispatch` hvert 15. minutt gir manuelt utløste kjøringer, som ikke er underlagt
den samme køen som `schedule`.

Dette krever **ingen endring i workflow-filen** — `workflow_dispatch` finnes allerede, og alle
inputene har standardverdier, så et kall uten parametre oppfører seg som en planlagt kjøring.
Det som trengs er en PAT med `actions: write` og et sted å legge den.

Ikke øk grace-tiden i Healthchecks. Den fanger nettopp dette.

---

# Valg av ekstern scheduler (vurdering, ikke besluttet)

Vurdert 2026-09-25. Oppgaven er avgrenset: noe utenfor GitHub skal kalle `workflow_dispatch`
hvert 15. minutt. Worker, workflow og secrets står urørt, og «Run workflow»-knappen fungerer
som før uansett hvilket alternativ som velges.

## Healthchecks.io kan ikke brukes

Healthchecks er en mottaker. Tjenesten lytter etter pinger og varsler når de uteblir; den har
ingen planlagt utgående HTTP. Integrasjonene fyrer på statusendring, ikke på klokkeslett. Den
blir stående som overvåking, ikke som klokke.

## De tre reelle alternativene

| | Supabase `pg_cron` + `pg_net` | Cloudflare Worker cron | cron-job.org |
|---|---|---|---|
| **Kostnad** | 0 — vi bruker allerede Supabase | 0 på gratisplan (3–5 cron-utløsere per Worker) | 0, ingen betalt nivå |
| **Token** | Supabase Vault, kryptert, aktivert på alle prosjekter | `wrangler secret put`, kryptert | Egendefinert header lagret i deres webgrensesnitt |
| **Oppsett** | Én SQL-migrasjon: aktiver utvidelsene, legg PAT i Vault, opprett jobben | Ny konto, ny Worker (~15 linjer), wrangler-config, egen deploy | Fem minutter i et skjema, ingen kode |
| **Driftssikkerhet** | Ekte cron-daemon i vår egen Postgres | 99,99 % SLA på plattformen. Ingen automatisk retry: feiler en kjøring, er den tapt til neste tikk | Fellesskapsprosjekt uten SLA. Oppgir selv at de ikke kan garantere punktlighet |
| **Lock-in** | Ingen ny — allerede vår database | Ny leverandør, men liten flate | Ingen |
| **Ny drift** | Ingen ny plattform. Migrasjonen er versjonert som resten | Ny konto, nytt deploy-artefakt å vedlikeholde | Ingen, men en tjeneste til å holde styr på |
| **Minste intervall** | 1 minutt | 1 minutt | 1 minutt |

## Hvordan vi oppdager at scheduleren selv stopper

Det samme for alle tre, og det er allerede på plass: stopper klokka, kommer det ingen kjøring,
og da kommer det ingen heartbeat. Healthchecks går DOWN etter 15 minutter pluss grace. Det er
nettopp det den er til for, og det er grunnen til ikke å skru opp grace-tiden.

Det Healthchecks ikke sier, er *hvilket* ledd som røk. For Supabase-varianten kan vi senere
vise `cron.job_run_details` på /admin og få svaret uten å gå utenfor huset.

## Anbefaling: Supabase `pg_cron` + `pg_net`

1. **Ingen ny leverandør, ingen ny konto, intet nytt deploy-artefakt.** Databasen er allerede i
   produksjon, og migrasjoner er allerede vår kilde til sannhet. Jobben blir en migrasjon som
   leses og versjoneres som all annen infrastruktur hos oss.
2. **PAT-en havner i Vault**, kryptert, i infrastruktur vi allerede betror service-role-nøkkelen.
   Ikke i et gratis tredjepartsskjema som kan utløse kjøringer i repoet vårt.
3. **pg_cron er en ekte cron-daemon**, ikke en best effort-kø. Det er hele poenget med byttet.
4. **Felles feilområde med databasen er riktig her.** Er Postgres nede, har sync-workeren
   likevel ingenting å skrive til. Et tapt tikk i den situasjonen er ikke en tapt mulighet.

Forbeholdet: `pg_net` er asynkron og uten retry, og feil havner i `net._http_response` uten å
varsle noen. Overvåkingen må derfor fortsatt være Healthchecks — som den er.

**Andrevalg:** Cloudflare Worker, hvis vi heller vil holde klokka utenfor databasen.
**Tredjevalg:** cron-job.org, og da bare midlertidig.

## Å ta stilling til før implementasjon

* **PAT-en.** Fine-grained, kun dette repoet, kun `Actions: read and write`, med utløpsdato.
  Når den utløper, stopper scheduleren stille — Healthchecks fanger det, men rotering bør inn
  i kalenderen.
* **Beholde `schedule:` i workflowen?** Den koster ingenting og fyrer av og til. Med
  `concurrency` og `cancel-in-progress: false` vil en overlappende kjøring bare køe. Å beholde
  den som reserve virker fornuftig.

---

# Implementert: pg_cron som primær scheduler

Satt opp 2026-10-01. GitHubs egen `schedule` står urørt som reserve.

## Hva som kjører

```sql
select cron.schedule('naboradar-sync-dispatch', '*/15 * * * *',
                     $$select public.trigger_sync_workflow()$$);
```

`trigger_sync_workflow()` leser tokenet fra Vault og gjør ett `net.http_post` mot
`POST /repos/thomashalm/NaboRadar/actions/workflows/sync.yml/dispatches` med `{"ref": "main"}`.
Mangler tokenet, skriver den en notice og returnerer — jobben skal ikke feile hvert kvarter
mens hemmeligheten ennå ikke finnes.

## Dobbelkjøring kan ikke skje

Spørsmålet var om pg_cron og GitHubs schedule kan gi to reelle synker av samme provider.
Tre mekanismer, i lag:

1. **GitHub Actions concurrency.** Workflowen har `group: naboradar-sync` med
   `cancel-in-progress: false`. Gruppen gjelder på tvers av hendelsestype, så en
   `workflow_dispatch` og en `schedule` havner i samme gruppe: den ene kjører, den andre
   venter. Historikken bekrefter det — ingen kjøring har status `cancelled`, og ingen varer
   i nærheten av 15 minutter.
2. **`claim_next_due_sync()`.** Tidligere spurte workeren `sync_due()`, som er read-only: to
   samtidige workere fikk samme svar. Nå stemples `last_attempt_at` i samme setning som
   providere velges, med `for update skip locked`. Den andre workeren ser ingenting forfalt.
   Én provider av gangen, slik at en krasj midtveis bare utsetter den ene.
3. **`claim_sync_request()`.** Admin-køen var allerede trygg: `for update skip locked` og
   statusbytte til `running` i én setning.

Punkt 2 var en reell luke før dette: garantien hvilte på GitHubs concurrency-funksjon alene.
Nå holder den uansett hvor mange klokker vi kobler på.

En kjøring som starter rett etter en annen gjør dessuten ingenting dobbelt: `sync_run_start`
setter `last_attempt_at` ved oppstart, og intervallene er 1 440 minutter for de fleste kildene.

## Hemmeligheten

Tokenet ligger i Supabase Vault under navnet `github_workflow_dispatch_token`. Det står ikke i
migrasjonen, ikke i noen applikasjonstabell og ikke i logger. Funksjonen slår det opp ved hvert
kall.

Ett forbehold, sagt rett ut: `pg_net` legger forespørselen med `Authorization`-headeren i
`net.http_request_queue` til bakgrunnsprosessen har sendt den, og sletter raden da. Svaret i
`net._http_response` inneholder ikke forespørselens headere. Skjemaet `net` er ikke eksponert
gjennom API-et.

## Slik settes tokenet opp

1. Lag en fine-grained PAT på GitHub: kun repoet `thomashalm/NaboRadar`, kun tillatelsen
   **Actions: Read and write**, med utløpsdato.
2. Legg den i Vault (SQL Editor i Supabase, ikke i en migrasjon):

   ```sql
   select vault.create_secret('ghp_…', 'github_workflow_dispatch_token',
                              'Utløser sync-workflowen fra pg_cron');
   ```

3. Kontroller at det virker: `select public.trigger_sync_workflow();` og se etter en ny
   kjøring i GitHub Actions innen et halvt minutt.

## Slik roteres PAT-en

Den utløper, og da stopper klokka stille. Healthchecks fanger det innen 15 minutter pluss
grace, og /admin viser «Sist utløst» med advarsel etter to intervaller.

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'github_workflow_dispatch_token'),
  'ghp_ny_token'
);
```

Ingen omstart, ingen deploy: neste tikk bruker den nye verdien. Sett en påminnelse i kalenderen
før utløpsdatoen.

## Overvåking

Healthchecks er uendret, og fanger fortsatt hele kjeden: stopper klokka, kommer det ingen
heartbeat. `/admin` har fått et «Scheduler»-felt som sier hvilket ledd som røk — siste
utløsning fra `cron.job_run_details`, og siste HTTP-status fra `net._http_response`.

`cron.job_run_details` vokser. Den kan trimmes ved behov:

```sql
delete from cron.job_run_details where start_time < now() - interval '30 days';
```
