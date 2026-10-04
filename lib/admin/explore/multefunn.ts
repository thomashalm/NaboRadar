import "server-only";
import { MULTE_BOKS, MULTE_DEKNING, MULTEFUNN_PROVIDER } from "@/lib/multe/omrade";
import { dato, hentAreaFeatures, rader, tall, tekst, type AreaFeatureRad } from "./area-features";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Registrerte multefunn i Utforsk data. Internt researchlag, bare Oslo og Marka.
 *
 * Et funn er en observasjon: noen så planten der den dagen. Det sier ikke at den står der nå, og
 * ingenting om bær. Panelet sier det, og gjør ikke et gammelt funn til en bestand.
 * Bakgrunn: docs/research/multer-oslo.md.
 */
export const INTERNT = "Internt researchlag. Ikke offentlig.";
export const FUNN_FORBEHOLD = "Registrert observasjon – sier ikke noe sikkert om forekomst i dag.";
/** Fra denne alderen sier panelet uttrykkelig at funnet er gammelt. */
const ELDRE_ETTER_AAR = 10;

const MAANED = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

export const multefunnDataset: ExploreDataset = {
  id: "multefunn",
  label: "Multe: registrerte funn",
  unit: { one: "registrert funn", many: "registrerte funn" },
  queryWord: "multefunn",
  aliases: ["registrerte multefunn", "multefunn", "multer", "multe", "multebær", "molter", "molte"],
  // 500–600 punkter i hele dekningsområdet: kan vises uten sted.
  needsArea: false,
  policy: { openMap: "nei", omrade: "nei" },
  coverage: { label: MULTE_DEKNING, box: MULTE_BOKS },
  description: `Registrerte funn av multe fra GBIF (Artsobservasjoner, museer m.fl.), fra 2000 og med presisjon på 100 m eller bedre. Dekker bare ${MULTE_DEKNING}. ${FUNN_FORBEHOLD}`,

  async load(client, area) {
    const svar = await hentAreaFeatures(client, MULTEFUNN_PROVIDER, area ?? { kind: "utsnitt", name: null, county: null, box: MULTE_BOKS, polygon: null });
    if (svar.error) return { features: [], total: 0, error: svar.error };
    return {
      // Nyeste først: de sier mest om i dag.
      features: svar.rader.map((rad) => multefunnFeature(rad)).sort((a, b) => b.sort - a.sort || a.id.localeCompare(b.id)).map(({ sort: _sort, ...f }) => f),
      total: svar.total,
      error: null,
    };
  },
};

/** Eksportert for test. `iAar` er året «nå», så teksten om alder kan testes. */
export function multefunnFeature(rad: AreaFeatureRad, iAar = new Date().getFullYear()): Omit<ExploreFeature, "datasetId" | "datasetLabel"> & { sort: number } {
  const a = rad.attributes;
  const aar = tall(a.aar);
  const maaned = tall(a.maaned);
  const dag = dato(tekst(a.dato));
  const presisjon = tall(a.presisjonM);
  const datasett = tekst(a.datasett);
  const lisens = tekst(a.lisens);
  const iRuta = tall(a.funnIRuta);
  const naar = maaned && aar ? `${MAANED[maaned - 1]} ${aar}` : aar ? String(aar) : null;
  const gammelt = aar !== null && iAar - aar >= ELDRE_ETTER_AAR;

  return {
    id: rad.id,
    title: naar ? `Multefunn, ${naar}` : "Multefunn",
    kind: "Registrert funn",
    style: "multefunn",
    geometry: rad.geometry,
    center: rad.center.coordinates as [number, number],
    place: null,
    summary: [presisjon !== null ? `presisjon ${presisjon} m` : null, datasett].filter(Boolean).join(" · ") || null,
    details: rader([
      { label: "Art", value: "Multe (Rubus chamaemorus)" },
      dag ? { label: "Dato", value: dag } : null,
      aar ? { label: "Registreringsår", value: String(aar) } : null,
      presisjon !== null ? { label: "Presisjon", value: `${presisjon} m` } : null,
      tekst(a.type) ? { label: "Type", value: tekst(a.type)! } : null,
      datasett ? { label: "Datasett", value: datasett } : null,
      tekst(a.prosjekt) ? { label: "Prosjekt", value: tekst(a.prosjekt)! } : null,
      lisens ? { label: "Lisens", value: lisens } : null,
      iRuta !== null && iRuta > 1 ? { label: "Funn i samme 100 m-rute", value: `${iRuta} (det nyeste vises)` } : null,
      { label: "GBIF-ID", value: rad.external_id },
    ]),
    // Et gammelt funn tolkes ikke som en bestand. Det sies, det skjules ikke.
    explanation: gammelt ? `${FUNN_FORBEHOLD} Funnet er fra ${aar}: det sier lite om hva som står der nå.` : FUNN_FORBEHOLD,
    notice: INTERNT,
    sourceName: [datasett ?? "GBIF", datasett ? "via GBIF" : null, lisens ? `(${lisens})` : null].filter(Boolean).join(" "),
    sourceUrl: rad.source_url,
    href: null,
    hrefLabel: null,
    sort: (aar ?? 0) * 100 + (maaned ?? 0),
  };
}
