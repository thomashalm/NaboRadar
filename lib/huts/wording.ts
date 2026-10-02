import type { HutOvernight, HutOwnerKind, HutType } from "./types";

/**
 * Ordlyden for hytter og koier. All tekst som beskriver en hytte kommer herfra, slik at kort,
 * kart og søk sier det samme — og ingen av dem sier mer enn kilden gjør.
 */

export const HUT_SECTION_LABEL = "Friluft i nærheten";

/** Typen slik kilden klassifiserer hytta. `unknown` og `other` får ingen merkelapp. */
export const HUT_TYPE_LABELS: Record<HutType, string | null> = {
  staffed_hut: "Betjent hytte",
  self_service_hut: "Selvbetjent hytte",
  unstaffed_hut: "Ubetjent hytte",
  rest_cabin: "Rastebu",
  open_cabin: "Åpen koie",
  day_trip_hut: "Dagsturhytte",
  emergency_shelter: "Nødbu",
  other: null,
  unknown: null,
};

/** Eierkategorien. «Andre» i kilden betyr uspesifisert, så den vises ikke som en eier. */
export const HUT_OWNER_LABELS: Record<HutOwnerKind, string | null> = {
  dnt: "DNT",
  statskog: "Statskog",
  fjellstyre: "Fjellstyre",
  kommune: "Kommune",
  other: null,
  unknown: null,
};

/** Filtervalgene i kartet. Bare verdier kildene faktisk skiller på. */
export const HUT_TYPE_FILTERS: readonly { value: HutType; label: string }[] = [
  { value: "staffed_hut", label: "Betjent" },
  { value: "self_service_hut", label: "Selvbetjent" },
  { value: "unstaffed_hut", label: "Ubetjent" },
  { value: "rest_cabin", label: "Rastebu" },
];

export const HUT_OWNER_FILTERS: readonly { value: HutOwnerKind; label: string }[] = [
  { value: "dnt", label: "DNT" },
  { value: "statskog", label: "Statskog" },
  { value: "fjellstyre", label: "Fjellstyre" },
  { value: "other", label: "Andre" },
];

const km = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

/** «7,4 km» — uten «unna», fordi linjen allerede er en oppramsing. */
export function formatHutDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 50) * 50)} m`;
  return `${km.format(Math.round(meters / 100) / 10)} km`;
}

/** «Ubetjent hytte · DNT · 7,4 km». Ledd uten kildegrunnlag faller bort. */
export function hutSummaryLine(hut: { type: HutType; ownerKind: HutOwnerKind; distanceM?: number | null }): string {
  return [
    HUT_TYPE_LABELS[hut.type] ?? "Hytte",
    HUT_OWNER_LABELS[hut.ownerKind],
    hut.distanceM != null ? formatHutDistance(hut.distanceM) : null,
  ]
    .filter((ledd): ledd is string => ledd !== null)
    .join(" · ");
}

/**
 * Det kilden sier om bruk. Tom liste når den ikke sier noe.
 *
 * «Ulåst» er kildens opplysning om døra, ikke et løfte om at hytta er åpen i dag — derfor
 * står det som det står, og ikke som «åpen».
 */
export function hutDetailLines(hut: {
  overnight: HutOvernight;
  beds: number | null;
  locked: boolean | null;
  managerName: string | null;
}): string[] {
  const lines: string[] = [];
  if (hut.overnight === "yes") lines.push(hut.beds ? `Overnatting · ${hut.beds} sengeplasser` : "Overnatting");
  else if (hut.overnight === "no") lines.push("Rast og dagsbesøk, ikke beregnet for overnatting");
  if (hut.locked === true) lines.push("Låst");
  else if (hut.locked === false) lines.push("Ulåst");
  if (hut.managerName) lines.push(`Forvaltes av ${hut.managerName}`);
  return lines;
}

/** Hvem lenken går til, slik det står i knappen: «Bestill hos DNT». */
const CTA_OWNER: Record<HutOwnerKind, string | null> = {
  dnt: "DNT",
  statskog: "Statskog",
  fjellstyre: "fjellstyret",
  kommune: "kommunen",
  other: null,
  unknown: null,
};

export interface HutLink {
  kind: "booking" | "info";
  href: string;
  label: string;
}

/**
 * Lenkene ut fra en hytte, bestilling først.
 *
 * Teksten følger hva lenken faktisk peker til: «Bestill» brukes bare om en side der man
 * bestiller. NaboRadar gjør ingen bestilling selv, og viser verken ledighet eller pris.
 */
export function hutLinks(hut: {
  bookingUrl: string | null;
  infoUrl: string | null;
  ownerKind: HutOwnerKind;
  managerName: string | null;
}): HutLink[] {
  const hvem = CTA_OWNER[hut.ownerKind] ?? hut.managerName;
  const links: HutLink[] = [];
  if (hut.bookingUrl) links.push({ kind: "booking", href: hut.bookingUrl, label: hvem ? `Bestill hos ${hvem}` : "Bestill" });
  if (hut.infoUrl) links.push({ kind: "info", href: hut.infoUrl, label: hvem ? `Se hos ${hvem}` : "Mer informasjon" });
  return links;
}

/** «3 hytter og koier innen 15 km». */
export function hutCountLine(count: number, radiusM: number, capped: boolean): string {
  const antall = capped ? `Over ${count}` : String(count);
  const ord = count === 1 && !capped ? "hytte eller koie" : "hytter og koier";
  return `${antall} ${ord} innen ${Math.round(radiusM / 1000)} km`;
}

export const HUT_SOURCE_NOTE =
  "Hyttene er hentet fra Kartverkets kartdata. Sjekk alltid åpningstider, nøkkel og bestilling hos den som driver hytta.";

export const HUT_ATTRIBUTION = "© Kartverket";
