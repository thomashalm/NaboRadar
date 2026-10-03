import type { HutAccessKind, HutAccessStatus, HutOvernight, HutOwnerKind, HutType } from "./types";

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

/** Ordet i sidetittelen: «Aursjobu – hytte i Skjåk». */
const TITLE_NOUN: Partial<Record<HutType, string>> = { rest_cabin: "rastebu", open_cabin: "koie", day_trip_hut: "dagsturhytte", emergency_shelter: "nødbu" };

/** Sidetittel for en hytte, uten «· NaboRadar» (det legger malen til). Kommune, ellers fylke. */
export function hutPageTitle(hut: { name: string; type: HutType; municipalityName?: string | null; countyName?: string | null }): string {
  const sted = hut.municipalityName ?? hut.countyName;
  const ord = TITLE_NOUN[hut.type] ?? "hytte";
  return sted ? `${hut.name} – ${ord} i ${sted}` : `${hut.name} – ${ord}`;
}

/**
 * Beskrivelse til søkemotorer. Bare det vi faktisk vet: type, sted, forvalter og tilgang. Ingen
 * påstand om at hytta er åpen eller ledig, og ingen pris.
 */
export function hutMetaDescription(hut: {
  name: string;
  type: HutType;
  municipalityName?: string | null;
  countyName?: string | null;
  managerName: string | null;
  access: HutAccessKind;
}): string {
  const typeOrd = HUT_TYPE_LABELS[hut.type]?.toLowerCase() ?? "hytte";
  const sted = [hut.municipalityName, hut.countyName].filter(Boolean).join(", ");
  const setninger = [`${hut.name} er en ${typeOrd}${sted ? ` i ${sted}` : ""}.`];
  if (hut.managerName) setninger.push(`Forvaltes av ${hut.managerName}.`);
  const tilgang = hutAccessLine(hut.access, "short");
  if (tilgang) setninger.push(`${tilgang}.`);
  setninger.push("Se kart, fakta og hvor du går videre.");
  return setninger.join(" ");
}

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
export function hutUseLine(hut: { overnight: HutOvernight; beds: number | null; access?: HutAccessKind }): string | null {
  // En hytte som ikke er for allmennheten, skal ikke stå som et sted å overnatte.
  if (hut.access === "not_public") return null;
  if (hut.overnight === "yes") return hut.beds ? `Overnatting · ${hut.beds} sengeplasser` : "Overnatting";
  if (hut.overnight === "no") return "Rast og dagsbesøk, ikke beregnet for overnatting";
  return null;
}

/**
 * Tilgang: dør og nøkkel.
 *
 * Utgangspunktet er Kartverkets kodeliste «Tilgjengelighet» (N50, `hytteinformasjon.tilgjengelighet`):
 *
 *   Låst      «Låst og krever forhåndsbooking.»
 *   Ulåst     «Ulåst eller tilgjengelig med Den Norske Turistforenings standardnøkkel.»
 *   Udefinert «Irrelevant/ikke aktuell.» — lagres som ukjent og vises ikke.
 *
 * «Ulåst» betyr altså ikke at man slipper nøkkel. Når forvalterens egen side sier noe mer
 * presist eller noe annet — kodelås, spesialnøkkel — går den foran, som en overstyring
 * (`access_override`). Ingen av verdiene sier om hytta er åpen i dag.
 * https://register.geonorge.no/sosi-kodelister/kartdata/tilgjengelighet
 */
export const HUT_ACCESS_LABELS: Record<HutAccessKind, string | null> = {
  locked_prebooking: "Låst – må bestilles på forhånd",
  unlocked_or_dnt_key: "Ulåst, eller åpnes med DNT-nøkkel",
  unlocked: "Ulåst",
  dnt_key: "DNT-nøkkel",
  code_lock: "Kodelås",
  special_key: "Spesialnøkkel",
  code_or_special_key: "Kodelås eller spesialnøkkel",
  not_public: "Ikke for allmennheten",
  unknown: null,
};

/** Kortformen til kort og lister, der «Tilgang» ikke står foran. */
const ACCESS_SHORT: Partial<Record<HutAccessKind, string>> = {
  locked_prebooking: "Låst, bestilles på forhånd",
  unlocked_or_dnt_key: "Ulåst eller DNT-nøkkel",
};

export const HUT_ACCESS_NOTE = "Tilgang beskriver dør og nøkkel. Den sier ikke om hytta er åpen eller ledig i dag.";

export function hutAccessLine(access: HutAccessKind, form: "full" | "short" = "full"): string | null {
  return (form === "short" ? ACCESS_SHORT[access] : undefined) ?? HUT_ACCESS_LABELS[access];
}

/**
 * Kort status til lister og kort. Bare «midlertidig stengt» vises: det er den ene tingen som
 * ikke kan vente til hyttesiden. Satt for hånd etter forvalterens side — ingen kilde leverer den.
 */
export function hutStatusBadge(status: HutAccessStatus): string | null {
  return status === "closed" ? "Midlertidig stengt" : null;
}

/** Bruk, tilgang og forvalter på kortform, til kortene på områdesiden. Tom når kilden tier. */
export function hutDetailLines(hut: {
  overnight: HutOvernight;
  beds: number | null;
  access: HutAccessKind;
  managerName: string | null;
}): string[] {
  return [hutUseLine(hut), hutAccessLine(hut.access, "short"), hut.managerName ? `Forvaltes av ${hut.managerName}` : null].filter(
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
  access: HutAccessKind;
  lat: number;
  lng: number;
  bookingUrl?: string | null;
  infoUrl?: string | null;
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
    // «Må bestilles på forhånd» står i raden bare når vi også kan si hvor eller hos hvem. Vet vi
    // ingen av delene, står det «Låst», og forklaringen står for seg — se `hutNextStep`.
    [
      "Tilgang",
      hut.access === "locked_prebooking" && hutNextStep({ ...hut, bookingUrl: hut.bookingUrl ?? null, infoUrl: hut.infoUrl ?? null }).kind === "unknown"
        ? "Låst"
        : hutAccessLine(hut.access),
    ],
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

/**
 * Hvem en lenke går til, lest av adressen: «Bestill hos DNT» sier hvor man havner.
 *
 * Eierkategorien brukes ikke. Kartverkets «DNT» eller «Statskog» sier hvem som eier hytta, ikke
 * hvem som tar imot bestillingen, og «Fjellstyre» er ikke en bestemt aktør i det hele tatt.
 */
const LINK_PROVIDERS: readonly [host: RegExp, name: string][] = [
  [/(^|\.)dnt\.no$/, "DNT"],
  [/(^|\.)statskog\.no$/, "Statskog"],
  [/(^|\.)inatur\.no$/, "Inatur"],
];

function linkProvider(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return LINK_PROVIDERS.find(([mønster]) => mønster.test(host))?.[1] ?? null;
  } catch {
    return null;
  }
}

export interface HutLink {
  kind: "booking" | "info";
  href: string;
  label: string;
}

/**
 * Lenkene ut fra en hytte, bestilling først.
 *
 * Teksten følger hva lenken faktisk peker til: «Bestill» brukes bare om en side der man
 * bestiller, og navnet er stedet lenken går til — ellers forvalteren. Uten noen av delene er
 * knappen navnløs. NaboRadar gjør ingen bestilling selv, og viser verken ledighet eller pris.
 */
export function hutLinks(hut: { bookingUrl: string | null; infoUrl: string | null; managerName: string | null }): HutLink[] {
  const links: HutLink[] = [];
  if (hut.bookingUrl) {
    const hvem = linkProvider(hut.bookingUrl) ?? hut.managerName;
    links.push({ kind: "booking", href: hut.bookingUrl, label: hvem ? `Bestill hos ${hvem}` : "Bestill hytta" });
  }
  if (hut.infoUrl) {
    const hvem = linkProvider(hut.infoUrl) ?? hut.managerName;
    links.push({ kind: "info", href: hut.infoUrl, label: hvem ? `Se hos ${hvem}` : "Mer informasjon" });
  }
  return links;
}

/**
 * Hva vi kan si om neste steg for en hytte.
 *
 * Fire tilstander, etter hva vi faktisk vet:
 *   booking_link  vi har en kontrollert side der man bestiller
 *   info_link     vi har en kontrollert infoside, men ingen bestillingsside
 *   manager_only  vi vet hvem som driver hytta, men har ingen kontrollert lenke
 *   unknown       vi vet verken hvem som driver den eller hvor man går videre
 *
 * `bookingRequired` er tilgangen «låst og krever forhåndsbooking» (Kartverkets «Låst»). Det er en egen
 * opplysning: at bestilling kreves, betyr ikke at vi kjenner bestillingskanalen — og ingen av
 * delene sier om hytta er åpen eller ledig.
 */
export type HutNextStepKind = "booking_link" | "info_link" | "manager_only" | "unknown";

export interface HutNextStep {
  kind: HutNextStepKind;
  bookingRequired: boolean;
  links: HutLink[];
  managerName: string | null;
  /** Teksten som står sammen med lenkene, eller i stedet for dem. Null når det ikke er noe å si. */
  note: string | null;
}

export const HUT_NEXT_STEP_NOTES = {
  info: "Oppdatert informasjon om tilgang og bestilling finner du hos forvalteren.",
  /** Infoside for en hytte som ikke må bestilles: da er det ingen bestilling å vise til. */
  infoOnly: "Oppdatert informasjon finner du hos forvalteren.",
  /** Hytta er ikke et tilbud til turgåere. Merknaden over sier hvem den er for. */
  notPublic: "Hytta er ikke et tilbud til allmennheten.",
  managerOnly: "Bestilling kreves. NaboRadar har foreløpig ikke en verifisert bestillingslenke.",
  unknown:
    "Kartverket oppgir at hytta krever forhåndsbooking. NaboRadar har foreløpig ikke funnet en verifisert kontakt- eller bestillingsside.",
} as const;

export function hutNextStep(hut: {
  access: HutAccessKind;
  bookingUrl: string | null;
  infoUrl: string | null;
  managerName: string | null;
}): HutNextStep {
  // Bare Kartverkets «Låst» sier at bestilling kreves. En kodelås sier det ikke i seg selv.
  const bookingRequired = hut.access === "locked_prebooking";
  const links = hutLinks(hut);
  const base = { bookingRequired, links, managerName: hut.managerName };
  // Ikke for allmennheten: ingen oppfordring til å bestille. En infolenke kan fortsatt vises.
  if (hut.access === "not_public") {
    return { ...base, kind: hut.bookingUrl ? "booking_link" : hut.infoUrl ? "info_link" : hut.managerName ? "manager_only" : "unknown", note: HUT_NEXT_STEP_NOTES.notPublic };
  }
  // Med en bestillingslenke trengs ingen forklaring: knappen er neste steg.
  if (hut.bookingUrl) return { ...base, kind: "booking_link", note: null };
  if (hut.infoUrl) return { ...base, kind: "info_link", note: bookingRequired ? HUT_NEXT_STEP_NOTES.info : HUT_NEXT_STEP_NOTES.infoOnly };
  // Uten lenke er det bare noe å si når hytta må bestilles. En ulåst hytte uten lenke får ingen
  // oppfordring: vi peker ikke brukeren til en aktør vi ikke kan navngi.
  if (hut.managerName) return { ...base, kind: "manager_only", note: bookingRequired ? HUT_NEXT_STEP_NOTES.managerOnly : null };
  return { ...base, kind: "unknown", note: bookingRequired ? HUT_NEXT_STEP_NOTES.unknown : null };
}

/** Kontaktstatusen slik den står i admin. */
export const HUT_NEXT_STEP_LABELS: Record<HutNextStepKind, string> = {
  booking_link: "Lenke komplett",
  info_link: "Infoside finnes",
  manager_only: "Mangler booking/info",
  unknown: "Mangler forvalter",
};

/** «3 hytter og koier innen 15 km». */
export function hutCountLine(count: number, radiusM: number, capped: boolean): string {
  const antall = capped ? `Over ${count}` : String(count);
  const ord = count === 1 && !capped ? "hytte eller koie" : "hytter og koier";
  return `${antall} ${ord} innen ${Math.round(radiusM / 1000)} km`;
}

/**
 * Kildelinjen på hyttesiden. Når noe er kontrollert mot forvalteren, sier vi det — og hvem —
 * uten å vise kilden eller det interne notatet.
 */
export function hutSourceLine(hut: { overridden: readonly string[]; managerName: string | null }, updated: string | null): string {
  const kartverket = `Kartverket, N50 Kartdata${updated ? ` · oppdatert ${updated}` : ""}`;
  if (hut.overridden.length === 0) return `${kartverket}.`;
  return `${kartverket}, og kontrollert informasjon fra ${hut.managerName ?? "forvalteren"}.`;
}

/** Står én gang under lista i hyttekartet. Hva som gjelder én hytte, står på hyttesiden. */
export const HUT_SOURCE_NOTE =
  "Hyttene er hentet fra Kartverkets kartdata. NaboRadar viser verken ledighet eller åpningstider — se hyttesiden for hvor du går videre.";

export const HUT_ATTRIBUTION = "© Kartverket";
