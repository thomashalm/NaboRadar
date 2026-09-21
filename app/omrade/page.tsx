import type { Metadata } from "next";
import Link from "next/link";
import { AreaShell } from "@/components/area/AreaShell";
import { AreaExplorer } from "@/components/area/AreaExplorer";
import { SearchBox } from "@/components/search/SearchBox";
import { areaParamsSchema } from "@/lib/area-params";
import { formatRadius } from "@/lib/format";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";
import { getAreaEvents } from "@/lib/events/queries";
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

  const { lat, lng, radius, sortering: sort } = parsed.data;
  const result = await getAreaEvents({ lat, lng, radius, sort });

  return (
    <AreaShell>
      <AreaExplorer
        lat={lat}
        lng={lng}
        radius={radius}
        label={parsed.data.label ?? FALLBACK_LABEL}
        urlLabel={parsed.data.label}
        sort={sort}
        result={result}
        tiles={getMapTileConfig()}
      />
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
