import type { AreaGeometry } from "@/types/area-feature";

/**
 * Deler svært store flerdelte geometrier i flere mindre.
 *
 * Bakgrunn: NVEs «Område uten fare»-soner er MultiPolygon med opptil 1 935 deler (2,3 MB).
 * Én slik rad brukte over 8 sekunder å skrive og sprengte API-ets tidsgrense. Delene er
 * geografisk atskilte uansett, så oppdeling endrer verken avstand eller «ligger innenfor».
 */
const DEFAULT_MAX_BYTES = 150_000;

export function splitLargeMultiGeometry(geometry: AreaGeometry, maxBytes = DEFAULT_MAX_BYTES): AreaGeometry[] {
  if (geometry.type !== "MultiPolygon" && geometry.type !== "MultiLineString") return [geometry];
  if (JSON.stringify(geometry).length <= maxBytes) return [geometry];

  const parts = geometry.coordinates as unknown[];
  const chunks: unknown[][] = [];
  let current: unknown[] = [];
  let bytes = 0;

  for (const part of parts) {
    const size = JSON.stringify(part).length;
    if (current.length > 0 && bytes + size > maxBytes) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(part);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);

  return chunks.map((coordinates) => ({ type: geometry.type, coordinates }) as AreaGeometry);
}

/** Omtrentlig areal i kvadratgrader (shoelace). Bare for å oppdage degenererte flater. */
function ringArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 1; i < ring.length; i++) {
    const [x1, y1] = ring[i - 1]!;
    const [x2, y2] = ring[i]!;
    sum += (x1 ?? 0) * (y2 ?? 0) - (x2 ?? 0) * (y1 ?? 0);
  }
  return Math.abs(sum) / 2;
}

/**
 * Er flaten stor nok til å lagres? Noen kilder har degenererte polygoner (null areal) som
 * blir tomme i PostGIS etter validering. De avvises som datakvalitet, ikke som skrivefeil.
 */
export function hasDrawableArea(geometry: AreaGeometry): boolean {
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return true;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  // 1e-12 kvadratgrader ≈ 0,01 m² ved norske breddegrader.
  return polygons.some((polygon) => (polygon[0] ? ringArea(polygon[0] as number[][]) > 1e-12 : false));
}
