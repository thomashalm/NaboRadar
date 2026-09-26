import type { LngLatBounds } from "@/lib/geo/bounds";

/**
 * Utsnittet kartet skal vise.
 *
 * Standard er hele Norge, ikke Oslo: dette er et nasjonalt researchkart, og et startpunkt i
 * hovedstaden ville gjort resten av landet til noe man må lete seg fram til.
 */
export const NORGE: LngLatBounds = [
  [4.0, 57.8],
  [31.5, 71.3],
];

/** Litt luft rundt punktene, i grader. Ett punkt får et vindu, ikke maksimal zoom. */
const LUFT = 0.05;

export function boundsFor(punkter: readonly { lat: number; lng: number }[]): LngLatBounds {
  if (punkter.length === 0) return NORGE;
  const lat = punkter.map((p) => p.lat);
  const lng = punkter.map((p) => p.lng);
  const min: [number, number] = [Math.min(...lng) - LUFT, Math.min(...lat) - LUFT];
  const max: [number, number] = [Math.max(...lng) + LUFT, Math.max(...lat) + LUFT];
  return [min, max];
}
