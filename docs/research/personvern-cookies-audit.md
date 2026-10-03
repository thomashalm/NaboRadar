# Personvern, cookies og tredjeparter

> Gjennomgått 2026-10-03, før bunntekst og personvernside ble laget. Beslutningen står i
> [ADR 013](../adr/013-privacy-and-cookies.md). Teksten på `/personvern` bygger på funnene her.

## Problemstilling
Trenger NaboRadar et samtykkebanner for cookies? Hva må stå i en personvernerklæring, og hvilken
kontaktinformasjon må stå på siden, når tjenesten drives av en privatperson?

## Metode
- **Kode:** søk etter `cookies()`, `document.cookie`, `Set-Cookie`, `localStorage`,
  `sessionStorage`, `indexedDB`, analyseverktøy (gtag, GTM, Plausible, Hotjar, Sentry, PostHog,
  Meta-piksel, Umami) og eksterne verter i `app`, `lib`, `components`, `middleware.ts`,
  `package.json`, `next.config.ts` og `netlify.toml`.
- **Produksjon, HTTP:** svar-headere for `/`, `/omrade`, `/hytter`, en hytteside, `/admin` og de
  tre API-ene, hentet anonymt.
- **Produksjon, nettleser:** `document.cookie`, `localStorage`, `sessionStorage`, skript og iframes,
  og hvilke verter siden hentet ressurser fra (`performance.getEntriesByType('resource')`) på
  forsiden, `/omrade` og `/hytter`.
- **Database:** antall rader i tabeller som kunne holdt brukerdata.

## Funn

**Cookies og lagring**
- Ingen `Set-Cookie` for anonyme besøkende på noen side. `document.cookie` var tom.
- `localStorage` og `sessionStorage` brukes ikke.
- Eneste cookie i løsningen: Supabase-innloggingen (`sb-…-auth-token`), satt bare når en admin
  logger inn med e-post og passord, og fornyet bare på `/admin` (`middleware.ts`, matcher `/admin`).

**Tredjeparter**

| Tjeneste | Hva den får | Hvordan |
|---|---|---|
| Kartverket (`cache.kartverket.no`) | Brukerens IP og hvilket kartutsnitt som lastes | Nettleseren henter kartfliser direkte. Den eneste eksterne verten nettleseren kontakter |
| Kartverket/Geonorge (adresse, stedsnavn, eiendom, høyde, kommuneregister) | Søketekst eller koordinater, ikke brukerens IP | Via vår server |
| NVE, NGU, Miljødirektoratet, Statens vegvesen | Koordinatene til valgt punkt, ikke brukerens IP | Via vår server, for naturfare og støy på `/omrade` |
| Netlify | IP, tidspunkt og full URL i tekniske logger. På `/omrade` inneholder URL-en `lat`, `lng` og `label` (adressen) | Drift. Netlify er amerikansk og oppgir i sin personvernerklæring at de deltar i EU-U.S. Data Privacy Framework og bruker EUs standardkontrakter. Lagringstid for logger er ikke oppgitt |
| Supabase (`eu-west-1`, Irland) | Ingen besøksdata; bare spørringer fra vår server | Database |
| Resend | Bare driftsvarsler til admin | E-post |

- Ingen analyse, sporing, annonser, tredjepartsskript eller iframes.
- Skrifttypen (Geist via `next/font`) og MapLibre ligger på eget domene.

**Persondata**
- Vanlige brukere har ingen kontoer. Én admin-bruker.
- Søk, adresser og posisjoner lagres ikke i databasen. Tabellene `watched_areas` og `notifications`
  finnes fra prototypen, men hadde 0 rader og ingen UI som skriver til dem.
- Kortvarig cache: geokoding og eiendomsoppslag ti minutter i serverens minne; API-svar 1–5
  minutter i nettleseren.

## Vurdering
- **Samtykke (ekomloven § 3-15):** kreves bare for lagring i brukerens nettleser som ikke er strengt
  nødvendig. Det finnes ingen slik lagring. Admin-cookien er strengt nødvendig. Kartfliser er en
  nødvendig del av kartet brukeren ber om, ikke sporing. **Ikke behov for banner.**
- **Informasjonsplikt (ehandelsloven § 8):** gjelder tjenester som «vanligvis ytes mot vederlag».
  NaboRadar har ingen betaling, annonser eller inntekt. Det kreves derfor ingen adresse eller
  organisasjonsnummer slik tjenesten er nå.
- **Personvernforordningen:** unntaket for rent private aktiviteter gjelder ikke en offentlig
  tjeneste. Behandlingsansvarlig er driveren som privatperson. Artikkel 13 krever identitet og
  kontaktopplysninger; navn og en e-postadresse som leses, er nok.

## Negative funn og korrigeringer
- `kontakt@naboradar.no` kunne ikke ta imot e-post da gjennomgangen ble gjort (ingen MX). Senere
  samme dag hadde domenet MX hos Domeneshop.
- Første forslag til personverntekst nevnte bare Kartverket og Geonorge som mottakere av
  koordinater. Koden viste at NVE, NGU, Miljødirektoratet og Statens vegvesen også får dem fra
  `/omrade`. Teksten ble rettet før publisering.
- NaboRadar var ikke tilknyttet noe foretak og skulle ikke knyttes til et. Foretaksopplysninger ble
  derfor ikke brukt.

## Hva vi bevisst ikke gjorde
- Ingen samtykkebanner og ingen `/cookies`-side.
- Ingen bostedsadresse og ikke noe organisasjonsnummer.
- Navnet står ikke i bunnteksten, bare på `/personvern`.

## Hva som kan utløse ny vurdering
Se [ADR 013](../adr/013-privacy-and-cookies.md#revurderes-når). Kort sagt:

- analyse eller sporing,
- annonser eller inntekt,
- innbygd innhold fra andre,
- kontoer eller varsler for vanlige brukere,
- en ny tjeneste som får IP-adresser eller søk.
