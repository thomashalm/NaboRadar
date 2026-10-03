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
| [omrade-produktreview.md](omrade-produktreview.md) | 2026-10-03 | Produktreview av `/omrade` på 11 adresser: riktig i delene, men ordnet etter data, ikke etter hva en boligkjøper må vite. Forslag til ny rekkefølge, terskler og hva som mangler. Ikke implementert |
| [tilfluktsrom-naermeste-rom.md](tilfluktsrom-naermeste-rom.md) | 2026-10-03 | Langmyrgrenda 26C viste ingen tilfluktsrom: dataene var identiske med Sivilforsvarets (556/556), nærmeste rom lå 3,3 km unna og seksjonen falt bort. Bygget: nærmeste rom i verktøyet, deep-link `#tilfluktsrom` og `#skolekrets` |
| [planer-og-saker-v2.md](planer-og-saker-v2.md) | 2026-10-03 | Planer og saker: kilder, livssyklus og test av 74 saker. Trinn 1 bygget samme dag ([ADR 016](../adr/016-plansaker-deterministisk-uttrekk-og-relevans.md)): formål i 60 %, tiltakstype i 56 % av 1 563 saker |
| [dibk-henvendelse-utkast.md](dibk-henvendelse-utkast.md) | 2026-10-03 | Utkast til e-post til DiBK om Nasjonal planbase, høringstjenester og Oslo-dekning. Ikke sendt |
| [stormflo-flystoy-kildegjennomgang.md](stormflo-flystoy-kildegjennomgang.md) | 2026-10-03 | WFS-ene for stormflo og flystøy nede (Geonorge-bakmaskiner); etatenes publikumskart, semantikk og QA mot dem. Byttet til WMS samme dag ([ADR 015](../adr/015-publikumsprodukt-wms-og-kildefeil.md)) |
| [eiendomshistorikk-feasibility.md](eiendomshistorikk-feasibility.md) | 2026-09-27 | Byggesakshistorikk per eiendom. Ren research |
| [eiendomskort.md](eiendomskort.md) | 2026-10-03 | Eiendomskort: åpne felt, juss for byggeår/BRA/salg, QA av 49 adresser, DB-måling av nasjonal adresse → bygning (46–1 306 MB). **Kortet er ikke bygget, avventer.** Samme dag rettet: bygningstyper fra SSB KLASS 31 og eiendomskartet flyttet fra WFS til Eiendom-API + WMS |
| [fiskevann-fiskearter.md](fiskevann-fiskearter.md) | 2026-10-03 | **Ikke prioritert / ikke bygg nå.** Innsjøer nasjonalt fra NVE; arter bare med datert prøvefiske/kartlegging (~870 innsjøer); ingen åpen fiskekortkilde |
| [multehabitat.md](multehabitat.md) | 2026-10-03 | **Ikke prioritert / ikke bygg nå.** ANO gir ekte fravær; åpne myrkart fanger ~30 % av forekomstene med ~50 % presisjon; observasjoner følger bebyggelse |

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
