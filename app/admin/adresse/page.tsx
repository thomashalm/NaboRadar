import type { Metadata } from "next";
import Link from "next/link";
import { AreaExplorer } from "@/components/area/AreaExplorer";
import { AreaShell } from "@/components/area/AreaShell";
import { SkolekretsNotis } from "@/components/area/SkolekretsNotis";
import { InternSeksjon } from "@/components/admin/InternSeksjon";
import { SearchBox } from "@/components/search/SearchBox";
import { areaParamsSchema } from "@/lib/area-params";
import { buildAreaView } from "@/lib/area-view";
import { getAdminSession } from "@/lib/admin/session";
import { getAreaResearch } from "@/lib/admin/area-research";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";
import { getMapTileConfig } from "@/lib/map/config";

export const metadata: Metadata = { title: "Adressesøk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FALLBACK_LABEL = "Valgt punkt";

/**
 * Adressesøk for drift.
 *
 * Dette er **ikke** en egen implementasjon av resultatsiden. Det er den samme
 * `AreaExplorer` som /omrade bruker, med de samme kildene fra `buildAreaView`, pluss intern
 * research i `extraSections`-sømmen. En endring i den offentlige visningen slår derfor
 * gjennom her av seg selv — det er hele poenget med oppdelingen.
 *
 * Tilgangen håndheves her og i databasen, ikke ved at lenken er skjult.
 */
export default async function AdminAddressPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang state={session.state} />;

  const parsed = areaParamsSchema.safeParse(await searchParams);
  if (!parsed.success) return <Søk />;

  const { lat, lng, radius, sortering: sort } = parsed.data;
  const { events, storedFacts, lookupFacts } = buildAreaView({ lat, lng, radius, sort });
  const research = await getAreaResearch(session.client, { lat, lng, radiusM: radius });

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
        extraSections={<InternSeksjon research={research} />}
      />
    </AreaShell>
  );
}

function Søk() {
  return (
    <AreaShell>
      <main className="mx-auto max-w-xl px-5 pt-[12vh] pb-24 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Drift</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Adressesøk</h1>
        <p className="mt-3 text-lg text-muted">
          Samme resultat som brukeren ser, med intern research under.
        </p>
        <div className="mt-8">
          <SearchBox radius={DEFAULT_RADIUS_M} autoFocus />
        </div>
        <Link href="/admin" className="mt-6 inline-block text-[15px] font-medium text-accent hover:underline">
          Til driftssiden
        </Link>
      </main>
    </AreaShell>
  );
}

function IkkeTilgang({ state }: { state: "unconfigured" | "signed-out" | "not-admin" }) {
  return (
    <AreaShell>
      <main className="mx-auto max-w-xl px-5 pt-[12vh] pb-24 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Adressesøk</h1>
        <p className="mt-3 text-lg text-muted">
          {state === "signed-out" ? "Logg inn for å bruke driftssidene." : "Denne siden krever driftstilgang."}
        </p>
        <Link href="/admin" className="mt-6 inline-block text-[15px] font-medium text-accent hover:underline">
          Til innlogging
        </Link>
      </main>
    </AreaShell>
  );
}
