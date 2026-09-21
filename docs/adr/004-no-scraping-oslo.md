# ADR 004: Ingen scraping eller reverse engineering av Oslo byggesaker

**Status:** Akseptert · 2026-09-21

## Kontekst
Oslo kommunes Saksinnsyn og Planinnsyn har verdifull informasjon om byggesaker. Vi har ikke funnet et dokumentert, offentlig API
(søk i data.norge.no gav ingen treff). Nettsidene bruker interne endepunkter som teknisk sett kan kalles.

## Beslutning
- Vi skraper ikke og reverse-engineerer ikke interne endepunkter, heller ikke eksperimentelt i produksjon.
- `oslo-building-case` er registrert med status `disabled` og begrunnelse, og gjør ingen nettverkskall.
- Produktet skal fungere fullt ut uten denne kilden.
- Saksinnsyn-lenker som kommunen selv har lagt inn i DiBK-feltet `link`, vises som kildelenke. Det er kommunens egne publiserte data.

## Begrunnelse
Udokumenterte endepunkter kan endres uten varsel, kan bryte bruksvilkår, og kan eksponere personopplysninger (byggesaker
inneholder navn på tiltakshavere og naboer). En kritisk avhengighet til dem ville gjort produktet ustabilt og juridisk usikkert.

## Revurderes når
Oslo kommune publiserer et dokumentert API eller åpent datasett, eller vi inngår en avtale om tilgang.
