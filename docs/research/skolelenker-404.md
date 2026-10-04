# Skolelenker som ga 404

> Rettet 2026-10-04. Alle skolelenker pekte på en rute som ikke finnes i Nasjonalt
> skoleregister. Lenkemalen og de lagrede lenkene er rettet.

## Problemstilling

Trykk på en skole i NaboRadar åpnet `nsr.udir.no` med «Siden finnes ikke – Feilkode 404».

## Funn

- Lenken bygges av oss i `lib/providers/udir/skoler.ts`, av organisasjonsnummeret fra Udirs
  skoledata. Den kommer ikke ferdig fra kilden.
- Malen var `https://nsr.udir.no/enhet/<orgnr>`. **Alle 3 103 skolene** (2 581 grunnskoler, 522
  videregående) hadde en slik lenke, og alle ga 404.
- Registerets nettside har ruten `enhet: "/enheter/:orgnr"` — flertall. Det står i nettsidens
  egen rutetabell, og er ikke gjettet. Om adressen er endret eller om malen vår var feil fra
  starten, vet vi ikke.
- Nettsiden svarer HTTP 200 på alle adresser og viser 404-meldingen i nettleseren. En vanlig
  lenkesjekk med statuskode fanger derfor ikke feilen.
- Organisasjonsnummeret er stabilt og er det registeret selv bruker i adressen. Det er også vår
  eksterne ID for skolen.

## Løsning

- Malen er `https://nsr.udir.no/enheter/<orgnr>` (`nsrEnhetUrl`).
- Migrasjon `20261104000000_skolelenker_nsr.sql` retter lenken på radene som allerede ligger i
  databasen. Synken alene ville ikke gjort det: den leser Geonorge-WFS-en for skoler, som svarte
  HTTP 500 denne dagen.
- Ingen reserve mot en søkeside er lagt inn. Detaljsiden finnes for alle kontrollerte skoler.

## QA

- 41 skoler slått opp i Udirs åpne API (`data-nsr.udir.no/v4/enhet/<orgnr>`): alle 41 finnes, er
  aktive og har samme navn som hos oss. Utvalget: Oslo (barne-, ungdoms- og videregående),
  Bergen, Trondheim, Stavanger, Tromsø, og mindre kommuner (Lom, Røros, Kautokeino, Odda,
  Flekkefjord, Trøgstad m.fl.).
- Seks nye adresser åpnet i nettleser, og alle viste riktig skole: Møllergata videregående skole,
  Lom ungdomsskule, Trondheim katedralskole, Løren skole, Kautokeino skole, Bjerkaker skole.
- Gammel adresse for Møllergata videregående skole åpnet i nettleser: 404, som rapportert.

## Datakvalitet: enheter som ikke er skoler (ikke endret)

«Eksamenskontoret i Akershus» står som videregående skole hos oss. Det er ikke samme feil som
lenkene, og ikke samme felt:

- Udirs register fører den selv som skole: `ErSkole: true`, `ErVideregaaendeSkole: true`, trinn
  11–13, uten elevtall. Vi gjengir kilden riktig.
- Fem eksamenskontor ligger i listen (Agder, Akershus, Buskerud, Østfold, Innlandet). I tillegg
  finnes voksenopplæringer og læringssentre ført som grunnskole.
- 587 av 3 101 aktive skoler mangler elevtall. Det er for grovt som filter alene: flere av dem er
  vanlige skoler.
- Registeret har ikke noe felt som skiller «skolebygg med elever» fra «enhet som er godkjent for
  opplæring». En regel må derfor være vår egen, og bør besluttes for seg.

## Begrensninger

- Bare 41 av 3 103 skoler er kontrollert enkeltvis. Resten følger av at ruten og nøkkelen er de
  samme.
- Barnehagelenkene (`barnehagefakta.no`) er ikke gjennomgått i denne runden.
