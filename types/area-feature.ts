import type { LineString, MultiLineString, MultiPolygon, Point, Polygon } from "geojson";

/**
 * Områdefakta: objektive, dokumenterbare forhold rundt et punkt.
 * Dette er TILSTANDER uten dato, til forskjell fra events (hendelser med dato),
 * og ligger derfor i egen tabell med egen spørring.
 */

/**
 * Rekkefølgen her er visningsrekkefølgen på resultatsiden, og den er satt etter hva som
 * normalt betyr mest for en beboer: hva grunnen består av, hva man hører, og deretter
 * registreringer i nærheten. Kategorier uten funn faller bort, så resten flytter opp av seg selv.
 */
export const AREA_CATEGORIES = ["grunnforhold", "stoy", "miljo", "infrastruktur", "industri"] as const;
export type AreaCategory = (typeof AREA_CATEGORIES)[number];

export const AREA_CATEGORY_LABELS: Record<AreaCategory, string> = {
  grunnforhold: "Grunnforhold",
  stoy: "Støy",
  // Kategorien inneholder i praksis bare forurenset grunn. Da skal den hete det.
  miljo: "Forurenset grunn",
  infrastruktur: "Infrastruktur",
  industri: "Industri og anlegg",
};

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
