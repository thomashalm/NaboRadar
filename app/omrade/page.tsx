import type { Metadata } from "next";
import Link from "next/link";
import { AreaShell } from "@/components/area/AreaShell";
import { AreaExplorer } from "@/components/area/AreaExplorer";
import { SkolekretsNotis } from "@/components/area/SkolekretsNotis";
import { SearchBox } from "@/components/search/SearchBox";
import { areaParamsSchema } from "@/lib/area-params";
import { formatRadius } from "@/lib/format";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";
import { getAreaEvents } from "@/lib/events/queries";
import { getAreaFacts } from "@/lib/facts/queries";
import { getMapTileConfig } from "@/lib/map/config";
import { withTimeout } from "@/lib/timeout";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FALLBACK_LABEL = "Valgt punkt";

/** Frister per kilde, satt ut fra målte svartider med god margin. */
const EVENT_TIMEOUT_MS = 8_000;
const DB_TIMEOUT_MS = 8_000;
/** Oppslagene har selv et budsjett på 8 s; dette er den ytre grensen. */
const LOOKUP_TIMEOUT_MS = 12_000;

/**
 * Resultatsiden er ett oppslag per adresse, ikke en side som skal stå alene i et
 * søkeresultat. Hver kombinasjon av lat, lng, radius, label og sortering er en ny URL, så
 * uten noindex ville vi tilbudt Google et ubegrenset antall nesten like sider — og gjort
 * privatadresser søkbare, som ikke er poenget med tjenesten.
 *
 * follow står på: lenkene herfra til saksidene skal fortsatt følges.
 */
const RESULTAT_ROBOTS = { index: false, follow: true } as const;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const parsed = areaParamsSchema.safeParse(await searchParams);
  if (!parsed.success) return { title: "Område ikke funnet", robots: RESULTAT_ROBOTS };
  return {
    title: `${parsed.data.label ?? FALLBACK_LABEL} · innen ${formatRadius(parsed.data.radius)}`,
    robots: RESULTAT_ROBOTS,
    alternates: { canonical: "/omrade" },
  };
}

export default async function AreaPage({ searchParams }: { searchParams: SearchParams }) {
  const parsed = areaParamsSchema.safeParse(await searchParams);
  if (!parsed.success) return <InvalidArea />;

  const { lat, lng, radius, sortering: sort } = parsed.data;

  /**
   * Ingen await her. Siden sendes med adresse, radius, kart og layout med én gang, og hver
   * kilde strømmer inn når den er ferdig. Tre strømmer, fordi de har helt ulik fart: målt på
   * Alnabru bruker databasen 0,1–1,8 s, mens de direkte oppslagene bruker opptil 5 s.
   */
  const events = withTimeout(getAreaEvents({ lat, lng, radius, sort }), EVENT_TIMEOUT_MS, () => ({
    status: "unavailable" as const,
    devReason: `Tidsavbrudd etter ${EVENT_TIMEOUT_MS} ms`,
  }));
  const storedFacts = withTimeout(getAreaFacts({ lat, lng, radius, sources: "db" }), DB_TIMEOUT_MS, () => ({
    status: "unavailable" as const,
    devReason: `Tidsavbrudd etter ${DB_TIMEOUT_MS} ms`,
  }));
  const lookupFacts = withTimeout(getAreaFacts({ lat, lng, radius, sources: "lookups" }), LOOKUP_TIMEOUT_MS, () => ({
    status: "unavailable" as const,
    devReason: `Tidsavbrudd etter ${LOOKUP_TIMEOUT_MS} ms`,
  }));

  return (
    <AreaShell>
      <AreaExplorer
        lat={lat}
        lng={lng}
        radius={radius}
        label={parsed.data.label ?? FALLBACK_LABEL}
        urlLabel={parsed.data.label}
        sort={sort}
        events={events}
        storedFacts={storedFacts}
        lookupFacts={lookupFacts}
        tiles={getMapTileConfig()}
        skolekrets={<SkolekretsNotis lat={lat} lng={lng} />}
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
