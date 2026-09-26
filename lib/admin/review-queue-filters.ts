/**
 * Filtrene bak review-køen: URL-tilstand og hurtigfiltre.
 *
 * Rene funksjoner uten database, av samme grunn som kartfiltrene: filterlogikk er den delen som
 * lettest blir feil uten at noen merker det, og en ødelagt URL skal gi en brukbar kø framfor en
 * tom skjerm.
 */

import { AKTUELLE_STATES, REVIEW_REASONS, REVIEW_STATES, type ReviewReason, type ReviewState } from "./review-types";
import { LEVELS, OPERATIONAL_STATUSES, type Level, type OperationalStatus } from "./research-types";

export interface Køfilter {
  states: ReviewState[];
  kategori?: string;
  drift: OperationalStatus[];
  confidence: Level[];
  interesse: Level[];
  reasons: ReviewReason[];
  kommune?: string;
  sok?: string;
  side: number;
}

export const SIDESTØRRELSE = 25;

/**
 * Hurtigfiltrene. Dette er køens egentlige inngang: «vis meg det forsinkede», ikke «sett
 * sammen fem nedtrekksmenyer».
 */
export interface Hurtigfilter {
  slug: string;
  label: string;
  /** Delvis filter som legges på toppen av standarden. */
  filter: Partial<Køfilter>;
}

export const HURTIGFILTRE: Hurtigfilter[] = [
  { slug: "aktuelle", label: "Aktuelle nå", filter: { states: [...AKTUELLE_STATES] } },
  { slug: "forsinket", label: "Forsinket", filter: { states: ["overdue"] } },
  { slug: "planlagt", label: "Planlagt", filter: { states: [...AKTUELLE_STATES], reasons: ["planned_project"] } },
  {
    slug: "bygging",
    label: "Under bygging",
    filter: { states: [...AKTUELLE_STATES], reasons: ["under_construction"] },
  },
  {
    slug: "svake",
    label: "Svake high-interest",
    filter: {
      states: [...AKTUELLE_STATES],
      interesse: ["high"],
      confidence: ["low", "medium"],
    },
  },
  {
    slug: "kandidater",
    label: "Public candidates",
    filter: { states: [...AKTUELLE_STATES], reasons: ["public_candidate"] },
  },
  {
    slug: "primaerkilde",
    label: "Mangler primærkilde",
    filter: { states: [...AKTUELLE_STATES], reasons: ["missing_primary_source"] },
  },
  {
    slug: "koordinat",
    label: "Uten koordinat",
    filter: { states: [...AKTUELLE_STATES], reasons: ["missing_coordinates"] },
  },
  { slug: "snart", label: "Snart", filter: { states: ["due_soon"] } },
  { slug: "blokkert", label: "Blokkert", filter: { states: ["blocked"] } },
];

export const STANDARDFILTER: Køfilter = {
  states: [...AKTUELLE_STATES],
  drift: [],
  confidence: [],
  interesse: [],
  reasons: [],
  side: 1,
};

type Params = Record<string, string | string[] | undefined>;

function første(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

/** Leser en kommaliste og kaster ukjente verdier. Ugyldig input blir «ingen filter», aldri tomt. */
function liste<T extends string>(v: string | string[] | undefined, gyldige: readonly T[]): T[] {
  const rå = første(v);
  if (!rå) return [];
  const valgt = rå
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (gyldige as readonly string[]).includes(s));
  return [...new Set(valgt)];
}

export function lesKøfilter(params: Params): Køfilter {
  const hurtig = HURTIGFILTRE.find((h) => h.slug === første(params.vis));
  const states = liste(params.state, REVIEW_STATES);
  const side = Number.parseInt(første(params.side) ?? "1", 10);

  const grunn: Køfilter = {
    ...STANDARDFILTER,
    ...hurtig?.filter,
    kategori: første(params.kategori),
    kommune: første(params.kommune),
    sok: første(params.q),
    side: Number.isFinite(side) && side > 0 ? side : 1,
  };

  return {
    ...grunn,
    // Eksplisitte parametre vinner over hurtigfilteret, slik at en delt URL kan finjusteres.
    states: states.length ? states : grunn.states,
    drift: liste(params.drift, OPERATIONAL_STATUSES).length ? liste(params.drift, OPERATIONAL_STATUSES) : grunn.drift,
    confidence: liste(params.sikkerhet, LEVELS).length ? liste(params.sikkerhet, LEVELS) : grunn.confidence,
    interesse: liste(params.interesse, LEVELS).length ? liste(params.interesse, LEVELS) : grunn.interesse,
    reasons: liste(params.grunn, REVIEW_REASONS).length ? liste(params.grunn, REVIEW_REASONS) : grunn.reasons,
  };
}

/** Filteret som URL-parametre. Tomme verdier utelates, så lenker holder seg lesbare. */
export function skrivKøfilter(f: Køfilter): URLSearchParams {
  const p = new URLSearchParams();
  const sammeSomStandard =
    f.states.length === STANDARDFILTER.states.length && f.states.every((s) => STANDARDFILTER.states.includes(s));
  if (!sammeSomStandard && f.states.length) p.set("state", f.states.join(","));
  if (f.kategori) p.set("kategori", f.kategori);
  if (f.drift.length) p.set("drift", f.drift.join(","));
  if (f.confidence.length) p.set("sikkerhet", f.confidence.join(","));
  if (f.interesse.length) p.set("interesse", f.interesse.join(","));
  if (f.reasons.length) p.set("grunn", f.reasons.join(","));
  if (f.kommune) p.set("kommune", f.kommune);
  if (f.sok) p.set("q", f.sok);
  if (f.side > 1) p.set("side", String(f.side));
  return p;
}

export function køHref(f: Køfilter): string {
  const p = skrivKøfilter(f);
  const s = p.toString();
  return s ? `/admin/research/review?${s}` : "/admin/research/review";
}

/** Om et hurtigfilter er det aktive valget. Brukes til å markere knappen. */
export function hurtigErAktiv(h: Hurtigfilter, f: Køfilter): boolean {
  const ønsket = { ...STANDARDFILTER, ...h.filter };
  const likeLister = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  return (
    likeLister(ønsket.states, f.states) &&
    likeLister(ønsket.reasons, f.reasons) &&
    likeLister(ønsket.confidence, f.confidence) &&
    likeLister(ønsket.interesse, f.interesse) &&
    likeLister(ønsket.drift, f.drift)
  );
}

/** Antall filtre satt utover standarden. Til «Filtre (n)». */
export function antallEkstraFiltre(f: Køfilter): number {
  return [f.kategori, f.kommune, f.sok, f.drift.length, f.confidence.length, f.interesse.length, f.reasons.length]
    .filter(Boolean)
    .filter((v) => v !== 0).length;
}
