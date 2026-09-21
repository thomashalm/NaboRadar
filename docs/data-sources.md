# Datakilder

Dette dokumentet beskriver hver eksterne datakilde NaboRadar har testet, basert på faktiske kall — ikke på antakelser.
Oppdater «Sist testet» og eksempelrespons når en kilde testes på nytt.

**Sist gjennomgått:** 2026-09-21

## Oversikt

| Kilde | Eier | Tilgang | Lisens | Status i NaboRadar |
|---|---|---|---|---|
| [Planlegging igangsatt – `planomrade`](#1-dibk--planlegging-igangsatt) | DiBK | Åpen | NLOD 2.0 | **Aktiv** (`dibk-planning-started`) |
| Planlegging igangsatt – `arealplan` | DiBK | Åpen | NLOD 2.0 | Ikke brukt (ingen geometri, `bbox` feiler) |
| Planlegging igangsatt – `plandokument` | DiBK | Åpen | NLOD 2.0 | Brukt for dokumentlenker (allowlist) |
| [NAP reguleringsplaner](#2-dibk--nasjonal-arealplanbase-nap) | DiBK | **401 – Norge Digitalt** | Norge Digitalt-vilkår | `unsupported` |
| [NAP reguleringsplanforslag](#2-dibk--nasjonal-arealplanbase-nap) | DiBK | **401 – Norge Digitalt** | Norge Digitalt-vilkår | `unsupported` |
| [Adresse REST-API](#3-kartverket--adresse-rest-api) | Kartverket | Åpen | CC BY 4.0 | **Aktiv** (geokoding) |
| [Stedsnavn-API](#4-kartverket--stedsnavn-api) | Kartverket | Åpen | CC BY 4.0 | **Aktiv** (geokoding) |
| [Kartverket kart-cache (WMTS)](#5-kartverket--bakgrunnskart-wmts) | Kartverket | Åpen | CC BY 4.0 | **Aktiv** (bakgrunnskart) |
| [Oslo kommune Saksinnsyn/Planinnsyn](#6-oslo-kommune--byggesaker) | Oslo kommune | Ingen dokumentert API funnet | — | `disabled` |

---

## 1. DiBK – Planlegging igangsatt

| | |
|---|---|
| **URL** | `https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/` (merk avsluttende `/` — uten gir 301) |
| **Eier** | Direktoratet for byggkvalitet (ftb@dibk.no) |
| **Metadata** | [Geonorge: Planområde for planlegging igangsatt](https://kartkatalog.geonorge.no/metadata/planomraade-for-planlegging-igangsatt/779a554b-fc3e-48a6-b202-561b07e9d4c2) |
| **Format** | OGC API Features (pygeoapi `0.23.dev0`), GeoJSON (`f=json`), også JSON-LD, HTML, CSV |
| **Tilgang** | Åpen, ingen nøkkel. Geonorge: «Åpne data», ugradert, `noLimitations` |
| **Lisens** | [NLOD 2.0](https://data.norge.no/nlod/no/2.0) — bekreftet i både OpenAPI `info.license` og Geonorge-metadata |
| **Oppdatering** | «Kontinuerlig» |
| **Formål (fra API)** | «…identifisere og vise hvor planarbeid er startet, slik at naboer, berørte parter, høringsmyndigheter og kommunen får informasjon om planinitiativet.» |

### Collections

| Collection | Innhold | Geometri | Merknad |
|---|---|---|---|
| `arealplan` | Én rad per plan | `null` | `bbox` gir **HTTP 500**. Ikke egnet til romlig søk. |
| `planomrade` | Planavgrensning(er) | `Polygon` | Vår primære kilde. `bbox` fungerer. |
| `plandokument` | Dokumenter per plan | `null` | Ikke listet i `/collections`, men fungerer med `?arealplan={id}`. |

### Protokoll (testet)

| Funksjon | Resultat |
|---|---|
| CRS | `planomrade`: default CRS84 (lon/lat). Lagres internt i EPSG:25833. Også 25832/25835/4258/4326/3857 tilgjengelig. |
| `limit` | Maks **500** — høyere verdier kappes stille |
| Paginering | `offset` + `limit`, `links[rel=next]`, `numberMatched`, `numberReturned` |
| `bbox=minLon,minLat,maxLon,maxLat` | ✅ på `planomrade` |
| Property-param (`plantype=`, `arealplan=`) | ✅ |
| CQL `filter=oppdateringsdato>'2026-09-01'` | ✅ (26 treff ved test) |
| `datetime=` | ❌ HTTP 500 |
| `sortby=` | ❌ ignoreres stille — kan ikke brukes |
| Enkeltobjekt `/items/{id}` | ✅ |
| HTML-visning `/collections/arealplan/items/{id}?f=html` | ✅ 200 — brukes som stabil kildelenke |
| Volum | ~3 900 planområder, 136 kommuner, datoer fra 2024 → full sync = 8 sider à ~3–6 s |

### Felter vi bruker (`planomrade.properties`)

Alle nøkler var til stede på alle 77 features i en Oslo-bbox-test.

| Felt | Type | Bruk i NaboRadar | Observasjoner |
|---|---|---|---|
| `arealplan` | int | **`externalId`**, grupperingsnøkkel | Flere features kan ha samme verdi |
| `plannavn` | string | `title` | Fritekst, kan ha trailing whitespace |
| `plantype` | string | `attributes.plantype` | Detaljregulering, Områderegulering, Mindre reguleringsendring, Forenklet endring … |
| `kunngjøringsdatoVarselOmPlanoppstart` | date | `announcedAt` | |
| `oppdateringsdato` | date-time | `sourceUpdatedAt`, incremental sync | |
| `nasjonalArealplanId.kommunenummer` | string | `municipalityNumber` | |
| `nasjonalArealplanId.planid` | string | `attributes.planId` | Inkonsistent: «-», «0», saksnummer «2026/02282» |
| `forslagsstillertype` | string | `attributes.proposerType` | Foretak / Privatperson |
| `link` | string | `sourceUrl` hvis gyldig http(s) | Ofte tom (33 av 48 i Oslo), ellers fritekst: «Se vedlegg», «www.oslo.kommune.no/saksinnsyn.» |
| `lovreferanse` | string\|null | `rawData` | Ofte `null` |
| `identifikasjon.*` | object | `rawData` | |
| `førsteDigitaliseringsdato` | date-time\|null | ikke brukt | Nesten alltid `null` |
| `linkArealplan`, `linkPlandokumenter` | string | ikke brukt direkte | Bruker `/services/…` uten `/rest` → 301 |

**Felter som ikke finnes:** formål, areal, status, sluttdato, kommunenavn. Disse skal ikke vises som om kilden leverer dem.

### Felter vi bruker (`plandokument.properties`)

`referanseDokumentfil` (URL), `tittel`, `mimeType`, `dokumenttype`, `dokumentetsDato`, `arealplan`, `sjekksum`.

Observerte `dokumenttype`-verdier: `ref-data-as-pdf` (Varsel om oppstart av planarbeid), `PlanomraadePdf`,
`ReferatOppstartsmoete`, `Planomraade` (GML), `KartDetaljert` (bilde), `Annet`, og **`null` for `beroerteParter.json`**.

> ⚠️ **Personvern:** Hver plan har `beroerteParter.json` (berørte parter, `dokumenttype: null`, `mimeType: application/json`).
> Den skal **aldri** hentes, lagres, lenkes eller sendes til AI. NaboRadar bruker en allowlist:
> `ref-data-as-pdf`, `PlanomraadePdf`, `ReferatOppstartsmoete`.

Nedlasting: `GET` gir 200 `application/octet-stream` med `content-disposition: attachment`. `HEAD` gir 405.

### Eksempelrespons — `planomrade` (forkortet)

`GET /collections/planomrade/items?f=json&arealplan=2053`

```json
{
  "type": "FeatureCollection",
  "numberMatched": 1,
  "numberReturned": 1,
  "features": [{
    "type": "Feature",
    "id": 4522,
    "geometry": { "type": "Polygon", "coordinates": [[[10.731909527776843, 59.92011376274051], "…"]] },
    "properties": {
      "identifikasjon": {
        "lokalId": "453fbaaf-bd0c-4e37-9272-1a1c3c059ae8",
        "navnerom": "http://data.geonorge.no/0301/Reguleringsplaner/so",
        "versjonId": "f66c87b3-9d81-4035-8741-b5bf26553a27"
      },
      "arealplan": 2053,
      "førsteDigitaliseringsdato": null,
      "nasjonalArealplanId": { "planid": "2026/02282", "kommunenummer": "0301" },
      "plannavn": "Nedre del av Hegdehaugsveien",
      "plantype": "Detaljregulering",
      "kunngjøringsdatoVarselOmPlanoppstart": "2026-08-28",
      "forslagsstillertype": "Foretak",
      "lovreferanse": "6",
      "oppdateringsdato": "2026-08-28T08:35:39.598000+00:00",
      "link": "https://innsyn.pbe.oslo.kommune.no/saksinnsyn/casedet.asp?caseno=202602282",
      "linkArealplan": "https://plandata.ft.dibk.no/services/planleggingigangsatt/collections/arealplan/items/2053",
      "linkPlandokumenter": "https://plandata.ft.dibk.no/services/planleggingigangsatt/collections/plandokument/items?arealplan=2053"
    }
  }]
}
```

### Eksempelrespons — `plandokument` (ett element)

```json
{
  "type": "Feature",
  "geometry": null,
  "id": 17947,
  "properties": {
    "referanseDokumentfil": "https://plandata.ft.dibk.no/services/download/planleggingigangsatt/b0646431-…/ad0068bd…",
    "sjekksum": "ad0068bd4629c382a77d826ecadd879f3572d371403851119c44979a9041e503",
    "sjekksumAlgoritme": "SHA-256",
    "tittel": "Varsel om oppstart av planarbeid.pdf",
    "mimeType": "application/pdf",
    "dokumenttype": "ref-data-as-pdf",
    "dokumentetsDato": "2026-08-28",
    "arealplan": 2053
  }
}
```

### Kjente problemer

1. **Dubletter:** én plan kan ha flere `planomrade`-features med samme `arealplan` (observert: 449, 875, 910). → grupperes til ett event med MultiPolygon.
2. **Nye varsler for samme prosjekt** får ny `arealplan`-ID (observert: Skippergata 14 varslet 2025-05-21 og 2025-12-01). Behandles som separate events.
3. **Ingen status/sluttdato:** planer blir liggende etter vedtak. Produktet filtrerer på alder; data slettes ikke.
4. **`link` er upålitelig** — kun fullstendige `http(s)`-URL-er brukes.
5. **`sortby` ignoreres og `datetime` feiler** — bruk CQL `filter` for inkrementell henting.
6. **`robots.txt: Disallow: /`** — gjelder crawlere. Vi bruker kun det dokumenterte API-et og skraper ikke HTML.
7. API-versjonen er `0.23.dev0` — responsformatet kan endre seg. All input valideres med Zod.

---

## 2. DiBK – Nasjonal arealplanbase (NAP)

| | |
|---|---|
| **URL-er** | `https://nap.ft.dibk.no/services/rest/reguleringsplaner/vn1`, `https://nap.ft.dibk.no/services/rest/reguleringsplanforslag/vn1` |
| **Eier** | Direktoratet for byggkvalitet |
| **Resultat** | **HTTP 401** – «Denne siden krever innlogging … krever at du er del av Norge Digitalt» (både landing page og `/collections`) |
| **Lisens** | Norge Digitalt-vilkår (ikke åpen) |
| **Status** | `unsupported`. Ikke omgått. Provider-klassene finnes som stubs og kan aktiveres hvis vi får avtale/tilgang. |

---

## 3. Kartverket – Adresse REST-API

| | |
|---|---|
| **URL** | `https://ws.geonorge.no/adresser/v1/sok` (søk), `/punktsok` (revers) |
| **Eier** | Kartverket |
| **Metadata** | Geonorge `44eeffdc-6069-4000-a49b-2d6bfc59ac61` |
| **Format** | JSON |
| **Tilgang / lisens** | Åpne data, CC BY 4.0 |
| **Responstid** | ~70–160 ms |

Parametere testet: `sok`, `fuzzy=true`, `treffPerSide`, `kommunenummer`, `utkoordsys=4258`, `*`-suffiks for prefikssøk.
`punktsok?lat&lon&radius` fungerer og returnerer `meterDistanseTilPunkt`.

**Felter vi bruker:** `adressetekst`, `postnummer`, `poststed`, `kommunenavn`, `kommunenummer`, `representasjonspunkt.{lat,lon}`, `objtype`.
Ikke brukt: `gardsnummer`, `bruksnummer`, `bruksenhetsnummer` (unødvendig for oss).

```json
{
  "metadata": { "treffPerSide": 1, "side": 0, "totaltAntallTreff": 2 },
  "adresser": [{
    "adressetekst": "Kirkeveien 60",
    "kommunenummer": "0301",
    "kommunenavn": "OSLO",
    "objtype": "Vegadresse",
    "poststed": "OSLO",
    "postnummer": "0368",
    "representasjonspunkt": { "epsg": "EPSG:4258", "lat": 59.92851867399327, "lon": 10.71431671703118 }
  }]
}
```

**Kjente problemer:**
- Stedsnavn som «Sognsvann» gir **0 treff** — trenger Stedsnavn-API i tillegg.
- `kommunenavn`/`poststed` er i STORE BOKSTAVER → normaliseres for visning.
- Uten `kommunenummer` returneres treff fra hele landet («Jernbanetorget 1» → Halden først).

---

## 4. Kartverket – Stedsnavn-API

| | |
|---|---|
| **URL** | `https://ws.geonorge.no/stedsnavn/v1/navn` |
| **Eier** | Kartverket |
| **Metadata** | Geonorge `30caed2f-454e-44be-b5cc-26bb5c0110ca` (datasett), `d12de000-1a23-46b3-9192-3a1a98b2c994` (tjeneste) |
| **Format** | JSON |
| **Tilgang / lisens** | Åpne data, CC BY 4.0 |

Parametere testet: `sok`, `fuzzy=true`, `treffPerSide`, `utkoordsys=4258`.

**Felter vi bruker:** `skrivemåte`, `navneobjekttype`, `kommuner[].{kommunenavn,kommunenummer}`, `representasjonspunkt.{nord,øst}`, `stedsnummer`.

```json
{
  "metadata": { "side": 1, "totaltAntallTreff": 2, "treffPerSide": 1 },
  "navn": [{
    "kommuner": [{ "kommunenavn": "Oslo", "kommunenummer": "0301" }],
    "navneobjekttype": "Vann",
    "navnestatus": "hovednavn",
    "representasjonspunkt": { "nord": 59.97499, "øst": 10.72891 },
    "skrivemåte": "Sognsvann",
    "stedsnummer": 308554,
    "stedstatus": "aktiv"
  }]
}
```

**Kjente problemer:**
- Koordinatnøkler er norske (`nord`, `øst`), ikke `lat`/`lon`.
- `side` starter på **1** (Adresse-API starter på 0).
- `fuzzy=true` gir mange støytreff (Sognsvann → 128); uten `fuzzy` → 2 presise treff. Rangering må håndteres.
- «Oslo S» → «Oslo sentralstasjon» (Stasjon) som første treff.

---

## 5. Kartverket – bakgrunnskart (WMTS)

| | |
|---|---|
| **URL-mal** | `https://cache.kartverket.no/v1/wmts/1.0.0/{lag}/default/webmercator/{z}/{y}/{x}.png` |
| **Lag testet** | `topograatone` (standard i NaboRadar), `topo` — begge 200 `image/png` |
| **Lisens** | CC BY 4.0 — attribusjon «© Kartverket» |
| **Merknad** | Kartverket bytter bakgrunnskart i 2026 → URL og attribusjon er konfigurerbare (`NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION`). tile.openstreetmap.org brukes ikke — OSMF-policyen fraråder bruk i produkter. |

---

## 6. Oslo kommune – byggesaker

Saksinnsyn (`innsyn.pbe.oslo.kommune.no`) og Planinnsyn er offentlige nettsider, men vi har **ikke funnet et dokumentert offentlig API**.
Søk i Felles datakatalog (data.norge.no) etter «byggesak» og «Oslo kommune plan bygg» gav ingen relevante datasett eller datatjenester.

Status: `disabled`. Vi reverse-engineerer ikke interne endepunkter (se [ADR 004](adr/004-no-scraping-oslo.md)).
Saksinnsyn-lenker som kommunen selv har lagt inn i DiBK-feltet `link` vises likevel som kildelenke.

---

## Testpunkter (offentlige steder)

Antall DiBK-planområder innen radius (discovery 2026-09-21, grovmåling til nærmeste polygonhjørne; produktet bruker PostGIS `ST_DWithin` mot hele polygonet).

| Sted | Kilde | lat, lng | 500 m | 1 km | 3 km |
|---|---|---|---|---|---|
| Sognsvann | Stedsnavn (Vann) | 59.97499, 10.72891 | 0 | 0 | 4 |
| Majorstuen | Stedsnavn (Stasjon) | 59.92992, 10.71488 | 2 | 4 | 18 |
| Oslo S | Stedsnavn (Oslo sentralstasjon) | 59.91067, 10.75226 | 5 | 5 | 18* |

\* inkluderer dubletter før gruppering på `arealplan`.

Sognsvann 3 km: Kjelsåsveien (~2,2 km), Frysjaveien 31 (~2,6 km), Tåsenveien 71 – Blåsbortveien 18-32 (~2,8 km), Detaljregulering Maridalsveien 292 (~2,9 km).
