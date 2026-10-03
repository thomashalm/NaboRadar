# Research

Én fil per større undersøkelse, kilde eller problemstilling: hva vi undersøkte, hvordan, hva vi
fant (også det som ikke virket), og hva vi bestemte. Researchfilene er historikk. De beskriver hva
som var sant da undersøkelsen ble gjort, ikke nødvendigvis dagens løsning. Dagens løsning står i
[håndboka](../naboradar-handbook.md), beslutningene i [ADR](../adr/README.md).

## Regler

- **Ikke slett negative funn eller forkastede spor.** De er grunnen til at ingen trenger å gjøre
  samme undersøkelse på nytt.
- **Ikke skriv om historiske funn** fordi løsningen endres senere. Legg heller til en datert
  merknad øverst: «Erstattet av …» eller «Delvis utdatert: …».
- Skill **fakta** (målt, sitert, testet), **vurderinger** og **beslutninger**. Bevar usikkerhet.
- Oppgi dato, kilder, lisens/vilkår, metode og testutvalg, slik at funnene kan etterprøves.
- En researchfil som fører til en viktig beslutning, lenker til ADR-en, og ADR-en til filen.

## Indeks

### Hytter og koier
| Fil | Dato | Kort |
|---|---|---|
| [hytter-pilot-kildekontroll.md](hytter-pilot-kildekontroll.md) | 2026-10-02 | 58 pilothytter mot forvalterens egen side. «Ulåst» betyr ikke fri bruk |
| [hytter-nasjonal-import.md](hytter-nasjonal-import.md) | 2026-10-02 | Import av hele landet fra N50 og Turrutebasen; fortegnsfeil i UTM 33 funnet før import |
| [hytter-dnt-berikelse.md](hytter-dnt-berikelse.md) | 2026-10-02 | Opprydding etter import, rastebu mot overnattingshytte, DNT-forening og lenker |
| [hytter-dnt-gap-audit.md](hytter-dnt-gap-audit.md) | 2026-10-02 | DNT-hytter uten forening eller lenke, én for én |
| [hytter-statskog-berikelse.md](hytter-statskog-berikelse.md) | 2026-10-02 | Statskogs hytter, stengt-status, Storlihytta |
| [hytter-fjellstyre-berikelse.md](hytter-fjellstyre-berikelse.md) | 2026-10-02 | Fjellstyrehytter fra Fjellstyresambandet og fjellstyrenes sider |
| [hytter-andre-berikelse.md](hytter-andre-berikelse.md) | 2026-10-02 | «Andre»: private turisthytter, kystled, allmenninger; «ikke for allmennheten» |
| [dnt-booking-ledighet.md](dnt-booking-ledighet.md) | 2026-10-02 | DNTs booking har åpne endepunkter, men rettighetene er uklare. Ikke bygget |
| [hytter-geografiske-filtre.md](hytter-geografiske-filtre.md) | 2026-10-03 | «Ved sjøen», «Ved vann», «På fjellet» fra N50-arealdekke. Ikke bygget |

Statuslinjen «Kategorien er upublisert» i hyttefilene gjaldt da de ble skrevet. Kategorien ble
publisert 2026-10-02 ([ADR 009](../adr/009-public-admin-security-model.md)).

### Søk, synlighet og personvern
| Fil | Dato | Kort |
|---|---|---|
| [ai-sok-aeo-audit.md](ai-sok-aeo-audit.md) | 2026-10-03 | Robots, crawlertilgang, server-rendret innhold; runde 1: faste og raske hyttesider, høyde-QA |
| [personvern-cookies-audit.md](personvern-cookies-audit.md) | 2026-10-03 | Cookies, lagring, tredjeparter og persondata. Ingen banner nødvendig |

### Eiendom og områdedata
| Fil | Dato | Kort |
|---|---|---|
| [eiendomshistorikk-feasibility.md](eiendomshistorikk-feasibility.md) | 2026-09-27 | Byggesakshistorikk per eiendom. Ren research |

### Eldre discovery- og analysedokumenter (ligger i `docs/`)
Disse er research i samme betydning, men ligger utenfor mappen fordi andre dokumenter lenker til
dem der.

| Fil | Dato | Kort |
|---|---|---|
| [../area-facts-discovery.md](../area-facts-discovery.md) | 2026-09-23 | «Hva bør du vite om området?»: kvikkleire, støy, radon m.m. |
| [../eiendom-discovery.md](../eiendom-discovery.md) | 2026-09-24 | Klikkbare eiendommer og bygg |
| [../naeromradet-discovery.md](../naeromradet-discovery.md) | 2026-09-24 | Institusjoner og virksomheter i nærområdet |
| [../lokale-saker-discovery.md](../lokale-saker-discovery.md) | 2026-09-25 | Støyklager og bydelssaker i Oslo |
| [../drift-scheduler.md](../drift-scheduler.md) | 2026-09-25 | Hvorfor GitHub ikke kjørte cron-en vår |

## Mal

```markdown
# <Tema>

> <Status: research only / bygget / delvis bygget>. Undersøkt YYYY-MM-DD.
> <Beslutning i én linje, med lenke til ADR hvis det finnes en.>

## Problemstilling og hvorfor
## Kilder og lisens/vilkår
## Metode og testutvalg
## Funn
## Negative funn
## QA
## Begrensninger
## Alternativer
## Beslutning
## Hva vi bevisst ikke gjorde
## Åpne spørsmål
## Hva som kan utløse ny vurdering
```

Ta med de seksjonene som passer. En kort fil med ærlige funn er bedre enn en full mal med tomme
overskrifter.
