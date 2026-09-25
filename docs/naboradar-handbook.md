# NaboRadar — håndbok

Dette dokumentet beskriver **hvordan NaboRadar faktisk fungerer nå**. Det er ikke en dagbok over
endringer, og ikke en plan for hva vi skal bygge. Der eksisterende dokumentasjon sier noe annet enn
koden, er koden fasit, og dokumentasjonen skal rettes.

Sist kryssjekket mot repoet: **2026-09-25**.

> ## Vedlikehold av dokumentet
>
> **Oppdater håndboken i samme commit** når en endring påvirker arkitektur, datakilder, drift,
> scheduler, auth/admin, database (RLS, grants, migrasjoner), sikkerhet, eksterne tjenester,
> secrets, deploy, større produktprinsipper eller kjente begrensninger.
>
> **Ikke oppdater** for copy-endringer, styling eller trivielle bugfikser uten systempåvirkning.

---

## Innhold

[1. Hva er NaboRadar?](#1-hva-er-naboradar) · [2. Produktprinsipper](#2-produktprinsipper) ·
[3. Teknisk arkitektur](#3-teknisk-arkitektur) · [4. Deploy og miljøer](#4-deploy-og-miljøer) ·
[5. Domene og DNS](#5-domene-og-dns) · [6. Supabase og database](#6-supabase-og-database) ·
[7. RLS, grants og databasesikkerhet](#7-rls-grants-og-databasesikkerhet) · [8. Admin](#8-admin) ·
[9. Scheduler](#9-scheduler) · [10. GitHub-token og Vault](#10-github-token-og-vault) ·
[11. Healthchecks](#11-healthchecks) · [12. Sync-arkitektur](#12-sync-arkitektur) ·
[13. Datakilder](#13-datakilder) · [14. Kildepresisjon og tolkningsregler](#14-kildepresisjon-og-tolkningsregler) ·
[15. Eiendomsfunksjonen](#15-eiendomsfunksjonen) · [16. Endepunkter](#16-endepunkter) ·
[17. Rate limiting](#17-rate-limiting) · [18. Security headers](#18-security-headers) ·
[19. XSS, SSRF og input-validering](#19-xss-ssrf-og-input-validering) ·
[20. GitHub Actions og supply chain](#20-github-actions-og-supply-chain) ·
[21. Progressiv lasting](#21-progressiv-lasting-og-feiltoleranse) · [22. UI-struktur](#22-ui-struktur) ·
[23. Nærområdet](#23-nærområdet) · [24. Personvern](#24-personvern) ·
[25. Kjente begrensninger](#25-kjente-begrensninger-og-akseptert-risiko) · [26. Runbook](#26-driftrunbook) ·
[27. Backup](#27-backup-og-gjenoppretting) · [28. Eksterne tjenester](#28-eksterne-tjenester) ·
[29. Secrets](#29-secrets-oversikt) · [30. Kommandoer](#30-viktige-kommandoer) ·
[31. Arkitekturbeslutninger](#31-viktige-arkitekturbeslutninger) · [32. Roadmap](#32-roadmap--idébank) ·
[33. Milepæler](#33-milepæler)

---

## 1. Hva er NaboRadar?

NaboRadar svarer på ett spørsmål: **hva er offentlig kjent om området rundt denne adressen?**

Brukeren søker opp en adresse eller et sted, velger en radius (500 m, 1 km eller 3 km), og får en
side som samler offentlige forhold i nærheten: varslede planoppstarter, grunnforhold, støy,
kraftanlegg, forurenset grunn, skoler, barnehager, sykehus, omsorgstilbud, industri og
skjenkesteder — med kart, avstand og kildelenke for hvert punkt.

**Målgruppen** er privatpersoner som vurderer å kjøpe, leie eller bo et sted, og som ellers måtte
lett i et titalls ulike kommunale og statlige innsynsløsninger.

**Hovedprinsippet** er å samle, ikke å vurdere. NaboRadar sier at det ligger et omsorgstilbud
120 meter unna, at grunnen er kartlagt som mulig kvikkleire, eller at det er varslet planoppstart i
nabokvartalet. Den sier aldri om det er bra eller dårlig. Det finnes ingen score, ingen rangering og
ingen «dette kan påvirke boligverdien». Vurderingen er brukerens.

### Forbrukerprodukt vs. NaboRadar Pro

Det som er bygget i dag er **forbrukerproduktet**: gratis, uten innlogging, ett søk av gangen.

**NaboRadar Pro** er en idé, ikke et produkt. Tanken er verktøy for meglere, takstfolk og
utbyggere — rapporter, overvåkede adresser, historikk. Ingenting av dette er bygget, og ingen
kodebeslutninger er tatt for å støtte det. Se [32. Roadmap](#32-roadmap--idébank).

---

## 2. Produktprinsipper

Disse følger vi allerede, og de er synlige i koden.

| Prinsipp | Hvordan det håndheves |
|---|---|
| **Offentlig etterprøvbare kilder** | Hver provider har `license` og kildelenke. Ingenting scrapes fra lukkede systemer — se [ADR 004](adr/004-no-scraping-oslo.md) |
| **Tydelig proveniens** | Hvert funn viser kilde, år og lenke. Sentralt register i `lib/facts/wording.ts` |
| **Ikke overtolk data** | Vi bruker kildens egne klasser og ord. «Aktsomhet» er ikke «fare». Mangler kilden et felt, finner vi ikke på ett |
| **Skill dokumentert funn fra screening** | Kartlagt kvikkleiresone (undersøkt) holdes adskilt fra aktsomhetsområde (modellert) |
| **Ikke vis personopplysninger unødvendig** | Bevillingshaver lagres aldri. Berørte parter hentes aldri fra DiBK — allowlist i kode *og* CHECK i databasen |
| **Sensitive institusjoner kun når ansvarlig myndighet publiserer stedet** | Omsorgstilbud tas bare inn når kommunen eller helsemyndigheten selv publiserer navn og konkret adresse |
| **Kompakt UI først** | Hver seksjon åpner med én oppsummeringslinje. Maks tre treff før «Se alle». Detaljer bak utvidere |
| **Kart og liste utfyller hverandre** | Samme valgte objekt markeres begge steder. Kartet viser alle relevante objekter selv når listen er kuttet |
| **Én treg kilde skal ikke velte siden** | Tre uavhengige strømmer med egen timeout, og feiltilstand per seksjon |

---

## 3. Teknisk arkitektur

| Lag | Teknologi |
|---|---|
| Rammeverk | Next.js 16 (App Router), React 19, TypeScript 6.0.x |
| Styling | Tailwind CSS 4 |
| Kart | MapLibre GL JS 6 (selvhostet worker under `public/vendor/`) |
| Validering | Zod 4 |
| Hosting | Netlify (OpenNext-adapteren, lagt til automatisk) |
| Database | Supabase — PostgreSQL 17.6 med PostGIS 3.3.7 |
| Auth | Supabase Auth (kun `/admin`) |
| Kode og CI | GitHub + GitHub Actions |
| Scheduler | Supabase `pg_cron` + `pg_net` |
| Overvåking | Healthchecks.io (dead man's switch) |
| Lokal database | PGlite + pglite-postgis (samme migrasjoner, aldri i produksjon) |
| Tester | Vitest |

### Forespørselsflyt

```
bruker (nettleser)
  │
  ├─ HTML/RSC ──► Netlify ──► Next.js server component
  │                              ├─► Supabase RPC   (features_near, events_within, get_event, data_status)
  │                              └─► direkte oppslag (NVE, Miljødirektoratet, Vegvesenet, Avinor)
  │
  ├─ /api/geocode ──► Netlify ──► Kartverket (adresser + stedsnavn)
  ├─ /api/eiendom ──► Netlify ──► Geonorge WFS (teig, bygningspunkt) + adresse-API
  │
  └─ kartfliser ─────────────────► cache.kartverket.no   (går utenom oss)
```

### Driftsflyt

```
Supabase pg_cron  (*/15 * * * *)
  └─► public.trigger_sync_workflow()          security definer, leser token fra Vault
        └─► net.http_post → GitHub workflow_dispatch
              └─► GitHub Actions «Sync»
                    └─► npm run sync:worker   (service_role)
                          ├─► claim_next_due_sync()  én provider av gangen
                          ├─► datakilder (DiBK, Udir, NVE, MDIR, Oslo …)
                          ├─► Supabase (upsert_events / upsert_area_features)
                          └─► npm run alerts:check
                    └─► Healthchecks.io   /start · ping · /fail
```

### Hvor kjører hva

| | Innhold |
|---|---|
| **Klient** | MapLibre-kart, søkefelt med autocomplete, radiusvalg, utvidere, `/api/*`-kall. Snakker med Supabase kun for auth på `/admin` |
| **Server (RSC + route handlers)** | All datahenting. Alle fem lese-RPC-ene kalles kun herfra. Geokoding og eiendomsoppslag proxes her, så klienten aldri kjenner Kartverket eller Geonorge |
| **Database** | Geospatiale spørringer, harde grenser på radius og antall, RLS, dokument-allowlist, sync-koordinering, scheduler |
| **Drift** | GitHub Actions kjører synkeren. Webappen synker aldri, og har ingen skrivenøkkel |

---

## 4. Deploy og miljøer

| | |
|---|---|
| Produksjonsbranch | `main` |
| Deploy | Netlify bygger fra `main` ved hver push. `npm run build`, Node 24 |
| Deploy previews | **På** — bygges for pull requests |
| Branch deploys | **Kun produksjonsbranchen** |
| Sensitive variable policy | **Require approval** — en deploy fra en fork-PR må godkjennes av et site-medlem før den bygger |

Policyen for sensitive variabler finnes bare for prosjekter koblet til **offentlige** repoer, som
vårt. Den er den eneste tingen som hindrer at en fremmed PR får miljøvariablene våre. En branch vi
selv pusher er en *trusted* deploy og får full env uansett.

### Miljøvariabler i Netlify

Kun disse to, begge trygge å eksponere:

| Variabel | Hvorfor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Server components leser data via PostgREST |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Samme. Publishable key — RLS og funksjons-grants begrenser hva den får gjøre |

Valgfritt: `NEXT_PUBLIC_MAP_TILE_URL` og `NEXT_PUBLIC_MAP_ATTRIBUTION`. Uten dem brukes Kartverkets
topograatone. `NEXT_PUBLIC_*` bakes inn ved bygg — endrer du dem, må du deploye på nytt.

### Hva som ikke skal i Netlify

`SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `HEALTHCHECK_URL`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`.
Ingen av dem brukes av webappen.

> **Prinsipp:** server-side hemmeligheter legges ikke i web-runtime uten et bevisst arkitekturvalg.
> Webappen har med vilje ingen skrivetilgang til databasen. «Kjør sync nå» i `/admin` legger en
> forespørsel i kø som sync-workeren plukker opp — nettopp for at Netlify ikke skal trenge en nøkkel
> som omgår RLS. Se [31. Arkitekturbeslutninger](#31-viktige-arkitekturbeslutninger).

---

## 5. Domene og DNS

| | |
|---|---|
| Domene | `naboradar.no` |
| Hosting | Netlify |
| Registrar / DNS | **Domeneshop — ekstern drift, ingen konfigurasjon i repoet** |

DNS-oppsettet er ikke versjonert noe sted i dette repoet, og kan ikke verifiseres herfra. Det
administreres hos Domeneshop, med Netlify som mål. Endringer i DNS må gjøres der, og bør noteres
her når de skjer.

Apex/`www`: velg én kanonisk vert i Netlify og la den andre omdirigere dit, slik at
`Strict-Transport-Security`, cookies og lenker peker konsistent ett sted. Hvilken som i dag er
kanonisk, er ikke dokumentert i repoet — bekreft i Netlify før du endrer noe.

---

## 6. Supabase og database

PostgreSQL 17.6 med PostGIS 3.3.7 (i skjemaet `extensions`). **Migrasjonene i
`supabase/migrations/` er source of truth** — testene spiller av hele historikken mot PGlite ved
hver kjøring, så en migrasjon som ikke kan spilles av på nytt, brekker testene.

### Tabeller

| Tabell | Innhold | Regenererbar? |
|---|---|---|
| `providers` | Én rad per datakilde: status, lisens, synkeintervall, stale-grense, siste kjøring | Ja (seedes i migrasjon) |
| `events` | Plansaker fra DiBK. Polygon/multipolygon, generert `centroid` og `computed_area_m2` | **Ja** — full sync fra DiBK |
| `event_documents` | Tillatte plandokumenter. CHECK på type, tittel og mime-type | **Ja** |
| `area_features` | Alle synkede områdefakta, ~37 000 rader | **Ja** |
| `sync_runs` | Én rad per kjøring: modus, tellere, advarsler, feil | Nei, men kun drifthistorikk |
| `sync_requests` | Kø for «Kjør sync nå» fra `/admin` | Nei, men flyktig |
| `admin_users` | E-poster som slipper inn på `/admin` | **UNIK — må sikres** |
| `watched_areas` | Overvåkede områder per bruker. Tabellen finnes, funksjonen er ikke bygget (0 rader) | **UNIK når den tas i bruk** |
| `notifications` | Varsler knyttet til `watched_areas`. Ikke i bruk (0 rader) | Samme |

### Geometri

Lagring er `geometry(Geometry, 4326)`; avstand og radius beregnes ved cast til `geography`, med
funksjonell GiST-indeks på `(geom::geography)` slik at indeksen faktisk brukes. Begrunnelsen står i
[ADR 002](adr/002-postgis-geospatial-model.md).

`features_near` hopper over å serialisere geometrier med mer enn 5 000 punkter — NVEs største
kvikkleiresone har over 100 000 hjørner, og ville ellers sprengt svaret.

### Funksjoner

| Funksjon | Bruk |
|---|---|
| `features_near(lat, lng, radius_m, categories, max_results)` | Områdefakta innen radius, med avstand og «dekker søkepunktet» |
| `features_count_near(lat, lng, radius_m, categories)` | Antall per kategori, på samme filter — så «566 steder» er sant selv når listen er kuttet |
| `events_within(lat, lng, radius_m, announced_since, sort, max_results)` | Plansaker innen radius |
| `get_event(event_id, lat, lng)` | Én plansak med dokumenter |
| `data_status()` | Sist vellykkede sync per kilde, til kildelinjen i UI |
| `upsert_events`, `upsert_area_features`, `mark_*_removed` | Skriving, kun service_role |
| `sync_run_start/finish`, `sync_due`, `claim_next_due_sync`, `claim_sync_request`, `finish_sync_request`, `expire_stale_sync_requests`, `provider_baseline`, `set_alert_state` | Sync-koordinering, kun service_role |
| `provider_health`, `recent_sync_runs`, `request_sync`, `scheduler_status` | `/admin`, kun innlogget admin |
| `is_admin`, `is_privileged`, `request_claims`, `request_role`, `request_email` | Interne hjelpefunksjoner |
| `trigger_sync_workflow` | Scheduler. Kun `postgres` og `service_role` |

Det finnes ingen views og ingen materialiserte views.

---

## 7. RLS, grants og databasesikkerhet

Dette avsnittet er viktig, og er skrevet etter en sikkerhetsgjennomgang som fant et reelt hull.

### Lærdommen

Supabase kjører som standard:

```sql
alter default privileges in schema public grant all on functions
  to postgres, anon, authenticated, service_role;
```

Hver **ny** funksjon i `public` får derfor EXECUTE gitt **eksplisitt** til `anon` og
`authenticated` — i tillegg til PostgreSQLs egen standard om at PUBLIC får EXECUTE.

> **En `revoke execute … from public` er ikke nok. En `revoke … from anon` er heller ikke nok.
> Begge trengs.**

Konsekvensen var at `trigger_sync_workflow()` lå åpen for anonyme kall fram til 2026-09-25, og at
hvem som helst med den publiserbare nøkkelen — som ligger i klientbundlen — kunne utløse
produksjons-syncen så mange ganger de ville. Bekreftet med et anonymt kall som ga HTTP 204 og et
nytt utgående kall fra pg_net. Lukket i `20261002000000_grant_hardening.sql` og
`20261003000000_revoke_public_helpers.sql`.

### Tilgangsmodellen i dag

Tilgangen er en **positiv, uttømmende liste**, ikke en opprydding i enkelttilfeller.

| Rolle | Kan kalle |
|---|---|
| `anon` | `features_near`, `features_count_near`, `events_within`, `get_event`, `data_status` |
| `authenticated` | det samme, pluss `is_admin`, `provider_health`, `recent_sync_runs`, `request_sync`, `scheduler_status` |
| `service_role` | alt — sync-workeren |
| `postgres` | alt — migrasjoner og pg_cron |

Alt annet er stengt. Spesielt:

- `trigger_sync_workflow()` — kun `postgres` og `service_role`
- `scheduler_status()` — admin-only i praksis: grantet til `authenticated`, men returnerer ingen
  rader med mindre `is_admin()` eller service_role
- `is_privileged()`, `request_claims()`, `request_role()`, `request_email()` — lukket for begge

### Tabellrettigheter

Appen går utelukkende gjennom RPC-er og rører ingen tabell direkte. `anon` og `authenticated` har
derfor bare SELECT, og bare der en RLS-policy allerede slipper dem til. Ubrukt
INSERT/UPDATE/DELETE/TRUNCATE er fjernet — RLS stoppet skrivingen fra før, men da var RLS eneste
forsvarslinje i stedet for andre.

| Tabell | `anon` | `authenticated` |
|---|---|---|
| `providers`, `events`, `event_documents`, `area_features` | SELECT (policy `using (true)`) | SELECT |
| `admin_users`, `sync_runs`, `sync_requests` | ingen | SELECT bak `is_admin()` |
| `watched_areas` | ingen | eget innhold, `user_id = auth.uid()` |
| `notifications` | ingen | via eierskap til `watched_areas` |

### `is_admin()`-modellen

`is_admin()` er `security definer` med `set search_path = public`, og sjekker at kallerens e-post
fra JWT-en står i `admin_users`. Sannheten ligger i databasen, ikke i en liste i koden.
RLS-policyene kaller den på vegne av kalleren, så `authenticated` må beholde EXECUTE på nettopp
denne.

### Skjemaet `net` (pg_net)

`anon` og `authenticated` har USAGE på `net` og EXECUTE på `net.http_post`. Det er gitt av
`supabase_admin` på plattformnivå, og `postgres` kan ikke tilbakekalle en annen rolles grant — et
forsøk er en stille no-op. Vi aksepterer det som en plattformstandard i stedet for å late som om vi
har fjernet det.

Det er ikke nåbart: PostgREST ruter bare til `public`, ikke til `net`. Veien inn går derfor bare
gjennom våre egne funksjoner, og der gjelder to regler:

> Ingen funksjon i `public` som kan **sende** via `net.http_*` skal være kjørbar av `anon` eller `authenticated`.
> Ingen funksjon som i det hele tatt rører `net.*` skal være kjørbar av `anon`.

### `db:verify` håndhever dette

`npm run db:verify` sammenligner den faktiske tilgangsflaten mot listen over, leter etter `net.` i
alle funksjonskropper i `public`, og **avslutter med exit 1 ved avvik**. Det er det som hindrer at
neste funksjon åpner seg selv i det stille. Kjør den etter hver migrasjon som rører funksjoner.

Statement timeout er `3s` for `anon` og `8s` for `authenticated` — Supabase-standarder vi er glade
for, fordi de gjør enkeltspørringer selvbegrensende.

---

## 8. Admin

`/admin` er driftssiden. Den er `dynamic = "force-dynamic"`, `robots: noindex`, og svarer
`cache-control: private, no-store`.

**Innlogging** er Supabase Auth med e-post og passord (`signInWithPassword`). Middleware fornyer
sesjonen, og kjører kun på `/admin`.

**Tilgang** krever at e-posten står i `admin_users`. Tre tilstander:

| Tilstand | Hva brukeren ser |
|---|---|
| Ikke konfigurert | Melding om at Supabase mangler |
| Utlogget | Innloggingsskjema. Generisk feilmelding, ingen brukeropptelling |
| Innlogget, ikke admin | Ingenting. Alle admin-RPC-er returnerer null rader |
| Innlogget admin | Full driftsside |

**Admin kan:** se helsetilstand per provider, dataalder, antall objekter, siste feil, de siste
kjøringene, scheduler-status (jobb, tidsplan, siste kjøring, siste HTTP-status), og legge
«Kjør sync nå» / «Kjør full sync» i kø.

**Admin kan ikke** skrive data direkte. Knappene legger en rad i `sync_requests`; sync-workeren
utfører den. Det er derfor webappen ikke trenger en skrivenøkkel.

> **Tilgangen håndheves i databasen og på serveren, ikke i UI.** Server action-en sjekker sesjonen
> på nytt, fordi en server action kan POST-es direkte uten å gå via siden. Databasefunksjonene
> sjekker `is_admin()` selv. RLS-policyene gjør det samme. Å skjule knappen er ikke en del av
> forsvaret.

**Ny admin:** opprett brukeren i Supabase → Authentication → Users, og
`insert into admin_users (email) values ('…');`

---

## 9. Scheduler

### Hvorfor det ble byttet

GitHubs `schedule` er best effort. Målt over 41,2 timer kjørte den **11 av ~165 forventede
kjøringer**. Alle kjøringene som faktisk skjedde var vellykkede, og begge heartbeat-stegene
lyktes i hver eneste — det var selve utløseren som uteble. Healthchecks flappet derfor konstant
uten at noe var galt med koden. Dokumentert i [docs/drift-scheduler.md](drift-scheduler.md).

### Dagens kjede

**Primær:** Supabase `pg_cron` → `trigger_sync_workflow()` → GitHub `workflow_dispatch` → Actions → worker.

```
cron.job: naboradar-sync-dispatch, '*/15 * * * *', 'select public.trigger_sync_workflow()'
```

Punktligheten er målt: jobben fyrte 0,14 s og 0,21 s etter tikket.

**Reserve:** GitHubs egen `schedule` i `sync.yml` står fortsatt på `*/15 * * * *`. Den er upålitelig,
men gratis å beholde, og fanger opp tilfellet der Supabase skulle være nede.

### Hvordan dobbeltkjøring unngås

Fire uavhengige lag. Selv om begge schedulerne fyrer samtidig, kan ikke samme provider synkes to
ganger:

1. **GitHub concurrency** — `group: naboradar-sync`, `cancel-in-progress: false`. Én kjøring av
   gangen, resten køes.
2. **`claim_next_due_sync()`** — plukker **én** forfalt provider av gangen med
   `for update skip locked`, og stempler `last_attempt_at` i samme transaksjon. En parallell worker
   hopper over raden i stedet for å vente. Én av gangen betyr også at en krasj bare forsinker én
   provider.
3. **`claim_sync_request()`** — samme mønster for admin-køen.
4. **`sync_run_start()`** — stempler kjøringen, så to samtidige kjøringer er synlige i `sync_runs`.

Workeren kjører maks 50 forfalte providere per kjøring (`MAX_DUE_PER_RUN`), og hopper over en
provider den allerede har kjørt i samme runde.

---

## 10. GitHub-token og Vault

Scheduleren autentiserer seg mot GitHub med en **fine-grained personal access token**.

| | |
|---|---|
| Type | Fine-grained PAT, ikke classic |
| Rekkevidde | **Kun** repoet `thomashalm/NaboRadar` |
| Rettigheter | **Actions: Read and write** — og `Metadata: Read-only`, som GitHub krever automatisk. Ingenting annet |
| Utløp | 90 dager |
| Lagring | Supabase Vault, hemmelighetsnavn **`github_workflow_dispatch_token`** |

Tokenet skal **aldri** ligge i repoet, i Netlify, i dokumentasjon, i en vanlig tabell eller i en
logg. `trigger_sync_workflow()` leser det fra `vault.decrypted_secrets` ved hvert kall og bygger
`Authorization`-headeren i minnet.

### Lærdom: argumentrekkefølgen i `vault.create_secret()`

Signaturen er:

```sql
vault.create_secret(hemmelighet, navn, beskrivelse)
```

**Hemmeligheten først, navnet etter.** Snur man dem, havner tokenet i `name`-kolonnen — og den
krypteres ikke. Det skjedde én gang: et ekte PAT lå i klartekst i `vault.secrets.name` til det ble
oppdaget og ryddet. Et token i Vault som kan leses uten å dekrypteres, er ikke i Vault.

### Prosedyrer

**Opprette**

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token
2. Resource owner: kontoen som eier repoet. Repository access: **Only select repositories** → `NaboRadar`
3. Permissions → **Actions: Read and write**. La alt annet stå på No access
4. Kontroller oppsummeringen: 1 repository, 2 permissions
5. Generate token. Kopier verdien rett inn i Supabase SQL Editor — ikke via terminal (shell-historikk) og ikke via chat

**Lagre**

```sql
select vault.create_secret(
  '<LIM_INN_TOKEN_HER>',              -- hemmeligheten FØRST
  'github_workflow_dispatch_token',   -- navnet ETTER
  'PAT som pg_cron bruker til workflow_dispatch'
);
```

**Rotere**

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'github_workflow_dispatch_token'),
  '<LIM_INN_NYTT_TOKEN_HER>'
);
```

**Verifisere** — uten å lese ut verdien:

```sql
select name, created_at from vault.secrets;              -- skal gi nøyaktig én rad
select public.trigger_sync_workflow();                    -- kjør som postgres
select status_code, created from net._http_response
  order by created desc limit 1;                          -- forventet: 204
```

`204 No Content` er GitHubs svar på en vellykket `workflow_dispatch`. `401` betyr feil eller utløpt
token, `403` at Actions-rettigheten mangler.

**Revokere** — slett tokenet i GitHub-UI-et først, deretter raden:

```sql
delete from vault.secrets where name = 'github_workflow_dispatch_token';
```

Mellom revoke og ny lagring står scheduleren stille. `trigger_sync_workflow()` feiler ikke da — den
gir en `notice` i cron-loggen og returnerer. GitHubs egen `schedule` og Healthchecks fanger opp at
kjeden er brutt.

---

## 11. Healthchecks

Healthchecks.io er en **dead man's switch**: den varsler når noe *slutter* å skje.

| | |
|---|---|
| Period | 15 minutter |
| Grace | 25 minutter |
| Varsel etter | 40 minutter uten ping |
| Ping-URL | GitHub-secret `HEALTHCHECK_URL` (uten `/start` eller `/fail`) |

Workflowen pinger tre ganger: `/start` når jobben begynner, ping ved suksess, `/fail` ved fatal
feil. Suksess-pingen er betinget av `success()` — ikke av at noe faktisk ble synket, siden «ingen
kilder forfalt» er et helt normalt utfall. Exit-kode 2 (én provider feilet) blokkerer ikke
heartbeaten; det er varslingens jobb.

Mangler Supabase-nøklene, hopper workflowen over både syncen og heartbeaten — med vilje, slik at
dead man's switchen ikke rapporterer «frisk» for et system som ikke kjører.

> **Healthchecks overvåker hele kjeden, men vet ikke hvilket ledd som røk.** DOWN betyr «ingen ping
> på 40 minutter», ikke «syncen feilet». Feilsøkingen står i [26. Runbook](#26-driftrunbook).

Ping-URL-en er en hemmelighet — den skal ikke i Netlify, ikke i klientkode og ikke i logger.

---

## 12. Sync-arkitektur

### Provider-modellen

En provider er en ren adapter: den henter rå sider og normaliserer dem. Orkestreringen ligger i
`lib/sync/`, ikke i providerne. Se [ADR 001](adr/001-provider-architecture.md).

```ts
interface DataProvider<TRecord> {
  id, name, recordKind: "event" | "area_feature", license, defaultStatus
  fetch(options): AsyncIterable<RawBatch>     // sider, med timeout og retry
  normalize(batch): NormalizeResult           // ren funksjon: { records, rejected, skipped }
  healthCheck(): Promise<ProviderHealth>
}
```

`normalize()` tar en hel batch, ikke én feature, fordi DiBK må gruppere flere features til én
plansak. Den er ren, og derfor enhetstestbar uten nettverk.

### Kjøringen

`npm run sync:worker` gjør to ting i rekkefølge:

1. Tar forespørsler fra `sync_requests` (admin-køen)
2. Kjører providere som er forfalt, én av gangen via `claim_next_due_sync()`

**Provider-isolasjon:** en kilde som feiler stopper aldri de andre. Feilen havner på providerens
egen rad og i `sync_runs`, og workeren går videre. Exit-kode 0 = alt bra, 2 = minst én kilde feilet,
1 = fatalt (ingen database eller ugyldige argumenter).

### Full vs. inkrementell

Bare DiBK støtter inkrementell sync (`supports_incremental`). Inkrementell bruker
`oppdateringsdato` med ett døgns overlapp, og må hente hele `arealplan`-gruppen for berørte planer —
ellers mister vi polygoner.

Områdefakta synkes alltid fullt. Intervallene ligger i `providers`-tabellen:

| Kilde | Synkeintervall | Full sync | Stale etter |
|---|---|---|---|
| `dibk-planning-started` | 180 min | 24 t | 24 t |
| `mdir-forurenset-grunn`, `mdir-industri-tillatelse` | 1 440 min | 24 t | 72 t |
| `nve-kvikkleire-soner`, `nve-nettanlegg`, `udir-skoler`, `udir-barnehager`, `oslo-skjenkebevilling` | 1 440 min | 24 t | 168 t |
| `helsenorge-sykehus`, `omsorgstilbud` | 10 080 min | 168 t | 336 t |

### Vaktene mot stille feil

Målet er å oppdage at en kilde har sluttet å levere **også når den svarer 200 OK med for lite
data**. Terskler i `lib/sync/guards.ts`:

| Vakt | Terskel | Virkning |
|---|---|---|
| Datafall | poster faller mer enn **30 %** mot forrige kjøring vi stolte på | Kjøringen merkes `suspicious`, reconciliation stoppes |
| Referansegrense | under 20 poster i baseline | Prosentregning droppes |
| Avviste features | over **5 %** | Advarsel |
| Avviste features | over **25 %** | `suspicious` |
| Uvanlig vekst | over **3×** | Advarsel, blokkerer ingenting |

**Skriving stoppes aldri** — nye data er som regel riktige. Det som stoppes er full reconciliation,
altså det som markerer alt vi ikke så som «fjernet fra kilden». Objekter slettes aldri; de får
`removed_from_source_at`.

> **Viktig feil systemet nå beskytter mot:** datafallsvakten sammenligner bare mot forrige
> kjøring når kjøringen er et **komplett snapshot**, altså full sync. En inkrementell sync henter
> kun det som er endret, og «3 poster» er da et helt normalt svar — ikke et datafall. Vakter som
> gjelder uansett modus (andel avviste) er fortsatt aktive.

### Stale-deteksjon

En kilde er «stale» når den ikke har levert data vi stoler på innen sin egen grense. En `suspicious`
kjøring teller som feil for stale-detektoren selv om den skrev data — så en kilde som gradvis
begynner å levere for lite, blir stale av seg selv. Advarsel gis når 75 % av stale-vinduet har
passert.

---

## 13. Datakilder

Kun kilder som faktisk er aktive i koden. Se [docs/data-sources.md](data-sources.md) for
testdetaljer og eksempelresponser.

### Synkede kilder (`area_features` og `events`)

| Kilde | Leverandør | Brukes til | Geometri | Rader | Lisens | Begrensninger |
|---|---|---|---|---|---|---|
| Planlegging igangsatt | DiBK | Varslede planoppstarter | Polygon/multipolygon | 1 552 events, 3 139 dokumenter | NLOD 2.0 | Ingen formål, status eller sluttdato i kilden. Kun kommunenummer, ikke navn |
| Forurenset grunn | Miljødirektoratet | Registrerte lokaliteter | Polygon | 15 943 | NLOD 2.0 | Påvirkningsgrad er myndighetens vurdering, ikke en måling |
| Industri med utslippstillatelse | Miljødirektoratet | Industri- og avfallsanlegg | Punkt | 866 | NLOD 1.0 | Kun anlegg med tillatelse. Ikke hovedkontorer |
| Kartlagte kvikkleiresoner | NVE | Undersøkte soner | Polygon | 4 873 | NLOD 1.0 | Generalisert til ~1 m ved henting; største sone har 125 000 hjørner |
| Transformatorstasjoner og kraftledninger | NVE | Kraftinfrastruktur | Punkt og linje | 5 645 | NLOD 1.0 | Kun sentral- og regionalnett. `0 kV` betyr ukjent, ikke null |
| Grunnskoler og videregående skoler | Udir (NSR) | Skoler | Punkt | 3 103 | CC BY 4.0 | — |
| Barnehager | Udir (barnehagefakta) | Barnehager | Punkt | 4 493 | NLOD 1.0 | — |
| Sykehus | Helsenorge ∧ Enhetsregisteret (NACE 86.101) | Sykehus | Punkt | 80 | NLOD 2.0 | **Kurert liste** i `data/sykehus.json`, ikke live-synk. Reverifiseres med `scripts/build-sykehus.ts` |
| Omsorgstilbud | Oslo kommune + Helsenorge | Sykehjem, helsehus, behandlings- og botilbud | Punkt | 367 | NLOD 2.0 | **Kurert liste** i `data/omsorgstilbud.json`. Foreløpig i hovedsak Oslo. Kun steder ansvarlig myndighet selv publiserer med navn og adresse |
| Skjenkebevillinger | Næringsetaten, Oslo kommune | Serverings- og skjenkesteder | Punkt | 1 406 | **Lisens ikke oppgitt av kilden** | Kun Oslo. Bør avklares med Næringsetaten |

### Direkte oppslag (per søk, ikke synket)

For store til å synke, eller svarer bare på «ligger punktet innenfor?».

| Kilde | Leverandør | Brukes til | Merknad |
|---|---|---|---|
| Kvikkleire-aktsomhet | NVE (aktsomhetskart 2024) | Marin leire i skrånende terreng | Ingen dekning → ingen uttalelse. «Utenfor aktsomhetsområde» ville vært misvisende |
| Strategisk støykartlegging | Miljødirektoratet | Lden ved søkepunktet | Modellberegnet, kartlagt 2022 |
| Støysoner veg | Statens vegvesen | Gul/rød sone langs veg | Geonorge blokkerer punktfilter, så Vegvesenets egen tjeneste brukes |
| Støysoner fly | Avinor | Gul/rød sone rundt lufthavn | — |
| Høyspent distribusjonsnett | NVE | Distribusjonsnett | For stort til synk |

### Grunntjenester

| Tjeneste | Brukes til |
|---|---|
| Kartverket adresse- og stedsnavnsøk | `/api/geocode` |
| Kartverket WMTS (topograatone) | Bakgrunnskart. Hentes direkte av nettleseren |
| Geonorge WFS — matrikkelen teig og bygningspunkt | `/api/eiendom` |
| Geonorge adresse-punktsøk | Adresse på valgt eiendom |

---

## 14. Kildepresisjon og tolkningsregler

Disse reglene er kodet i `lib/facts/wording.ts` og dekket av tester. **De skal ikke forenkles.**
Hele poenget er at NaboRadar ikke skal si mer enn kilden gjør.

### Kvikkleire

- **Aktsomhetsområde ≠ påvist kvikkleire.** Aktsomhet er modellert: marin leire i skrånende
  terreng. Teksten sier eksplisitt «Kvikkleire er ikke påvist».
- **Kartlagt sone** er undersøkt, og kan være:
  - `mulig` — «Kvikkleire er ikke påvist – sonen er vurdert som mulig kvikkleire»
  - `paavist_lav_sikkerhet` — påvist, beregnet sikkerhetsfaktor under 1,4
  - `paavist_ikke_vurdert` — påvist, stabiliteten ikke vurdert
  - `paavist_tilfredsstillende` — påvist, sikkerhetsfaktor over 1,4
  - friskmeldte/sikrede soner holdes adskilt
- **Faregrad og risikoklasse gjelder sonen, ikke den enkelte eiendommen.**

### Støy

- Alltid **modellberegning, aldri måling ved boligen**.
- **Lden** er et døgnnivå med tillegg for kveld og natt — ikke «hvor høyt det er nå».
- Strategisk kartlegging dekker bare utvalgte områder og kilder. Ingen treff betyr *ikke* stille.

### Forurenset grunn

- Påvirkningsgrad er **myndighetens vurdering**:
  - 1 — lite eller ikke forurenset, ikke behov for tiltak uansett arealbruk
  - 2 — akseptabel tilstand med dagens arealbruk
  - 3 — ikke akseptabel tilstand, behov for tiltak
  - X — mistanke eller lite informasjon, oppfølging uavklart
- **Grad 1 og 2 er kildens egen konklusjon om at det ikke er noe å følge opp** — de telles ikke som
  «til oppfølging».
- Det skilles mellom at søkepunktet ligger **inne i** en lokalitet og at en lokalitet ligger i
  nærheten. Ligger søkepunktet inne i en grad 3- eller X-lokalitet, løftes seksjonen øverst.
- **Stofftype antas aldri** når kilden ikke oppgir den.

### Planer

- **Planoppstart ≠ aktiv plan.** Kilden har verken status eller sluttdato, så vi sier bare
  «Planoppstart varslet …» og antyder aldri at arbeidet pågår.
- Gjentatte varsler for samme plan slås sammen på `kommunenummer:planId`, men **kun når planId
  faktisk inneholder et tegn** (`/[0-9a-z]/i`). Kilden bruker `-` som plassholder, og uten den
  sjekken ble ubeslektede saker slått sammen.
- Nyeste varsel vises, med historikk under. Varsler innen 30 dager regnes som samme registrering og
  slås sammen stille.

### Skjenkesteder

- Tiden i kilden er **tillatt stengetid** — ikke skjenketid, og ikke stedets faktiske åpningstid.
- Inne- og utetid holdes adskilt og regnes aldri om.
- Bevillingshaver lagres ikke.

---

## 15. Eiendomsfunksjonen

Klikker brukeren i kartet når zoom ≥ **14**, slår `/api/eiendom` opp eiendommen under punktet.

**Slik virker oppslaget:**

1. Teig-WFS spørres med en **bbox rundt klikkpunktet**, ikke med punktet selv. Discovery viste at
   bbox-filteret treffer på representasjonspunktet, ikke på flaten — et lite søk ga null treff selv
   når teigen omsluttet punktet.
2. Vi avgjør selv hvilken teig som **inneholder** punktet (point-in-polygon).
3. Finner vi ingen, **utvides bufferet én gang** (~65 m → ~275 m), slik at store eiendommer også
   finnes. Maks 80 kandidater.
4. Bygninger i teigen og nærmeste adresse hentes parallelt, og er utfyllende: mangler de, viser vi
   eiendommen likevel.

**Caching:** 10 minutter, maks 300 oppføringer, per serverinstans. Nøkkelen er koordinaten avrundet
til fem desimaler. Svaret sendes med `cache-control: private, max-age=60`.

**Klikkprioritet i kartet** (`lib/map/click.ts`) — problemet var at et planpolygon dekker alle
eiendommene inni seg og fanget klikket, slik at et hus inne i et planområde var umulig å trykke på:

| Zoom ≥ 14 | Zoom < 14 |
|---|---|
| 1. punktmarkører — brukeren traff et lite, tydelig objekt og mente det | 1. punktmarkører |
| 2. eiendom/teig — klikk i flaten slår opp eiendommen | 2. store flater er fortsatt primær klikkflate |
| 3. store flater blokkerer ikke lenger | |

**Det vi viser:** matrikkelnummer, areal, bygninger med type (NS 3457-koder vi kjenner — ukjente
koder vises ikke, vi gjetter ikke bygningstype), og nærmeste adresse.

> **Det vi ikke viser, fordi det ikke er åpne data:** eier, BRA, byggeår, salgspris, tinglysninger og
> eiendomshistorikk. Disse krever avtale med Kartverket eller andre rettighetshavere. Ikke bygg noe
> som later som om vi har dem.

---

## 16. Endepunkter

| Rute | Metode | Input | Validering | Upstream | Timeout | Caching | Rate limit |
|---|---|---|---|---|---|---|---|
| `/api/eiendom` | GET | `lat`, `lng` | Zod: `lat` 57–72, `lng` 4–32. Alt annet → 400 | Geonorge WFS ×2 + adresse-API | 8 s totalt, 6 s per kall, 1 retry | `private, max-age=60` + 10 min serverside | 120/min |
| `/api/geocode` | GET | `q` | Zod: 2–100 tegn etter trim | Kartverket adresser + stedsnavn | Per kilde, delvis svar tillatt | `private, max-age=300`, `no-store` ved delvis svar | 120/min |
| `/omrade` | GET (side) | `lat`, `lng`, `radius`, `label`, `sortering` | Zod. Ugyldig `lat`/`lng` → feilside. Ugyldig `radius` → standard 1 km. `label` maks 120 tegn, kontrolltegn fjernet | Supabase + direkte oppslag | 8 s (saker), 8 s (DB), 12 s (oppslag) | Dynamisk | 240/min |
| `/sak/[id]` | GET (side) | uuid + søkekontekst | `get_event` | Supabase | — | Dynamisk | ingen |
| `/` | GET (side) | — | — | — | — | Statisk, Netlify Durable | ingen |
| `/admin` | GET (side) | — | Supabase Auth + `is_admin()` | Supabase | — | `private, no-store` | ingen |
| `/dev` | GET (side) | — | **404 utenfor development** | — | — | — | — |
| `/robots.txt` | GET | — | — | — | — | Statisk | ingen |

Begge API-rutene svarer **405** på POST.

`/dev` og dens server action er beskyttet serverside på `NODE_ENV`, ikke bare ved at knappen er
skjult — en server action kan POST-es direkte.

---

## 17. Rate limiting

Netlify-native, kodebaserte regler i `netlify.toml`. Ingen ekstern tjeneste, ingen in-memory
limiter, ingen hemmelighet i web-runtime.

| Sti | Grense | Aggregering | Handling |
|---|---|---|---|
| `/api/*` | 120 / 60 s | `["ip", "domain"]` | 429, tom kropp |
| `/omrade` | 240 / 60 s | `["ip", "domain"]` | 429, tom kropp |

**Free-planen gir 2 kodebaserte regler per prosjekt.** Dette er begge to.

**Hvorfor redirect og ikke funksjons-config:** Next.js-handleren genereres av OpenNext-adapteren
under Netlifys bygg. Vi skriver den ikke og kan ikke legge en `export const config` i den. En egen
pass-through edge function ville kostet en ekstra invokasjon per forespørsel.

**Hvorfor ikke `from = "/*"`**, som er Netlifys egen «beskytt hele siden»-oppskrift: en målt
sidevisning av `/omrade` er **25 forespørsler mot vårt origin, hvorav 20 statiske**. En regel på
`/*` ville blokkert en normal bruker etter fem sidevisninger. Reglene peker derfor kun på dynamiske
stier, og **statiske assets treffes ikke i det hele tatt** (verifisert: 450 forespørsler mot
`/_next/static/*` og `/vendor/*`, null 429).

**Kartfliser går direkte fra nettleseren til `cache.kartverket.no`** og teller aldri.

**Hvorfor 240 på `/omrade` og 120 på `/api/*`:** én sidevisning av `/omrade` gir fire treff på
regelen — dokumentet pluss tre RSC-prefetcher, én per radiusknapp. 120 ville vært 30 sidevisninger i
minuttet, og ti personer bak samme kontor-IP ville truffet taket. `/api/*` har ett kall per
handling, så multiplikatoren finnes ikke der.

### Egenskaper å kjenne til

- **Håndhevingen er asynkron.** Netlify teller utenfor request-stien for ikke å legge på latens, så
  det tar **inntil 10 sekunder** fra grensen brytes til blokkeringen slår inn. En kort burst slipper
  gjennom. Dette er en kostnadsbrems, ikke et sikkerhetsgjerde.
- **Blokkeringen varer 60 s**, og hvert nytt kall i perioden teller — så en klient som fortsetter å
  hamre, forlenger sin egen utestengelse.
- **IP-en er den Netlify selv ser** på sin side av proxyen, ikke `x-forwarded-for` fra klienten. Den
  kan ikke spoofes.
- **Ingen `Retry-After`.** Netlify sender den ikke for redirect-baserte regler. Plattformbegrensning.
- Et absolutt tak på tvers av *alle* klienter (aggregering per domene alene) er Enterprise-only. Vi
  kan bremse én ondsinnet klient, ikke et distribuert angrep.

### Kjent restrisiko

> **Direkte kall til Supabase RPC omgår Netlify fullstendig.**
> `POST https://<prosjekt>.supabase.co/rest/v1/rpc/features_near` med den publiserbare nøkkelen tar
> aldri veien om oss, og ingen redirect-regel kan telle den.

Det som avgrenser den er databasen selv: `radius_m <= 10000`, `limit least(greatest(max_results,1),1000)`,
og `statement_timeout = 3s` for `anon`. Hvert enkeltkall er tak-satt; det er *antallet* som ikke er
det, og risikoen er tilkoblingspoolen under vedvarende parallell last.

**Hvorfor dette aksepteres nå:** alternativet var å la serveren lese med en hemmelig nøkkel og
revokere `anon` fra de fem lesefunksjonene. Det ville dekket hele flaten, men krevd en secret key i
Netlify og at RLS omgås for alle lesninger. Vi valgte å ikke flytte en hemmelighet inn i
web-runtime for å tette et hull som allerede er avgrenset av en 3-sekunders timeout.

---

## 18. Security headers

Satt i `next.config.ts`, gjelder alle ruter. Verifisert i produksjon.

| Header | Verdi | Status |
|---|---|---|
| `X-Frame-Options` | `DENY` | Håndheves |
| `X-Content-Type-Options` | `nosniff` | Håndheves (Netlify) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Håndheves |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()` | Håndheves |
| `Strict-Transport-Security` | `max-age=31536000` | Håndheves (Netlify) |
| `Content-Security-Policy-Report-Only` | se under | **Kun rapportering** |

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <tile-origin>; connect-src 'self' <tile-origin> <supabase-origin>;
font-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self';
form-action 'self'; object-src 'none'
```

Kartflis- og Supabase-origin utledes fra miljøvariablene, så policyen følger med hvis kilden byttes.
Alt annet er selvhostet: MapLibre fra `public/vendor/`, Geist hentes ned av `next/font` ved bygg.

### Hvorfor CSP fortsatt er Report-Only

Den er testet mot en lokal produksjonsbygg i nettleseren: siden rendrer fullt, kartfliser laster,
ingen brudd fra appen. Det eneste som meldes er `unsafe-eval`, og det kommer fra testverktøyet —
hverken klientbundlene eller MapLibre-vendoren inneholder `eval()` eller `new Function(`.

**Det som skal til for å håndheve:** en periode med ekte trafikk uten nye brudd. Bevisene er der
allerede; det som mangler er dekning av brukerflyter vi ikke har testet manuelt. Å fjerne
`-Report-Only` er en enlinjes endring i `next.config.ts`.

`unsafe-inline` på script er Next.js sin egen oppstartskode. Å bytte til nonce krever at middleware
kjører på hver side, og er et større valg enn dette.

---

## 19. XSS, SSRF og input-validering

Bekreftet i sikkerhetsgjennomgangen 2026-09-25.

**XSS**

- Null forekomster av `dangerouslySetInnerHTML` i hele kodebasen.
- Kartpopupen bygges med `document.createElement` og `textContent`, og settes med
  `setDOMContent()` — ikke `setHTML()`.
- Alle eksterne lenker har `rel="noopener noreferrer"` og `target="_blank"`.
- URL-er normaliseres ved innlesing med `toSafeHttpUrl()`: kun fullstendige `http(s)`-URL-er
  slipper gjennom, vi legger aldri til protokoll og reparerer aldri fritekst.
- Databasen har CHECK-constraints: `area_features.source_url ~* '^https://'`,
  `events.source_url ~* '^https?://'`, `event_documents.url ~* '^https?://'`.
- Kartpopupen kjører `toSafeHttpUrl()` en gang til, fordi det er det eneste stedet en ekstern URL
  settes rett på en DOM-node uten React imellom.
- Empirisk på ekte data: 0 av 31 108 lagrede URL-er har farlig skjema, 0 titler inneholder `<`, `>`
  eller `javascript:`, 0 attributter inneholder `<script`.

**SSRF**

- Alle upstream base-URL-er er hardkodede konstanter.
- Brukerinput kommer bare inn som Zod-validerte **tall** i bbox- og radiusparametre.
- Ingen URL fra en ekstern kilde blir hentet. Ingen vei til localhost, RFC1918, link-local eller
  cloud-metadata.

**Input-validering**

- Koordinater er begrenset til Fastlands-Norge i både API, sideparametre og databasens
  CHECK-constraints.
- `NaN`, `Infinity`, `1e308`, ekstremverdier, 2 000-tegns parametre, SQL-lignende payloads og
  gjentatte parametre gir alle 400.
- Radius faller tilbake til standard ved ugyldig verdi, og er hardt begrenset i SQL uansett hva
  kalleren sender.
- `statement_timeout` på 3 s for `anon` gjør enkeltspørringer selvbegrensende.

---

## 20. GitHub Actions og supply chain

Én workflow: `.github/workflows/sync.yml`.

| | |
|---|---|
| Triggere | `schedule` (*/15) og `workflow_dispatch` |
| Permissions | `contents: read` på workflow-nivå |
| Concurrency | `naboradar-sync`, `cancel-in-progress: false` |
| Timeout | 25 minutter |
| Install | `npm ci` |
| Actions | `actions/checkout@v5`, `actions/setup-node@v5` |

> **Det finnes ingen `pull_request`- eller `pull_request_target`-trigger i repoet.** En tilfeldig
> pull request på det offentlige repoet kan derfor ikke nå produksjonssecrets. Dette er eksplisitt
> verifisert og skal forbli slik.

**Supply chain, målt:**

- `npm audit`: 0 sårbarheter, med og uten dev-avhengigheter
- 604 pakker i lockfilen, alle fra registry.npmjs.org, alle med integrity-hash, lockfileVersion 3
- To postinstall-scripts blant avhengighetene: `esbuild` og `unrs-resolver`, begge kjente
  byggeverktøy
- Eget postinstall: `scripts/copy-maplibre-worker.mjs`, som kopierer MapLibre-workeren til `public/`

**Dependabot** er konfigurert i `.github/dependabot.yml`: ukentlig for npm med patch og minor samlet
i én PR, månedlig for Actions.

**Kjent hardening-punkt:** Actions er pinnet på major-tag, ikke SHA. Begge er førstepart fra
`actions/`, men en flyttbar tag er teknisk sett kode vi ikke kontrollerer. Se
[25. Kjente begrensninger](#25-kjente-begrensninger-og-akseptert-risiko).

**Prinsipp for `npm audit`:** skill mellom faktisk utnyttbart i vår app, build/dev-only, og
transitivt uten reell eksponering. Ikke oppgrader major-versjoner blindt for å få null advarsler.

---

## 21. Progressiv lasting og feiltoleranse

`/omrade` venter ikke på den tregeste kilden. Siden har tre uavhengige strømmer, hver med sin egen
timeout og fallback:

| Strøm | Timeout | Innhold |
|---|---|---|
| Plansaker | 8 s | `events_within` |
| Databasefakta | 8 s | `features_near`, `features_count_near` |
| Direkte oppslag | 12 s | NVE-aktsomhet, støy, distribusjonsnett |

`withTimeout()` løser alltid med en fallback — den kaster aldri. Sidekomponenten venter ikke på noe;
den lager tre løfter og sender dem til klienten, der `<Suspense>` og `use()` tar imot dem
etter hvert.

**Per seksjon** finnes fire tilstander: laster, klar, tom og feilet. En seksjon som venter viser et
skjelett i samme form som det ferdige innholdet, så siden ikke hopper. En seksjon som feilet sier at
vi ikke fikk hentet den — **manglende data presenteres aldri som «ingen treff»**.

Seksjoner som bare bruker databasen (Nærområdet, Forurenset grunn) blir klare før oppslagene.
Seksjoner som venter på et direkte oppslag (Grunnforhold, Støy, Infrastruktur) har egen `<Suspense>`.
Er databasen nede, feiler ikke oppslagsseksjonene — og omvendt.

Kartet tegnes tidlig, og eiendomsoppslaget er isolert fra resten.

Effekten er målt: første synlige innhold gikk fra **4 970 ms til 55 ms** (Oslo, kald cache).

---

## 22. UI-struktur

### Hovedrekkefølge på `/omrade`

1. **Nærområdet**
2. **Planer og saker**
3. **Grunnforhold**
4. **Støy**
5. **Infrastruktur**
6. **Forurenset grunn**

Nærområdet først fordi det er det mest umiddelbart forståelige svaret. Plansakene er viktige, men
mer tekniske, og kommer rett etter.

**Unntak:** ligger søkepunktet inne i en forurensningslokalitet med påvirkningsgrad 3 eller X,
løftes «Forurenset grunn» øverst.

Det finnes **ingen** hovedseksjon som heter Naboklager, Lokale saker eller lignende. Slike saker
hører hjemme som undertyper under «Planer og saker» hvis de noen gang bygges. Dette er testet.

### Kompakt gruppe — mønsteret

Alle seksjoner følger samme form:

- **Oppsummering først:** «2 skoler · 7 barnehager innen 1 km»
- **Maks tre treff** vises før «Se alle …»
- **Detaljer bak utvider**, aldri utbrettet som standard når det er mange treff
- **Ingen dobbel overskrift:** står gruppenavnet allerede i seksjonsoverskriften, gjentas det ikke
  inni
- **Tomme undertyper vises ikke**
- **Sortering på avstand**, nærmest først
- **Kartet viser fortsatt alle relevante objekter**, også de som er kuttet fra listen

Grenser: 3 i forhåndsvisning, maks 30 i en liste, 150 hentede skjenkesteder, maks 30 kartmarkører
for servering. Når listen er kuttet, brukes databasens eget antall i teksten — så «566 steder» er
sant selv om bare 30 vises.

---

## 23. Nærområdet

Fire grupper, alle med det kompakte mønsteret:

| Gruppe | Kategorier | Undertyper |
|---|---|---|
| **Skoler og barnehager** | `oppvekst` | Skoler (grunnskole, videregående), Barnehager |
| **Helse og omsorg** | `helse`, `omsorg` | Sykehus, Omsorgstilbud |
| **Virksomheter og anlegg** | `industri` | Anlegg (vises som kort, ikke kompakte rader) |
| **Servering og uteliv** | `servering` | Steder med skjenkebevilling |

### Inklusjons- og eksklusjonsregler

**Omsorgstilbud** er én felles, nøytral visningstype ut mot brukeren. Den presise interne typen
(sykehjem, barnevern, rusbehandling, psykisk helse, akuttinstitusjon) lagres i dataene, men **vises
aldri** — verken i lista, i popup eller i kildenavnet. Et sted tas bare inn når:

- ansvarlig myndighet selv publiserer **både navn og konkret adresse**
- adressen har husnummer, slik at ingen posisjon er utledet
- stedet er i drift

Sju ideelle institusjoner i Oslos egen barnevernsliste er **utelatt** fordi kommunen ikke publiserer
adressen deres. Fosterhjem og beredskapshjem tas aldri inn. Er det tvil, vises ikke stedet.

**Industri** er kun anlegg med utslippstillatelse. Hovedkontorer importeres ikke som fabrikker.

**Sykehus** er skjæringspunktet mellom Helsenorges liste og Enhetsregisterets NACE 86.101, med
adressededuplisering.

**Skjenkesteder** dekker foreløpig bare Oslo, og det sies i forbeholdet.

Hver gruppe har et forbehold som sier hva som er utelatt, slik at en tom liste ikke leses som
«det finnes ingenting».

---

## 24. Personvern

| Regel | Håndhevelse |
|---|---|
| Ingen eiere eller beboere | Eierfelt hentes aldri. Matrikkelens eieropplysninger er ikke åpne data |
| Ingen bevillingshavere | `EIERNAVN` og `ORGNR` strippes ved normalisering. Testet |
| Ingen berørte parter fra DiBK | Dokument-allowlist i kode **og** CHECK i databasen på type, tittel og mime-type |
| Ingen personnavn fra klagesaker | Lokale klagesaker er ikke bygget. Hadde de vært det, ville kun tittel, dato, etat og lenke vært lov |
| Ingen private hjem | Fosterhjem og beredskapshjem tas aldri inn |
| Institusjoner kun når ansvarlig aktør publiserer stedet | Se [23. Nærområdet](#23-nærområdet) |
| Offentlig navn kan vises | Når det er kildens offisielle, publiserte navn på stedet |
| Søk logges ikke | Adressen ligger bare i URL-en som `lat`/`lng`/`label` |
| En søkt adresse antas aldri å være brukerens bolig | Produktvalg |
| `raw_data` er begrenset | Kun plan-`properties`, ikke dokumentinnhold eller geometri-duplikat |

Verifisert på ekte data: 0 av 36 776 `area_features` har felter som ligner personopplysninger, og
0 av 3 139 dokumenter har blokkert type eller tittel.

---

## 25. Kjente begrensninger og akseptert risiko

Ting vi vet om og bevisst ikke har løst nå.

### Sikkerhet og drift

| | Hvorfor vi lever med det |
|---|---|
| **Direkte Supabase-RPC omgår Netlifys rate limiting** | Avgrenset av SQL-tak og 3 s statement timeout. Å tette det krever en secret key i web-runtime |
| **CSP er Report-Only** | Bevisene tilsier at den kan håndheves, men vi vil se ekte trafikk først |
| **Actions er ikke SHA-pinnet** | Førstepart-actions, lav sannsynlighet. Dependabot følger med |
| **Ingen MFA på admin** | Én bruker, som ikke kan skrive data eller lese personopplysninger |
| **Supabase Free — ingen PITR** | Nesten all data er regenererbar. Se [27. Backup](#27-backup-og-gjenoppretting) |
| **GitHubs `schedule` beholdes som reserve** | Den er best effort og hopper over kjøringer, men koster ingenting og fanger opp at Supabase er nede |
| **Rate limiting er per IP** | Delt NAT (kontor, mobilnett) deler kvote. Derfor 240 på `/omrade` |
| **Netlifys limiter er asynkron** | Inntil 10 s lag. En kort burst slipper gjennom |

### Data og dekning

| | |
|---|---|
| **Skjenkebevillinger dekker bare Oslo** | Næringsetatens register. Lisens ikke oppgitt av kilden — bør avklares |
| **Omsorgstilbud dekker i hovedsak Oslo** | Bygget på kommunens egen publisering |
| **Sykehus og omsorgstilbud er kuraterte filer** | Reverifiseres med scripts, ikke live-synk |
| **DiBK mangler formål, status og sluttdato** | Vi viser bare at oppstart er varslet |
| **DiBK gir kommunenummer, ikke navn** | Detaljsiden viser nummeret |
| **Inkrementell DiBK-sync fanger ikke planer med `oppdateringsdato = null`** | Nattlig full sync dekker det |
| **Kvikkleiregeometri generalisert til ~1 m** | Største sone har 125 000 hjørner |
| **Strategisk støykartlegging dekker utvalgte områder** | Ingen treff betyr ikke stille |
| **Geokodingscachen er per serverinstans** | Serverless — hver instans har sin egen |
| **Datasenter-lag ikke implementert** | Ingen pålitelig offentlig kilde for lokasjon. Vi rekonstruerer ikke steder som bevisst ikke publiseres |
| **Lokale klagesaker ikke implementert** | eInnsyn har ingen dokumentert søke-API, bydelsprotokoller er PDF. Se [docs/lokale-saker-discovery.md](lokale-saker-discovery.md) |

### Utvikling

| | |
|---|---|
| **TypeScript er låst til 6.0.x** | TS 7 mangler det klassiske compiler-API-et som `typescript-eslint` og Next.js-typesjekken bruker |
| **Lokal PGlite tåler én prosess** | CLI og dev-server kan ikke bruke samme lokale database samtidig |

---

## 26. Drift/runbook

### Syncen har stoppet (Healthchecks er DOWN)

Healthchecks vet bare at pingen uteble. Gå gjennom kjeden i rekkefølge — første ledd som er stille,
er det som røk.

1. **Healthchecks** — når kom siste ping, og var det `/start`, suksess eller `/fail`?
   - Kun `/start`, ingen suksess → jobben startet men fullførte ikke. Gå til punkt 4.
2. **`/admin` → scheduler-status** — jobbnavn, tidsplan, aktiv, siste kjøring, siste HTTP-status.
   - `last_http_status` er `null` → ingen token i Vault. Se [10. GitHub-token](#10-github-token-og-vault)
   - `401` eller `403` → tokenet er utløpt eller mangler Actions-rettigheten. Roter det
   - Siste kjøring er gammel → pg_cron kjører ikke. Sjekk i Supabase:
     ```sql
     select jobname, schedule, active from cron.job;
     select start_time, status, return_message from cron.job_run_details
       order by start_time desc limit 10;
     ```
3. **GitHub → Actions → «Sync»** — kom det kjøringer? Ble de utløst av `workflow_dispatch`
   (pg_cron) eller `schedule` (reserven)?
4. **`sync_runs`** — via `/admin` eller `npm run sync:status`. Status, tellere, advarsler, feil.
5. **Provider-logg** — kjør kilden alene og se hele loggen:
   ```bash
   npm run sync:worker -- --provider=<id> --mode=full
   ```

### Scheduler-tokenet er utløpt

Symptom: `last_http_status` viser `401`, Healthchecks går DOWN, men GitHubs egen `schedule` gir
sporadiske kjøringer.

Følg prosedyren i [10. GitHub-token og Vault](#10-github-token-og-vault): opprett nytt token,
`vault.update_secret(...)`, verifiser med `select public.trigger_sync_workflow();` og sjekk at
`net._http_response` gir 204. Slett det gamle tokenet i GitHub til slutt.

Sett en kalenderpåminnelse to uker før 90-dagersfristen.

### En provider feiler

1. `npm run sync:status` — hvilken kilde er kritisk, og hvorfor
2. `/admin` — hentet/avvist/poster, advarsler, siste feil
3. `npm run sync:worker -- --provider=<id> --mode=full`
4. Er kjøringen `suspicious`, har datafallsvakten slått til. Stemmer fallet med kilden, bruk
   «Full sync og godta datafallet» i `/admin`, eller `--force`

### Siden er nede

1. **Netlify** — deploy-status og funksjonslogg. Feilet siste bygg?
2. **Supabase** — prosjektstatus. `npm run db:verify` sjekker tilkobling, PostGIS, RLS og grants
3. **Upstreams** — `/api/geocode?q=oslo` og `/api/eiendom?lat=59.91&lng=10.75`. Feiler bare disse,
   er det Kartverket eller Geonorge, ikke oss

### Skille frontend-, database- og kildefeil

| Symptom | Sannsynlig lag |
|---|---|
| Hele siden er hvit eller 500 | Next.js / Netlify |
| Siden laster, men *alle* seksjoner sier «får ikke hentet» | Supabase eller miljøvariabler |
| Én seksjon feiler, resten virker | Ett direkte oppslag. Sjekk kildens egen status |
| Seksjoner er tomme, men uten feilmelding | Ekte «ingen treff», eller data er ikke synket. Sjekk `data_status()` og `/admin` |
| Kartet er grått | Kartverkets flistjeneste. Appen viser egen melding etter fire feil |
| `/omrade` virker, `/api/eiendom` gir 400 | Validering — koordinaten er utenfor Norge |
| 429 | Rate limiting. Vent 60 s uten å kalle |

---

## 27. Backup og gjenoppretting

**Migrasjonene er source of truth.** Hele skjemaet kan bygges opp fra null med `npm run db:push`.

| Data | Kan regenereres? | Hvordan |
|---|---|---|
| `area_features` (~37 000) | **Ja** | `npm run sync:area`, eller worker per provider |
| `events`, `event_documents` | **Ja** | `npm run sync:dibk` |
| `providers` | Ja | Seedes i migrasjonene |
| `sync_runs`, `sync_requests` | Nei — men kun drifthistorikk | Tap er akseptabelt |
| `admin_users` | **Nei — unikt** | Én rad i dag. Kan gjenopprettes manuelt |
| Supabase Auth-brukere | **Nei — unikt** | Én bruker i dag. Kan opprettes på nytt |
| `watched_areas`, `notifications` | **Nei — unikt når de tas i bruk** | Tomme i dag |

**Full gjenoppretting fra tomt prosjekt** i dag: opprett Supabase-prosjekt → `npm run db:push` →
opprett auth-bruker og rad i `admin_users` → `npm run sync:worker` → legg PAT i Vault → verifiser
med `npm run db:verify`. Tar minutter, ikke timer, fordi dataene er offentlige.

**Point-in-time recovery krever Supabase Pro** og er ikke aktivert. Konsekvensen er i dag nær null,
siden alt av volum er regenererbart. **Det endrer seg i det øyeblikket `watched_areas` tas i bruk** —
da blir det brukerdata som ikke kan hentes tilbake fra noen offentlig kilde, og PITR bør vurderes
før den funksjonen lanseres.

---

## 28. Eksterne tjenester

| Tjeneste | Formål | Hvor konfigureres | Hemmelighet? | Kritisk? |
|---|---|---|---|---|
| **GitHub** | Kode, CI, sync-kjøring | Repo-innstillinger, Actions Secrets | Ja — Actions Secrets | **Ja** — syncen stopper uten |
| **Netlify** | Hosting, deploy, rate limiting | `netlify.toml` + Netlify-UI | Nei (kun `NEXT_PUBLIC_*`) | **Ja** — siden er nede uten |
| **Supabase** | Database, auth, scheduler, Vault | Supabase-dashbord + migrasjoner | Ja — Vault, DB-passord, secret key | **Ja** — ingen data uten |
| **Healthchecks.io** | Dead man's switch | Healthchecks-UI + `HEALTHCHECK_URL` | Ja — ping-URL | Nei — men vi mister varsling |
| **Domeneshop** | Registrar og DNS for `naboradar.no` | Domeneshop, ikke i repoet | Nei | **Ja** — domenet slutter å svare |
| **Kartverket** | Bakgrunnskart, geokoding | Ingen — åpne tjenester | Nei | **Ja** — søk og kart |
| **Geonorge** | Matrikkelen WFS, adressepunkt | Ingen — åpne tjenester | Nei | Nei — kun eiendomsoppslag |
| **DiBK** | Plandata | Ingen | Nei | Nei — data blir stale |
| **NVE, Miljødirektoratet, Udir, Avinor, Statens vegvesen, Oslo kommune, Helsenorge, Enhetsregisteret** | Datakilder | Ingen | Nei | Nei — én kilde av gangen |
| **Resend** | E-postvarsling | GitHub Actions Secrets | Ja | **Ikke aktivert** — se under |

**Resend:** koden støtter det fullt ut (`lib/alerts/transport.ts`), men uten `RESEND_API_KEY` og
`ALERT_EMAIL_TO` logger varslingen bare hva den ville sendt, og avslutter OK. Om nøklene faktisk er
satt i GitHub Actions Secrets kan ikke verifiseres fra repoet. Behandle det som **ikke aktivert**
til noen har sjekket.

---

## 29. Secrets-oversikt

Kun navn og plassering. Ingen verdier.

| Hemmelighet | Hvor den skal ligge | Brukes av | Aktiv? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Netlify + lokal `.env.local` | Webappen. Ikke hemmelig | Ja |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Netlify + lokal `.env.local` | Webappen. Ikke hemmelig — RLS og grants begrenser den | Ja |
| `SUPABASE_SECRET_KEY` | **Kun GitHub Actions Secrets** + lokal `.env.local` | Sync-workeren (service_role). **Aldri i Netlify** | Ja |
| `SUPABASE_DB_URL` | **Kun lokalt** | `db:push`, `db:verify`. Inneholder databasepassordet | Ja |
| `HEALTHCHECK_URL` | **Kun GitHub Actions Secrets** | Heartbeat i workflowen | Ja |
| GitHub PAT | **Kun Supabase Vault**, navn `github_workflow_dispatch_token` | `trigger_sync_workflow()` | Ja |
| `RESEND_API_KEY` | GitHub Actions Secrets | `npm run alerts:check` | **Ukjent — antas ikke aktivert** |
| `ALERT_EMAIL_TO` | GitHub Actions Secrets | Samme | Samme |
| `ALERT_EMAIL_FROM`, `ALERT_ADMIN_URL` | GitHub Actions *variables* (ikke secrets) | Samme | Har standardverdier |

**Verifisert:** ingen ekte hemmelighet finnes i repoet eller i noen av commitene i historikken —
søkt på alle blobs mot mønstre for Supabase-nøkler, GitHub-PAT-er, Resend-nøkler, JWT-er og
Postgres-URL-er med passord. Kun `.env.example` har noen gang vært sporet. `.gitignore` dekker
`.env*.local`.

**Verifisert:** ingen hemmelighet i klientbundlen. Det ene treffet på `sb_secret` er
supabase-js sin egen prefikssjekk.

---

## 30. Viktige kommandoer

Alle fra `package.json`.

### Utvikling

```bash
npm run dev            # utviklingsserver
npm run build          # produksjonsbygg
npm start              # kjør produksjonsbygget lokalt
npm test               # enhetstester, ingen nettverk
npm run test:network   # integrasjonstester mot ekte Kartverket/DiBK
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
```

### Database

```bash
npm run db:push              # kjør migrasjoner mot SUPABASE_DB_URL
npm run db:push -- --dry-run # vis hva som ville blitt kjørt
npm run db:verify            # PostGIS, RLS, grants og data. Exit 1 ved tilgangsavvik
```

### Sync

```bash
npm run sync:worker                                  # det en scheduler kaller
npm run sync:worker -- --provider=<id> --mode=full   # én kilde alene
npm run sync:worker -- --provider=<id> --force       # godta datafall og kjør reconciliation
npm run sync:status                                  # helsetilstand per provider
npm run sync:dibk                                    # full DiBK-sync (-- --mode=incremental)
npm run sync:area                                    # full sync av områdefakta
npm run alerts:check                                 # vurder helse og send varsel (-- --dry-run)
```

### Kuraterte datasett

```bash
npx tsx scripts/build-sykehus.ts          # reverifiser mot kildene (--skriv oppdaterer fila)
npx tsx scripts/build-omsorg.ts           # samme (--forkastet viser hva som ble utelatt)
```

### Supabase (SQL)

```sql
select jobname, schedule, active from cron.job;
select start_time, status, return_message from cron.job_run_details order by start_time desc limit 10;
select status_code, created from net._http_response order by created desc limit 5;
select name, created_at from vault.secrets;
```

---

## 31. Viktige arkitekturbeslutninger

Kort ADR-form. De formelle ADR-ene ligger i [docs/adr/](adr/).

**Hvorfor pg_cron + GitHub Actions**
GitHubs `schedule` er best effort — målt 11 av ~165 forventede kjøringer over 41 timer. pg_cron fyrer
punktlig (0,14 s etter tikket) og koster ingenting ekstra. Workeren beholdes i Actions fordi den
kjører samme Node/TypeScript-kode som lokalt, uten en parallell implementasjon i Edge eller Deno.

**Hvorfor ikke Netlify Scheduled Functions**
Ville krevd en andre implementasjon av workeren i et annet runtime, eller et kall videre til
GitHub — altså samme kjede med ett ledd til. Vi vurderte også Cloudflare Cron Triggers og
cron-job.org; begge ville lagt til en leverandør for noe Supabase allerede kan.

**Hvorfor ikke service_role i Netlify**
Det ville latt oss revokere `anon` fra lesefunksjonene og dekke hele flaten med Netlifys rate
limiting. Prisen er en hemmelighet i web-runtime og at RLS omgås for all lesing. Vi valgte det bort
fordi hullet det tetter allerede er avgrenset av harde SQL-tak og en 3-sekunders timeout.

**Hvorfor direkte Supabase-RPC aksepteres midlertidig**
Se over. Beslutningen bør revurderes hvis trafikken vokser, eller når Supabase Pro gir
Network Restrictions.

**Hvorfor streaming SSR**
Fem datakilder med svært ulik fart. Uten streaming ventet hele siden på den tregeste. Første synlige
innhold gikk fra 4 970 ms til 55 ms.

**Hvorfor eiendomsoppslag er on-demand**
Matrikkelen er for stor til å synke, og det aller meste blir aldri klikket på. Oppslaget gjøres på
serveren for å holde timeout og mellomlagring ett sted, og for at klienten ikke skal kjenne
Geonorge.

**Hvorfor lokale klagesaker ikke er bygd**
eInnsyn har ingen dokumentert søke-API — bare udokumenterte interne endepunkter med opak økt-id.
Bydelsutvalgssaker finnes kun som PDF, og bare én av fjorten har geografisk forankring. En
fritekst-uttrekker ville feilet stille. Full analyse i
[docs/lokale-saker-discovery.md](lokale-saker-discovery.md).

**Hvorfor datasenter-lag ikke er bygd**
Det finnes ingen pålitelig offentlig kilde for lokasjon. Å rekonstruere den fra nettverksspor,
strømforbruk eller satellittbilder er utenfor det vi vil gjøre — vi avslører ikke steder som bevisst
ikke publiseres.

**Hvorfor AI ikke brukes nå**
`lib/ai/types.ts` finnes som typer, ingenting mer. Et sammendrag som overtolker en kilde er verre
enn ingen sammendrag, og hele produktet hviler på at vi ikke sier mer enn kilden gjør. Når det
eventuelt bygges: on-demand, cachet per `(event_id, content_hash)`, aldri på `raw_data` ukritisk.

**Hvorfor ikke scraping av Oslo byggesak**
[ADR 004](adr/004-no-scraping-oslo.md). Ingen dokumentert offentlig API, og scraping av en
innsynsløsning er hverken robust eller ryddig.

---

## 32. Roadmap / idébank

**Alt i denne seksjonen er `Ikke implementert`.** Ingenting her skal leses som at det finnes.

| Idé | Status | Merknad |
|---|---|---|
| Klikk på listeelement → marker i kart | Ikke implementert | Delvis på plass; valg synkroniseres allerede for plansaker |
| Explore map — utforsk uten å søke først | Ikke implementert | |
| Telecom/mobildekning | Ikke implementert | Kildekvalitet ikke undersøkt |
| Eiendomshistorikk, salgspris, eier | Ikke implementert | Krever lovlig tilgang. Ikke åpne data i dag |
| Overvåkede adresser og varsling | Ikke implementert | `watched_areas` og `notifications` finnes i skjemaet, men er tomme og har ingen UI |
| Rapport/PDF | Ikke implementert | |
| Dokumentkontroll | Ikke implementert | |
| Lokale saker (støyklager, bydelsvedtak) | Ikke implementert | Bygges først hvis en strukturert kilde finnes. Kurert datasett er alternativet |
| AI-sammendrag | Ikke implementert | Kun typer i `lib/ai/` |
| NaboRadar Pro | Ikke implementert | Ingen kodebeslutninger tatt for dette |

Neste datalag som er vurdert, men ikke besluttet: flomsoner, skredaktsomhet, radon, ÅDT. Se
[docs/area-facts-discovery.md](area-facts-discovery.md).

---

## 33. Milepæler

Kun store tekniske skift.

| Milepæl | Hva som endret seg |
|---|---|
| Fase 1–2: discovery og arkitektur | Datakilder testet, provider-modell, PostGIS-skjema og ADR-er |
| Fase 3: søk og kart | Kartverket-geokoding, MapLibre, radius, resultatside |
| Fase 4: ekte plandata | DiBK-sync, events i PostGIS, feed og detaljside |
| Hosted Supabase og Netlify med eget domene | Fra lokal PGlite til produksjon på `naboradar.no` |
| Pålitelig sync og `/admin` | `sync_runs`, vakter mot stille datafall, stale-deteksjon, admin bak Supabase Auth |
| Områdefakta | `area_features`, direkte oppslag, kompakte grupper |
| Nærområdet utvidet | Skoler, barnehager, sykehus, omsorgstilbud, skjenkesteder |
| Klikkbar eiendom i kartet | `/api/eiendom`, teig-oppslag og klikkprioritet |
| Progressiv lasting (`b996ceb`) | Tre uavhengige strømmer. Første innhold 4 970 ms → 55 ms |
| Ny hovedrekkefølge (`860fdd7`) | Nærområdet først, Planer og saker som nummer to |
| Scheduler-migrasjon (`1431b93`, `c036947`) | pg_cron utløser workflowen. GitHub `schedule` degradert til reserve |
| Sikkerhetsherding av databasen (`a775ef4`) | Positiv allowlist for grants, kritisk hull lukket, `db:verify` håndhever |
| Sikkerhetsheadere og Dependabot (`aefe64a`) | CSP Report-Only, klikkjacking-vern, Dependabot |
| Rate limiting (`bcba3da`, `e57a2b1`) | Netlify-native regler på `/api/*` og `/omrade` |
