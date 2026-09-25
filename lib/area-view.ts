import { getAreaEvents } from "@/lib/events/queries";
import { getAreaFacts } from "@/lib/facts/queries";
import { withTimeout } from "@/lib/timeout";
import type { AreaSort } from "@/types/event";

/**
 * Kildene til resultatvisningen, som løfter.
 *
 * Ligger her og ikke i siden, fordi mer enn én side viser det samme resultatet: den offentlige
 * /omrade og admins adressevisning. Fristene og oppdelingen i tre strømmer er produktvalg som
 * skal gjelde begge steder — endrer vi dem her, slår det gjennom overalt.
 */

/** Frister per kilde, satt ut fra målte svartider med god margin. */
const EVENT_TIMEOUT_MS = 8_000;
const DB_TIMEOUT_MS = 8_000;
/** Oppslagene har selv et budsjett på 8 s; dette er den ytre grensen. */
const LOOKUP_TIMEOUT_MS = 12_000;

export interface AreaViewInput {
  lat: number;
  lng: number;
  radius: number;
  sort: AreaSort;
}

/**
 * Tre strømmer, fordi kildene har helt ulik fart: målt på Alnabru bruker databasen 0,1–1,8 s,
 * mens de direkte oppslagene bruker opptil fem sekunder. Ingen await her — siden sendes med
 * adresse, radius, kart og layout med én gang, og hver kilde strømmer inn når den er ferdig.
 */
export function buildAreaView({ lat, lng, radius, sort }: AreaViewInput) {
  return {
    events: withTimeout(getAreaEvents({ lat, lng, radius, sort }), EVENT_TIMEOUT_MS, () => ({
      status: "unavailable" as const,
      devReason: `Tidsavbrudd etter ${EVENT_TIMEOUT_MS} ms`,
    })),
    storedFacts: withTimeout(getAreaFacts({ lat, lng, radius, sources: "db" }), DB_TIMEOUT_MS, () => ({
      status: "unavailable" as const,
      devReason: `Tidsavbrudd etter ${DB_TIMEOUT_MS} ms`,
    })),
    lookupFacts: withTimeout(getAreaFacts({ lat, lng, radius, sources: "lookups" }), LOOKUP_TIMEOUT_MS, () => ({
      status: "unavailable" as const,
      devReason: `Tidsavbrudd etter ${LOOKUP_TIMEOUT_MS} ms`,
    })),
  };
}
