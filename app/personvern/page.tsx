import type { Metadata } from "next";
import { AreaShell } from "@/components/area/AreaShell";
import { KONTAKT_EPOST } from "@/lib/site";

const BESKRIVELSE =
  "Hvordan NaboRadar behandler personopplysninger: ingen konto, ingen sporing og ingen lagrede søk. " +
  "Hva som sendes til Kartverket og andre offentlige kilder, og hvilke tekniske logger som finnes.";

export const metadata: Metadata = {
  title: "Personvern",
  description: BESKRIVELSE,
  alternates: { canonical: "/personvern" },
  // siteName, type og locale arves ikke når openGraph overstyres, så de settes på nytt.
  openGraph: {
    type: "website",
    siteName: "NaboRadar",
    locale: "nb_NO",
    title: "Personvern",
    description: BESKRIVELSE,
    url: "/personvern",
  },
};

const SIST_OPPDATERT = "3. oktober 2026";

/**
 * Personvernerklæringen. Teksten beskriver bare det koden og oppsettet faktisk gjør — se
 * gjennomgangen i håndboka (Personvern og informasjonskapsler). Endres løsningen (analyse,
 * kontoer, innbygd innhold fra andre), må teksten endres samtidig.
 */
export default function PersonvernPage() {
  const epost = (
    <a href={`mailto:${KONTAKT_EPOST}`} className="text-accent hover:underline">
      {KONTAKT_EPOST}
    </a>
  );
  return (
    <AreaShell>
      <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
        <h1 className="text-[2.2rem] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-5xl">Personvern</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">
          NaboRadar er et privat, ikke-kommersielt prosjekt. Ansvarlig for behandlingen av personopplysninger er Thomas
          Halmø. Kontakt: {epost}.
        </p>

        <Avsnitt tittel="Ingen konto, ingen sporing">
          <p>
            Du trenger ingen konto for å bruke NaboRadar. Vi bruker ikke analyseverktøy, annonser eller sporing. Søk,
            adresser og posisjoner du slår opp, lagres ikke i NaboRadars database.
          </p>
        </Avsnitt>

        <Avsnitt tittel="Hva som skjer når du søker">
          <p>
            Når du søker etter en adresse eller et sted, sender NaboRadars server søketeksten til Kartverket for å finne
            treffene. Når du ser på et område eller klikker i kartet, sender serveren koordinatene til offentlige
            kartkilder for å hente eiendomsinformasjon, høyde, støy og naturfare: Kartverket (Geonorge), NVE, NGU,
            Miljødirektoratet og Statens vegvesen. Det er serveren vår som spør, så kildene ser ikke din IP-adresse.
          </p>
          <p>
            Svarene mellomlagres kort for å gjøre siden raskere: opptil ti minutter i serverens minne og noen minutter
            i nettleseren din. De lagres ikke ellers.
          </p>
        </Avsnitt>

        <Avsnitt tittel="Kartet">
          <p>
            Kartbildene hentes direkte fra Kartverket. Nettleseren din sender da IP-adressen din og hvilket kartområde
            som lastes til Kartverket, slik det skjer med alle nettkart.
          </p>
        </Avsnitt>

        <Avsnitt tittel="Tekniske logger">
          <p>
            Nettstedet driftes av Netlify. Som andre driftsleverandører behandler Netlify tekniske logger over
            forespørsler, med blant annet IP-adresse, tidspunkt og adressen til siden. På områdesider (/omrade)
            inneholder adressen koordinatene og stedsnavnet du har valgt. Loggene brukes til drift og sikkerhet, og
            hvor lenge de lagres, styres av Netlify. Netlify er et amerikansk selskap og deltar i EU-U.S. Data Privacy
            Framework, som er grunnlaget for overføring til USA.
          </p>
          <p>
            Databasen ligger hos Supabase i Irland. Den inneholder kartdata og saker fra offentlige kilder, ikke
            besøkslogger eller søkehistorikk fra vanlige brukere.
          </p>
        </Avsnitt>

        <Avsnitt tittel="Informasjonskapsler">
          <p>
            Vanlige besøkende får ingen informasjonskapsler (cookies), og vi bruker ikke lokal lagring i nettleseren
            (localStorage eller sessionStorage). Den eneste informasjonskapselen er innloggingen for administrator, via
            Supabase, og den er nødvendig for at innloggingen skal virke. Derfor ber vi ikke om samtykke.
          </p>
        </Avsnitt>

        <Avsnitt tittel="Dine rettigheter">
          <p>
            Du kan be om innsyn i, retting eller sletting av opplysninger om deg, og protestere mot behandlingen der det
            er relevant. Skriv til {epost}. NaboRadar har normalt ingen brukerprofiler eller søkehistorikk som kan
            knyttes til deg, så som regel finnes det ikke noe hos oss å utlevere eller slette.
          </p>
          <p>
            Mener du at vi behandler personopplysninger i strid med regelverket, kan du klage til{" "}
            <a href="https://www.datatilsynet.no/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Datatilsynet
            </a>
            .
          </p>
        </Avsnitt>

        <p className="mt-12 text-sm text-muted">Sist oppdatert {SIST_OPPDATERT}.</p>
      </main>
    </AreaShell>
  );
}

function Avsnitt({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-[-0.02em]">{tittel}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}
