/**
 * Typer, enums og visningsnavn for det private research-laget.
 *
 * Skilt fra lib/admin/research.ts fordi den er `server-only`: kortene i admin-visningen er
 * klientkomponenter (de deler kartets valgtilstand), og de trenger typene og navnene — ikke
 * databasetilgangen.
 */

/**
 * Kategoriene research jobber etter. Databasen holder kategori som fritekst med vilje:
 * listen er en produktbeslutning som endrer seg raskere enn et skjema bør, og skriving går
 * uansett bare gjennom dette laget, som validerer mot listen.
 */
export const RESEARCH_CATEGORIES = [
  "Omsorg / bofellesskap",
  "Datasenter / industri / tekniske anlegg",
  "Forsvar / militært",
  "Infrastruktur / større prosjekter",
  "Telekom / master",
  "Miljø / grunn / forurensning",
  "Støy / nabobelastning",
  "Datakvalitetsavvik",
  "Kilder",
  "Manuelle notater",
] as const;
export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number];

export const ITEM_TYPES = ["finding", "lead", "note", "data_issue"] as const;
export const VERIFICATION_STATUSES = [
  "unverified",
  "partially_verified",
  "verified_public_source",
  "investigated_not_confirmed",
  "rejected",
  "archived",
] as const;
export const OPERATIONAL_STATUSES = ["active", "planned", "under_construction", "historical", "closed", "unknown"] as const;
export const SENSITIVITIES = ["normal", "internal_only", "do_not_publish"] as const;
export const LEVELS = ["low", "medium", "high"] as const;
export const SOURCE_TYPES = ["web", "register", "map_service", "document", "regulation", "news", "correspondence", "other"] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];
export type Sensitivity = (typeof SENSITIVITIES)[number];
export type Level = (typeof LEVELS)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface ResearchItem {
  id: string;
  item_type: ItemType;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  municipality: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  origin_type: "manual" | "imported";
  origin_provider: string | null;
  verification_status: VerificationStatus;
  operational_status: OperationalStatus;
  sensitivity: Sensitivity;
  reason_not_public: string | null;
  confidence: Level;
  interest_level: Level;
  why_interesting: string | null;
  notes: string | null;
  first_seen_at: string;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  source_count: number;
}

export interface ResearchSource {
  id: string;
  source_name: string;
  source_url: string | null;
  publisher: string | null;
  source_type: SourceType;
  source_date: string | null;
  accessed_at: string;
  primary_source: boolean;
  supports_claim: boolean;
  excerpt_or_summary: string | null;
  notes: string | null;
  created_at: string;
}

/** Et funn nær et punkt, til admin-adressesøket. */
export interface NearbyResearch {
  id: string;
  item_type: ItemType;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  address: string | null;
  municipality: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
  verification_status: VerificationStatus;
  operational_status: OperationalStatus;
  sensitivity: Sensitivity;
  confidence: Level;
  interest_level: Level;
  why_interesting: string | null;
  notes: string | null;
  source_count: number;
  /** Merket som god nok til å vurderes for den offentlige visningen. */
  public_candidate: boolean;
}

/**
 * Korte kategorinavn til kort og merkelapper. De fulle navnene er presise, men for lange til
 * en metalinje — «Datasenter / industri / tekniske anlegg» leses ikke på én linje ved 280 m.
 */
export const CATEGORY_SHORT: Record<string, string> = {
  "Omsorg / bofellesskap": "Omsorg",
  "Datasenter / industri / tekniske anlegg": "Datasenter og industri",
  "Forsvar / militært": "Forsvar",
  "Infrastruktur / større prosjekter": "Infrastruktur",
  "Telekom / master": "Telekom",
  "Miljø / grunn / forurensning": "Miljø",
  "Støy / nabobelastning": "Støy",
  Datakvalitetsavvik: "Datakvalitet",
  Kilder: "Kilder",
  "Manuelle notater": "Notat",
};

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  finding: "Funn",
  lead: "Lead",
  note: "Notat",
  data_issue: "Datafeil",
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: "Ikke verifisert",
  partially_verified: "Delvis verifisert",
  verified_public_source: "Verifisert i offentlig kilde",
  investigated_not_confirmed: "Undersøkt, ikke bekreftet",
  rejected: "Avvist",
  archived: "Arkivert",
};

export const OPERATIONAL_LABEL: Record<OperationalStatus, string> = {
  active: "I drift",
  planned: "Planlagt",
  under_construction: "Under bygging",
  historical: "Historisk",
  closed: "Nedlagt",
  unknown: "Ukjent status",
};

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  normal: "Normal",
  internal_only: "Kun intern",
  do_not_publish: "Skal ikke publiseres",
};

export const LEVEL_LABEL: Record<Level, string> = { low: "lav", medium: "middels", high: "høy" };

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  web: "Nettside",
  register: "Register",
  map_service: "Karttjeneste",
  document: "Dokument",
  regulation: "Regelverk",
  news: "Nyhet",
  correspondence: "Korrespondanse",
  other: "Annet",
};
