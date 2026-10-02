import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaShell } from "@/components/area/AreaShell";
import { HutDetails } from "@/components/huts/HutDetails";
import { HutPointMap } from "@/components/huts/HutPointMap";
import { buildHutHref, buildHutMapHref, hutRefFromSlug } from "@/lib/huts/href";
import { getHut } from "@/lib/huts/queries";
import { HUT_TYPE_LABELS } from "@/lib/huts/wording";
import { getMapTileConfig } from "@/lib/map/config";

/**
 * Fast side for én hytte: /hytter/kobberhaughytta-3f2a9c1e.
 *
 * Adressen er delbar og overlever at hytta bytter navn — oppslaget skjer på ID-delen, og
 * navnet foran er pynt. Siden er noindex så lenge datasettet er en pilot; `canonical` peker
 * allerede på adressen med gjeldende navn, så den kan åpnes for indeksering uten ombygging.
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
  const type = HUT_TYPE_LABELS[hut.type]?.toLowerCase() ?? "hytte";
  return {
    title: hut.name,
    description: `${hut.name} er en ${type}${hut.municipalityName ? ` i ${hut.municipalityName}` : ""}. Se hvor den ligger og hvem som driver den.`,
    robots: { index: false, follow: true },
    alternates: { canonical: buildHutHref(hut) },
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
  const { hut } = resultat;

  return (
    <AreaShell>
      <main className="lg:grid lg:grid-cols-[minmax(22rem,30rem)_1fr]">
        <section className="px-5 pt-7 pb-8 sm:px-8 lg:px-10 lg:pt-10 lg:pb-16">
          <p className="text-[13px] text-muted">
            <Link href="/hytter" className="hover:text-ink">
              Hytter og koier
            </Link>
          </p>
          <h1 className="mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{hut.name}</h1>
          <div className="mt-6">
            <HutDetails hut={hut} />
          </div>
          <p className="mt-6">
            <Link href={buildHutMapHref({ lat: hut.lat, lng: hut.lng, hutId: hut.id })} className="text-[15px] font-medium text-accent hover:underline">
              Se andre hytter i nærheten
            </Link>
          </p>
        </section>
        <div className="relative mx-5 mb-10 h-[50vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:sticky lg:top-16 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none lg:border-0 lg:border-l">
          <HutPointMap hut={hut} tiles={getMapTileConfig()} />
        </div>
      </main>
    </AreaShell>
  );
}
