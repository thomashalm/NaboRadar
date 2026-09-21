import { describe, expect, it } from "vitest";
import { KartverketGeocodingProvider } from "@/lib/geocoding/kartverket/provider";

/**
 * Ekte kall mot Kartverket. Kjøres kun med RUN_NETWORK_TESTS=1 (npm run test:network),
 * ikke som standard og ikke i CI.
 */
const enabled = process.env.RUN_NETWORK_TESTS === "1";

describe.skipIf(!enabled)("Kartverket (nettverk)", () => {
  const provider = new KartverketGeocodingProvider();

  it.each([
    ["Sognsvann", "Sognsvann", 59.975, 10.729],
    ["Majorstuen", "Majorstuen", 59.93, 10.715],
    ["Oslo S", "Oslo sentralstasjon", 59.911, 10.752],
  ])("%s → %s", { timeout: 15_000 }, async (query, expectedLabel, lat, lng) => {
    const { results, sources } = await provider.searchDetailed(query);
    expect(sources).toEqual({ address: "ok", place: "ok" });
    const top = results[0]!;
    expect(top.label).toBe(expectedLabel);
    expect(top.latitude).toBeCloseTo(lat, 2);
    expect(top.longitude).toBeCloseTo(lng, 2);
  });

  it("Karl Johans gate 1 → finner adressen i Oslo", { timeout: 15_000 }, async () => {
    const results = await provider.search("Karl Johans gate 1");
    const oslo = results.find((r) => r.label === "Karl Johans gate 1" && r.municipalityNumber === "0301");
    expect(oslo).toBeDefined();
    expect(oslo!.latitude).toBeCloseTo(59.9114, 3);
    expect(oslo!.longitude).toBeCloseTo(10.7494, 3);
  });
});
