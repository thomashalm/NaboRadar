import { describe, expect, it } from "vitest";
import { tillitFor } from "@/lib/admin/area-research";

/**
 * Tilliten til at «ingen treff» faktisk betyr ingenting her.
 *
 * Poenget med seksjonen er at en operatør ikke skal lese tomt som et svar når kilden er
 * utdatert eller feilende. Da må tilliten følge den dårligste kilden, ikke gjennomsnittet.
 */
describe("tillit til dekningen", () => {
  it("er høy når alle kildene er friske", () => {
    expect(tillitFor([{ severity: "ok" }, { severity: "ok" }])).toBe("hoy");
  });

  it("faller til middels når én kilde varsler", () => {
    expect(tillitFor([{ severity: "ok" }, { severity: "warning" }])).toBe("middels");
  });

  it("faller til lav når én kilde er kritisk — også om resten er friske", () => {
    expect(tillitFor([{ severity: "ok" }, { severity: "ok" }, { severity: "critical" }])).toBe("lav");
  });

  it("er lav uten kilder i det hele tatt", () => {
    // Ingen kilder betyr at vi ikke vet, ikke at alt er i orden.
    expect(tillitFor([])).toBe("lav");
  });
});
