import type { Polygon, Position } from "geojson";

/** Middelradius for jorden (IUGG), samme som PostGIS bruker for sfæriske beregninger. */
const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Punktet man kommer til ved å gå `distanceM` meter i retning `bearingDeg` (storsirkel). */
export function destinationPoint(
  lat: number,
  lng: number,
  distanceM: number,
  bearingDeg: number,
): [lng: number, lat: number] {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return [toDeg(λ2), toDeg(φ2)];
}

/** Storsirkelavstand i meter (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dφ = toRad(b.lat - a.lat);
  const dλ = toRad(b.lng - a.lng);
  const h =
    Math.sin(dφ / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Geografisk korrekt sirkel som GeoJSON-polygon (lon/lat).
 * Hvert hjørne ligger nøyaktig `radiusM` meter fra sentrum — på 60° nord blir den
 * derfor «bredere» i grader enn høy, slik den skal i Web Mercator.
 */
export function circlePolygon(lat: number, lng: number, radiusM: number, steps = 128): Polygon {
  const ring: Position[] = [];
  for (let i = 0; i < steps; i++) {
    ring.push(destinationPoint(lat, lng, radiusM, (i * 360) / steps));
  }
  ring.push(ring[0]!);
  return { type: "Polygon", coordinates: [ring] };
}

/** [[minLng, minLat], [maxLng, maxLat]] som omslutter sirkelen. */
export function radiusBounds(
  lat: number,
  lng: number,
  radiusM: number,
): [[number, number], [number, number]] {
  const north = destinationPoint(lat, lng, radiusM, 0)[1];
  const south = destinationPoint(lat, lng, radiusM, 180)[1];
  const east = destinationPoint(lat, lng, radiusM, 90)[0];
  const west = destinationPoint(lat, lng, radiusM, 270)[0];
  return [
    [west, south],
    [east, north],
  ];
}
