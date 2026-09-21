import type { Geometry, Position } from "geojson";

export type LngLatBounds = [[number, number], [number, number]];

function positionsOf(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates;
    case "Polygon":
    case "MultiLineString":
      return geometry.coordinates.flat();
    case "MultiPolygon":
      return geometry.coordinates.flat(2);
    case "GeometryCollection":
      return geometry.geometries.flatMap(positionsOf);
  }
}

/** Omsluttende boks for én eller flere geometrier. */
export function geometryBounds(...geometries: Geometry[]): LngLatBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of geometries.flatMap(positionsOf)) {
    if (x === undefined || y === undefined) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return Number.isFinite(minX) ? [[minX, minY], [maxX, maxY]] : null;
}

export function containsPoint(bounds: LngLatBounds, [x, y]: [number, number]): boolean {
  return x >= bounds[0][0] && x <= bounds[1][0] && y >= bounds[0][1] && y <= bounds[1][1];
}
