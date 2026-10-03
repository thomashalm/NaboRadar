# ADR 013: Personvern og cookies — privat prosjekt, ingen samtykkebanner med dagens løsning

**Status:** Aktiv · 2026-10-03

## Bakgrunn
Før mer produktutvikling skulle bunntekst, kontaktinformasjon, personvern og cookies ryddes. En
gjennomgang av kode og produksjon ([research/personvern-cookies-audit.md](../research/personvern-cookies-audit.md))
viste:

- Vanlige besøkende får **ingen** cookies.
- `localStorage` og `sessionStorage` brukes ikke.
- Det finnes ingen analyse- eller sporingsverktøy, ingen tredjepartsskript og ingen iframes.
- Den eneste cookien er Supabase-innloggingen på `/admin`.

NaboRadar drives av Thomas Halmø som privatperson. Det er ikke et produkt fra noe foretak, og
skal ikke knyttes til et.

## Alternativer vurdert
- **Cookie-banner «for sikkerhets skyld»** — avvist. Ekomloven § 3-15 krever samtykke for lagring
  som ikke er strengt nødvendig. Det finnes ingen slik lagring, og et banner ville gitt et falskt
  inntrykk.
- **Egen `/cookies`-side** — avvist. Det er én nødvendig cookie, og den står på personvernsiden.
- **Foretaksnavn, organisasjonsnummer og adresse i bunnteksten** — ikke aktuelt. Det finnes ikke
  noe foretak. Ehandelsloven § 8 gjelder tjenester som «vanligvis ytes mot vederlag», og NaboRadar
  har ingen betaling, annonser eller inntekt.
- **Navnet i bunnteksten** — avvist etter ønske fra eieren. Navnet står på personvernsiden, der
  behandlingsansvarlig skal stå.

## Beslutning
- **Ingen samtykkebanner og ingen `/cookies`-side.**
- **Bunnteksten** (`components/SiteFooter.tsx`, i rot-layouten) inneholder: NaboRadar ·
  kontakt@naboradar.no · Personvern, og «Stedsdata og kart © Kartverket». Den vises på offentlige
  sider, ikke på `/admin` eller `/dev` (`footerVises` i `lib/site.ts`).
- **`/personvern`** beskriver bare det som faktisk skjer:
  - behandlingsansvarlig (Thomas Halmø, privatperson) og kontakt,
  - ingen konto og ingen sporing,
  - at søk sendes via serveren til Kartverket, Geonorge, NVE, NGU, Miljødirektoratet og Statens
    vegvesen,
  - at kartfliser hentes direkte fra Kartverket,
  - Netlifys tekniske logger (med EU-U.S. Data Privacy Framework som overføringsgrunnlag),
  - Supabase i Irland, den ene admin-cookien, og rettigheter med klage til Datatilsynet.
- Ingen organisasjonsnummer og ingen privat bostedsadresse noe sted.

## Begrunnelse
Personvernteksten skal være sann, ikke en mal. Den sier at leverandørlogger finnes, i stedet for å
påstå at ingenting lagres.

## Konsekvenser
- `tests/site/personvern.test.ts` feiler hvis bunnteksten eller personvernsiden nevner et foretak
  eller organisasjonsnummer, eller om navnet havner i bunnteksten.
- Teksten må endres i samme commit som en endring som påvirker den: nye tjenester som får
  brukerdata, nye oppslag, analyse, kontoer.

## Kjente ulemper
- `kontakt@naboradar.no` krever e-postmottak på domenet. Domenet hadde ingen MX-oppføring da
  bunnteksten ble laget, men har det nå (`mx.domeneshop.no`, sett 2026-10-03). At adressen faktisk
  leveres og leses, er ikke testet fra repoet.
- Netlify oppgir ingen lagringstid for tekniske logger. Teksten sier at Netlify styrer den.

## Revurderes når
- Det legges til analyse, sporing, annonser, innbygd innhold fra andre, eller kontoer og varsler for
  vanlige brukere. Da må samtykke vurderes på nytt.
- Tjenesten får inntekt, eller drives av et foretak. Da gjelder ehandelslovens informasjonsplikt.
- Nye eksterne tjenester får brukerdata eller IP-adresser.

## Relatert
[research/personvern-cookies-audit.md](../research/personvern-cookies-audit.md) ·
[håndbok §24 Personvern](../naboradar-handbook.md#24-personvern) · `app/personvern/page.tsx`
