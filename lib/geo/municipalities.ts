import { z } from "zod";
import { fetchJson } from "@/lib/http";

/**
 * Kommune- og fylkesnavn fra kommunenummer, hentet fra Kartverkets kommuneregister.
 *
 * Kildene våre oppgir bare nummeret. Hele registeret er 357 kommuner i 15 fylker og endres
 * ved kommunereformer, så det hentes én gang og holdes i minnet et døgn. Svarer ikke
 * Kartverket, vises navnet ikke i det hele tatt — det er pynt, ikke en opplysning vi må ha.
 */
const URL = "https://ws.geonorge.no/kommuneinfo/v1/fylkerkommuner";
const TTL_MS = 24 * 60 * 60 * 1000;

const schema = z.array(
  z.object({
    fylkesnavn: z.string(),
    kommuner: z.array(z.object({ kommunenummer: z.string(), kommunenavnNorsk: z.string() })),
  }),
);

export interface MunicipalityInfo {
  name: string;
  county: string;
}

let cached: { at: number; names: Map<string, MunicipalityInfo> } | null = null;
let pending: Promise<Map<string, MunicipalityInfo>> | null = null;

export async function municipalityNames(): Promise<Map<string, MunicipalityInfo>> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.names;
  pending ??= fetchJson(URL, { timeoutMs: 4_000, retries: 1 })
    .then((body) => {
      const names = new Map<string, MunicipalityInfo>();
      for (const fylke of schema.parse(body)) {
        for (const kommune of fylke.kommuner) {
          names.set(kommune.kommunenummer, { name: kommune.kommunenavnNorsk, county: fylke.fylkesnavn });
        }
      }
      cached = { at: Date.now(), names };
      return names;
    })
    .catch((error: unknown) => {
      console.warn("[kommuner] fikk ikke hentet kommuneregisteret:", error instanceof Error ? error.name : "ukjent");
      // Et gammelt register er bedre enn ingenting; uten noe i det hele tatt gir vi et tomt.
      return cached?.names ?? new Map<string, MunicipalityInfo>();
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
