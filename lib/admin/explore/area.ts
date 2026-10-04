import type { MultiPolygon, Polygon, Position } from "geojson";
import { fetchJson } from "@/lib/http";
import type { Sted } from "./parse";
import type { ExploreArea, LngLatBox } from "./types";

/**
 * Grenseflaten for en kommune eller et fylke, fra Kartverkets kommuneregister.
 *
 * Samme register som gir kommunenavnene (lib/geo/municipalities.ts). Flaten brukes til å
 * avgrense treffene og til å zoome kartet. Svarer ikke Kartverket, kaster vi — da skal søket
 * si at stedet ikke kunne slås opp, ikke vise hele landet.
 */
const BASE = "https://ws.geonorge.no/kommuneinfo/v1";

export async function hentOmrade(sted: Sted, fetchImpl: typeof fetch = fetch): Promise<ExploreArea> {
  const sti = sted.kind === "kommune" ? `kommuner/${sted.number}` : `fylker/${sted.number}`;
  const body = (await fetchJson(`${BASE}/${sti}/omrade?utkoordsys=4258`, {
    timeoutMs: 8_000,
    retries: 1,
    fetchImpl,
    revalidate: 24 * 60 * 60,
  })) as { omrade?: { type?: string; coordinates?: unknown } };

  const type = body.omrade?.type;
  if ((type !== "Polygon" && type !== "MultiPolygon") || !Array.isArray(body.omrade?.coordinates)) {
    throw new Error("Kartverket ga ingen flate for stedet");
  }
  const polygon = { type, coordinates: body.omrade.coordinates } as Polygon | MultiPolygon;
  return { kind: sted.kind, name: sted.name, county: sted.county, box: boksFor(polygon), polygon };
}

const ringer = (flate: Polygon | MultiPolygon): Position[][] =>
  flate.type === "Polygon" ? flate.coordinates : flate.coordinates.flat();

export function boksFor(flate: Polygon | MultiPolygon): LngLatBox {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const ring of ringer(flate)) {
    for (const [lng, lat] of ring) {
      if (lng! < minLng) minLng = lng!;
      if (lng! > maxLng) maxLng = lng!;
      if (lat! < minLat) minLat = lat!;
      if (lat! > maxLat) maxLat = lat!;
    }
  }
  return { minLng, minLat, maxLng, maxLat };
}

/** Om et punkt ligger i flaten. Strålemetoden; hull i flaten teller som utenfor. */
export function punktIFlate(lng: number, lat: number, flate: Polygon | MultiPolygon): boolean {
  const polygoner = flate.type === "Polygon" ? [flate.coordinates] : flate.coordinates;
  return polygoner.some((polygon) => {
    const [ytre, ...hull] = polygon;
    return !!ytre && iRing(lng, lat, ytre) && !hull.some((ring) => iRing(lng, lat, ring));
  });
}

function iRing(lng: number, lat: number, ring: Position[]): boolean {
  let inne = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inne = !inne;
  }
  return inne;
}

/** Et kartutsnitt fra URL-en: «10.6,59.8,10.9,60.0». Null hvis det ikke er et gyldig utsnitt i Norge. */
export function lesUtsnitt(verdi: string | undefined): LngLatBox | null {
  const tall = (verdi ?? "").split(",").map(Number);
  if (tall.length !== 4 || tall.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = tall as [number, number, number, number];
  if (minLng >= maxLng || minLat >= maxLat || minLng < 0 || maxLng > 35 || minLat < 55 || maxLat > 73) return null;
  return { minLng, minLat, maxLng, maxLat };
}

/** Bredde og høyde i kilometer, grovt. Til å avgjøre om et utsnitt er lite nok for et tungt datasett. */
export function utsnittKm(box: LngLatBox): { bredde: number; hoyde: number } {
  const midt = ((box.minLat + box.maxLat) / 2) * (Math.PI / 180);
  return { bredde: (box.maxLng - box.minLng) * 111.32 * Math.cos(midt), hoyde: (box.maxLat - box.minLat) * 111.13 };
}
