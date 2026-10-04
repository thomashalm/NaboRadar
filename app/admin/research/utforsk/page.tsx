import type { Metadata } from "next";
import { Datautforsker } from "@/components/admin/Datautforsker";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { EXPLORE_DATASETS } from "@/lib/admin/explore/registry";
import { byggVisning } from "@/lib/admin/explore/visning";
import { getAdminSession } from "@/lib/admin/session";
import { getMapTileConfig } from "@/lib/map/config";

export const metadata: Metadata = { title: "Utforsk data", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const første = (verdi: string | string[] | undefined) => (Array.isArray(verdi) ? verdi[0] : verdi)?.trim() || undefined;

/**
 * Utforsk data: direkte utforsking av strukturerte datasett og kartlag, kart først.
 *
 * Research-oversikten er for funn noen har lagt inn og følger opp. Denne siden svarer på et
 * annet spørsmål: «hva finnes i dette datasettet, her?». Admin skriver «planer Bærum» eller
 * «datasenter», og treffene står i kartet og i listen ved siden av.
 *
 * Søket tolkes deterministisk (lib/admin/explore/parse.ts): et ord velger datasettet, resten er
 * et sted fra Kartverkets kommuneregister. Ingen AI, og ikke et fritekstsøk i hele databasen —
 * et søk som ikke treffer et datasett, sier det og foreslår dem som finnes.
 *
 * TO LAG. Søket velger hovedlaget; `lag=<id>` legger til ett til. Begge leses for samme område,
 * samtidig, og ligger i samme kart. Høyst to — dette er kontrollert research, ikke et GIS. Siden
 * sier ingenting om hvordan lagene forholder seg til hverandre: det er brukeren som ser.
 *
 * Alt er URL-drevet (`q`, `kommune`, `utsnitt`, `lag`, `analyse`), så et søk kan bokmerkes. Dataene hentes
 * på serveren med admins egen sesjon; databasen håndhever `is_admin()` selv.
 */
export default async function UtforskDataPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Utforsk data" state={session.state} />;

  const params = await searchParams;
  const q = første(params.q) ?? "";
  const visning = await byggVisning(session.client, {
    q,
    kommune: første(params.kommune),
    utsnitt: første(params.utsnitt),
    lag: første(params.lag),
    analyse: første(params.analyse),
  });
  const forslag = EXPLORE_DATASETS.map((d) => ({ id: d.id, label: d.label, description: d.description }));
  return <Datautforsker q={q} tiles={getMapTileConfig()} forslag={forslag} visning={visning} />;
}
