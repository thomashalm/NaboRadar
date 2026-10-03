import type { Db } from "@/lib/db/types";
import { elevationsAt, type ElevationResult } from "@/lib/geo/elevation";

/**
 * Lagrer terrenghøyden for hyttene som mangler den: nye hytter, hytter synken har flyttet,
 * og alt sammen ved første backfill. Kjøres etter hyttesynken (se `afterSync` på hyttekildene)
 * og av `npm run huts:elevation`.
 *
 * Ett kall per ti hytter. Tjenesten tar 50 punkter, men i store kall spredt over landet faller
 * den tilbake på høydekurver for mange av dem i stedet for terrengmodellen (dtm1) — opptil 20 m
 * feil, målt 2026-10-03. Med ti per kall svarer den som for ett punkt. Et punkt som likevel
 * kommer tilbake fra høydekurvene, slås opp alene; svarer den fortsatt med kurver, finnes det
 * ingen terrengmodell der (f.eks. svenske fjellstuer), og da er det det beste svaret.
 *
 * Feiler et kall, lagres ingenting for de ti — forrige verdi står, og de plukkes opp neste
 * gang. Vi venter litt mellom kallene for å ikke belaste en åpen, gratis tjeneste unødig.
 */
const CHUNK = 10;
const KURVER = "hoydekurver";
export interface HutElevationResult {
  pending: number;
  written: number;
  failedBatches: number;
  /** Hytter som ble flyttet mens vi slo opp, og derfor står til neste gang. */
  moved: number;
}

interface PendingRow {
  id: string;
  latitude: number;
  longitude: number;
}

/** Supabase-API-et gir høyst så mange rader per kall; resten tas i neste runde. */
const ROUND_LIMIT = 1000;
const MAX_ROUNDS = 10;

export async function refreshHutElevations(
  db: Db,
  options: { limit?: number; pauseMs?: number; fetchImpl?: typeof fetch; onBatch?: (done: number, total: number) => void } = {},
): Promise<HutElevationResult> {
  const result: HutElevationResult = { pending: 0, written: 0, failedBatches: 0, moved: 0 };
  const tak = options.limit ?? 5000;
  const sett = new Set<string>();

  // Runder til køen er tom. En bolk som feilet, står i køen og kommer igjen i neste runde; en
  // runde som ikke lagrer noe, avslutter, så en tjeneste som er nede ikke gir en evig løkke.
  for (let runde = 0; runde < MAX_ROUNDS && result.pending < tak; runde++) {
    const rows = await db.rpc<PendingRow>("huts_needing_elevation", { p_limit: Math.min(ROUND_LIMIT, tak - result.pending) });
    if (rows.length === 0) break;
    for (const r of rows) {
      if (!sett.has(r.id)) result.pending += 1;
      sett.add(r.id);
    }
    let skrevetIRunden = 0;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const bolk = rows.slice(i, i + CHUNK);
      try {
        const høyder = await slåOpp(bolk, options.fetchImpl);
        const [skrevet] = await db.rpc<number>("set_hut_elevations", {
          p_rows: bolk.map((r, j) => ({ id: r.id, lat: r.latitude, lng: r.longitude, elevation_m: høyder[j]!.elevationM, source: høyder[j]!.source })),
        });
        skrevetIRunden += skrevet ?? 0;
        result.moved += bolk.length - (skrevet ?? 0);
      } catch (error) {
        result.failedBatches += 1;
        console.warn("[høyde] et kall feilet, prøver igjen ved neste kjøring:", error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : "ukjent");
      }
      options.onBatch?.(result.written + skrevetIRunden, result.pending);
      if (options.pauseMs && i + CHUNK < rows.length) await new Promise((r) => setTimeout(r, options.pauseMs));
    }
    result.written += skrevetIRunden;
    if (skrevetIRunden === 0 || rows.length < ROUND_LIMIT) break;
  }
  return result;
}

async function slåOpp(bolk: PendingRow[], fetchImpl?: typeof fetch): Promise<ElevationResult[]> {
  const punkt = (r: PendingRow) => ({ lat: r.latitude, lng: r.longitude });
  const høyder = await elevationsAt(bolk.map(punkt), { fetchImpl });
  for (let j = 0; j < bolk.length; j++) {
    if (bolk.length > 1 && høyder[j]!.source === KURVER) høyder[j] = (await elevationsAt([punkt(bolk[j]!)], { fetchImpl }))[0]!;
  }
  return høyder;
}

export function formatHutElevationResult(r: HutElevationResult): string {
  if (r.pending === 0) return "høyde: alle hytter har høyde for posisjonen sin";
  const deler = [`høyde: ${r.written} av ${r.pending} lagret`];
  if (r.moved > 0) deler.push(`${r.moved} flyttet underveis`);
  if (r.failedBatches > 0) deler.push(`${r.failedBatches} kall feilet (prøves igjen neste gang)`);
  return deler.join(", ");
}
