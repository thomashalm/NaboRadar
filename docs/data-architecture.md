# Dataarkitektur

> Levende dokument. Beskriver hvordan NaboRadar lagrer, synker og publiserer data, og hvordan
> modellen skal vokse fra dagens ~40 000 romlige objekter til en nasjonal base med millioner.
> Skrevet etter arkitekturgjennomgangen 2026-10-02, før modulen «Friluftsliv der du bor».
>
> Helheten (drift, sikkerhet, runbook) står i [naboradar-handbook.md](naboradar-handbook.md).
> Hva som skal bygges når, står i [data-roadmap.md](data-roadmap.md). Stol på koden og
> migrasjonene hvis dette dokumentet er uenig med dem — og rett dokumentet.

## Innhold

1. [Kortversjonen](#1-kortversjonen)
2. [Dagens arkitektur](#2-dagens-arkitektur)
3. [Inventar](#3-inventar)
4. [Datalagene](#4-datalagene)
5. [Kanoniske enheter eller bulk-lag](#5-kanoniske-enheter-eller-bulk-lag)
6. [Kategoridetaljer og relasjoner](#6-kategoridetaljer-og-relasjoner)
7. [Kildemodell og proveniens](#7-kildemodell-og-proveniens)
8. [Stabile ID-er og dedup](#8-stabile-id-er-og-dedup)
9. [Geometri](#9-geometri)
10. [Romlige indekser](#10-romlige-indekser)
11. [`/omrade`](#11-omrade)
12. [Kartlevering](#12-kartlevering)
13. [Sync](#13-sync)
14. [Ferskhet og historikk](#14-ferskhet-og-historikk)
15. [Taksonomi](#15-taksonomi)
16. [Søk](#16-søk)
17. [Offentlig leseflate og sikkerhet](#17-offentlig-leseflate-og-sikkerhet)
18. [Skala: målinger og terskler](#18-skala-målinger-og-terskler)
19. [Lagring og hva som skal ligge utenfor Postgres](#19-lagring-og-hva-som-skal-ligge-utenfor-postgres)
20. [Backup og gjenoppretting](#20-backup-og-gjenoppretting)
21. [Beslutninger](#21-beslutninger)
22. [Sjekkliste før et nytt datasett](#22-sjekkliste-før-et-nytt-datasett)

---

## 1. Kortversjonen

- **Fundamentet holder.** Lesespørringene bruker indeks og er raske også med 10 millioner
  rader i `area_features`. Det som koster, er antall objekter *innenfor radiusen*, ikke
  tabellstørrelsen.
- **Sync er det som ikke skalerer.** Hver full sync skriver om hver eneste rad, også de som er
  uendret. I produksjon har 38 000 rader fått 465 000 oppdateringer på tolv døgn. Det er
  uproblematisk i dag og uholdbart for et datasett på flere hundre tusen rader.
- **Ikke alt skal i samme tabell.** Steder med identitet (hytter, badeplasser, besøksgårder)
  hører hjemme i `area_features` eller researchbasen. Bulk-geometri (myr, stier, innsjøer)
  hører hjemme i egne tabeller per datasett, som vektorfliser, eller som direkte oppslag.
- **Lagret er ikke det samme som publisert.** Offentlig lesing går bare gjennom RPC-er, og en
  kategori er usynlig til den er publisert i `area_feature_categories`.
- **Databaseplanen er den første harde grensen.** Basen er 132 MB på Supabase Free, som
  stopper på 500 MB. Ett bulk-datasett med polygoner kan alene være flere gigabyte.

---

## 2. Dagens arkitektur

NaboRadar har tre måter å få data på. Hver kategori hører til nøyaktig én.

| Modell | Lagring | Skrives av | Leses av |
|---|---|---|---|
| **Provider** (synket) | `area_features` (tilstander), `events` + `event_documents` (hendelser) | sync-workeren i GitHub Actions, som `service_role` | `/omrade` via RPC |
| **Direkte oppslag** | ingenting — kilden spørres per søk | — | `/omrade`, fra Next-serveren |
| **Research** (kuratert) | `admin_research_*` | admin, via `security definer`-funksjoner | bare `/admin` |

### Lesestien

`/omrade` bygger tre uavhengige strømmer i `lib/area-view.ts`, hver med egen tidsfrist:

1. **Plansaker** — `events_within` + `data_status`.
2. **Lagrede fakta** — fire RPC-kall parallelt: `features_near` for forurenset grunn, for
   servering og for resten, og `features_count_near` for servering.
3. **Direkte oppslag** — ni kilder parallelt (NVE, Miljødirektoratet, Vegvesenet, Avinor, NGU,
   Kartverket), med et felles budsjett på 8 sekunder og en minnecache per serverinstans.

Alle spørringer er avgrenset i databasen: radius ≤ 10 km, antall ≤ 1 000 (300 som standard),
og `anon` har 3 sekunders `statement_timeout`.

### Skrivestien

`pg_cron` vekker en GitHub Actions-workflow hvert 15. minutt. Workeren tar én forfalt provider
om gangen (`claim_next_due_sync`) og kjører `runSync` i `lib/sync/run.ts`:

```
fetch (alle sider, i minnet) → normalize (Zod, ren funksjon) → dedupe → hash
  → upsert i pakker via RPC → vakter → reconciliation (marker fjernet) → logg i sync_runs
```

Viktige egenskaper:

- En provider skriver aldri til databasen selv. Den henter og normaliserer.
- Identitet er `(provider_id, external_id)`. `id` (uuid) er vår egen og endres aldri.
- `content_hash` avgjør om en rad er endret.
- Rader slettes ikke. Det som forsvinner fra kilden, får `removed_from_source_at`.
- Vaktene i `lib/sync/guards.ts` stopper reconciliation når en kjøring ser feil ut: tomt svar,
  fall over 30 %, eller at nesten ingen ID-er gjenkjennes.

### Research

`admin_research_items` er en generell tabell for funn, leads, notater og datakvalitetsavvik,
med kilder (`admin_research_sources`), reviews (`admin_research_reviews`) og runder
(`admin_research_runs`). Datasenter har egne tilleggstabeller for detaljer, roller og
feltkilder. `scripts/research/funn.ts` er seed-kilden: `research:seed` skriver den til basen
og overskriver felt, så basen og filen må holdes like.

---

## 3. Inventar

Radantall og størrelser er målt i produksjon 2026-10-02. Hele basen er 132 MB.

### Tabeller

| Tabell | Lag | Rader | Størrelse | Geometri | Nøkkel | Risiko ved skala |
|---|---|---|---|---|---|---|
| `area_features` | publisert | 38 128 | 90 MB | `geometry(Geometry, 4326)`, punkt/linje/flate | `id` uuid; unik `(provider_id, external_id)` | **høy** — se sync |
| `area_feature_categories` | register | 13 | liten | — | `category` | lav |
| `huts` | kanonisk | 58 (pilot) | < 1 MB | punkt | `id` uuid | lav — noen tusen rader nasjonalt |
| `hut_sources` | kobling | 99 (pilot) | liten | — | `feature_id`; FK `hut_id` | lav |
| `events` | publisert | 1 561 | 14 MB | flate | `id`; unik `(provider_id, external_id)` | lav |
| `event_documents` | publisert | 3 094 | 1,4 MB | — | `id`; FK `event_id` | lav |
| `providers` | kildemodell | 20 | liten | — | `id` text | lav |
| `sync_runs` | drift | 172 | liten | — | `id`; FK `provider_id` | lav |
| `sync_requests` | drift | få | liten | — | `id` | lav |
| `admin_research_items` | kanonisk/research | 277 | 0,9 MB | valgfri, punkt | `id` | lav |
| `admin_research_sources` | proveniens | 2 019 | 1,2 MB | — | `id`; FK item | lav |
| `admin_research_reviews` | historikk | 1 113 | 0,9 MB | — | `id`; FK item, run | middels — vokser med hver seed |
| `admin_research_runs` | historikk | 28 | liten | — | `id` | lav |
| `admin_research_datacenter_details` | kategoridetaljer | 106 | 0,5 MB | — | `research_item_id` (1:1) | lav |
| `admin_research_datacenter_parties` | relasjoner | 306 | 0,3 MB | — | `id`; unik `(item, role, name)` | lav |
| `admin_research_datacenter_field_sources` | feltproveniens | 206 | 0,2 MB | — | `(item, field_name, source_id)` | lav |
| `admin_research_datacenter_refresh_runs` / `_items` | drift | 16 / 995 | 1 MB | — | — | lav |
| `admin_users` | tilgang | 1 | liten | — | `email` | lav |
| `watched_areas`, `notifications` | brukerdata | 0 | — | punkt | — | ikke i bruk |

Alle tabeller har RLS slått på. `service_role` skriver; ingen andre roller har skrivetilgang
til noe annet enn `watched_areas`.

### `area_features` per kilde

| Kilde | Kategori | Rader | Geometri | Snitt / maks punkter |
|---|---|---|---|---|
| `mdir-forurenset-grunn` | miljo | 15 971 | flate | 74 / 8 011 |
| `nve-nettanlegg` | infrastruktur | 6 310 | linje og punkt | 35 / 5 022 |
| `nve-kvikkleire-soner` | grunnforhold | 4 873 | flate | 186 / 101 828 |
| `udir-barnehager` | oppvekst | 4 493 | punkt | — |
| `udir-skoler` | oppvekst | 3 103 | punkt | — |
| `oslo-skjenkebevilling` | servering | 1 406 | punkt | — |
| `mdir-industri-tillatelse` | industri | 866 | punkt | — |
| `dsb-tilfluktsrom` | tilfluktsrom | 556 | punkt | — |
| `omsorgstilbud` | omsorg | 367 | punkt | — |
| `oslo-skolekrets` | skolekrets | 105 | flate | 198 / 724 |
| `helsenorge-sykehus` | helse | 80 | punkt | — |

### Indekser

| Tabell | Indeks | Type | Brukes av |
|---|---|---|---|
| `area_features` | `area_features_geog_gix` på `(geom::geography)` | GiST | radius, nærmeste, punkt-i-flate |
| `area_features` | `area_features_category_idx (category, subtype)` | B-tre | kategorifilter (BitmapAnd) |
| `area_features` | unik `(provider_id, external_id)` | B-tre | upsert, reconciliation |
| `area_features` | `area_features_provider_idx (provider_id, synced_at)` | B-tre | reconciliation — og grunnen til at ingen oppdatering er HOT |
| `events` | `events_geog_gix`, `events_geom_gix` | GiST | radius; den andre er ubrukt |
| `admin_research_items` | GiST på `(geom::geography)`, B-tre på kategori, kommune, `next_review_at` | — | adressesøk, kart, review-kø |

`area_features` har ingen GiST-indeks på `geom` som geometri. Den trengs ikke i dag, og må
opprettes før første kartlag som spør på kartutsnitt (se [10](#10-romlige-indekser)).

### Funksjoner

| Gruppe | Funksjoner | Hvem kaller |
|---|---|---|
| Offentlig lesing | `features_near`, `features_count_near`, `events_within`, `get_event`, `data_status` | `anon`, via Next-serveren. Alle er `security definer` |
| Skriving | `upsert_area_features`, `upsert_events`, `mark_area_features_removed`, `mark_removed_from_source` | `service_role` |
| Sync-koordinering | `sync_run_start/finish`, `sync_due`, `claim_next_due_sync`, `claim_sync_request`, `provider_baseline`, `set_alert_state` m.fl. | `service_role` |
| Drift | `provider_health`, `recent_sync_runs`, `request_sync`, `scheduler_status` | admin |
| Hytter | `huts_near`, `huts_in_bbox`, `huts_in_municipality`, `huts_search`, `get_hut` | `anon`, via Next-serveren. `security definer`; svarer bare når kategorien `hytte` er publisert eller kalleren er admin |
| Hytter, internt | `refresh_huts` (`service_role`, etter sync); `hut_review_queue`, `review_hut`, `set_hut_links` (admin) | — |
| Research | `research_*`, `save_research_item`, `record_research_review`, `datacenter_*`, `save_datacenter_*` | admin; `is_admin()` sjekkes inne i hver |
| Views | `admin_research_review_status`, `admin_datacenter_overview`, `admin_datacenter_refresh_status` | bare via funksjonene over |

---

## 4. Datalagene

```
KILDE / RÅ          →  NORMALISERT        →  LAGRET              →  PUBLISERT
det provideren      det normalize()       area_features,         det lese-RPC-ene
leverer             returnerer            events, bulk-tabeller  returnerer
(aldri lagret       (i minnet, Zod-       (kodede verdier,       (is_public = true,
 i Postgres)         validert)             én rad per objekt)      avgrenset på radius)
```

**Rå.** Rådata lagres ikke i Postgres. Provideren henter, normaliserer i minnet og forkaster
resten. Unntaket er `events.raw_data`, som er en rest fra første versjon og ikke leses av
appen. Slik skal det fortsatt være:

- Ingen felles `raw`-tabell. En tabell med `jsonb`-payload fra alle kilder blir den største i
  basen og den minst nyttige.
- Trenger et datasett mellomlagring — fordi det er for stort til å normaliseres i minnet,
  eller fordi diffen må gjøres i databasen — får det en **egen staging-tabell per datasett**
  (`staging_<datasett>`), uten RLS-policyer og uten grants, som tømmes etter publisering.
- Rå nedlastingsfiler (GeoPackage, GML, shapefiler) hører hjemme i objektlager, ikke i
  Postgres. Se [19](#19-lagring-og-hva-som-skal-ligge-utenfor-postgres).

**Normalisert.** Et eget normalisert lag i databasen trengs ikke. `normalize()` er en ren
funksjon som kan testes uten nettverk, og resultatet er det som lagres.

**Lagret.** `area_features.attributes` inneholder bare kodede verdier fra kilden — klasser,
årstall, spenning. Aldri fritekst, navn på privatpersoner eller bemerkningsfelt.

**Publisert.** Det eneste offentlige er det lese-RPC-ene returnerer. En kategori publiseres ved
å sette `area_feature_categories.is_public = true`. Research publiseres aldri automatisk: et
funn som skal ut, går gjennom en provider, en kilde med lisens og en visningsregel.

---

## 5. Kanoniske enheter eller bulk-lag

Spørsmålet som avgjør hvor et datasett hører hjemme: **er hvert objekt en ting noen kan
mene noe om?**

| Datasett | Modell | Begrunnelse |
|---|---|---|
| Datasentre | **Kanonisk** (research) | Identitet over tid: eierskifte, rebrand, utvidelse. Flere kilder per felt |
| Besøksgårder, dyregårder, 4H-gårder | **Kanonisk** (research eller hybrid) | Ingen nasjonal kilde; åpningstid og status må verifiseres |
| Hytter og koier | **Kanonisk** (`huts`), bygget automatisk av kildeposter i `area_features` | Hovedkilden har ingen stabil ID, og samme hytte finnes i flere kilder. Se under |
| Badeplasser, gapahuker, rasteplasser, turmål | **Sted** i `area_features` | Punkt med navn og noen kodede egenskaper. Identitet = kildens ID |
| Natur- og friluftssentre, familieaktiviteter | **Sted**, eller research hvis kilden er svak | Avhenger av om det finnes en strukturert kilde |
| Fiskevann | **Sted** for vannet som turmål (punkt + arter); **bulk** for selve innsjøflaten | Arter og regler er egenskaper ved et navngitt vann. Flaten er kartdata |
| Innsjøpolygoner | **Bulk-lag** | Hundretusener av flater. Ingen mener noe om hver enkelt |
| Myrpolygoner | **Bulk-lag** | Millioner av flater. Brukes til punkt-i-flate og kart |
| Stisegmenter | **Bulk-lag** | Segmenter har ikke identitet; ruter har. En rute er et sted, segmentene er geometri |
| Naturfarepolygoner | **Direkte oppslag** eller bulk-lag | I dag spørres NVE direkte per søk. Lagres bare hvis oppslagene blir for trege eller ustabile |
| Reguleringsplaner | **Hendelse** (`events`) | Har dato og livsløp. Identitet = nasjonal arealplan-ID |

**Kanonisk** betyr: én rad per fysisk ting, med egen uuid, kilder per påstand, status,
review-plan og historikk. I dag er det `admin_research_items` med tilleggstabeller.

**Sted** betyr: én rad per objekt i kilden, identifisert av `(provider_id, external_id)`.
Ingen manuell review. Ferskhet følger kilden.

**Kanonisk over kildeposter** er mellomtingen, og hytter er første eksempel (migrasjon
`20261019000000_huts.sql`):

```
area_features (kategori hytte_kilde, aldri publisert)   én rad per objekt per kilde
        │  refresh_huts() etter hver sync
        ▼
huts                                                    én rad per fysiske hytte, egen uuid
hut_sources (feature_id → hut_id, match_basis)          hvilke poster som beskriver hvilken hytte
        │
        ▼
huts_near / huts_in_bbox / huts_in_municipality / huts_search     svarer bare når `hytte` er publisert
```

Synken er den vanlige: provideren skriver kildeposter, og vaktene og reconciliation virker som
før. Det nye er etterarbeidet (`DataProvider.postSyncFn`), som kobler postene til hytter —
samme navn innen 300 m, ellers innen 50 m uansett navn, ellers ny hytte — regner de kanoniske
feltene på nytt fra den høyest prioriterte kilden som har en verdi, og arkiverer hytter uten
aktiv kilde. Hyttas uuid overlever dermed at kilden bytter nøkkel eller navn. Manuell kontroll
er unntaket: bare når kildene er uenige om typen, når to hytter ligger innen 100 m, eller når
en hytte bare finnes i en sekundærkilde.

Mønsteret gjenbrukes for neste kategori med flere kilder og ustabile ID-er. Det er ikke et
generelt entitetslag: tabellen er hyttespesifikk, med ekte kolonner.

**Bulk-lag** betyr: en egen tabell per datasett, med bare det spørringene trenger. Ingen
review, ingen feltproveniens, ingen historikk per rad. Lastes som hele versjoner, ikke rad for
rad:

```sql
-- Mønsteret, ikke en tabell som finnes. Opprettes først når datasettet faktisk skal inn.
create table layer_<datasett> (
  id          bigint generated always as identity primary key,
  source_id   text not null,          -- kildens ID, hvis den har en
  klasse      text,                   -- det ene eller de to feltene spørringen trenger
  geom        geometry(MultiPolygon, 4326) not null,
  dataset_version text not null       -- hvilken leveranse raden kom fra
);
create index on layer_<datasett> using gist (geom);
```

Bulk-lag skal **ikke** i `area_features`. Tabellen har uuid-nøkkel, generert `centroid`,
`content_hash`, fire indekser og en sync som skriver om hver rad — riktig for 40 000 steder,
feil for fem millioner flater.

En regel som er lett å følge: **et datasett med over 100 000 rader er et bulk-lag til det
motsatte er begrunnet.**

---

## 6. Kategoridetaljer og relasjoner

### Detaljer

Mønsteret fra datasenter gjelder for alle kanoniske kategorier: **en egen 1:1-tabell per
kategori**, med ekte kolonner og constraints.

```
admin_research_items            (felles: tittel, sted, status, sikkerhet, review)
  └─ admin_research_datacenter_details   (MW-felt, type, åpningsår …)
  └─ admin_research_<kategori>_details   (opprettes når kategorien faktisk bygges)
```

Det unngår tre ting:

- en bred tabell med hundrevis av kolonner som nesten alltid er tomme
- alt i fritt `jsonb`, der ingenting kan valideres
- EAV (`entity, key, value`), der hver spørring blir en pivot

For **steder** i `area_features` er `attributes jsonb` riktig: verdiene er kodede, kommer fra
én kilde og valideres av providerens Zod-skjema. Blir en egenskap noe det skal filtreres eller
sorteres på i databasen, løftes den til en egen kolonne da — ikke før.

Ingen detaljtabeller opprettes på forhånd. `hut_details`, `fishing_water_details` og lignende
lages i samme migrasjon som kategorien de hører til.

### Relasjoner

**Kategori-spesifikke relasjonstabeller, ikke én polymorf.**
`admin_research_datacenter_parties` viser hvorfor: rollene (`owner`, `operator`, `customer`,
`investor` …) har regler som bare gjelder datasentre — en kunde krever høy sikkerhet og en
kilde, og det håndheves av en constraint. En felles `relations (from_type, from_id, to_type,
to_id, kind)` kan ikke ha fremmednøkler og kan ikke validere noe av dette.

| Relasjon | Løsning |
|---|---|
| Anlegg ↔ eier/operatør/kunde/investor | `admin_research_datacenter_parties` (finnes) |
| Tidligere operatør | samme tabell, med rolle og periode i notat; historikken ligger i reviews |
| Vann ↔ fiskeart | egen tabell `(vann, art)` når fiskevann bygges; arter som kodet liste |
| Hytte ↔ forvalter | kolonne på hytta til det finnes to forvaltere for samme hytte |
| Rute ↔ hytte | egen tabell når ruter bygges |
| Hytte ↔ kildepost | `hut_sources` (finnes) |
| Research-enhet ↔ kildepost | `entity_source_records`, se [8](#8-stabile-id-er-og-dedup) |

Organisasjoner (operatører, forvaltere) er i dag navn og organisasjonsnummer på relasjonen.
En egen `organizations`-tabell lønner seg først når samme aktør skal vises på tvers av
kategorier.

---

## 7. Kildemodell og proveniens

### Kildemodellen

| Begrep | Hvor det ligger i dag | Vurdering |
|---|---|---|
| **Provider** (organisasjonen: NVE, Udir) | `owner` på provider-klassen i koden | Holder. Organisasjonen er metadata, ikke en nøkkel |
| **Datasett** (NVE kvikkleiresoner) | én rad i `providers` | Tabellen heter `providers`, men hver rad er et datasett. Navnet beholdes; det er for mange referanser til at et navnebytte er verdt det |
| **Kildepost** (ArcGIS-feature 123) | `(provider_id, external_id)` på raden | Holder. Én post per objekt |
| **Kildedokument** (PDF-vedtak, nettside) | `event_documents` for plansaker; `admin_research_sources` for research | Holder |
| **Sync-kjøring** | `sync_runs` | Holder. Radene i `area_features` peker ikke på kjøringen som skrev dem, og trenger det ikke |

Det som mangler er lisens- og dekningsmetadata utover `license_name`/`license_url`, og de står
i [data-sources.md](data-sources.md). Ingen nye kildetabeller trengs nå.

### Proveniens

Tre nivåer, valgt etter hva dataene tåler:

| Nivå | Gjelder | Mekanisme |
|---|---|---|
| **Rad** | alt i `area_features`, `events` og bulk-lag | `provider_id`, `external_id`, `source_url`, `source_updated_at`. Hele raden kommer fra én kilde, så feltproveniens er overflødig |
| **Påstand** | alle research-funn | `admin_research_sources`: kilde, type, dato, om den er primær, om den støtter påstanden |
| **Felt** | utvalgte felt på kanoniske enheter | `admin_research_datacenter_field_sources (item, field_name, source_id, note)` og `source_id` på hver rolle |

Feltproveniens fungerer fordi den er **avgrenset**: bare felt der en feil er dyr (MW-tall,
anleggstype, eier, operatør, kunde, åpningsår) får kilde, og bare for noen hundre enheter.
Den skalerer ikke til bulk-data og skal ikke prøve.

Når neste kanoniske kategori trenger feltkilder, gjenbrukes mønsteret med en tabell per
kategori, eller tabellen generaliseres til `admin_research_field_sources` uten
datasenter-prefikset. Det avgjøres da. Det som ikke skal bygges, er en generell
`(entity, field, value, source, valid_from, valid_to)`-tabell — det er EAV med et annet navn.

Historiske verdier ligger i `admin_research_reviews`: hver review har utfall, sammendrag, og
status før og etter. `save_datacenter_details` returnerer hvilke felt som endret seg og
skriver det til reviewen.

---

## 8. Stabile ID-er og dedup

### ID-er

- Vår `id` er en uuid som aldri avledes av tittel, koordinat eller kildens ID.
- Kildens ID er en egenskap (`external_id`), ikke en nøkkel andre tabeller peker på.
- **En ekstern ID er ikke permanent før den er bevist stabil over flere uttrekk.** DSBs
  `lokalId` så ut som en uuid og ble generert på nytt for hvert uttrekk. Vakten i
  `lib/sync/guards.ts` fanger mønsteret; regelen står i håndboken.

| Hendelse | Håndtering |
|---|---|
| Provideren bytter ID på alt | Vakten flagger kjøringen. En engangsmigrering kobler gamle rader til nye ID-er (se `scripts/fix-dsb-identity.ts`) |
| Navnet endres | Ny `content_hash`, samme rad. For research: `tidligere_titler` i `funn.ts` |
| Koordinaten korrigeres | Samme rad. Identitet avhenger ikke av posisjon |
| To kildeposter er samme objekt | To rader i `entity_source_records` peker på samme enhet |
| Én enhet må deles i to | Ny enhet opprettes; kildepostene fordeles; begge får en review som forklarer delingen |
| To enheter må slås sammen | Den ene arkiveres (`verification_status = 'archived'`) med en review som peker på den andre; kildepostene flyttes |

### Koblingen mellom enhet og kildepost

I dag har et research-funn `origin_provider`, men ingen kobling til raden i `area_features`
det eventuelt kom fra. Det er hullet som må tettes den dagen en kategori er **hybrid** —
provideren gir kandidater, research gir verifisering:

```sql
-- Opprettes med første hybride kategori. Ikke før.
create table entity_source_records (
  research_item_id uuid not null references admin_research_items (id) on delete cascade,
  provider_id      text not null references providers (id),
  external_id      text not null,
  match_basis      text not null,   -- 'source_id' | 'orgnr' | 'address' | 'geometry' | 'manual'
  confirmed_by     text,            -- null = foreslått av en regel, ikke bekreftet
  created_at       timestamptz not null default now(),
  primary key (provider_id, external_id)   -- en kildepost hører til høyst én enhet
);
```

Tabellen er billig å legge til senere fordi den ikke endrer noen eksisterende rad.

### Dedup

| | Identitetstunge data | Bulk-geodata |
|---|---|---|
| Eksempler | datasentre, hytter, besøksgårder | myr, flomsoner, stisegmenter |
| Dedup | ja | nei — kildens ID er identiteten |
| Signaler | kildens ID → org.nr → gnr/bnr → adresse → avstand + navn → plan-ID | — |
| Hvem avgjør | en regel foreslår, et menneske bekrefter | — |
| Omfang | hundrevis til noen tusen per kategori | — |

Signalene brukes i den rekkefølgen, fra sterkest til svakest. Navnelikhet alene slår aldri
sammen to enheter. Fuzzy matching kjøres bare innenfor en kategori og en kommune, aldri over
millioner av rader.

---

## 9. Geometri

- **Lagring:** `geometry(…, 4326)`. Samme lon/lat som kildene og webkartet, ingen
  transformasjon ved lagring.
- **Avstand:** cast til `geography` i spørringen, med funksjonell GiST-indeks på
  `(geom::geography)`. Riktige meter overalt i landet uten å velge UTM-sone.
- **Én geometrikolonne per objekt.** Flater lagres som `MultiPolygon`; ugyldige geometrier
  repareres ved skriving (`ST_MakeValid`, bare når `ST_IsValid` er usann).
- **`centroid`** er generert (`ST_PointOnSurface`) og brukes til markører. Det er et punkt som
  alltid ligger inne i flaten — altså allerede et «representative point». En egen
  bbox-kolonne trengs ikke; GiST-indeksen er bbox-indeksen.

| Spørsmål | Svar |
|---|---|
| Trenger kanoniske enheter egen geometri? | Punkt holder for research. Flaten kommer fra kildeposten når den finnes |
| Store flater | `features_near` sender ikke geometri over 5 000 punkter, og forenkler resten til ~0,5 m. Beholdes |
| Millioner av linjesegmenter | Egen bulk-tabell eller bare vektorfliser. Aldri enkeltrader til nettleseren |
| Når forenkles geometri? | Ved levering (RPC, flis), ikke ved lagring. Unntak: bulk-lag som bare brukes til kart, kan lagres forenklet per zoomnivå i flisene |
| `geography` eller `geometry` som kolonnetype? | `geometry`. `geography` som type gjør kartutsnitt og fliser tregere og gir ingenting spørringen ikke allerede får av casten |
| Bør avstand regnes i UTM 33 (EPSG:25833)? | Ikke nå. Det er 5–10 ganger raskere per rad og gir opptil 0,4 % feil ytterst i landet. Aktuelt for et bulk-lag der kostnaden per rad dominerer; da som en generert kolonne i den tabellen |

---

## 10. Romlige indekser

Målt på syntetiske data (se [18](#18-skala-målinger-og-terskler)). Konklusjonen per spørremønster:

| Mønster | Indeks | Status |
|---|---|---|
| Alt innen 500 m / 5 km | GiST `(geom::geography)` + `ST_DWithin` | Finnes. Holder til 10 M rader |
| Nærmeste N | samme indeks, `ORDER BY geom::geography <-> punkt LIMIT n` | Indeksen finnes; ingen RPC bruker KNN ennå. Bruk dette mønsteret for «nærmeste hytte», ikke radius + sortering |
| Flater som inneholder punktet | samme indeks, `ST_DWithin(…, 0)` — eller GiST `(geom)` + `ST_Intersects` | `features_near` gjør det første. En ren `ST_Intersects(geom, punkt)` uten geometri-GiST er sekvensielt søk |
| Kartutsnitt | GiST `(geom)` + `geom && ST_MakeEnvelope(…)` | **Mangler på `area_features`.** Opprettes med første kartlag som spør på utsnitt |
| Kategori + radius | B-tre `(category, subtype)` + romlig GiST, kombinert med BitmapAnd | Finnes. Planleggeren velger det selv |
| Kommune + kategori | B-tre `(municipality_number, category)` | **Kolonnen finnes ikke** på `area_features`. Legges til med første provider som leverer kommunenummer |
| Status + kategori + geometri | delindeks: `… WHERE removed_from_source_at IS NULL` | Ikke nødvendig før andelen fjernede rader blir stor |

Konkrete indekser som skal opprettes når behovet kommer — ikke før:

```sql
-- Første kartlag med utsnittsspørring mot area_features:
create index concurrently area_features_geom_gix on area_features using gist (geom);

-- Første provider med kommunenummer:
alter table area_features add column municipality_number text;
create index concurrently area_features_kommune_idx
  on area_features (municipality_number, category) where municipality_number is not null;
```

Indekser som **ikke** skal opprettes:

- **Delindeks per kategori** (`… WHERE category = 'hytte'`). Målt: planleggeren valgte
  kategori-indeksen i stedet, og spørringen ble tregere. BitmapAnd på de to felles indeksene
  gjør jobben.
- **SP-GiST.** Gir ingenting for blandet punkt/linje/flate.
- **`events_geom_gix`** er ubrukt i dag, men er liten og kan stå.

`area_features_provider_idx (provider_id, synced_at)` bør fjernes når sync legges om (se
[13](#13-sync)): den gjør hver oppdatering av `synced_at` til en indeksskriving.

---

## 11. `/omrade`

Prinsippet er riktig og skal beholdes: **noen få avgrensede RPC-kall parallelt, direkte mot
PostGIS.** Ingen forhåndsberegning, ingen rutenett.

Det som gjør det raskt i dag, og som må holde seg sant:

- Hver RPC har en hard grense på radius og antall.
- Kategoriene spørres hver for seg der én kategori ellers ville fylt radgrensen.
- Tung geometri sendes ikke.
- Research-tabellene leses aldri av den offentlige siden.

Regler for nye kategorier:

1. **Spør på navngitte kategorier.** `categories => null` i en tabell med millioner av rader
   er en spørring over alt som finnes i radiusen. Målt i et syntetisk tett område: 87 000
   rader innen 5 km tok 0,6 s, og tellingen innen 10 km over 1 s. `anon` har 3 s.
2. **«Nærmeste»-spørsmål bruker KNN**, ikke stor radius. De 20 nærmeste hyttene tok 10 ms med
   KNN og 174 ms med radius + sortering på 10 M rader.
3. **Bulk-lag spørres i sin egen tabell** med sin egen RPC — «ligger punktet i myr?» er ett
   indeksoppslag — og blandes aldri inn i `features_near`.
4. **Antall over store radier forhåndsberegnes ikke** før det er målt som et problem. Blir det
   det, er svaret en aggregattabell per kommune eller rute, oppdatert av sync — ikke en
   materialisert view over hele tabellen.

| Alternativ | Vurdering |
|---|---|
| Kategori-spesifikke RPC-er | Ja, når en kategori får egne behov (KNN, egne felt). `features_near` beholdes for det generelle |
| Parallelle spørringer | Ja, slik det er |
| Én felles områdespørring | Nei. Ulike kilder har ulik fart; strømmene skal kunne feile hver for seg |
| Materialiserte views | Nei. Ingenting å materialisere — spørringene er indeksoppslag |
| H3 / S2 / geohash | Nei. Det løser aggregering over faste celler, ikke «innen X meter fra en adresse». PostGIS med GiST er raskere til dette og krever ingen ekstra utvidelse |
| Aggregattabeller | Kan vente. Aktuelt for kommunesider og tellinger over store radier |
| Cache | Direkte oppslag har minnecache per instans. Lagrede fakta trenger ingen cache så lenge spørringene tar millisekunder |

---

## 12. Kartlevering

I dag tegnes kartet av det `/omrade`-spørringene allerede har hentet: noen hundre objekter som
GeoJSON. Det er riktig for det, og feil for et landsdekkende lag.

| Lag | Omfang | Levering |
|---|---|---|
| Datasentre | 100–500 punkter | GeoJSON fra RPC |
| Hytter, badeplasser, gapahuker | 1 000–20 000 punkter | GeoJSON per kartutsnitt + klynger i MapLibre |
| Besøksgårder, sentre | hundrevis | GeoJSON |
| Fiskevann som steder | 10 000–100 000 punkter | GeoJSON per utsnitt med zoomgrense, eller fliser |
| Innsjøflater | 100 000+ flater | forhåndsgenererte vektorfliser (PMTiles) |
| Myr | millioner av flater | PMTiles |
| Turstier | millioner av segmenter | PMTiles |
| Naturfare | store flater | kildens egne WMS/fliser, eller PMTiles |

### Terskler

| Objekter i et typisk utsnitt | Strategi |
|---|---|
| under ~2 000 | GeoJSON fra en RPC med `geom && utsnitt` og `LIMIT`. Målt: 2 000 punkter på 16 ms |
| 2 000 – 50 000 punkter | GeoJSON med klynger i klienten, og en nedre zoomgrense for laget |
| over 50 000, eller flater og linjer i stort antall | vektorfliser |

### Fliser: forhåndsgenerert, ikke dynamisk

`ST_AsMVT` finnes i produksjon (PostGIS 3.3.7 med protobuf). Men en dynamisk flis over 850
objekter tok 0,8 s på dagens instans. Dynamiske fliser fra databasen betyr at hvert kartpan
blir titalls tunge spørringer mot samme base som `/omrade` bruker.

Derfor: **store lag bygges som PMTiles** (med `tippecanoe`, som forenkler per zoomnivå),
legges i objektlager og serveres som en statisk fil med HTTP range-forespørsler. MapLibre
leser PMTiles direkte. Databasen belastes ikke av kartet, og flisene kan bygges i samme
workflow som laster bulk-laget.

Dynamiske fliser fra PostGIS er aktuelt bare for lag som endrer seg oftere enn de kan bygges
på nytt, og da bak en CDN-cache.

---

## 13. Sync

### Det som fungerer

- Provider-isolasjon: én kilde som feiler, stopper ikke de andre.
- Idempotens: samme kjøring to ganger gir samme base.
- Vaktene: en kjøring som ser feil ut, får ikke rydde.
- Sletting er markering, ikke `DELETE`.

### Det som ikke skalerer

**1. Uendrede rader skrives om.** `upsert_area_features` setter `synced_at` på hver rad den
ser, fordi reconciliation finner fjernede rader med `synced_at < kjøringen`. `synced_at` står
i en indeks, så ingen av oppdateringene er HOT: hver rad får ny versjon i heapen og i alle
fem indeksene, også GiST-indeksen.

Målt i produksjon: 38 128 rader, 465 701 oppdateringer, 620 av dem HOT. Målt syntetisk: å
«bekrefte» 200 000 uendrede flater tok 9 s og økte tabellen med en tredel før vacuum; for
1,5 M flater tok det sju minutter og 1 GB. Å fjerne indeksen hjalp ikke — sidene er fulle, så
oppdateringene blir ikke HOT uansett.

**2. Alt hentes til minnet før noe skrives.** `runSync` samler alle sider i én liste. Det går
for 16 000 flater og ikke for to millioner.

**3. Skrivingen går rad for rad gjennom REST.** 40 rader per kall, en PL/pgSQL-løkke med
oppslag og unntaksblokk per rad. Dagens tregeste kilde skriver ~110 rader i sekundet ende til
ende. Én million rader ville tatt over to timer.

### Tre veier, valgt etter størrelse

| Datasett | Vei |
|---|---|
| under ~100 000 rader, endres jevnlig | **Dagens sync.** Fungerer |
| 100 000 – 1 M, endres jevnlig | **Dagens sync, lagt om** slik at uendrede rader ikke skrives (under) |
| over 1 M, eller endres sjelden | **Versjonert bulk-last** til egen tabell (under) |

### Omlegging av «uendret»-stien

Gjøres før første datasett over 100 000 rader. Ingen datamigrering, bare funksjonene:

```
upsert:      rader som er uendret, røres ikke. Hver sett external_id skrives til en smal,
             unlogged tabell  sync_seen (provider_id, run_synced_at, external_id).
reconcile:   marker fjernet = aktive rader for provideren som ikke finnes i sync_seen
             for denne kjøringen (anti-join). Deretter slettes kjøringens rader fra sync_seen.
```

Målt: den settbaserte sammenligningen tok 0,35 s for 200 000 rader og 2,3 s for 1,5 M, og
skrev ingenting.
`synced_at` betyr etter dette «sist skrevet», og «sist sett» er providerens
`last_success_at`. `area_features_provider_idx` fjernes samtidig.

### Versjonert bulk-last

For datasett som leveres som hele filer (NIBIO, Kartverket N50, NVE):

```
FETCH     last ned leveransen til objektlager; noter versjon og sjekksum
STAGING   COPY inn i staging_<datasett> (unlogged, ingen indekser)
VALIDATE  antall, gyldig geometri, dekning mot forrige versjon — samme vakter som i dag
BUILD     bygg layer_<datasett>_ny med indekser
PUBLISH   bytt navn i én transaksjon: _ny → gjeldende, gjeldende → _forrige
QA        stikkprøver mot kjente punkter
CLEANUP   dropp _forrige etter en karenstid; tøm staging
```

Egenskapene som følger av dette:

- **Atomisk publisering.** Leserne ser enten forrige eller ny versjon, aldri en halv.
- **En mislykket last ødelegger ingenting.** Gjeldende tabell røres ikke før byttet.
- **Ingen bloat.** Tabellen bygges på nytt i stedet for å oppdateres.
- **Rollback er et navnebytte.**
- Det kjøres fra en jobb med direkte databasetilkobling (`COPY`), ikke gjennom REST.

Ingen av disse tabellene eller jobbene finnes. De bygges med første bulk-lag.

### Sletting og arkivering

| Lag | Når kilden ikke lenger har objektet |
|---|---|
| Steder (`area_features`) | `removed_from_source_at` settes; raden beholdes så delte lenker ikke brekker |
| Bulk-lag | objektet finnes ikke i neste versjon; forrige versjon beholdes en karenstid |
| Kanoniske enheter | ingenting skjer automatisk. Det er et signal til review-køen, ikke en sletting |

**En provider-sync skal aldri kunne endre en kanonisk enhet.** Synken skriver til
`area_features`; research-tabellene skrives bare av admin-funksjonene. Koblingen mellom dem
(`entity_source_records`) er lesing for synken.

---

## 14. Ferskhet og historikk

To ulike ting, som ikke skal blandes:

| | Automatisk ferskhet | Menneskelig review |
|---|---|---|
| Gjelder | steder og bulk-lag | kanoniske enheter |
| Felt | `source_updated_at`, `synced_at`, `providers.last_success_at`, `dataset_version` | `last_verified_at`, `last_reviewed_at`, `next_review_at`, `review_mode` |
| Hva som er «gammelt» | kilden er ikke hentet innen `stale_after_hours` | `next_review_at` er passert |
| Hvem reagerer | varsling (`alerts:check`) | review-køen i `/admin/research/review` |
| Omfang | millioner av rader | hundrevis til noen tusen |

Review-systemet beregner tilstand fra datoene og en intervallpolicy; det lagrer ikke en kø.
Det gjør at det tåler vekst i antall enheter, men det forutsetter at hver enhet er noe et
menneske faktisk kan kontrollere. **Bulk-data får aldri en review-kø.** En kategori som er
svært dynamisk og som ingen har kapasitet til å reviewe, skal ikke bygges som kanonisk.

### Historikk

| Trenger historikk | Mekanisme |
|---|---|
| Datasenter: eier, operatør, status, rebrand | `admin_research_reviews` (append-only), `tidligere_titler`, roller med notat |
| Hytte stengt, badeplass stengt | for steder: `content_hash` endres, raden oppdateres — forrige verdi lagres ikke. Trengs historikken, er det et tegn på at kategorien er kanonisk |
| Plansak | `events` beholder fjernede saker; livsløpet er nye hendelser |
| Hvilke kjøringer som skrev hva | `sync_runs` |

| Trenger ikke historikk per rad | Hvorfor |
|---|---|
| Myr, stier, innsjøer, naturfare | Forrige versjon av datasettet er historikken. Den ligger i objektlager |

Ingen temporal modell med gyldighetsintervaller per felt. Append-only reviews gir sporbarhet
for det som trenger det, og er allerede bygget.

---

## 15. Taksonomi

```
domene      →  kategori        →  subtype
naeromrade     oppvekst           skole, barnehage
miljo          grunnforhold       kvikkleire_faresone
infrastruktur  infrastruktur      transformatorstasjon, kraftledning
friluft        hytte              dnt_ubetjent, dnt_selvbetjent, apen_bu      (eksempel, ikke opprettet)
friluft        badeplass          —                                            (eksempel, ikke opprettet)
```

| Nivå | Hvor | Kontroll |
|---|---|---|
| Domene | `area_feature_categories.domain` | tekst med formkrav |
| Kategori | `area_feature_categories.category`, fremmednøkkel fra `area_features` | oppslagstabell |
| Subtype | `area_features.subtype` | fritekst i databasen; listen eies av provideren og `lib/facts/wording.ts` |

Valget mellom de tre teknikkene:

- **Postgres-enum:** nei. Verdier kan legges til, men ikke fjernes eller gis nytt navn uten
  smerte, og typen må endres i en migrasjon som ikke kan rulles tilbake.
- **`CHECK`-liste:** var løsningen til nå. Hver ny kategori betød å droppe og gjenopprette
  constrainten på hele tabellen — fem ganger på to uker.
- **Oppslagstabell med fremmednøkkel:** valgt. En ny kategori er en `INSERT`, kan bære
  metadata (domene, etikett, publisert), og kan ikke skrives feil.

En ny kategori legges til i en migrasjon:

```sql
insert into area_feature_categories (category, domain, label)  -- is_public = false
values ('hytte', 'friluft', 'Hytter og koier');
```

og i `AREA_CATEGORIES` i `types/area-feature.ts` den dagen appen skal lese den.

Research har sin egen fritekst-taksonomi (`category`, `subcategory`), tilpasset hvordan
researchen er organisert. Den samles ikke med den over før et funn faktisk skal publiseres.

---

## 16. Søk

I dag søkes det bare i adresser og stedsnavn, og det gjør Kartverket for oss. Research-søket i
admin er `ILIKE` over noen hundre rader.

| Behov | Løsning |
|---|---|
| Adresser og steder | Kartverkets API-er. Ikke lagre adresseregisteret selv |
| Navngitte steder (hytter, vann, gårder) — noen tusen til noen hundre tusen | `pg_trgm` + GIN-indeks på et normalisert navnefelt. Tåler skrivefeil og delord |
| Fulltekst i beskrivelser | Postgres `tsvector` med norsk konfigurasjon, når det finnes tekst å søke i |
| Én søkeboks over flere kategorier | en smal søketabell `(type, id, navn, kommune, punkt)` som sync vedlikeholder, med trigram-indeks |

Ekstern søkemotor (Meilisearch, Typesense, Elasticsearch) er aktuelt først når ett av disse
slår til: over et par millioner søkbare navn med krav om svar under 50 ms, rangering som må
læres av bruk, eller fasetter på tvers av mange felt. Ingen av dem er i nærheten.

`pg_trgm` er ikke aktivert i dag og aktiveres med første søkefunksjon.

---

## 17. Offentlig leseflate og sikkerhet

### Modellen

| Rolle | Tabeller | Funksjoner |
|---|---|---|
| `anon` | **ingen** | `features_near`, `features_count_near`, `events_within`, `get_event`, `data_status`, og `huts_near`, `huts_in_bbox`, `huts_in_municipality`, `huts_search` |
| `authenticated` | `SELECT` på admin-tabellene bak `is_admin()`; eget innhold i `watched_areas` | de samme, pluss admin-funksjonene — som alle sjekker `is_admin()` selv |
| `service_role` | alt | alt — sync-workeren |

**Offentlig lesing går bare gjennom RPC.** Lesefunksjonene er `security definer` med
fast `search_path`. Hver har harde grenser i seg, og `features_near` / `features_count_near`
returnerer bare kategorier med `is_public = true`.

Det betyr at en ny tabell — staging, bulk, research — er usynlig utenfra til en funksjon
bevisst eksponerer den. Supabase gir `ALL` på nye tabeller til `anon` og `authenticated` som
standard, så hver migrasjon som oppretter en tabell må trekke det tilbake. `npm run db:verify`
feiler hvis `anon` har ett eneste tabellprivilegium, hvis `authenticated` har noe utenfor
listen, eller hvis en tabell mangler RLS.

Registrering er åpen i Supabase Auth, så `authenticated` er ikke det samme som admin. Hver
admin-funksjon må sjekke `is_admin()` selv.

### Hull som ble funnet og lukket 2026-10-02

| Hull | Konsekvens | Lukket ved |
|---|---|---|
| `anon` hadde `SELECT` på `area_features`, `events`, `event_documents`, `providers` | Hele tabellene kunne lastes ned gjennom REST, uten radius- eller antallsgrense. Inkluderte `events.raw_data` og `providers.last_error` | `20261018000000_public_read_surface.sql` |
| En synket rad var offentlig straks den var skrevet | Ingen måte å importere og kvalitetssikre før publisering | `area_feature_categories.is_public` |
| `datacenter_search_plan` og `research_review_interval_for` var `security definer` uten `is_admin()` | En innlogget ikke-admin som kjente en uuid, kunne lese tittel, kommune, adresse og rollenavn for et research-funn | stengt for `authenticated`; kalles bare internt |

### Kjente rester

- `events.raw_data` lagres fortsatt, men kan ikke lenger leses utenfra. Kolonnen kan fjernes
  når ingen feilsøking trenger den.
- `net`-skjemaet er en plattformstandard vi ikke kan trekke tilbake; se håndboken.

---

## 18. Skala: målinger og terskler

### Hvordan det ble målt

Produksjonsbasen ble bare lest (`EXPLAIN ANALYZE` på eksisterende spørringer). Alt syntetisk
ble kjørt lokalt i PGlite — Postgres med PostGIS kompilert til WebAssembly — med NaboRadars
egne migrasjoner og `generate_series`.

To baser: 1 M rader (700 000 punkter, 200 000 flater med 49 hjørner, 100 000 linjer) og 10 M
rader (8 M, 1,5 M, 0,5 M). 15 % av punktene ligger i en tett klynge rundt Oslo, med rundt 1 100
objekter per km² i 10 M-basen — langt tettere enn noe reelt datasett, med vilje.

Planene og bufferforbruket er de samme som i produksjon. Tidene er det ikke: PGlite er
entrådet WebAssembly, og produksjonsinstansen er liten og delt. Les tallene som
størrelsesorden.

### Resultater

| # | Spørring | 1 M | 10 M | Plan |
|---|---|---|---|---|
| 1 | Radius 500 m, alle kategorier, tett område | 2 ms | 9 ms | GiST geography |
| 1 | Radius 5 km, alle kategorier, tett område | 35 ms (7 800 rader) | 578 ms (87 000 rader) | GiST → heap; tiden følger antall rader i radiusen |
| 1 | Radius 5 km, spredt område | 8 ms | 61 ms | samme |
| 1 | Antall per kategori innen 10 km, tett | 74 ms | 1 106 ms | samme |
| 2 | Nærmeste 20 (KNN) | 3 ms | 5 ms | GiST `<->` |
| 2 | Nærmeste 20 i en sparsom kategori (KNN + filter) | 7 ms | 10 ms | GiST `<->`, filter |
| 2 | Samme via 10 km radius + sortering | 10 ms | 174 ms | BitmapAnd |
| 3 | Punkt-i-flate uten geometri-GiST | 237 ms | 1 923 ms | **sekvensielt søk** |
| 3 | Punkt-i-flate via geography-indeksen | 11 ms | 11 ms | GiST |
| 4 | Sparsom kategori innen 5 km, tett område | 4 ms | 28 ms | BitmapAnd (kategori ∧ GiST) |
| 4 | Samme med delindeks per kategori | 5 ms | 172 ms | planleggeren valgte feil indeks |
| 5 | Kartutsnitt uten geometri-GiST | 228 ms | 2 195 ms | **sekvensielt søk** |
| 5 | Kartutsnitt med geometri-GiST | 13 ms (24 000 rader) | 443 ms (270 000 rader) | GiST geometry |
| 5 | GeoJSON for 2 000 punkter i utsnittet | 5 ms | 16 ms | GiST geometry + `LIMIT` |
| 6 | Kommune + kategori | < 1 ms | < 1 ms | B-tre. Å etterfylle kolonnen på 2,4 M rader tok over seks minutter |
| 7 | «Bekreft uendret» for alle flatene (dagens sync) | 200 000 rader: 9 s, +152 MB | 1,5 M rader: 7 min, +1 GB | ingen av oppdateringene er HOT |
| 7 | Settbasert diff for de samme radene | 0,35 s, ingen skriving | 2,3 s, ingen skriving | hash-join |

Produksjon i dag, til sammenligning: `features_near` for forurenset grunn innen 1 km i Oslo
sentrum bruker 60–600 ms. Det er geografiregning på 340 flater og GeoJSON for 300 av dem, ikke
indeksen, som tar tiden.

### Hva tallene sier

1. **Tabellstørrelsen er ikke problemet.** Et indeksoppslag på 10 M rader koster omtrent det
   samme som på 1 M.
2. **Tettheten er problemet.** Tiden følger antall rader i radiusen eller utsnittet. Derfor:
   spør på navngitte kategorier, bruk KNN for «nærmeste», og lever store lag som fliser.
3. **To spørremønstre mangler indeks i dag** — kartutsnitt og ren punkt-i-flate. Begge er
   sekvensielle søk som nærmer seg `anon`-grensen på 3 s rundt 10 M rader. Ingen spørring i
   appen bruker dem ennå.
4. **Skrivestien er flaskehalsen, ikke lesestien.**

### Partisjonering

Partisjonering gjør spørringer raskere bare når planleggeren kan utelukke partisjoner — altså
når nesten alle spørringer filtrerer på partisjonsnøkkelen. Det den faktisk gir, er billig
utskifting: en partisjon kan lastes, byttes og droppes uten å røre resten.

| Situasjon | Partisjonere? |
|---|---|
| 10 M rader i én tabell med gode indekser | Nei. Indeksene gjør jobben; partisjoner gir flere planer å velge feil mellom |
| Flere bulk-datasett | Nei — egne tabeller per datasett gir det samme, med enklere spørringer |
| Ett bulk-datasett som lastes fylke for fylke | Kanskje: liste-partisjon på fylke, så ett fylke kan byttes alene |
| Tidsserier (hendelser, målinger) over år | Ja, på tid, når tabellen passerer titalls millioner og gamle data skal kunne droppes |
| `area_features` på kategori | Nei. Kategorifilteret er allerede billig, og en romlig spørring uten kategori ville måtte besøke alle partisjoner |

### Hva som ryker først, ved hvilken størrelse

Dagens instans har 224 MB `shared_buffers`, ~384 MB `effective_cache_size`, 60 tilkoblinger
og én parallell arbeider. Punkt-i-tid-gjenoppretting er ikke aktivert.

| Rader totalt | Fungerer | Ryker først |
|---|---|---|
| **1 M** | Alle lesespørringer. Basen blir 0,5–1 GB | Databaseplanen (Supabase Free stopper på 500 MB, og basen blir skrivebeskyttet når grensen nås) og dagens sync for datasett over ~100 000 rader |
| **10 M** | Indeksoppslag, KNN, punkt-i-flate. 5–10 GB med punkter, 20–50 GB med flater | Minne: GiST-indeksen (0,7 GB+) får ikke plass i cache på en liten instans, og hvert oppslag blir disklesing. Autovacuum hvis noe fortsatt oppdateres rad for rad. Kartutsnitt uten fliser |
| **50 M** | Det samme, med større instans (16 GB+ minne) og versjonerte bulk-laster | Backup- og gjenopprettingstid. Indeksbygging tar timer. Én tabell for alt blir uhåndterlig — bulk-lagene må være egne tabeller |
| **100 M** | Punktoppslag, hvis hvert lag er sin egen tabell | Alt som går på tvers av lag. Her bør de største lagene være PMTiles og ikke lenger ligge i den operative basen, eller flyttes til en lesereplika |

Når deler bør skilles ut: når kartfliser eller bulk-laster påvirker svartiden på `/omrade`.
Første steg er PMTiles i objektlager (kartet ut av basen), andre steg en lesereplika for
tunge lag. En egen GIS-stakk er ikke nødvendig på noen av disse størrelsene.

---

## 19. Lagring og hva som skal ligge utenfor Postgres

### Størrelsesorden

Målt på de syntetiske basene, med dagens kolonner og indekser i `area_features`:

| Innhold | Tabell | Indekser | Sum |
|---|---|---|---|
| 1 M punkter | ~0,25 GB | ~0,17 GB | **~0,4 GB** |
| 10 M punkter | ~2,5 GB | ~1,7 GB | **~4 GB** |
| 1 M flater, ~50 hjørner | ~1,1 GB | ~0,2 GB | **~1,3 GB** |
| 1 M flater, ~200 hjørner (som kvikkleiresonene) | ~3,5 GB | ~0,2 GB | **~4 GB** |
| 10 M flater, 50–200 hjørner | 11–35 GB | ~2 GB | **13–37 GB** |
| 10 M rå `jsonb`-payloader à 1–2 kB | 5–15 GB (etter komprimering) | lite | **5–15 GB** |
| GiST-indeks alene, per 1 M rader | — | ~70 MB | |
| Geometri-GiST i tillegg, per 1 M rader | — | ~50 MB | |
| Unik `(provider_id, external_id)`, per 1 M rader | — | ~60 MB | |

En bulk-tabell med `bigint`-nøkkel, uten `centroid`, `content_hash` og `attributes`, er
omtrent halvparten så stor per rad som `area_features` for punkter. For flater dominerer
geometrien uansett.

### Utenfor Postgres

| Innhold | Hvor | Hvorfor |
|---|---|---|
| Rå nedlastingsfiler (GeoPackage, GML, shapefiler) | objektlager | Reproduserbare, store, leses én gang per last |
| PMTiles og andre genererte fliser | objektlager, bak CDN | Statisk, leses med range-forespørsler |
| Kilde-PDF-er | ikke lagret — vi lenker | Opphavsrett, størrelse, og kilden er sannheten |
| Rå payload per rad | ikke lagret | Kan hentes på nytt; `content_hash` forteller om noe er endret |
| Forrige versjon av et bulk-lag | objektlager (filen), ikke en tabell | Historikk uten å doble basen |
| Svar fra direkte oppslag | minnecache per instans | Kortlevd, billig å hente igjen |

Regelen: Postgres holder det som spørres romlig eller redigeres. Alt som bare lagres, ligger
et annet sted.

---

## 20. Backup og gjenoppretting

| | Reproduserbart | Uerstattelig |
|---|---|---|
| Hva | `area_features`, `events`, `event_documents`, bulk-lag, fliser | `admin_research_*` (funn, kilder, reviews, runder, datasenterdetaljer, roller, feltkilder), `admin_users`, dedup-beslutninger, `watched_areas` når den tas i bruk |
| Størrelse | nesten alt volumet | noen megabyte |
| Gjenoppretting | kjør sync / last datasettet på nytt | bare fra backup |

Dette er ikke det samme som det sto i håndboken før: researchbasen har vokst til 277 funn,
2 000 kilder og 1 100 reviews, og **er nå det mest verdifulle i basen**.

Hva som finnes i dag:

- `scripts/research/funn.ts` i git er en fullverdig kopi av funnene og primærkildene. Den
  gjenskaper ikke reviews, runder, datasenterdetaljer, roller, feltkilder eller sekundærkilder.
- Prosjektet står på Supabase Free. Daglige backuper og punkt-i-tid-gjenoppretting hører til
  betalte planer og er ikke aktivert.

Prioritet:

1. **Logisk dump av `admin_research_*` og `admin_users`, jevnlig, til et sted utenfor
   Supabase.** Noen megabyte med `pg_dump --data-only`. Dette er det eneste som ikke kan
   bygges opp igjen.
2. Punkt-i-tid-gjenoppretting før `watched_areas` tas i bruk.
3. Bulk-lag og steder trenger ingen backup utover at kildefilen og lasteskriptet finnes.

Gjenoppretting fra tomt prosjekt: migrasjoner → gjenopprett research-dumpen → opprett
admin-bruker → kjør sync → last bulk-lag → verifiser med `db:verify`.

---

## 21. Beslutninger

### Må gjøres før første friluftsimport — gjort 2026-10-02

1. **Offentlig lesing bare gjennom RPC.** Direkte tabelltilgang for `anon` og `authenticated`
   er fjernet; lese-RPC-ene er `security definer`.
2. **Kategoriregister med publiseringsflagg.** `area_feature_categories` erstatter
   `CHECK`-listen. En ny kategori er upublisert til den settes til `is_public`.
3. **`db:verify` håndhever tabelltilgang og RLS**, ikke bare funksjoner.
4. **To admin-funksjoner uten tilgangssjekk er stengt.**

Felles for disse: de avgjør hvem som ser data i det øyeblikket den skrives. Alt annet på
listen under kan gjøres den dagen det trengs, uten at eksisterende rader må skrives om.

### Bør gjøres snart

| # | Tiltak | Utløser |
|---|---|---|
| 1 | **Oppgrader databaseplanen.** Basen er 132 MB av 500 MB på Supabase Free; ett bulk-lag kan være flere GB, og en full base blir skrivebeskyttet | før noe datasett over ~50 000 flater eller ~500 000 punkter |
| 2 | **Legg om «uendret»-stien i sync** (`sync_seen`, anti-join, fjern `area_features_provider_idx`) | før første datasett over 100 000 rader |
| 3 | **Jevnlig dump av researchbasen** utenfor Supabase | nå — uavhengig av friluft |
| 4 | **Strøm sidene gjennom sync** i stedet for å samle alt i minnet | før første datasett over ~200 000 rader |
| 5 | **`municipality_number` på `area_features`** med indeks | første provider som leverer kommunenummer |
| 6 | **Geometri-GiST på `area_features`** | første kartlag som spør på utsnitt |
| 7 | **Slå av åpen registrering i Supabase Auth**, eller behold den bevisst | nå — `authenticated` er i dag åpent for alle |

### Kan vente

- Versjonert bulk-last med staging og navnebytte — bygges med første bulk-lag.
- PMTiles-bygging og objektlager — bygges med første kartlag over ~50 000 objekter.
- `entity_source_records` — bygges med første hybride kategori.
- Generalisering av feltkilder ut av datasenter-prefikset.
- `pg_trgm` og søketabell.
- Aggregattabeller per kommune.
- Fjerne `events.raw_data` og `events_geom_gix`.
- Partisjonering, lesereplika.

### Skal ikke gjøres

- Én generell `entities`-tabell som alt skal inn i.
- Én generell rå-tabell med `jsonb` fra alle kilder.
- EAV for detaljer eller proveniens.
- Én polymorf relasjonstabell.
- Bulk-geometri i `area_features`.
- Review-kø for bulk-data.
- H3, S2 eller geohash-rutenett.
- Materialiserte views over `area_features`.
- Dynamiske vektorfliser rett fra den operative basen.
- Ekstern søkemotor, Kafka, mikrotjenester, egen GIS-stakk, ny database.
- Detaljtabeller for kategorier som ikke er bygget.
- Partisjonering «for sikkerhets skyld».

---

## 22. Sjekkliste før et nytt datasett

1. **Hvilken modell?** Sted, bulk-lag, direkte oppslag, hendelse eller kanonisk. Se
   [5](#5-kanoniske-enheter-eller-bulk-lag). Over 100 000 rader er bulk til det motsatte er
   begrunnet.
2. **Står kategorien i [data-roadmap.md](data-roadmap.md)?**
3. **Kildekravene** fra roadmapen: lisens, dekning, oppdateringsfrekvens, identitetsstrategi,
   og at ekstern ID er bevist stabil over to uttrekk.
4. **Hvor mange rader, og hvor store geometrier?** Regn om til GB med tabellen i
   [19](#19-lagring-og-hva-som-skal-ligge-utenfor-postgres), og sjekk mot databaseplanen.
5. **Kategorien registreres upublisert** i `area_feature_categories`.
6. **Importer, kontroller i admin, publiser** — i den rekkefølgen.
7. **Hvilken spørring skal lese den?** Navngitt kategori, KNN for «nærmeste», egen RPC for
   bulk-lag. Kjør `EXPLAIN ANALYZE` og se etter sekvensielt søk.
8. **Hvordan kommer den på kartet?** Tersklene i [12](#12-kartlevering).
9. **Ny tabell?** Slå på RLS, trekk tilbake grants fra `anon` og `authenticated`, kjør
   `db:verify`.
