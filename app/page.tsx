import Link from "next/link";
import { ProductPreview } from "@/components/site/ProductPreview";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SearchBox } from "@/components/search/SearchBox";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";
import { hutsArePublic } from "@/lib/huts/queries";
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
        "Offentlige data om området rundt en norsk adresse, for deg som skal kjøpe bolig: skoler, støy, naturfare, infrastruktur og nye planer.",
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

/**
 * Det siden faktisk dekker, ordnet slik en boligkjøper spør — ikke slik datasettene heter.
 * Står som tekst, ikke bare som noe kartet tegner. Hvert punkt er noe resultatsiden viser i dag.
 */
const TEMAER = [
  {
    tittel: "Hva kan endre seg",
    ingress: "Det som er varslet, men ikke bygget.",
    punkter: [["Planer og saker", "Varslede planoppstarter fra Direktoratet for byggkvalitet, med planområdet i kart."]],
  },
  {
    tittel: "Hvordan er det ved adressen",
    ingress: "Forhold som gjelder selve stedet.",
    punkter: [
      ["Støy", "Beregnede støysoner fra veg, fly og strategisk støykartlegging."],
      ["Naturfare", "Kartlagte kvikkleiresoner og aktsomhetsområder fra NVE."],
      ["Skolekrets i Oslo", "Hvilket veiledende inntaksområde for barneskole en adresse i Oslo ligger i."],
    ],
  },
  {
    tittel: "Hva finnes i nærheten",
    ingress: "Steder og anlegg innenfor radien du velger.",
    punkter: [
      ["Nærområdet", "Skoler, barnehager, sykehus, omsorgstilbud, industri og steder med skjenkebevilling."],
      ["Infrastruktur", "Transformatorstasjoner og kraftledninger fra NVE."],
      ["Tilfluktsrom", "Offentlige tilfluktsrom i nærheten, med avstand og antall plasser, fra Sivilforsvarets data."],
    ],
  },
] as const;

/** Siste punkt i «Hva finnes i nærheten». Står bare når hyttekategorien er publisert. */
const HYTTER = [
  "Hytter og koier",
  "Turisthytter, koier og rastebuer fra Kartverket, med forvalter, tilgang og mer informasjon der det finnes.",
] as const;

// Lenken til hyttekartet og raden over følger publiseringen av kategorien. Siden bygges på nytt høyst hvert
// femte minutt, så lenken dukker opp kort tid etter at hyttene er lansert.
export const revalidate = 300;

export default async function HomePage() {
  const visHytter = await hutsArePublic();
  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        // Ren, statisk JSON bygget av oss — ingen brukerdata inn hit.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUKTURERTE_DATA) }}
      />
      <SiteHeader />

      <main className="flex-1">
        {/* Første skjermbilde: hva dette er, søket, og et eksempel på hva man får. */}
        <section className="border-b border-line bg-accent-tint">
          <div className="gutter mx-auto grid w-full max-w-page items-center gap-x-14 gap-y-12 pt-12 pb-14 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:pt-20 lg:pb-24">
            <div>
              <h1 className="type-display max-w-2xl text-ink">
                Sjekk hva som finnes og skjer rundt boligen før du kjøper.
              </h1>
              <p className="type-lead mt-5 max-w-xl">
                NaboRadar samler offentlige data om området rundt en adresse – fra skoler og støy til naturfare og nye
                planer.
              </p>

              <div className="mt-8 max-w-xl">
                <SearchBox radius={DEFAULT_RADIUS_M} size="large" />
                <p className="type-meta mt-3">Planer · Støy · Naturfare · Skoler · Infrastruktur</p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md lg:max-w-none">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section aria-labelledby="dekker">
          <div className="gutter mx-auto w-full max-w-page py-14 sm:py-16">
            <div className="max-w-2xl">
              <h2 id="dekker" className="type-h1 text-ink">
                Det du bør vite om området
              </h2>
              <p className="type-lead mt-3">
                Søk opp en adresse, velg 500 meter, 1 kilometer eller 3 kilometer, og se hva som er offentlig kjent om
                området.
              </p>
            </div>

            <div className="mt-9 grid gap-x-10 gap-y-9 lg:grid-cols-3">
              {TEMAER.map((tema, index) => {
                const punkter = [...tema.punkter, ...(visHytter && index === TEMAER.length - 1 ? [HYTTER] : [])];
                return (
                  <div key={tema.tittel} className="border-t border-ink/15 pt-5">
                    <h3 className="type-h2 flex items-center gap-2.5 text-ink">
                      <span aria-hidden="true" className="h-4 w-1 rounded-full bg-accent" />
                      {tema.tittel}
                    </h3>
                    <p className="type-meta mt-1">{tema.ingress}</p>
                    <dl className="mt-4 space-y-4">
                      {punkter.map(([tittel, tekst]) => (
                        <div key={tittel}>
                          <dt className="text-[15px] font-semibold text-ink">{tittel}</dt>
                          <dd className="type-support mt-0.5">{tekst}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="gutter mx-auto grid w-full max-w-page gap-x-12 gap-y-9 py-12 sm:py-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="max-w-measure">
              <h2 className="type-h2 text-ink">Offentlige data. Forklart enkelt.</h2>
              <p className="type-body mt-3 text-muted">
                Vi samler kildene og oppgir hvor hvert funn kommer fra. Vi vurderer dem ikke, og rangerer ingen
                steder.
              </p>
            </div>

            {/* Sekundær navigasjon til spesialverktøyene. Rene lenker; hver er en trykkflate på 44 px.
                Hyttelenken følger publiseringen av kategorien. */}
            <nav aria-labelledby="utforsk-mer">
              <h2 id="utforsk-mer" className="text-sm font-semibold text-subtle">
                Flere verktøy
              </h2>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {[
                  // Skolekrets dekker foreløpig bare Oslo, og lenketeksten skal si det.
                  ["/skolekrets", "Finn skolekrets i Oslo"],
                  ["/tilfluktsrom", "Finn tilfluktsrom"],
                  ...(visHytter ? [["/hytter", "Se hytter og koier"]] : []),
                ].map(([href, tekst]) => (
                  <li key={href}>
                    <Link
                      href={href!}
                      className="group flex min-h-12 items-center justify-between gap-3 text-[15px] font-medium text-ink hover:text-accent"
                    >
                      {tekst}
                      <span aria-hidden="true" className="text-subtle group-hover:text-accent">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>
    </div>
  );
}
