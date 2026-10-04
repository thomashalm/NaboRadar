import type { Metadata } from "next";
import Link from "next/link";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { getAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Utforsk data", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Utforsk data: inngangen til de strukturerte datasettene.
 *
 * Research-oversikten er for funn noen har lagt inn for hånd. Denne siden er for det motsatte:
 * kartlag og registre NaboRadar synker eller slår opp — kvikkleire, støy, tilfluktsrom, hytter,
 * planer — der spørsmålet er «hva finnes i datasettet for denne kommunen?».
 *
 * Foreløpig bare en plassholder, slik at inngangen fra research-siden har et sted å peke.
 * Ingen søk og ingen data her ennå; det bygges som egen runde.
 */
export default async function UtforskDataPage() {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Utforsk data" state={session.state} />;

  return (
    <main className="mx-auto max-w-3xl px-5 pt-10 pb-24 sm:px-8">
      <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Drift</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Utforsk data</h1>
      <p className="mt-3 text-[15px] text-muted">
        Her skal du kunne søke i NaboRadars strukturerte datasett: kartlag og registre, avgrenset på datasett og
        kommune eller fylke, med treffene som liste og i kart.
      </p>
      <p className="mt-6 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
        Siden er ikke bygget ennå. Til den er på plass, kan du slå opp en adresse i{" "}
        <Link href="/admin/adresse" className="text-accent hover:underline">
          adressesøket
        </Link>{" "}
        eller se internt kart i{" "}
        <Link href="/admin/kart" className="text-accent hover:underline">
          kartvisningen
        </Link>
        .
      </p>
      <Link href="/admin/research" className="mt-10 inline-block text-[15px] font-medium text-accent hover:underline">
        Til research
      </Link>
    </main>
  );
}
