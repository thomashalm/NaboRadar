import { NveHoyspentDistribusjonLookup, NveKvikkleireAktsomhetLookup } from "./nve";
import { FlystoyLookup, StoyvarselVegLookup, StrategiskStoyLookup } from "./stoy";
import type { AreaLookup } from "./types";

/**
 * Kilder som spørres direkte per søk, fordi de er for store til synk eller kun
 * svarer på «ligger punktet innenfor?». Se docs/area-facts-discovery.md.
 */
export const areaLookups: readonly AreaLookup[] = [
  new NveKvikkleireAktsomhetLookup(),
  new StrategiskStoyLookup(),
  new StoyvarselVegLookup(),
  new FlystoyLookup(),
  new NveHoyspentDistribusjonLookup(),
];

export type { AreaLookup, LookupContext, LookupHit } from "./types";
