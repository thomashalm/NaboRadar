import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AreaShell } from "@/components/area/AreaShell";
import { AreaExplorer } from "@/components/area/AreaExplorer";
import { FriluftOppsummering, FriluftSeksjon, friluftKartpunkter } from "@/components/area/FriluftSeksjon";
import { SkolekretsNotis } from "@/components/area/SkolekretsNotis";
import { SearchBox } from "@/components/search/SearchBox";
import { addressLabel, addressQuerySchema, resolveAddressMatch, type AddressMatch } from "@/lib/area-address";
import { areaParamsSchema, buildAreaHref } from "@/lib/area-params";
import { buildAreaView } from "@/lib/area-view";
import { formatRadius } from "@/lib/format";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";
import { geocoder } from "@/lib/geocoding";
import { GeocodingUnavailableError } from "@/lib/geocoding/types";
import { getMapTileConfig } from "@/lib/map/config";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FALLBACK_LABEL = "Valgt punkt";

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
  const params = await searchParams;
  const parsed = areaParamsSchema.safeParse(params);
  if (!parsed.success) {
    const harAdresse = addressQuerySchema.safeParse(params.adresse).success;
    return { title: harAdresse ? "Finn adressen" : "Område ikke funnet", robots: RESULTAT_ROBOTS };
  }
  return {
    title: `${parsed.data.label ?? FALLBACK_LABEL} · innen ${formatRadius(parsed.data.radius)}`,
    robots: RESULTAT_ROBOTS,
    alternates: { canonical: "/omrade" },
  };
}

export default async function AreaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const parsed = areaParamsSchema.safeParse(params);
  if (!parsed.success) {
    // Adressebasert dyplenke (lib/area-address.ts). Koordinater i URL-en vinner alltid.
    const adresse = addressQuerySchema.safeParse(params.adresse);
    if (!adresse.success) return <InvalidArea />;
    const treff = await lookupAddress(adresse.data);
    if (treff.kind === "match") {
      const { latitude: lat, longitude: lng } = treff.location;
      redirect(buildAreaHref({ lat, lng, radius: DEFAULT_RADIUS_M, label: addressLabel(treff.location) }));
    }
    return <AddressNotResolved adresse={adresse.data} treff={treff} />;
  }

  const { lat, lng, radius, sortering: sort, vis: tool } = parsed.data;

  const { events, storedFacts, lookupFacts } = buildAreaView({
    lat,
    lng,
    radius,
    sort,
    nearestShelters: tool === "tilfluktsrom",
  });

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
        tool={tool}
        skolekrets={<SkolekretsNotis lat={lat} lng={lng} fraVerktoy={tool === "skolekrets"} />}
        friluft={<FriluftSeksjon lat={lat} lng={lng} label={parsed.data.label} />}
        friluftSummary={<FriluftOppsummering lat={lat} lng={lng} />}
        friluftPoints={friluftKartpunkter(lat, lng)}
      />
    </AreaShell>
  );
}

type AddressLookup = AddressMatch | { kind: "unavailable" };

async function lookupAddress(adresse: string): Promise<AddressLookup> {
  try {
    return resolveAddressMatch(adresse, await geocoder.search(adresse));
  } catch (error) {
    if (!(error instanceof GeocodingUnavailableError)) {
      console.error("[omrade] adresseoppslag feilet", error instanceof Error ? error.name : "ukjent");
    }
    return { kind: "unavailable" };
  }
}

/** Adressen i lenken ga ikke nøyaktig ett treff. Vi velger ikke for brukeren. */
function AddressNotResolved({ adresse, treff }: { adresse: string; treff: Exclude<AddressLookup, { kind: "match" }> }) {
  const kandidater = treff.kind === "candidates" ? treff.candidates : [];
  return (
    <AreaShell>
      <main className="gutter mx-auto max-w-measure pt-[10vh] pb-24">
        <h1 className="type-h1 text-ink">
          {kandidater.length > 0 ? "Hvilken adresse mente du?" : "Vi fant ikke denne adressen."}
        </h1>
        <p className="type-lead mt-4">
          {treff.kind === "unavailable"
            ? "Adressesøket svarer ikke akkurat nå. Prøv igjen om litt, eller søk etter stedet her."
            : kandidater.length > 0
              ? `«${adresse}» passer ikke med nøyaktig én registrert adresse.`
              : `«${adresse}» finnes ikke i adresseregisteret slik den er skrevet. Søk etter stedet her.`}
        </p>
        {kandidater.length > 0 && (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {kandidater.map((k) => (
              <li key={k.id}>
                <Link
                  href={buildAreaHref({
                    lat: k.latitude,
                    lng: k.longitude,
                    radius: DEFAULT_RADIUS_M,
                    label: addressLabel(k),
                  })}
                  className="group flex min-h-14 items-center justify-between gap-3 py-3"
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-ink group-hover:text-accent">{k.label}</span>
                    <span className="type-meta block">{k.subtitle}</span>
                  </span>
                  <span aria-hidden="true" className="text-subtle group-hover:text-accent">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          <SearchBox radius={DEFAULT_RADIUS_M} />
        </div>
        <Link href="/" className="link mt-6 inline-flex min-h-11 items-center text-[15px]">
          Til forsiden
        </Link>
      </main>
    </AreaShell>
  );
}

function InvalidArea() {
  return (
    <AreaShell>
      <main className="gutter mx-auto max-w-measure pt-[10vh] pb-24">
        <h1 className="type-h1 text-ink">Vi klarte ikke å finne dette området.</h1>
        <p className="type-lead mt-4">Lenken mangler en gyldig posisjon i Norge. Søk etter stedet på nytt.</p>
        <div className="mt-8">
          <SearchBox radius={DEFAULT_RADIUS_M} autoFocus />
        </div>
        <Link href="/" className="link mt-6 inline-flex min-h-11 items-center text-[15px]">
          Til forsiden
        </Link>
      </main>
    </AreaShell>
  );
}
