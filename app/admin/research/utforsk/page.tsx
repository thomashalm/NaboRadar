import type { Metadata } from "next";
import { Datautforsker, type UtforskVisning } from "@/components/admin/Datautforsker";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { hentOmrade, lesUtsnitt, utsnittKm } from "@/lib/admin/explore/area";
import { tolkSok } from "@/lib/admin/explore/parse";
import { EXPLORE_DATASETS } from "@/lib/admin/explore/registry";
import type { ExploreArea, ExploreResult } from "@/lib/admin/explore/types";
import { getAdminSession } from "@/lib/admin/session";
import { municipalityNames } from "@/lib/geo/municipalities";
import { getMapTileConfig } from "@/lib/map/config";

export const metadata: Metadata = { title: "Utforsk data", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Større utsnitt enn dette er for mye for et datasett som krever område. */
const MAKS_UTSNITT_KM = 80;

const første = (verdi: string | string[] | undefined) => (Array.isArray(verdi) ? verdi[0] : verdi)?.trim() || undefined;

/**
 * Utforsk data: direkte utforsking av strukturerte datasett og kartlag, kart først.
 *
 * Research-oversikten er for funn noen har lagt inn og følger opp. Denne siden svarer på et
 * annet spørsmål: «hva finnes i dette datasettet, her?». Admin skriver «kvikkleire Oslo» eller
 * «datasenter», og treffene står i kartet og i listen ved siden av.
 *
 * Søket tolkes deterministisk (lib/admin/explore/parse.ts): et ord velger datasettet, resten er
 * et sted fra Kartverkets kommuneregister. Ingen AI, og ikke et fritekstsøk i hele databasen —
 * et søk som ikke treffer et datasett, sier det og foreslår dem som finnes.
 *
 * Alt er URL-drevet (`q`, `kommune`, `utsnitt`), så et søk kan bokmerkes. Dataene hentes på
 * serveren med admins egen sesjon; databasen håndhever `is_admin()` selv.
 */
export default async function UtforskDataPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Utforsk data" state={session.state} />;

  const params = await searchParams;
  const q = første(params.q) ?? "";
  const tolkning = tolkSok(q, EXPLORE_DATASETS, await municipalityNames(), første(params.kommune));
  const utsnitt = lesUtsnitt(første(params.utsnitt));
  const forslag = EXPLORE_DATASETS.map((d) => ({ id: d.id, label: d.label, description: d.description }));
  const felles = { q, tiles: getMapTileConfig(), forslag };

  if (!q) return <Datautforsker {...felles} visning={{ status: "tom" }} />;
  const dataset = tolkning.dataset;
  if (!dataset) return <Datautforsker {...felles} visning={{ status: "ukjent_datasett" }} />;

  const info = { id: dataset.id, label: dataset.label, description: dataset.description, unit: dataset.unit, needsArea: dataset.needsArea };

  if (tolkning.sted.status === "ukjent") {
    return <Datautforsker {...felles} visning={{ status: "ukjent_sted", dataset: info, tekst: tolkning.sted.tekst }} />;
  }
  if (tolkning.sted.status === "flertydig") {
    return (
      <Datautforsker
        {...felles}
        visning={{
          status: "flertydig_sted",
          dataset: info,
          tekst: tolkning.sted.tekst,
          valg: tolkning.sted.valg.map((s) => ({ nummer: s.number, navn: s.name, fylke: s.county })),
        }}
      />
    );
  }

  // Området: stedet i søket, ellers kartutsnittet, ellers hele landet (bare for små datasett).
  let area: ExploreArea | null = null;
  if (tolkning.sted.status === "ok") {
    try {
      area = await hentOmrade(tolkning.sted.sted);
    } catch {
      return <Datautforsker {...felles} visning={{ status: "feil", dataset: info, melding: `Kunne ikke hente grensen for ${tolkning.sted.sted.name} fra Kartverket akkurat nå.` }} />;
    }
  } else if (utsnitt) {
    const { bredde, hoyde } = utsnittKm(utsnitt);
    if (!dataset.needsArea || (bredde <= MAKS_UTSNITT_KM && hoyde <= MAKS_UTSNITT_KM)) {
      area = { kind: "utsnitt", name: null, county: null, box: utsnitt, polygon: null };
    }
  }

  if (dataset.needsArea && !area) {
    return <Datautforsker {...felles} visning={{ status: "trenger_omrade", dataset: info, utsnitt, maksKm: MAKS_UTSNITT_KM }} />;
  }

  let resultat: ExploreResult;
  try {
    resultat = await dataset.load(session.client, area);
  } catch (error) {
    resultat = { features: [], total: 0, error: error instanceof Error ? error.message : "ukjent feil" };
  }
  if (resultat.error) {
    return <Datautforsker {...felles} visning={{ status: "feil", dataset: info, melding: `Kunne ikke hente ${dataset.label.toLowerCase()}: ${resultat.error}` }} />;
  }

  const visning: UtforskVisning = {
    status: "treff",
    dataset: info,
    omrade: area ? { kind: area.kind, navn: area.name, fylke: area.county, box: area.box } : null,
    features: resultat.features,
    total: resultat.total,
    maksKm: MAKS_UTSNITT_KM,
  };
  return <Datautforsker {...felles} visning={visning} />;
}
