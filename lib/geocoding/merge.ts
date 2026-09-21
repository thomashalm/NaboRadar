import type { MergeGeocodingResults, ScoredLocation, SearchLocation } from "./types";

/** Små bokstaver, uten tegnsetting og doble mellomrom — for sammenligning, ikke visning. */
export function normalizeForMatch(value: string): string {
  return value
    .toLocaleLowerCase("nb-NO")
    .replace(/[.,'’"*()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tekstrelevans for et navn mot søket. */
export function textRelevance(label: string, query: string): number {
  const l = normalizeForMatch(label);
  const q = normalizeForMatch(query);
  if (!q) return 0;
  if (l === q) return 100;
  if (l.startsWith(q)) return 60;
  if (l.split(" ").some((word) => word.startsWith(q))) return 30;
  return 10;
}

/** Tillegg som gjør at adresser vinner over stedsnavn ved lik tekstrelevans. */
export const ADDRESS_BONUS = 15;

export const mergeGeocodingResults: MergeGeocodingResults = (addresses, places, query, limit) => {
  const scored: { location: SearchLocation; score: number; order: number }[] = [];
  let order = 0;
  const add = (items: ScoredLocation[], sourceBonus: number) => {
    for (const { location, boost } of items) {
      scored.push({
        location,
        score: textRelevance(location.label, query) + sourceBonus + boost,
        order: order++,
      });
    }
  };
  add(addresses, ADDRESS_BONUS);
  add(places, 0);

  // Stabil sortering: lik score beholder kildens rekkefølge (adresser før stedsnavn).
  scored.sort((a, b) => b.score - a.score || a.order - b.order);

  const seen = new Set<string>();
  const result: SearchLocation[] = [];
  for (const { location } of scored) {
    const key = `${normalizeForMatch(location.label)}|${location.latitude.toFixed(4)}|${location.longitude.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(location);
    if (result.length >= limit) break;
  }
  return result;
};
