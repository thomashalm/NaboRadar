# Discovery: lokale saker under «Planer og saker»

Undersøkt 2026-09-25. Smal runde på to typer, begge i Oslo: støyklager knyttet til
serverings- og skjenkesteder, og saker behandlet i bydelsutvalg. Alle tall og eksempler under
er ekte søk gjort denne dagen.

**Konklusjon: ingen av de to bygges nå.** Signalet er ekte for begge, men ingen av dem finnes
som strukturerte data, og begge krever fritekstlesing og gjetning for å plasseres på et kart.
Anbefalingen står i «MVP» nederst.

## A. Kilder som finnes

| Type | Ansvarlig | Hvor det publiseres | Form |
|---|---|---|---|
| Støyklage, serveringssted | Bydelen der stedet ligger; Helseetaten når støyen rammer flere bydeler | eInnsyn (offentlig postjournal) | Journalposter med fritekst-tittel |
| Bydelsutvalgssak | De 15 bydelsutvalgene | eInnsyn, «Politiske møter» | Møteprotokoll som PDF, én per møte |
| Bydelsutvalgssak | Samme | Møteportal+ (ACOS) | **Krever innlogging** — for politikerne, ikke publikum |

Næringsetaten behandler bevillinger, ikke støyklager, og har ingen klageoversikt. Oslo kommune
publiserer ingen samlet oversikt over støyklager; siden om støy fra serveringssteder forteller
bare hvem man klager til.

## B. Maskinlesbarhet

Nei, for begge.

eInnsyns publiserings-API (`docs.digdir.no`, `X-EIN-API-KEY`) er for etater som skal *levere*
data inn. Søket på einnsyn.no bruker udokumenterte interne endepunkter — `POST /api/state` og
`POST /api/result` med en opak økt-id i URL-en (`/sok?f=<uuid>`), ikke en spørrestreng. Det er
ingen offentlig dokumentert søke-API, ingen stabil kontrakt, og ingenting å bygge synk på.

Bydelsutvalgssakene ligger dessuten ikke som poster i det hele tatt: hvert møte publiseres som
én PDF. Enkeltsakene finnes bare inne i dokumentet.

## C. Kan støyklager knyttes sikkert til et konkret sted?

Delvis. Søket «klage på støy fra serveringssted» ga **66 treff totalt**, nasjonalt og for alle
år. Ekte eksempler fra Oslo:

* «Klage på støy fra et serveringssted ved Thorvald Meyers gate 65» — Bydel Grünerløkka.
  Adresse i tittelen, altså geokodbar.
* «Svar på tilbakemelding på klager på støy fra serveringsstedene Hør Hør og Folk i Storgata –
  Storgata 36» — Helseetaten. Både stedsnavn og adresse.
* «Svar - Henvendelse om støy fra serveringssteder» — Helseetaten. Ingen stedsangivelse.

Adressen står altså i tittelen når saksbehandleren har skrevet den dit, og ikke ellers. Det er
ingen adressefelt, ingen koordinat og ingen kobling til bevillingsregisteret. En sak uten
adresse i tittelen kan ikke plasseres uten gjetning, og skal da ikke vises.

## D. Kan bydelsutvalgssaker geokodes pålitelig?

Nei, ikke uten fritekstlesing. Protokollen fra Grünerløkka bydelsutvalg 18.06.2026 ble hentet
og lest. Møtet hadde **14 saker (47/26–60/26)**. Én av dem har en konkret geografisk
forankring:

* Sak 57/26: «Gateoppgradering i Båhusveien og Sinsenterrassen – innspillsrunde»

De øvrige er godkjenning av innkalling, protokoller fra komiteer, revidert budsjett,
økonomirapportering, disponering av mindreforbruk, fritak fra verv, endret representasjon,
sommerfullmakter og to høringer som gjelder hele byen. Det er nettopp de sakene som ikke skal
importeres.

Én av fjorten er ikke et unntak: dette er en forsamling som først og fremst behandler drift av
bydelen. For å finne den ene saken må vi lese PDF-en, kjenne igjen et gatenavn i en
fritekst-tittel, og slå det opp i Kartverket — og «Aktivitetsområdet» eller «Verbalvedtak 1 og
2» gir ingen posisjon i det hele tatt.

## E. Realistisk antall i Oslo

* **Støyklager:** 66 treff nasjonalt for den mest presise søkefrasen, over alle år. Andre
  formuleringer ville gitt noen flere. Realistisk snakker vi om noen titalls Oslo-saker med
  adresse, spredt over flere år.
* **Bydelsutvalgssaker:** 15 bydeler × rundt 8 møter i året × 1–2 saker med stedsforankring =
  omtrent 120–240 saker per år, hver av dem hentet ut av en PDF.

## F. Felter vi faktisk får

| Ønsket felt | Støyklage | Bydelsutvalgssak |
|---|---|---|
| sted/virksomhet | Av og til, i tittelen | Av og til, i tittelen |
| adresse | Av og til, i tittelen | Sjelden |
| koordinat | Nei | Nei |
| sakstype | Indirekte (dokumenttype) | Saksnummer og tittel |
| dato | Ja (publisert) | Ja (møtedato) |
| status | Nei | Vedtak i PDF-en |
| ansvarlig etat/bydel | Ja | Ja |
| saksbeskrivelse | Bare tittelen | I PDF-en |
| offentlig lenke | Ja | Ja, til PDF-en |

## G. Personvern

eInnsyn sladder avsender på klager fra privatpersoner: «Fra: *****». Det er bra, og det er
ikke der risikoen ligger.

Risikoen ligger i de andre feltene. I ett av treffene står mottakeren som «Til: Daglig
leder/FOLK Henrik Olsson» — en navngitt person, i kraft av rollen sin. Titler kan også
inneholde navn saksbehandleren har skrevet inn. Skulle dette bygges, må vi ta inn tittel, dato,
etat og lenke, og ingenting annet: ingen avsender, ingen mottaker, ingen dokumenttekst.

Det er også en innramming her som ikke finnes i de andre kildene våre. En bevilling er et
faktum om stedet. En klage er en påstand fra én nabo, som kan være avvist, og som ikke sier noe
om stedet er et problem. Å vise «klage» ved siden av «forurenset grunn» gir den en tyngde
kilden ikke dekker.

## H. Vedlikeholdsrisiko

Høy for begge. Ingen av dem har en kontrakt vi kan bygge på: søket er udokumenterte interne
endepunkter som kan endres uten varsel, og protokollene er PDF-er med layout som varierer
mellom bydelene. En uttrekker basert på fritekst vil feile stille — den slutter å finne saker,
uten at noe brekker.

## I. Anbefalt MVP

**Ingen av dem nå.** Rekkefølgen hvis det skal gjøres senere:

1. **Vent på en kilde med struktur.** Det som ville gjort støyklager byggbare, er et
   saksregister fra bydelene eller Helseetaten med organisasjonsnummer eller adresse på stedet
   det klages på. Det finnes ikke i dag, men det er verdt å spørre Helseetaten om.
2. **Hvis noe skal bygges først, bygg det kurert.** Samme modell som omsorgstilbudene:
   et lite datasett i repoet, ett sted per rad, hver rad med kildelenke og verifiseringsdato,
   og bare saker der adressen står i kilden. Det tåler at kilden er en PDF, fordi et menneske
   leser den én gang.
3. **Ikke bygg en uttrekker mot eInnsyn-søket.** Den vil gå i stykker, og den vil gjøre det
   stille.

## J. Hvilken av de to er sterkest?

**Støyklager**, men marginalt, og ingen av dem er sterke nok i dag.

Støyklager har høyere signalverdi for en boligkjøper, adressen står oftere i tittelen, og
volumet er lite nok til at kuratering er mulig. Bydelsutvalgssakene er svakere på alle punkter:
bare én av fjorten har en posisjon, uttrekket krever PDF-lesing, og de fleste sakene er
bydelsdrift som ikke sier noe om en adresse.

## Arkitekturen er klargjort

Seksjonen heter «Planer og saker» og er én av seks i `AREA_SECTIONS`, uten egne kategorier —
den fylles av events. Lokale saker hører hjemme der som nye `EventType`-verdier med hver sin
undertype i gruppen, slik skoler og barnehager ligger under Nærområdet. Ingen ny hovedseksjon.
Ingenting av dette er bygget, og ingen typer er lagt inn for data vi ikke har.
