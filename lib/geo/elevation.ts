import { z } from "zod";
import { fetchJson } from "@/lib/http";

/**
 * Terrenghøyden i et punkt, fra Kartverkets åpne høydemodell (CC BY 4.0).
 *
 * Brukes av hyttesynken, ikke av sidene: høyden lagres per hytte (`huts.terrain_elevation_m`)
 * og vises derfra. Det er høyden på terrenget der punktet står, ikke en oppmålt høyde for
 * bygget — og punktet i N50 kan ligge noen meter feil — så tallet vises avrundet og med «ca.».
 */
const URL = "https://ws.geonorge.no/hoydedata/v1/punkt";

/** Så mange punkter tar tjenesten i ett kall. */
export const ELEVATION_BATCH = 50;

const schema = z.object({
  punkter: z.array(z.object({ x: z.number(), y: z.number(), z: z.number().nullable(), datakilde: z.string().nullable().optional() })),
});

export interface ElevationPoint {
  lat: number;
  lng: number;
}

export interface ElevationResult {
  /** Avrundet til hel meter. Null når høydemodellen svarte uten verdi for punktet. */
  elevationM: number | null;
  /** Høydemodellens egen datakilde for punktet, f.eks. «dtm1». */
  source: string | null;
}

/**
 * Regelen fra hyttesiden: hel meter, og ingen verdi når tjenesten svarer med sin negative
 * plassholder utenfor dekning (hav, utland).
 */
export function elevationFromZ(z: number | null): number | null {
  return z === null || z < -100 ? null : Math.round(z);
}

/**
 * Høyden i opptil 50 punkter, i samme rekkefølge som de ble sendt. Kaster ved feil og
 * tidsavbrudd — da skal ingenting lagres, og forrige verdi står til neste forsøk.
 */
export async function elevationsAt(points: readonly ElevationPoint[], options: { fetchImpl?: typeof fetch } = {}): Promise<ElevationResult[]> {
  if (points.length === 0) return [];
  if (points.length > ELEVATION_BATCH) throw new RangeError(`Høyst ${ELEVATION_BATCH} punkter per kall`);
  const punkter = encodeURIComponent(JSON.stringify(points.map((p) => [p.lng, p.lat])));
  const body = await fetchJson(`${URL}?koordsys=4258&punkter=${punkter}&geojson=false`, {
    // Punkter utenfor den detaljerte modellen faller tilbake på høydekurver, og det første
    // oppslaget der kan ta lang tid.
    timeoutMs: 30_000,
    retries: 2,
    fetchImpl: options.fetchImpl,
  });
  const svar = schema.parse(body).punkter;
  if (svar.length !== points.length) throw new Error(`Høydemodellen svarte med ${svar.length} av ${points.length} punkter`);
  return svar.map((punkt) => ({ elevationM: elevationFromZ(punkt.z), source: punkt.datakilde ?? null }));
}
