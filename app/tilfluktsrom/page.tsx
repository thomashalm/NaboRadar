import type { Metadata } from "next";
import Link from "next/link";
import { AreaShell } from "@/components/area/AreaShell";
import { SearchBox } from "@/components/search/SearchBox";
import { TILFLUKTSROM_CAVEAT } from "@/lib/facts/wording";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";

const BESKRIVELSE =
  "Søk opp en adresse og se hvilke offentlige tilfluktsrom som ligger i nærheten, med antall plasser " +
  "og avstand. Data fra Sivilforsvaret og DSB.";

export const metadata: Metadata = {
  title: "Tilfluktsrom – finn offentlige tilfluktsrom nær en adresse",
  description: BESKRIVELSE,
  alternates: { canonical: "/tilfluktsrom" },
  openGraph: {
    type: "website",
    siteName: "NaboRadar",
    locale: "nb_NO",
    title: "Tilfluktsrom – finn offentlige tilfluktsrom nær en adresse",
    description: BESKRIVELSE,
    url: "/tilfluktsrom",
  },
};

/**
 * Landingsside for tilfluktsrom.
 *
 * Gjør ikke oppslaget selv — søket sender brukeren til den vanlige resultatsiden, der seksjonen
 * allerede står. Poenget er én side som svarer på spørsmålet i ren tekst, med forbeholdene
 * synlige, i stedet for én indekserbar side per adresse.
 *
 * Tonen er nøktern med vilje. Dette er referanseinformasjon, ikke beredskapsrådgivning, og
 * siden skal ikke lese som et varsel.
 */
export default function TilfluktsromPage() {
  return (
    <AreaShell>
      <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16">
        <h1 className="text-[2.2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Finn offentlige tilfluktsrom nær en adresse
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">
          Søk opp en adresse, så viser vi de offentlige tilfluktsrommene i nærheten — med avstand og hvor mange
          personer hvert rom er dimensjonert for.
        </p>

        <div className="mt-8">
          <SearchBox radius={DEFAULT_RADIUS_M} size="large" />
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Hva er et offentlig tilfluktsrom?</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Tilfluktsrom er permanente beskyttelsesrom som skal verne befolkningen mot skader ved krigshandlinger.
            De offentlige er bygget av det offentlige og er åpne for alle som oppholder seg i området. Det finnes
            i tillegg private tilfluktsrom i en del bygg — de er for dem som bor eller arbeider der, og
            Sivilforsvaret publiserer ikke hvor de er. <strong className="font-medium text-ink">NaboRadar viser
            bare de offentlige.</strong>
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            Sivilforsvaret har registrert <strong className="font-medium text-ink">556 offentlige tilfluktsrom</strong>{" "}
            i Norge, med til sammen rundt 300 000 plasser.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Hva tallene betyr</h2>
          <p className="mt-3 leading-relaxed text-muted">{TILFLUKTSROM_CAVEAT}</p>
          <p className="mt-3 leading-relaxed text-muted">
            Ved en krise er det{" "}
            <a
              href="https://www.sivilforsvaret.no/tilfluktsrom/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Sivilforsvarets egen informasjon
            </a>{" "}
            og myndighetenes varsling som gjelder.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Hvor kommer dataene fra?</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Datasettet «Tilfluktsrom – Offentlige» fra Direktoratet for samfunnssikkerhet og beredskap, publisert
            på Geonorge under{" "}
            <a
              href="https://data.norge.no/nlod/no/1.0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Norsk lisens for offentlige data
            </a>
            . Vi viser romnummer, stedsbeskrivelse, antall plasser og posisjon — det kilden faktisk oppgir.
            Areal, type og status er ikke med i datasettet, og vi gjetter dem ikke.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Hva mer viser NaboRadar?</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Samme søk gir deg også varslede planoppstarter, grunnforhold, støy, forurenset grunn og hva slags
            virksomheter og steder som finnes i nærheten.{" "}
            <Link href="/" className="text-accent hover:underline">
              Se hva NaboRadar dekker
            </Link>
            .
          </p>
        </section>
      </main>
    </AreaShell>
  );
}
