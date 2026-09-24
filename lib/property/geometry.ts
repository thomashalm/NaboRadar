import type { AreaGeometry } from "@/types/area-feature";

/** Ringene i en flate, som [lng, lat]-par. */
function ringsOf(geometry: AreaGeometry): number[][][] {
  if (geometry.type === "Polygon") return geometry.coordinates as number[][][];
  if (geometry.type === "MultiPolygon") return (geometry.coordinates as number[][][][]).flat();
  return [];
}

/**
 * Ligger punktet inne i flaten? Strålemetoden, med hull håndtert ved at et punkt som ligger
 * i et odde antall ringer regnes som innenfor — samme regel som PostGIS bruker.
 */
export function containsPoint(geometry: AreaGeometry, lng: number, lat: number): boolean {
  let inside = false;
  for (const ring of ringsOf(geometry)) {
    let crossings = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] as [number, number];
      const [xj, yj] = ring[j] as [number, number];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) crossings = !crossings;
    }
    if (crossings) inside = !inside;
  }
  return inside;
}

/** [sørLat, vestLng, nordLat, østLng] med valgfri margin i grader. */
export function boundsOf(geometry: AreaGeometry, padding = 0): [number, number, number, number] {
  let south = 90;
  let west = 180;
  let north = -90;
  let east = -180;
  for (const ring of ringsOf(geometry)) {
    for (const point of ring) {
      const lng = point[0];
      const lat = point[1];
      if (lng === undefined || lat === undefined) continue;
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lng);
      east = Math.max(east, lng);
    }
  }
  return [south - padding, west - padding, north + padding, east + padding];
}

/** Et punkt inne i flaten, brukt til å plassere kortet. Snittet av ytre ring holder for teiger. */
export function centerOf(geometry: AreaGeometry): [number, number] {
  const ring = ringsOf(geometry)[0] ?? [];
  if (ring.length === 0) return [0, 0];
  const sum = ring.reduce<[number, number]>((acc, point) => [acc[0] + (point[0] ?? 0), acc[1] + (point[1] ?? 0)], [0, 0]);
  return [sum[0] / ring.length, sum[1] / ring.length];
}
