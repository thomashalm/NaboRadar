import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaShell } from "@/components/area/AreaShell";
import { HutDetails } from "@/components/huts/HutDetails";
import { HutPointMap } from "@/components/huts/HutPointMap";
import { buildHutHref, buildHutMapHref, hutRefFromSlug } from "@/lib/huts/href";
import { getHut, type Hut } from "@/lib/huts/queries";
import { HUT_TYPE_LABELS, formatHutDistance, hutIntroText, hutMetaDescription, hutPageTitle, hutPlaceLine, hutSummaryLine } from "@/lib/huts/wording";
import { getMapTileConfig } from "@/lib/map/config";

/**
 * Fast side for én hytte: /hytter/kobberhaughytta-3f2a9c1e.
 *
 * Adressen er delbar og overlever at hytta bytter navn — oppslaget skjer på ID-delen, og
 * navnet foran er pynt. `canonical` peker på adressen med gjeldende navn, så en gammel lenke
 * med gammelt navn ikke blir en egen side i søkemotorene.
 *
 * Indekseres. Bare hytter som vises offentlig har en side: avviste, skjulte og upubliserte gir
 * 404 (`get_hut` svarer ikke for dem), og 404 er noindex. En hytte som ikke er for allmennheten,
 * har en side, men er noindex og står ikke i sitemapen: den skal ikke promoteres som turhytte.
 */
type Props = { params: Promise<{ ref: string }> };

async function hent(params: Props["params"]) {
  const ref = hutRefFromSlug((await params).ref);
  return ref ? getHut(ref) : ({ status: "not_found" } as const);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resultat = await hent(params);
  if (resultat.status !== "ok") return { title: "Hytte ikke funnet", robots: { index: false, follow: true } };
  const { hut } = resultat;
  return {
    title: hutPageTitle(hut),
    description: hutMetaDescription(hut),
    alternates: { canonical: buildHutHref(hut) },
    ...(hut.access === "not_public" ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Strukturerte data: et sted med navn, posisjon og kommune. `Place`, ikke `LodgingBusiness` —
 * vi selger ikke overnatting og vet ikke om hytta er ledig eller hva den koster.
 */
function strukturerteData(hut: Hut) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: hut.name,
    geo: { "@type": "GeoCoordinates", latitude: hut.lat, longitude: hut.lng },
    ...(hut.municipalityName ? { containedInPlace: { "@type": "AdministrativeArea", name: hut.municipalityName } } : {}),
  };
}

export default async function HutPage({ params }: Props) {
  const resultat = await hent(params);
  if (resultat.status === "not_found") notFound();
  if (resultat.status === "unavailable") {
    return (
      <AreaShell>
        <main className="mx-auto max-w-xl px-5 pt-[12vh] pb-24 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Vi får ikke hentet hytta akkurat nå.</h1>
          <p className="mt-3 text-lg text-muted">Prøv igjen om litt.</p>
        </main>
      </AreaShell>
    );
  }
  const { hut, nearby } = resultat;
  const undertittel = [HUT_TYPE_LABELS[hut.type], hutPlaceLine(hut)].filter(Boolean).join(" · ");

  return (
    <AreaShell>
      <script
        type="application/ld+json"
        // Bygget av våre egne felt; navnet er escapet av JSON.stringify.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(strukturerteData(hut)).replace(/</g, "\\u003c") }}
      />
      <main className="lg:grid lg:grid-cols-[minmax(22rem,30rem)_1fr]">
        <section className="px-5 pt-7 pb-8 sm:px-8 lg:px-10 lg:pt-10 lg:pb-16">
          <p className="text-[13px] text-muted">
            <Link href="/hytter" className="hover:text-ink">
              Hytter og koier
            </Link>
          </p>
          <h1 className="mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{hut.name}</h1>
          {undertittel && <p className="mt-1.5 text-[15px] text-muted">{undertittel}</p>}
          {/* Bygget av de samme feltene som Fakta, i setninger. Rendres på serveren. */}
          <section aria-labelledby="hytte-kort" className="mt-6">
            <h2 id="hytte-kort" className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
              Kort om hytta
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">{hutIntroText(hut).join(" ")}</p>
          </section>
          <div className="mt-7">
            <HutDetails hut={hut} />
          </div>

          {nearby.length > 0 && (
            <section aria-labelledby="hytte-naboer" className="mt-7">
              <h2 id="hytte-naboer" className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                Andre hytter i nærheten
              </h2>
              <p className="mt-1 text-[13px] text-muted">Avstand i luftlinje fra {hut.name}.</p>
              <ul className="mt-2.5 divide-y divide-line rounded-2xl border border-line bg-surface">
                {nearby.map((nabo) => (
                  <li key={nabo.id}>
                    <Link href={buildHutHref(nabo)} className="flex items-baseline justify-between gap-4 px-4 py-2.5 hover:bg-ink/[0.03]">
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium text-ink">{nabo.name}</span>
                        <span className="block text-[13px] text-muted">{hutSummaryLine({ ...nabo, distanceM: null })}</span>
                      </span>
                      {nabo.distanceM != null && (
                        <span className="shrink-0 text-[13px] text-muted tabular-nums">{formatHutDistance(nabo.distanceM)}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                <Link
                  href={buildHutMapHref({ lat: hut.lat, lng: hut.lng, hutId: hut.id, from: hut.name })}
                  className="text-[15px] font-medium text-accent hover:underline"
                >
                  Se dem i kart
                </Link>
              </p>
            </section>
          )}
        </section>
        <div className="relative mx-5 mb-10 h-[50vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:sticky lg:top-16 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none lg:border-0 lg:border-l">
          {/* Samme naboer som i lista over: kartet og lista skal ikke vise to forskjellige sett. */}
          <HutPointMap hut={hut} neighbours={nearby} tiles={getMapTileConfig()} />
        </div>
      </main>
    </AreaShell>
  );
}
