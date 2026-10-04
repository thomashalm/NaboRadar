# Støy: Langmyrgrenda 26 mot 26C

> QA-sak, undersøkt 2026-10-04. Konklusjon: NaboRadar gjenga kilden riktig, men ordlyden var mer
> presis enn dataene tåler. Støytekstene ble endret samme dag; reglene står i
> [håndboka](../naboradar-handbook.md#støy).

## Problemstilling

Langmyrgrenda 26 i Oslo viste veitrafikkstøy «ved søkepunktet», mens 26C ikke viste noe.
Området ligger skognært, så treffet virket rart.

## Kilder

- Miljødirektoratets strategiske støykartlegging, ArcGIS-tjenesten
  `kart3.miljodirektoratet.no/arcgis/rest/services/stoy/stoykart_strategisk_veg`, lag 5
  (`stoy_veg_storby_dogn`). Tjenesten oppgir: situasjonen i 2022, beregnet 4 m over bakken,
  beregning og ikke måling.
- Kartverkets adresse-API for adressepunktene.
- T-1442/2021 tabell 1 for sonegrensene; Miljødirektoratets veileder M-2061, som sier at de
  strategiske kartene ikke viser gul og rød sone.

## Funn

| Adresse | Koordinat | Kilden | Til grensen mot «under 50» | Til grensen mot 55–59 |
|---|---|---|---|---|
| Langmyrgrenda 26 | 59.966229, 10.747226 | Lden 50–54 dB | 5,1 m | 1,4 m |
| Langmyrgrenda 26B | 59.966346, 10.747179 | Lden 50–54 dB | 1,8 m | 2,8 m |
| Langmyrgrenda 26C | 59.966464, 10.747149 | ingen treff | 0,2 m (til 50–54) | 4,9 m |

Avstandene er målt i en uttegning av rå-laget i 0,2 m oppløsning.

- NaboRadar viste «Lden 50–54 dB» for nr. 26 — det samme som kilden. Koordinatene var
  Kartverkets, og laget var riktig (storbylaget; det nasjonale laget gir ingen treff her).
- **Støykilden er gata selv.** Kildefeltet er `roadsInAgglomeration`: i byområdene er alle gater
  modellert. Båndet følger Langmyrgrenda, som går i en sløyfe. 55–59-båndet er rundt 20 m bredt,
  med en kant på 5–10 m i 50–54 på hver side. Midten ligger anslagsvis 13 m fra adressepunktet
  til nr. 26 og 17 m fra 26C.
- Overgangen er logisk. Av 123 adresser i Langmyrgrenda ligger 14 i 55–59, 54 i 50–54 og 55 uten
  treff — husene mot gata får treff, B-, C- og D-adressene i bakre rekke stort sett ikke.
- 26 og 26C ligger 26 m fra hverandre, og 26C ligger 20 cm utenfor båndet. Polygonkantene er
  hakkete i steg på 5–10 m. Oppløsningen er ikke oppgitt i tjenesten.
- 50–54 dB er under T-1442s gule grense for vei (55 dB), men ble vist likt som et høyt nivå.

### Funnet underveis: banelagets tall

Banelagene oppgir `stoyintervall` (50, 55, … 75). Det er nedre grense i et intervall på 5 dB:
tegnforklaringen sier «65 - 70 dB» for 65, og et punkt treffer bare ett polygon. Vi skrev
«65 dB eller mer». Rettet til «65–69 dB»; 75 er «over 75 dB».

## Hva som ble endret

Bare tekst. Oppslaget, lagene og dataene er de samme.

| | Før | Etter |
|---|---|---|
| Langmyrgrenda 26, gruppen | Støy fra veitrafikk · Lden 50–54 dB / Ved søkepunktet · modellberegnet, ikke målt ved boligen | Støy fra veitrafikk · Lden 50–54 dB / Under gul støysone (gul fra 55 dB) |
| Kortet | Beregnet støy fra veitrafikk: Lden 50–54 dB · «Ved søkepunktet» til høyre | Samme overskrift / Under gul støysone (gul fra 55 dB) / Modellert for alle gater i byområdet |
| Nederst i gruppen | – | Modellberegnet kartnivå ved søkepunktet. Kan variere over korte avstander. Lden er gjennomsnittlig støynivå over døgnet, der kveld og natt teller ekstra. |
| Bane ved Majorstuen | Lden 60 dB eller mer · «Ved søkepunktet» | Lden 60–64 dB / Gul støysone fra 58 dB, rød fra 68 dB (T-1442) |

## Oppfølging samme dag: resultat også uten treff

Etter tekstendringen forsvant støyseksjonen helt på 26C. Brukeren kunne ikke se om området var
kartlagt med lavt nivå, ikke kartlagt, eller om kilden hadde feilet.

Kilden har egne dekningslag: `byomrader` (lag 0) — de seks byområdene Oslo, Bergen, Trondheim,
Stavanger/Sandnes, Drammen og Fredrikstad/Sarpsborg — og `stoy_veg_dekning` / `stoy_bane_dekning`
(lag 1) for de mest trafikkerte strekningene utenfor (61 vegpolygoner, 8 banepolygoner).
Oppslaget spør dem sammen med støynivåene, og skiller fire utfall: treff, kartlagt uten treff,
ikke kartlagt, og feil. Reglene står i håndboka.

| | Før | Etter |
|---|---|---|
| Langmyrgrenda 26C | ingen støyseksjon | **Støy:** Ingen kartlagt vei- eller banestøy over 50 dB ved søkepunktet. / Modellberegnet kartnivå ved søkepunktet. Kan variere over korte avstander. |
| Langmyrgrenda 26 | støykort for vei | samme kort, og nederst: Ingen kartlagt banestøy over 50 dB ved søkepunktet. |
| Finse, Karasjok | ingen støyseksjon | Området er ikke med i den strategiske støykartleggingen av vei og bane. |
| Ålesund sentrum | ingen støyseksjon | Ingen kartlagt støy over 50 dB fra de mest trafikkerte veiene ved søkepunktet. |

Kontrollert at byområdet er modellert helt ut til kanten: punkter i Sørumsand, Sørkedalen og
Hurum, alle i byområdet «Oslo», har støypolygoner innen én kilometer.

## Begrensninger

- Dekningslaget utenfor byene (lag 1) har ingen beskrivelse i tjenesten. Vi leser det som
  områdene der de mest trafikkerte veiene og banene er kartlagt, slik navnet og
  tjenestebeskrivelsen tilsier.
- Tjenestebeskrivelsen for bane sier at kartene viser situasjonen i 2017, mens vår metodetekst
  sier «kartlagt 2022» for hele kilden. Ikke avklart.
- Oppslaget gjør åtte kall i stedet for fire. Målt svartid var uendret, rundt fire sekunder i
  Oslo og ett sekund utenfor byområdene.

- Miljødirektoratets nettkart er ikke åpnet i nettleser. Uttegningen er laget fra samme
  karttjeneste.
- Avstanden til gatas midtlinje er lest av bildet, ikke målt mot vegnettet.
- Teksten sier «søkepunktet», ikke «adressepunktet»: et søk kan være et stedsnavn.
