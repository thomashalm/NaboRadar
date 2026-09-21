# ADR 001: Provider-arkitektur

**Status:** Akseptert · 2026-09-21

## Kontekst
NaboRadar skal hente fra flere offentlige kilder med ulike formater, tilgangsnivåer og lisenser. Bare én er brukbar i dag
(DiBK Planlegging igangsatt). Andre (NAP, Oslo byggesaker) skal kunne legges til uten omskriving.

## Beslutning
- Hver kilde er en `DataProvider` (`lib/providers/types.ts`) med `fetch()`, `normalize()` og `healthCheck()`.
- Providers er rene adaptere: de henter og normaliserer, men skriver aldri til databasen. Orkestreringen ligger i `lib/sync`.
- `normalize()` er en ren funksjon over en hel `RawBatch`, fordi DiBK krever gruppering av flere features.
- Kilder som ikke kan brukes, registreres likevel (`unsupported`/`disabled`) med begrunnelse, og gjør aldri nettverkskall.
- Status finnes både i kode (`defaultStatus`) og i DB (`providers.status`). Admin kan slå av uten deploy.

## Konsekvenser
- Normalisering kan enhetstestes med ekte fixtures uten nettverk eller DB.
- `/admin/providers` kan vise alle kilder, også de vi ikke har tilgang til, og hvorfor.
- Én ekstra indireksjon (`RawBatch`) sammenlignet med å la providers skrive direkte.
