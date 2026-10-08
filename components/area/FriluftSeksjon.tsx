import Link from "next/link";
import { cache, Suspense } from "react";
import { getHutsNear, type Hut } from "@/lib/huts/queries";
import { formatRadius } from "@/lib/format";
import { buildHutHref, buildHutMapHref } from "@/lib/huts/href";
import type { FriluftPoint } from "@/lib/huts/map-points";
import { HUT_SECTION_LABEL, hutCountLine, hutDetailLines, hutStatusBadge, hutSummaryLine } from "@/lib/huts/wording";
import { SectionShell } from "./SectionShell";

/**
 * «Friluft i nærheten»: hytter og koier rundt adressen.
 *
 * Bevisst liten. Dette er ikke en turside — den skal vise at det finnes noe i nærheten man
 * kanskje ikke visste om, og sende brukeren videre til kartet. Derfor noen få kort og én
 * lenke, ikke en liste.
 *
 * Seksjonen har sin egen radius, uavhengig av den brukeren har valgt for resten av siden:
 * en hytte en mil unna er i nærheten, et byggeprosjekt en mil unna er det ikke. Se
 * `HUT_NEARBY` i lib/huts/queries.ts.
 *
 * Rendres på serveren og vises ikke i det hele tatt når det ikke finnes hytter, når
 * kategorien ikke er publisert, eller når oppslaget feiler. Fravær av data er ikke et svar.
 */
/** Seksjonen og oversiktslinjen spør om det samme. Ett oppslag per forespørsel. */
const hutsNear = cache((lat: number, lng: number) => getHutsNear({ lat, lng }));

/**
 * Én linje til temaoversikten: «9 hytter og koier innen 10 km». Rendrer ingenting når det ikke
 * finnes noe — da skjuler oversikten hele raden (`data-finnes`).
 */
export function FriluftOppsummering({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Suspense fallback={null}>
      <FriluftLinje lat={lat} lng={lng} />
    </Suspense>
  );
}

async function FriluftLinje({ lat, lng }: { lat: number; lng: number }) {
  const resultat = await hutsNear(lat, lng);
  if (resultat.status !== "ok" || resultat.count === 0) return null;
  return <span data-finnes>{hutCountLine(resultat.count, resultat.radiusM, resultat.capped)}</span>;
}

/**
 * De samme hyttene som kartpunkter, til temaet «Friluft» i kartet. Tom liste når det ikke
 * finnes noe eller oppslaget feiler — kartet viser da bare søkepunktet.
 */
export async function friluftKartpunkter(lat: number, lng: number): Promise<FriluftPoint[]> {
  const resultat = await hutsNear(lat, lng);
  if (resultat.status !== "ok") return [];
  return resultat.cards.map((hut) => ({
    id: `hytte:${hut.id}`,
    name: hut.name,
    center: [hut.lng, hut.lat],
    lines: [hutSummaryLine(hut)],
    href: buildHutHref(hut),
  }));
}

export function FriluftSeksjon({ lat, lng, label }: { lat: number; lng: number; /** Adressen, slik den står i overskriften. */ label?: string }) {
  return (
    <Suspense fallback={null}>
      <FriluftInnhold lat={lat} lng={lng} label={label} />
    </Suspense>
  );
}

async function FriluftInnhold({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const resultat = await hutsNear(lat, lng);
  if (resultat.status !== "ok" || resultat.count === 0) return null;

  // Kartet åpnes i samme radius som hyttene er talt opp i, og med adressen som utgangspunkt.
  const kartHref = buildHutMapHref({ lat, lng, from: label ?? "valgt sted", radiusM: resultat.radiusM });

  return (
    <SectionShell label={HUT_SECTION_LABEL} id="friluft" hideLabel>
      <p className="text-[17px] leading-snug font-semibold text-ink">
        {hutCountLine(resultat.count, resultat.radiusM, resultat.capped)}
      </p>
      {/* Friluft har sin egen radius. Den vanlige velgeren (500 m / 1 km / 3 km) er skjult her. */}
      <p className="type-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full bg-sunken px-2.5 py-0.5 font-medium text-muted">Søker innen {formatRadius(resultat.radiusM)}</span>
        <span>Luftlinje fra adressen. Friluft har egen radius.</span>
      </p>
      <ul className="mt-2 divide-y divide-line">
        {resultat.cards.map((hut) => (
          <HytteKort key={hut.id} hut={hut} href={buildHutHref(hut)} />
        ))}
      </ul>
      <p className="mt-1 flex flex-wrap items-center justify-between gap-x-4">
        <Link href={kartHref} className="link inline-flex min-h-11 items-center text-[15px]">
          {resultat.count > resultat.cards.length ? "Se alle i kart" : "Se i kart"} →
        </Link>
        <span className="type-meta">Kilde: Kartverket</span>
      </p>
    </SectionShell>
  );
}

function HytteKort({ hut, href }: { hut: Hut; href: string }) {
  const detaljer = hutDetailLines(hut);
  // En midlertidig stengt hytte vises fortsatt — det er nyttig å vite at den finnes — men ikke
  // som en vanlig tilgjengelig turhytte.
  const status = hutStatusBadge(hut.accessStatus);
  return (
    <li>
      <Link href={href} className="-mx-2 block rounded-control px-2 py-2.5 hover:bg-sunken">
        <span className="block text-[15px] font-medium text-ink">{hut.name}</span>
        <span className="type-meta block">{hutSummaryLine(hut)}</span>
        {status ? (
          <span className="block text-sm font-medium text-ink">{status}</span>
        ) : (
          detaljer.length > 0 && <span className="type-meta block">{detaljer.slice(0, 2).join(" · ")}</span>
        )}
        {/* Ingen knapp på kortet: lenken til den som driver hytta står på hyttas egen side. */}
      </Link>
    </li>
  );
}
