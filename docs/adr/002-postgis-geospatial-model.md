# ADR 002: PostGIS-modell — geometry(4326) med geography-indeks

**Status:** Akseptert · 2026-09-21

## Kontekst
Vi må finne saker der polygonet helt eller delvis ligger innen X meter fra et punkt. Meteravstanden må være korrekt,
og spørringen må være indeksert. DiBK leverer CRS84 (lon/lat), og webkart bruker også lon/lat.

## Alternativer
| | `geometry(…, 4326)` | `geography` | `geometry(…, 25833)` |
|---|---|---|---|
| Meter-korrekt `ST_DWithin` | Nei (grader) | Ja | Ja (UTM, men forvrengt langt fra sone 33) |
| Hele PostGIS-funksjonsbiblioteket | Ja | Begrenset (f.eks. ingen `ST_MakeValid`, `ST_PointOnSurface`) | Ja |
| GeoJSON inn/ut uten transformasjon | Ja | Ja | Nei |

## Beslutning
- Lagre som `geometry(Geometry, 4326)`.
- Radius-spørringer caster til geography: `ST_DWithin(geom::geography, point::geography, radius_m)`.
- Lag en **funksjonell GiST-indeks** på `(geom::geography)`, i tillegg til vanlig GiST på `geom`.
- `centroid` = `ST_PointOnSurface(geom)` (garantert inni polygonet) og `computed_area_m2` = `ST_Area(geom::geography)` er genererte kolonner.
- Radiusfiltrering bruker alltid faktisk geometri, aldri centroid eller hjørner.

## Verifisering
Kjørt med PGlite + PostGIS på ekte DiBK-polygoner:
- `EXPLAIN` viser `Index Scan using events_geog_gix`.
- Et punkt inni et polygon gir `distance_m = 0`.
- Bjørnstjerne Bjørnsons plass ligger 422 m unna målt til polygonet, men 592 m målt til centroid. En 500 m-radius finner den bare med polygon-avstand.

## Konsekvenser
- Spørringer må skrive `geom::geography` nøyaktig slik for å treffe indeksen. Dette er innkapslet i `events_within()`.
- Arealet er beregnet av oss og skal merkes «Beregnet planområde» i UI.
