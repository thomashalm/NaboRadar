import type { EventType } from "@/types/event";

/** Kort kategori-etikett. Beskriver hva kilden sier — ikke status. */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  planning_started: "Planoppstart",
  building_case: "Byggesak",
  regulation: "Reguleringsplan",
  regulation_hearing: "Høring",
  road_work: "Veiarbeid",
  public_hearing: "Høring",
};

/** Datoformulering per type. Planoppstart: vi vet at oppstart ble varslet, ikke om arbeidet pågår. */
export const EVENT_DATE_LABELS: Record<EventType, string> = {
  planning_started: "Planoppstart varslet",
  building_case: "Registrert",
  regulation: "Vedtatt",
  regulation_hearing: "Publisert",
  road_work: "Publisert",
  public_hearing: "Publisert",
};

/** Visningsnavn for DiBK-dokumenttyper på allowlisten. */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  "ref-data-as-pdf": "Varsel om oppstart av planarbeid",
  PlanomraadePdf: "Kart over planområdet",
  ReferatOppstartsmoete: "Referat fra oppstartsmøte",
};

export function documentFormatLabel(mimeType: string | null): string | null {
  if (!mimeType) return null;
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Bilde";
  return null;
}

/** Hvem som eier kilden, for lenketekst og kildehenvisning. */
export const PROVIDER_SOURCE_NAMES: Record<string, string> = {
  "dibk-planning-started": "Direktoratet for byggkvalitet",
};
