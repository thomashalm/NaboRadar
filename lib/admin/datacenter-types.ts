/**
 * Typer og vokabular for datasentre.
 *
 * Skilt fra `datacenter.ts` fordi den er `server-only`: kartet og kortene er klientkomponenter og
 * trenger etikettene, men skal ikke kunne dra med seg databasekallene.
 */

export const ANLEGGSTYPER = [
  "colocation",
  "hyperscale",
  "ai_hpc",
  "enterprise",
  "crypto",
  "network_pop",
  "mixed",
  "unknown",
] as const;
export type Anleggstype = (typeof ANLEGGSTYPER)[number];

export const ANLEGGSTYPE_LABEL: Record<Anleggstype, string> = {
  colocation: "Kolokasjon",
  hyperscale: "Hyperscale",
  ai_hpc: "AI/HPC",
  enterprise: "Egendrift",
  crypto: "Krypto",
  network_pop: "Nettverkspunkt",
  mixed: "Blandet",
  unknown: "Ukjent",
};

export const ROLLER = ["owner", "operator", "customer", "investor", "parent_company", "land_owner"] as const;
export type Rolle = (typeof ROLLER)[number];

export const ROLLE_LABEL: Record<Rolle, string> = {
  owner: "Eier",
  operator: "Operatør",
  customer: "Kunde",
  investor: "Investor",
  parent_company: "Morselskap",
  land_owner: "Grunneier",
};

/**
 * MW-feltene med teksten som gjør dem etterprøvbare. Rekkefølgen er den de vises i, og den går
 * fra det mest konkrete til det mest hypotetiske — «i drift» før «potensial».
 */
export const MW_FELT = [
  { felt: "it_load_mw", label: "IT-last", hjelp: "Faktisk last i drift" },
  { felt: "operational_capacity_mw", label: "I drift", hjelp: "Kapasitet som er i drift i dag" },
  { felt: "secured_power_mw", label: "Sikret kraft", hjelp: "Tildelt nettkapasitet, ikke kapasitet i drift" },
  { felt: "planned_capacity_mw", label: "Planlagt", hjelp: "Planlagt kapasitet for prosjektet" },
  { felt: "campus_potential_mw", label: "Campus-potensial", hjelp: "Hele campus hvis alt bygges ut" },
] as const;

export const MANGLER_LABEL: Record<string, string> = {
  operator: "operatør",
  owner: "eier",
  status: "status",
  mw: "kapasitet",
  type: "type",
  primary_source: "primærkilde",
  coordinates: "koordinat",
};

export interface Datasenter {
  id: string;
  title: string;
  municipality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  operational_status: string;
  verification_status: string;
  confidence: string;
  interest_level: string;
  description: string | null;
  notes: string | null;
  review_state: string | null;
  next_review_at: string | null;
  last_verified_at: string | null;
  facility_type: Anleggstype | null;
  it_load_mw: number | null;
  operational_capacity_mw: number | null;
  secured_power_mw: number | null;
  planned_capacity_mw: number | null;
  campus_potential_mw: number | null;
  expansion_notes: string | null;
  opening_year: number | null;
  expected_opening: string | null;
  investment_nok: number | null;
  investment_note: string | null;
  last_enriched_at: string | null;
  owners: string | null;
  operators: string | null;
  customers: string | null;
  parent_companies: string | null;
  investors: string | null;
  land_owners: string | null;
  source_count: number;
  missing_fields: string[];
}

export interface RefreshKjøring {
  id: string;
  mode: "review_due" | "full";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  created_by: string | null;
  notes: string | null;
  total: number;
  checked: number;
  changed: number;
  unchanged: number;
  skipped: number;
  failed: number;
}

export interface KøLinje {
  research_item_id: string;
  queue_position: number;
  state: "pending" | "changed" | "unchanged" | "skipped" | "failed";
  queued_reasons: string[];
  search_plan: string[];
  changed_fields: string[];
  result_note: string | null;
  error: string | null;
  finished_at: string | null;
  title: string;
  municipality: string | null;
  operational_status: string;
  missing_fields: string[];
}

/**
 * Kort sammendrag til research-kartet, nøklet på funn-id. Kartet slår det sammen med sine egne
 * punkter og slipper å vite noe om datasentermodellen.
 */
export interface Datasentersammendrag {
  operators: string | null;
  owners: string | null;
  customers: string | null;
  facility_type: Anleggstype | null;
  mw: { felt: string; label: string; verdi: number } | null;
  missing_fields: string[];
}

/** Det mest konkrete MW-tallet anlegget har. «I drift» slår «potensial». */
export function besteMW(a: Datasenter): Datasentersammendrag["mw"] {
  for (const m of MW_FELT) {
    const v = a[m.felt as keyof Datasenter] as number | null;
    if (v !== null && v !== undefined) return { felt: m.felt, label: m.label, verdi: v };
  }
  return null;
}

/**
 * «700 MW sikret kraft», aldri bare «700 MW».
 *
 * Semantikken følger tallet overalt det vises. Et MW-tall uten hvilket tall det er, er nettopp
 * forvekslingen hele modellen finnes for å hindre.
 */
export function mwTekst(mw: Datasentersammendrag["mw"]): string | null {
  if (!mw) return null;
  const n = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 }).format(mw.verdi);
  return `${n} MW ${mw.label.toLowerCase()}`;
}
