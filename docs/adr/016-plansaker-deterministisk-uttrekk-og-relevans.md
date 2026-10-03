# ADR 016: Plansaker får tiltakstype og formål fra deterministisk dokumentuttrekk, og sorteres etter en forklarbar regel

**Status:** Aktiv · 2026-10-03.

## Bakgrunn
«Planer og saker» viste «Planoppstart · 420 m». Det sier at en prosess finnes, ikke hva som kan endre
området. Kilden (DiBK «Planlegging igangsatt») har verken formål, størrelse eller status som felt.
Researchen ([planer-og-saker-v2.md](../research/planer-og-saker-v2.md)) viste at formålet står i
dokumenter vi ikke hentet: planinitiativet og varselet.

Målt på 74 ekte saker:
- Tittelen alene gir tiltakstype for 38 %.
- En formålssetning kan trekkes ut med faste mønstre i rundt to av tre saker.
- Tall i fri tekst (boliger, etasjer, areal) var feil i om lag hver tredje forekomst:
  parkeringsnormer, delfelt og naboområder.

## Alternativer vurdert
- **AI/LLM som leser dokumentene** — avvist. NaboRadar har ingen AI i produktet, og et sammendrag kan
  ikke etterprøves mot kilden ord for ord.
- **Vise tall automatisk** — avvist i denne runden. Feilraten er for høy uten kontroll.
- **Manuell godkjenning i admin** — utsatt. 50–110 nye saker i måneden er mulig å kontrollere, men
  det er et eget arbeid og ikke nødvendig for å vise formålet.
- **Tolke dokumentene når siden vises** — avvist. Det ville gjort sidevisningen avhengig av DiBKs
  nedlastingstjeneste og av en PDF-leser i runtime.
- **Lagre uttrekket i `events.attributes`** — avvist. Synken ville overskrevet det, og vår tolkning
  ville endret sakens `content_hash`.
- **Poengsum for relevans** — avvist. Et tall ser ut som en vurdering av prosjektet.

## Beslutning
- **Uttrekk under synk, ikke ved visning.** `npm run plans:enrich` kjører etter synken, laster ned
  planinitiativ, varsel og referat fra DiBK, leser tekstlaget og kaster teksten igjen. Bare
  resultatet lagres, i `event_enrichment`: tiltakstype, én formålssetning og en referanse til
  dokumentet.
- **Faste regler, ingen AI.** Tiltakstypen kommer fra en ordliste (`lib/plans/tiltakstype.ts`),
  formålet fra faste tekstmønstre (`lib/plans/formaal.ts`). Reglene har et versjonsnummer; endres de,
  leses alle saker på nytt.
- **Formålet er et sitat.** Det vises i anførselstegn med lenke til dokumentet. Finnes ingen ren
  setning, vises ingenting i stedet. Vi skriver aldri en erstatning.
- **Tall fra fri tekst vises ikke.** Mengder i sitatet erstattes med «[…]». Navn og referanser
  (gnr/bnr, husnummer, vegnummer) blir stående.
- **Heller «Planarbeid» enn feil type.** Peker signalene i flere retninger, er typen ukjent.
  En mindre endring av en gjeldende plan heter «Planendring», uansett hva planen gjelder.
- **Rekkefølgen er en regel, ikke en poengsum:**
  1. Søkepunktet ligger i planområdet, eller et nytt planarbeid har kant innen 300 m.
  2. Øvrige saker.
  3. Planendringer mer enn 500 m unna.

  Innenfor hver gruppe: avstand i trinn på 100 m, kjent tiltakstype før ukjent, større planområde
  før mindre, nyeste først. Ingen ord som vurderer prosjektet.
- **Status sies én gang:** «Vi vet ikke om planene senere er vedtatt, endret eller lagt bort.» Ordet
  «aktiv» brukes ikke.
- **Tom tilstand sier hva som er kontrollert:** «Ingen varslede planoppstarter fra private
  forslagsstillere innen 1 km siste 24 måneder.»

## Begrunnelse
Brukeren skal kunne åpne dokumentet og finne setningen vi viser. Det er samme tillitsgrunnlag som i
ADR 008: vi viser det kilden sier, og sier fra om det vi ikke vet. Et sitat med hull («[…]») er
mindre pent enn et sammendrag, men det kan ikke være feil på en måte brukeren ikke kan oppdage.

## Konsekvenser
- To nye dokumenttyper synkes fra samme kilde: `Planinitiativ` og `Planvarsel`.
- En ny avhengighet i synken: `unpdf` (leser tekstlag i PDF). Den brukes ikke av nettsiden.
- En sak som ikke er lest ennå, får tiltakstype fra tittelen ved visning, med samme ordliste.
- Feiler en nedlasting, lagres ikke saken som «uten formål». Den prøves igjen ved neste kjøring.

## Kjente ulemper
- Rundt en tredjedel av sakene har ikke et formål vi kan vise.
- Varselskjemaer med ødelagt tekstlag (tapte ligaturer) forkastes helt, selv om teksten er leselig for
  et menneske.
- Et sitat kan være korrekt gjengitt og likevel handle om noe annet enn hovedtiltaket.
- Ordlisten må vedlikeholdes. Den kjenner bokmål og nynorsk, ikke samisk.
- Dekningen er uendret: private forslagsstillere, fra mai 2024, og ingen status etter varselet.

## Revurderes når
- DiBK publiserer formål eller arealformål som strukturert felt, eller åpner planforslag og
  høring som tjeneste.
- Vi innfører kontroll av tall i admin.
- Treffraten for formål eller tiltakstype faller merkbart ved en kontrollmåling.

## Relatert
[research/planer-og-saker-v2.md](../research/planer-og-saker-v2.md) ·
[håndbok §14 Planer](../naboradar-handbook.md#planer) ·
[ADR 008](008-publish-what-the-agency-publishes.md) · [ADR 007](007-chaotic-sources-stable-core.md)
