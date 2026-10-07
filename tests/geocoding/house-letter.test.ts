import { describe, expect, it } from "vitest";
import { joinHouseLetter } from "@/lib/geocoding/house-letter";

describe("joinHouseLetter", () => {
  it("skriver husnummer og husbokstav sammen", () => {
    expect(joinHouseLetter("Kanebogåsen 10 D")).toBe("Kanebogåsen 10D");
    expect(joinHouseLetter("Egne Hjems vei 5 B")).toBe("Egne Hjems vei 5B");
    expect(joinHouseLetter("Storgata 5 A, 0155 Oslo")).toBe("Storgata 5A, 0155 Oslo");
    expect(joinHouseLetter("Storgata 12 B 0155 Oslo")).toBe("Storgata 12B 0155 Oslo");
    expect(joinHouseLetter("Storgata 103 c")).toBe("Storgata 103c");
  });

  it("rører ikke noe annet", () => {
    for (const value of [
      "Kanebogåsen 10D",
      "Kanebogåsen 10, 9411 Harstad",
      "Egne Hjems vei 5",
      "Storgata 5 i Oslo",
      "Storgata 5 Oslo",
      "Storgata 5 AB",
      "Felt B 2",
      "Karl Johans gate 1",
    ]) {
      expect(joinHouseLetter(value), value).toBe(value);
    }
  });
});
