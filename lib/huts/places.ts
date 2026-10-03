import "server-only";
import { geocoder } from "@/lib/geocoding";
import { municipalityNames } from "@/lib/geo/municipalities";
import { foldName, type HutPlace } from "./suggestions";

/**
 * Steder til søkefeltet på /hytter. Gjenbruker geokoderen bak adressesøket (Kartverkets
 * stedsnavn og adresser, med cache), men tar bare med stedsnavn: en gateadresse er ikke et sted
 * man leter etter hytter rundt. Fylket hentes fra kommunenummeret, som på hyttesidene.
 *
 * Feiler oppslaget, gir det ingen steder — hyttetreffene vises uansett.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<HutPlace[]> {
  try {
    const [results, names] = await Promise.all([
      geocoder.search(query, { limit: 8, signal }),
      municipalityNames().catch(() => new Map<string, { name: string; county: string }>()),
    ]);
    return results
      .filter((result) => result.type === "place")
      .map((result) => {
        const info = result.municipalityNumber ? names.get(result.municipalityNumber) : undefined;
        const kommune = info?.name ?? result.municipalityName;
        const fylke = info?.county ?? null;
        // «Troms» for Harstad, «Vågan, Nordland» for Svolvær — og bare «Oslo» når kommune og fylke heter det samme.
        const deler = [kommune && !foldName(result.label).startsWith(foldName(kommune)) ? kommune : null, fylke ?? kommune];
        const area = [...new Set(deler.filter((del): del is string => Boolean(del)))].join(", ");
        return { id: result.id, name: result.label, lat: result.latitude, lng: result.longitude, area: area || null };
      });
  } catch {
    return [];
  }
}
