import {
  LEVELS,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  VERIFICATION_LABEL,
  OPERATIONAL_STATUSES,
  VERIFICATION_STATUSES,
  type Level,
  type OperationalStatus,
  type VerificationStatus,
} from "./research-types";

/**
 * Filtrene bak research-kartet: kategorier, URL-tilstand og standardvalg.
 *
 * Alt her er rene funksjoner uten kart og uten database, slik at filterlogikken kan testes for
 * seg — den er den delen som lettest blir feil uten at noen merker det.
 */

/**
 * Brukervendte kategorier, og hvilke interne research-kategorier hver av dem dekker.
 *
 * Bevisst en mapping og ikke en direkte liste over `category`-verdier: de interne navnene er
 * lange og slår sammen ting som hører fra hverandre i en geografisk utforskning — «Datasenter /
 * industri / tekniske anlegg» er én kategori i basen, men to helt ulike spørsmål på et kart.
 *
 * Der en gruppe skiller på underkategori i stedet for kategori, er det `subkategorier` som
 * gjør jobben. Nye grupper legges til her, ingen andre steder.
 */
export interface Kategorigruppe {
  slug: string;
  label: string;
  kategorier: string[];
  /** Når satt, snevres treffet inn til disse underkategoriene. */
  subkategorier?: string[];
}

const INDUSTRI = "Datasenter / industri / tekniske anlegg";

export const KATEGORIGRUPPER: Kategorigruppe[] = [
  {
    slug: "datasenter",
    label: "Datasenter",
    kategorier: [INDUSTRI],
    subkategorier: ["Datasenter"],
  },
  {
    slug: "industri",
    label: "Industri",
    kategorier: [INDUSTRI],
    subkategorier: [
      "Kjemisk industri",
      "Eksplosivproduksjon",
      "Farmasøytisk industri",
      "Næringsmiddelindustri",
      "Prosessindustri",
      "Metallindustri",
      "Drivstofflager",
    ],
  },
  {
    slug: "avfall",
    label: "Avfall og kommunalteknikk",
    kategorier: [INDUSTRI],
    subkategorier: ["Avfall", "Kommunalteknisk anlegg"],
  },
  {
    slug: "pukk",
    label: "Gruve, pukk og steinbrudd",
    kategorier: [INDUSTRI],
    subkategorier: ["Pukkverk", "Gruve"],
  },
  {
    slug: "energi",
    label: "Energi",
    kategorier: ["Infrastruktur / større prosjekter"],
    subkategorier: ["Kraftnett"],
  },
  {
    slug: "va",
    label: "VA og renseanlegg",
    kategorier: ["Miljø / grunn / forurensning"],
  },
  {
    slug: "forsvar",
    label: "Forsvar og militært",
    kategorier: ["Forsvar / militært"],
  },
  {
    slug: "kulturminner",
    label: "Kulturminner",
    kategorier: ["Forsvar / militært"],
    subkategorier: ["Kulturminne"],
  },
  {
    slug: "omsorg",
    label: "Institusjoner og omsorg",
    kategorier: ["Omsorg / bofellesskap"],
  },
  {
    slug: "stoy",
    label: "Støyrelaterte anlegg",
    kategorier: ["Støy / nabobelastning"],
  },
  {
    slug: "prosjekter",
    label: "Store prosjekter",
    kategorier: ["Infrastruktur / større prosjekter"],
  },
  { slug: "telekom", label: "Telekom", kategorier: ["Telekom / master"] },
  {
    slug: "kilder",
    label: "Kilder og datakvalitet",
    kategorier: ["Datakvalitetsavvik", "Kilder"],
  },
];

export function gruppeFor(slug: string | undefined): Kategorigruppe | null {
  return KATEGORIGRUPPER.find((g) => g.slug === slug) ?? null;
}

/**
 * Standardvalg for verifisering.
 *
 * Avviste og arkiverte funn er research vi har konkludert på, og hører ikke hjemme i et kart
 * man bruker for å se hva som finnes. De kan slås på eksplisitt.
 */
export const VERIFISERING_STANDARD: VerificationStatus[] =
  VERIFICATION_STATUSES.filter((v) => v !== "rejected" && v !== "archived");

export interface Kartfilter {
  kategori?: string;
  subkategori?: string;
  sok?: string;
  confidence: Level[];
  interesse: Level[];
  verifisering: VerificationStatus[];
  drift: OperationalStatus[];
  kommune?: string;
  kandidat?: boolean;
  kunMedPunkt: boolean;
  sortering: Sortering;
}

export const SORTERINGER = [
  "interesse",
  "sikkerhet",
  "nyeste",
  "navn",
  "kommune",
] as const;
export type Sortering = (typeof SORTERINGER)[number];

const førsteVerdi = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** Kommaseparert liste fra URL, begrenset til de gyldige verdiene. */
function liste<T extends string>(
  rå: string | string[] | undefined,
  gyldige: readonly T[],
  standard: T[],
): T[] {
  const tekst = førsteVerdi(rå);
  if (tekst === undefined) return standard;
  const valgt = tekst
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (gyldige as readonly string[]).includes(s));
  // Tom eller ugyldig verdi betyr «alle», ikke «ingenting» — et tomt kart uten forklaring er
  // verre enn å ignorere en ødelagt URL.
  return valgt.length > 0 ? valgt : [...gyldige];
}

export function lesFilter(
  params: Record<string, string | string[] | undefined>,
): Kartfilter {
  const kandidatRå = førsteVerdi(params.kandidat);
  const sortering = førsteVerdi(params.sortering);
  return {
    kategori: gruppeFor(førsteVerdi(params.kategori))?.slug,
    subkategori: førsteVerdi(params.subkategori)?.trim() || undefined,
    sok: førsteVerdi(params.sok)?.trim() || undefined,
    confidence: liste(params.confidence, LEVELS, [...LEVELS]),
    interesse: liste(params.interesse, LEVELS, [...LEVELS]),
    verifisering: liste(
      params.verifisering,
      VERIFICATION_STATUSES,
      VERIFISERING_STANDARD,
    ),
    drift: liste(params.drift, OPERATIONAL_STATUSES, [...OPERATIONAL_STATUSES]),
    kommune: førsteVerdi(params.kommune)?.trim() || undefined,
    kandidat:
      kandidatRå === "ja" ? true : kandidatRå === "nei" ? false : undefined,
    // Standard på: et funn uten koordinat er ikke en markør, og kartet er hovedflaten.
    kunMedPunkt: førsteVerdi(params.punkt) !== "alle",
    sortering: (SORTERINGER as readonly string[]).includes(sortering ?? "")
      ? (sortering as Sortering)
      : "interesse",
  };
}

/** Motsatt vei: bare det som avviker fra standard havner i URL-en. */
export function skrivFilter(f: Kartfilter): URLSearchParams {
  const p = new URLSearchParams();
  const somStandard = (valgt: readonly string[], standard: readonly string[]) =>
    valgt.length === standard.length &&
    standard.every((s) => valgt.includes(s));

  if (f.kategori) p.set("kategori", f.kategori);
  if (f.subkategori) p.set("subkategori", f.subkategori);
  if (f.sok) p.set("sok", f.sok);
  if (!somStandard(f.confidence, LEVELS))
    p.set("confidence", f.confidence.join(","));
  if (!somStandard(f.interesse, LEVELS))
    p.set("interesse", f.interesse.join(","));
  if (!somStandard(f.verifisering, VERIFISERING_STANDARD))
    p.set("verifisering", f.verifisering.join(","));
  if (!somStandard(f.drift, OPERATIONAL_STATUSES))
    p.set("drift", f.drift.join(","));
  if (f.kommune) p.set("kommune", f.kommune);
  if (f.kandidat !== undefined) p.set("kandidat", f.kandidat ? "ja" : "nei");
  if (!f.kunMedPunkt) p.set("punkt", "alle");
  if (f.sortering !== "interesse") p.set("sortering", f.sortering);
  return p;
}

export function kartHref(f: Kartfilter): string {
  const q = skrivFilter(f).toString();
  return q ? `/admin/kart?${q}` : "/admin/kart";
}

/** Om filteret er urørt. Brukes til å avgjøre om «Nullstill» skal vises. */
export function erStandard(f: Kartfilter): boolean {
  return skrivFilter(f).toString() === "";
}

/**
 * De avanserte filtrene, som chips man kan fjerne enkeltvis.
 *
 * Søk, kategori og kommune er ikke med: de står synlig i sine egne felt, og ville blitt vist to
 * ganger. Poenget med chipsene er å gjøre synlig det som ellers ligger skjult bak «Filtre» —
 * man skal alltid kunne se hvorfor man får akkurat disse treffene.
 */
export interface Filterchip {
  id: string;
  label: string;
  /** Endringen som fjerner nettopp dette filteret. */
  fjern: Partial<Kartfilter>;
}

export function avanserteChips(f: Kartfilter): Filterchip[] {
  const chips: Filterchip[] = [];
  const nivå = (v: Level) => LEVEL_LABEL[v];

  if (f.subkategori)
    chips.push({
      id: "subkategori",
      label: f.subkategori,
      fjern: { subkategori: undefined },
    });
  if (f.interesse.length !== LEVELS.length)
    chips.push({
      id: "interesse",
      label: `${f.interesse.map(nivå).join(", ")} interesse`,
      fjern: { interesse: [...LEVELS] },
    });
  if (f.confidence.length !== LEVELS.length)
    chips.push({
      id: "confidence",
      label: `${f.confidence.map(nivå).join(", ")} sikkerhet`,
      fjern: { confidence: [...LEVELS] },
    });
  if (f.drift.length !== OPERATIONAL_STATUSES.length)
    chips.push({
      id: "drift",
      label: f.drift.map((d) => OPERATIONAL_LABEL[d]).join(", "),
      fjern: { drift: [...OPERATIONAL_STATUSES] },
    });
  if (
    f.verifisering.length !== VERIFISERING_STANDARD.length ||
    !VERIFISERING_STANDARD.every((v) => f.verifisering.includes(v))
  )
    chips.push({
      id: "verifisering",
      label: f.verifisering.map((v) => VERIFICATION_LABEL[v]).join(", "),
      fjern: { verifisering: [...VERIFISERING_STANDARD] },
    });
  if (f.kandidat !== undefined)
    chips.push({
      id: "kandidat",
      label: f.kandidat ? "Kandidat for offentlig visning" : "Ikke kandidat",
      fjern: { kandidat: undefined },
    });
  if (!f.kunMedPunkt)
    chips.push({
      id: "punkt",
      label: "Også uten kartpunkt",
      fjern: { kunMedPunkt: true },
    });
  if (f.sortering !== "interesse")
    chips.push({
      id: "sortering",
      label: `Sortert på ${f.sortering}`,
      fjern: { sortering: "interesse" },
    });
  return chips;
}

/** Antallet som vises i «Filtre (n)». */
export function antallAvanserte(f: Kartfilter): number {
  return avanserteChips(f).length;
}

/**
 * Om undertype-feltet er relevant. Det vises bare når den valgte kategorien faktisk deler seg i
 * undertyper — ellers står det som et tomt felt og tar plass uten å gjøre noe.
 */
export function harUndertyper(slug: string | undefined): boolean {
  const g = gruppeFor(slug);
  return g !== null && (g.subkategorier?.length ?? 0) > 0;
}
