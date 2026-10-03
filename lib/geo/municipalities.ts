import { z } from "zod";
import { fetchJson } from "@/lib/http";
import snapshot from "./kommuner-snapshot.json";

/**
 * Kommune- og fylkesnavn fra kommunenummer, hentet fra Kartverkets kommuneregister.
 *
 * Kildene våre oppgir bare nummeret. Hele registeret er 357 kommuner i 15 fylker og endres
 * ved kommunereformer, så det hentes én gang og holdes i minnet et døgn.
 *
 * Svarer ikke Kartverket, brukes et øyeblikksbilde av registeret som ligger i koden
 * (`kommuner-snapshot.json`, hentet 3. oktober 2026). Hyttesidene caches, og en side uten
 * kommune og fylke skal ikke bli liggende i en time fordi registeret var tregt i ett sekund.
 * Ved en kommunereform må øyeblikksbildet hentes på nytt.
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
  // Hyttesidene caches (ISR), og der må kallet kunne caches av Next: et døgn, som minnet over.
  pending ??= fetchJson(URL, { timeoutMs: 4_000, retries: 1, revalidate: TTL_MS / 1000 })
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
      // Et gammelt register er bedre enn ingenting; uten noe i minnet brukes øyeblikksbildet.
      return cached?.names ?? snapshotNames();
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Registeret slik det var da øyeblikksbildet ble tatt. */
export function snapshotNames(): Map<string, MunicipalityInfo> {
  return new Map(Object.entries(snapshot as Record<string, string[]>).map(([nr, [name = "", county = ""]]) => [nr, { name, county }]));
}
