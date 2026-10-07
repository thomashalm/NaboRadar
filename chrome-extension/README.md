# NaboRadar for Finn — prototype

En liten Chrome-utvidelse (Manifest V3). Når du står på en boligannonse på Finn.no og trykker på
utvidelsen, leser den adressen fra siden du har åpen og tilbyr «Åpne denne boligen i NaboRadar».

Dette er en prototype for lokal testing. Den er ikke publisert i Chrome Web Store.

## Hva den gjør — og ikke gjør

- Den gjør ingenting før du trykker på ikonet. Det finnes ikke noe bakgrunnsskript og ikke noe
  innholdsskript som kjører av seg selv.
- Den leser bare fanen du har åpen, og bare hvis adressen er en annonse under
  `finn.no/realestate/`. Den henter ingen andre sider, følger ingen lenker og leser ikke historikk.
- Den gjør ingen nettverkskall selv og lagrer ingenting. Adressen forlater nettleseren først når
  du trykker på knappen — da åpnes `naboradar.no/omrade?adresse=…` i en ny fane.
- Den har ingen nøkler og snakker ikke med Supabase. All koden her tåler å være offentlig.

Tillatelser: `activeTab` og `scripting`. Ingen `host_permissions`, ingen `tabs`, ingen `storage`.
Chrome viser derfor ingen advarsel om «les og endre data på nettsteder» ved installasjon.

## Installere lokalt

```bash
npm run ext:build
```

1. Åpne `chrome://extensions` i Chrome.
2. Slå på **Developer mode** (oppe til høyre).
3. Trykk **Load unpacked** og velg mappen `chrome-extension/dist`.
4. Fest «NaboRadar for Finn (prototype)» til verktøylinjen (puslespillbrikken → tegnestiften).
5. Åpne en boligannonse på Finn.no og trykk på ikonet.

Etter en kodeendring: kjør `npm run ext:build` på nytt og trykk på oppdater-pilen på kortet i
`chrome://extensions`.

Mot lokal NaboRadar i stedet for produksjon:

```bash
NABORADAR_BASE_URL=http://localhost:3100 npm run ext:build
```

## Slik finner den adressen

`extractFinnAddress(document, url)` i `src/extractors/finn.ts` prøver kildene i denne rekkefølgen:

| # | Kilde (`source`) | Hva | Utgangspunkt |
|---|---|---|---|
| 1 | `json-ld` | `PostalAddress` i `<script type="application/ld+json">`. Meglerens og utgiverens adresse hoppes over. | høy |
| 2 | `semantic-attribute` | `data-testid` med «address», `itemprop="address"`, eller mikrodata i deler | høy |
| 3 | `address-element` | `<address>` | middels |
| 4 | `text-pattern` | en hel adresse som eget ledd i tittel, `og:title`, overskrift eller kartlenke | middels |
| 5 | `css-selector` | elementer med «address» i klasse eller id | lav |

Hvert trinn svarer bare når det finner nøyaktig én adresse. Finner det to ulike, går vi videre.
Sikkerheten senkes ett trinn når husnummeret mangler, og ett til når postnummer eller poststed
mangler. Er ingenting igjen, er svaret «Fant ikke adressen automatisk.» Utvidelsen gjetter aldri.

NaboRadar er neste sikring: `/omrade?adresse=` sender bare videre når adressen passer med
nøyaktig én adresse i Kartverkets register. Ellers får brukeren velge blant kandidatene.

## Dette er ikke verifisert mot Finn

Koden er skrevet uten å hente en eneste Finn-side. Finn forbyr automatisert bruk uten skriftlig
samtykke (se toppen av `finn.no/robots.txt` og brukervilkårene), og NaboRadar skraper ikke Finn.
Hvilke av de fem kildene Finn faktisk har, vet vi derfor ikke før utvidelsen er prøvd i en
nettleser av et menneske.

Popupen viser kilde og sikkerhet nettopp for den testen. Åpne ti ulike annonser — leilighet,
enebolig, rekkehus, nybygg/prosjekt, fritidsbolig, tomt, en uten husnummer, en borettslagsleilighet,
en med bokstav i husnummeret og en utenfor byene — og fyll ut:

| Annonsetype | Adresse funnet | Metode | Confidence | Riktig? |
|---|---|---|---|---|
| | | | | |

Ikke lagre annonseinnhold eller lenker i repoet. Typen annonse og utfallet er nok.

Svarer en type «Fant ikke», eller feil, er rettingen én linje i `finn.ts` (en ny velger eller et
nytt URL-mønster) og en ny fixture i `tests/chrome-extension/`.

## Kode

```
chrome-extension/
  manifest.json
  build.mjs              esbuild → dist/
  src/
    address.ts           typer, norsk adressetolkning, JSON-LD, dyplenke — kjenner ikke Finn
    extractors/finn.ts   Finn-adapteren: URL-mønster og fallback-kjeden
    content.ts           settes inn i fanen ved trykk; gir popupen ett funksjonskall
    popup.ts/.html/.css  den lille flaten
    chrome.d.ts          de fire Chrome-kallene vi bruker
```

Et nytt nettsted er en ny fil under `extractors/` med samme signatur. Det er ikke bygget noe
rammeverk for det.

Tester: `npx vitest run tests/chrome-extension`. Fixturene er skrevet for hånd, og testene henter
ingenting fra Finn.

## Før en eventuell publisering

Ikke gjort, og ikke vurdert juridisk. Punktene som må avklares av noen som kan det:

- **Finns vilkår.** Utvidelsen leser én side brukeren selv har åpnet, etter et trykk. Om det
  faller innenfor eller utenfor «automatiserte tjenester» i Finns vilkår er ikke avklart. Spør Finn.
- **Chrome Web Store.** Kravene om ett tydelig formål, færrest mulig tillatelser, personvernerklæring
  og «Limited Use» av brukerdata ser ut til å passe med hvordan denne er bygget, men policyen må
  leses på nytt ved innsending.
- **Varemerke.** Navn, ikon og beskrivelse må ikke se ut som noe Finn står bak.
