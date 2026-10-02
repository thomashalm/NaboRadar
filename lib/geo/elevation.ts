import { z } from "zod";
import { TtlCache } from "@/lib/cache";
import { fetchJson } from "@/lib/http";

/**
 * Terrenghøyden i et punkt, fra Kartverkets åpne høydemodell (CC BY 4.0).
 *
 * Brukes på hyttesiden. Det er høyden på terrenget der punktet står, ikke en oppmålt høyde
 * for bygget — og punktet i N50 kan ligge noen meter feil — så tallet vises avrundet og med
 * «ca.». Svarer ikke tjenesten innen fristen, vises ingen høyde.
 */
const URL = "https://ws.geonorge.no/hoydedata/v1/punkt";
const schema = z.object({ punkter: z.array(z.object({ z: z.number().nullable() })).min(1) });

const cache = new TtlCache<number | null>(24 * 60 * 60 * 1000, 2_000);

export async function elevationAt(lat: number, lng: number): Promise<number | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  try {
    const body = await fetchJson(`${URL}?koordsys=4258&nord=${lat}&ost=${lng}&geojson=false`, { timeoutMs: 3_000, retries: 0 });
    const z = schema.parse(body).punkter[0]!.z;
    // Tjenesten svarer med en negativ plassholder utenfor dekning (hav, utland).
    const meters = z === null || z < -100 ? null : Math.round(z);
    cache.set(key, meters);
    return meters;
  } catch (error) {
    console.warn("[høyde] fikk ikke hentet høyde:", error instanceof Error ? error.name : "ukjent");
    return null;
  }
}
