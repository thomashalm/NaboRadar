import type { Geometry, Position } from "geojson";
import { distanceMeters } from "./radius";

/**
 * Avstand fra et punkt til en GeoJSON-geometri, i meter.
 * Brukes på data vi ikke har i PostGIS (direkte oppslag mot eksterne API-er).
 * Over korte avstander projiseres lokalt (ekvirektangulært) før punkt-til-linjestykke.
 */

const METERS_PER_DEG_LAT = 111_195;

function project(origin: { lat: number; lng: number }, [lng, lat]: Position): [number, number] {
  const cos = Math.cos((origin.lat * Math.PI) / 180);
  return [((lng ?? 0) - origin.lng) * METERS_PER_DEG_LAT * cos, ((lat ?? 0) - origin.lat) * METERS_PER_DEG_LAT];
}

function distanceToSegment(a: [number, number], b: [number, number]): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(ax, ay);
  // Projiser origo (0,0) på linjestykket.
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function ringContainsOrigin(ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > 0 !== yj > 0 && 0 < ((xj - xi) * (0 - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function ringsOf(geometry: Geometry): Position[][] {
  switch (geometry.type) {
    case "Polygon":
      return geometry.coordinates;
    case "MultiPolygon":
      return geometry.coordinates.flat();
    default:
      return [];
  }
}

function linesOf(geometry: Geometry): Position[][] {
  switch (geometry.type) {
    case "LineString":
      return [geometry.coordinates];
    case "MultiLineString":
      return geometry.coordinates;
    default:
      return [];
  }
}

export interface GeometryDistance {
  distanceM: number;
  /** Punktet ligger inne i polygonet. */
  contains: boolean;
}

export function distanceToGeometry(origin: { lat: number; lng: number }, geometry: Geometry): GeometryDistance {
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    return { distanceM: distanceMeters(origin, { lat: lat ?? 0, lng: lng ?? 0 }), contains: false };
  }
  if (geometry.type === "GeometryCollection") {
    const parts = geometry.geometries.map((g) => distanceToGeometry(origin, g));
    return {
      distanceM: Math.min(...parts.map((p) => p.distanceM)),
      contains: parts.some((p) => p.contains),
    };
  }

  const rings = ringsOf(geometry).map((ring) => ring.map((pos) => project(origin, pos)));
  const lines = linesOf(geometry).map((line) => line.map((pos) => project(origin, pos)));
  const multiPoints = geometry.type === "MultiPoint" ? geometry.coordinates.map((pos) => project(origin, pos)) : [];

  let min = Infinity;
  for (const path of [...rings, ...lines]) {
    for (let i = 1; i < path.length; i++) min = Math.min(min, distanceToSegment(path[i - 1]!, path[i]!));
  }
  for (const point of multiPoints) min = Math.min(min, Math.hypot(point[0], point[1]));

  // Ytre ring inneholder punktet, og ingen indre ring (hull) gjør det.
  let contains = false;
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    contains = polygons.some((polygon) => {
      const projected = polygon.map((ring) => ring.map((pos) => project(origin, pos)));
      const [outer, ...holes] = projected;
      return outer ? ringContainsOrigin(outer) && !holes.some(ringContainsOrigin) : false;
    });
  }

  return { distanceM: contains ? 0 : Number.isFinite(min) ? min : Infinity, contains };
}
