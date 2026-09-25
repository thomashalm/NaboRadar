import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/lib/timeout";

/**
 * Hver kilde har sin egen frist. Uten den kunne én treg tjeneste holdt hele svaret åpent —
 * strategisk støykartlegging brukte 4,3 s på en vanlig dag, og har ingen øvre grense.
 */
describe("frist per kilde", () => {
  it("slipper gjennom svaret når kilden rekker det", async () => {
    await expect(withTimeout(Promise.resolve("data"), 1000, () => "reserve")).resolves.toBe("data");
  });

  it("gir reserven når kilden bruker for lang tid", async () => {
    vi.useFakeTimers();
    const treg = new Promise<string>((resolve) => setTimeout(() => resolve("for sent"), 10_000));
    const resultat = withTimeout(treg, 500, () => "utilgjengelig");
    await vi.advanceTimersByTimeAsync(600);
    await expect(resultat).resolves.toBe("utilgjengelig");
    vi.useRealTimers();
  });

  it("gir reserven når kilden feiler, uten å kaste videre", async () => {
    await expect(withTimeout(Promise.reject(new Error("500")), 1000, () => "utilgjengelig")).resolves.toBe(
      "utilgjengelig",
    );
  });

  it("lar en treg kilde ikke påvirke en rask", async () => {
    vi.useFakeTimers();
    const treg = withTimeout(new Promise<string>(() => {}), 1000, () => "treg reserve");
    const rask = withTimeout(Promise.resolve("rask"), 1000, () => "rask reserve");
    await expect(rask).resolves.toBe("rask");
    await vi.advanceTimersByTimeAsync(1100);
    await expect(treg).resolves.toBe("treg reserve");
    vi.useRealTimers();
  });
});
