import type { LineString, MultiLineString, MultiPolygon, Point, Polygon } from "geojson";

/**
 * Områdefakta: objektive, dokumenterbare forhold rundt et punkt.
 * Dette er TILSTANDER uten dato, til forskjell fra events (hendelser med dato),
 * og ligger derfor i egen tabell med egen spørring.
 */

/** Kategorien en rad lagres med i databasen. Endringer her krever migrasjon av area_features. */
export const AREA_CATEGORIES = [
  "grunnforhold",
  "stoy",
  "miljo",
  "infrastruktur",
  "industri",
  "oppvekst",
  "helse",
  "servering",
] as const;
export type AreaCategory = (typeof AREA_CATEGORIES)[number];

/**
 * Seksjonene på resultatsiden, i visningsrekkefølge.
 *
 * En seksjon er det brukeren ser; kategoriene er hvordan vi lagrer. Skillet gjør at en seksjon
 * kan samle flere datatyper uten at hverken databasen eller UI-et må endres: «Nærområdet» har
 * i dag bare industri og anlegg, og kan senere få sykehus, sykehjem eller andre ordinært
 * offentlig kjente steder ved at kategorien legges til i listen under.
 *
 * Rekkefølgen er satt etter hva som normalt betyr mest for en beboer. Seksjoner uten innhold
 * faller bort, så resten flytter opp av seg selv.
 */
export interface AreaSection {
  id: string;
  label: string;
  /** Nøytral ingress. Brukes der overskriften alene ikke sier hva seksjonen er. */
  intro: string | null;
  categories: readonly AreaCategory[];
}

export const AREA_SECTIONS: readonly AreaSection[] = [
  { id: "grunnforhold", label: "Grunnforhold", intro: null, categories: ["grunnforhold"] },
  { id: "stoy", label: "Støy", intro: null, categories: ["stoy"] },
  {
    id: "naeromradet",
    label: "Nærområdet",
    // Nøytral ramme: dette er hva som finnes, ikke hva som er bra eller dårlig.
    intro: "Offentlig kjente virksomheter og steder i nærheten. Vi vurderer dem ikke.",
    categories: ["oppvekst", "helse", "servering", "industri"],
  },
  { id: "infrastruktur", label: "Infrastruktur", intro: null, categories: ["infrastruktur"] },
  // Ligger sist som standard: registreringene er tette i byer, og de fleste gjelder et sted
  // i nærheten — ikke adressen brukeren søkte på. Se sectionOrder() for unntaket.
  { id: "forurenset-grunn", label: "Forurenset grunn", intro: null, categories: ["miljo"] },
];

/**
 * Visningsrekkefølgen for ett søk.
 *
 * Forurenset grunn løftes til toppen når søkepunktet faktisk ligger inne i en registrert
 * lokalitet som kilden mener krever tiltak eller oppfølging. Da handler det om adressen selv,
 * ikke om noe i nabolaget. En registrering 760 meter unna løfter ingenting.
 */
export function sectionOrder(input: { contaminationAtSearchPoint: boolean }): readonly AreaSection[] {
  if (!input.contaminationAtSearchPoint) return AREA_SECTIONS;
  const forurenset = AREA_SECTIONS.find((section) => section.id === "forurenset-grunn");
  if (!forurenset) return AREA_SECTIONS;
  return [forurenset, ...AREA_SECTIONS.filter((section) => section.id !== "forurenset-grunn")];
}

export function sectionForCategory(category: AreaCategory): AreaSection | undefined {
  return AREA_SECTIONS.find((section) => section.categories.includes(category));
}

export type AreaGeometry = Polygon | MultiPolygon | Point | LineString | MultiLineString;

/** Kun kodede verdier fra kilden. Aldri fritekst, navn på privatpersoner eller adresser. */
export type AreaAttributes = Record<string, string | number | boolean | null>;

export type AreaSourceUrlType = "provider_page" | "factsheet" | "report";

export interface NormalizedAreaFeature {
  providerId: string;
  externalId: string;
  category: AreaCategory;
  /** Styrer formulering i lib/facts/wording.ts. */
  subtype: string;
  title: string;
  geometry: AreaGeometry;
  attributes: AreaAttributes;
  sourceUrl: string | null;
  sourceUrlType: AreaSourceUrlType | null;
  sourceUpdatedAt: string | null;
}

/** Rad fra features_near(). distanceM = 0 når punktet ligger inne i objektet. */
export interface AreaFeatureHit {
  id: string;
  providerId: string;
  category: AreaCategory;
  subtype: string;
  title: string;
  distanceM: number;
  contains: boolean;
  attributes: AreaAttributes;
  sourceUrl: string | null;
  sourceUrlType: AreaSourceUrlType | null;
  sourceUpdatedAt: string | null;
}

/**
 * Et faktum klart for visning. Teksten kommer alltid fra formuleringsregisteret
 * (lib/facts/wording.ts) — UI-et setter aldri sammen egne setninger fra rådata.
 */
export interface AreaFact {
  id: string;
  category: AreaCategory;
  subtype: string;
  /** Hovedlinje, f.eks. «Kartlagt kvikkleiresone «Alfaset vest» (løsneområde)». */
  headline: string;
  /** Utfyllende linjer fra kilden, f.eks. klassifisering og undersøkelsesnivå. */
  details: string[];
  /** Kildens egne koder og klasser. Vises bak «Detaljer», aldri som hovedtekst. */
  technical: string[];
  /** Kildens eget forbehold. Vises alltid når det finnes. */
  caveat: string | null;
  /** «Ved søkepunktet» når contains er sann, ellers «420 m unna». */
  distanceLabel: string;
  distanceM: number | null;
  contains: boolean;
  sourceName: string;
  /** År eller dato fra kilden, når den finnes. */
  sourceDateLabel: string | null;
  link: { href: string; label: string } | null;
}
