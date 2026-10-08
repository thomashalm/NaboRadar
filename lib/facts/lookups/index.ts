import {
  KartverketStormfloLookup,
  NguRadonLookup,
  NveFlomLookup,
  NveSkredLookup,
} from "./naturfare";
import { NveHoyspentDistribusjonLookup, NveKvikkleireAktsomhetLookup } from "./nve";
import { FlystoyLookup, StoyvarselVegLookup, StrategiskStoyLookup } from "./stoy";
import { getReadDb } from "@/lib/db";
import { CachedNoiseLookup, createDbNoiseCacheStore } from "../noise-cache";
import type { AreaLookup } from "./types";

/**
 * Kilder som spørres direkte per søk, fordi de er for store til synk eller kun
 * svarer på «ligger punktet innenfor?». Se docs/area-facts-discovery.md.
 */
export const areaLookups: readonly AreaLookup[] = [
  /*
   * Rekkefølgen er visningsrekkefølgen innenfor naturfare: kvikkleire først fordi den er den
   * eldste og mest etablerte, deretter flom, skred, radon og stormflo. Innenfor hvert oppslag
   * kommer kartlagte soner før aktsomhetsområder, og sorteringen på `contains` gjør resten.
   */
  new NveKvikkleireAktsomhetLookup(),
  new NveFlomLookup(),
  new NveSkredLookup(),
  new NguRadonLookup(),
  new KartverketStormfloLookup(),
  // Strategisk støykartlegging har en langlivet databasecache foran seg (lib/facts/noise-cache.ts).
  new CachedNoiseLookup(
    new StrategiskStoyLookup(),
    createDbNoiseCacheStore(getReadDb, process.env.NOISE_CACHE_WRITE_TOKEN),
  ),
  new StoyvarselVegLookup(),
  new FlystoyLookup(),
  new NveHoyspentDistribusjonLookup(),
];

export type { AreaLookup, DetailedLookupOutcome, LookupContext, LookupHit } from "./types";
