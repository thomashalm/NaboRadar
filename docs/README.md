# Dokumentasjon

Hvor du finner hva i NaboRadar-dokumentasjonen. Stol på koden og migrasjonene hvis et dokument er
uenig med dem, og rett dokumentet.

| Dokument | Svarer på | Når det oppdateres |
|---|---|---|
| [naboradar-handbook.md](naboradar-handbook.md) | **Hvordan fungerer NaboRadar nå?** Arkitektur, database og sikkerhet, datakilder og sync, `/omrade`, `/hytter`, søk, kart, SEO og crawlere, caching, personvern, drift, runbook, begrensninger | Når løsningen endres. Det som ikke lenger er sant, rettes |
| [adr/](adr/README.md) | **Hva bestemte vi, og hvorfor?** Alternativer, konsekvenser, ulemper og hva som skal utløse en ny vurdering | Ved viktige arkitektur-, produkt-, data-, sikkerhets- og SEO/AEO-beslutninger. Erstattes, skrives ikke om |
| [research/](research/README.md) | **Hva undersøkte vi, og hva fant vi?** Kilder, metode, testutvalg, funn, negative funn | Én fil per undersøkelse. Historikk: legg til merknader, ikke skriv om |
| [data-roadmap.md](data-roadmap.md) | Hvilke dataområder vi bygger, i hvilken rekkefølge, og hva som er lagt bort | Når prioriteringen endres |
| [data-architecture.md](data-architecture.md) | Hvordan datamodellen skal tåle nasjonale datasett: kanonisk vs. bulk vs. direkte oppslag | Ved endringer i modell eller sync |
| [data-sources.md](data-sources.md) | Hver ekstern kilde vi har testet: tilgang, lisens, eksempelrespons | Når en kilde testes på nytt eller tas i bruk |
| [architecture.md](architecture.md) | Datamodell, provider-arkitektur, geo-strategi og sync i detalj | Ved endringer i disse |

Eldre discovery-dokumenter (`area-facts-discovery.md`, `eiendom-discovery.md`,
`naeromradet-discovery.md`, `lokale-saker-discovery.md`, `drift-scheduler.md`) er research og står i
[research-indeksen](research/README.md#eldre-discovery--og-analysedokumenter-ligger-i-docs).

## Dokumentasjonsregelen

Research- og arkitekturrunder dokumenteres **i samme commit** som endringen. Det gjelder:

- ny ekstern datakilde eller lisensvurdering,
- research som påvirker produktet, også beslutningen om å **ikke** bygge noe,
- ny heuristikk eller terskel, viktig QA-funn eller datakvalitetsregel,
- endringer i arkitektur, sikkerhet, offentlig/privat lesing eller caching,
- SEO/AEO, robots/crawlere, personvern/cookies,
- viktige produktvalg med reelle avveininger.

For hver slik endring vurderes tre ting: må **håndboka** rettes, trengs en **researchfil**, og
trengs en **ADR**? Ikke for spacing, tekststørrelse, små copy-endringer eller vanlige bugfikser.
Detaljene står i [håndbok §38](naboradar-handbook.md#38-dokumentasjon).
