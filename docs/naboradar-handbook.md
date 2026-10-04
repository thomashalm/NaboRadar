# NaboRadar — håndbok

Dette dokumentet beskriver **hvordan NaboRadar faktisk fungerer nå**. Det er ikke en dagbok over
endringer, og ikke en plan for hva vi skal bygge. Der eksisterende dokumentasjon sier noe annet enn
koden, er koden fasit, og dokumentasjonen skal rettes.

**Hva vi skal bygge videre, og i hvilken rekkefølge, står i [data-roadmapen](data-roadmap.md).** Den
er source of truth for dataprioritering: hvilke kategorier som er hygiene og hvilke som er moat,
hva som er vurdert og forkastet, og beslutningsregelen nye datakategorier måles mot.

**Hvordan data lagres, synkes og publiseres — og hvordan modellen skal tåle millioner av romlige
objekter — står i [dataarkitekturen](data-architecture.md).** Les den før et nytt datasett tas inn.

Sist kryssjekket mot repoet: **2026-09-25**. Databasekapitlene (6, 7, 12, 27) ble oppdatert
2026-10-02 etter gjennomgangen av dataarkitekturen. Hyttedelen, §34 og §24 ble kryssjekket
2026-10-03.

**Hva vi bestemte og hvorfor står i [ADR-ene](adr/README.md); hva vi undersøkte står i
[research](research/README.md).** Oversikten over all dokumentasjon er [docs/README.md](README.md),
og regelen for hva som dokumenteres hvor, er [§38](#38-dokumentasjon).

> ## Vedlikehold av dokumentet
>
> **Oppdater håndboken i samme commit** når en endring påvirker arkitektur, datakilder, drift,
> scheduler, auth/admin, database (RLS, grants, migrasjoner), sikkerhet, eksterne tjenester,
> secrets, deploy, større produktprinsipper eller kjente begrensninger.
>
> **Ikke oppdater** for copy-endringer, styling eller trivielle bugfikser uten systempåvirkning.
>
> Håndboka beskriver dagens løsning. Historikk og forkastede spor hører hjemme i research og ADR
> — se [§38](#38-dokumentasjon).

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
[33. Milepæler](#33-milepæler) · [34. Synlighet og indeksering](#34-synlighet-og-indeksering) ·
[35. Privat research](#35-privat-research) ·
[36. Research lifecycle](#36-research-lifecycle-freshness-og-review-kø) ·
[37. Datasenter-enrichment](#37-datasenter-enrichment-og-refresh) ·
[38. Dokumentasjon](#38-dokumentasjon) ·
[Data-roadmap (eget dokument)](data-roadmap.md) · [Dataarkitektur (eget dokument)](data-architecture.md)

---

## 1. Hva er NaboRadar?

NaboRadar svarer på ett spørsmål: **hva er offentlig kjent om området rundt denne adressen?**

Brukeren søker opp en adresse eller et sted, velger en radius (500 m, 1 km eller 3 km), og får en
side som samler offentlige forhold i nærheten: varslede planoppstarter, grunnforhold, støy,
kraftanlegg, skoler, barnehager, sykehus, omsorgstilbud, industri og
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
| **Adresse-først, ikke en turapp** | Alt tar utgangspunkt i en adresse eller et sted. Friluftsdata tas bare inn når de gir lokal innsikt som er vanskelig å få andre steder. Bestilling og ledighet ligger hos den som driver hytta — [ADR 006](adr/006-address-first-not-a-trail-app.md) |
| **Kildene kan være kaotiske. Kjernemodellen skal ikke være det.** | Kildeposter og kanoniske enheter holdes adskilt, kildens verdi skrives aldri over, og rettelser ligger oppå med kilde — [ADR 007](adr/007-chaotic-sources-stable-core.md) |
| **Vis det etaten selv publiserer** | Offentlig visning bruker etatens publiserte produkt, ikke nyeste tekniske endepunkt, og nasjonale lag kontrolleres før publisering — [ADR 008](adr/008-publish-what-the-agency-publishes.md) |
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
  ├─ /api/eiendom ──► Netlify ──► Kartverket Eiendom-API + matrikkelkart-WMS + adresse-API
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
| `area_features` | Alle synkede områdefakta, ~38 000 rader. Inkluderer kategorien `skolekrets`, som er den eneste som besvarer «ligger punktet inne i?» og derfor står utenfor `AREA_SECTIONS` | **Ja** |
| `huts` | Hytter og koier: én rad per fysiske hytte, bygget av kildeposter i `area_features` (kategori `hytte_kilde`). Se [Hytter og koier](#hytter-og-koier) | **Ja** — synk + `refresh_huts()`. Unntak: `last_verified_at` og `review_dismissed`, som settes av mennesker |
| `hut_sources` | Hvilke kildeposter som beskriver hvilken hytte, og hvorfor de ble koblet | Ja, men koblingene bygges på nytt — hyttenes uuid blir da nye |
| `area_feature_categories` | Kategoriregisteret: domene, etikett og `is_public`. `area_features.category` er en fremmednøkkel hit. En kategori som ikke er publisert, returneres ikke av lese-RPC-ene | Ja (seedes i migrasjon) |
| `sync_runs` | Én rad per kjøring: modus, tellere, advarsler, feil | Nei, men kun drifthistorikk |
| `sync_requests` | Kø for «Kjør sync nå» fra `/admin` | Nei, men flyktig |
| `admin_users` | E-poster som slipper inn på `/admin` | **UNIK — må sikres** |
| `watched_areas` | Overvåkede områder per bruker. Tabellen finnes, funksjonen er ikke bygget (0 rader) | **UNIK når den tas i bruk** |
| `notifications` | Varsler knyttet til `watched_areas`. Ikke i bruk (0 rader) | Samme |
| `admin_research_*` | Researchbasen: funn, kilder, reviews, runder og datasenterdetaljer. Se [35](#35-privat-research)–[37](#37-datasenter-enrichment-og-refresh) | **UNIK — må sikres** |

Full oversikt med radantall, indekser og risiko ved skala står i
[dataarkitekturen](data-architecture.md#3-inventar).

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
| `huts_near`, `huts_in_bbox`, `huts_in_municipality`, `huts_search` | Hytter og koier: rundt et punkt (inntil 50 km, nærmest først), i et kartutsnitt, i en kommune, og navnesøk. Svarer bare når kategorien `hytte` er publisert, eller kalleren er admin |
| `get_hut`, `hut_index`, `hut_municipality_counts` | Én hytte på ID-delen av adressen (med lagret høyde); lett indeks (id, navn, type, kommune) for fylkessidene og sitemapen, eventuelt for en liste kommuner; antall per kommune til oversikten på `/hytter`. De to siste utelater `not_public`. Samme synlighet som over |
| `get_hut(ref)` | Én hytte, slått opp på de åtte første tegnene i uuid-en. Til den faste hyttesiden |
| `refresh_huts()` | Kobler kildeposter til hytter og regner de kanoniske feltene på nytt. Kjøres av synken, kun service_role |
| `hut_review_queue()`, `review_hut()`, `set_hut_contact()`, `set_hut_overrides()`, `hut_contact_list()`, `hut_contact_summary()`, `hut_status_queue()`, `review_hut_status()` | Kontrollkøen, avgjørelsen (godkjenn, avvis, slå sammen), lenker og forvalter, overstyring av type og tilgang med offentlig merknad, og adminlisten. Kun innlogget admin |
| `upsert_events`, `upsert_area_features`, `mark_*_removed` | Skriving, kun service_role |
| `sync_run_start/finish`, `sync_due`, `claim_next_due_sync`, `claim_sync_request`, `finish_sync_request`, `expire_stale_sync_requests`, `provider_baseline`, `set_alert_state` | Sync-koordinering, kun service_role |
| `provider_health`, `recent_sync_runs`, `request_sync`, `scheduler_status` | `/admin`, kun innlogget admin |
| `is_admin`, `is_privileged`, `request_claims`, `request_role`, `request_email` | Interne hjelpefunksjoner |
| `trigger_sync_workflow` | Scheduler. Kun `postgres` og `service_role` |

Det finnes tre views, alle interne for admin-funksjonene (`admin_research_review_status`,
`admin_datacenter_overview`, `admin_datacenter_refresh_status`), og ingen materialiserte views.

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
| `anon` | `features_near`, `features_count_near`, `events_within`, `get_event`, `data_status`, `huts_near`, `huts_in_bbox`, `huts_in_municipality`, `huts_search`, `get_hut`, `hut_index`, `hut_municipality_counts` |
| `authenticated` | det samme, pluss `hut_review_queue`, `review_hut`, `set_hut_contact`, `set_hut_overrides`, `hut_contact_list`, `hut_contact_summary`, `hut_status_queue`, `review_hut_status`, `is_admin`, `provider_health`, `recent_sync_runs`, `recent_sync_requests`, `request_sync`, `scheduler_status`, `lookup_source_status` og research-, review- og datasenterfunksjonene — som alle sjekker `is_admin()` selv |
| `service_role` | alt — sync-workeren |
| `postgres` | alt — migrasjoner og pg_cron |

Alt annet er stengt. Spesielt:

- `trigger_sync_workflow()` — kun `postgres` og `service_role`
- `scheduler_status()` — admin-only i praksis: grantet til `authenticated`, men returnerer ingen
  rader med mindre `is_admin()` eller service_role
- `is_privileged()`, `request_claims()`, `request_role()`, `request_email()` — lukket for begge
- `datacenter_search_plan()`, `research_review_interval_for()` — `security definer` uten egen
  tilgangssjekk, og derfor lukket for begge. De kalles bare fra andre funksjoner

**Registrering er åpen i Supabase Auth.** `authenticated` betyr derfor «hvem som helst med en
bekreftet e-post», ikke «admin». En `security definer`-funksjon som er kjørbar av
`authenticated`, må sjekke `is_admin()` selv.

### Tabellrettigheter

Appen går utelukkende gjennom RPC-er og rører ingen tabell direkte. **`anon` har derfor ingen
tabellrettigheter i det hele tatt**, og `authenticated` bare SELECT på admin-tabellene, bak
`is_admin()`.

Fram til 2026-10-02 hadde begge rollene SELECT på `providers`, `events`, `event_documents` og
`area_features`. Appen brukte det ikke, men REST-API-et gjorde: hvem som helst med den
publiserbare nøkkelen kunne lese hele tabellene side for side, uten grensene RPC-ene har på
radius og antall — også `events.raw_data` og `providers.last_error`. Lukket i
`20261018000000_public_read_surface.sql`: de fire lese-RPC-ene er nå `security definer` (fast
`search_path`, harde grenser i kroppen), og tabellgrantene og «offentlig lesing»-policyene er
fjernet.

| Tabell | `anon` | `authenticated` |
|---|---|---|
| `providers`, `events`, `event_documents`, `area_features`, `area_feature_categories`, `huts`, `hut_sources` | ingen | ingen |
| `admin_users`, `sync_runs`, `sync_requests`, `admin_research_*` | ingen | SELECT bak `is_admin()` |
| `lookup_source_status` | ingen | ingen — lest gjennom `lookup_source_status()`, skrevet bare av service role |
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

`npm run db:verify` sammenligner den faktiske tilgangsflaten mot listen over — funksjoner **og
tabeller** — sjekker at alle tabeller har RLS, leter etter `net.` i alle funksjonskropper i
`public`, og **avslutter med exit 1 ved avvik**. Supabase gir ALL på hver nye tabell til `anon` og
`authenticated` som standard, så en ny tabell uten eksplisitt `revoke` stopper kjøringen. Det er det som hindrer at
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

**Direkte oppslag** (flom, radon, stormflo, støy …) synkes ikke, og har derfor sin egen tabell på
`/admin`: siste sjekk, siste OK, siste feil og hvor lenge kilden har feilet sammenhengende. Sync-jobben
kjører `npm run lookups:check` hvert 15. minutt (eget steg med `continue-on-error`), som spør hver kilde
mot et fast punkt i Bjørvika og lagrer utfallet med `record_lookup_check` (bare service role) i
`lookup_source_status`. `/admin` leser `lookup_source_status()` (tom for alle som ikke er admin). Det
finnes ingen anonym skrivevei.

### De tre admin-verktøyene

| Side | Spørsmålet den svarer på |
|---|---|
| `/admin/adresse` | Hva finnes rundt denne adressen? Offentlig resultat pluss intern research |
| `/admin/research` | Hva vet vi om dette funnet? Oversikt, søk, redigering, kilder og kildestatus |
| `/admin/research/utforsk` | Hva finnes i dette datasettet, her? Kart først: plansaker, kvikkleire, kraftnett, forurenset grunn, datasentre, og internt multefunn, tyttebærfunn, kantarellfunn, steinsoppfunn og myr. Høyst to lag samtidig |
| `/admin/kart` | Hvor i landet finnes denne typen funn? Nasjonal geografisk utforskning |

### `/admin/kart` — research-kartet

Kartet er hovedflaten, ikke et tillegg til en liste. Standardutsnittet er **hele Norge**, ikke
Oslo: dette er et nasjonalt verktøy, og et startpunkt i hovedstaden ville gjort resten av landet
til noe man må lete seg fram til. Utsnittet følger **ikke** filtrene automatisk — et kart som
hopper ved hvert avkryssing er umulig å jobbe i. «Vis alle treff» gjør det eksplisitt.

**Datauttrekk:** `research_map()`, egen funksjon og ikke en utvidelse av `research_near`. De to
svarer på ulike spørsmål: radius rundt ett punkt, mot nasjonalt filtersøk uten senterpunkt. Den
returnerer bare feltene kartet og listen viser — beskrivelse, notater og kilder hentes først når
et funn åpnes, slik at et nasjonalt uttrekk ikke drar med seg fritekst per punkt. Funksjonen tar
imot bbox allerede nå, slik at viewport-avgrensning kan slås på uten ny migrasjon.

**Kategorimapping** ligger i `lib/admin/research-map-filters.ts`. De interne kategoriene er for
grove for et kart — «Datasenter / industri / tekniske anlegg» er én kategori i basen, men
datasenter, avfall, pukkverk og kjemisk industri er fire ulike spørsmål. Gruppene skiller derfor
på underkategori der kategorien ikke holder. Nye grupper legges til ett sted.

**Standardvalg:** avviste og arkiverte funn er skjult (de er konkludert research), funn uten
koordinat er skjult (kartet er hovedflaten), og sorteringen er interesse → sikkerhet → tittel.
Avstandssortering gir ikke mening uten et søkepunkt. En ødelagt URL-verdi gir «alle», ikke
«ingenting» — et tomt kart uten forklaring er verre enn å ignorere en ugyldig parameter.

**URL-en er tilstanden.** Bare det som avviker fra standard havner i query-strengen, så
`/admin/kart?kategori=datasenter&drift=planned` er et delbart utsnitt og fram/tilbake virker.

**Førstebildet er kart-først.** Bare det man navigerer med står synlig — søk, kategori og
kommune. Interesse, sikkerhet, status, verifisering, kandidat, undertype og sortering ligger bak
«Filtre (n)». Et kartverktøy som åpner med tolv valgknapper tvinger deg til å bla forbi et skjema
for å komme til kartet; målt på 375 px starter kartet nå 332 px nede.

Det man *har* valgt vises alltid, som chips man kan fjerne enkeltvis — skjulte filtre man ikke
ser er verre enn synlige man ikke trenger. Søk, kategori og kommune er ikke med som chips, siden
de allerede står i hvert sitt felt. Undertype vises bare når den valgte kategorien faktisk deler
seg i undertyper, og det finnes flere enn én i resultatsettet.

På mobil er kart og liste to visninger av samme datasett, med en veksler — ikke begge samtidig.
På desktop står de side om side, med sidebaren på 336 px og kartet på resten (77 % ved 1440 px).

**Klynging** er nødvendig på nasjonalt nivå: anleggene ligger tett i Oslo og Rogaland. Klikk på
en klynge zoomer inn til den sprer seg — den åpner aldri et vilkårlig funn. Enkeltpunktene bruker
samme rolige uttrykk som de interne markørene i adressevisningen, og interessenivået styrer
størrelsen, ikke fargen.

**`/admin/adresse`** er adressesøk for drift: **samme resultatside som brukeren ser**, med intern
research under. Den er ikke en egen implementasjon — den bruker `AreaExplorer` og
`buildAreaView()` akkurat som `/omrade`, og legger sitt eget innhold i `extraSections`-sømmen.
En endring i den offentlige visningen slår derfor gjennom her av seg selv.

| Lag | Delt mellom `/omrade` og `/admin/adresse` |
|---|---|
| `lib/area-view.ts` | Kildene og fristene (8 s / 8 s / 12 s) |
| `components/area/AreaExplorer.tsx` | Layout, kart, valg, seksjoner, eiendomskort |
| `components/area/AreaFacts.tsx` | Seksjoner, grupper, ordlyd |
| `components/area/SkolekretsNotis.tsx` | Skolekretsnotisen |
| `extraSections` | **Kun admin.** Offentlig side sender ingenting inn |
| `basePath` | **Kun admin.** Hvilken side visningen står på |

`basePath` er nødvendig fordi resultatvisningen finnes på to steder. Radiusvelgeren, sorteringen,
«endre sted» og søkefeltet bygger lenkene sine av søkekonteksten, og uten en basesti pekte de alle
på `/omrade` — en operatør ble sendt ut på den offentlige siden ved første klikk, og dermed bort
fra den interne delen av resultatet. Basestien ligger nå i `AreaContext`, så alle fire
lenkebyggerne plukker den opp av seg selv. `buildEventHref` tar den med som `fra` til `/sak/[id]`,
slik at «tilbake» går dit brukeren var. `fra` valideres mot en allowlist (`AREA_BASE_PATHS`) —
en sti fra URL-en skal ikke kunne bli en lenke vi ikke kontrollerer. Offentlige URL-er er uendret:
`fra` settes bare når konteksten ikke er den offentlige siden.

**Intern research ligger øverst**, før det offentlige resultatet, gjennom `leadSections`-sømmen.
Det er den som er grunnen til at en operatør åpner denne siden i stedet for `/omrade` — ikke fordi
den er viktigere enn resultatet, men fordi den er det som ikke finnes andre steder.

Bare **faktiske steder og prosjekter** vises her. Funn om datakvalitet, lisenser og
kildeproblemer er research de også, men de hører hjemme i `/admin/research`; i en adressevisning
ville de fortrengt det operatøren leter etter. Filteret er `erStedsfunn` i
`lib/admin/research-sort.ts`.

**Kildestatus og datadekning** lå tidligere her som «Datakvalitet i området». Den er flyttet til
`/admin/research`: den sier noe om kildene våre, ikke om et bestemt sted, og i en adressevisning
konkurrerte den med research. Logikken er beholdt — `tillitFor` og `assessAll` fra
`lib/sync/health`, slik at «stale» betyr det samme som i `/admin` og i varslingen.

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
gir en `notice` i cron-loggen og returnerer. Healthchecks fanger opp at kjeden er brutt, og den
daglige reserve-schedulen i `sync.yml` sørger for at syncen fortsatt går én gang i døgnet.

### Én primær trigger

**pg_cron er source of truth.** Den sender `workflow_dispatch` hvert 15. minutt, og valget er tatt
fordi kjeden da er synlig der vi ser etter: `scheduler_status()` leser `cron.job`, siste
`cron.job_run_details` og siste utgående kall fra pg_net, så `/admin` kan svare på om det var klokka
som stoppet — ikke bare at en sync uteble. Det var nettopp GitHubs egen cron som sviktet en gang, og
som er grunnen til at dette laget finnes.

GitHubs `schedule` i `sync.yml` sto tidligere på **samme kadens**, `*/15 * * * *`. Resultatet var to
kjøringer av samme worker per kvarter, serialisert av concurrency-gruppen `naboradar-sync` — altså
dobbelt forbruk uten at noen hadde bestemt det, og to mulige kilder til «hvem startet denne».

Den er nå en **bevisst daglig reserve** (`17 5 * * *`): ryker pg_cron, pg_net eller tokenet, går
syncen fortsatt én gang i døgnet mens Healthchecks og `/admin` viser at den primære kjeden er nede.
Regresjonstesten i `tests/sync/request-state.test.ts` feiler hvis noen setter en kvarters-schedule
tilbake i workflowen.

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

### Ekstern ID må bevises stabil

**Et felt som ser ut som en permanent ID er ikke det før det er bevist over flere uttrekk.** Hent
kilden to ganger med tid mellom, og sammenlign ID-mengdene før feltet tas i bruk som `externalId`.
Er overlappet lavt, er det ikke identitet — det er et eksportartefakt.

**Lik objektmengde kombinert med massiv `inserted` og `removed` samtidig er et
datakvalitetssignal**, ikke en normal kjøring. Vakten i `lib/sync/guards.ts` flagger det nå
automatisk, men signalet er verdt å kjenne igjen manuelt også: like mange poster som sist, og
nesten ingen som gjenkjennes, betyr at ID-ene har endret seg og ikke virkeligheten.

Se [Tilfluktsrom](#tilfluktsrom) for tilfellet som ga regelen: DSBs `lokalId` var ny for hvert
uttrekk, og 0 av 556 ID-er var felles mellom to uttrekk et døgn fra hverandre.

### Kjøringen

`npm run sync:worker` gjør to ting i rekkefølge:

1. Tar forespørsler fra `sync_requests` (admin-køen)
2. Kjører providere som er forfalt, én av gangen via `claim_next_due_sync()`

**Etterarbeid:** en provider kan oppgi en databasefunksjon som kjøres etter en vellykket
skriving (`postSyncFn`). Hyttekildene bruker det til `refresh_huts()`. Funksjonen kjøres ikke når
kjøringen feilet eller reconciliation ble hoppet over — da er bildet av kilden ufullstendig.

**Provider-isolasjon:** en kilde som feiler stopper aldri de andre. Feilen havner på providerens
egen rad og i `sync_runs`, og workeren går videre. Exit-kode 0 = alt bra, 2 = minst én kilde feilet,
1 = fatalt (ingen database eller ugyldige argumenter).

### Full vs. inkrementell

Bare DiBK støtter inkrementell sync (`supports_incremental`). Inkrementell bruker
`oppdateringsdato` med ett døgns overlapp, og må hente hele `arealplan`-gruppen for berørte planer —
ellers mister vi polygoner.

Områdefakta synkes alltid fullt. **En full sync skriver i dag om hver rad, også de uendrede**
(`synced_at` oppdateres, og kolonnen står i en indeks). Det er uproblematisk for dagens 38 000
rader og må legges om før første datasett over 100 000 rader — se
[dataarkitekturen](data-architecture.md#13-sync). Intervallene ligger i `providers`-tabellen:

| Kilde | Synkeintervall | Full sync | Stale etter |
|---|---|---|---|
| `dibk-planning-started` | 180 min | 24 t | 24 t |
| `mdir-forurenset-grunn`, `mdir-industri-tillatelse` | 1 440 min | 24 t | 72 t |
| `nve-kvikkleire-soner`, `nve-nettanlegg`, `udir-skoler`, `udir-barnehager`, `oslo-skjenkebevilling` | 1 440 min | 24 t | 168 t |
| `helsenorge-sykehus`, `omsorgstilbud` | 10 080 min | 168 t | 336 t |

### Manuelle sync-forespørsler

«Kjør sync nå» og «Kjør full sync» i `/admin` legger en rad i `sync_requests`. Webappen har ingen
skrivenøkkel — knappen kaller `request_sync()`, og workeren utfører jobben.

```
klikk → pending → (pg_cron dispatcher hvert 15. min) → workeren claimer → running
      → sync_run (trigger «admin») → done eller failed, med sync_run_id
```

| Tilstand | Hva den betyr | Hva UI-et sier |
|---|---|---|
| `pending` < 15 min | Venter på neste dispatch | «Full oppdatering er lagt i kø · forventet oppstart innen 15 minutter» |
| `pending` 15–45 min | Har stått over én kadens | «Venter på neste synk-kjøring · lagt i kø 09:20» |
| `pending` > 45 min | Tre kadenser uten å bli plukket | «Oppdateringen ser ut til å ha stoppet» |
| `running` < 30 min | Kjører | «Oppdaterer nå · startet 09:30» |
| `running` > 30 min | Over ryddejobbens grense | «Oppdateringen ser ut til å ha stoppet» |
| `failed` | Forespørselen feilet | «Siste manuelle oppdatering feilet · 27. september 09:42» |

**Tilstanden beregnes, den lagres ikke.** Alt utledes av tidsstemplene i
`lib/sync/request-state.ts`, ett sted, så `if (pending && alder > 45)` ikke havner i flere
komponenter. Grensene henger på dispatch-kadensen: 45 minutter er tre kvarter, og 30 minutter er
samme grense som `expire_stale_sync_requests()` bruker i databasen — UI-et lager ingen parallell
timeout, det sier bare det ryddejobben kommer til å gjøre. En test binder de to sammen.

**Ingen auto-fail av `pending`.** En forespørsel som ser fastlåst ut blir merket i UI-et, ikke
avbrutt. Årsaken ligger nesten alltid utenfor databasen — dispatch-kjeden — og da er det den som
skal fikses, ikke køen som skal tømmes.

**Feil er synlige.** `provider_health()` returnerer også siste feilede forespørsel, og kortet viser
den **bare når den er nyere enn siste vellykkede kjøring**: en gammel feil skal ikke lyse etter at
problemet er løst. Den endrer aldri providerens helsestatus — den sier noe om én forespørsel, ikke
om dataene. Feilteksten vaskes gjennom `trygtFeilutdrag()`: første linje, kuttet, og med det som
ser ut som tokens eller nøkler fjernet.

**Forespørselen peker på kjøringen.** `sync_requests.sync_run_id` fylles nå av workeren, så kjeden
request → run → resultat kan følges i etterkant. Historikken ligger bak «Manuelle oppdateringer» på
provider-kortet, fra `recent_sync_requests()`.

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
| ID-churn | full sync der under **20 %** av postene gjenkjennes på ekstern ID | `suspicious` — men reconciliation kjøres |

**Skriving stoppes aldri** — nye data er som regel riktige. Det som stoppes er full reconciliation,
altså det som markerer alt vi ikke så som «fjernet fra kilden». Objekter slettes aldri; de får
`removed_from_source_at`.

> **Viktig feil systemet nå beskytter mot:** datafallsvakten sammenligner bare mot forrige
> kjøring når kjøringen er et **komplett snapshot**, altså full sync. En inkrementell sync henter
> kun det som er endret, og «3 poster» er da et helt normalt svar — ikke et datafall. Vakter som
> gjelder uansett modus (andel avviste) er fortsatt aktive.

> **ID-churn er den ene vakten som *ikke* stopper reconciliation.** De andre handler om at kilden
> kan ha levert for lite; da er det riktig å la alt stå. ID-churn er motsatt: dataene er der, men
> under nye ID-er. Lot vi reconciliation stå av, ville forrige generasjon blitt liggende aktiv ved
> siden av den nye, og brukerne fått hvert objekt to ganger. Derfor rydder vi, og roper høyt.
> Vakten ble laget etter DSB tilfluktsrom, der `lokalId` var ny for hvert uttrekk og hver full sync
> opprettet 556 rader og fjernet 556 — med uendret antall aktive, så ingen annen vakt så det. Se
> [Tilfluktsrom](#tilfluktsrom).

### Stale-deteksjon

En kilde er «stale» når den ikke har levert data vi stoler på innen sin egen grense. En `suspicious`
kjøring teller som feil for stale-detektoren selv om den skrev data — så en kilde som gradvis
begynner å levere for lite, blir stale av seg selv. Advarsel gis når 75 % av stale-vinduet har
passert.

---

## 13. Datakilder

Nye kilder vurderes mot [data-roadmapen](data-roadmap.md), som også holder kildekravene: lisens,
geografisk dekning, identitetsstrategi og regelen om at en ekstern ID ikke behandles som permanent
før stabiliteten er bevist over flere uttrekk.

Kun kilder som faktisk er aktive i koden. Se [docs/data-sources.md](data-sources.md) for
testdetaljer og eksempelresponser.

### Synkede kilder (`area_features` og `events`)

| Kilde | Leverandør | Brukes til | Geometri | Rader | Lisens | Begrensninger |
|---|---|---|---|---|---|---|
| Planlegging igangsatt | DiBK | Varslede planoppstarter | Polygon/multipolygon | 1 563 events, 5 633 dokumenter (2026-10-03) | NLOD 2.0 | Ingen formål, status eller sluttdato i kilden. Kun kommunenummer, ikke navn |
| Forurenset grunn | Miljødirektoratet | Registrerte lokaliteter | Polygon | 15 943 | NLOD 2.0 | **Internt fra 2026-10-03**, vises bare i admin. Påvirkningsgrad er myndighetens vurdering, ikke en måling |
| Industri med utslippstillatelse | Miljødirektoratet | Industri- og avfallsanlegg | Punkt | 866 | NLOD 1.0 | Kun anlegg med tillatelse. Ikke hovedkontorer |
| Kartlagte kvikkleiresoner | NVE | Undersøkte soner | Polygon | 4 873 | NLOD 1.0 | Generalisert til ~1 m ved henting; største sone har 125 000 hjørner |
| Transformatorstasjoner og kraftledninger | NVE | Kraftinfrastruktur | Punkt og linje | 5 645 | NLOD 1.0 | Kun sentral- og regionalnett. `0 kV` betyr ukjent, ikke null |
| Grunnskoler og videregående skoler | Udir (NSR) | Skoler | Punkt | 3 103 | CC BY 4.0 | — |
| Barnehager | Udir (barnehagefakta) | Barnehager | Punkt | 4 493 | NLOD 1.0 | — |
| Sykehus | Helsenorge ∧ Enhetsregisteret (NACE 86.101) | Sykehus | Punkt | 80 | NLOD 2.0 | **Kurert liste** i `data/sykehus.json`, ikke live-synk. Reverifiseres med `scripts/build-sykehus.ts` |
| Omsorgstilbud | Oslo kommune + Helsenorge | Sykehjem, helsehus, behandlings- og botilbud | Punkt | 367 | NLOD 2.0 | **Kurert liste** i `data/omsorgstilbud.json`. Foreløpig i hovedsak Oslo. Kun steder ansvarlig myndighet selv publiserer med navn og adresse |
| Skjenkebevillinger | Næringsetaten, Oslo kommune | Serverings- og skjenkesteder | Punkt | 1 406 | **Lisens ikke oppgitt av kilden** | Kun Oslo. Bør avklares med Næringsetaten |
| Skolekretser | Plan- og bygningsetaten, Oslo kommune | Veiledende inntaksområde for barneskole | Polygon | 105 | **Lisens ikke avklart** — tjenesten oppgir «Copyright Plan- og bygningsetaten» | Kun Oslo, kun barnetrinn. Kilden har ingen datostempling, og grensene revideres hver høst |
| Offentlige tilfluktsrom | Sivilforsvaret / DSB, landsdekkende nedlastingsfil fra Geonorge (GML) | Tilfluktsrom i nærheten, med antall plasser | Punkt | 556 | **NLOD 1.0** — «Åpne data», «Ugradert» | Hele Norge. Kilden gir ikke areal, type eller status |

Hyttekildene står for seg, fordi radene deres er kildeposter og ikke det som vises:

| Kilde | Leverandør | Brukes til | Geometri | Rader | Lisens | Begrensninger |
|---|---|---|---|---|---|---|
| N50 Kartdata, bygningstype 956 | Kartverket | Hytter og koier — hovedkilde | Punkt | 55 i piloten (1 880 nasjonalt) | CC BY 4.0 | Ingen stabil ID og ingen WFS. Ingen sengeplasser, sesong eller status |
| Tur- og friluftsruter, `RuteInfoPunkt` | Kartverket | Hytter og koier — sekundærkilde | Punkt | 47 i piloten (1 356 nasjonalt) | Åpne data, ingen vilkår oppgitt | Ujevn kvalitet; typekodene er kontrollert mot N50 |

### Direkte oppslag (per søk, ikke synket)

For store til å synke, eller svarer bare på «ligger punktet innenfor?».

| Kilde | Leverandør | Brukes til | Merknad |
|---|---|---|---|
| Kvikkleire-aktsomhet | NVE (aktsomhetskart 2024) | Marin leire i skrånende terreng | Ingen dekning → ingen uttalelse. «Utenfor aktsomhetsområde» ville vært misvisende |
| Strategisk støykartlegging | Miljødirektoratet | Lden ved søkepunktet | Modellberegnet, kartlagt 2022 |
| Støysoner veg | Statens vegvesen | Gul/rød sone langs veg | Geonorge blokkerer punktfilter, så Vegvesenets egen tjeneste brukes |
| Støysoner fly | Avinor | Gul/rød sone rundt Avinors 44 lufthavner | Geonorge-WMS `wms.stoylufthavn`, `GetFeatureInfo` i EPSG:4326 (lat,lon). Lufthavnens navn fra `lib/facts/lufthavner.ts`, aldri ICAO-koden. Forsvarets flyplasser (Ørland m.fl.) er ikke med. [ADR 015](adr/015-publikumsprodukt-wms-og-kildefeil.md) |
| Flomsoner og flomaktsomhet | NVE | Kartlagt flomsone og aktsomhetsområde for flom | Ett `identify`-kall dekker alle gjentaksintervallene. Analyseområdet avgjør om «utenfor sone» kan sies |
| Skredfaresoner og skredaktsomhet | NVE | Kartlagt faresone, jord-/flomskred, snø-/steinskred | Faresone (utredet) skilles alltid fra aktsomhet (screening) |
| Radonaktsomhet | NGU og DSA | Modellert aktsomhetsgrad for området | NGUs publiserte kart, fire klasser. `GetFeatureInfo` gir ekte punkt-i-polygon. Aldri framstilt som måling i boligen |
| Stormflo og havnivå | Kartverket | 20- og 200-årsnivå i dag, 200-årsnivå med havnivå 2100 | WMS `wms.stormflo_havniva` — samme lag som «Se havnivå i kart» — ett `GetFeatureInfo` for alle lagene, i detaljmålestokk. Punkt i sjøen gir ingen uttalelse. [ADR 015](adr/015-publikumsprodukt-wms-og-kildefeil.md) |
| Høyspent distribusjonsnett | NVE | Distribusjonsnett | For stort til synk |

### Grunntjenester

| Tjeneste | Brukes til |
|---|---|
| Kartverket adresse- og stedsnavnsøk | `/api/geocode` |
| Kartverket WMTS (topograatone) | Bakgrunnskart. Hentes direkte av nettleseren |
| Kartverket Eiendom-API (teig) og matrikkelkart-WMS (areal, bygningspunkt) | `/api/eiendom` |
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

### Skolefilter for offentlig visning

Udirs register fører også eksamenskontor, voksenopplæring, nettskoler, fagskoler og bibelskoler
som skoler. De vises ikke i den offentlige skolelisten (fra 2026-10-04). Dette er et produktfilter,
ikke en retting av kilden: enhetene ligger uendret i databasen og vises i admin, med grunnen.

- **Regel 1, næringskode:** primær næringskode fra registeret som starter med 85.4, 85.5 eller
  85.6 → skjult.
- **Regel 2, smal navneregel**, når koden er ordinær eller mangler: eksamenskontor, privatist,
  voksenopplæring, nettskole, «Karriere …», bibelskole, fagskole. Navn med «skole og …» er
  blandede enheter og skjules ikke av navnet.
- **Ukjent vises.** Uten næringskode gjelder bare navneregelen. En feil hos Udir skjuler aldri en
  ordinær skole.
- **Ikke brukt:** skolekategorien «Voksenopplæringssenter» (53 ordinære skoler har den), elevtall
  og trinn (mangler for mange ekte skoler).
- **Bevisst ikke filtrert:** 11 administrasjonsenheter med ordinær kode. En regel som fanger dem,
  ville også truffet ekte skoler.
- Filteret gjelder `features_near` og `features_count_near`, og dermed alle offentlige lister,
  tellinger og kartmarkører. Skolekrets er ikke berørt.
- Klassifiseringen ligger i `school_units` og oppdateres av `npm run schools:classify` (eget steg
  i sync-jobben, og etter skolesynken). Bare nye og endrede enheter hentes fra Udir. Ingen kall
  mot Udir når en side lastes.
- Reglene bor i `lib/schools/classification.ts`. Bakgrunn og tall:
  [research/skolefilter-offentlig-visning.md](research/skolefilter-offentlig-visning.md).

### Skolevisningen på `/omrade`

Skolelisten var sortert på avstand alene. I sentrum ga det tre videregående skoler øverst, mens
barneskolen lå bak «Se alle». Fra 2026-10-04 velges de tre første slik
(`lib/schools/preview.ts`):

1. nærmeste skole med barnetrinn (1.–7.)
2. nærmeste skole med ungdomstrinn (8.–10.). Er det samme skole som i 1, står den én gang.
3. en grunnskole uten registrerte trinn, hvis den ligger nærmere enn skolene i 1 og 2
4. resten av plassene: de nærmeste grunnskolene som er igjen, også dem uten registrerte trinn
5. først når det ikke finnes flere grunnskoler innen radius: videregående, på avstand

- Mangler barneskole eller ungdomsskole innen radius, står plassen ikke tom — de neste rykker opp.
- Videregående kan stå blant de tre første, men aldri foran en grunnskole som finnes innen
  radius. Den er ikke filtrert bort, og står i «Se alle» som før. Ingen skoler hentes inn
  utenfra valgt radius.
- **Skoler uten trinn** merkes «Skole» og skjules ikke. Vi vet ikke hva slags skole det er, så
  den erstatter aldri barneskolen eller ungdomsskolen — den får plassen ved siden av når den er
  nærmere. Registertypen er fortsatt grunnskole, så den går foran videregående.
- Resten av listen, bak «Se alle», står på avstand. Rekkefølgen i de tre første følger regelen,
  ikke avstanden, så avstandene der kan stå «i ulage».
- **Merking** leses av trinnene: «Barneskole, 1.–7. trinn», «Ungdomsskole, 8.–10. trinn»,
  «Barne- og ungdomsskole, 1.–10. trinn» (alle som har trinn på begge sider av 7./8.),
  «Videregående skole, Vg1–Vg3» og «Skole».
- **Samme betegnelse overalt:** listen, detaljvisningen og kartpopupen bruker `describeSkole`.
  Popupen har betegnelsen på én linje og «Offentlig eierforhold · Utdanningsdirektoratet» på neste.
- Kartutvalget, tellingen («6 skoler innen 1 km»), barnehagene og skolekretsen er ikke berørt.

### Støy

- Alltid **modellberegning, aldri måling ved boligen**.
- **Lden** er et døgnnivå med tillegg for kveld og natt — ikke «hvor høyt det er nå».
- Strategisk kartlegging dekker bare utvalgte områder og kilder. Ingen treff betyr *ikke* stille.
- **Fravær av støytreff skal skilles fra manglende dekning og kildefeil. Når området er kartlagt
  og ligger under laveste kartlagte nivå, vises dette som et eksplisitt resultat.** Fire utfall
  per kilde (vei, bane), avgjort av kildens egne dekningslag i samme oppslag:

  | Utfall | Hvordan vi vet det | Hva som vises |
  |---|---|---|
  | Treff | Punktet ligger i et Lden-polygon | Støykort |
  | Kartlagt, uten treff | Punktet ligger i et byområde (lag 0) eller dekningspolygon (lag 1), men ikke i noe Lden-polygon | «Lavt modellert støynivå fra vei og bane ved søkepunktet.» / «Under 50 dB i støykartene.» |
  | Ikke kartlagt | Punktet ligger utenfor begge dekningslagene | «Området er ikke med i den strategiske støykartleggingen av vei og bane.» |
  | Kildefeil | Et av kallene feilet | Ingen status. Kilden står som «svarte ikke» nederst på siden |

  - I de seks byområdene er alle gater og baner modellert. Utenfor er bare de mest trafikkerte
    veiene (over 3 mill. passeringer i året) og jernbanestrekningene kartlagt, og setningen sier
    det: «… fra de mest trafikkerte veiene …».
  - Bare kilder som faktisk er dekket nevnes. Er bare vei kartlagt, sier vi ingenting om bane.
  - **Når et søkepunkt ligger i et dokumentert dekningsområde, men under laveste kartlagte nivå,
    beskriver NaboRadar dette som «lavt modellert støynivå» for de aktuelle støykildene.** «Lavt»
    er vårt eget ord (produktbeslutning 2026-10-04) og har bare denne betydningen: dekket, svart
    og uten treff. Tallet står alltid på linjen under («Under 50 dB i støykartene.»), så ordet
    kan etterprøves. Laveste intervall er 50 dB; 55 dB for jernbane utenfor byområdene.
  - **Vurderingen gjelder konkrete støykilder, ikke all mulig lokal støy.** Derfor «modellert» og
    «fra vei og bane». Vi skriver aldri «stille», «lite støy», «ingen støy», «svært lavt» eller
    «ved boligen».
  - «Lavt» brukes aldri når området ikke er kartlagt, når dekningen er ukjent, eller når
    oppslaget feilet. Ordet brukes heller ikke om nivåer som faktisk har et treff — der står
    Lden-intervallet og T-1442-grensene.
  - Finnes det andre støyfunn, står resultatet for den andre kilden som én egen linje nederst i
    gruppen: «Lavt modellert støynivå fra bane ved søkepunktet (under 50 dB i støykartet).»
    «Ikke kartlagt» tas ikke med da.
  - Statusen gjelder bare strategisk kartlegging. Støyvarselkartet for veg og flystøysonene har
    ikke dekningslag, så der sier fravær av treff ingenting.
- **Tallet er et kartnivå, ikke et nivå ved huset** (regler fra 2026-10-04). Strategisk
  kartlegging er beregnet 4 m over bakken, punktet er et adressepunkt og ikke en fasade, og
  intervallgrensene ligger få meter fra hverandre. Teksten er derfor «Modellberegnet kartnivå ved
  søkepunktet. Kan variere over korte avstander.» — ikke «Ved søkepunktet» alene. Bakgrunn:
  [research/stoy-langmyrgrenda.md](research/stoy-langmyrgrenda.md).
- **Intervallet står alltid med T-1442s grenser som referanse**, per kilde: vei gul fra 55 dB og
  rød fra 65 dB, bane gul fra 58 dB og rød fra 68 dB. Ligger hele intervallet under gul grense,
  står det «Under gul støysone (gul fra 55 dB)». Ellers står bare grensene. Vi sier aldri at
  nivået *er* eller *tilsvarer* en støysone: strategisk kartlegging er ikke et støysonekart, og et
  intervall på 5 dB kan ligge på begge sider av en grense (bane 55–59 mot gul fra 58).
- **Ingen egne ord for nivåer med treff.** «Moderat» og «høyt» har ingen offisiell dekning. «Lavt»
  brukes bare om ett tilfelle: kartlagt og under laveste intervall, se under.
- **50–54 dB vises**, men som det er: under gul støysone.
- **Banelagets tall er nedre grense i et intervall på 5 dB** («65» er 65–69 dB, slik kildens
  tegnforklaring sier). 75 er det åpne toppintervallet.
- **I storbylaget er alle gater modellert**, ikke bare de store veiene. Kortet sier «Modellert for
  alle gater i byområdet», og vi navngir ikke en vei kilden ikke oppgir.
- **Lden forklares én gang**, nederst i støygruppen: «Lden er gjennomsnittlig støynivå over døgnet,
  der kveld og natt teller ekstra.»
- Kortene gjentar ikke «ved søkepunktet» når gruppen sier det. En sone i nærheten beholder avstanden.
- De rene T-1442-sonekortene (støyvarselkart for veg, flystøy) er uendret.

### Forurenset grunn

> **Produktbeslutning 2026-10-03:** Forurenset grunn beholdes som internt/admin-datasett, men
> vises ikke lenger i offentlig `/omrade` fordi normal nærliggende forekomst har begrenset verdi
> for boligkjøpsbeslutningen.
>
> - Datasettet, synken (`mdir-forurenset-grunn`), admins adressevisning og researchen er uendret.
> - Kategorien `miljo` er avpublisert i `area_feature_categories` (migrasjon
>   `20261101000000_miljo_internal.sql`). Lese-RPC-ene `features_near` og `features_count_near`
>   returnerer upubliserte kategorier bare til innlogget admin.
> - Offentlig spør vi ikke etter kategorien (`contaminatedScope: "ingen"`), seksjonen er merket
>   `internal` i `AREA_SECTIONS` og er ikke med i rekkefølgen, skjelettet, kartet, kildelisten eller
>   forsideteksten.
> - Admins adressevisning leser med den innloggede klienten (`supabaseDbForClient`) og
>   `contaminatedScope: "alle"`.
> - `data_status()` lister fortsatt kilden med navn og siste synk. Det er driftsstatus, ikke
>   presentasjon.
>
> Punktene under beskriver datasettet og admins visning. Regelen om «bare relevante funn offentlig»
> gjaldt fram til 2026-10-03 og er beholdt som historikk.

- Påvirkningsgrad er **myndighetens vurdering**:
  - 1 — lite eller ikke forurenset, ikke behov for tiltak uansett arealbruk
  - 2 — akseptabel tilstand med dagens arealbruk
  - 3 — ikke akseptabel tilstand, behov for tiltak
  - X — mistanke eller lite informasjon, oppfølging uavklart
- **Grad 1 og 2 er kildens egen konklusjon om at det ikke er noe å følge opp** — de telles ikke som
  «til oppfølging».
- **Fram til 2026-10-03 viste offentlig bare relevante funn:** grad 3, grad X og lokaliteter der tiltak pågår
  (`prosessStatus = tiltakIgangsatt`). Finnes ingen slike innen radiusen, vises ikke seksjonen i
  det hele tatt — ingen «0 funn» og ingen «alt er trygt». Grad 1 og 2 skjules også når søkepunktet
  ligger i lokaliteten, og «oppfølging uavklart» alene gjør dem ikke relevante: et gammelt deponi
  «lite eller ikke forurenset, uten behov for tiltak» skal ikke få en seksjon som heter
  «Forurenset grunn». Alder filtrerer ikke; et gammelt grad 3-funn vises fortsatt.
- Regelen er presentasjon, ikke data: alt synkes og lagres som før, og admins adressevisning
  (`buildAreaView({ contaminatedScope: "alle" })`) viser alle registreringene med «Se alle» og kart.
- Det skilles mellom at søkepunktet ligger **inne i** en lokalitet og at en lokalitet ligger i
  nærheten. Ligger søkepunktet inne i en grad 3- eller X-lokalitet, løftes seksjonen øverst.
- Datoen på kortet er kildens `oppdateringsdato` og vises som «Kildedata sist oppdatert {år}» —
  når registreringen sist ble endret hos Miljødirektoratet, ikke en fersk vurdering av stedet.
- **Stofftype antas aldri** når kilden ikke oppgir den.

### Planer

- **Planoppstart ≠ aktiv plan.** Kilden har verken status eller sluttdato, så vi sier bare
  «Varslet …» og antyder aldri at arbeidet pågår. Forbeholdet står én gang over lista: «Vi vet ikke
  om planene senere er vedtatt, endret eller lagt bort.» Ordet «aktiv» brukes ikke.
- **Dekning:** bare varsler fra private forslagsstillere (foretak og privatpersoner), fra mai 2024.
  Kommunale og statlige planer er ikke komplett dekket. Vedtatte planer og byggesaker er ikke med.
  Tom tilstand sier derfor «Ingen varslede planoppstarter fra private forslagsstillere innen …», og
  «Kilde og metode» sier at manglende treff ikke betyr at ingenting planlegges.
- **Tiltakstype og formål** (Planer og saker v2, trinn 1, [ADR 016](adr/016-plansaker-deterministisk-uttrekk-og-relevans.md)):
  - Synken henter dokumenttypene `ref-data-as-pdf`, `PlanomraadePdf`, `ReferatOppstartsmoete`,
    `Planinitiativ` og `Planvarsel`. Andre typer («Annet», «Planprogram», kart i SOSI/GML) er ikke
    vurdert og hentes ikke. Berørte parter hentes aldri.
  - `npm run plans:enrich` (steget «Plansaker» i sync-jobben) leser tekstlaget i PDF-ene og lagrer
    resultatet i `event_enrichment`. Dokumentteksten lagres aldri. Reglene har versjonsnummer
    (`PLAN_PARSER_VERSION`); endres det, leses alle saker på nytt.
  - **Formålet** er én setning, ordrett fra dokumentet, i denne rekkefølgen:
    1. en eksplisitt formålssetning i skjemafeltet «Hensikten med planarbeidet» i varselet,
    2. en eksplisitt formålssetning i planinitiativet,
    3. en eksplisitt formålssetning i varselet, deretter i referatet fra oppstartsmøtet,
    4. første setning i skjemafeltet, som den står.

    Kuttede setninger, innholdsløse setninger («i tråd med overordnet plan», «se vedlegg») og
    tekstlag med tapte ligaturer forkastes. Finnes ingen ren setning, vises ingenting i stedet.
  - **Tall fra fri tekst vises ikke.** Mengder i sitatet erstattes med «[…]». Gnr/bnr, husnummer,
    vegnummer og årstall blir stående. Ingen uttrekk av antall boliger, etasjer, BRA, høyder eller
    parkeringsplasser.
  - **Tiltakstypen** kommer fra en ordliste (`lib/plans/tiltakstype.ts`): tittelen først, så
    formålets hovedledd. Gateadresser er ikke signaler. Peker signalene to veier, blir typen
    «Planarbeid». En mindre endring av en gjeldende plan vises som «Planendring».
  - **Rekkefølgen** («Mest relevant») er en regel, ikke en poengsum (`lib/plans/visning.ts`):
    1. stedet ligger i planområdet, eller et nytt planarbeid har kant innen 300 m,
    2. øvrige saker,
    3. planendringer mer enn 500 m unna.

    Innenfor hver gruppe: avstand i trinn på 100 m, kjent tiltakstype før ukjent, større planområde
    før mindre, nyeste først.
- Gjentatte varsler for samme plan slås sammen på `kommunenummer:planId`, men **kun når planId
  faktisk inneholder et tegn** (`/[0-9a-z]/i`). Kilden bruker `-` som plassholder, og uten den
  sjekken ble ubeslektede saker slått sammen.
- Nyeste varsel vises, med historikk under. Varsler innen 30 dager regnes som samme registrering og
  slås sammen stille.

### Skolekrets

- Området er **veiledende**. Utdanningsetaten reviderer grensene hver høst.
- Kapasitet kan gi tilbud ved en annen skole. Vi skriver aldri «din skole», «du sogner til» eller
  noe som kan leses som en garanti for skoleplass — kun **«Adressen ligger i …»**.
- **Avstand er meningsløst her.** En krets 200 meter unna er naboens, ikke adressens. Oppslaget
  filtrerer på at polygonet faktisk dekker punktet, og vi gjetter aldri på nærmeste skole.
- Dekkes punktet av null kretser, sier vi ingenting. Dekkes det av flere, er kilden i uorden, og
  vi velger ikke én av dem.
- **Gjelder bare barnetrinnet.** På ungdomstrinnet følger tilhørigheten hvilken barneskole eleven
  har nærskolerett ved — en oppslagstabell, ikke en egen geografi. Den er ikke bygget.
- Kretsnavnet er ikke alltid skolenavnet: kretsen «Majorstua» hører til Majorstuen skole, og
  «Svarttjern og Tiurleiken» deles av to skoler. Koblingen ligger kuratert i
  `data/skolekretser.json`, aldri som navnegjetting i kjøretid.

### Naturfare

Flom, skred, radon og stormflo ligger sammen med kvikkleire i seksjonen **Naturfare**. Alle fem er
**direkte oppslag**, ikke providere: det er landsdekkende polygonlag med hundretusener av flater, og
spørsmålet er «ligger denne adressen innenfor?». `JordFlomskredAktsomhet` alene har 503 461
polygoner. Å kopiere dem inn i Supabase ville gitt lagring og vedlikehold uten å svare bedre.

#### Aktsomhet er ikke fare

Dette skillet styrer all ordlyd, og kildene har det selv:

| | Hva det er | Hva vi skriver |
|---|---|---|
| **Aktsomhetsområde** | Landsdekkende screeningkart, modellert fra terreng og løsmasser | «Aktsomhetsområde for …» — området bør undersøkes nærmere |
| **Kartlagt sone / faresone** | Detaljert utredning på et utvalgt sted, med gjentaksintervall | «Innenfor kartlagt …» med nivået kilden oppgir |

Ingen av dem blir «høy fare», «flomfarlig bolig» eller en samlet risikoscore. Det finnes ingen score.

#### Per faretype

| Tema | Kilde og tjeneste | Dekning | Hva «ingen treff» betyr |
|---|---|---|---|
| **Flom** | NVE `Flomsoner2` (lag 0 analyseområde, 13–22 sonene) og `Flomaktsomhet` (lag 1 sone, lag 2 dekning) | Flomsoner: utvalgte vassdrag. Aktsomhet: landsdekkende | Utenfor analyseområdet sier vi ingenting. Innenfor sier vi «utenfor kartlagt flomsone» — ikke «ingen flomfare» |
| **Skred** | NVE `Skredfaresoner3` (lag 0 kartleggingsområde, 6–8 samlet, 10/14/18/22 per type), `JordFlomskredAktsomhet` **lag 1**, `SkredSnoSteinAkt` (lag 0 sone, lag 1 dekning) | Faresoner: utredede områder. Aktsomhet: landsdekkende | Ingen uttalelse. Flatt terreng gir ingen rader |
| **Radon** | NGU WMS `RadonWMS2`, laget `Radon_aktsomhet` — tjenesten bak geo.ngu.no/kart/radon. Punktoppslag med `GetFeatureInfo` | Landsdekkende | Kartet dekker ikke punktet. Ikke at radon er utelukket |
| **Stormflo** | Kartverket WMS `wms.stormflo_havniva` (lagene `stormflo20ar_klimaarna`, `stormflo200ar_klimaarna`, `stormflo200ar_klimaar2100`; port `stormfloovreestimat_klimaar2150`; sjø `middelhoyvann_klimaarna`). Til 2026-10-03: WFS `wfs.stormflo_havniva` | Kyst | Ingen uttalelse i innlandet, høyt over sjøen eller i sjøen |
| **Kvikkleire** | Uendret: synkede soner + aktsomhetskart som direkte oppslag | Se over | Uendret |

Alle fem er **NLOD**.

#### Nivåene vi viser, og de vi ikke viser

- **Flom:** alle gjentaksintervaller kilden har (10–1000 år, med og uten klimapåslag). Det strengeste
  — lavest gjentaksintervall — er hovedlinjen, resten står under «Detaljer».
- **Skred:** 1/100, 1/1000 og 1/5000, som følger sikkerhetsklassene i byggteknisk forskrift.
- **Stormflo:** 20- og 200-årsnivå med dagens havnivå, og 200-årsnivå med havnivå i 2100. 500-,
  1000-års- og øvre-estimat-scenarioene vises **ikke** — de gjør ikke svaret mer brukbart. Det
  tilsvarer F1 og F2, «Nå» og «2100», i Kartverkets «Se havnivå i kart». `Middelhøyvann` vises ikke,
  men brukes som sjø/land-kontroll: stormfloflatene dekker sjøen også, og et punkt innenfor dagens
  middel høyvann får ingen stormflovurdering.

#### Punkt-i-polygon, ikke nærhet

Naturfare svarer på om **adressen** ligger innenfor. Ingen av oppslagene bruker søkeradiusen, og
ingen av dem sier «flomsone 180 m unna» — det ville lest som om eiendommen var berørt. Kvikkleire
beholder sin radiusvisning, som før.

#### To feil QA mot ekte adresser avdekket

Begge ville passert en enhetstest, og begge er verdt å huske:

1. **`JordFlomskredAktsomhet` lag 0 er et rasterisert oversiktslag** uten geometritype, ment for
   utzoomet kartvisning. `identify` mot det ga treff **overalt** — også på flat bygrunn på
   Grünerløkka og i Lillestrøm sentrum. Polygonene ligger i lag 1. Samme felle finnes i
   `Skredfaresoner3`, der «Samlet» og de typevise gruppene er gruppelag uten geometri.
2. **Kartverkets `Dekningsområde` dekker praktisk talt hele landet.** Brukt som port ga det «ikke
   berørt av kartlagte stormflonivåer» på Elverum og i Lillestrøm. Porten er nå det ytterste
   scenarioet kilden har (øvre estimat 2150): treffer ikke det, er adressen ikke i spill.

3. **Stormflolagene svarer tomt i for grov målestokk.** Scenariolagene i WMS-en har
   `MaxScaleDenominator` 80 000; et `GetFeatureInfo` med for stort utsnitt gir **tomt svar** også midt
   i en oversvømt flate. Utsnittet er derfor ±0,00005° på 3×3 piksler (`lib/facts/lookups/wms.ts`).
   Og svarblokken heter ikke alltid som laget vi spør etter (Avinor: `stoylufthavn_layer`, ikke
   `stoylufthavn_wms_layer`) — en enhetstest med påfunnet svar fanget det ikke; nettverkstesten gjorde.

`npm run qa:naturfare` kjører ti kjente adresser mot de ekte tjenestene og skriver ut hva hver av
dem gir. For radon sammenlignes klassen mot NGUs publiserte kart, og skriptet avslutter med
exit-kode 1 ved avvik. Kjør den etter endringer i lagvalg, terskler eller ordlyd.

#### Flere versjoner av samme datasett

**Når en offentlig etat har flere tekniske datasett eller versjoner av samme tema, skal NaboRadar
ikke automatisk velge det nyeste endepunktet. For offentlig visning skal vi først finne ut hvilket
produkt etaten faktisk publiserer og ber brukerne forholde seg til, og bruke det.**

Et nyere teknisk datasett kan brukes internt og i research, tydelig merket. Men det offentlige
resultatet skal ikke avvike fra etatens publiserte produkt uten en eksplisitt og dokumentert
beslutning — for brukeren skal kunne slå opp svaret vårt hos kilden og finne det samme.

Slik finner du ut hvilket produkt som er det publiserte: **åpne etatens eget kart og les hvilke
tjenester siden faktisk kaller.** Ikke gå etter navn i en datakatalog. To tjenester kan hete det
samme, ha samme produktnavn og samme eier, og likevel svare ulikt på samme punkt.

**Radon er caset som ga regelen.** NGU har to samtidige produkter:

| | Publisert kart | «Versjon 2» |
|---|---|---|
| Tjeneste | WMS `RadonWMS2`, lag `Radon_aktsomhet` | OGC API Features `radonaktsomhet` + `RadonUranAktsomhetWMS` |
| Publisert | 2014-produktet | September 2026 |
| Klasser | Særlig høy · Høy · Moderat til lav · Usikker | megetHøy · høy · middels · lav · usikker |
| Lenket fra ngu.no | ja | nei |

Vi hadde koblet oss på v2 fordi det var nyest og hadde det reneste API-et. På **40 av 40** testede
steder over hele landet ga de to produktene ulik klasse. Langmyrgrenda 26C i Oslo ble vist som
«Meget høy» hos oss og «Moderat til lav» i NGUs eget kart. Vi var ikke faglig feil — vi var
uetterprøvbare, og det er like ille for et produkt som lever av at folk kan kontrollere oss.

Bytter NGU sitt publikumskart til v2, bytter vi med. Det skal være en bevisst endring med ny QA,
ikke noe som skjer fordi et endepunkt ble oppgradert.

#### Kart

Naturfare tegnes **ikke** i kartet. Oppslagene henter ikke geometri — de spør bare om punktet ligger
innenfor — og fem store polygonlag samtidig ville gjort kartet uleselig uten å svare på noe kartet
ikke alt svarer på. Skal det inn senere, hører det sammen med valgt rad, ikke som standardlag.

### Tilfluktsrom

- **Kilden er den landsdekkende nedlastingsfila, ikke WFS-en** (fra 2026-10-04).
  `https://nedlasting.geonorge.no/geonorge/Samfunnssikkerhet/TilfluktsromOffentlige/GML/Samfunnssikkerhet_0000_Norge_25833_TilfluktsromOffentlige_GML.zip`
  — utgitt av DSB, NLOD 1.0, og distribusjonen datasettets metadata peker på. Metadata oppgir
  oppdatering «etter behov». Uttrekket kontrollert 3. oktober 2026 var bygget samme natt.
  Faktisk publiseringsfrekvens er ikke bekreftet. WFS-en (`wfs.geonorge.no/skwms1/wfs.tilfluktsrom_offentlige`) svarte HTTP 500 og er
  ikke lenger i bruk, heller ikke som reserve: én kilde skriver til datasettet.
- **Fila valideres før noe skrives.** Tom fil, manglende nøkkelfelt (`romnr`, `posisjon`,
  `plasser`, `adresse` i under 90 % av rommene), annet koordinatsystem enn EPSG:25833, eller
  koordinater som ikke er meter i Norge, er en feil — ikke «0 rom». Kjøringen feiler, og ingenting
  skrives eller markeres som fjernet. Helsesjekken gjør samme nedlasting og validering.
- **Rom som mangler i et gyldig uttrekk** markeres som fjernet av den vanlige avstemmingen. Fila
  er et komplett nasjonalt uttrekk, så det er riktig — men vakten stopper avstemmingen hvis
  antallet faller mer enn 30 % (`lib/sync/guards.ts`). Ingen egen regel for tilfluktsrom.
- **Koordinatene er UTM 33 for hele landet** og regnes om med Krüger-rekkene
  (`utm33ToWgs84Exact`). Den korte rekkeutviklingen i `utm33ToWgs84` bommer med inntil 42 m i
  Finnmark og skal ikke brukes på landsdekkende filer.
- **Kun offentlige.** Datasettet heter «Tilfluktsrom – Offentlige», og det er hele avgrensningen:
  private tilfluktsrom publiseres ikke av DSB. Det finnes ingen private rader å filtrere bort.
- **`plasser` er rommets dimensjonering**, ikke ledige plasser i dag. Vi skriver «Dimensjonert
  for 620 personer», aldri «620 ledige plasser», «garantert plass» eller «her får du plass».
- Ett av de 556 rommene har `plasser = 0` i kilden. Det betyr at tallet ikke er satt, ikke at
  rommet er fullt — da vises kapasitet ikke i det hele tatt.
- **Avstand er luftlinje fra søkepunktet, ikke en anbefalt rute.**
- Et tilfluktsrom i nærheten er **ikke en anvisning om hvor noen skal gå**. Forbeholdet viser til
  myndighetenes egen varsling, og teksten er nøktern med vilje — dette er referanseinformasjon,
  ikke et varsel.
- **Areal, type og status finnes ikke i kilden**, og vi finner dem ikke på. Feltene vi har er
  `lokalId`, `romnr`, `plasser`, `adresse` (en stedsbeskrivelse, ikke en ren adresse) og punkt.
- **`romnr` er identiteten, ikke `lokalId`.** `lokalId` ser ut som en varig UUID, men DSB genererer
  den på nytt for hvert uttrekk: to uttrekk et døgn fra hverandre hadde **0 av 556** ID-er felles,
  mens `romnr` hadde **556 av 556** og koordinatene var identiske til sju desimaler. Med `lokalId`
  som nøkkel opprettet hver full sync 556 nye rader og markerte 556 gamle som fjernet, uten at
  antallet aktive endret seg — så datafallvakten så ingenting.
  Adresse og koordinat ble vurdert og forkastet som nøkkel: tre stedsbeskrivelser brukes av flere
  rom, fire koordinater deles av to rom hver, og to par — romnr 2127/2128 på «TANGVALL» og
  9983/17676 på «Tjørnahaugane 60» — deler *både* adresse og koordinat. En nøkkel av de feltene
  ville slått sammen reelle rom. Mangler `romnr`, avvises rommet framfor at vi finner opp en ID.
- **`datauttaksdato` brukes ikke som `sourceUpdatedAt`.** Den er tidspunktet uttrekket ble kjørt, med
  millisekunder, og sier ingenting om rommet. Feltet inngår i innholdshashen, så å ta det med ville
  gjort hver sync til 556 «updated» uten at noe var endret.
- Seksjonen ligger **sist**. Vi skriver aldri «ingen tilfluktsrom» uten radius — det ville lest
  som en påstand om områdets beredskap, mens det vi vet bare er en avstand.

#### `/tilfluktsrom` viser nærmeste offentlige rom, `/omrade` følger valgt radius

Regelen fra 2026-10-03. Samme datasett og samme lesefunksjon (`features_near`), to visninger:

| | Rom innen valgt radius | Ingen innen radius, men innen 10 km | Ingen innen 10 km |
|---|---|---|---|
| **`/omrade`** (vanlig søk) | Gruppen med rommene, som før | «Ingen offentlige tilfluktsrom innen 1 km.» + lenken «Finn nærmeste offentlige tilfluktsrom →» | Seksjonen vises ikke |
| **Søk fra `/tilfluktsrom`** (`vis=tilfluktsrom`) | Samme gruppe, åpen | «Ingen offentlige tilfluktsrom innen 1 km», og de tre nærmeste under «Nærmeste offentlige tilfluktsrom – utenfor 1 km» | «Ingen offentlige tilfluktsrom innen 10 km.» |

- `/omrade` lister ikke rom utenfor radien, og de tegnes ikke i kartet. Siden skal ikke late som
  om noe 3 km unna ligger innen 1 km. Hovedradiene er uendret: 500 m, 1 km, 3 km.
- **Hver rad er en trykkflate**, både rom innen radius og de nærmeste utenfor. Et trykk velger
  rommet i kartet: markøren utheves, kartet flytter seg dit hvis rommet ligger utenfor utsnittet,
  og popupen åpner seg — samme mekanisme som for alle andre lister på siden
  (`MapSelectionProvider`). På mobil hentes kartet fram. I verktøyvisningen er de nærmeste rommene
  derfor kartobjekter, synlig utenfor radiussirkelen; kartet er fortsatt zoomet til valgt radius
  til noen trykker. Valget ligger ikke i URL-en — ingen valg på resultatsiden gjør det.
- Spesialverktøyet skal alltid svare. De nærmeste rommene er merket som utenfor valgt radius, og
  forbeholdet om at et rom i nærheten ikke er en anvisning står som før.
- **10 km er satt etter fordelingen, ikke etter skjønn.** Av 327 adresser spredt over hele Oslo har
  17 % et offentlig rom innen 1 km, 61 % innen 3 km, 93 % innen 5 km og 100 % innen 10 km (lengst:
  7,3 km). Databasen sorterer på avstand, så ett oppslag ut til 10 km finner de nærmeste direkte —
  trinnvis leting (1, 3, 5, 10 km) ville gitt samme svar med flere spørringer.
- Oppslaget etter nærmeste rom gjøres bare når ingen ligger innen radius. Feiler det, sier
  seksjonen «Kunne ikke hente tilfluktsrom akkurat nå.» — resten av siden står, og feilen leses
  ikke som «ingen rom».
- Bakgrunn, rotårsak og QA: [research/tilfluktsrom-naermeste-rom.md](research/tilfluktsrom-naermeste-rom.md).

#### Deep-link fra spesialverktøyene

Søk fra `/tilfluktsrom` og `/skolekrets` lander på verktøyets egen del av resultatsiden:
`/omrade?…&vis=tilfluktsrom#tilfluktsrom` og `/omrade?…&vis=skolekrets#skolekrets`. Søk fra
forsiden har verken parameter eller anker, og lander øverst som før.

- **Ankeret** (`#tilfluktsrom`, `#skolekrets`) sier hvor siden skal lande. Det ser bare
  nettleseren. ID-ene er faste og semantiske, ikke komponent-ID-er.
- **Parameteren** (`vis`) sier hva serveren skal svare med: de nærmeste rommene utenfor radius,
  og dekningsmeldingen for skolekrets utenfor Oslo. Ukjent verdi gir den vanlige siden.
- Landingen gjøres av `DeepLinkTarget` når målet monteres — altså når dataene er lastet og målet
  finnes i DOM. Ingen tidsfrist. Mens seksjonene over fylles inn, holdes målet på plass av en
  ResizeObserver uten animasjon; første gang brukeren ruller, trykker eller taster, slipper vi.
  `scroll-margin-top` holder målet under den faste topplinjen.
- Er målet sammenleggbart, åpnes akkurat det. Ingen andre grupper åpnes.
- Radius- og sorteringslenkene beholder `vis`, men ikke ankeret: å bytte radius skal ikke flytte
  siden.
- Skolekrets utenfor Oslo: notisen vises ellers ikke, men kommer søket fra `/skolekrets`, står
  «Skolekrets vises foreløpig bare for adresser i Oslo. …» på ankeret. Svarer ikke kilden, står
  det — de to er ikke det samme.

### Hytter og koier

Første friluftskategori. Retningen står i [data-roadmapen](data-roadmap.md#12-friluft-skjult-lokal-innsikt-ikke-en-turapp),
modellen i [dataarkitekturen](data-architecture.md#5-kanoniske-enheter-eller-bulk-lag).

**Status: lansert 2026-10-02.** Hele landet er importert og kategorien `hytte` er offentlig. 1 638 hytter, 1 510 av dem klare til å vises;
resten står bare i sekundærkilden og er skjult til de er kontrollert. Oslomarka med omland er
kvalitetssikret hytte for hytte. Resten av landet er kontrollert mot Kartverkets egne data, og
DNT-hyttene (578) er beriket med forening, bestillingslenke og tilgang fra DNTs egne sider — se
[research/hytter-dnt-berikelse.md](research/hytter-dnt-berikelse.md). De som sto igjen uten
forening eller lenke, er gått gjennom én for én i
[research/hytter-dnt-gap-audit.md](research/hytter-dnt-gap-audit.md): 555 har kontrollert
forvalter, og resten har et notat om hvorfor. Hyttene på Statskogs
egen liste (193) har forvalter, lenke og riktig type og tilgang — se
[research/hytter-statskog-berikelse.md](research/hytter-statskog-berikelse.md). Fjellstyrehyttene
(233) har navngitt fjellstyre på 224 og lenke på 209, fra Fjellstyresambandets oversikt og
fjellstyrenes egne sider — se
[research/hytter-fjellstyre-berikelse.md](research/hytter-fjellstyre-berikelse.md). I «Andre»
er de låste og de betjente hyttene undersøkt (private turisthytter, kystled, bygdeallmenninger,
jeger- og fiskerforeninger) — se
[research/hytter-andre-berikelse.md](research/hytter-andre-berikelse.md), som også har status
mot kriteriene for publisering. Til sammen har 1 195 hytter kontrollert forvalter og 1 171
offisiell lenke; 20 låste hytter står uten neste steg. Tallene, fylkestabellen og funnene står i
[research/hytter-nasjonal-import.md](research/hytter-nasjonal-import.md). `npm run qa:hytter`
kjører regelsjekkene (koordinater, dubletter, lekkasje av avviste eller skjulte hytter,
overstyring uten kilde) og skal være grønn før publisering.

Kategorien `hytte` er publisert (`is_public = true`); `hytte_kilde` er aldri offentlig.
`huts_*`-funksjonene svarer for alle, men bare med hytter som er godkjent for visning: avviste
hytter og hytter som bare står i sekundærkilden, er fortsatt skjult. Avpublisering er én linje:
`update area_feature_categories set is_public = false where category = 'hytte'`. Forsiden
lenker til hyttekartet så lenge kategorien er offentlig.

**Fylkessider.** `/hytter/fylke/<slug>` lister hyttene i et fylke per kommune, alfabetisk, med
lenke til hver hytteside, antall per type og en kort faktaingress (`countyIntro` i
`lib/huts/wording.ts`). Ingen kart. Fylket kommer fra kommuneregisteret, ikke fra databasen:
`getCountyHuts` finner fylkets kommunenummer og henter hyttene med én spørring
(`hut_index(p_municipalities)`). Hytter uten kommune (29) og `not_public` står ikke der. Under
kartet på `/hytter` står fylkene med antall (`hut_municipality_counts`, cachet en time), rendret på
serveren, så det finnes en lenkevei `/hytter` → fylke → hytte uten JavaScript. Hyttesiden har
fylket i brødsmulestien. Kommunesider, typesider og «nær sted»-sider er bevisst ikke laget — se
[ADR 014](adr/014-county-pages-and-sitemap.md).

**Søkemotorer.** `/hytter`, fylkessidene og hyttesidene indekseres. Sitemapen har `/hytter` og alle hytter en
anonym besøkende kan se (`listPublicHuts`, uten innlogging, i sider på 1 000), uten lastmod og
uten priority. Avviste, skjulte og sammenslåtte hytter gir 404 og er aldri med. Hytter som ikke
er for allmennheten (`not_public`) har en side, men er `noindex` og står ikke i sitemapen.
Tittelen er «Aursjobu – hytte i Skjåk», beskrivelsen bygges av type, sted, forvalter og
tilgang, og hyttesiden har strukturerte data av typen `Place` — ikke `LodgingBusiness`, som
ville antydet booking og pris.

Supabase-API-et gir høyst 1 000 rader per kall. Hele-landet-visningen har flere hytter enn det,
så `getHutsInBbox` henter `huts_in_bbox` side for side.

Tolkningsreglene:

- **Typen er kildens.** Betjent, selvbetjent, ubetjent og rastebu er N50s egne klasser. «Åpen
  koie» og «dagsturhytte» finnes bare som kontrollert overstyring (`type_override`), når
  forvalterens egen side sier det — ingen kilde skiller dem ut i bulk.
- **Tilgang følger Kartverkets kodeliste, ordrett.** Feltet er N50s
  `hytteinformasjon.tilgjengelighet`, definert i kodelisten
  [Tilgjengelighet](https://register.geonorge.no/sosi-kodelister/kartdata/tilgjengelighet)
  («beskriver om hytta er låst eller ulåst»):

  | Kode | Kartverkets definisjon | Hos oss |
  |---|---|---|
  | Låst | «Låst og krever forhåndsbooking.» | «Tilgang: Låst – må bestilles på forhånd» |
  | Ulåst | «Ulåst eller tilgjengelig med Den Norske Turistforenings standardnøkkel.» | «Tilgang: Ulåst, eller åpnes med DNT-nøkkel» |
  | Udefinert | «Irrelevant/ikke aktuell.» | lagres som ukjent, vises ikke |

  «Ulåst» betyr altså **ikke** at man slipper nøkkel, og derfor skriver vi aldri «ingen nøkkel
  nødvendig». Ingen av verdiene sier om hytta er i drift, i sesong eller ledig. `access_status` står på
  `unknown` med mindre en admin har satt «midlertidig stengt» fra forvalterens side (se under),
  og hyttesiden sier i klartekst at tilgang ikke er det samme som åpen eller ledig
  (`HUT_ACCESS_NOTE`). Ordlyden bor i `lib/huts/wording.ts`.
- **Avstand vises aldri uten at det er tydelig hva den er målt fra.** På `/omrade` er det
  adressen i overskriften, og seksjonen sier «Avstand i luftlinje fra adressen». På `/hytter`
  finnes det ikke noe slikt sted med mindre brukeren kom fra ett: lenken fra områdesiden og fra
  en hytteside har med `fra=<navn>`, og bare da vises avstand — alltid som «4,2 km fra Storgata
  1», og med stedet markert i kartet. Uten `fra` vises ingen avstand, og lista sorteres på navn.
  Kartutsnittet er aldri et utgangspunkt. På hyttesiden står nabohyttenes avstand under
  «Avstand i luftlinje fra <hytta>».
- **Høyden er terrenghøyden i kartpunktet.** Den kommer fra Kartverkets åpne høydemodell
  (`ws.geonorge.no/hoydedata`, CC BY 4.0) og lagres per hytte i `huts.terrain_elevation_m`,
  sammen med modellens datakilde (`dtm1`, `innsjohoyde` …), tidspunktet og posisjonen den gjelder.
  Den beregnes etter hyttesynken for nye og flyttede hytter, og med `npm run huts:elevation` —
  aldri når siden vises. En feil skriver ingenting; forrige verdi står. Det er ikke en oppmålt
  høyde for bygget, så den vises avrundet som «ca. 433 moh.». Høydemodellen slås opp ti punkter
  om gangen: i kall på 50 punkter spredt over landet svarer den med høydekurver i stedet for
  terrengmodellen for mange av dem (opptil 20 m feil, målt 2026-10-03). Et punkt som likevel får
  kurver, slås opp alene. Se [ADR 005](adr/005-cached-public-hut-pages.md).
- **Overnatting følger klassens definisjon.** Betjent, selvbetjent og ubetjent er
  overnattingshytter i N50; en rastebu er en dagshytte der man kan sove «i et knipetak», og
  vises som «ikke beregnet for overnatting».
- **Eier er ikke forvalter.** `owner_kind` er N50s eierkategori (DNT, Statskog, fjellstyre,
  andre). `manager_name` er navnet Turrutebasen oppgir som vedlikeholdsansvarlig, når det
  finnes. «Andre» betyr uspesifisert, og vises ikke som en eier. Kategorien tar også feil:
  Besso står som DNT og er en privat turisthytte; Holmvasshytta i Sunnfjord står som Statskog og
  tilhører KFUK-KFUM. Og private turisthytter med DNT-avtale (Dørålseter) står som «Andre».
  Dokumenterte feil rettes med `owner_override`, som går foran offentlig; kildens verdi står urørt.
- **Sengeplasser, sesong og booking vises ikke.** De finnes bare hos DNT/UT.no, som vi ikke
  kan hente fra.
- **Serveringshytter og gapahuker er utelatt.** N50s «Serveringshytte» er markastuer med
  betjent servering; de teller som `skipped` i synken, ikke som feil. Ett unntak er ført
  for hånd i importen (`SERVERING_MED_OVERNATTING`): Storlihytta i Molde, der DNT Romsdal har en
  ubetjent hytte på samme tun. Nye unntak krever forvalterens egen side som belegg.
- **Sekundærkilden alene er ikke nok.** En hytte som bare står i Turrutebasen får `confidence
  = 'low'` og vises ikke før noen har satt `last_verified_at`. Turrutebasen fører blant annet
  hotellet Kleivstua som betjent hytte.

**Kontrollkøen** ligger på `/admin/hytter`. Den fylles bare ved konflikt: kildene er uenige om
typen, to hytter ligger innen 100 m eller har samme navn innen 2 km, eller hytta står bare i
sekundærkilden. Det er ingen review-plan per hytte; ferskheten følger synken. En sak har tre
utfall (`review_hut`):

| Utfall | Virkning |
|---|---|
| **Godkjenn** | Hytta er riktig. Saken forlater køen, og en hytte fra sekundærkilden blir synlig |
| **Avvis** | Hytta vises aldri. Raden og kildepostene blir stående, så neste sync oppretter den ikke på nytt. En godkjenning angrer avvisningen |
| **Slå sammen** | Kildepostene flyttes til hytta som beholdes, og den andre arkiveres. Navnet tas vare på til søk |

**Vi bygger ikke booking.** NaboRadar viser hytta og sender brukeren videre til den som driver
den. Ledighet, kalender, pris og bestilling finnes ikke, og skal ikke bygges — se
[data-roadmapen](data-roadmap.md#12-friluft-skjult-lokal-innsikt-ikke-en-turapp) og
[researchen om DNTs booking](research/dnt-booking-ledighet.md).

**Neste steg.** Sier vi at en hytte må bestilles på forhånd, skal vi også si hvor — eller si
rett ut at vi ikke vet. `hutNextStep` i `lib/huts/wording.ts` gir fire tilstander, og hyttesiden,
lista i hyttekartet og admin leser alle den samme:

| Tilstand | Vi har | Hyttesiden viser under «Offisiell info» |
|---|---|---|
| `booking_link` | kontrollert bestillingsside | Knappen «Bestill hos …». Ingen ekstra tekst |
| `info_link` | kontrollert infoside | Knappen «Se hos …» og «Oppdatert informasjon om tilgang og bestilling finner du hos forvalteren.» |
| `manager_only` | bare forvalter | Forvalteren og «Bestilling kreves. NaboRadar har foreløpig ikke en verifisert bestillingslenke.» |
| `unknown` | ingenting | «Kartverket oppgir at hytta krever forhåndsbooking. NaboRadar har foreløpig ikke funnet en verifisert kontakt- eller bestillingsside.» Tilgangsraden sier da bare «Låst» |

De to siste tekstene gjelder låste hytter. En ulåst hytte uten lenke får ingen seksjon og ingen
oppfordring: vi peker aldri brukeren til «den som driver hytta» uten å kunne si hvem det er.
At bestilling kreves (`bookingRequired`, Kartverkets «Låst») er en egen opplysning — den betyr
ikke at vi kjenner bestillingskanalen, og ingen av delene sier om hytta er åpen eller ledig. En
hytte publiseres uavhengig av om den har lenke.

**Eier, forvalter og den lenken går til.** Tre forskjellige ting:

- `owner_kind` er Kartverkets eierkategori (DNT, Statskog, fjellstyre, andre). Den vises som
  «Eier», og brukes aldri som om den var den som tar imot bestillingen. «Fjellstyre» er ikke en
  bestemt aktør, og «DNT» sier ikke hvilken forening.
- Forvalteren er `manager_verified` når et menneske har kontrollert den mot en offisiell side,
  ellers `manager_name` fra Turrutebasen. `huts_public` gir den kontrollerte når den finnes, og
  synken rører den ikke.
- Navnet i knappen er stedet lenken går til, lest av adressen (`dnt.no` → «Bestill hos DNT»,
  `statskog.no`, `inatur.no`), ellers forvalteren, ellers ingen: «Bestill hytta» / «Mer
  informasjon». Uten lenke er det ingen knapp — heller ikke en deaktivert.

**Lenker.** `booking_url` er en side der man faktisk bestiller; `info_url` er den offisielle
infosiden. Lenker og forvalter lagres samlet med `set_hut_contact` fra `/admin/hytter`, sammen
med et internt notat om hvor de ble kontrollert (`contact_note`, returneres aldri offentlig).
`links_verified_at` er tidspunktet for kontrollen; databasen nekter en lenke eller en kontrollert
forvalter uten. Notatet kan stå alene: «ingen offisiell side funnet, disse kildene er sjekket»
er også et resultat, og skal ikke måtte gjøres på nytt.

**Andre navn.** Det kanoniske navnet følger Kartverket. Bruker forvalteren et annet —
«Bekkensten» for Bekkenstein, «Store Tømtehytta» for Tømtehytta, «Styrbord - Gressholmen» —
legges det i `aliases` fra samme skjema. Navnesøket finner dem. Synken bygger `alt_names` på
nytt fra kildepostene hver gang, og rører ikke `aliases`. Opplysningene legges inn for hånd, én hytte om gangen: åpne den offisielle
siden, se at den gjelder hytta, lagre. Vi henter ikke DNTs hytteregister, bruker ikke UT.no, og
bygger ingen adresse etter mønster. Ingen av dagens kilder leverer lenker. Lenkene sjekkes ikke
automatisk ennå; kontrolltidspunktet står i admin.

`/admin/hytter` viser de låste hyttene som mangler bestillingsside (høyst 100; søk finner
resten; `?vis=dnt` viser DNT-hyttene uten kontrollert forening eller lenke), med status — «Mangler forvalter», «Mangler
booking/info», «Infoside finnes», «Lenke komplett» — de som mangler mest først
(`hut_contact_list`).

**Forvalteren kan korrigere Kartverket — felt for felt.** Kartverket er grunnlaget, men ikke
alltid riktig på feltnivå. Den offentlige verdien følger derfor denne prioriteten, per felt:

| Felt | 1 | 2 | 3 |
|---|---|---|---|
| Type | `type_override` (kontrollert mot forvalteren) | N50 | sekundærkilde |
| Tilgang | `access_override` | N50 (`locked`) | — |
| Eier | `owner_override` (bare når forvalterens side viser at kategorien er feil) | N50 (`owner_kind`) | sekundærkilde |
| Forvalter | `manager_verified` | Turrutebasen | ukjent |

Kildens verdi skrives aldri over. `hut_type`, `locked` og `overnight` er det synken leste, og
synken oppdaterer dem som før; overstyringen ligger i egne kolonner den ikke rører, og
`huts_public` legger den oppå. Det går alltid an å se «N50 sa X, forvalteren sier Y» — admin
viser begge. En overstyring gjelder bare feltet som er kontrollert, aldri hele hytta, og kan
ikke lagres uten kilde: `override_source_url` og `override_verified_at` kreves av en constraint.
Kilden returneres ikke offentlig; hyttesiden sier bare «… og kontrollert informasjon fra
<forvalter>».

Tilgang er en lukket liste (`HUT_ACCESS_KINDS`), ikke fritekst:

| Verdi | Vises som | Kommer fra |
|---|---|---|
| `locked_prebooking` | Låst – må bestilles på forhånd | N50 «Låst», eller overstyring |
| `unlocked_or_dnt_key` | Ulåst, eller åpnes med DNT-nøkkel | N50 «Ulåst» |
| `unlocked` | Ulåst | bare overstyring |
| `dnt_key` | DNT-nøkkel | bare overstyring |
| `code_lock` | Kodelås | bare overstyring |
| `special_key` | Spesialnøkkel | bare overstyring |
| `code_or_special_key` | Kodelås eller spesialnøkkel | bare overstyring (DNTs egen merkelapp) |
| `not_public` | Ikke for allmennheten | bare overstyring. Sier hvem hytta er for, ikke hvordan døra er |

Overnatting følger typen: en overstyrt type tar med seg sin egen definisjon. Bristol står som
rastebu i N50, men Jevnaker almenning skriver at koia er åpen og at man kan overnatte én natt.
Den er overstyrt til «åpen koie», og vises dermed med «Overnatting».

**Offentlig merknad.** `public_note` er én kort, kildebelagt setning brukeren trenger:
«Lånes ut til skoler og ideelle foreninger, ikke til privatpersoner.» Den vises under «Viktig å
vite» på hyttesiden, i en rolig boks, og i den åpne raden i hyttekartet. Den er ikke det samme
som `contact_note`, som er internt og aldri returneres. Høyst 160 tegn, ingen
markedsføring, og samme kildekrav som overstyringene.

**Ikke for allmennheten.** Noen hytter i kildene er ikke et tilbud til turgåere: bare for
medlemmer, skoler eller jegere, eller ikke i utleie. De får tilgangen `not_public`, og merknaden
sier hvem hytta er for. Da vises «Ikke for allmennheten» som tilgang, hytta står ikke som et
sted å overnatte, og siden ber ikke om bestilling. Det er noe annet enn midlertidig stengt
(status) og låst (dør). Verdien settes bare når forvalterens egen side sier det; `qa:hytter`
feiler hvis merknaden mangler.

**Feil eierkategori.** `owner_override` ligger oppå N50s `owner_kind`, med samme krav til kilde
som de andre overstyringene. Den brukes bare når en offisiell side viser at kategorien er feil
(Besso er ikke DNT, Holmvasshytta i Sunnfjord er ikke Statskog). Det er ikke en eiermodell:
hvem som driver hytta, er forvalteren.

**Midlertidig stengt.** `access_status = 'closed'` settes for hånd når forvalterens side sier
at hytta er stengt. Hytta vises fortsatt — det er nyttig å vite at den finnes — men med
«Midlertidig stengt» i lista i hyttekartet og på kortet på områdesiden. En hytte som er borte
for godt, avvises i stedet. Ingen kilde leverer status, og vi viser aldri «åpen».

En stengt hytte har alltid en dato for neste kontroll (`status_review_at`): 30, 60 eller 90
dager fram, 60 som standard. «Status må kontrolleres» på `/admin/hytter` viser de stengte
hyttene med sist kontrollert, neste kontroll, kilde og knapp til forvalterens side. Admin
svarer «Fortsatt stengt» (ny dato) eller «Åpnet igjen» (`review_hut_status`). Statusen
oppheves aldri av seg selv: en forfalt dato betyr at noen må se etter, ikke at hytta er åpen.

Alt dette settes med `set_hut_overrides` fra «Avvik fra Kartverket» på `/admin/hytter`.

**Kontrollen av piloten.** Alle 58 hyttene er slått opp mot forvalterens egen side; matrisen,
klassene og de åpne sakene står i [research/hytter-pilot-kildekontroll.md](research/hytter-pilot-kildekontroll.md).
Det viktigste funnet: «Ulåst» betyr ikke fri bruk. DNT Oslo og Omegn krever forhåndsbestilling
på alle ubetjente hytter i marka, så bestillingslenken er like viktig der som for låste hytter.

**Det Kartverkets «Låst» ikke sier.** Kontrollen av pilotens 15 låste hytter viste at «låst og
krever forhåndsbooking» dekker flere virkeligheter: utleie av hele hytta etter forespørsel
(Røkleivhytta), kystledhytter som bestilles etter innlogging, en hytte som bare lånes ut til
skoler og organisasjoner (Husbergøya), og en som er stengt for vedlikehold på ubestemt tid
(Solstua). Vi viser ikke noe av dette som egne felt — vi har ingen kilde som holder det ved
like — men lenken til forvalteren gjør at brukeren finner det.

**Hyttesiden er lik for alle og caches.** `/hytter/[ref]` leser anonymt (publishable key, uten
brukerens cookies) gjennom `get_hut` og `huts_near`, og caches som ISR i en time. En innlogget
admin ser den samme siden som alle andre; skjulte og avviste hytter kontrolleres i `/admin/hytter`.
Hver handling der tømmer hyttesidene (`revalidatePath("/hytter/[ref]", "page")`), så endringen
synes ved neste besøk. Endringer fra synken synes innen en time. Svarer ikke databasen, kaster
siden en feil i stedet for å vise en halv side, og forrige versjon står. Kommune og fylke kommer
fra Kartverkets register (cachet et døgn) med et øyeblikksbilde i koden som reserve. Kartet,
søket og `/api/hytter` leser fortsatt med brukerens sesjon. Se [ADR 005](adr/005-cached-public-hut-pages.md).

**Valgt hytte i adressen.** Velges en hytte i kartet, lista eller søket, blir adressen
`/hytter?hytte=aursjobu-a4fbf722` — samme nøkkel som hyttesiden. Den skrives med
`history.replaceState`, så et valg ikke blir et nytt steg i historikken, og den fjernes når
valget lukkes. Ved innlasting slås hytta opp og kartet starter rundt den. Kartutsnitt, filtre og
søk står ikke i adressen. Eldre lenker med full uuid og `lat`/`lng` virker fortsatt. Adressen
canonicaliseres til `/hytter` og står ikke i sitemapen; hyttesiden er detaljsiden.

**«Kort om hytta».** Hyttesiden har noen få setninger rett under tittelen, satt sammen på
serveren av `hutIntroText` (`lib/huts/wording.ts`) fra de samme feltene som Fakta: type, kommune
og fylke, høyde (Kartverket, bare fra 100 moh.), forvalter, tilgang, status og lenker. Ingen fri
tekst og ingen omskriving av merknaden. Fire setninger er taket, ikke målet: en hytte med lite
data får én setning, og det finnes ingen generell avslutning. Tilgangen nevnes ikke på betjente
hytter med mindre den stenger noen ute (låst/bestilles, ikke for allmennheten), og Kartverkets
«ulåst eller DNT-nøkkel» står bare i Fakta. Bestillingssetningen («Bestilling skjer via Inatur.»)
krever en dokumentert bookinglenke, og faller bort når hytta er stengt eller ikke er for
allmennheten; da peker lenken bare til «Mer informasjon finnes hos …».

**Søk etter hytte eller sted.** Søkefeltet på `/hytter` gir både hytter (`huts_search`) og steder
fra Kartverkets stedsnavn — den samme geokoderen som adressesøket på forsiden, men uten adresser.
`/api/hytter?q=` returnerer begge i ett svar. Et sted gir bare et punkt, så kartet viser 20 km
rundt det, og ingen hytte velges. Rekkefølgen står i `lib/huts/suggestions.ts`: hvor godt navnet
treffer først, hytta før stedet ved likt treff, og et sted som er samme hytte (Spiterstulen er
også «Turisthytte» i stedsnavnregisteret) vises bare som hytte.

**Navnesøk.** `huts_search` søker i navnet og i alle andre navn (`alt_names` fra sekundærkilden
og `aliases` lagt inn for hånd). Søket tåler o for ø, a for å og e/ae for æ, begge veier:
Kartverket følger lokal skrivemåte («Aursjobu», men «Aursjøhytta»), og den som søker vet ikke
hvilken som gjelder. Et treff på nøyaktig skrivemåte står først. Søkefeltet skiller mellom
«Ingen treff» og et søk som ikke fikk svar, og svarene fra `/api/hytter` caches ikke så lenge de
avhenger av om kalleren er innlogget.

**Fast adresse.** Hver hytte har siden `/hytter/<navn>-<id>`, der `<id>` er de åtte første
tegnene i hyttas uuid. Oppslaget (`get_hut`) skjer på ID-en; navnet er pynt, så lenken overlever
at hytta bytter navn. Siden er `noindex` så lenge datasettet er en pilot.

**Kartet på hyttesiden** viser hytta, tydelig markert, og de samme nabohyttene som står i lista
«Andre hytter i nærheten» — samme oppslag, så lista og kartet kan ikke vise to forskjellige
sett. Utsnittet strekker seg etter de tre nærmeste (minst 2,5 km, høyst 10 km). Et trykk på en
nabo viser navn og type med «Se hyttesiden»; siden byttes ikke før brukeren følger lenken. Den
markerte hytta tegnes i et eget lag uten klynging (`hutFocusLayer`), både her og i hyttekartet,
så den aldri forsvinner inn i en klynge.

**Hyttesiden** har fire deler, i fast rekkefølge: fakta (type, eier, forvalter, bruk, tilgang,
kommune, fylke, høyde, koordinater — bare rader med innhold), offisiell info (lenkene, når vi
har kontrollerte), kilde, og «Andre hytter i nærheten»: de fem nærmeste andre hyttene innen 30
km i luftlinje (`HUT_NEIGHBOURS`). Det siste er rene naboer fra `huts_near` — ingen anbefaling
og ingen rangering utover avstand. Forbeholdet om åpningstider, nøkkel og bestilling står her
og én gang under lista i hyttekartet, ikke på hvert kort.

**Hyttekartet (`/hytter`)** viser det samme i lista og i kartet, og høyst én hytte er valgt.
Den valgte raden er åpen med detaljene rett under seg (trekkspill, pil til høyre, blå kant), og
punktet har mørk ring og popup. Velges en hytte i kartet eller i søket, åpnes raden og rulles
fram — bare så langt som trengs, og bare når lista står ved siden av kartet; på smal skjerm
ligger lista under kartet, og siden rulles ikke. Et trykk på den åpne raden lukker den. Kartet
flytter seg bare når den valgte hytta er utenfor utsnittet, og zoomer aldri: utsnittet er også
det lista viser, så et valg skal ikke bytte ut lista under brukeren. Flyttes kartet så hytta
ikke lenger er i utsnittet, er den ikke lenger valgt.

«I nærheten» på `/omrade` er en trapp på 10, 20 og 30 km, uavhengig av radien brukeren har valgt
for resten av siden — seksjonen sier det selv, så «innen 10 km» ikke leses mot sirkelen i
kartet. «Se alle i kart» åpner hyttekartet med adressen som utgangspunkt og samme radius
(`radius=<km>`), så hyttene som ble talt opp, er i utsnittet. Se `HUT_NEARBY` i
`lib/huts/queries.ts`.

### Skjenkesteder

- Tiden i kilden er **tillatt stengetid** — ikke skjenketid, og ikke stedets faktiske åpningstid.
- Inne- og utetid holdes adskilt og regnes aldri om.
- Bevillingshaver lagres ikke.

---

## 15. Eiendomsfunksjonen

Klikker brukeren i kartet når zoom ≥ **14**, slår `/api/eiendom` opp eiendommen under punktet.

**Slik virker oppslaget** (byttet fra matrikkel-WFS 2026-10-03, se
[research/eiendomskort.md](research/eiendomskort.md) og [ADR 015](adr/015-publikumsprodukt-wms-og-kildefeil.md)):

1. **Teigen** hentes fra Kartverkets Eiendom-API (`api.kartverket.no/eiendom/v1/punkt/omrader`, EUREF89,
   `nord` = breddegrad, `ost` = lengdegrad). API-et svarer med flatene som omslutter punktet, og vi
   kontrollerer selv at punktet ligger inne i flaten. Anleggsprojeksjonsflater hoppes over.
2. **Areal, kommunenavn og tvist** hentes fra matrikkelkartets WMS (`wms.matrikkelkart`, laget
   `teiger`, `GetFeatureInfo` i EPSG:4326 med lat,lon). Treffet brukes bare når teig-id-en er den
   samme som Eiendom-API-et ga.
3. **Bygg** hentes fra samme WMS, laget `bygning_symbol`, med alle punkter i teigens utsnitt
   (`RADIUS=bbox`), og filtreres med punkt-i-polygon mot teigen.
   - Laget svarer tomt grovere enn 1:2 000. Utsnittet får derfor 0,45 «gradmeter» per piksel.
   - Bygg med status revet/brent (BR), avlyst (BA), utgått (BU) og flyttet (BF) telles ikke. Det
     åpne datasettet «Matrikkelen – Bygningspunkt» utelater dem også.
   - Teiger større enn 6 000 piksler i utsnittet (ca. 2,7 km) får ukjent bygg.
4. **Adressen** er nærmeste offisielle adresse som ligger inne i teigen (adresse-API-et).

**Feil er ikke fravær:**

- Bare et gyldig, tomt svar fra Eiendom-API-et gir «Fant ingen registrert eiendom». HTTP-feil,
  tidsavbrudd, svar utenfor skjemaet og koordinater utenfor Norge gir «får ikke hentet eiendomsdata».
- Feiler areal-, bygg- eller adresseoppslaget, vises eiendommen uten det feltet. Bygg blir `null`
  (ukjent) og feltet skjules. Det blir aldri «Ingen registrert».

**Kontrollert 2026-10-03** på 19 adresser (enebolig, rekkehus, seksjonert og useksjonert blokk,
gårdsbruk, festetomt, flere teiger, by og land): 19 av 19 ga adressens matrikkelnummer, og byggene
var identiske med Kartverkets nasjonale nedlasting i 19 av 19.

**Falt bort i byttet:** matrikkelenhetstype og flaggene for grunnforurensning og kulturminne på
matrikkelenheten. De finnes ikke i WMS-en eller Eiendom-API-et.

**Caching:** 10 minutter, maks 300 oppføringer, per serverinstans. Nøkkelen er koordinaten avrundet
til fem desimaler. Svaret sendes med `cache-control: private, max-age=60`.

**Klikkprioritet i kartet** (`lib/map/click.ts`) — problemet var at et planpolygon dekker alle
eiendommene inni seg og fanget klikket, slik at et hus inne i et planområde var umulig å trykke på:

| Zoom ≥ 14 | Zoom < 14 |
|---|---|
| 1. punktmarkører — brukeren traff et lite, tydelig objekt og mente det | 1. punktmarkører |
| 2. eiendom/teig — klikk i flaten slår opp eiendommen | 2. store flater er fortsatt primær klikkflate |
| 3. store flater blokkerer ikke lenger | |

**Det vi viser:** matrikkelnummer, areal, bygninger med type og nærmeste adresse.

**Bygningstype** oversettes med SSBs kodeliste (KLASS 31, «Standard for bygningstype / Matrikkelen»,
NS 3457), lagret uendret i `lib/property/bygningstyper.json` og oppdatert med
`npx tsx scripts/update-bygningstyper.ts`. Ukjente koder (f.eks. matrikkelens 999) vises ikke. Den
håndskrevne tabellen som sto her før, hadde forskjøvne koder: sykehus (719) ble vist som «Annen
beredskapsbygning» og barneskole (613) som «Museum eller bibliotek».

> **Det vi ikke viser, fordi det ikke er åpne data:** eier, BRA, byggeår, salgspris, tinglysninger og
> eiendomshistorikk. Disse krever avtale med Kartverket eller andre rettighetshavere. Ikke bygg noe
> som later som om vi har dem.

---

## 16. Endepunkter

| Rute | Metode | Input | Validering | Upstream | Timeout | Caching | Rate limit |
|---|---|---|---|---|---|---|---|
| `/api/eiendom` | GET | `lat`, `lng` | Zod: `lat` 57–72, `lng` 4–32. Alt annet → 400 | Eiendom-API + matrikkelkart-WMS ×2 + adresse-API | 8 s totalt, 6 s per kall, 1 retry | `private, max-age=60` + 10 min serverside | 120/min |
| `/api/geocode` | GET | `q` | Zod: 2–100 tegn etter trim | Kartverket adresser + stedsnavn | Per kilde, delvis svar tillatt | `private, max-age=300`, `no-store` ved delvis svar | 120/min |
| `/omrade` | GET (side) | `lat`, `lng`, `radius`, `label`, `sortering` | Zod. Ugyldig `lat`/`lng` → feilside. Ugyldig `radius` → standard 1 km. `label` maks 120 tegn, kontrolltegn fjernet | Supabase + direkte oppslag | 8 s (saker), 8 s (DB), 12 s (oppslag) | Dynamisk | 240/min |
| `/api/hytter` | GET | `bbox` *eller* `kommune` *eller* `q`; `type` og `eier` kan gjentas | Zod: utsnitt innenfor kloden og riktig vei, kommunenummer fire sifre, `q` 2–60 tegn, kjente typer og eiere | Supabase (`huts_*`) + stedsnavn | databasens egen | `private, no-store` | 120/min |
| `/hytter` | GET (side) | `lat`, `lng`, `hytte`, `fra` (navnet på stedet, gir avstand), `radius` (km, 1–50) — alle valgfrie | Zod; ugyldige verdier ignoreres. `fra` maks 120 tegn | `/api/hytter` fra klienten | — | Dynamisk, indekseres, canonical `/hytter` | ingen |
| `/hytter/[ref]` | GET (side) | `<navn>-<8 heksadesimale tegn>` | Bare ID-delen brukes; alt annet gir 404 | Supabase anonymt (`get_hut` med lagret høyde, `huts_near`) + Kartverkets kommuneregister | 4 s på kommuneregisteret, med øyeblikksbilde som reserve; feiler databasen, kastes en feil som ikke caches | ISR: `s-maxage=3600, stale-while-revalidate`; tømmes av `/admin/hytter`. Indekseres (ikke `not_public`) | ingen |
| `/hytter/fylke/[slug]` | GET (side) | fylkesnavn som slug (`innlandet`, `more-og-romsdal`) | Ukjent slug → 404 | Supabase anonymt (`hut_index` med fylkets kommunenummer) + kommuneregisteret | Feiler databasen, kastes en feil som ikke caches | ISR: `s-maxage=3600, stale-while-revalidate`; tømmes av `/admin/hytter`. Indekseres | ingen |
| `/admin/hytter` | GET (side) + server actions | `q` | Supabase Auth + `is_admin()`, både i handlingene og i databasefunksjonene | Supabase | — | `private, no-store` | ingen |
| `/sak/[id]` | GET (side) | uuid + søkekontekst | `get_event` | Supabase | — | Dynamisk | ingen |
| `/` | GET (side) | — | — | — | — | Statisk, Netlify Durable | ingen |
| `/admin` | GET (side) | — | Supabase Auth + `is_admin()` | Supabase | — | `private, no-store` | ingen |
| `/dev` | GET (side) | — | **404 utenfor development** | — | — | — | — |
| `/robots.txt` | GET | — | — | — | — | Statisk | ingen |

Alle API-rutene svarer **405** på POST.

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

**Direkte oppslag caches per kilde** (`lib/facts/lookup-runner.ts`), fem minutter per punkt og radius.
Feiler én kilde, caches de andre likevel, og neste besøk spør bare den som feilet. En kilde som nettopp
feilet, får 30 sekunders pause per serverinstans: den rapporteres som «svarte ikke» med en gang i
stedet for at hvert besøk venter på tidsavbruddet. **Bare et gyldig svar kan bety «ingen treff».**
Tidsavbrudd, HTTP-feil, HTML-feilsider og WMS-unntak er kildefeil, og vises som «Disse kildene svarte
ikke akkurat nå …» — aldri som fravær. Ingen kilde skjules automatisk. Målt 2026-10-03 med stormflo
og flystøy nede: før 7,0–7,1 s per besøk, også varme; etter 0,1–0,4 s på varme besøk med null
eksterne kall ([research](research/stormflo-flystoy-kildegjennomgang.md)).

`withTimeout()` løser alltid med en fallback — den kaster aldri. Sidekomponenten venter ikke på noe;
den lager tre løfter og sender dem til klienten, der `<Suspense>` og `use()` tar imot dem
etter hvert.

**Per seksjon** finnes fire tilstander: laster, klar, tom og feilet. En seksjon som venter viser et
skjelett i samme form som det ferdige innholdet, så siden ikke hopper. En seksjon som feilet sier at
vi ikke fikk hentet den — **manglende data presenteres aldri som «ingen treff»**.

Seksjoner som bare bruker databasen (Nærområdet) blir klare før oppslagene.
Seksjoner som venter på et direkte oppslag (Grunnforhold, Støy, Infrastruktur) har egen `<Suspense>`.
Er databasen nede, feiler ikke oppslagsseksjonene — og omvendt.

Kartet tegnes tidlig, og eiendomsoppslaget er isolert fra resten.

Effekten er målt: første synlige innhold gikk fra **4 970 ms til 55 ms** (Oslo, kald cache).

---

## 22. UI-struktur

### Hovedrekkefølge på `/omrade`

1. **Nærområdet**
2. **Støy**
3. **Naturfare** (seksjons-id `grunnforhold`)
4. **Infrastruktur**
5. **Planer og saker**
6. **Tilfluktsrom**
7. **Friluft i nærheten** (hytter og koier)

«Forurenset grunn» er ikke en offentlig seksjon (produktbeslutning 2026-10-03, se §14). I admins
adressevisning ligger den mellom «Planer og saker» og «Tilfluktsrom».

Over seksjonene står bare adressen (H1), radiusvelgeren, «Endre sted» og skolekretsen. Det
finnes ingen synlig mellomoverskrift eller ingress over funnene; en skjult H2 («Funn i området»)
holder overskriftsnivåene riktige for skjermlesere.

Rekkefølgen følger **hvor nær funnet er adressen selv**. Nærområdet står først fordi det er det
mest umiddelbart forståelige svaret, og fordi det nesten alltid har innhold. Så det som beskriver
søkepunktet — støy og grunnforhold: du står i sonen, eller du gjør det ikke. Deretter det som
oftere handler om nabolaget: plansaker.

**Unntak, bare i admins adressevisning:** ligger søkepunktet inne i en forurensningslokalitet med
påvirkningsgrad 3 eller X, løftes «Forurenset grunn» øverst.

Det finnes **ingen** hovedseksjon som heter Naboklager, Lokale saker eller lignende. Slike saker
hører hjemme som undertyper under «Planer og saker» hvis de noen gang bygges. Dette er testet.

### Tekstregelen

Gjelder alle seksjoner på `/omrade` (innført 2026-10-03):

- **Seksjonstittelen er kategorien.** Ingen undertittel eller ingress som gjentar den. I dag har
  ingen seksjon ingress (`intro: null` i `AREA_SECTIONS`, testet).
- **Første synlige linje er selve funnet**, og kan leses alene: «5 transformatorstasjoner og 7
  kraftlinjer innen 1 km», «Aktsomhetsområde for flom ved søkepunktet · moderat til lav
  radonaktsomhet i området», «2 varslede planoppstarter innen 1 km». Navngi typen, ikke
  «registreringer».
- **Radien står ved funnet** der den er relevant. Den står ikke i en overskrift over siden.
- **Et tolkningsforbehold står én gang**, der det endrer hvordan funnet skal forstås: «Modellberegnet,
  ikke målt ved boligen» (støy), «Aktsomhet for området, ikke en måling i boligen» (radon),
  «landsdekkende oversikt, ikke en beregning for stedet» (flomaktsomhet), «Veiledende» (skolekrets).
- **Det som gjelder hele datasettet** — metode, kartleggingsår, definisjoner og hva kilden ikke
  oppgir — står i «Kilder og metode» (`SOURCES[id].method` i `lib/facts/wording.ts`), ikke på
  hvert kort. Plansakenes forbehold står i seksjonens egen «Kilde og metode».
- **Tomtilstand er én linje.**
- **Ingen rå kildekoder** i UI-et, heller ikke under «Detaljer». Kodene oversettes
  («Status: tiltak er igangsatt»), eller utelates.
- **Ikke forklaring fordi det er plass.** Kilden står på kortet; gruppens kildelinje vises bare
  når den ikke allerede står der.

### Seksjonsrammen

Alle seksjoner rendres gjennom `components/area/SectionShell.tsx`: overskrift, eventuelt **én**
kort sekundærlinje, og så innholdet. Avstandene bor der, ett sted, slik at rytmen er den samme
hele veien ned. Lå den tidligere i to nesten like varianter i `AreaFacts` og `EventFeed`, og
seksjonene drev fra hverandre etter hvert som de fikk hvert sitt innhold.

### Kilder og metode hører ikke til i hovedflyten

Provenance er alltid tilgjengelig, men aldri det første øyet møter:

- **Samlet nederst.** «Kilder og metode (n)» lister datasettene som faktisk inngikk i *dette*
  resultatet, med eier og lisens, og det generelle forbeholdet om at NaboRadar bare gjengir det
  kildene oppgir. Listen sto tidligere som et avsnitt rett under siste seksjon, og var da den
  lengste sammenhengende teksten på siden
- **Seksjonsspesifikk kilde bak «Kilde og metode».** Plansakenes kildelinje lå rett under
  tomtilstanden, slik at «ingenting å vise» ble fulgt av to linjer teknisk tekst
- **Kilden på selve funnet blir stående** der den forklarer nettopp det funnet — inne i kortet
  eller i den åpnede gruppen
- **Ingen seksjonsingress bærer et generelt forbehold.** «Vi vurderer dem ikke» hørte til alle
  seksjonene, ikke bare Nærområdet, og står nå ett sted: i «Kilder og metode»

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
- **Hele raden velger objektet i kartet.** Har en rad et tilsvarende kartobjekt, dekkes den av en
  knapp: markøren utheves, kartet panorerer hvis objektet ligger utenfor utsnittet, og popupen
  åpner seg — nøyaktig samme tilstand som ved klikk direkte i kartet. Knappen dekker raden i
  stedet for å pakke innholdet, fordi raden kan ha en kildelenke, og en lenke inne i en knapp er
  ugyldig. Affordansen er diskret: hover-flate, valgt-flate, og en blek `›` i avstandskolonnen for
  de radene som faktisk kan velges. Mekanismen ligger i `components/area/map-selection.tsx` som en
  liten kontekst, og er **generell**: den gjelder alle grupper, ikke én type. Rader uten
  kartobjekt er ikke klikkbare og får ingen markør
- **Tomtilstander er én linje.** «Ingen varslede planoppstarter fra private forslagsstillere innen
  500 m siste 24 måneder · Se 3 km» — ikke en stor stiplet boks. Forbeholdet om at kilden ikke sier om planarbeidet pågår
  vises bare når det finnes en sak å ta forbehold om
- **Maks to linjer før brukeren må åpne.** Støy vises som «Støy fra veitrafikk · Lden 65–69 dB» /
  «Gul støysone fra 55 dB, rød fra 65 dB (T-1442)»; kortene bak utvideren har dB-nivået,
  referansen og kilden, og metode og kartleggingsår står i «Kilder og metode». Kortformen kommer fra
  formuleringsregisteret, ikke fra UI-et, og er samme påstand med færre ord

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

### Dekning for kommunale omsorgstilbud

Datasettet har to kilder, og de dekker ulike ting:

| Kilde | Antall | Hva den dekker |
|---|---|---|
| Oslo kommunes egen stedsindeks | 59 | Sykehjem, helsehus, dagsentre og barnevernsinstitusjoner — **kun Oslo** |
| Helsenorge, behandlingssteder med offentlig tilbud | 308 | Nasjonalt, men **kun spesialisthelsetjeneste**: psykisk helse og rusbehandling |

Konsekvensen er at **kommunale sykehjem, omsorgsboliger og bofellesskap i praksis bare er dekket
for Oslo**. For andre kommuner finnes bare det Helsenorge har, som er BUP, DPS og lignende — altså
helseforetak, ikke kommunen. Bærum har for eksempel fire oppføringer, alle Vestre Viken.

**Det finnes ingen nasjonal kilde å tette dette med.** Geonorge har null datasett for sykehjem,
omsorgsbolig eller bofellesskap. Hver kommune publiserer på sin egen måte, på sine egne sider.

### Enhetsregisteret skal ikke brukes til dette

Enhetsregisteret ser ut som løsningen — nasjonalt, strukturert, NLOD — og NACE 87.202
«omsorgstjenester i botilbud» gir treff i hele landet. Bærum alene har 58 underenheter der.

**Vi bruker det likevel ikke**, fordi de fleste av dem er bofellesskap for personer med
utviklingshemming eller psykiske lidelser. Det er hjemmene til noen. At en virksomhet må registreres
med en adresse i et foretaksregister, er ikke det samme som at ansvarlig myndighet har publisert
stedet som et offentlig tilbud — og kommunene lar som regel være, bevisst.

Regelen er derfor uendret, og den gjelder kilden, ikke bare stedet:

> Et omsorgstilbud vises bare når **ansvarlig myndighet eller en offisiell kilde selv publiserer et
> navngitt tilbud med konkret adresse**. Private boliger, skjermede adresser og bofellesskap som
> ikke er publisert som et offentlig tilbud, vises aldri.

### Regresjonseksempel: Egne Hjems vei 5, 1356 Bekkestua

Et konkret tilfelle, undersøkt 2026-09-25, som viser hvorfor regelen finnes.

Adressen finnes i Kartverket (5A og 5B). Den er **ikke** i noen av våre kilder, og heller ikke i
råkildene bak dem: ingen enhet i Enhetsregisteret i hele postnummer 1356 ligger på nr. 5, og Bærum
kommune omtaler adressen ingen steder på sine omsorgssider — eneste treff på nettstedet er en side
om stedsutvikling.

**Den skal ikke vises.** Ikke fordi vi mangler en kilde, men fordi ingen ansvarlig myndighet har
publisert et navngitt omsorgstilbud der. Hadde vi tatt den inn via Enhetsregisteret eller ved å
gjette ut fra nærhet, hadde vi brutt regelen over.

Dette er skillet som må holdes når noen melder at «noe mangler»: et manglende sted kan være et
datagap, eller det kan være riktig oppførsel. Her er det begge deler — gapet er ekte for Bærum
generelt, men denne adressen ville ikke dukket opp uansett.

### Bærum: på vent

Bærum kommune publiserer selv 14 omsorgstilbud med navn og adresse — 6 sykehjem og
bo- og behandlingssentre, 3 helsehus og 5 omsorgsboliger. De er innenfor regelen og kan integreres.

Det er **satt på vent** sammen med den øvrige utvidelsen utenfor Oslo (se skolekretser for Bærum og
Asker): kilden er kommunens egne nettsider uten API, og lisensen er ikke avklart. Begge deler hører
hjemme i samme henvendelse til kommunen.

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

**Besøkende, cookies og personvernsiden.** Beslutningen står i
[ADR 013](adr/013-privacy-and-cookies.md), og gjennomgangen i
[research/personvern-cookies-audit.md](research/personvern-cookies-audit.md). NaboRadar er et privat, ikke-kommersielt prosjekt;
behandlingsansvarlig er Thomas Halmø, kontakt `kontakt@naboradar.no` (`lib/site.ts`). Ingen
foretak, ingen org.nr. og ingen adresse på siden. Gjennomgang 3. oktober 2026, i kode og mot
produksjon:

- Vanlige besøkende får ingen cookies, og `localStorage`/`sessionStorage` brukes ikke. Eneste
  cookie er Supabase-innloggingen på `/admin`, som er strengt nødvendig. Derfor intet
  samtykkebanner og ingen egen cookieside.
- Ingen analyse, sporing, tredjepartsskript eller iframes. Skrift og MapLibre ligger på eget domene.
- Nettleseren snakker bare med naboradar.no og `cache.kartverket.no` (kartfliser, ser IP-en).
- Serveren sender søketekst til Kartverket og koordinater til Geonorge, NVE, NGU,
  Miljødirektoratet og Statens vegvesen. Svar caches ti minutter i minnet.
- Netlify har tekniske logger med IP og URL, inkludert `label` på `/omrade`. Netlify deltar i
  EU-U.S. Data Privacy Framework.

`/personvern` beskriver akkurat dette. Kommer det analyse, innbygd innhold, kontoer eller varsler
for vanlige brukere, må både teksten og spørsmålet om samtykke vurderes på nytt. Bunnteksten
(`components/SiteFooter.tsx`) ligger i rot-layouten og vises ikke på `/admin` og `/dev`.

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
| **Fem av seks research-kategorier er ikke bygget** | Datasenter/industri, omsorg/bofellesskap, forsvar/militært, større prosjekter og notater mangler både datamodell og innhold. To av dem berører data vi bevisst har valgt å ikke samle — se seksjon 23 og discovery-notatene. Sømmen `extraSections` står klar |
| **Skolekretser dekker bare Oslo, og bare barnetrinnet** | Ingen nasjonal kilde finnes: Geonorge har to skolekrets-datasett i hele landet, begge fra Halden. Hver kommune publiserer sitt eget |
| **Tilfluktsrom har ikke areal, type eller status** | DSBs datasett har dem ikke. Vi viser romnummer, stedsbeskrivelse, plasser og posisjon |
| **`/omrade` lister ikke tilfluktsrom utenfor valgt radius** | Den sier at ingen ligger innenfor, og lenker til de nærmeste. Uten rom innen 10 km vises seksjonen ikke: 556 rom i hele landet betyr at mange adresser ikke har noen i nærheten, og en fast linje ville vært støy |
| **Skolekretsenes lisens er ikke avklart** | Tjenesten oppgir «Copyright Plan- og bygningsetaten i Oslo kommune». Tredje Oslo-kilde uten åpen lisens — bør avklares samlet |
| **Skolekretsene har ingen datostempling** | Grensene revideres hver høst, og innholdshashen i sync-laget er vårt eneste signal om at det har skjedd |
| **Fem skolekretser mangler organisasjonsnummer** | Manglerud, Munkerud, Nordseter, Rosenholm og Vestli finnes ikke i Geonorge-laget vi synker skoler fra. Da viser vi navnet uten kobling |
| **Omsorgstilbud dekker i hovedsak Oslo** | Bygget på kommunens egen publisering. Helsenorge gir nasjonal dekning for spesialisthelsetjeneste, men ikke for kommunale sykehjem, omsorgsboliger og bofellesskap. Ingen nasjonal kilde finnes, og Enhetsregisteret skal ikke brukes til formålet — se seksjon 23 |
| **Sykehus og omsorgstilbud er kuraterte filer** | Reverifiseres med scripts, ikke live-synk |
| **DiBK mangler formål, status og sluttdato som felt** | Formålet siteres fra dokumentene der det lar seg trekke ut (rundt to av tre saker). Status etter varselet er ukjent, og det sier vi |
| **DiBK har bare varsler fra private forslagsstillere, fra mai 2024** | Tom tilstand og «Kilde og metode» sier det. Kommunale og statlige planer mangler |
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
| `admin_research_*` | **Nei — unikt, og det mest verdifulle i basen** | `scripts/research/funn.ts` gjenskaper funnene og primærkildene med `research:seed`, men ikke reviews, runder, datasenterdetaljer, roller, feltkilder eller sekundærkilder |

**Researchbasen har ingen backup utenfor Supabase.** En jevnlig `pg_dump --data-only` av
`admin_research_*` og `admin_users` til et annet sted er noen megabyte og er det eneste som ikke
kan bygges opp igjen fra offentlige kilder. Se
[dataarkitekturen](data-architecture.md#20-backup-og-gjenoppretting).

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
npm run research:seed        # legg inn/oppdater kuraterte research-funn. Idempotent
npm run review:backfill # gir eksisterende research-items en reviewplan
```

### Sync

```bash
npm run sync:worker                                  # det en scheduler kaller
npm run sync:worker -- --provider=<id> --mode=full   # én kilde alene
npm run sync:worker -- --provider=<id> --force       # godta datafall og kjør reconciliation
npm run sync:status                                  # helsetilstand per provider
npm run sync:dibk                                    # full DiBK-sync (-- --mode=incremental)
npm run sync:area                                    # full sync av områdefakta
npm run huts:elevation                               # lagre terrenghøyde for hytter som mangler den
npm run lookups:check                                # sjekk de direkte oppslagskildene og lagre status for /admin
npm run plans:enrich                                 # les planinitiativ og varsel for nye plansaker (tiltakstype og formål)
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

Kort ADR-form. De formelle ADR-ene ligger i [docs/adr/](adr/README.md), med indeks. De nyeste
(005–013) dekker hyttesidenes cache og høyde, adresse-først, kildemodellen, etatens publiserte
produkt, sikkerhetsmodellen, hyttekildene, tilgangssemantikken, SEO/crawlere og personvern.

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

**Hvorfor offentlig lesing bare går gjennom RPC, og hvorfor kategorier har et publiseringsflagg**
Før basen fylles med store og delvis lisensbelagte datasett, må «lagret» og «publisert» være to
forskjellige ting. Med direkte tabelltilgang var de det ikke: en rad var offentlig i det
øyeblikket synken skrev den. Nå er det eneste offentlige det lese-RPC-ene returnerer, og
`features_near` returnerer bare kategorier med `is_public = true` i `area_feature_categories`.
Et datasett kan dermed importeres, kontrolleres i admin og publiseres etterpå. Registeret
erstatter også CHECK-listen på `area_features.category`, som måtte skrives om for hver ny
kategori. Se [dataarkitekturen](data-architecture.md#17-offentlig-leseflate-og-sikkerhet).

**Hvorfor bulk-geometri ikke skal i `area_features`**
Tabellen er laget for steder med identitet: uuid, hash, generert midtpunkt og en sync som går
rad for rad. Målt på 10 millioner syntetiske rader holder lesespørringene, men synken gjør det
ikke — den skriver om hver uendret rad. Myr, stier og innsjøflater får egne tabeller per datasett,
lastes som hele versjoner, og leveres til kartet som forhåndsgenererte fliser. Et datasett over
100 000 rader er et bulk-lag til det motsatte er begrunnet. Se
[dataarkitekturen](data-architecture.md#5-kanoniske-enheter-eller-bulk-lag).

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

**Hvorfor hyttesidene leses anonymt og caches, og høyden lagres ved sync**
[ADR 005](adr/005-cached-public-hut-pages.md). Siden skal være lik for mennesker, søkemotorer og
admin, svare raskt og vise samme fakta hver gang. Den anonyme lesestien bruker de samme RPC-ene
som før — ingen nye grants. Admin-endringer tømmer cachen med `revalidatePath`; synken slår
gjennom innen en time. Høyden er en egenskap ved punktet og lagres med posisjonen den gjelder,
i stedet for å hentes live med tre sekunders frist.

**Hvorfor ikke scraping av Oslo byggesak**
[ADR 004](adr/004-no-scraping-oslo.md). Ingen dokumentert offentlig API, og scraping av en
innsynsløsning er hverken robust eller ryddig.

---

## 32. Roadmap / idébank

**Alt i denne seksjonen er `Ikke implementert`.** Ingenting her skal leses som at det finnes.

Dette er en idébank for *funksjonalitet*. Prioritering av **datakategorier** hører ikke hit — den
står i [data-roadmapen](data-roadmap.md), som også dokumenterer hva som er vurdert og bevisst lagt
bort.

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
| Hva en research-kilde bekrefter | Ikke implementert | `primary_source` sier om kilden er primær, ikke *hva* den bekrefter. Kartverket bekrefter adressen og Brønnøysund selskapet, men ingen av dem at det ligger et datasenter der. Dekning av «anlegget er primærbekreftet» kan derfor ikke telles uten skjønn: i primærkilde-runden 2026-09-30 ga automatisk telling 19/20 og streng vurdering 11/20. Mulig løsning: et kontrollert `confirms`-felt på kilden (`facility`, `address`, `company`, `power`, `status`). Hack ikke skillet inn på utgivernavn |

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

---

## 34. Synlighet og indeksering

Målet er at **tjenesten** skal være lett å finne — ikke at hver privatadresse skal bli en side i
Google. Det skillet styrer alt under.

### Hva som indekseres

| Side | Indeks | Canonical | Hvorfor |
|---|---|---|---|
| `/` | **Ja** | `/` | Forklarer hva tjenesten dekker, i tekst |
| `/skolekrets` | **Ja** | `/skolekrets` | Landingsside for et reelt søkebehov |
| `/tilfluktsrom` | **Ja** | `/tilfluktsrom` | Samme — offentlige tilfluktsrom nær en adresse |
| `/hytter` | **Ja** | `/hytter` for alle parametervarianter (`?hytte=`, `lat`/`lng`, `fra`, `radius`) | Hyttekartet. Parametrene er tilstand, ikke egne sider |
| `/hytter/fylke/[slug]` | **Ja** | Egen fylkesside | 15 fylker. Hyttene per kommune, med lenke til hver hytteside. Se [ADR 014](adr/014-county-pages-and-sitemap.md) |
| `/hytter/[ref]` | **Ja**, unntatt `not_public` (`noindex, follow`) | Adressen med gjeldende navn | Én side per offentlig hytte, med fakta i HTML-en. Se [ADR 012](adr/012-hut-seo-and-crawlers.md) |
| `/personvern` | **Ja** | `/personvern` | Personvernerklæringen |
| `/sak/[id]` | **Ja** | `/sak/[id]` uten kontekst | Ekte, unikt offentlig innhold per plansak |
| `/omrade` | **Nei** — `noindex, follow` | `/omrade` | Ett oppslag per adresse. Hver kombinasjon av lat, lng, radius, label og sortering er en ny URL |
| `/admin` | **Nei** — `noindex, nofollow` | | Driftsside |
| `/dev` | **Nei** — 404 i produksjon | | Finnes bare i development |
| `/api/*` | Disallow i robots.txt | | Ikke innhold |

**Hvorfor `/omrade` er noindex:** uten det tilbyr vi Google et ubegrenset antall nesten like
sider, og gjør privatadresser søkbare. `follow` står på, så lenkene videre til saksidene følges.

**Hvorfor `/sak/[id]` har canonical:** URL-en bærer søkekonteksten (`lat`, `lng`, `radius`,
`label`) så «tilbake» og avstand virker. Uten canonical ville hver variant vært en egen side.

Skulle saksidene vise seg å bli vurdert som tynt innhold, er det én linje å slå dem av:
`robots: { index: false, follow: true }` i `generateMetadata`.

### Teknisk oppsett

- **`metadataBase`** settes i `app/layout.tsx` fra `NEXT_PUBLIC_SITE_URL`, med
  `https://naboradar.no` som standard. Uten den blir canonical og OpenGraph relative, og da
  ignoreres de.
- **`robots.txt`** genereres av `app/robots.ts` og peker på sitemap og host.
- **`sitemap.xml`** genereres av `app/sitemap.ts` (revalidert hver time) og inneholder `/`,
  `/skolekrets`, `/tilfluktsrom`, `/personvern`, `/hytter`, fylkessidene og hver hytte en anonym
  besøkende kan se, unntatt `not_public` (1 524 URL-er 2026-10-03). Saksidene oppdages via lenker.
  **Ingen `lastmod`, `priority` eller `changefreq`**: vi har ingen meningsfull endringsdato, og
  tidspunktet sitemapen genereres, er ikke en ([ADR 014](adr/014-county-pages-and-sitemap.md)).
- **Strukturerte data**: `WebSite` og `WebApplication` på forsiden. På hyttesidene `Place` med
  `@id` (kanonisk URL + `#sted`), `url`, koordinater og kommune med fylket over, og
  `BreadcrumbList` (Hytter og koier → fylke → hytte) når fylket er kjent. På fylkessidene
  `BreadcrumbList` (Hytter og koier → fylke). Som JSON-LD. Ingen
  `FAQPage` — vi har ingen synlig FAQ. Ingen `SearchAction` — søket vårt tar koordinater, ikke
  en fritekststreng, så en søke-URL-mal ville lovet noe som ikke virker. **Schema skal alltid
  matche det som faktisk står på siden.**
- **Språk**: `lang="nb"` på `<html>`, `og:locale: nb_NO`.

### AI-søk og crawlertilgang

`robots.txt` har én regel for alle: `Allow: /` utenom `/admin`, `/dev` og `/api/`. Ingen
søkerobot er blokkert — heller ikke OAI-SearchBot (ChatGPT-søk) eller PerplexityBot.

**GPTBot (OpenAIs innhenting til modelltrening) er også tillatt, men bare fordi ingen regel
nevner den.** Det er ikke en aktiv beslutning: om innholdet skal kunne brukes til modelltrening,
avgjøres separat fra om tjenesten skal kunne finnes i AI-søk. Se
[ADR 012](adr/012-hut-seo-and-crawlers.md). Legges det inn en egen regel for én robot, gjelder
ikke fellesregelen for den lenger, og utelukkelsene må gjentas.

Ingen bot-beskyttelse eller JS-utfordring står foran sidene. Netlifys grense på antall kall
gjelder bare `/api/*` (120/min) og `/omrade` (240/min) — se [17. Rate limiting](#17-rate-limiting).
Kontrollert 2026-10-03 med OAI-SearchBot, GPTBot, ChatGPT-User og Googlebot: 200 på alle sider,
og 40 hyttesider etter hverandre uten 429 ([research/ai-sok-aeo-audit.md](research/ai-sok-aeo-audit.md)).

**Caching per flate**, kort (detaljene står i [16. Endepunkter](#16-endepunkter)):

| Flate | Cache |
|---|---|
| `/`, `/skolekrets`, `/tilfluktsrom`, `/personvern` | Statisk; forsiden revalideres hvert 5. minutt |
| `/hytter/[ref]`, `/hytter/fylke/[slug]` | ISR i en time, tømmes av `/admin/hytter` ([ADR 005](adr/005-cached-public-hut-pages.md), [ADR 014](adr/014-county-pages-and-sitemap.md)) |
| Antall per fylke på `/hytter` | `unstable_cache` i en time, taggen `hytter-oversikt`, tømmes av `/admin/hytter` |
| `/hytter`, `/omrade`, `/sak/[id]` | Dynamisk, ingen delt cache |
| `sitemap.xml` | Revalideres hver time |
| `/api/*` | Bare nettleserens egen cache, eller `no-store` |

Det som gjør innholdet lett å sitere er ikke triks, men det samme som gjør det lett å lese:
alt er server-renderet og finnes i HTML-en (også skolekretsnotisen, verifisert), kilden står
ved siden av påstanden, og forbeholdene står i samme avsnitt som tallet. Stabile URL-er, og
ingen påstand uten kilde.

### Search Console — må gjøres manuelt

Dette er ikke gjort, og kan ikke gjøres fra repoet:

1. Legg til `naboradar.no` på [search.google.com/search-console](https://search.google.com/search-console)
2. Verifiser som **domeneeiendom** med en TXT-post i DNS hos Domeneshop — den dekker både
   `www` og apex, og både http og https
3. Send inn `https://naboradar.no/sitemap.xml` under **Sitemaps**
4. Bruk **URL-inspeksjon** på `/` og `/skolekrets` og be om indeksering
5. Følg **Ytelse** for hvilke søk som faktisk treffer, og **Sider** for hva som blir indeksert.
   Forvent at `/omrade` rapporteres som «Ekskludert av noindex» — det er meningen

Bing Webmaster Tools kan importere oppsettet fra Search Console, og dekker samtidig flere
AI-søkeroboter.

Status 2026-10-03: DNS for `naboradar.no` har en `google-site-verification`-TXT-post, så
verifiseringen er trolig påbegynt. Om sitemapen er sendt inn i Search Console eller Bing, kan
ikke ses fra repoet.

---

## 35. Privat research

Et internt arbeidslag for funn og leads rundt adresser: ting noen har undersøkt, med nok
provenance til at neste person kan etterprøve vurderingen. Det er **ikke** en kilde til det
offentlige produktet.

> **Research publiseres aldri automatisk.** Ingen kodevei går fra research til `area_features`,
> `events`, kartet, `/omrade` eller sitemap. Skal et funn ut til brukerne, må det gjennom den
> vanlige veien: en provider, en kilde med avklart lisens, normalisering og en visningsregel.

### Modellen

To tabeller, `admin_research_items` og `admin_research_sources`, begge i `public` med RLS.

| Felt | Verdier |
|---|---|
| `item_type` | `finding`, `lead`, `note`, `data_issue` |
| `verification_status` | `unverified`, `partially_verified`, `verified_public_source`, `investigated_not_confirmed`, `rejected`, `archived` |
| `operational_status` | `active`, `planned`, `under_construction`, `historical`, `closed`, `unknown` |
| `sensitivity` | `normal`, `internal_only`, `do_not_publish` |
| `confidence`, `interest_level` | `low`, `medium`, `high` |

**Manuelt vs. importert.** `origin_type` er `manual` eller `imported`. Manuelle leads får
`origin_type = manual`, `verification_status = unverified` og `sensitivity = internal_only` som
standard — et nytt funn er internt og ubekreftet til noen har gjort arbeidet. Importerte funn
**må** ha `origin_provider`; det er en CHECK i databasen, slik at et importert funn alltid kan
spores til synken som laget det. Samme modell bærer begge, så en senere import ikke krever et
nytt skjema.

**Flere kilder per funn.** Provenance ligger i `admin_research_sources`, ikke i ett `source_url`.
Et fysisk sted er **ett** funn med flere kilder. `primary_source` sier hvilke som er hovedkilder;
`supports_claim` sier om kilden støtter påstanden. En kilde som ble undersøkt og *ikke* fant noe
lagres på samme måte som en som fant noe — det er nettopp den som gjør
`investigated_not_confirmed` etterprøvbar et år senere.

**Koordinat.** `latitude`/`longitude` er enten begge satt eller begge tomme (CHECK), og `geom`
avledes av dem. Uten koordinat vises funnet i `/admin/research`, men ikke i adressesøket.

### Tilgang

Helt admin-only, håndhevet i databasen:

| Lag | Regel |
|---|---|
| Grants | `revoke all … from anon, authenticated`, deretter kun `select` til `authenticated` |
| RLS | Én policy per tabell: `for select to authenticated using (public.is_admin())` |
| Lesefunksjoner | `research_items`, `research_sources`, `research_near` — security definer, `is_admin()` i WHERE |
| Skrivefunksjoner | `save_research_item`, `add_research_source`, `delete_research_source` — reiser `42501` uten `is_admin()` |
| EXECUTE | Revokes fra **både** `public` og `anon`, granted til `authenticated`. `db:verify` håndhever det |
| Webappen | Ingen skrivenøkkel. Alle kall går via admins egen sesjon, så `is_admin()` avgjør |

Verifisert mot produksjon med publishable key: alle seks funksjonene og begge tabellene svarer
`42501 permission denied` for `anon`. En innlogget ikke-admin får null rader, ikke en feil — RLS
filtrerer, og funksjonene returnerer tomt.

`tests/db/admin-research.test.ts` tester rollene direkte i PGlite, og
`tests/admin/research-isolation.test.ts` tester at den offentlige koden ikke har noen vei inn:
`/omrade` nevner ikke research, faktalaget leser den ikke, kategoriene overlapper ikke med
`AREA_CATEGORIES`, og sitemappen inneholder ingen research-URL.

### `/admin/research`

**Research er manuelle, interne funn.** Strukturerte datasett og kartlag hører hjemme i
«Utforsk data» (under).

Liste med søk, åtte filtre og seks sorteringer. Standardvisningen (fra 2026-10-04) viser bare
søk, kommune, kategori og sortering. Type, verifisering, driftsstatus, følsomhet, sikkerhet og
interesse ligger bak **«Flere filtre»** — de er fortsatt tilgjengelige, men skjult som standard.
Er noen av dem i bruk, står utvideren åpen og sier hvor mange («Flere filtre (2)»). Alle filtrene
er vanlige URL-parametre og virker likt uansett hvor de står; lagrede lenker gir samme treff.

Under filtrene står tre innganger: **Utforsk data**, **Review-kø** (med antall som trenger
review) og **Nytt funn**. Visningen ligger i `components/admin/ResearchOversikt.tsx`; siden
henter og filtrerer. Søket går mot databasen og dekker tittel, beskrivelse,
adresse, kommune, sted, kategori, underkategori, notater **og kildenavn** — et søk på
«Kartverket» finner funnene som hviler på Kartverket. Filtrering og sortering skjer i sideren:
volumet er lavt, og én spørring pluss URL-parametre er billigere enn åtte kombinerbare
databasefiltre.

`/admin/research/nytt` oppretter, `/admin/research/[id]` viser funnet med kildene over
redigeringsskjemaet — det er kildene man skal lese før man endrer en status.

### `/admin/research/utforsk` — Utforsk data

**Utforsk data er adminverktøyet for direkte utforsking av strukturerte datasett og kartlag.**
Research er manuelle, interne funn og oppfølgingen av dem; Utforsk data svarer på «hva finnes i
dette datasettet, her?». Kart først: admin skriver «kvikkleire Oslo» eller «datasenter», og
treffene står i kartet og i listen ved siden av. Trykk i kartet eller listen åpner samme
detaljpanel.

**Søket** tolkes deterministisk (`lib/admin/explore/parse.ts`), uten AI: en eksplisitt liste med
ord velger datasettet, og resten er et sted fra Kartverkets kommuneregister (kommune, ellers
fylke). Et sted som ikke finnes der, er ukjent — vi gjetter ikke. Heter flere kommuner det samme
(Herøy, Våler), må admin velge. Et søk som ikke treffer et datasett, sier det og lister
datasettene som finnes; det er ikke et fritekstsøk i hele databasen.

**Datasett-registeret** (`lib/admin/explore/registry.ts`). Hvert datasett er en adapter med
`aliases`, `needsArea`, `policy` og `load`, som henter objektene i et område og gjør dem til
`ExploreFeature` — tittel, type, kort status, rader til detaljpanelet, forklaring, kilde. Siden,
kartlaget (`lib/map/layers/explore.ts`), listen og panelet kjenner bare `ExploreFeature`.
Feltnavn og koder fra kilden vises aldri rått: adapteren oversetter dem, og en kode den ikke
kjenner, utelates.

| Datasett | Søkeord | Kilde og lesevei | Geometri | Uten sted |
|---|---|---|---|---|
| Plansaker | `plan`, `planer`, `plansak`, `plansaker`, `planoppstart`, `reguleringsplan(er)`, `planarbeid` | `events` med uttrekk og dokumenter, via `explore_events` (1 563 saker) | flater | krever område |
| Kvikkleire | `kvikkleire`, `kvikkleiresone(r)`, `kvikkleireområde(r)`, `kvikkleireskred` | `area_features`, `nve-kvikkleire-soner` (4 865), via `explore_area_features` | flater | krever område |
| Kraftnett | `kraftnett`, `kraftlinje(r)`, `kraftledning(er)`, `høyspent`, `høyspentlinje(r)`, `transformatorstasjon(er)`, `trafostasjon(er)`, `nettanlegg` | `area_features`, `nve-nettanlegg` (4 115 ledninger, 1 541 stasjoner), via `explore_area_features` | linjer og punkter | krever område |
| Forurenset grunn | `forurenset grunn`, `forurensning`, `grunnforurensning`, `forurenset`, `forurensede lokaliteter` | `area_features`, `mdir-forurenset-grunn` (15 974), via `explore_area_features` | flater | krever område |
| Datasenter | `datasenter`, `datasentre`, `datacenter`, `data center` m.fl. | research-funn med underkategori «Datasenter», via `research_map` | punkter | hele landet |
| Multe: registrerte funn | `multer`, `multe`, `multefunn`, `registrerte multefunn`, `multebær`, `molte(r)` | `area_features`, `gbif-multefunn-oslomarka` (508 punkter), via `explore_area_features` | punkter | hele dekningsområdet (Oslo og Marka) |
| Myr | `myr`, `myrer`, `myrflate(r)`, `myrområder` | `area_features`, `kartverket-n50-myr-oslomarka` (7 354 flater), via `explore_mires` | flater | krever område |
| Tyttebær: registrerte funn | `tyttebær`, `tyttebaer`, `tyttebærfunn`, `tyttebær funn` | `area_features`, `gbif-tyttebaerfunn-oslomarka` (1 559 punkter), via `explore_area_features` | punkter | hele dekningsområdet (Oslo og Marka) |
| Kantarell: registrerte funn | `kantarell`, `kantareller`, `kantarellfunn`, `kantarell funn` | `area_features`, `gbif-kantarellfunn-oslomarka` (457 punkter), via `explore_area_features` | punkter | hele dekningsområdet (Oslo og Marka) |
| Steinsopp: registrerte funn | `steinsopp`, `steinsopper`, `steinsoppfunn`, `boletus edulis` | `area_features`, `gbif-steinsoppfunn-oslomarka` (313 punkter), via `explore_area_features` | punkter | hele dekningsområdet (Oslo og Marka) |

«Krever område» betyr kommune, fylke eller et kartutsnitt under 80 km.

**Hvor datasettene kan vises** står som `policy` på hver adapter. Utforsk data er admin uansett;
feltet er der for at ingen skal bygge en offentlig visning uten å ha sett beslutningen.

| Datasett | Åpent kart senere | `/omrade` |
|---|---|---|
| Plansaker | ja | ja |
| Kvikkleire | ja | ja |
| Kraftnett | vurderes | ja |
| Forurenset grunn | **nei** | **nei** |
| Datasenter | nei | egen beslutning |
| Multe: registrerte funn | **nei** | **nei** |
| Myr | **nei** | **nei** |
| Tyttebær: registrerte funn | **nei** | **nei** |
| Kantarell: registrerte funn | **nei** | **nei** |
| Steinsopp: registrerte funn | **nei** | **nei** |

Forurenset grunn er og blir internt: ikke på `/omrade`, ikke i noe offentlig kart, og ikke
gjennom noen offentlig RPC. Kategorien er upublisert i `area_feature_categories`.

**To lag.** Søket velger hovedlaget. «+ Legg til lag» legger ett til, for samme område. Aktive
lag står som brikker med ×; fjernes hovedlaget, blir det andre hovedlag med samme sted.
**Høyst to** (`MAX_LAG`): dette er kontrollert research, ikke et GIS. Tilstanden ligger i
URL-en — `q` (datasett og sted), `kommune` (valg ved flertydig sted), `utsnitt`, `lag` (det
andre laget) og `analyse` — så en kombinasjon kan bokmerkes. `lib/admin/explore/visning.ts` gjør URL-en om
til det siden viser, og leser begge lag samtidig: ett kall per lag, samme flate til begge.
Kartet flytter seg når området endres, ikke når lag legges til eller byttes.

**Tomtilstanden forklarer flyten** uten at noen må lære syntaks: én linje («Søk etter ett lag
først. Deretter kan du legge til ett lag til i samme kart.»), noen eksempelsøk som brikker, og
«+ Legg til lag» synlig, men deaktivert, med teksten «Søk etter første lag for å kombinere to
datasett». Én lenke viser en ferdig kombinasjon («Planer + kvikkleire»). Eksemplene ligger i
`lib/admin/explore/eksempler.ts` og testes mot registeret. Etter første søk står «+ Legg til
lag» ved lagbrikkene; listen der kommer fra registeret, uten hovedlaget. Med to lag er den
borte. Søket har ingen `+`-syntaks: veien er alltid søk først, så «Legg til lag».

Hvert objekt vet hvilket lag det hører til (`datasetId`, `datasetLabel`), og panelet sier det:
«Plansaker · Varslet planoppstart». Ligger flere objekter under samme trykk — fra ett eller to
lag — får admin en liste og velger; det åpnes aldri flere paneler.

**To moduser ved kompatible lag: «Vis sammen» og «Finn overlapp»**
([ADR 017](adr/017-romlig-analyse-utforsk-data.md)). «Vis sammen» er standard og påstår
ingenting om hvordan lagene forholder seg til hverandre. «Finn overlapp» filtrerer hovedlaget
til objektene som treffer det andre laget, og sier hvor mange det ble lett blant: «6 av 53
plansaker overlapper kartlagt kvikkleiresone.» Valget ligger i URL-en (`analyse=overlapp`).

| Hovedlag | Referanselag | Hva som er et treff | Slik sies det |
|---|---|---|---|
| Plansaker | Kvikkleire | minst 10 m² felles areal med en kartlagt sone. Områder utredet uten fare er ikke soner | «Planområdet overlapper 3 kartlagte kvikkleiresoner» |
| Plansaker | Forurenset grunn | minst 10 m² felles areal med en registrert lokalitet | «Planområdet overlapper 2 registrerte lokaliteter for forurenset grunn» |
| Plansaker | Kraftnett | ledningen eller stasjonen treffer planområdet | «2 kraftledninger krysser planområdet», «1 transformatorstasjon ligger innenfor» |

- **Asymmetrisk.** Resultatlisten er hovedlagets objekter. Referanselaget ligger dempet i kartet
  og kan trykkes der, men har ingen egen liste. «Kvikkleire + plansaker» støttes ikke; siden
  sier det og tilbyr å bytte hovedlag.
- **Ikke alle kombinasjoner.** Et datasett sier selv hva det kan testes mot
  (`ExploreDataset.overlap`). For resten er «Finn overlapp» deaktivert med en kort forklaring.
  Analysen krever et sted eller et kartutsnitt.
- **Berøring og fliser.** Målt på ekte data berørte ingen par hverandre bare i grenselinjen, men
  forurenset grunn hadde fliser på 1–6 m² der to flater følger samme eiendomsgrense. Derfor er
  regelen 10 m², ikke «berører». Plansaker som bare har en flis, er ikke treff, men nevnes:
  «3 plansaker til har under 10 m² felles med en registrert lokalitet og er ikke regnet med.»
- **Presis geometri.** `explore_events_overlap` regner på geometrien slik den ligger i
  databasen, med areal på ellipsoiden. Bare flaten som sendes til kartet, er forenklet.
- **Soner telles etter navn.** NVE har løsneområde og utløpsområde som hver sin flate; panelet
  viser én sone og hvilken del som treffes.
- **Egen blokk i panelet**, merket «NaboRadars romlige analyse», under plansakens egne
  opplysninger. Den lister det som ble truffet, med kildens egne ord for hvert objekt, og sier
  at dette er en sammenligning av kartflater — ikke en faglig vurdering og ikke en del av
  plansaken. For forurenset grunn står det at overlappet ikke betyr at hele planområdet er
  forurenset.
- **Ikke i UI:** overlappareal og andel av planområdet. Summen blir feil når sonene overlapper
  hverandre, se ADR 017.
- **Kartet kan vise færre referanseobjekter enn analysen bruker** (taket på 1 500). Da står det.

Målt mot produksjon 2026-10-04 (varme kall; svaret fra databasen):

| Område | Kvikkleire | Forurenset grunn | Kraftnett |
|---|---|---|---|
| Oslo (53 plansaker) | 6 treff, 0,08–0,13 s, 19 kB | 36 treff + 3 fliser, 0,13 s, 115 kB | 9 treff, 0,08 s, 27 kB |
| Bærum (39) | 4 treff, 0,07 s, 14 kB | 15 treff, 0,10 s, 57 kB | 3 treff, 0,07 s, 12 kB |
| Trondheim (55) | 5 treff, 0,06 s, 13 kB | 31 treff + 2 fliser, 0,08 s, 107 kB | 5 treff, 0,06 s, 12 kB |
| Trøndelag (152) | 12 treff, 0,10 s, 28 kB | 47 treff + 4 fliser, 0,13 s, 160 kB | 9 treff, 0,10 s, 20 kB |

Første kall var 0,2–0,8 s. Begge romlige indekser brukes (`events_geom_gix`,
`area_features_geom_gix`).

Farger: plansaker blå, kvikkleire oransje (grønn for «utredet uten fare»), forurenset grunn
blågrønn, kraftnett lilla, datasentre mørk grå. Flatene har lavt fyll og tydelig kant, så to
flatelag kan leses oppå hverandre. Ledninger har en usynlig, bredere treffsone.

**Nytt datasett:** skriv en `ExploreDataset` med `policy` (og `coverage` hvis det ikke er
landsdekkende, `queryWord` hvis navnet ikke er et søkeord), legg den i listen i `registry.ts`, og
gi objekttypen en farge i kartlaget. Ligger dataene i `area_features`, kan `load` bruke
`hentAreaFeatures` (`lib/admin/explore/area-features.ts`). Ligger de i en egen tabell, trengs en
egen avgrenset admin-RPC etter mønsteret i `explore_events` — og den må inn i `RESEARCH`-listen
i `scripts/verify-db.ts`. Ingen endring i siden.

**Plansaker.** Varsler om planoppstart fra DiBK — de samme sakene som «Planer og saker» på
`/omrade`, spurt etter område. Panelet viser tiltakstype, formål (ordrett sitat, bare når
uttrekket fant et), plantype, forslagsstiller, varslingsdato, kommune, planområde, dokumenter
med lenke og lenke til saken. Nyeste varsel først. **Vi viser ingen status vi ikke har:**
kilden sier at planarbeid er varslet, ikke om planen senere er vedtatt, endret eller lagt bort,
og den setningen står i panelet.

**Kraftnett.** NVEs kraftledninger og transformatorstasjoner. Jordkabler og det lokale
distribusjonsnettet er ikke med. En ledning uten egennavn heter «Kraftledning 132 kV». Panelet
viser type, navn, spenning, nettnivå, eier og kommune.

**Forurenset grunn.** Miljødirektoratets registrerte lokaliteter. Panelet bruker myndighetens
egne kategorier (påvirkningsgrad, oppfølging, tilstandsklasse, arealbruk) med de samme tekstene
som resten av løsningen, og gjør dem ikke sterkere. En registrering gjelder lokaliteten slik den
er avgrenset, ikke hele eiendommen. Panelet sier at datasettet er internt.

**Multefunn, tyttebærfunn, kantarellfunn, steinsoppfunn og myr (interne researchlag, bare Oslo og
Marka).** Fem datasett for personlig research: hvor er multe, tyttebær, kantarell og steinsopp
registrert, og hvor ligger myrene. **Ingen score og ingen sannsynlighet**
— researchen ([multer-oslo.md](research/multer-oslo.md)) viste at en habitatmodell i praksis ble
et myrkart, så vi lagrer dataene og lar kartet vise dem. Aldri offentlig: kategorien
`natur_intern` er upublisert, og dataene leses bare gjennom admin-funksjonene.

- *Multe: registrerte funn* — GBIF (Artsobservasjoner m.fl.), fra 2000, presisjon ≤ 100 m, CC BY
  4.0 eller CC0, artsbestemt av et menneske (ikke Pl@ntNet), én per 100 m-rute (den nyeste).
  Observatør og stedsbeskrivelse lagres ikke. Panelet viser dato, år, presisjon, datasett,
  lisens og lenke til GBIF, og sier: «Registrert observasjon – sier ikke noe sikkert om forekomst
  i dag.» Et funn som er ti år eller eldre, får i tillegg at det sier lite om hva som står der nå.
- *Myr* — flater fra Kartverkets N50 (CC BY 4.0), 1:50 000. Små myrer mangler. FKB-AR5 er ikke
  åpne data og brukes ikke. Panelet viser areal og kommune, og en egen blokk «Registrerte
  multefunn i nærheten»: antall funn innen 500 m, og avstanden til det nærmeste hvis det ligger
  innen 2 km («på myra», «i myrkanten» under 10 m, ellers avrundet til ti meter). Det nærmeste
  funnet kan åpnes fra panelet når funnlaget er aktivt. Blokken sier at dette er
  observasjonskontekst, ikke en sannsynlighet: en myr uten funn kan være en myr ingen har
  registrert noe på.
- *Tyttebær: registrerte funn* — samme kilde, samme utvalg og samme panel som multefunnene, med
  en annen art (`lib/providers/gbif/multefunn.ts` tar arten som parameter). 1 559 punkter.
  **Ingen score og intet habitatlag:** furu og lav bonitet er reelle signaler, men gir bare løft
  på rundt 2, og tyttebær står nesten overalt i skog
  ([tyttebaer-oslo.md](research/tyttebaer-oslo.md)). Kildene sier ikke om planten hadde bær —
  feltet er fylt ut for 7 av 2 674 registreringer — så datasettet sier at funnene gjelder planten.
  Oppdateres med `npm run sync:area -- --provider=gbif-tyttebaerfunn-oslomarka`.
- *Kantarell: registrerte funn* — samme kilde og utvalg, 457 punkter, og i tillegg **funn i
  flere sesonger**. Ved import telles alle brukbare registreringer innen 250 m av hvert funn
  (også dem som tynnes bort): antall, ulike år og ulike observatører. Listen viser stedene med
  flest sesonger først, og panelet har blokken «Registrert her før» («Registrert i 5 ulike år»,
  «12 registrerte funn innen 250 m, fra 2018–2026»). Det er en opptelling, merket som det — ikke
  en sannsynlighet. Observatørnavn brukes til å telle og lagres ikke. Registreringer kilden
  merker som uverifiserte eller automatisk godkjent, tas ikke inn (gjelder alle artene).
  Ingen habitatmodell og intet værvarsel ([kantarell-oslo.md](research/kantarell-oslo.md)).
  Oppdateres med `npm run sync:area -- --provider=gbif-kantarellfunn-oslomarka`.
- *Steinsopp: registrerte funn* — *Boletus edulis* strengt, 313 punkter, med samme gjentak og
  samme panel som kantarell. Bleklodden og rødbrun steinsopp er egne arter og er ikke med.
  Gamle funn får teksten «Et gammelt funn kan fortsatt være interessant, men sier ikke om det
  kommer steinsopp her i år.» Ingen habitatmodell: steinsopp står på rikere og mer kalkholdig
  grunn enn kantarell, men ikke mer enn andre soppfunn
  ([steinsopp-oslo.md](research/steinsopp-oslo.md)). Oppdateres med
  `npm run sync:area -- --provider=gbif-steinsoppfunn-oslomarka`.
- Avstanden regnes i databasen (`explore_mires`), fra myrflaten til punktet, i UTM 33. Avviket fra
  ellipsoiden er ca. 0,03 % ved Oslo. Arealet regnes på ellipsoiden.
- **Dekning.** Datasettene har `coverage` i registeret. Et søk utenfor («multer Bergen») sier
  «dekker foreløpig bare Oslo og Marka» og leser ingenting — det er ikke «ingen treff».
  Boksen er 59,78–60,30° N, 10,30–11,10° Ø (`lib/multe/omrade.ts`).
- **Import.** Kildene ligger i `lib/providers/gbif/multefunn.ts` og
  `lib/providers/kartverket/n50-myr.ts`, og har ingen tidsplan. Oppdater for hånd:
  `npm run sync:area -- --provider=gbif-multefunn-oslomarka` og
  `npm run sync:area -- --provider=kartverket-n50-myr-oslomarka`. Utvalget er deterministisk.
- Målt 2026-10-04: myr i Oslo (1 130 flater) 0,45 s, Nittedal 0,35 s, hele Akershus (1 500 av
  5 246) 1,6 s. Funn: under 0,1 s. Siden sender 1,5 MB for myr i Oslo.

**Kvikkleire.** Datasettet er NVEs *kartlagte* kvikkleiresoner, med status (mulig, påvist,
utredet uten fare), risikoklasse og faregrad slik kilden har dem. *Aktsomhetsområdene* er et
annet kart — 148 235 flater som ikke ligger i databasen. De vises ikke som flater. Et trykk i
kartet der det ikke er noe objekt, sjekker punktet mot NVEs aktsomhetskart når kvikkleire er et
av lagene, og svarer «innenfor», «utenfor» eller «ikke dekket». Et aktsomhetsområde presenteres
aldri som en kartlagt sone.

**Datasenter.** Ikke et eget register: research-funnene leses gjennom samme vei som
research-kartet. Bare funn med koordinat og standard verifisering vises. Panelet sier at det er
et internt research-funn, og lenker til funnet for kilder og notater.

**Avgrenset lesing.** Begge lese-RPC-ene krever et utsnitt, eventuelt avgrenset videre av
kommune- eller fylkesflaten, og forenkler geometrien etter utsnittets bredde.
`explore_area_features` gir høyst 2 000 objekter per kall (siden ber om 1 500, de største
først), `explore_events` høyst 2 000 (siden ber om 800, nyeste først). `total` sier hvor mange
som fantes. Nås taket, står det i listen: «Viser de første 1 500 av 2 899 treff. Zoom inn eller
avgrens området.» Aldri kuttet i stillhet. Et lag som krever område og ikke har fått et, leses
ikke, og vises som «ikke vist» — ikke som 0. Ingen bulkeksport, og ingen nasjonal GeoJSON i
nettleseren.

Flaten og utsnittet tolkes én gang i plpgsql-variabler; som del av spørringen ble kommuneflaten
tolket for hver rad, og Oslo tok halvannet minutt. `area_features` har GiST-indeks på `geom`
(`area_features_geom_gix`), `events` på `geom` (`events_geom_gix`); begge brukes.

Målt mot produksjon 2026-10-04 (tre kall, varmt; første kall i parentes):

| Område | Plansaker | Kraftnett | Forurenset grunn |
|---|---|---|---|
| Oslo | 53 saker, 0,08–0,15 s (0,75), 90 kB | 144 anlegg, 0,07 s (0,10), 76 kB | 1 500 av 2 899, 0,62 s (0,90), 1,4 MB |
| Bærum | 39, 0,08 s (0,12), 79 kB | 44, 0,06 s, 22 kB | 249, 0,13 s, 216 kB |
| Trondheim | 55, 0,07 s (0,18), 109 kB | 60, 0,05 s, 32 kB | 1 461, 0,16 s, 1,1 MB |
| Trøndelag | 152, 0,12 s (0,27), 273 kB | 446, 0,10 s, 221 kB | 1 500 av 2 492, 0,25–0,30 s, 1,1 MB |
| Innlandet | 124, 0,18 s (0,43), 216 kB | 466, 0,21–0,32 s (0,82), 224 kB | 1 185, 0,46 s (1,02), 871 kB |

Størrelsene er svaret fra databasen. Det siden sender til nettleseren er større, fordi hvert
objekt har ferdige panelrader: forurenset grunn i Oslo er 2,4 MB. Det er det tyngste søket som
finnes i dag, og grunnen til at taket står på 1 500.

**Bare admin.** Siden sjekker sesjonen. `explore_area_features`, `explore_events`,
`explore_events_overlap`, `explore_mires` og `research_map` gir bare rader når `is_admin()` er sann, anon har ikke EXECUTE, og
aktsomhetssjekken er en server action som sjekker sesjonen selv. Ingen nye offentlige ruter
eller API-er. `npm run db:verify` kontrollerer rettighetene.

### Adressesøk og kart

I `/admin/adresse` kommer research inn gjennom `extraSections`-sømmen, gruppert per kategori, med
nærmeste funn først. **Tomme kategorier vises ikke.** Kortene har to metalinjer:

```
280 m · Datasenter og industri
Planlagt produksjonsanlegg for eksplosiver
PLANLAGT · MEDIUM SIKKERHET · INTERESSE HØY · 3 KILDER · INTERN
```

**Rekkefølgen** er interesse → sikkerhet → avstand. Et høyinteressant funn to kilometer unna skal
komme før et middels interessant i nabogården: i admin leter man etter hva som er verdt å vite,
ikke etter hva som tilfeldigvis er nærmest. Kategorigruppene sorteres etter sitt beste funn, og
tomme grupper finnes ikke.

**Kortene er kompakte.** Kollapset viser de fem tingene som avgjør om man vil åpne dem: avstand
(eller «Omfatter valgt sted»), tittel, adresse, interesse og sikkerhet, antall kilder og INTERN.
Kategorien står i gruppeoverskriften og gjentas ikke på kortet. Alt annet — beskrivelse,
`why_interesting`, verifisering, driftsstatus, notater og lenken til funnet — ligger bak
«Detaljer».

Tekniske databaseverdier vises ikke. «Ukjent status» er ikke informasjon, og utelates når
`operational_status` er `unknown`; opphav og følsomhet hører hjemme i research-oversikten.

**Kartvalg og «Detaljer» er to ulike handlinger med hver sin kontroll.** Å slå dem sammen ville
betydd at et klikk i kartet åpnet alle kortene, eller at man ikke kunne lese detaljene uten å
flytte kartet. Et valgt kort utheves, men åpner seg ikke.

Funn med koordinat tegnes på **samme** kart som de offentlige objektene, gjennom
`internalFeatures` og `lib/map/layers/internal-findings.ts`. Markøren er en annen *form*, ikke
bare en annen farge: en grå ring med kjerne, mens alle offentlige kilder er fylte punkter. Valgt
funn får en glorie, tykkere strek og større kjerne, så ett internt funn skiller seg fra de andre
interne — ikke bare fra de offentlige.

| | Uvalgt | Valgt |
|---|---|---|
| Glorie | — | r 19, `#0f172a` 16 % |
| Ring | r 8, strek 2,5 `#334155` | r 12, strek 4 `#0f172a` |
| Kjerne | r 2,5 | r 4 |

Valget går gjennom `MapSelectionProvider`. Popupen viser tittel, adresse, kategori, avstand fra
søkepunktet, verifisering, driftsstatus, sikkerhet, INTERN og lenken «Åpne funnet» — teksten
formuleres i `lib/admin/research-map.ts`, på serveren, ikke i kartet.

Et valgt punkt sentreres på zoom 16 (`minZoom` i `MapPopupContent`) hvis kartet står lenger ute,
og kartet flytter seg ikke i det hele tatt hvis punktet allerede er synlig på et høyt nok nivå. På
mobil, der kartet ligger over listen, hentes kartet fram når du velger fra listen. Funn uten
koordinat kommer aldri fra `research_near`, og kortet deres er ikke klikkbart — det står «uten
kartpunkt» i stedet.

### Research-runder

`admin_research_runs` logger hva hver runde faktisk gjorde: kilder gjennomgått, kilder som var
blokkert, kandidater, opprettede og oppdaterte funn, negative undersøkelser og de viktigste
hullene. Det er metadata om arbeidet, ikke en parallell funnmodell — poenget er at neste runde
skal slippe å gjette seg til hva forrige runde rakk. Samme tilgangsmodell som resten: ingenting
til anon, RLS på `is_admin()`, lesing gjennom `research_runs()`.

### Første research-runde

Kuraterte funn ligger i `scripts/seed-research.ts` (`npm run research:seed`), som er idempotent og
er kilden: funn kjennes igjen på tittel + adresse, felter settes til det som står i skriptet, og
kilder legges til hvis de mangler.

Første runde dekket Oslo, Bærum og Asker med utgangspunkt i våre egne 124 DiBK-plansaker i de tre
kommunene, med krysssjekk mot Kartverket, Enhetsregisteret og kommunenes egne sider. Metodereglene
som faktisk fikk konsekvenser:

- **Selskapsadresse er ikke fysisk anlegg.** Chemring Nobel er den eneste eksplosivprodusenten
  registrert i Asker, men adressen ligger 12 km fra planområdet for «produksjonsanlegg for
  eksplosiver». Koblingen ble undersøkt og lagret som en kilde med `supports_claim = false`.
- **Stedsnavn er ikke en kilde på bruk.** Kartverket fører Løvenskioldbanen som *idrettsanlegg*,
  ikke skytebane. Skytefunksjon er derfor ikke verifisert, selv om «Skytterkollen» ligger 155 m
  unna. Funnet står som `partially_verified` med `confidence = low`.
- **Negative undersøkelser lagres.** Null datasenter-treff i alle 124 plansaker er lagret som et
  funn med `investigated_not_confirmed` — DiBK-kilden dekker bare *nylig varslet* planoppstart, så
  fraværet er ikke en konklusjon om at det ikke finnes datasentre.
- **Ingen masseimport av omsorgsadresser.** Enhetsregisteret ble vurdert og forkastet som inngang;
  næringskode viser kontoradresser, ikke tjenester.

### Research-metoden

**Discovery først → verifisering etterpå → aktiv oppfølging av svake leads.** Dette er
standardmetoden for *all* research, ikke bare datasentre. Spørsmålet er ikke «hva finnes i
API-et?», men «hva kan vi finne ut om området, og hvor godt kan vi dokumentere det?».

**1. Discovery.** Bygg en bred kandidatliste først: websøk, lokalaviser, bransjekataloger,
operatørenes egne sider, kommunale sider, offentlige dokumenter og PDF-er, rapporter,
kartportaler, registre, historiske kilder, gamle og alternative navn. En kandidat forkastes
aldri fordi den ikke finnes i et strukturert datasett. Tredjepartskilder duger som discovery
selv om de ikke alene gir høy confidence.

**2. Verifisering.** Hver kandidat prøves mot, i prioritert rekkefølge: ansvarlig myndighet →
operatør/eier selv → kommunal plan, byggesak eller eInnsyn → offentlige registre og kart →
energi- og nettkilder → flere uavhengige sekundærkilder. Både discovery-kilden og
verifiseringskilden lagres, og det skal gå fram hva som er bekreftet og hva som bare er
indikasjon.

**3. Søk bredt på identiteten.** Alternative og historiske navn, prosjektnavn, selskaps- og
operatørnavn, gatenavn, områdenavn, gårdsnavn, orgnr, plan-ID, saksnummer og facility-kode.
Samme sted finnes ofte under flere navn. Dedupliser på **sted**, ikke navn, og behold aliaser og
operatørhistorikk på funnet.

**4. Svake leads skal følges opp, ikke parkeres.** Et lead med `interest_level = high` og lav
eller middels confidence får normalt en egen oppfølgingsrunde før man går videre til mindre
interessante funn. Oppfølgingen skal forsøke å avklare fysisk lokasjon, primærkilde, en ekstra
uavhengig kilde, status, om navnet gjelder selskap/prosjekt/anlegg, alternative navn,
plan-ID eller orgnr, koordinat, størrelse og eierskifter.

Et lead skal helst ende som `high`, `medium` (med det som mangler dokumentert),
`investigated_not_confirmed` (med hypotese, sjekkede kilder, hva som støttet, hva som manglet og
dato) eller `rejected`.

**5. Confidence og interest er ulike akser.** Confidence er hvor godt dokumentert funnet er;
interest er hvor mye det betyr. Høy interesse og lav confidence betyr *prioriter mer research* —
ikke at funnet er svakt.

Målet er ikke flest mulig leads, men å gå fra «dette kan være interessant» til «dette vet vi,
dette er kildene, dette mangler fortsatt».

### Fra research til offentlig NaboRadar

Research-basen er staging. Et funn kan flagges som **kandidat for offentlig visning** med
`public_candidate`, som krever bekreftet fysisk anlegg, bekreftet lokasjon, god kildeproveniens
og korrekt status. Databasen håndhever de to som lar seg håndheve: koordinat må finnes, og
`verification_status` må være `verified_public_source`.

Flagget publiserer ingenting. Det finnes ingen kodevei fra research til `area_features`, og et
kandidatfunn må fortsatt gjennom den vanlige veien: provider, avklart lisens, normalisering og
visningsregel. Og vi gjengir hva anlegget er og hva kildene sier — ikke konsekvenser som støy,
trafikk eller risiko uten egen dokumentasjon.

### Systematiske feil å unngå

Samlet fra rundene, fordi hver av dem kostet en runde å oppdage:

| Feil | Hva som faktisk gjelder |
|---|---|
| Fravær i register = fravær i virkeligheten | Nkom sier *hvem* som driver datasenter, aldri *hvor* |
| Operatør = anlegg | Ett selskap kan ha ti anlegg, eller null |
| Kontoradresse = anleggsadresse | Bulks kontor er på Skøyen, anlegget på Økern |
| Markedskode = kommune | «OSL» betyr Oslo-*markedet*: OSL02 ligger i Nordre Follo, OSL03 i Lillestrøm |
| Katalogoppføring = datasenter | En PeeringDB-fasilitet kan være et serverrom. Sjekk `net_count` og hvem nettverkene tilhører |
| Campus = ett anlegg per oppføring | STACK OSL03 har fire bygg og fem oppføringer, men er ett sted |
| Ett bygg = én operatør | Hans Møller Gasmanns vei 9 har tre |
| Navnebytte = nytt anlegg | DigiPlex → STACK → Vaultica er samme bygg |
| Katalogens marked = kommune | DataCenterMap fører Tydal under markedet «Ås». NTC Billingstad i Asker lå under et eget marked og manglet i Oslo-oversikten |
| Omdøping etter at seeden har kjørt | `tidligere_titler` må legges inn *før* seeden oppretter den nye raden, ellers står den gamle igjen som foreldet dublett |
| Ett kapasitetstall = ett begrep | «300 MW» kan være nettkapasitet, installert effekt, IT-last eller oppgitt sluttkapasitet. Skill alltid, og skriv hvilket i notatet |
| Samme koordinat = dublett | To prosjekter i samme næringspark deler punkt uten å være samme anlegg. Sjekk før sammenslåing |
| Befolkningstetthet som relevanssignal | Den største planlagte kapasiteten ligger i Tysvær, Luster og Vaksdal, ikke i byene. Kraft og tomt styrer lokalisering, ikke folketall |
| Geokoding uten postnummer | «Granittvegen 110» og «Nordliveien 21» traff feil kommune uten postnummerkrav. Krev alltid postnummer |
| Utslippsregisteret dekker alt tungt | Norske utslipp har 866 anlegg, men praktisk talt ingen kommunale avløpsrenseanlegg. VEAS, Bekkelaget, Høvringen og IVAR Nord-Jæren står ikke der |
| Én tillatelse = ett sted | Herøya har seks tillatelser og er ett industriområde. Funnet skal beskrive stedet, ikke registerraden |
| Register med koordinat = kjent kommune | Utslippsregisteret oppgir punkt, ikke kommune. Reversgeokod mot Kartverket før kommunen skrives inn |
| Register = kapasitet | Norske utslipp oppgir ikke tonn per år, MW eller personekvivalenter. Kapasitet må hentes fra operatør eller tillatelse, anlegg for anlegg |
| Vår egen kopi = kilden | Vi konkluderte at renseanlegg manglet hos Miljødirektoratet. De manglet i *vårt* uttrekk av industridelen. Etaten har et eget avløpsdatasett med 2 961 anlegg |
| Registrert punkt = anlegget | Rana Grubers registrerte punkt er verket i Mo i Rana, gruvene ligger 35 km unna på Ørtfjell. Skaland Graphites punkt er anlegget på Skaland, gruven er ved Trælen |
| Kapasitet = belastning | Avløpsregisterets kapasitetsfelt er dimensjonert kapasitet: VEAS står med 1 100 000 pe mot rundt 867 000 i faktisk belastning |
| Uttaksvolum finnes i utslippsregisteret | Volum og driftshorisont for pukkverk står i driftskonsesjonen hos DMF og i reguleringsplanen, ikke i utslippstillatelsen |

### Nasjonal runde: VA og mineraluttak

216 funn og 521 kilder totalt. Runden la til 55 funn, rettet ett feilaktig fra forrige runde, løste tre svake
leads og standardiserte underkategoriene. To spor: VA og renseanlegg, og gruver, steinbrudd, pukkverk og
masseuttak. Scope var hele Norge.

**To nasjonale registre bar runden.**

- **Avløp:** Miljødirektoratets avløpsdatasett, som ligger åpent på
  `kart3.miljodirektoratet.no/arcgis/rest/services/avloep/MapServer/1` og bygger på kommunenes KOSTRA-
  rapportering. 2 961 anlegg, hvorav 139 over 10 000 pe og 30 over 50 000 pe, med navn, kommune,
  driftsstatus, renseprinsipp, renseprosess, dimensjonert kapasitet i personekvivalenter, koordinat og
  faktaark per anlegg. Dette er VA-sporets motsvarighet til Norske utslipp for industri.
- **Mineraluttak:** Miljødirektoratets utslippsregister, der 100 anlegg ligger i bransjene 05, 07, 08 og
  23.6–23.9. Utslippstillatelse følger størrelse, så uttrekket gir de største uttakene.

Det som flyttet mest i denne runden:

- **Vi rettet en egen feilkonklusjon.** Forrige runde skrev at kommunale renseanlegg «praktisk talt ikke
  finnes» hos Miljødirektoratet. Søket var gjort i vår egen synkede kopi av industridelen. Feilen er nå et
  eget funn, fordi den er verdt å huske: et fravær i et uttrekk sier noe om uttrekket, ikke om registeret.
- **Volumtallene for pukkverk ligger hos DMF, ikke i utslippsregisteret.** Direktoratets høringssaker oppgir
  årlig uttak, samlet volum, konsesjonsareal og etapper. Det løste tre leads: Lierskogen (3,7 millioner m³
  samlet, 175 000 m³ i året, 219 dekar), Bjønndalen (15,5 millioner fm³ samlet, 200 000 fm³ i året) og
  Rekefjord (2–2,5 millioner tonn i året, 600 skipsanløp).
- **DMFs egne karttjenester svarte 503.** `kart.dirmin.no` og `minit.dirmin.no` var utilgjengelige gjennom
  hele runden, så driftskonsesjonene kunne ikke hentes maskinelt. Bergrettigheter finnes som WFS via
  Geonorge, men en bergrettighet er en leterett — ikke drift.
- **PDF-er kan ikke leses i dette miljøet.** Verken SSBs avløpsrapport eller DMFs konsesjonsvedtak kunne
  tekstuttrekkes, fordi `pdftotext` og `pdftoppm` ikke er installert. Der det var avgjørende, er kilden
  lagret med en tydelig merknad om at innholdet ikke er lest.
- **Svalbard kan ikke stedfestes.** Research-basen tillater bare breddegrad mellom 57 og 72. Gruve 7 i
  Adventdalen står derfor uten koordinat, med begrunnelsen i notatet.
- **Kapasitetsbegrepene må holdes fra hverandre.** Dimensjonert kapasitet, faktisk belastning, hydraulisk
  kapasitet og planlagt sluttilstand er fire forskjellige tall, og for flere anlegg fant vi tre av dem med
  ulike verdier. Hvert funn sier hvilket tall som er hvilket.

#### Faste underkategorier

Underkategoriene er et vokabular, ikke fritekst — ellers blir kartet fragmentert. For disse to sporene:

| Spor | Underkategorier |
|---|---|
| VA | `Renseanlegg`, `Vannbehandlingsanlegg`, `Pumpestasjon`, `VA-tunnel/fjellanlegg` |
| Mineral | `Gruve`, `Pukkverk`, `Steinbrudd`, `Masseuttak` |

`Gruve` brukes om malmuttak, `Steinbrudd` om uttak av stein, kalk og industrimineraler, `Pukkverk` om
knust fjell til bygg og anlegg. Nye underkategorier må legges inn i `KATEGORIGRUPPER` i samme commit, og
testen `gruppene dekker de kuraterte funnene` feiler hvis det glemmes.

### Nasjonal runde: store tekniske anlegg og industri

161 funn og 355 kilder totalt. Runden la til 35 funn, oppdaterte 4 og ryddet én foreldet dublett.
Scope var hele Norge: avfall, avløp og VA, energi, prosess- og metallindustri, kjemisk industri,
uttak og lagring.

**Inngangen var Miljødirektoratets utslippsregister, som vi allerede synker inn i
`area_features`.** 866 anlegg nasjonalt, hvorav 211 er regulert av Miljødirektoratet selv og resten
av statsforvalterne. *Hvem som er forurensningsmyndighet er i praksis et størrelsesfilter* —
Miljødirektoratet håndterer de største — og gir dermed en autoritativ kandidatliste uten skjønn.
157 av de 211 lå i bransjer med tydelig områdebetydning og ble gjennomgått.

Det som flyttet mest i denne runden:

- **Industriområde, ikke registerrad.** Ti steder hadde flere tillatelser på samme fysiske område.
  Herøya har seks, Øra seks, Mo i Rana fem, Borregaard fem. De er lagt inn som ett funn hver, fordi
  brukeren spør om stedet.
- **Kapasitet finnes ikke i registeret.** Tonn per år, MW og personekvivalenter måtte hentes per
  anlegg fra operatør eller tillatelse. Det er tregt, men det er forskjellen på «det ligger en
  fabrikk der» og «det ligger et anlegg på 12 millioner tonn råolje i året der».
- **Kommunale renseanlegg mangler i utslippsregisteret.** Et søk på avløpsbransjen gir tre treff
  nasjonalt, ingen av dem et hovedrenseanlegg. Renseanlegg må hentes fra kommunene og de
  interkommunale selskapene selv. Nok et konkret tilfelle av at fravær i ett register ikke er bevis.
- **Kommune må reversgeokodes.** Registeret gir koordinat, ikke kommune. 33 anleggspunkt ble slått
  opp mot Kartverkets punktsøk før kommune og nærmeste adresse ble skrevet inn.
- **QA på gruppenivå avdekket to feil i basen.** En gjennomgang av hver kategorigruppe på
  `/admin/kart` fant at «Metallindustri» og «Gruve» ikke fanges av noen gruppe, at avfall hadde tre
  ulike underkategorinavn for det samme, og at Bulk-campuset i Vennesla sto igjen som dublett etter
  en omdøping. Alt tre er rettet. Kjør denne sjekken etter hver runde som innfører nye
  underkategorier.

### Fjerde research-runde: discovery først

**Metodefeil rettet.** Runde 2 og 3 startet i autoritative registre og konkluderte med ett
datasenter i de tre kommunene. Bred bransjediscovery fant femten. Feilen var å lese fravær i et
register som fravær i virkeligheten — Nkom og Enhetsregisteret dokumenterer *hvem* som driver
datasenter, aldri *hvor*, og ingen myndighetskilde gjør det.

Regelen er nå **discovery først, verifisering etterpå**:

1. Bred kandidatliste fra bransjekilder — PeeringDB har et åpent API med gateadresser, og
   DataCenterMap lister anlegg per by
2. Verifiser hver kandidat mot operatør, Nkom, byggesak eller nettselskap
3. Dedupliser på **adresse**, ikke navn: tre operatører delte Hans Møller Gasmanns vei 9, og to
   delte Nedre Rommen 5
4. Lagre aliaser og operatørhistorikk på funnet — DigiPlex → STACK → Vaultica er samme bygg

Bransjekilder er gode nok til å gi kandidater og adresser, men ikke alene til høy confidence.
Merk også at «OSL» i et facility-navn betyr Oslo-*markedet*, ikke Oslo kommune: OSL02 ligger i
Nordre Follo, OSL03 i Lillestrøm og OSL04 i Indre Østfold.

### Tredje research-runde

61 funn og 100 kilder totalt. Runden la til 18 funn og oppdaterte 4, og gikk målrettet etter
hullene fra runde 2:

- **Kulturminneregisteret har både WFS og OGC API Features.** Runde 2 konkluderte med at det bare
  fantes nedlasting — feil, fordi søket i Geonorge bare traff én av distribusjonene. Alle 11 834
  lokaliteter i de tre kommunene ble hentet og gjennomgått, og ga 19 forsvarsfunn: fredede
  anlegg som Skar leir, Løren leir og Holmenkollen leir, Asker NIKE-batteri fra den kalde krigen,
  og et helt tysk festningslandskap på Snarøya og Fornebu
- **Klynger framfor enkeltrader.** 44 bunkere og skytterstillinger i Bærum, 19 tyske leirer i Oslo
  og fire luftvernbatterier er samlet i tre funn. Enkeltanleggene kan slås opp i registeret
- **Datasentre står fortsatt på ett bekreftet anlegg.** Etter plandata, Nkom og kommunale
  planressurser er STACK OSL01 det eneste. Fra juli 2025 er datasenter et eget arealformål i
  kart- og planforskriften — det er veien inn neste gang

### Andre research-runde

43 funn og 65 kilder totalt. Runden la til 26 funn og reviderte 8. Det som flyttet mest:

- **Miljødirektoratets utslippsregister** viste seg å være den beste enkeltkilden til fysiske
  industrianlegg i disse kommunene — det gir navn, bransje, forurensningsmyndighet og koordinat
  for anlegg som faktisk finnes, i motsetning til virksomhetsregistrene
- **Nkoms datasenterregister** er autoritativt for *hvem* som driver datasenter, men oppgir aldri
  hvor. Alle 60 operatørene ble slått opp i Enhetsregisteret; ni har adresse i Oslo eller Bærum,
  og bare én av dem (Selma Ellefsens vei 1 på Ulven) lot seg bekrefte som et anlegg
- **Forsvarsbyggs skytefelt-WFS** ga et rent negativt svar: ingen av Forsvarets 68 skyte- og
  øvingsfelt ligger i Oslo, Bærum eller Asker. Lagret som funn, så spørsmålet ikke stilles igjen
- **Kartverkets stedsnavnregister** kan bekrefte et militært anlegg, men ikke utelukke det: det
  har to militære navn i Oslo og null i Bærum, selv om Kolsås base er dokumentert av Forsvaret

---

## 36. Research lifecycle: freshness og review-kø

Et research-item slutter ikke å endre seg fordi vi har verifisert det én gang. Et planlagt
datasenter blir bygget, forsinket eller kansellert; en gruve skifter eier; en tillatelse blir
avslått. Review-laget gir basen en eksplisitt idé om når hvert funn sist ble kontrollert, når det
bør kontrolleres igjen, og hvorfor.

Livsløpet er:

```
Discovery → verifisering → research-item → reviewpolicy → review-kø → review → oppdatert item → neste review
```

### De tre datoene

| Felt | Betyr |
|---|---|
| `last_verified_at` | Sist innholdet faktisk ble kontrollert mot kilder. Het `last_checked_at` før review-laget |
| `last_reviewed_at` | Sist en review ble gjennomført, også når ingenting endret seg |
| `next_review_at` | Når funnet bør undersøkes igjen |

`updated_at` er aldri freshness. Den sier bare at raden ble skrevet til, og en rettet skrivefeil
ville ellers gjort et to år gammelt funn ferskt.

### Tilstand beregnes, den lagres ikke

`review_state` ligger i viewet `admin_research_review_status`, regnet ut fra `next_review_at`:

| Tilstand | Når |
|---|---|
| `no_review_needed` | `review_mode = 'none'`, eller policyen gir null intervall (avvist, arkivert, stabilt historisk) |
| `blocked` | Reviewen står på noe eksternt: kilden er nede, dokumentet kan ikke leses |
| `needs_followup` | Forrige review endte `unresolved`, og datoen er passert |
| `overdue` | Mer enn 14 dager over datoen |
| `due` | Datoen er passert, innenfor slingringsmonnet på 14 dager |
| `due_soon` | Innen 14 dager |
| `current` | Lenger fram |

Ingen nattjobb oppdaterer dette, og det er meningen: en beregnet tilstand kan ikke komme ut av
takt med virkeligheten. Punkt 40 i spesifikasjonen ba om en scheduler hvis den var nødvendig —
den er ikke det.

### Intervallpolicyen

Én immutable funksjon, `research_review_interval()`. Basisintervallet følger hvor fort tingen
faktisk endrer seg:

| Situasjon | Basis |
|---|---|
| `under_construction` | 30 dager |
| `planned` | 45 dager ved høy interesse eller public candidate, ellers 60 |
| `unknown` status | 60 dager ved høy interesse, ellers 90 |
| `investigated_not_confirmed` | 90 / 180 / 365 etter interesse |
| `active` | 90 / 180 / 365 etter interesse |
| `historical`, `closed` | 365, eller ingen review når sikkerheten er høy, interessen ikke er høy og kilden holder |
| `rejected`, `archived` | Ingen review |

Deretter justeres det multiplikativt, med gulv på 14 dager og tak på 730:

- lav sikkerhet ×0,5 · middels ×0,75
- public candidate ×0,75, og aldri over 120 dager uansett
- mangler primærkilde ×0,75
- mangler koordinat ×0,75 (bare for `finding` og `lead` — et notat jages ikke for manglende punkt)
- har endret seg i en tidligere review ×0,75
- reviews på rad uten endring: opptil ×2

Ingen ugjennomsiktig score. UI-et viser alltid *hvorfor* datoen er der den er:
«45 dagers intervall · planlagt prosjekt, høy interesse».

### Review reasons

Beregnet, aldri lagret — et funn som får primærkilde slutter å ha `missing_primary_source` uten at
noen må huske å fjerne det. Verdiene: `under_construction`, `planned_project`, `status_unknown`,
`high_interest`, `low_confidence`, `medium_confidence`, `public_candidate`,
`missing_primary_source`, `missing_coordinates`, `unresolved_lead`, `previously_changed`,
`manual_followup`, `blocked_source`, `never_reviewed`, `source_old`.

`missing_capacity` finnes ikke: kapasitet er ikke et strukturert felt, den står i beskrivelsen. Et
felt vi ikke kan beregne blir et felt ingen vedlikeholder.

**Gammel kilde er ikke samme sak som gammelt faktum.** En kulturminneregistrering fra 2018 kan
være helt gyldig. Derfor er `source_old` en grunn og aldri en konklusjon.

### Prioritet

Lavere tall først: 1 under bygging, 2 planlagt, 3 høy interesse med svak sikkerhet, 4 uavklart
lead, 5 public candidate, 6 har endret seg før, 7 forsinket, 8 aktivt med høy interesse, 9 ukjent
status, 10 middels interesse, 11 mangler primærkilde, 12 mangler koordinat, 20 historisk, 80
avvist, 90 ingen review. Køen sorterer på tilstand først, så prioritet, så hvem som har ventet
lengst.

### Overstyring

`review_mode` sier hvordan datoen ble satt: `policy`, `manual`, `none` eller `blocked`. Alt annet
enn `policy` krever en begrunnelse — databasen håndhever det — og vises som overstyrt i køen. En
utsettelse er ikke en måte å skjule noe på.

### Historikk

`admin_research_reviews` er én rad per kontroll: utfall, om noe endret seg, status og sikkerhet
før og etter, sammendrag, kilder kontrollert, og runden reviewen hørte til. Derfor kan vi si
«kontrollert fire ganger, sist endret 12.08.2026».

Ikke bland dette med `admin_research_runs`, som er en *researchrunde* på en kategori eller en
metode. Én runde kan generere hundre reviews; en review peker tilbake på runden gjennom
`research_run_id`.

### Innholdsoppdatering er ikke en review

Dette er det viktigste skillet i laget, og det kostet en feilrunde å få riktig.

`save_research_item` og `npm run research:seed` skriver innholdsfelt og rører *ikke*
`last_reviewed_at`, `next_review_at`, `review_mode` eller manuelle overstyringer. Triggeren
`research_items_review_schedule` regner bare om datoen når noe som påvirker intervallet faktisk
endrer seg — status, interesse, sikkerhet, kandidatflagg, koordinat, streak — eller når datoen
mangler eller det lagrede intervallet ikke stemmer med policyen lenger.

Første versjon regnet om ved *hver* oppdatering der kallet ikke satte datoen selv. Det så
riktig ut, men én `research:seed`-kjøring vasket bort hele planen: en kø på tolv aktuelle saker ble
198 «ferske». Regresjonstesten «beholder en planlagt dato gjennom en seed-oppdatering» finnes for
at det ikke skal skje igjen.

### Reviews fra en researchrunde

`npm run research:seed -- --review="<rundeetikett>"` registrerer en review per funn seeden
oppdaterte, knyttet til den navngitte runden, med utfall `updated` eller `unchanged` basert på en
faktisk sammenligning av feltene før og etter. Da får en stor runde reviewhistorikk uten at noen
klikker gjennom UI-et for hvert funn.

Skriptet kaller `record_research_review_unchecked()`, som er revoked fra alle roller og bare kan
kalles av eieren. Alternativet — å skrive tabellene direkte fra skriptet — ville gitt to steder som
må holde streak, datoer og historikk i takt. Aktøren lagres som «seed», ikke som en person.

### Sikkerhet

Som resten av research: ingen rettigheter til `anon`, lesing bak `is_admin()` med RLS, all skriving
gjennom security definer-funksjoner som sjekker `is_admin()` selv. Viewet har ingen rettigheter i
det hele tatt; det leses gjennom funksjonene. Reviewdata sier hva vi *ikke* har kontrollert, og er
minst like interne som funnene selv.

### Kommandoer

```bash
npm run review:backfill        # gir eksisterende funn en reviewplan
npm run review:backfill -- --dry
npm run research:seed -- --review="National VA and mineral extraction discovery v1"
```

Backfillen setter `last_verified_at` fra nyeste kildedato og gir prioritetsklassene en første
review fordelt over tre uker, de høyest prioriterte først. Den hevder ikke at noen har gjort en
review: `last_reviewed_at` står urørt, og funnene beholder grunnen «aldri kontrollert».

---

## 37. Datasenter-enrichment og refresh

Datasentre er den mest dynamiske kategorien i researchbasen, og den der fritekst svikter først.
«Bulk driver anlegget, TikTok er kunde, 700 MW» er tre påstander om tre ulike ting, og i et
`description`-felt kan de ikke filtreres, sammenlignes eller etterprøves. Derfor har datasentre
egne tabeller og en egen refresh-flyt.

### Egne tabeller, ikke flere kolonner

`admin_research_items` er felles for gruver, forsvar, avløp og datasentre. Legger vi
`secured_power_mw` der, har vi gjort fellestabellen til en datasentertabell, og neste kategori
gjør det samme. Detaljene ligger derfor i `admin_research_datacenter_details`, 1:1 og bare for de
funnene som faktisk er datasentre. Definisjonen står ett sted, `is_datacenter_item()`:
underkategori `Datasenter`, ikke kategorien — kategorien rommer også pukkverk og prosessindustri.

### Tre ting modellen nekter å slå sammen

**1. Roller.** Eier, operatør, kunde, investor, morselskap og grunneier er ulike påstander om
ulike juridiske enheter, og de ligger som rader i `admin_research_datacenter_parties` med
`role`. Samme selskap kan ha flere roller, og flere selskaper kan ha samme rolle. En
`owner`-kolonne ville tvunget fram et valg, og valget ville blitt usynlig etterpå.

**Kunde har høyere terskel enn de andre, og terskelen står i databasen:**

```sql
constraint kunde_krever_dokumentasjon
  check (role <> 'customer' or (confidence = 'high' and source_id is not null))
```

At en avis kaller noe «TikToks datasenter», at bransjen tror det, eller at anlegget teknisk
passer kunden, er ikke dokumentasjon. Er det uklart, hører det hjemme i `notes` på funnet.
Regelen ligger i databasen og ikke bare i en instruks, fordi den ellers ryker første gang noen
har dårlig tid.

**2. MW.** Fem felt, fordi «700 MW sikret kraft» og «700 MW i drift» ikke er samme opplysning, og
forskjellen er hele saken for en nabo:

| Felt | Spørsmål |
|---|---|
| `it_load_mw` | Hva trekker anlegget nå? |
| `operational_capacity_mw` | Hvor mye kapasitet står der i dag? |
| `secured_power_mw` | Hvor mye nettkapasitet er tildelt? |
| `planned_capacity_mw` | Hva er planlagt for dette prosjektet? |
| `campus_potential_mw` | Hva blir campus hvis alt bygges ut? |

**Det finnes bevisst ingen generisk `capacity_mw`.** Et tall uten semantikk er et tall vi ikke kan
forsvare, og en test håndhever at kolonnen ikke dukker opp igjen. `mwTekst()` sørger for at
tallet aldri vises uten hvilket tall det er — «700 MW sikret kraft», aldri bare «700 MW».

**Hva som regnes som sikret.** `secured_power_mw` er kapasitet som er *tilknyttet* eller
*reservert/avtalt* for det konkrete anlegget eller prosjektselskapet: reservasjon,
anleggsbidragsavtale eller tilknytningsavtale. Søkt kapasitet, køplass og «ønsket tilknytning» er
ikke sikret, og står i notatet, ikke i feltet. Statnett-tallene leses fra Statnetts egne lister
(tilknyttet, reservert og kø), som skiller nøyaktig disse tre.

En reservasjon gitt til et nettselskap er heller ikke sikret kraft for anlegget, selv om den er
tatt ut for datasenter. Det som teller er hva nettselskapet har tildelt videre. Kvandal er
eksempelet: Statnett har reservert 230 MW til Nordkraft Industrinett, og Nordkraft har tildelt
Nscale 32,5 + 97,5 = 130 MW for de to første byggene. Feltet er 130 MW og peker på kilden for
tildelingen (NVE-søknaden), mens 230 MW står i notatet med Statnett som kilde. At 230 MW samtidig er
Nscales planlagte første fase er en annen påstand, og hører hjemme i `planned_capacity_mw`.

Det samme gjelder en reservasjon som står på morselskapet og ikke på prosjektselskapet eller
anlegget. Green Mountain AS har 18,5 MW ved Ringerike, og Green Horizon AS har 36 MW ved
Bjerkreim. Reservasjonene står i notatet til anleggene de trolig gjelder (Kilemoen og Norway 1),
men ikke i feltet. Koblingen er utledet av sted og MW-tall, ikke dokumentert. Det gjelder også
når pressen knytter reservasjonen til ett anlegg: Kitebrook Matres 30 MW ved Haugsvær står på
«Regn / Kitebrook», ikke på KB IFS Matre AS, og er ikke ført som sikret (runde 7).

Motsatt eksempel: Bredsand datasenter i Moss har 50 MW sikret, fordi Statnetts sluttkunde er
prosjektselskapet Larkollveien 4 AS selv, som også er forslagsstiller for reguleringen og bare har
denne ene saken.

Datakvalitetsrunden 2026-09-30 fjernet tre tall på denne regelen: Googles 840 MW (søkt/kø), Arcem
Husnes' 40 MW (kø hos Statnett) og Fauskes 13 MW (bare presse). Narvik ble rettet fra 230 til 130
MW i en egen korreksjon samme dag.

**Nettinfrastruktur er ikke et datasenter.** Samtrafikkpunkter, nettnoder og telesentraler føres
ikke som egne anlegg. NIX1, NIX2 og BIX er svitsjer i universitetenes rom eller i andres
datasentre og er avvist; der verten finnes i basen (Bulk OS-IX, Vaultica OSL01, Green Mountain
SVG1), står noden som notat på vertsanlegget. Østre Aker vei 18 er Telenors telesentral med en
Arelion-node og er gjort om til notat, som Sognsveien 75. `network_pop` brukes bare når en
operatør faktisk selger plass i rommet (Blix CJH), ikke for å redde en post som ikke er et anlegg.

**Coverage-audit: let etter det som mangler, ikke bare følg leads.** Runde 15 kryssjekket
Statnetts 183 datasenter-rader og Nkoms 60 operatører mot basen og gikk gjennom 57 delregioner.
Det ga 18 anlegg som aldri hadde vært et lead, blant annet tre anlegg i den tidligere
Digiplex-porteføljen og Bitfurys anlegg i Mo i Rana. Tre ting å huske:

- Statnetts lister og eInnsyn gir flest funn. Nkom-registeret fanger bare operatører som har
  registrert seg; ingen av funnene i Troms og Finnmark sto der.
- En navnebasert kryssjekk mot basen gir falske treff. En rad er først dekket når en post
  forklarer den.
- «Ingen funn» i en region betyr bare at de loggførte kildene er kontrollert. Dekningsnotatet
  og research-runen sier hvilke regioner som ikke er undersøkt godt nok.

**En plan som også åpner for datasenter, er ikke en datasenterplan.** Runde 16 løftet seks
leads til anlegg fordi kommunens egne dokumenter sier datasenter om en bestemt tomt (Sørfold,
Aure, Rollag, Gulen, Strand) eller fordi NVE-saken oppgir adressen (Gardermoen). Ballangsleira
ble stående som lead: reguleringsplanen nevner datasenter som ett av flere eksempler på
kraftkrevende industri, og koblingen til Nscale hviler på en køplass og én avisartikkel. En
reservasjon føres heller ikke som sikret kraft når forslagsstilleren er et annet selskap enn
sluttkunden i Statnetts liste, selv om navn, sted og effekt sammenfaller (Gjerelvmoen).

**En utvidelse av samme campus er ikke et nytt anlegg.** Nye bygg på samme tomt eller naboteig,
med samme eier og uten egen kraftsak, føres på det eksisterende anlegget. «Ås datasenter» er
Troll Housings egen utvidelse i samme planområde og står som utvidelsesnotat på Troll Housing.
Søkt og varslet effekt («har søkt om 15 MW», «skal søke om 100 MW») føres ikke i MW-feltene.

**En avdeling i Brønnøysund er ikke et anlegg.** En underenhet viser hvor et selskap har ansatte,
ikke at det eier eller driver et datasenter der. I runde 9 lå Nscale Drifts avdeling på Hønefoss
på adressen til hscale OSL1 (samme anlegg, ikke nytt), og avdelingen på Sola lå i ASP K11, som
ble opprettet med Asp som eier og Nscale som kunde.

**En samlepost splittes bare når byggene er dokumentert adskilt.** ITsjefens NDC2 (Brattørkaia
17B) og NDC4 (Tungavegen 30) er to bygg med hver sin adresse og ble to anlegg; samleposten ble
NDC2 og beholdt historikken, med gammel tittel som alias. NDC3 har ingen offentlig adresse og er
et lead uten punkt. Tre produktnavn i samme bygg er ikke grunn til å splitte.

**En post i Statnetts lister er et lead, ikke et anlegg.** Statnetts reservasjons- og kølister er
den beste discovery-kilden vi har for store datasenterprosjekter, men et navn i køen er ikke et
prosjekt. Et nytt funn opprettes først når prosjektet er offentlig bekreftet (kommunevedtak,
plansak eller aktørens egen kunngjøring) og området er stedfestet. I runde 2 ga ni Statnett-leads
to nye anlegg (Google Våler, Bulk Arendal). Fem ble avvist: TikTok Norway AS på Ringerike hadde
bare en køplass og er TikToks salgsselskap. To var anlegg som allerede lå i basen.

**Duplikater slås sammen med arkivering, ikke sletting.** Nkom-registeret gir selskaper, ikke
anlegg, så et operatørlead kan være det samme som et anlegg vi har stedfestet. Kriteriet er samme
fysiske anlegg, ikke bare selskaper som henger sammen. Det sekundære funnet får
`verification_status = 'archived'` og et notat om hvor det er slått sammen. Kildene flyttes til
det kanoniske funnet, og den gamle tittelen legges i `tidligere_titler`. Funnet fjernes fra
`funn.ts`, men seeden sletter aldri, så raden og historikken blir liggende. `datacenter_items()`
utelater avviste og arkiverte funn (migrasjon 20261016000000), slik refresh-kandidatene og kartet
allerede gjorde. Første sak var Odin Green DC: selskapets eneste formål er datasenteret i
Hønefoss, så leadet er slått sammen med hscale OSL1.

**Notater er ikke anlegg.** Metanotater med underkategori Datasenter (`item_type = 'note'`), som
«Nasjonalt bilde» eller negative søk i plandata, er research om datasentre. Siden migrasjon
20261017000000 utelater både `datacenter_items()` og `datacenter_refresh_candidates()` dem, så de
verken teller i totalen, står i lista eller havner i køen. Da regelen kom, falt totalen fra 73 til
65 (åtte notater). Leads (`lead`) er fortsatt med: de er mulige anlegg som skal verifiseres.

**3. Påstand og kilde.** `admin_research_datacenter_field_sources` knytter et strukturert felt til
kilden som bærer det. Ikke full event sourcing — det ville kostet mer enn det smaker på 67 funn —
men nok til at et MW-tall kan spores til noe. Roller bærer sin egen `source_id` inline.

### Anleggstype

Kontrollert vokabular: `colocation`, `hyperscale`, `ai_hpc`, `enterprise`, `crypto`,
`network_pop`, `mixed`, `unknown`. Fritekstsynonymer ville gjort filtrering umulig etter tjue
funn. **`unknown` er en gyldig verdi og skal brukes framfor å gjette**, men den er ikke en utfylt
type: `missing_fields` fortsetter å vise `type` til en kjent type er dokumentert. «Vi vet ikke» skal
ikke se ut som ferdig enrichment. En test og `qa:datasenter` holder regelen.

### Refresh-flyten

Egen kø, helt uavhengig av provider-sync. Den rører ikke DSB, NVE, Udir, planer eller resten av
researchbasen, og kan kjøres uten deploy og uten at noe annet synkes. To modi:

| Modus | Tar med |
|---|---|
| **Det som trenger review** | forfalt eller forfallende review · under bygging · planlagt · høy interesse med lav/middels sikkerhet · mangler viktige felt |
| **Full datasenter-refresh** | alt som er aktivt, planlagt, under bygging eller ukjent. Bevisst tyngre, og skal velges |

Køen er prioritert: under bygging først, så planlagt, så etter hvor mange felt som mangler.
Hver linje bærer `queued_reasons` — hvorfor den kom i køen — slik at køen er etterprøvbar i
ettertid.

**Jobben gjør ikke researchen.** Den lager køen, en søkeplan per anlegg og sporer framdrift.
Selve arbeidet er DISCOVERY → DEDUP → VERIFISERING → AKTIV OPPFØLGING → KLASSIFISERING, og det
gjøres mot køen. En HTTP-request som skulle kontrollert 67 anlegg mot operatørsider, kommunale
saker og presse ville enten timet ut eller levert påstander ingen har verifisert.

`datacenter_search_plan()` bygger søkene av det vi allerede vet — navn, kommune, kjente roller —
og ikke av en fast liste, fordi «Bulk» og «Vennesla» gir treff der «datasenter» ikke gjør det.

**Tellerne er utledet, ikke lagret.** `admin_datacenter_refresh_status` regner ut status og
framdrift av køen, så det finnes ingen teller som kan bli stående feil. Samme valg som for
`review_state`. Én kjøring om gangen: to parallelle køer over samme funn ville gitt to sannheter
om hva som er kontrollert.

### Historikk

`save_datacenter_details()` sammenligner mot det som står, finner hvilke felt som faktisk endret
seg, og skriver en review gjennom den eksisterende review-historikken. Et felt som går 20 → 40 MW,
en operatør som byttes eller en rolle som fjernes etterlater spor. En lagring som ikke endrer noe,
gir ingen review — ellers ville historikken druknet i støy.

Freshness bruker den eksisterende policyen i `research_review_interval()`, ikke et parallelt
system. Den gir allerede 30 dager for under bygging, 45–60 for planlagt og 90/180/365 for aktivt
etter interesse. Refresh-køen er mer aggressiv enn review-planen med vilje: den tar også med det
som mangler felt, uavhengig av når neste review er.

### Eierskap er fakta, ikke vurdering

Vi viser juridisk eier, morselskap, investorstruktur og land når det er dokumentert.
Vi lager ikke «bra» eller «dårlig» eier, politiske vurderinger eller rangering etter nasjonalitet.
`country` finnes for å kunne si «eid av et selskap registrert i X», ikke for å sortere etter det.

Sier en artikkel at «TikToks datasenter utenfor Hamar er eid fra Israel», er jobben å finne hvilken
juridisk enhet som faktisk eier anlegget før et strukturert felt settes — ikke å gjengi setningen.

### Flatene

`/admin/datasenter` har refresh-knappen, jobbstatus, hva som mangler og alle anleggene.
Research-kartet viser en ekstra linje for datasentre — operatør eller eier, kapasitet med
semantikk, og type — både i lista og i popupen. Kartet henter et lite sammendrag gjennom
`hentDatasentersammendrag()` og bare når resultatet faktisk inneholder datasentre; `research_map`
vet ingenting om MW.

Kortene er sammenslått til to linjer. Roller, alle fem MW-tall, utvidelse og kilder ligger bak
`<details>`, og kilder og historikk hentes først gjennom `datacenter_detail()` når et anlegg
åpnes. Lista skal tåle 500+ anlegg.

### QA

`npm run qa:datasenter` leser basen og rapporterer dekning, roller på faste kontrollpunkter,
MW-tall med semantikk, om kunde-terskelen holder, køen og at ingen andre kategorier har vært innom
en datasenter-kø. Den skriver ikke.

**Bulk N01 er eksempelet som viser disiplinen.** Bulks pressemelding om lånet på €410 mill.
bekrefter Vennesla, men oppgir **ingen MW og ingen kunder**. Sekundærkilder sa 400 MW innen 2026,
600 MW i en bransjekatalog og 2 GW som langsiktig ambisjon — tre tall som betyr tre forskjellige
ting. Derfor sto først bare operatør og type som strukturerte felt.

Enrichment runde 1 (2026-09-30) viste hvordan feltene fylles når kildene kommer. 700 MW er
`secured_power_mw`: 100 MW tilknyttet og 2 × 300 MW reservert for N01 Utilities AS i Statnetts
lister, ikke 700 MW i drift. 1 GW er `campus_potential_mw`, og kapasitet i drift er fortsatt
ukjent. CoreWeave er nå kunde, fordi Bulks egen pressemelding (mars 2025) navngir N01 i Vennesla.
Terskelen er den samme — det var kilden som kom på plass.

Runde 1 dekket 13 anlegg fra køen pluss Green Mountain OSL2-Hamar, TikTok-anlegget. Der er TikTok
kunde, Green Mountain Innlandet AS eier og operatør, og Azrieli Group Ltd. ultimat eier. Resten av
køen ble markert `skipped` med «utsatt til runde 2», slik at kjøringen lukkes og ikke blokkerer
neste. `research:seed --review` passer ikke for slike runder: det skriver en review for alle
funn i fila, også de som ikke ble kontrollert. Statusendringer registreres derfor gjennom
`record_research_review_unchecked` med `new_status` og `research_run_id`, og speiles i
`funn.ts` før seeden kjøres.

---

## 38. Dokumentasjon

Dokumentasjonen er prosjektets hukommelse. Om et år skal det gå an å se hva vi undersøkte, hvilke
kilder vi brukte, hva vi fant, hva vi valgte bort, hvorfor, og hva som skal til for å vurdere det
på nytt. Inngangen er [docs/README.md](README.md).

| Del | Innhold | Regel |
|---|---|---|
| Håndboka (denne fila) | Hvordan løsningen fungerer **nå** | Rettes når noe ikke lenger er sant. Ikke en forskningslogg |
| [`docs/research/`](research/README.md) | Én fil per undersøkelse: kilder, lisens, metode, testutvalg, funn, **negative funn**, begrensninger, beslutning, åpne spørsmål | Historikk. Ikke slett negative funn eller forkastede spor; marker heller «erstattet» med dato |
| [`docs/adr/`](adr/README.md) | Viktige beslutninger: alternativer, valgt løsning, begrunnelse, konsekvenser, ulemper, hva som utløser ny vurdering | Erstattes med en ny ADR, skrives ikke om. Ikke for trivielle ting |

**Dokumenteres i samme commit som endringen** når oppgaven innebærer:

- ny ekstern datakilde eller lisensvurdering,
- research som påvirker produktet, også beslutningen om å **ikke** bygge noe etter research,
- ny heuristikk eller terskel, viktig QA-funn, datakvalitetsregel,
- arkitekturendring, sikkerhetsendring, endring i offentlig/privat lesing,
- caching-strategi, SEO/AEO-beslutning, robots/crawler-beslutning,
- personvern- eller cookiebeslutning,
- viktig produktvalg med reelle avveininger.

For hver slik endring vurderes: må håndboka rettes? Trengs en researchfil? Trengs en ADR? Ikke
for spacing, tekststørrelse, små copy-endringer eller vanlige bugfikser.

Skill fakta (målt, testet, sitert) fra vurderinger og beslutninger. Bevar usikkerhet, og ikke
overdriv kompletthet eller datakvalitet. Lenk heller enn å kopiere store tekstblokker mellom
håndbok, research og ADR.
