# ADR 011: Hytter — tilgang beskriver dør og nøkkel, ikke om hytta er åpen eller ledig

**Status:** Aktiv · 2026-10-02 (nedtegnet 2026-10-03)

## Bakgrunn
N50s felt `tilgjengelighet` har tre verdier i Kartverkets kodeliste: «Låst» («Låst og krever
forhåndsbooking»), «Ulåst» («Ulåst eller tilgjengelig med Den Norske Turistforenings
standardnøkkel») og «Udefinert». Kontrollen av pilothyttene viste at dette dekker flere
virkeligheter:

- DNT Oslo og Omegn krever forhåndsbestilling også på «ulåste» hytter i marka.
- Husbergøya lånes bare ut til skoler og organisasjoner.
- Solstua er stengt for vedlikehold på ubestemt tid.
- Noen hytter er bare for medlemmer eller jegere, eller er ikke i utleie.

Ingen kilde sier om en hytte er åpen, i sesong eller ledig
([research/hytter-pilot-kildekontroll.md](../research/hytter-pilot-kildekontroll.md)).

## Alternativer vurdert
- **Vise «Låst/Ulåst» som «krever nøkkel / ingen nøkkel»** — avvist. «Ulåst» inkluderer DNT-nøkkel.
- **Fritekst om tilgang per hytte** — avvist. Kan ikke filtreres eller kontrolleres, og glir mot
  markedsføring.
- **Skjule hytter som ikke er for allmennheten** — avvist. Det er nyttig å vite at de finnes, og
  hvem de er for.
- **Vise «Åpen» når vi ikke vet noe annet** — avvist. Vi har ingen kilde for det.

## Beslutning
- Tilgang er en lukket liste (`HUT_ACCESS_KINDS` i `lib/huts/types.ts`). Kartverkets to verdier vises
  ordrett («Låst – må bestilles på forhånd», «Ulåst, eller åpnes med DNT-nøkkel»). Mer presise
  verdier (`unlocked`, `dnt_key`, `code_lock`, `special_key`, `code_or_special_key`) finnes bare
  som overstyring fra forvalterens side.
- **`not_public` — «Ikke for allmennheten»** sier hvem hytta er for, ikke hvordan døra er. Den
  settes bare når forvalterens side sier det, og krever en offentlig merknad (`public_note`).
  Hytta har en side, men den er `noindex`, står ikke i sitemapen, står ikke som overnattingssted,
  og siden ber ikke om bestilling.
- **Midlertidig stengt** er status (`access_status = 'closed'`), ikke tilgang. Den settes for
  hånd, har alltid en dato for neste kontroll (`status_review_at`), og oppheves aldri av seg selv.
  Vi viser aldri «åpen».
- Hyttesiden sier alltid at tilgang ikke betyr åpen eller ledig (`HUT_ACCESS_NOTE`).
- «Kort om hytta» nevner tilgang på betjente hytter bare når den stenger noen ute, altså
  låst/bestilles eller ikke for allmennheten.

Tabellene og ordlyden står i [håndbok: Hytter og koier](../naboradar-handbook.md#hytter-og-koier).

## Begrunnelse
Brukeren skal ikke gå fem timer til en hytte på grunn av en tolkning vi har gjort. Vi sier bare
det kilden eller forvalteren sier, og vi sier tydelig hva det ikke betyr.

## Konsekvenser
- `npm run qa:hytter` feiler hvis `not_public` mangler merknad, eller en overstyring mangler kilde.
- Stengte hytter legger arbeid i en kontrollkø som må følges opp.

## Kjente ulemper
- De fleste hyttene har bare Kartverkets grove verdi.
- En stengt hytte kan ha åpnet igjen før neste kontroll.

## Revurderes når
- En kilde begynner å levere status eller sesong strukturert.
- Kartverket endrer kodelisten for tilgjengelighet.

## Relatert
[research/hytter-pilot-kildekontroll.md](../research/hytter-pilot-kildekontroll.md) ·
[research/hytter-andre-berikelse.md](../research/hytter-andre-berikelse.md) ·
[ADR 006](006-address-first-not-a-trail-app.md) · [ADR 010](010-hut-sources.md)
