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

/** «7,4 km». Sier ikke hva avstanden er målt fra — det må stå rett ved, se `hutDistanceFrom`. */
export function formatHutDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 50) * 50)} m`;
  return `${km.format(Math.round(meters / 100) / 10)} km`;
}

/**
 * Stedet en avstand er målt fra, slik det står i teksten: «Storgata 1», ikke hele adressen.
 *
 * Regelen for hytter er at en avstand aldri vises uten at det er tydelig hva den er målt fra.
 * På områdesiden er det adressen i overskriften. I hyttekartet finnes det ikke noe slikt sted
 * med mindre brukeren kom fra ett — da står navnet i hver avstand.
 */
export function hutOriginName(label: string | null | undefined): string {
  const kort = (label ?? "").split(",")[0]!.trim();
  if (!kort) return "valgt sted";
  return kort.length > 40 ? `${kort.slice(0, 39).trimEnd()}…` : kort;
}

/** «4,2 km fra Storgata 1». */
export function hutDistanceFrom(meters: number, originName: string): string {
  return `${formatHutDistance(meters)} fra ${originName}`;
}

/**
 * «Ubetjent hytte · DNT · 7,4 km». Ledd uten kildegrunnlag faller bort.
 *
 * Med `originName` står stedet i avstanden («7,4 km fra Storgata 1»). Uten er avstanden bare
 * tallet, og kalleren har ansvaret for at stedet framgår av sammenhengen.
 */
export function hutSummaryLine(
  hut: { type: HutType; ownerKind: HutOwnerKind; distanceM?: number | null },
  originName?: string,
): string {
  const avstand =
    hut.distanceM == null ? null : originName ? hutDistanceFrom(hut.distanceM, originName) : formatHutDistance(hut.distanceM);
  return [HUT_TYPE_LABELS[hut.type] ?? "Hytte", HUT_OWNER_LABELS[hut.ownerKind], avstand]
    .filter((ledd): ledd is string => ledd !== null)
    .join(" · ");
}

/** Hva hytta er beregnet for, slik kilden klassifiserer den. Null når kilden ikke sier noe. */
export function hutUseLine(hut: { overnight: HutOvernight; beds: number | null }): string | null {
  if (hut.overnight === "yes") return hut.beds ? `Overnatting · ${hut.beds} sengeplasser` : "Overnatting";
  if (hut.overnight === "no") return "Rast og dagsbesøk, ikke beregnet for overnatting";
  return null;
}

/**
 * Tilgang, etter Kartverkets kodeliste «Tilgjengelighet» (N50, `hytteinformasjon.tilgjengelighet`):
 *
 *   Låst      «Låst og krever forhåndsbooking.»
 *   Ulåst     «Ulåst eller tilgjengelig med Den Norske Turistforenings standardnøkkel.»
 *   Udefinert «Irrelevant/ikke aktuell.» — lagres som ukjent og vises ikke.
 *
 * «Ulåst» betyr altså ikke at man slipper nøkkel, og ingen av verdiene sier om hytta er åpen
 * i dag. Ordlyden under sier det kodelisten sier, verken mer eller mindre.
 * https://register.geonorge.no/sosi-kodelister/kartdata/tilgjengelighet
 */
export const HUT_ACCESS_LABELS = {
  locked: "Låst – må bestilles på forhånd",
  unlocked: "Ulåst, eller åpnes med DNT-nøkkel",
} as const;

/** Kortformen til kort og lister, der «Tilgang» ikke står foran. */
const ACCESS_SHORT = { locked: "Låst, bestilles på forhånd", unlocked: "Ulåst eller DNT-nøkkel" } as const;

export const HUT_ACCESS_NOTE =
  "Tilgang er Kartverkets opplysning om døra og nøkkelen. Den sier ikke om hytta er åpen eller ledig i dag.";

export function hutAccessLine(locked: boolean | null, form: "full" | "short" = "full"): string | null {
  if (locked === null) return null;
  return (form === "full" ? HUT_ACCESS_LABELS : ACCESS_SHORT)[locked ? "locked" : "unlocked"];
}

/** Bruk, tilgang og forvalter på kortform, til kortene på områdesiden. Tom når kilden tier. */
export function hutDetailLines(hut: {
  overnight: HutOvernight;
  beds: number | null;
  locked: boolean | null;
  managerName: string | null;
}): string[] {
  return [hutUseLine(hut), hutAccessLine(hut.locked, "short"), hut.managerName ? `Forvaltes av ${hut.managerName}` : null].filter(
    (linje): linje is string => linje !== null,
  );
}

const grader = new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

/** «60,0361° N, 10,6637° Ø». */
export function formatHutCoordinates(lat: number, lng: number): string {
  return `${grader.format(lat)}° N, ${grader.format(lng)}° Ø`;
}

export interface HutFactsInput {
  type: HutType;
  ownerKind: HutOwnerKind;
  managerName: string | null;
  overnight: HutOvernight;
  beds: number | null;
  locked: boolean | null;
  lat: number;
  lng: number;
  municipalityName?: string | null;
  countyName?: string | null;
  elevationM?: number | null;
}

/**
 * Faktaradene for en hytte. Bare rader med innhold — et felt kilden ikke har, finnes ikke.
 *
 * `full` er hyttesiden, som også har fylke, høyde og koordinater. Uten er det kortversjonen
 * som åpnes i lista i kartet.
 */
export function hutFacts(hut: HutFactsInput, full: boolean): [label: string, value: string][] {
  const rader: [string, string | null | undefined][] = [
    ["Type", HUT_TYPE_LABELS[hut.type]],
    ["Eier", HUT_OWNER_LABELS[hut.ownerKind]],
    ["Forvalter", hut.managerName],
    ["Bruk", hutUseLine(hut)],
    ["Tilgang", hutAccessLine(hut.locked)],
    ["Kommune", hut.municipalityName],
  ];
  if (full) {
    rader.push(
      // Oslo er både kommune og fylke; da sier fylkesraden ingenting nytt.
      ["Fylke", hut.countyName !== hut.municipalityName ? hut.countyName : null],
      // Terrenghøyden i kartpunktet, ikke en oppmålt høyde for bygget — derfor «ca.».
      ["Høyde", hut.elevationM != null ? `ca. ${hut.elevationM} moh.` : null],
      ["Koordinater", formatHutCoordinates(hut.lat, hut.lng)],
    );
  }
  return rader.filter((rad): rad is [string, string] => Boolean(rad[1]));
}

/** «Nittedal, Akershus» — eller bare «Oslo», der kommunen og fylket heter det samme. */
export function hutPlaceLine(hut: { municipalityName?: string | null; countyName?: string | null }): string | null {
  const ledd = [hut.municipalityName, hut.countyName !== hut.municipalityName ? hut.countyName : null].filter(Boolean);
  return ledd.length > 0 ? ledd.join(", ") : null;
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

/** Forbeholdet. Står på hyttesiden og én gang under kartet — ikke på hvert kort. */
export const HUT_SOURCE_NOTE =
  "Hyttene er hentet fra Kartverkets kartdata. Sjekk alltid åpningstider, nøkkel og bestilling hos den som driver hytta.";

export const HUT_ATTRIBUTION = "© Kartverket";
