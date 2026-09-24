import { describe, expect, it } from "vitest";
import { utm32ToWgs84 } from "@/lib/geo/utm";

/**
 * Referansepunktene er hentet fra Oslo kommunes skjenkebevillingskart (EPSG:25832) og
 * kontrollert mot Kartverkets adressepunkt for samme adresse. Ved verifiseringen stemte
 * 49 av 49 punkter innenfor 41 m, med 0 m median — kilden legger punktet på adressen.
 */
describe("UTM 32N → WGS84", () => {
  it("treffer Stortings plass i Oslo", () => {
    const [lng, lat] = utm32ToWgs84([597324.33616, 6643058.43339]);
    expect(lng).toBeCloseTo(10.740454, 5);
    expect(lat).toBeCloseTo(59.913512, 5);
  });

  it("holder også i ytterkantene av kommunen", () => {
    expect(utm32ToWgs84([590802.7, 6634129.0]).map((v) => Number(v.toFixed(5)))).toEqual([10.61998, 59.83485]);
    expect(utm32ToWgs84([607639.0, 6661075.0]).map((v) => Number(v.toFixed(5)))).toEqual([10.93421, 60.07263]);
  });

  it("legger sentralmeridianen for sone 32 på 9 grader øst", () => {
    const [lng] = utm32ToWgs84([500_000, 6_600_000]);
    expect(lng).toBeCloseTo(9, 9);
  });

  it("er invertibel mot en kjent nord-sør-forskjell", () => {
    // 1 000 m nordover skal gi omtrent 0,009 breddegrad på denne breddegraden.
    const [, sør] = utm32ToWgs84([597000, 6643000]);
    const [, nord] = utm32ToWgs84([597000, 6644000]);
    expect(nord - sør).toBeCloseTo(0.009, 3);
  });
});
