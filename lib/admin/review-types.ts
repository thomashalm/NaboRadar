/**
 * Typer og visningsnavn for review-laget.
 *
 * Skilt fra `lib/admin/review.ts` fordi den er `server-only`: køen og panelet trenger navnene og
 * forklaringene, ikke databasetilgangen.
 *
 * Alt som beregnes — tilstand, grunner, prioritet, datoer — kommer fra databasen. Dette laget
 * oversetter det til noe et menneske kan handle på, og gjør det uten å kunne bli uenig med
 * SQL-en om hva som er forsinket.
 */

/** Tilstandene, i den rekkefølgen de haster. Beregnet i basen fra `next_review_at`. */
export const REVIEW_STATES = [
  "needs_followup",
  "overdue",
  "due",
  "due_soon",
  "blocked",
  "current",
  "no_review_needed",
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

/** Tilstandene som er arbeid nå. Standardfilteret i køen. */
export const AKTUELLE_STATES: ReviewState[] = ["needs_followup", "overdue", "due"];

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  needs_followup: "Oppfølging",
  overdue: "Forsinket",
  due: "Review nå",
  due_soon: "Review snart",
  blocked: "Blokkert",
  current: "Fersk",
  no_review_needed: "Trenger ikke review",
};

/**
 * Tonen på merkelappen. Forsinket og oppfølging er de to som skal kunne finnes med øyet i en
 * liste; resten skal ikke rope.
 */
export const REVIEW_STATE_TONE: Record<ReviewState, "varsel" | "aktiv" | "rolig" | "nøytral"> = {
  needs_followup: "varsel",
  overdue: "varsel",
  due: "aktiv",
  due_soon: "rolig",
  blocked: "rolig",
  current: "nøytral",
  no_review_needed: "nøytral",
};

/** Hvordan `next_review_at` ble satt. */
export const REVIEW_MODES = ["policy", "manual", "none", "blocked"] as const;
export type ReviewMode = (typeof REVIEW_MODES)[number];

export const REVIEW_MODE_LABEL: Record<ReviewMode, string> = {
  policy: "Etter policy",
  manual: "Manuelt satt",
  none: "Ingen review",
  blocked: "Blokkert",
};

/**
 * Grunnene til at noe ligger i køen. Beregnet, aldri lagret — et funn som får primærkilde
 * slutter å ha `missing_primary_source` uten at noen må huske å fjerne det.
 *
 * `missing_capacity` finnes ikke: kapasitet er ikke et strukturert felt i basen, den står i
 * beskrivelsen. Et felt vi ikke kan beregne ville blitt et felt ingen vedlikeholder.
 */
export const REVIEW_REASONS = [
  "under_construction",
  "planned_project",
  "status_unknown",
  "high_interest",
  "low_confidence",
  "medium_confidence",
  "public_candidate",
  "missing_primary_source",
  "missing_coordinates",
  "unresolved_lead",
  "previously_changed",
  "manual_followup",
  "blocked_source",
  "never_reviewed",
  "source_old",
] as const;
export type ReviewReason = (typeof REVIEW_REASONS)[number];

export const REVIEW_REASON_LABEL: Record<ReviewReason, string> = {
  under_construction: "under bygging",
  planned_project: "planlagt prosjekt",
  status_unknown: "ukjent status",
  high_interest: "høy interesse",
  low_confidence: "lav sikkerhet",
  medium_confidence: "middels sikkerhet",
  public_candidate: "kan bli publisert",
  missing_primary_source: "mangler primærkilde",
  missing_coordinates: "mangler koordinat",
  unresolved_lead: "uavklart lead",
  previously_changed: "har endret seg før",
  manual_followup: "manuell oppfølging",
  blocked_source: "kilden er blokkert",
  never_reviewed: "aldri kontrollert",
  source_old: "kildene er over to år gamle",
};

/** Utfallene en review kan ende i. */
export const REVIEW_OUTCOMES = [
  "unchanged",
  "updated",
  "strengthened",
  "weakened",
  "status_changed",
  "rejected",
  "reopened",
  "unresolved",
  "snoozed",
] as const;
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

export const REVIEW_OUTCOME_LABEL: Record<ReviewOutcome, string> = {
  unchanged: "Ingen endring",
  updated: "Oppdatert",
  strengthened: "Styrket",
  weakened: "Svekket",
  status_changed: "Status endret",
  rejected: "Avvist",
  reopened: "Gjenåpnet",
  unresolved: "Fortsatt uavklart",
  snoozed: "Utsatt",
};

/** Kort forklaring av hva hvert utfall gjør med funnet. Vises ved valget, ikke i en hjelpetekst. */
export const REVIEW_OUTCOME_HJELP: Record<ReviewOutcome, string> = {
  unchanged: "Kontrollert, ingenting hadde endret seg. Neste review flyttes fram etter policy.",
  updated: "Innholdet er endret etter kontrollen.",
  strengthened: "Bedre kilder eller bekreftelse — sikkerheten opp.",
  weakened: "Kilden holdt ikke like godt som vi trodde — sikkerheten ned.",
  status_changed: "Driftsstatus flyttet seg, for eksempel fra planlagt til under bygging.",
  rejected: "Påstanden holdt ikke. Funnet tas ut av køen.",
  reopened: "Et avvist funn tas opp igjen, med ny dato.",
  unresolved: "Undersøkt uten å komme til bunnen. Blir liggende som oppfølging.",
  snoozed: "Utsatt med begrunnelse. Ikke en måte å skjule noe på.",
};

/** Hvor mange dager fram «review snart» strekker seg. Samme tall som i basen. */
export const DUE_SOON_DAGER = 14;
/** Hvor mange dager etter forfall noe regnes som forsinket og ikke bare forfalt. */
export const OVERDUE_GRENSE_DAGER = 14;

export interface ReviewKøElement {
  id: string;
  title: string;
  item_type: string;
  category: string;
  subcategory: string | null;
  municipality: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  operational_status: string;
  verification_status: string;
  confidence: string;
  interest_level: string;
  public_candidate: boolean;
  why_interesting: string | null;
  review_state: ReviewState;
  review_reasons: ReviewReason[];
  review_priority: number;
  next_review_at: string | null;
  review_interval_days: number | null;
  review_mode: ReviewMode;
  review_mode_note: string | null;
  last_reviewed_at: string | null;
  last_verified_at: string | null;
  days_since_review: number | null;
  days_until_review: number | null;
  review_count: number;
  source_count: number;
  has_primary_source: boolean;
  last_outcome: ReviewOutcome | null;
}

export interface ReviewMetrics {
  total: number;
  with_policy: number;
  current: number;
  due_soon: number;
  due: number;
  overdue: number;
  needs_followup: number;
  blocked: number;
  no_review_needed: number;
  never_reviewed: number;
  planned_or_building_due: number;
  weak_high_interest_due: number;
  public_candidates_due: number;
  avg_days_since_review: number | null;
  reviews_logged: number;
}

export interface ReviewHistorikk {
  id: string;
  research_run_id: string | null;
  run_label: string | null;
  reviewed_at: string;
  reviewed_by: string | null;
  outcome: ReviewOutcome;
  changed: boolean;
  previous_status: string | null;
  new_status: string | null;
  previous_confidence: string | null;
  new_confidence: string | null;
  summary: string | null;
  sources_checked: number;
  source_ids: string[];
  review_reasons: ReviewReason[];
  next_review_at: string | null;
}

export interface ReviewStatus {
  review_state: ReviewState;
  review_reasons: ReviewReason[];
  review_priority: number;
  next_review_at: string | null;
  review_interval_days: number | null;
  review_mode: ReviewMode;
  review_mode_note: string | null;
  last_reviewed_at: string | null;
  last_verified_at: string | null;
  days_since_review: number | null;
  days_until_review: number | null;
  review_count: number;
  has_primary_source: boolean;
  newest_source_date: string | null;
  last_outcome: ReviewOutcome | null;
  review_unchanged_streak: number;
  last_review_changed_at: string | null;
}

/**
 * Hvorfor neste review er der den er.
 *
 * Poenget med denne funksjonen er punkt for punkt det motsatte av en ugjennomsiktig score: en
 * dato uten begrunnelse er en dato ingen stoler på. Grunnlaget er intervallet basen faktisk
 * brukte, pluss grunnene som forkortet det.
 */
export function forklarNesteReview(s: {
  review_mode: ReviewMode;
  review_interval_days: number | null;
  review_reasons: ReviewReason[];
  next_review_at: string | null;
  review_mode_note?: string | null;
}): string {
  if (s.review_mode === "none") {
    return s.review_mode_note?.trim() || "Satt til å ikke trenge review.";
  }
  if (s.review_mode === "blocked") {
    return s.review_mode_note?.trim() || "Reviewen står på noe eksternt.";
  }
  if (s.review_mode === "manual") {
    return `Manuelt satt dato. ${s.review_mode_note?.trim() ?? ""}`.trim();
  }
  if (s.review_interval_days == null) {
    return "Ingen review etter policy: avvist, arkivert eller stabilt historisk.";
  }

  const drivere = s.review_reasons.filter((r) =>
    (
      [
        "under_construction",
        "planned_project",
        "status_unknown",
        "high_interest",
        "low_confidence",
        "medium_confidence",
        "public_candidate",
        "missing_primary_source",
        "missing_coordinates",
        "previously_changed",
      ] as ReviewReason[]
    ).includes(r),
  );
  const hale = drivere.length ? ` · ${drivere.map((r) => REVIEW_REASON_LABEL[r]).join(", ")}` : "";
  return `${s.review_interval_days} dagers intervall${hale}`;
}

/** «Sist kontrollert for 84 dager siden», eller at det aldri er gjort. */
export function sistKontrollert(dager: number | null): string {
  if (dager == null) return "Aldri kontrollert";
  if (dager === 0) return "Kontrollert i dag";
  if (dager === 1) return "Kontrollert i går";
  return `Sist kontrollert for ${dager} dager siden`;
}

/** «12 dager forsinket», «review om 9 dager», «review i dag». */
export function nårReview(dager: number | null, state: ReviewState): string {
  if (state === "no_review_needed") return "Ingen review planlagt";
  if (dager == null) return "Uten dato";
  if (dager < 0) return `${Math.abs(dager)} ${Math.abs(dager) === 1 ? "dag" : "dager"} forsinket`;
  if (dager === 0) return "Review i dag";
  return `Review om ${dager} ${dager === 1 ? "dag" : "dager"}`;
}

/** Grunnene som én lesbar linje: «Planlagt prosjekt · høy interesse · mangler primærkilde». */
export function grunnlinje(reasons: ReviewReason[], maks = 4): string {
  const kjente = reasons.filter((r) => r in REVIEW_REASON_LABEL);
  const vist = kjente.slice(0, maks).map((r) => REVIEW_REASON_LABEL[r]);
  const rest = kjente.length - vist.length;
  const linje = vist.join(" · ");
  const ut = rest > 0 ? `${linje} · +${rest}` : linje;
  return ut ? ut.charAt(0).toUpperCase() + ut.slice(1) : "Ingen særskilt grunn";
}
