import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SearchBox } from "@/components/search/SearchBox";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";
import { SITE_URL } from "./layout";

/**
 * Strukturerte data. Kun det som faktisk står på siden: at dette er et nettsted, og at det
 * er en gratis nettbasert tjeneste. Ingen FAQPage — vi har ingen synlig FAQ. Ingen
 * SearchAction — søket vårt tar koordinater, ikke en fritekststreng, så en søke-URL-mal
 * ville lovet noe som ikke virker.
 */
const STRUKTURERTE_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL.origin}/#nettsted`,
      url: SITE_URL.origin,
      name: "NaboRadar",
      inLanguage: "nb-NO",
      description:
        "Offentlige planer, grunnforhold, støy, forurenset grunn og nærområdet rundt en norsk adresse, samlet ett sted.",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL.origin}/#tjeneste`,
      name: "NaboRadar",
      url: SITE_URL.origin,
      applicationCategory: "ReferenceApplication",
      operatingSystem: "Web",
      inLanguage: "nb-NO",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "NOK" },
    },
  ],
};

/** Det siden faktisk dekker. Står som tekst, ikke bare som noe kartet tegner. */
const DEKKER = [
  ["Planer og saker", "Varslede planoppstarter fra Direktoratet for byggkvalitet, med planområdet i kart."],
  ["Grunnforhold", "Kartlagte kvikkleiresoner og aktsomhetsområder fra NVE."],
  ["Støy", "Beregnede støysoner fra veg, fly og strategisk støykartlegging."],
  ["Forurenset grunn", "Registrerte lokaliteter fra Miljødirektoratet, med myndighetens egen vurdering."],
  ["Infrastruktur", "Transformatorstasjoner og kraftledninger fra NVE."],
  ["Nærområdet", "Skoler, barnehager, sykehus, omsorgstilbud, industri og steder med skjenkebevilling."],
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <script
        type="application/ld+json"
        // Ren, statisk JSON bygget av oss — ingen brukerdata inn hit.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUKTURERTE_DATA) }}
      />
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 flex-col items-center px-5 pt-[10vh] pb-24 sm:px-8 sm:pt-[13vh]">
        <div className="w-full max-w-2xl">
          <h1 className="text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
            Hva skjer rundt deg?
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted text-pretty sm:text-xl">
            Se planer, bygging og andre endringer rundt en adresse – uten å lete i kommunale systemer.
          </p>

          <div className="mt-10 sm:mt-12">
            <SearchBox radius={DEFAULT_RADIUS_M} size="large" />
          </div>

          <p className="mt-6 text-sm text-muted">Offentlige data. Forklart enkelt.</p>

          <section className="mt-20" aria-labelledby="dekker">
            <h2 id="dekker" className="text-xl font-semibold tracking-[-0.02em]">
              Hva NaboRadar viser
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Søk opp en adresse, velg 500 meter, 1 kilometer eller 3 kilometer, og se hva som er offentlig kjent om
              området. Vi samler kildene og oppgir hvor hvert funn kommer fra. Vi vurderer dem ikke, og rangerer ingen
              steder.
            </p>
            <dl className="mt-6 space-y-4">
              {DEKKER.map(([tittel, tekst]) => (
                <div key={tittel}>
                  <dt className="text-[15px] font-medium text-ink">{tittel}</dt>
                  <dd className="mt-0.5 text-[15px] leading-relaxed text-muted">{tekst}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12" aria-labelledby="skolekrets">
            <h2 id="skolekrets" className="text-xl font-semibold tracking-[-0.02em]">
              Skolekrets i Oslo
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              For adresser i Oslo viser vi også hvilket veiledende inntaksområde for barneskole adressen ligger i.{" "}
              <Link href="/skolekrets" className="text-accent hover:underline">
                Finn hvilken skole adressen tilhører
              </Link>
              .
            </p>
          </section>

          <section className="mt-12" aria-labelledby="tilfluktsrom">
            <h2 id="tilfluktsrom" className="text-xl font-semibold tracking-[-0.02em]">
              Offentlige tilfluktsrom
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Vi viser også de offentlige tilfluktsrommene i nærheten, med avstand og antall plasser, fra
              Sivilforsvarets egne data.{" "}
              <Link href="/tilfluktsrom" className="text-accent hover:underline">
                Finn offentlige tilfluktsrom nær en adresse
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 py-6 text-xs text-muted sm:px-8">
        Stedsdata og kart © Kartverket
      </footer>
    </div>
  );
}
