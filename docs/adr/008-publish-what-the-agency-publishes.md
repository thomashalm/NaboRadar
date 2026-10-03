# ADR 008: Vi viser etatens publiserte produkt, og kontrollerer mot det før nasjonal publisering

**Status:** Aktiv · 2026-09-27 (radon), utvidet til en generell port 2026-10-02 (hytter). Nedtegnet 2026-10-03.

## Bakgrunn
**Radon.** NGU har to radonprodukter samtidig: det publiserte kartet (WMS `RadonWMS2`, lag
`Radon_aktsomhet`, 2014-modellen, lenket fra ngu.no) og en nyere «versjon 2» (OGC API Features
`radonaktsomhet`, september 2026). Vi hadde koblet oss på v2 fordi det var nyest og hadde det
reneste API-et. På **40 av 40** testede steder ga de to produktene ulik klasse. Langmyrgrenda 26C
i Oslo ble vist som «Meget høy» hos oss og «Moderat til lav» i NGUs eget kart.

Vi var ikke faglig feil — vi var uetterprøvbare. Et produkt som lever av at folk kan kontrollere
oss, kan ikke vise et annet svar enn kilden folk slår opp i.

**Hytter.** Før hyttene ble publisert nasjonalt, kontrollerte vi et landsdekkende utvalg mot
Kartverkets egne kart og forvalternes egne sider. Vi fant blant annet en fortegnsfeil i UTM 33.

## Alternativer vurdert
- **Alltid nyeste tekniske endepunkt** — avvist etter radon. «Nyest» er ikke det samme som det
  etaten ber brukerne forholde seg til.
- **Stole på datakatalogen** (navn og eier i Geonorge) — avvist. To tjenester kan ha samme navn og
  eier og likevel svare ulikt på samme punkt.
- **Publisere og rette etter tilbakemeldinger** — avvist for nasjonale lag. Feil i stor skala blir
  oppdaget av brukerne før oss.

## Beslutning
- **For offentlig visning bruker vi produktet etaten selv publiserer.** Vi finner det ved å åpne
  etatens eget kart og se hvilke tjenester siden kaller, ikke ved å gå etter navn i en katalog.
  Et nyere teknisk datasett kan brukes internt og i research, merket. Regelen og radoncaset står i
  [håndbok: Flere versjoner av samme datasett](../naboradar-handbook.md#flere-versjoner-av-samme-datasett).
- **Kvalitetskontroll før nasjonal publisering.** Et nytt nasjonalt lag publiseres ikke før:
  - et landsdekkende utvalg er kontrollert mot kildens egen publiserte løsning,
  - det er laget automatiske regelsjekker der det går (koordinater, dubletter, lekkasje av skjulte
    objekter),
  - resultatet er skrevet i en researchfil.

  Eksempler: `npm run qa:naturfare` (ti adresser mot ekte tjenester, exit 1 ved avvik i radon),
  `npm run qa:hytter` (regelsjekker som skal være grønne før publisering).

## Begrunnelse
Brukeren skal kunne slå opp svaret vårt hos kilden og finne det samme. Det er hele grunnlaget for
tilliten, og den er verdt mer enn et litt nyere datasett.

## Konsekvenser
- Bytter NGU sitt publikumskart til v2, bytter vi med — som en bevisst endring med ny QA, ikke fordi
  et endepunkt ble oppgradert.
- Nye lag tar lengre tid å publisere.
- `area_feature_categories.is_public` gjør at et lag kan ligge i basen og kontrolleres før det
  vises ([ADR 009](009-public-admin-security-model.md)).

## Kjente ulemper
- Vi kan vise et eldre produkt enn det beste som finnes teknisk.
- Utvalgskontroll fanger systematiske feil, ikke alle enkeltfeil.

## Revurderes når
- En etat bytter publikumsprodukt.
- En kilde bare finnes som teknisk API, uten publisert kart. Da skal valget dokumenteres eksplisitt.

## Relatert
[håndbok §14 Kildepresisjon og tolkningsregler](../naboradar-handbook.md#14-kildepresisjon-og-tolkningsregler) ·
[area-facts-discovery.md](../area-facts-discovery.md) ·
[research/hytter-nasjonal-import.md](../research/hytter-nasjonal-import.md) ·
[research/hytter-pilot-kildekontroll.md](../research/hytter-pilot-kildekontroll.md)
