import kuratert from "@/data/skolekretser.json";
import { getReadDb } from "@/lib/db";

/**
 * Hvilket veiledende inntaksområde for barneskole en adresse ligger i.
 *
 * Server-side, som søsknene i lib/facts. Modulen er bevisst uten "server-only", slik at den
 * rene avgjørelsen kan testes — databasekallet ligger bak getReadDb() og importeres aldri
 * fra en klientkomponent.
 *
 * Til forskjell fra resten av områdefaktaene spør denne ikke «hva er i nærheten?», men
 * «hvilket område ligger punktet inne i?». Derfor radius på én meter og filter på at
 * polygonet faktisk dekker punktet: en krets som bare ligger i nærheten er naboens, ikke
 * adressens, og skal ikke nevnes.
 *
 * Kilden dekker bare Oslo. Utenfor Oslo finner vi ingenting, og da sier vi ingenting —
 * «ingen treff» ville vært en påstand vi ikke har dekning for.
 */

/** Nok til å fange polygonet som dekker punktet, uten å dra med naboene. */
const RADIUS_M = 1;

interface KuratertKrets {
  krets: string;
  skoler: { navn: string; orgnr: string | null }[];
}

const KRETSER = new Map<string, KuratertKrets>(
  (kuratert.kretser as KuratertKrets[]).map((k) => [k.krets, k]),
);

export interface SkolekretsSkole {
  navn: string;
  /** Organisasjonsnummer fra Udir, når skolen finnes i vår egen skolesynk. */
  orgnr: string | null;
}

export type SkolekretsResultat =
  /** Punktet ligger i nøyaktig ett inntaksområde. */
  | { status: "ok"; krets: string; skoler: readonly SkolekretsSkole[]; kildeUrl: string }
  /** Ingen krets dekker punktet: utenfor Oslo, eller et hull i kildens dekning. */
  | { status: "utenfor" }
  /** Flere kretser dekker punktet. Datakvalitetsfeil — vi velger ikke én av dem. */
  | { status: "flertydig"; kretser: readonly string[] }
  | { status: "utilgjengelig" };

export interface SkolekretsRad {
  title: string;
  contains: boolean;
  source_url: string | null;
}

/**
 * Avgjørelsen, skilt ut fra databasekallet så den kan testes for seg.
 *
 * Radiusen fanger også polygoner som bare tangerer punktet, så `contains` er det som teller.
 * Dekkes punktet av flere kretser, er kilden i uorden — da velger vi ikke én av dem.
 */
export function velgKrets(rader: readonly SkolekretsRad[], slaaOppSkoler = slaaOpp): SkolekretsResultat {
  const dekker = rader.filter((rad) => rad.contains);
  if (dekker.length === 0) return { status: "utenfor" };
  if (dekker.length > 1) return { status: "flertydig", kretser: dekker.map((rad) => rad.title) };

  const krets = dekker[0]!.title;
  return {
    status: "ok",
    krets,
    // Koblingen til skole ligger i repoet, ikke i databasen: en feil kan rettes uten ny sync.
    skoler: slaaOppSkoler(krets),
    kildeUrl: dekker[0]!.source_url ?? kuratert.kildeUrl,
  };
}

const slaaOpp = (krets: string): readonly SkolekretsSkole[] => KRETSER.get(krets)?.skoler ?? [];

export async function getSkolekrets(lat: number, lng: number): Promise<SkolekretsResultat> {
  const db = await getReadDb();
  if (!db) return { status: "utilgjengelig" };

  let rader: SkolekretsRad[];
  try {
    rader = await db.rpc<SkolekretsRad>("features_near", {
      lat,
      lng,
      radius_m: RADIUS_M,
      categories: ["skolekrets"],
      max_results: 5,
    });
  } catch (error) {
    console.error("[skolekrets] oppslaget feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "utilgjengelig" };
  }

  return velgKrets(rader);
}
