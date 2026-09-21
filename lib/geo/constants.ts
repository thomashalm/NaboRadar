/** Radiusvalg i UI. Databasen tillater 1–10 000 m slik at valgene kan endres uten migrasjon. */
export const RADIUS_OPTIONS_M = [500, 1000, 3000] as const;
export type RadiusOptionM = (typeof RADIUS_OPTIONS_M)[number];
export const DEFAULT_RADIUS_M: RadiusOptionM = 1000;
export const MAX_RADIUS_M = 10_000;

/**
 * Standard produktfilter: vis saker varslet de siste N månedene.
 * Kilden har ingen status/sluttdato, så eldre saker skjules i visningen — de slettes ikke.
 */
export const DEFAULT_ANNOUNCED_WITHIN_MONTHS = 24;
