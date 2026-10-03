# ADR 009: Offentlig lesing bare via RPC, admin via `is_admin()`, og publiseringsflagg per kategori

**Status:** Aktiv · 2026-10-02 (nedtegnet 2026-10-03)

> **2026-10-03:** `miljo` (forurenset grunn) er avpublisert på eksplisitt produktbeslutning. Samtidig
> returnerer `features_near` og `features_count_near` upubliserte kategorier til innlogget admin, slik
> at admins adressevisning fortsatt ser dataene (`20261101000000_miljo_internal.sql`). For anon og
> andre innloggede er regelen uendret. Se
> [håndbok §14](../naboradar-handbook.md#14-kildepresisjon-og-tolkningsregler).

## Bakgrunn
To sikkerhetshull ble funnet og lukket høsten 2026 (detaljene står i
[håndbok §7](../naboradar-handbook.md#7-rls-grants-og-databasesikkerhet)):

- `trigger_sync_workflow()` var åpen for anonyme kall fram til 2026-09-25, fordi Supabase gir
  EXECUTE til `anon` og `authenticated` på hver ny funksjon. Hvem som helst med den publiserbare
  nøkkelen kunne utløse produksjons-syncen.
- Fram til 2026-10-02 hadde `anon` og `authenticated` SELECT på `events`, `area_features`,
  `providers` og `event_documents`. REST-API-et lot hvem som helst lese hele tabellene side for
  side, uten grensene RPC-ene har.

Samtidig skulle hyttene importeres nasjonalt og kontrolleres før noen andre så dem. Research
(`admin_research_*`) skal aldri kunne bli offentlig.

## Alternativer vurdert
- **RLS-policyer på tabellene for offentlig lesing** — avvist. Da kan REST-API-et lese alt policyen
  slipper gjennom, uten grenser på radius og antall.
- **En egen «skjult»-kolonne per rad** — avvist for kategorier. Det gir mange steder å glemme et
  filter; ett flagg per kategori i én tabell er enklere å kontrollere.
- **Liste over admin-e-poster i koden** — avvist. Sannheten skal ligge i databasen (`admin_users`).

## Beslutning
- **`anon` har ingen tabellrettigheter.** All offentlig lesing går gjennom `security definer`-RPC-er
  med fast `search_path` og harde grenser (`features_near`, `events_within`, `get_event`,
  `huts_*`, `get_hut`, …).
- **Tilgangen er en positiv, uttømmende liste**, håndhevet av `npm run db:verify`. En funksjon som
  ikke står på listen, skal være stengt for `anon` og `authenticated`. Hver migrasjon som lager en
  funksjon, må revokere fra både `public` og `anon`/`authenticated`.
- **Admin = e-post i `admin_users`, sjekket av `is_admin()` inne i hver adminfunksjon.**
  Registrering er åpen i Supabase Auth, så `authenticated` betyr ikke admin.
- **Publiseringsflagg per kategori.** `area_feature_categories.is_public` styrer om lese-RPC-ene
  returnerer en kategori. Et lag kan importeres, kontrolleres av admin og publiseres med én
  SQL-setning — og avpubliseres like enkelt. `hytte_kilde` (kildeposter) er aldri offentlig.
- **Research publiseres aldri automatisk.** Ingen kodevei går fra `admin_research_*` til de
  offentlige tabellene ([håndbok §35](../naboradar-handbook.md#35-privat-research)).
- **Interne felt returneres aldri offentlig:** `contact_note`, `override_source_url`,
  kontrolltidspunkter, avviste og skjulte hytter. `tests/db/huts.test.ts` tester det.

## Hyttelanseringen som eksempel
Hyttene ble importert og kontrollert med `is_public = false` i runde 1–13, der bare innlogget
admin så dem. 2026-10-02 ble `hytte` satt til `is_public = true` på eksplisitt beslutning, etter at
følgende var verifisert anonymt:

- `/hytter` og en hytteside svarte 200,
- forsiden lenket til kartet,
- `/omrade` viste hytter,
- `hytte_kilde` og admin-data var stengt.

Forsidelenken og hyttedelen av «Hva NaboRadar viser» styres av samme flagg (`hutsArePublic`).

## Begrunnelse
Den publiserbare nøkkelen ligger i klientbundlen og må antas kjent. Da er det databasen, ikke
appen, som må avgjøre hva som er offentlig. En uttømmende liste som sjekkes automatisk, fanger
neste funksjon som åpner seg selv i det stille.

## Konsekvenser
- Alt appen leser offentlig, må finnes som en RPC. Nye spørsmål krever migrasjon.
- Å publisere eller avpublisere en kategori krever en eksplisitt beslutning; det skjer aldri som
  bivirkning av en sync eller en deploy.
- [ADR 005](005-cached-public-hut-pages.md) bygger på dette: hyttesiden leser anonymt via de samme
  RPC-ene og kan derfor caches.

## Kjente ulemper
- Admin-forhåndsvisning på de offentlige sidene finnes ikke lenger for hyttesidene (ADR 005);
  skjulte hytter kontrolleres i `/admin/hytter`.
- Flagget er per kategori, ikke per objekt; skjuling av enkeltobjekter gjøres i hver modell
  (`rejected_at`, `confidence`).

## Revurderes når
- Vanlige brukere får kontoer med egne data (da må `authenticated` deles i flere roller).
- Supabase endrer standardgrantene.

## Relatert
[håndbok §7](../naboradar-handbook.md#7-rls-grants-og-databasesikkerhet) ·
[data-architecture.md §2](../data-architecture.md#2-dagens-arkitektur) ·
[ADR 005](005-cached-public-hut-pages.md) · `scripts/verify-db.ts`
