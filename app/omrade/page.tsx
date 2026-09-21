import type { Metadata } from "next";
import Link from "next/link";
import { AreaShell } from "@/components/area/AreaShell";
import { ChangeLocation } from "@/components/area/ChangeLocation";
import { EventsSection } from "@/components/area/EventsSection";
import { RadiusPicker } from "@/components/area/RadiusPicker";
import { AreaMap } from "@/components/map/AreaMap";
import { SearchBox } from "@/components/search/SearchBox";
import { areaParamsSchema } from "@/lib/area-params";
import { formatRadius } from "@/lib/format";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";
import { getMapTileConfig } from "@/lib/map/config";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FALLBACK_LABEL = "Valgt punkt";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const parsed = areaParamsSchema.safeParse(await searchParams);
  if (!parsed.success) return { title: "Område ikke funnet" };
  return { title: `${parsed.data.label ?? FALLBACK_LABEL} · innen ${formatRadius(parsed.data.radius)}` };
}

export default async function AreaPage({ searchParams }: { searchParams: SearchParams }) {
  const parsed = areaParamsSchema.safeParse(await searchParams);
  if (!parsed.success) return <InvalidArea />;

  const { lat, lng, radius } = parsed.data;
  const label = parsed.data.label ?? FALLBACK_LABEL;

  return (
    <AreaShell>
      <main className="lg:grid lg:grid-cols-[minmax(24rem,30rem)_1fr] lg:grid-rows-[auto_1fr]">
        <section className="px-5 pt-7 pb-6 sm:px-8 lg:col-start-1 lg:row-start-1 lg:px-10 lg:pt-12">
          <p className="text-[15px] font-medium text-muted">Dette skjer innen {formatRadius(radius)} fra</p>
          <h1 className="mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
            {label}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-3 sm:gap-x-3">
            <RadiusPicker lat={lat} lng={lng} radius={radius} label={parsed.data.label} />
            <ChangeLocation radius={radius} />
          </div>
        </section>

        <div className="mx-5 h-[48vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none lg:border-0 lg:border-l">
          <AreaMap lat={lat} lng={lng} radiusM={radius} label={label} tiles={getMapTileConfig()} />
        </div>

        <div className="px-5 pt-8 pb-16 sm:px-8 lg:col-start-1 lg:row-start-2 lg:px-10 lg:pt-4">
          <EventsSection radius={radius} />
        </div>
      </main>
    </AreaShell>
  );
}

function InvalidArea() {
  return (
    <AreaShell>
      <main className="mx-auto max-w-xl px-5 pt-[12vh] pb-24 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Vi klarte ikke å finne dette området.</h1>
        <p className="mt-3 text-lg text-muted">Lenken mangler en gyldig posisjon i Norge. Søk etter stedet på nytt.</p>
        <div className="mt-8">
          <SearchBox radius={DEFAULT_RADIUS_M} autoFocus />
        </div>
        <Link href="/" className="mt-6 inline-block text-[15px] font-medium text-accent hover:underline">
          Til forsiden
        </Link>
      </main>
    </AreaShell>
  );
}
