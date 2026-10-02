import { z } from "zod";
import { fetchJson } from "@/lib/http";

/**
 * Kommunenavn fra kommunenummer, hentet fra Kartverkets kommuneregister.
 *
 * Kildene våre oppgir bare nummeret. Hele registeret er 357 rader og endres ved
 * kommunereformer, så det hentes én gang og holdes i minnet et døgn. Svarer ikke Kartverket,
 * vises nummeret ikke i det hele tatt — et navn er pynt, ikke en opplysning vi må ha.
 */
const URL = "https://ws.geonorge.no/kommuneinfo/v1/kommuner";
const TTL_MS = 24 * 60 * 60 * 1000;

const schema = z.array(z.object({ kommunenummer: z.string(), kommunenavnNorsk: z.string() }));

let cached: { at: number; names: Map<string, string> } | null = null;
let pending: Promise<Map<string, string>> | null = null;

export async function municipalityNames(): Promise<Map<string, string>> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.names;
  pending ??= fetchJson(URL, { timeoutMs: 4_000, retries: 1 })
    .then((body) => {
      const names = new Map(schema.parse(body).map((k) => [k.kommunenummer, k.kommunenavnNorsk]));
      cached = { at: Date.now(), names };
      return names;
    })
    .catch((error: unknown) => {
      console.warn("[kommuner] fikk ikke hentet kommuneregisteret:", error instanceof Error ? error.name : "ukjent");
      // Et gammelt register er bedre enn ingenting; uten noe i det hele tatt gir vi et tomt.
      return cached?.names ?? new Map<string, string>();
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
