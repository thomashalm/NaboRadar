import { describe, expect, it } from "vitest";
import { antallAvanserte, AVANSERTE_FILTRE, flereFiltreLabel, STANDARDFILTRE } from "@/lib/admin/research-filtre";

/**
 * Research-oversikten viser kommune, kategori og sortering. Resten ligger bak «Flere filtre».
 * Oppdelingen er bare visning: alle åtte filtrene finnes fortsatt.
 */
describe("research-filtre", () => {
  it("ingen filtre er fjernet: to står framme, seks bak «Flere filtre»", () => {
    expect([...STANDARDFILTRE, ...AVANSERTE_FILTRE].sort()).toEqual(
      ["drift", "folsomhet", "interesse", "kategori", "kommune", "sikkerhet", "status", "type"].sort(),
    );
  });

  it("teller bare de avanserte filtrene som er i bruk", () => {
    expect(antallAvanserte({})).toBe(0);
    expect(antallAvanserte({ kommune: "Oslo", kategori: "datasenter" })).toBe(0);
    expect(antallAvanserte({ kommune: "Oslo", status: "unverified" })).toBe(1);
    expect(antallAvanserte({ status: "unverified", sikkerhet: "high", interesse: undefined })).toBe(2);
  });

  it("knappen sier hvor mange som er aktive", () => {
    expect(flereFiltreLabel(0)).toBe("Flere filtre");
    expect(flereFiltreLabel(2)).toBe("Flere filtre (2)");
  });
});
