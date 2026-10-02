import Link from "next/link";
import { Suspense } from "react";
import { getHutsNear, type Hut } from "@/lib/huts/queries";
import { buildHutHref, buildHutMapHref } from "@/lib/huts/href";
import { HUT_SECTION_LABEL, HUT_SOURCE_NOTE, hutCountLine, hutDetailLines, hutSummaryLine } from "@/lib/huts/wording";
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
export function FriluftSeksjon({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Suspense fallback={null}>
      <FriluftInnhold lat={lat} lng={lng} />
    </Suspense>
  );
}

async function FriluftInnhold({ lat, lng }: { lat: number; lng: number }) {
  const resultat = await getHutsNear({ lat, lng });
  if (resultat.status !== "ok" || resultat.count === 0) return null;

  const kartHref = buildHutMapHref({ lat, lng });

  return (
    <div>
      <SectionShell label={HUT_SECTION_LABEL} id="friluft">
        <div className="rounded-2xl border border-line bg-surface">
          <p className="px-4 pt-3.5 text-[15px] font-medium text-ink">
            {hutCountLine(resultat.count, resultat.radiusM, resultat.capped)}
          </p>
          <ul className="mt-1.5 divide-y divide-line">
            {resultat.cards.map((hut) => (
              <HytteKort key={hut.id} hut={hut} href={buildHutHref(hut)} />
            ))}
          </ul>
          <div className="border-t border-line px-4 py-3">
            <Link href={kartHref} className="text-[15px] font-medium text-accent hover:underline">
              {resultat.count > resultat.cards.length ? "Se alle i kart" : "Se i kart"}
            </Link>
            <p className="mt-1.5 text-[13px] leading-snug text-muted">{HUT_SOURCE_NOTE}</p>
          </div>
        </div>
      </SectionShell>
    </div>
  );
}

function HytteKort({ hut, href }: { hut: Hut; href: string }) {
  const detaljer = hutDetailLines(hut);
  return (
    <li>
      <Link href={href} className="block px-4 py-2.5 hover:bg-ink/[0.03]">
        <span className="block text-[15px] font-medium text-ink">{hut.name}</span>
        <span className="block text-[13px] text-muted">{hutSummaryLine(hut)}</span>
        {detaljer.length > 0 && <span className="block text-[13px] text-muted">{detaljer.slice(0, 2).join(" · ")}</span>}
        {/* Ingen knapp på kortet: lenken til den som driver hytta står på hyttas egen side. */}
      </Link>
    </li>
  );
}
