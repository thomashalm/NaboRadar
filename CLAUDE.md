@AGENTS.md

# NaboRadar

Hovedreferansen for hvordan systemet faktisk fungerer er
**[docs/naboradar-handbook.md](docs/naboradar-handbook.md)**. Les den før du gjør endringer i
arkitektur, drift, database eller datakilder — og stol på koden framfor eldre dokumenter hvis de
er uenige.

## Vedlikehold av håndboken

Etter en endring, vurder om `docs/naboradar-handbook.md` må oppdateres. **Hvis endringen påvirker
arkitektur, drift, sikkerhet, datakilder, eksterne tjenester eller viktige produktbeslutninger,
skal håndboken oppdateres i samme commit.**

Det gjelder også database (RLS, grants, migrasjoner), scheduler, auth og admin, secrets, deploy og
kjente begrensninger.

Ikke oppdater håndboken for små copy-endringer, vanlig styling eller trivielle bugfikser uten
systempåvirkning.

## Research

All intern research følger **discovery først → verifisering etterpå → aktiv oppfølging av svake
leads**. Ikke start i et API og konkluder ut fra hva som mangler der — fravær i et register er
ikke fravær i virkeligheten. Metoden står i sin helhet i håndboken under
[Research-metoden](docs/naboradar-handbook.md#research-metoden), og gjelder alle kategorier.
