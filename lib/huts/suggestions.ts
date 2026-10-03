import type { Hut } from "./queries";

/**
 * Forslag i søkefeltet på /hytter: hytter fra vårt eget register og steder fra Kartverkets
 * stedsnavn (samme geokoder som adressesøket på forsiden).
 *
 * Rekkefølgen:
 *   1. Hvor godt navnet treffer: likt søket > starter med søket > et ord starter med søket > resten.
 *   2. Ved like godt treff: hytta før stedet. Den som søker på /hytter, leter oftest etter en hytte.
 *   3. Ellers kildens egen rekkefølge.
 * Et sted med samme navn som en hytte i nærheten er den samme hytta i stedsnavnregisteret
 * (Spiterstulen er også en «Turisthytte» der). Det vises én gang, som hytte.
 */
export interface HutPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** «Troms», eller «Vågan, Nordland» når stedet ikke heter det samme som kommunen. */
  area: string | null;
}

export type HutSuggestion = { kind: "hut"; hut: Hut } | { kind: "place"; place: HutPlace };

export const SUGGESTION_LIMITS = { huts: 6, places: 3, total: 8 } as const;

/** Samme folding som navnesøket i databasen: o for ø, a for å, e for æ. */
export function foldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ae/g, "e")
    .replace(/oe/g, "o")
    .replace(/aa/g, "a")
    .replace(/[øö]/g, "o")
    .replace(/[åä]/g, "a")
    .replace(/[æéè]/g, "e")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchLevel(name: string, query: string): number {
  const n = foldName(name);
  const q = foldName(query);
  if (!q) return 0;
  if (n === q) return 3;
  if (n.startsWith(q)) return 2;
  if (n.split(" ").some((word) => word.startsWith(q))) return 1;
  return 0;
}

const SAME_PLACE_M = 2_000;

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = (((b.lng - a.lng) * Math.PI) / 180) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return 6_371_000 * Math.hypot(dLat, dLng);
}

export function rankSuggestions(query: string, huts: readonly Hut[], places: readonly HutPlace[]): HutSuggestion[] {
  const hutCandidates = huts.slice(0, SUGGESTION_LIMITS.huts).map((hut, index) => ({
    suggestion: { kind: "hut", hut } as HutSuggestion,
    level: matchLevel(hut.name, query),
    kindRank: 0,
    index,
  }));
  const placeCandidates = places
    .filter((place) => !huts.some((hut) => foldName(hut.name) === foldName(place.name) && distanceM(hut, place) <= SAME_PLACE_M))
    .slice(0, SUGGESTION_LIMITS.places)
    .map((place, index) => ({
      suggestion: { kind: "place", place } as HutSuggestion,
      level: matchLevel(place.name, query),
      kindRank: 1,
      index,
    }));
  return [...hutCandidates, ...placeCandidates]
    .sort((a, b) => b.level - a.level || a.kindRank - b.kindRank || a.index - b.index)
    .slice(0, SUGGESTION_LIMITS.total)
    .map((candidate) => candidate.suggestion);
}

/** Andre linje i forslaget: «Hytte · Skjåk» eller «Sted · Troms». */
export function suggestionSubtitle(suggestion: HutSuggestion): string {
  if (suggestion.kind === "hut") {
    const kommune = suggestion.hut.municipalityName;
    return kommune ? `Hytte · ${kommune}` : "Hytte";
  }
  return suggestion.place.area ? `Sted · ${suggestion.place.area}` : "Sted";
}
