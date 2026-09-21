# ADR 003: Sentral datasynkronisering

**Status:** Akseptert · 2026-09-21

## Kontekst
Å kalle DiBK for hvert brukersøk ville gjort oss avhengige av kildens oppetid og responstid (1–6 s), og ville belastet kilden.
Varsling krever uansett at vi vet hva som er nytt. Datasettet er lite: ca. 3 900 planområder nasjonalt.

## Beslutning
- All henting skjer sentralt i en server-jobb. Brukerspørringer går bare mot vår database.
- **Full sync** (initialt og nattlig): 8 sider features + ca. 7 sider tillatte dokumenter. Tar noen titalls sekunder.
  Events som ikke lenger finnes i kilden får `removed_from_source_at`, men slettes ikke.
- **Incremental** hver 2. time: CQL `oppdateringsdato > siste suksess − 1 dag`. Berørte planer hentes komplett (`?arealplan=`),
  slik at ingen polygoner blir borte i grupperingen.
- Endringer oppdages med `content_hash`. Hver kjøring logges i `sync_runs`.

## Begrunnelse for frekvens
- Planvarsler har typisk høringsfrister på uker. En forsinkelse på timer har ingen praktisk betydning for en nabo.
- Volumet er noen få nye varsler per dag nasjonalt, så incremental er billig. Hver 2. time gir god ferskhet uten unødig last.
- Full reconciliation hver natt fanger slettinger og endringer som ikke oppdaterer `oppdateringsdato`. Med 15 kall er det trivielt.
- Frekvensen er konfigurasjon, ikke kode, og kan justeres når vi ser faktisk endringsrate i `sync_runs`.

## Konsekvenser
- Produktet fungerer (med litt eldre data) selv om DiBK er nede. UI viser «sist oppdatert».
- Vi trenger en cron-mekanisme (Vercel Cron eller `pg_cron`) og en beskyttet route.
