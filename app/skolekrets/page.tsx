import type { Metadata } from "next";
import Link from "next/link";
import { AreaShell } from "@/components/area/AreaShell";
import { SearchBox } from "@/components/search/SearchBox";
import { SKOLEKRETS_FORBEHOLD, SKOLEKRETS_UNGDOMSTRINN } from "@/lib/facts/wording";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";

const BESKRIVELSE =
  "Søk opp en adresse i Oslo og se hvilket veiledende inntaksområde for barneskole den ligger i. " +
  "Data fra Oslo kommune. Inntaksområdet er veiledende og garanterer ikke skoleplass.";

export const metadata: Metadata = {
  title: "Skolekrets – finn hvilken skole adressen tilhører",
  description: BESKRIVELSE,
  alternates: { canonical: "/skolekrets" },
  // siteName, type og locale arves ikke når openGraph overstyres, så de settes på nytt.
  openGraph: {
    type: "website",
    siteName: "NaboRadar",
    locale: "nb_NO",
    title: "Skolekrets – finn hvilken skole adressen tilhører",
    description: BESKRIVELSE,
    url: "/skolekrets",
  },
};

/**
 * Landingsside for skolekrets.
 *
 * Den gjør ikke oppslaget selv — søket sender brukeren til den vanlige resultatsiden, der
 * notisen allerede står. Poenget er å ha én side som svarer på spørsmålet i ren tekst, med
 * forbeholdene synlige, i stedet for én indekserbar side per adresse.
 */
export default function SkolekretsPage() {
  return (
    <AreaShell>
      <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16">
        <h1 className="text-[2.2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Finn hvilken skole adressen tilhører
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">
          Søk opp en adresse i Oslo, så viser vi hvilket veiledende inntaksområde for barneskole den ligger i — sammen
          med resten av det som er offentlig kjent om området.
        </p>

        <div className="mt-8">
          <SearchBox radius={DEFAULT_RADIUS_M} size="large" />
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Hva er en skolekrets?</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Oslo er delt inn i 105 inntaksområder, ett for hver barneskole. Bostedsadressen avgjør hvilket område et
            barn hører til, og dermed hvilken skole det normalt får plass ved. Områdene kalles også skolekretser.
          </p>
          <p className="mt-3 leading-relaxed text-muted">{SKOLEKRETS_FORBEHOLD}</p>
          <p className="mt-3 leading-relaxed text-muted">{SKOLEKRETS_UNGDOMSTRINN}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Hvor kommer tallene fra?</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Inntaksområdene er hentet fra Oslo kommunes eget kartlag over skolekretser, publisert av Plan- og
            bygningsetaten. Vi finner hvilket område adressens koordinat ligger inne i — vi gjetter aldri på nærmeste
            skole ut fra avstand. Ligger adressen utenfor Oslo, viser vi ingenting, fordi kilden bare dekker Oslo.
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            Utdanningsetaten reviderer grensene hver høst.{" "}
            <a
              href="https://www.oslo.kommune.no/skole-og-utdanning/skoleoversikt-og-skolekrets/skolekrets-barneskole/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Oslo kommunes egen oversikt
            </a>{" "}
            er fasit.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Hva mer viser NaboRadar?</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Samme søk gir deg også varslede planoppstarter, grunnforhold, støy, forurenset grunn, kraftanlegg og hva
            slags virksomheter og steder som finnes i nærheten.{" "}
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
