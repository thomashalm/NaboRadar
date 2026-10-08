# Strategisk støykartlegging: cache eller full import

**Type:** research og måling, deretter bygget (alternativ A). **Dato:** 2026-10-08.
**Beslutning:** langlivet cache per søkepunkt. Full lokal import er ikke nødvendig nå.
Hvordan cachen virker står i [håndboka](../naboradar-handbook.md#støycachen).

## Hvorfor

Miljødirektoratets karttjeneste (`kart3.miljodirektoratet.no`) var 2026-10-08 treg og ustabil.
Samme oppslag som NaboRadar gjør for Kirkeveien 60, fire ganger: ingen respons innen 25 s, svar
etter 21,4 s, og to ganger ingen respons. Tjenestekatalogen svarte vekselvis med 500 og etter
6–12 s. NaboRadar gir opp etter 6 s per kall, så støy falt bort fra siden.

## Kilden

- **Datasett:** «Støykart – strategisk støykartlegging (Støydirektivet)», Miljødirektoratet.
  Data fra Vegdirektoratet, Oslo kommune, Bane NOR og Avinor.
- **Kartleggingsrunder — ulike for vei og bane:**
  - vei: karttjenesten oppgir «støysituasjonen slik den var i 2022»,
  - bane: «slik den var i 2017». Datasettbeskrivelsen sier «Jernbanelinjer … [Data mangler for 2022]».
  NaboRadar omtalte hele kilden som «kartlagt 2022». Det er rettet.
- **Dekning:** veier med minst 3 mill. passeringer i året, jernbane med minst 30 000 tog, og seks
  byområder: Oslo med nabokommuner, Bergen, Stavanger, Trondheim, Fredrikstad/Sarpsborg og Drammen.
- **Syklus:** hvert femte år etter EUs støydirektiv (2007, 2012, 2017, 2022). Datasettet
  oppdateres ikke underveis, men genereres på nytt per runde. Neste runde er ventelig 2027.

## Lisens

Norsk lisens for offentlige data (NLOD) 1.0, «Åpne data», ingen tilgangsbegrensninger — oppgitt
både i Geonorges metadata og på Miljødirektoratets katalogside. NLOD tillater kopiering, lagring
og viderebruk med kildehenvisning. Lisensteksten er ikke lest på nytt i denne runden, og dette
er ikke en juridisk vurdering. Miljødirektoratet opplyser at dataene ikke kan brukes til
arealplanlegging.

## Tilgang

| Kanal | Finnes |
|---|---|
| ArcGIS REST: `stoy/stoykart_strategisk_veg` og `…_bane` | Ja. Den NaboRadar bruker |
| Bulkfil, ESRI filgeodatabase (`nedlasting.miljodirektoratet.no/stoy/`) | Byområder 2022: 68,6 MB. Veier 2022: 34,8 MB. Flyplasser 2022: 0,3 MB. Sist endret 2023-11-01 |
| Bulkfil for bane 2022 | Nei |
| WFS, GeoPackage, GML, GeoJSON | Ikke oppgitt |

Filstørrelsene er lest fra HTTP-hodene. Filene er ikke lastet ned.

## Størrelse

Lagene NaboRadar bruker (døgnnivå, Lden), talt i karttjenesten 2026-10-08:

| Lag | Flater |
|---|---|
| Vei, byområder (lag 5) | 12 089 |
| Vei, øvrig (lag 7) | 13 461 |
| Bane, byområder (lag 5) | 83 |
| Bane, øvrig (lag 7) | 18 |
| Dekning, vei og bane (lag 1) | 69 |

Nattlagene (ca. 14 900 flater) brukes ikke.

Flatene er svært store: i et utvalg på 120 flater per lag hadde byområdelaget for vei i snitt
ca. 57 000 punkter per flate, banelaget ca. 24 000 og landslaget for vei ca. 500. Ganget opp gir
utvalget over 10 GB for byområdelaget, som ikke stemmer med en zip-fil på 69 MB — utvalget er
skjevt. **Størrelsen i PostGIS er derfor ikke målt.** Anslaget ut fra filstørrelsene er noen
hundre MB til rundt 1 GB. Et sikkert tall krever nedlasting og prøveimport. Så store flater må
uansett deles opp før punktoppslag blir raske.

## A mot B

| | A. Cache per søkepunkt | B. Full import |
|---|---|---|
| Lagring | Én liten rad per søkt sted | Anslagsvis flere hundre MB, pluss indekser |
| Uavhengig av kilden | For steder som er søkt før | Helt |
| Første søk på nytt sted | Avhengig av kilden | Raskt |
| Arbeid | Én tabell, to funksjoner | Nedlasting, konvertering fra filgeodatabase, oppdeling av flater, ny oppslagskode, QA mot dagens svar |
| Ny kartleggingsrunde | Radene regnes som gamle og hentes på nytt | Ny import og ny QA |

**Valgt: A.** B løser bare det første søket på et nytt sted, og forsvarer ikke lagring og
vedlikehold nå. Blir kilden varig ustabil, er første steg mot B å laste ned bulkfilene og måle.

## Skrivetilgang

Webappen har med vilje ingen skrivenøkkel til databasen. En cache som fylles ved søk må likevel
skrives fra webappen. Tre veier ble vurdert:

| Vei | Vurdering |
|---|---|
| Egen nøkkel som bare kan skrive støycache-rader | **Valgt.** Lekker den, kan noen skrive feil støysvar — ingenting annet |
| `SUPABASE_SECRET_KEY` i Netlify | Bryter regelen om at webappen aldri har full skrivetilgang |
| Åpen skrivefunksjon | Hvem som helst kunne lagt inn falske støysvar |

## QA mot kilden

`npm run qa:stoy-cache`, kjørt 2026-10-08 med cachen i en PGlite-database i minnet:

| Sted | Første kall (kilden) | Andre kall (cache) | Identisk |
|---|---|---|---|
| Kirkeveien 60, Oslo — vei Lden 60–64, bane under 50 dB | 5 339 ms | 2 ms | ja |
| Majorstuen stasjon — vei Lden 50–54, bane Lden 65–69 | 5 542 ms | 1 ms | ja |
| Langmyrgrenda 26 — vei Lden 50–54 | 5 553 ms | 1 ms | ja |
| Langmyrgrenda 26C — under 50 dB (20 cm utenfor båndet) | 5 356 ms | 1 ms | ja |
| Vinstra — ikke med i kartleggingen | 175 ms | 2 ms | ja |

Med gammel rad og en kilde som ikke svarer, ga alle fem det lagrede svaret på 1 ms, og raden sto
urørt. Merk at de fire Oslo-oppslagene brukte over 5 sekunder mot kilden — like under grensen.

## Ikke gjort

- Ingen måling av faktisk databasestørrelse for alternativ B.
- Ingen kontroll av om banekartene for byområdene også er fra 2017; tjenesten oppgir ett år for
  hele banetjenesten.
- Støyvarselkart for veg (Statens vegvesen) og flystøy (Avinor) er andre kilder og er ikke
  cachet her.

## Kilder

- Miljødirektoratets kartkatalog, datasett 1006: `kartkatalog.miljodirektoratet.no/Dataset/Details/1006`
- Geonorge, metadata `93a154a7-47d5-47b8-bdda-f156d92386cc`
- Karttjenestenes egne beskrivelser: `kart3.miljodirektoratet.no/arcgis/rest/services/stoy`
- Veileder til forurensningsforskriftens kapittel 5 om støy, Miljødirektoratet
