# Discovery: «Hva bør du vite om området?» (fase A)

> **Status:** de fem anbefalte datalagene er implementert (se README → Områdefakta og docs/architecture.md).
> Resten av kildene under er fortsatt kartlagt, men ikke tatt i bruk.

Testet 2026-09-21 med ekte kall. **[T]** = testet, **[M]** = kun lest i Geonorge-metadata. Ingen produksjonskode er skrevet.

Hvordan data presenteres er like viktig som hvilke data vi har. Hver kilde har her en anbefalt, nøktern formulering, basert på hvordan kilden selv beskriver dataene.

## Oversikt

| Kategori | Kilde | API | Lisens | Dekning | Oppdatering | Stabilitet | Bruk i MVP |
|---|---|---|---|---|---|---|---|
| Støy veg, strategisk (Lden/Lnight) | Miljødirektoratet (EU-støydirektivet) | ArcGIS REST, punkt-i-polygon [T] | NLOD | Byområder + større veger | Kartlagt 2022 | ✅ | ✅ |
| Støysone veg T-1442 (gul/rød) | Statens vegvesen | WFS (GML), bbox [T]. Punktfilter i URL gir 403 | NLOD | Bare E/R/F-veg, prognose 2040 | Beregnet 2019 | ✅ | ✅ |
| Støysone bane T-1442 | Bane NOR | WFS (GML), bbox [T] | «No conditions» | Statlig jernbane | Beregnet 2016 (gammel) | ⚠️ | ⚠️ |
| Støy bane, strategisk | Miljødirektoratet | ArcGIS REST [T] | NLOD | Storby inkl. T-bane (Majorstuen: Lden 70) | 2022, proveniens uklar | ⚠️ | ⚠️ |
| Flystøy sivil | Avinor | WFS, bbox [T] (Gardermoen: rød sone) | «No conditions» | Lufthavner | 2022, halvårlig | ✅ | ✅ |
| Flystøy militær | Forsvarsbygg | WFS [T] (Rygge: rød sone) | NLOD | Forsvarets flyplasser | 2014–2022 | ✅ | ✅ |
| Kvikkleire, aktsomhet | NVE | ArcGIS REST [T] | NLOD | 727 kartblad (dekningslag) | Etter behov (2026-09) | ✅ | ✅ |
| Kvikkleire, kartlagte soner + klassifisering | NVE | ArcGIS REST [T] | NLOD | 4 888 soner / 135 områder | Kontinuerlig | ✅ | ✅ |
| Flomsoner (kartlagt faresone) | NVE | ArcGIS REST + WFS [T] | NLOD | 292 strekninger | Kontinuerlig | ✅ | ⚠️ (neste) |
| Flom, aktsomhet | NVE | ArcGIS REST [T] | NLOD | Nasjonal, 1:50 000 | Etter behov | ✅ | ⛔ (for grov i by) |
| Jord-/flomskred, steinsprang, snøskred – aktsomhet | NVE | ArcGIS REST [T] | NLOD | Nasjonal | Etter behov | ✅ | ⚠️ (neste) |
| Skredfaresoner (bratt terreng) | NVE | ArcGIS REST [T] | NLOD | Utvalgte områder | Kontinuerlig | ✅ | ⚠️ (skjul oppdragsgiver) |
| Skredhendelser | NVE | ArcGIS REST [T] | CC BY 3.0 | Nasjonal, historisk | Løpende | ⚠️ | ⛔ |
| Forurenset grunn | Miljødirektoratet | ArcGIS REST + nasjonal GeoJSON [T] | NLOD 2.0 | 15 940 lokaliteter | Kontinuerlig | ✅ | ✅ |
| Industri med utslippstillatelse (inkl. avfall, forbrenning, deponi) | Miljødirektoratet | ArcGIS REST [T] | NLOD | 1 433 (866 aktive) | Kontinuerlig | ✅ | ✅ |
| Avløpsrenseanlegg | Miljødirektoratet | ArcGIS REST [T] | NLOD | 2 963 | Årlig | ✅ | ⚠️ (lav relevans i by) |
| Gjenvinningsstasjoner | – | Ingen nasjonal kilde funnet | – | – | – | – | ⛔ |
| Transformatorstasjoner, luftledninger | NVE Nettanlegg | ArcGIS REST [T] | NLOD | Transmisjon, regional, høyspent distribusjon. **Ikke jordkabler** | Ikke fortløpende | ✅ | ✅ |
| Kraftverk (vann/vind/sol) | NVE | ArcGIS REST [T] | NLOD (sol: ukjent) | Nasjonal | Daglig (vann) | ✅ | ⚠️ (lite relevant i by) |
| Fjernvarme-konsesjon | NVE | ArcGIS REST [T] | Ikke dokumentert | – | – | ⚠️ | ⛔ |
| Radon, aktsomhet v2 | NGU/DSA | OGC API Features [T] | NLOD | Nasjonal, grov (Oslo sentrum = ett polygon) | Etter behov (v2 sep. 2026) | ✅ | ⚠️ (neste, med forbehold) |
| Radon WMS v1 | NGU | WMS [T] | NLOD | 2014-modell | Utdatert | ⛔ | ⛔ |
| Hovedvei / ÅDT | Statens vegvesen NVDB v4 | REST JSON [T], krever `X-Client` | NLOD | Nasjonal | Årlig (ÅDT 2025) | ✅ | ⚠️ (neste) |
| Veg under bygging | NVDB (fase A) | REST [T] | NLOD | Ingen prosjektinfo | Løpende | ⚠️ | ⛔ |
| Vegarbeid (DATEX II) | Statens vegvesen | 401, krever registrering | – | Sanntid | – | – | ⛔ |
| Jernbane (spor, stasjoner) | Bane NOR Banenettverk | WFS GML [T] | NLOD | Statlig jernbane. **Ikke T-bane/trikk** | Årlig | ✅ | ⚠️ |
| T-bane/trikk-spor | FKB-Bane | Norge digitalt **begrenset** | – | – | – | – | ⛔ |
| Industri-/lagerbygg | Matrikkelen Bygningspunkt | WFS GML [T] | CC BY 4.0 | Nasjonal, punkt | Kontinuerlig | ✅ | ⚠️ (bygningstype henger etter) |
| Industriområde (flate) | N50 Kartdata | Nedlasting [T] | CC BY 4.0 | Nasjonal, grov | Ukentlig | ✅ | ⚠️ |
| Arealformål i reguleringsplaner | DiBK NAP / Oslo PBE | Norge digitalt begrenset / udokumentert | – | – | – | – | ⛔ |
| Datasentre | Nkom / NVE / Brreg | Ingen kilde med lokasjon og dekning | – | – | – | – | ⛔ |
| Skoler | Udir NSR | REST [T] | NLOD | Nasjonal | Løpende | ✅ | ⚠️ (neste) |
| Barnehager | Udir NBR | REST [T] | NLOD | Nasjonal | Løpende | ✅ | ⚠️ (neste; uten familiebarnehager) |
| Brannstasjoner | DSB | WFS [T] | NLOD | Nasjonal | Etter behov (2016-skjema) | ✅ | ⚠️ |
| Sykehjem/helse | Ingen register; Matrikkel 719/731 | – | – | – | – | – | ⛔ (sensitivt) |

## Anbefalte første datalag (MVP)

| # | Datalag | Hvorfor | Innsats* | Synk |
|---|---|---|---|---|
| 1 | **Støy** (strategisk Lden veg + T-1442 gul/rød veg + flystøy Avinor/Forsvarsbygg) | Høy interesse for boligkjøpere, «ligger adressen innenfor?» kan besvares presist, åpen lisens | 2–3 d | Ja: WFS via bbox / nedlasting, ArcGIS per region |
| 2 | **Kvikkleire** (aktsomhet + kartlagte soner med faregrad/konsekvens/risiko) | Høy relevans, god kildekvalitet, klare klasser fra kilden selv | 1,5 d | Ja: soner (4 888). Aktsomhet (148 k) synk eller direkte |
| 3 | **Forurenset grunn** | Høy interesse, nasjonal og ferske data. Må vises som fordeling, ikke rå opptelling | 1,5 d | Ja: nasjonal GeoJSON 13,7 MB |
| 4 | **Høyspent og transformatorstasjoner** | Ofte etterspurt, lett å forklare, rask kilde | 1 d | Ja (eller direkte) |
| 5 | **Industri- og avfallsanlegg med utslippstillatelse** | Dekker industri/fabrikk/avfall/forbrenning med offisiell kilde | 0,5–1 d | Ja (1 433 punkter) |

\* Arbeidsdager per lag etter felles fundament (se under). **Felles fundament** (tabell, spørring, sync-generalisering, formuleringsregister, UI-seksjon): 2–3 d.

**Neste bølge:** flomsoner (kartlagte), skredaktsomhet, radon v2 (direkte oppslag), ÅDT/hovedvei (NVDB), skoler og barnehager.

## Eksempel: Majorstuen (59.92992, 10.71488), faktiske data 2026-09-21

| Gruppe | Fakta (fra kilde) | Kilde |
|---|---|---|
| Trafikk og støy | Adressen ligger i beregnet veitrafikkstøy **Lden 55–59 dB** (strategisk støykartlegging 2022) | Miljødirektoratet [T] |
| | Adressen ligger i beregnet banestøy **Lden 70 dB / Lnight 65 dB** (storby, trolig T-bane) | Miljødirektoratet [T] |
| | Bogstadveien/Sørkedalsveien 74 m (ÅDT 11 000–17 300), Kirkeveien 119 m (ÅDT 12 000–12 500), 2025 | NVDB [T] |
| Infrastruktur | Transformatorstasjon **Majorstua** (Elvia, 132 kV), 331 m. Ingen registrerte luftledninger innen 1 km (jordkabler inngår ikke) | NVE [T] |
| Grunnforhold | Kartlagt kvikkleiresone **«Majorstuen 1»** innen 1 km: faregrad middels, risikoklasse 3, kvikkleire påvist, sikringstiltak utført (vurdert 2023) | NVE [T] |
| | Ikke innenfor aktsomhetsområde for kvikkleireskred | NVE [T] |
| Miljø | 118 registrerte lokaliteter med forurenset grunn innen 1 km. Påvirkningsgrad: 89 «akseptabel med dagens arealbruk», 12 «lite forurenset», 11 «ikke akseptabel – behov for tiltak», 6 uavklart. Nærmeste: 46 m | Miljødirektoratet [T] |
| | Nærmeste aktive anlegg med utslippstillatelse: Hoff Varmesentral, ca. 2 km | Miljødirektoratet [T] |
| Radon (grov) | Området er modellert som «meget høy aktsomhet» for radon. Hele Oslo sentrum er ett polygon, og kartet kan ikke forutsi radon i enkeltbygninger | NGU/DSA [T] |
| Flom | Innenfor NVEs aktsomhetsområde for flom (grovt 1:50 000-kart). Ingen kartlagt flomsone innen 1 km | NVE [T] |

Eksempelet viser hvorfor presentasjonen må styres. Alle fire Oslo-testpunktene ligger i flom-aktsomhet og «meget høy» radon-aktsomhet, så slike lag gir lite informasjon i by uten tydelig kontekst.

## Kvikkleire: tre nivåer som ikke skal blandes

| Nivå | Datasett | Hva det er (kildens egne ord) | Riktig formulering | Feil formulering |
|---|---|---|---|---|
| **Aktsomhetsområde** | `KvikkleireskredAktsomhet` (NVE, 2024, 148 235 polygoner, 1:50 000) | Mulig marin leire i terreng som kan være utsatt. Ved tiltak innenfor «må tiltakshaveren fortsette med prosedyren … geoteknisk kompetanse» | «Innenfor NVEs aktsomhetsområde for kvikkleireskred. Det betyr ikke at kvikkleire er påvist; ved byggetiltak krever NVE geoteknisk vurdering.» | «Kvikkleirefare på eiendommen» |
| **Kartlagt kvikkleiresone** | `SkredKvikkleire2` lag 0/1 (4 888 soner, løsne- og utløpsområder) | «Soner med **potensiell** fare (aktsomhetsområder) for større kvikkleireskred», ment for vurdering på «kommuneplannivå». Feltet `kvikkleirestabilitetvurdering` viser om kvikkleire er påvist | «Innenfor kartlagt kvikkleiresone «X» (løsneområde). Kvikkleire er [påvist / vurdert som mulig] (undersøkelse: [enkel/supplerende], [år]).» | «Kvikkleire under huset» |
| **Risikoklassifisering** | Samme soner: `faregrad` (lav/middels/høy) × `konsekvens` (mindre alvorlig → meget alvorlig) → `risiko` (klasse 0–5) | Faregrad fra topografi, geoteknikk og hydrologi. Konsekvens fra hva et skred i sonen kan ramme av bebyggelse og infrastruktur | «NVEs klassifisering av sonen: faregrad høy · konsekvens meget alvorlig · risikoklasse 4 av 5. Klassifiseringen gjelder hele sonen, ikke den enkelte eiendom.» | «Høy risiko for boligen din» |

**Funn som styrer presentasjonen** (alle 4 888 soner analysert):
- **44 % (2 165) har bare «Mulig kvikkleire».** Det gjelder også 215 soner med faregrad «Høy». Kvikkleire er påvist i 2 091.
- **632 soner har faregrad «Ingen» / «Ikke fare for områdeskred»** (utredet og friskmeldt). De skal ikke vises som fare. Ligger adressen i en slik sone, kan det vises nøytralt: «Utredet: ikke fare for områdeskred (år).»
- **184 soner har «Sikringstiltak utført».** Dette skal vises.
- **Vurderingene er av ulik alder:** ca. 1 300 er fra 2001–2007, resten stort sett fra 2018–2025. Vis alltid år og undersøkelsesnivå.
- **Dekning:** aktsomhetskartet er laget for 727 kartblad (509 med funn, 218 uten funn). Utenfor dekningen kan vi ikke skrive «ikke i aktsomhetsområde», bare «ikke kartlagt».
- **Eksempel Alnabru:** punktet ligger i «Alfaset vest», med faregrad høy, konsekvens meget alvorlig og risikoklasse 4, men status «**Mulig kvikkleire**» etter en enkel undersøkelse (2011).
- **Personvern:** 28 fritekstbemerkninger nevner gnr./bnr. eller adresser, så feltet `bemerkning` vises ikke. `rapporturl` peker til NVEs rapportsider per kommune, men mangler `https://`. Om vi skal normalisere lenken er en egen beslutning.

## Juridiske og personvernmessige funn

1. **Sårbare personer.** Følgende kilder inneholder sensitive kategorier og krever allowlist, aldri denylist:
   - Enhetsregisteret: NACE 87 og 88, blant annet barnevernsinstitusjoner.
   - Matrikkelen: bygningstype 15x (bofellesskap) og 72x/723.
   - NSR: spesialskoler og skoler ved institusjoner.
   - NBR: familiebarnehager i private hjem, der koordinaten peker på et privat hjem.

   Vi viser bare eksplisitt godkjente typer.
2. **Kraftsensitiv informasjon** (energiloven § 9-3, kraftberedskapsforskriften § 6-2):
   - NVEs publiserte luftledninger og stasjoner er åpne.
   - Jordkabler og detaljerte nett skal ikke publiseres.
   - Vi viser bare NVEs data, og kombinerer ikke kilder for å kartlegge traseer.
3. **Adresser koblet til forurensning.** `lokalitet_navn` er et stedsnavn eller en adresse («Majorstuen skole», «Gladengveien 10»); 8,2 % av navnene er en ren gateadresse. Navnet vises likevel, fordi forvaltningsmyndigheten publiserer det åpent sammen med flaten det gjelder, og fordi flaten vi lagrer er mer presis enn navnet. Uten navnet kan brukeren ikke se hvilket sted registreringen gjelder. `virksomhet_navn` og `naeringsgruppe` lagres ikke — de sier hvem som har drevet der, ikke hvor registreringen ligger. Se «Forurenset grunn: hva kilden faktisk gir» under.
4. **Enkeltpersoner i fagdata.** Skredfaresoner har `oppdragsgiver = Privatperson` på små områder, og kvikkleire-bemerkninger nevner gnr./bnr. Disse feltene vises ikke.
5. **Lisenser:**
   - Alle MVP-lag er NLOD eller CC BY 4.0, så kommersiell bruk er tillatt med kildehenvisning.
   - Kilder med «Norge digitalt begrenset» (FKB, NAP-reguleringsplaner, SSB arealbruk-datasett) brukes ikke.
   - Skredhendelser er CC BY 3.0.
   - NVEs datasenter- og fjernvarmelag har ingen dokumentert lisens og brukes ikke.
6. **Bruksbegrensninger fra kildene som skal gjengis:**
   - Vegvesenets støyvarselkart: «skal ikke brukes til detaljvurdering av enkeltboliger».
   - Radon: «kan ikke benyttes til å forutsi radonkonsentrasjonen i enkeltbygninger».
   - Kvikkleire: vurdering på kommuneplannivå.
7. **Ansvar og ordbruk.** Ingen samlet score og ingen vurdering. Hver påstand skal ha kilde og år. Bruk kildens egne klasser, og aldri «fare» der kilden sier «aktsomhet».

## Forurenset grunn: hva kilden faktisk gir

Undersøkt 2026-09-23 mot `grunnforurensning/MapServer` lag 1 (flate), 15 941 lokaliteter.

| Felt | Utfylt | Brukt til |
|---|---|---|
| `lokalitet_navn` | 98,6 % | Kortets overskrift |
| `arealbruk` | 100 % (34 % `uavklart`) | «Arealbruk: boligbebyggelse» |
| `paavirkningsgrad` | 100 % | Myndighetens vurdering i klartekst |
| `prosess_status` | 98,6 % | Hvor langt saken er kommet |
| `lokalitet_type` | 98,6 % | Hva slags sted (deponi, skytebane, skipsverft …) |
| `areal_totalt`, `datafangstdato`, `oppdateringsdato` | ~99 % | Areal og årstall |
| `faktaark` | ~100 % | Offentlig lenke per lokalitet |
| `tilstandsklasse` | 26,1 % | Høyeste målte tilstandsklasse |
| `virksomhet_navn`, `naeringsgruppe` | 34 % / 44 % | **Brukes ikke** |

**Det finnes ikke noe felt for stoffer, og ikke noe felt for årsak til registrering.** Stofflister finnes i
Miljødirektoratets database og vises i faktaark-applikasjonen (Boliden Odda har «Påvist forurensning» for arsen, bly,
kadmium, PAH-16 og PCB7), men de ligger bak et udokumentert internt API som vi ikke bruker (ADR 004). Verken ArcGIS-
tjenesten, WMS-en eller Geonorge-distribusjonen eksponerer dem. For mange lokaliteter finnes de heller ikke: faktaarket
for Majorstuen skole sier selv «Forurensning: Ikke registrert». UI-et sier derfor eksplisitt at kilden ikke oppgir
forurensningstype, og gjetter aldri.

**Geometrikvalitet er god.** Flatene er reelle områdeomriss, ikke buffere: Majorstuen skole har 7 hjørner og beregnet
areal 3 278 m² mot oppgitt 3 298 m². Vi henter med `geometryPrecision: 6` og forenkler ikke ved lagring.

**Etiketter** for påvirkningsgrad er hentet ordrett fra tjenestens tegnforklaring, og arealbruk-etikettene fra
Miljødirektoratets eget faktaark (`bebyggelseBolig` → «Boligbebyggelse», `INFOmråde` → «Landbruk-, natur- og
friluftslivområde»).

## Tekniske funn som påvirker implementasjonen

- **Geonorge WFS:** punkt-i-polygon med `FILTER` i URL-en gir **403** (testet med curl og Python, uavhengig av User-Agent). Bbox-`GetFeature` gir 200. POST med filter i XML-body blir akseptert av serveren (validert). Enklest er synk via bbox eller nedlasting, og deretter punkt-i-polygon i egen PostGIS.
- **Miljødirektoratets strategiske støykart:** Oslo ligger i storbylagene (5/6), ikke i lag 7/8. Adressepunkter kan havne i hull i polygonet (bygningsflater). Vurder buffer på 10–30 m, og vis «ikke kartlagt / utenfor» forsiktig.
- **NVE:** tjenestenavn har versjonsnummer (`Nettanlegg4`, `Flomsoner2`, `SkredKvikkleire2`). Legg dem i konfigurasjon.
- **NVDB:** krever header `X-Client` og har rate limit. Ha retry, fordi det forekom én «connection reset».
- **Radon:** bruk OGC API v2 med `skipGeometry=true`. WMS-en gir fortsatt 2014-data.

## Passform med dagens arkitektur

Plansaker er **hendelser** med dato, mens områdefakta er **tilstander** uten dato. Derfor foreslås en egen tabell, men samme mønster:

- **Ny tabell** `area_features`:
  - Felter: `provider_id`, `external_id`, `category`, `subtype`, `title`, `geom geometry(Geometry,4326)`, `attributes jsonb` (kildens klasser: faregrad, støykategori, påvirkningsgrad …), `source_url`, `source_updated_at`, `synced_at`, `removed_from_source_at` og `content_hash`.
  - Unik nøkkel: `(provider_id, external_id)`.
  - Samme GiST-indeks på `geom::geography`.
- **Spørring** `features_near(lat, lng, radius_m, categories[])`. Den returnerer `distance_m` (0 = innenfor) og `contains boolean`, slik at både «ligger innenfor» og «X m unna» kommer fra samme kall.
- **Providers:**
  - `DataProvider` generaliseres til `DataProvider<TRecord>`. Alternativt lages en søskentype `FeatureProvider` med samme `fetch` → `normalize` → sync-lag.
  - `runSync`, hash, reconciliation, `sync_runs` og `/dev` gjenbrukes.
  - Én provider per kilde, for eksempel `nve-kvikkleire-soner`, `nve-kvikkleire-aktsomhet`, `mdir-forurenset-grunn`, `mdir-stoy-strategisk`, `svv-stoysone-veg`, `avinor-stoysone` og `nve-nettanlegg`.
- **Direkteoppslag** (uten synk): radon og NVDB ÅDT. Legg dem bak en egen `LookupProvider` med cache, og ikke i `area_features`.
- **Formuleringsregister** (`lib/facts/wording.ts`): én godkjent setning og ett forbehold per subtype og klasse, med kildenavn og år. UI-et viser aldri rå feltverdier direkte.
- **Kart:** nye `MapLayer`-er per kategori, uten endring i `AreaMap`.

## Synk eller direkte spørring

| Kilde | Anbefaling | Begrunnelse |
|---|---|---|
| Forurenset grunn | Synk (nasjonal GeoJSON, ukentlig) | 16 k polygoner, 3–8 s per direkte spørring i Oslo |
| Kvikkleire, soner | Synk (ukentlig) | 4 888 soner, raskt |
| Kvikkleire, aktsomhet | Synk (månedlig) eller direkte (0,2–0,4 s) | 148 k polygoner |
| Støysoner T-1442 (veg/bane/fly) | Synk (månedlig) | WFS-punktfilter er blokkert (403). Bbox eller nedlasting fungerer |
| Strategisk støy | Synk (nedlasting 36–72 MB) eller direkte (ArcGIS, 0,1–1,8 s) | Stabilt 2022-produkt |
| Nettanlegg | Synk (månedlig) | Ikke fortløpende oppdatert |
| Industri med tillatelse | Synk (ukentlig) | 1 433 punkter |
| Flomsoner / skred-aktsomhet | Synk | Store, men sjelden endret |
| Radon v2 | Direkte + cache | Ett grovt polygon per område, 0,2–0,6 s |
| NVDB ÅDT | Direkte + cache | 0,6–2 s, årlig data |
| Skoler / barnehager | Synk (endringsendepunkt) | Ett kall per enhet for koordinat |

Rådata og skript fra discovery ligger lokalt (ikke i repoet) i sesjonens scratchpad (`discovery-a…d`, `kvikkleire`, `verify`).
