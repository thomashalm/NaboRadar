import { TtlCache } from "@/lib/cache";
import type { AreaLookup, LookupHit } from "./lookups/types";
import type { AreaCategory } from "@/types/area-feature";

export interface LookupResult {
  lookupId: string;
  category: AreaCategory;
  hits: LookupHit[];
  /** Når NaboRadar hentet svaret fra kilden. Bare satt for oppslag med langlivet cache. */
  fetchedAt?: string;
  /** Kilden svarte ikke nå; svaret er det sist lagrede. Minnecaches ikke, så neste søk prøver igjen. */
  stale?: boolean;
}

/**
 * Kjører de direkte oppslagene for ett punkt, med cache og pause per kilde.
 *
 * - **Hvert oppslag caches for seg.** Feiler stormflo, caches likevel flom, radon og støy, og neste
 *   besøk spør bare den som feilet. Før ble ingenting cachet når én kilde feilet, så én kilde som
 *   var nede gjorde hele `/omrade` treg for alle.
 * - **Feil er ikke fravær.** Et oppslag som kaster (tidsavbrudd, HTTP-feil, ugyldig svar), blir
 *   «svarte ikke» — aldri en tom liste. Bare et oppslag som returnerer, er et svar, også når svaret
 *   er «ingen treff».
 * - **Kort pause etter feil.** En kilde som nettopp feilet, spørres ikke igjen på `pauseMs` fra
 *   denne serverinstansen; den rapporteres som «svarte ikke» med en gang i stedet for at hvert besøk
 *   venter på tidsavbruddet. Kilden skjules ikke — brukeren ser fortsatt at den mangler.
 *
 * Rekkefølgen i svaret er alltid oppslagslistens, uavhengig av hva som kom fra cachen.
 */
export function createLookupRunner(
  lookups: readonly AreaLookup[],
  options: { cacheTtlMs?: number; cacheEntries?: number; pauseMs?: number; budgetMs?: number; now?: () => number } = {},
) {
  const cache = new TtlCache<LookupResult>(options.cacheTtlMs ?? 5 * 60 * 1000, options.cacheEntries ?? 2000);
  const pause = new Map<string, number>();
  const now = options.now ?? Date.now;
  const pauseMs = options.pauseMs ?? 30_000;
  const budgetMs = options.budgetMs ?? 8_000;

  async function run(lat: number, lng: number, radiusM: number): Promise<{ results: LookupResult[]; failed: string[]; called: string[] }> {
    // Fem desimaler (ca. 1 m), samme avrunding som /omrade gjør på koordinatene. Fire desimaler
    // (ca. 10 m) lot to nabobygg dele svar i fem minutter — støybånd langs en gate er smalere enn det.
    const sted = `${lat.toFixed(5)},${lng.toFixed(5)},${radiusM}`;
    const svar = new Map<string, LookupResult>();
    const failed: string[] = [];
    const skalKjøres: AreaLookup[] = [];
    /** Oppslag der kilden har pause, men som har en langlivet cache å svare fra. */
    const utenKilde = new Set<string>();

    for (const lookup of lookups) {
      const cached = cache.get(`${lookup.id}|${sted}`);
      const iPause = (pause.get(lookup.id) ?? 0) > now();
      if (cached) svar.set(lookup.id, cached);
      else if (iPause && lookup.runDetailed) {
        utenKilde.add(lookup.id);
        skalKjøres.push(lookup);
      } else if (iPause) failed.push(lookup.id);
      else skalKjøres.push(lookup);
    }

    if (skalKjøres.length > 0) {
      const signal = AbortSignal.timeout(budgetMs);
      const settled = await Promise.allSettled(
        skalKjøres.map(async (lookup): Promise<LookupResult> => {
          const context = { lat, lng, radiusM, signal, skipSource: utenKilde.has(lookup.id) };
          if (!lookup.runDetailed) return { lookupId: lookup.id, category: lookup.category, hits: await lookup.run(context) };
          const svar = await lookup.runDetailed(context);
          return {
            lookupId: lookup.id,
            category: lookup.category,
            hits: svar.hits,
            fetchedAt: svar.fetchedAt,
            ...(svar.origin === "stale-cache" ? { stale: true } : {}),
          };
        }),
      );
      settled.forEach((outcome, index) => {
        const lookup = skalKjøres[index]!;
        if (outcome.status === "fulfilled") {
          if (outcome.value.stale) {
            // Kilden svarte ikke. Brukeren får det lagrede svaret, men kilden behandles som nede:
            // ingen minnecache, og samme pause som etter en vanlig feil. En pause som alt løper,
            // forlenges ikke av at vi svarte fra cachen.
            if (!utenKilde.has(lookup.id)) pause.set(lookup.id, now() + pauseMs);
          } else {
            cache.set(`${lookup.id}|${sted}`, outcome.value);
            // Et ferskt svar fra cachen sier ingenting om kilden. Pausen står til kilden selv har svart.
            if (!utenKilde.has(lookup.id)) pause.delete(lookup.id);
          }
          svar.set(lookup.id, outcome.value);
        } else {
          if (!utenKilde.has(lookup.id)) pause.set(lookup.id, now() + pauseMs);
          failed.push(lookup.id);
          console.warn(`[facts] ${lookup.id} svarte ikke: ${outcome.reason instanceof Error ? outcome.reason.message.slice(0, 120) : "ukjent"}`);
        }
      });
    }

    const results = lookups.flatMap((lookup) => (svar.has(lookup.id) ? [svar.get(lookup.id)!] : []));
    const rekkefølge = lookups.map((l) => l.id);
    failed.sort((a, b) => rekkefølge.indexOf(a) - rekkefølge.indexOf(b));
    return { results, failed, called: skalKjøres.map((l) => l.id) };
  }

  return { run, clear: () => (cache.clear(), pause.clear()) };
}
