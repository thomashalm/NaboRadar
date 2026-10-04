# Skolefilter for offentlig visning

> Bygget 2026-10-04. 78 av 3 101 aktive skoler i Udirs register vises ikke lenger i den
> offentlige skolelisten. Alle ligger uendret i databasen og vises i admin, med grunnen.
> Regelen står i [håndboka](../naboradar-handbook.md#skolefilter-for-offentlig-visning).

## Problemstilling

«Eksamenskontoret i Akershus» sto som videregående skole 350 m fra Karl Johans gate 1. Udirs
register fører også eksamenskontor, voksenopplæring, nettskoler, fagskoler og bibelskoler som
skoler. Det er riktig etter registerets egen definisjon — enhetene er godkjent for opplæring —
men det er ikke det en boligkjøper mener med en skole i nærområdet.

Dette er produktsemantikk, ikke en retting av Udirs data. Vi velger en visning; kilden står.

## Kilder og metode

- Udirs åpne API for Nasjonalt skoleregister, `data-nsr.udir.no/v4`: listen (`/enheter`, 18 358
  enheter) og enhetssiden (`/enhet/<orgnr>`) for alle 3 101 aktive skoler hos oss.
- Feltene som ble vurdert: skolekategorier, næringskoder, elevtall, trinn, organisasjonsform,
  aktiv/ekskludert og hjelpeenhetskode.

## Funn

Rundt 65 enheter er tydelig ikke vanlige skoler: 11 eksamens- og privatistkontor, ca. 43
voksenopplæringer, læringssentre og karrieresentre, 8–9 nettskoler og 4 bibel- og fagskoler med
egen næringskode. I tillegg kommer 12 bibelskoler og én fagskole som registeret har gitt ordinær
næringskode, og 11 rene administrasjonsenheter.

| Felt | Egnet? | Hvorfor |
|---|---|---|
| Primær næringskode | Ja | 50 enheter har primærkode i 85.4, 85.5 eller 85.6. Ingen vanlige skoler blant dem |
| Skolekategori «Voksenopplæringssenter» | Nei | 89 enheter har den, men 53 er ordinære skoler som også har voksenopplæring (Bergen katedralskole, Bjerke vgs, Klæbu ungdomsskole) |
| Elevtall | Nei | Mangler for 497 av 522 videregående |
| Trinn | Nei | 97 grunnskoler mangler trinn; de fleste er ekte skoler |
| Organisasjonsform, status, hjelpeenhetskode | Nei | Like for alle 3 101 |

Primærkodene blant våre skoler: 85.201 (2 574), 85.310 (257), 85.320 (220), 85.593 (36),
85.699 (10), 85.404 (2), 85.403 (1), 85.595 (1).

## Regelkandidater

| Regel | Fjerner | Vanlige skoler som ryker | Slipper gjennom |
|---|---|---|---|
| A: primær næringskode er ikke ordinær skole | 50 | ingen funnet | nettskoler, enkelte voksenopplæringer, ett privatistkontor, bibelskoler med ordinær kode, administrasjonsenhetene |
| B: A + smal navneregel | 78 | ingen funnet | administrasjonsenhetene og noen læringssentre |
| C: B + grunnskoler uten både trinn og elevtall | ca. 156 | anslagsvis 65 ekte skoler | nesten ingenting |

**Regel B er valgt.** C er forkastet: av 78 grunnskoler uten trinn og elevtall ser bare 11
administrative ut. Resten har vanlige skolenavn, flere i samme kommuner (Lørenskog, Vestby, Son),
som tyder på manglende registerdata og ikke på at skolene ikke finnes.

Tallet i den første rapporten var 65 for regel B. Det endelige er 78, fordi bibelskoler og
fagskoler ble tatt med i navneregelen etter produktbeslutningen om å skjule dem.

## Regelen som er bygget

1. **Næringskode:** primærkode som starter med 85.4, 85.5 eller 85.6 → skjult. Navnet brukes
   bare til å si hva slags enhet det er.
2. **Navn**, når næringskoden er ordinær eller mangler: eksamenskontor, privatist,
   voksenopplæring, nettskole, «Karriere …», bibelskole, fagskole.
3. **Unntak:** navn med «skole og …» er blandede enheter («Mellomåsen skole og
   voksenopplæring») og skjules ikke av navnet.
4. **Ukjent vises.** Uten næringskode gjelder bare navneregelen.

### Resultat i produksjon

| Grunn | Næringskode | Navn | Sum |
|---|---|---|---|
| Voksenopplæring (læringssenter, karrieresenter) | 36 | 4 | 40 |
| Bibelskole | 2 | 13 | 15 |
| Eksamens- eller privatistkontor | 10 | 1 | 11 |
| Nettskole | 0 | 9 | 9 |
| Fagskole | 2 | 1 | 3 |
| **Sum** | **50** | **28** | **78** |

78 av 3 101 (2,5 %). Klassifiseringen i produksjon er identisk med den som ble regnet ut i
undersøkelsen, enhet for enhet (0 avvik av 3 101).

### Gråsoner som fortsatt vises

- **De 11 administrasjonsenhetene** («Lillesand kommune – Sentraladministrasjon skole»,
  «Porsgrunn kommune Vikarer Grunnskole/Sfo», «Suldal kommune Skulefagleg Rådgjevar» m.fl.). De
  har ordinær næringskode og ingen egne felt. En navneregel bred nok til å fange dem ville også
  truffet ekte skoler. Tas eventuelt som manuell liste eller egen runde.
- Læringssentre og kompetansesentre med ordinær kode: Johannes læringssenter Flerspråklige Barn,
  St. Marie læringssenter Særskilt Norsk, Breidablik læringssenter avd grunnskole, Hå
  opplæringssenter avd grunnskole, Gjøvik læringssenter – omsorgssenter, Stange kommune
  kvalifiseringssenter, Lom kompetansesenter, Oslo Vo Hovinbyen.
- Mellomåsen skole og voksenopplæring (blandet enhet, vises med vilje).

## Lagring og oppdatering

- Tabellen `school_units`: organisasjonsnummer, primær næringskode, alle næringskoder,
  `hidden_reason`, hvilken regel som slo til, og registerets `DatoEndret`.
- `features_near` og `features_count_near` utelater enheter med `hidden_reason` for offentlige
  lesere. Admin får alle, med `offentligSkjult` i attributtene; adminvisningen skriver
  «vises ikke offentlig (eksamens- eller privatistkontor)».
- `npm run schools:classify` (og etter skolesynken): leser registerlisten (19 kall), og henter
  enhetssiden bare for skoler som er nye, endret i registeret eller mangler næringskode. Første
  kjøring: 3 101 kall. Andre kjøring rett etter: 0.
- Ingen kall mot Udir når en side lastes.
- Svarer ikke Udir for en enhet, står forrige rad; finnes ingen rad, vises skolen. Svarer ikke
  listen, gjøres ingenting.

## Før og etter: Karl Johans gate 1, 1 km

| | Før | Etter |
|---|---|---|
| Oppsummering | 8 skoler · 9 barnehager innen 1 km | 6 skoler · 9 barnehager innen 1 km |
| Nærmeste «skole» | Eksamenskontoret i Akershus, 350 m | Otto Treider private gymnas AS, 620 m |
| Borte fra listen og kartet | – | Eksamenskontoret i Akershus, Filadelfia bibelskole |
| Admin | 8 skoler | 8 skoler, de to merket med grunn |

## Oppfølging: hvilke skoler som står først

Etter filteret var nærmeste «skole» ved Karl Johans gate 1 fortsatt en videregående skole. Listen
velger nå de tre første etter trinn — barneskole, ungdomsskole, så de nærmeste øvrige — og merker
skolene med type. Regelen står i håndboka.

| Adresse | Før (på avstand) | Etter |
|---|---|---|
| Karl Johans gate 1, 1 km | Otto Treider (vgs, 620 m), Urtehagen (vgs, 680 m), Møllergata (vgs, 760 m) | St Sunniva (1.–10., 860 m), Otto Treider (vgs, 620 m), Urtehagen (vgs, 680 m) |
| Lom, 3 km | Jotunheimen vgs (150 m), Lom ungdomsskule (160 m), Loar skule (1.–7., 310 m) | Loar skule (310 m), Lom ungdomsskule (160 m), Jotunheimen vgs (150 m) |
| Langmyrgrenda 26, 1 km | Korsvoll skole (1.–7., 320 m), Nordberg skole (8.–10., 960 m) | uendret |
| Kirkeveien 64A, 1 km | Majorstuen skole (1.–10., 100 m), Marienlyst (1.–10., 780 m), Kristelig gymnasium grunnskole (8.–10., 980 m) | uendret |
| ved Kautokeino skole, 1 km | Kautokeino skole (1.–10., 150 m), Samisk vgs (880 m) | uendret; 1.–10.-skolen står én gang |
| ved Fjellhamar skole, 1 km | Fjellhamar skole (uten trinn, 160 m), Fjellsrud skole (uten trinn, 400 m), Lørenskog vgs (920 m) | uendret; begge merket «Skole» |

Gråsone: i Lørenskog mangler registeret trinn for flere ekte skoler på rad. Ingen av dem kan
plasseres som barne- eller ungdomsskole, så de vises som «Skole» i avstandsrekkefølge.

## Barnehagelenker

30 av 30 kontrollerte lenker til `barnehagefakta.no` åpnet riktig barnehage i nettleser. Siden
har samme svakhet som skoleregisteret — en ugyldig adresse gir HTTP 200 og en side som blir
stående på «laster» — men ingen feil er funnet. Ikke endret.

## Begrensninger

- Navneregelen er språkavhengig og må vedlikeholdes hvis nye enhetstyper dukker opp.
- Bibelskoler er skjult på navn alene når registeret har gitt dem ordinær næringskode. Det er en
  produktbeslutning: de er ikke ordinære videregående skoler for ungdom.
- Skolesynken (Geonorge-WFS) var nede da dette ble bygget. Filteret holdes ved like av et eget
  steg i sync-jobben, uavhengig av skolesynken.
