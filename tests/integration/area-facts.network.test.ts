import { describe, expect, it } from "vitest";
import { NveHoyspentDistribusjonLookup, NveKvikkleireAktsomhetLookup } from "@/lib/facts/lookups/nve";
import { FlystoyLookup, StoyvarselVegLookup, StrategiskStoyLookup } from "@/lib/facts/lookups/stoy";
import { areaFeatureProviders } from "@/lib/providers/area-registry";

/**
 * Ekte kall mot kildene bak «Hva bør du vite om området?».
 * Kjøres kun med RUN_NETWORK_TESTS=1. Innholdet i kildene endres over tid, så testene
 * sjekker egenskaper og formater — ikke eksakte verdier.
 */
const enabled = process.env.RUN_NETWORK_TESTS === "1";

const MAJORSTUEN = { lat: 59.92992, lng: 10.71488, radiusM: 1000 };
const ALNABRU = { lat: 59.9318, lng: 10.842, radiusM: 1000 };
const GARDERMOEN = { lat: 60.1976, lng: 11.1004, radiusM: 1000 };
const HARDANGERVIDDA = { lat: 60.3, lng: 7.5, radiusM: 3000 };

describe.skipIf(!enabled)("områdefakta – kilder (nettverk)", { timeout: 120_000 }, () => {
  it("alle synkede providere svarer på healthCheck", async () => {
    for (const provider of areaFeatureProviders) {
      const health = await provider.healthCheck();
      expect(health.ok, `${provider.id}: ${health.message}`).toBe(true);
    }
  });

  it("kvikkleire-aktsomhet: treff på Alnabru, ikke på Majorstuen", async () => {
    const lookup = new NveKvikkleireAktsomhetLookup();
    expect((await lookup.run(ALNABRU))[0]?.contains).toBe(true);
    expect(await lookup.run(MAJORSTUEN)).toEqual([]);
  });

  it("strategisk støy: Majorstuen har Lden-verdi for veg", async () => {
    const hits = await new StrategiskStoyLookup().run(MAJORSTUEN);
    const veg = hits.find((h) => h.subtype === "stoy_strategisk_veg");
    expect(veg?.attributes.niva).toMatch(/dB/);
    expect(veg?.contains).toBe(true);
  });

  it("T-1442 veg: svarer uten treff i Oslo sentrum", async () => {
    expect(await new StoyvarselVegLookup().run(MAJORSTUEN)).toEqual([]);
  });

  it("flystøy: rød eller gul sone ved Gardermoen, ingenting i Oslo", async () => {
    const hits = await new FlystoyLookup().run(GARDERMOEN);
    expect(hits).toHaveLength(1);
    expect(["rod", "gul"]).toContain(hits[0]!.attributes.sone);
    expect(await new FlystoyLookup().run(MAJORSTUEN)).toEqual([]);
  });

  it("høyspent distribusjonsnett: svarer, og gir avstand når linje finnes", async () => {
    const hits = await new NveHoyspentDistribusjonLookup().run(HARDANGERVIDDA);
    for (const hit of hits) {
      expect(hit.distanceM).toBeLessThanOrEqual(HARDANGERVIDDA.radiusM);
      expect(hit.distanceM).toBeGreaterThanOrEqual(0);
    }
  });

  it("ingen oppslag returnerer personopplysninger eller fritekst", async () => {
    const all = await Promise.all([
      new NveKvikkleireAktsomhetLookup().run(ALNABRU),
      new StrategiskStoyLookup().run(MAJORSTUEN),
      new FlystoyLookup().run(GARDERMOEN),
    ]);
    const dump = JSON.stringify(all);
    expect(dump).not.toMatch(/gnr|bnr|privatperson|beroert|berørt/i);
  });
});
