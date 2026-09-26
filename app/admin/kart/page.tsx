import type { Metadata } from "next";
import { getAdminSession } from "@/lib/admin/session";
import { hentKartpunkter } from "@/lib/admin/research-map-query";
import { lesFilter } from "@/lib/admin/research-map-filters";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { ResearchKart } from "@/components/admin/ResearchKart";
import { getMapTileConfig } from "@/lib/map/config";

export const metadata: Metadata = { title: "Research-kart", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Research-kartet: hele den interne basen utforsket geografisk.
 *
 * Den tredje admin-flaten, og den skiller seg fra de to andre på spørsmålet den svarer på.
 * /admin/adresse spør «hva finnes rundt denne adressen?», /admin/research «hva vet vi om dette
 * funnet?», og denne «hvor i landet finnes denne typen funn?».
 *
 * Filtrene leses fra URL-en, så et utsnitt kan bokmerkes og deles.
 */
export default async function ResearchKartPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Research-kart" state={session.state} />;

  const filter = lesFilter(await searchParams);
  const resultat = await hentKartpunkter(session.client, filter);

  return <ResearchKart filter={filter} resultat={resultat} tiles={getMapTileConfig()} />;
}
