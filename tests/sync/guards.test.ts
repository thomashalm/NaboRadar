import { describe, expect, it } from "vitest";
import { assessRun, SYNC_GUARDS } from "@/lib/sync/guards";

const run = (over: Partial<Parameters<typeof assessRun>[0]> = {}) =>
  assessRun({ fetched: 100, rejected: 0, records: 100, baseline: 100, mode: "full", ...over });

describe("vakter mot silent failures", () => {
  it("godtar en normal kjøring og kjører reconciliation", () => {
    const verdict = run();
    expect(verdict.suspicious).toBe(false);
    expect(verdict.allowReconcile).toBe(true);
    expect(verdict.warnings).toEqual([]);
  });

  it("stopper reconciliation når antallet faller unormalt mye", () => {
    // Kilden pleier å gi 4 800 objekter og gir plutselig 50.
    const verdict = run({ baseline: 4800, fetched: 50, records: 50 });
    expect(verdict.suspicious).toBe(true);
    expect(verdict.allowReconcile).toBe(false);
    expect(verdict.warnings.join(" ")).toContain("4800 → 50");
    expect(verdict.warnings.join(" ")).toContain("Reconciliation ble hoppet over");
  });

  it("godtar fall innenfor terskelen", () => {
    const justInside = Math.ceil(100 * (1 - SYNC_GUARDS.maxRecordDropRatio));
    expect(run({ records: justInside, fetched: justInside }).suspicious).toBe(false);
    expect(run({ records: justInside - 5, fetched: justInside - 5 }).suspicious).toBe(true);
  });

  it("regner tomt svar som mistenkelig når vi har historikk", () => {
    expect(run({ fetched: 0, records: 0 }).suspicious).toBe(true);
    // Uten historikk kan vi ikke vite: advarsel, men ikke mistenkelig.
    const first = run({ fetched: 0, records: 0, baseline: null });
    expect(first.suspicious).toBe(false);
    expect(first.warnings.join(" ")).toContain("ingen historikk");
  });

  it("reagerer på høy andel avviste poster", () => {
    expect(run({ rejected: 8 }).warnings.join(" ")).toContain("8 % av postene");
    expect(run({ rejected: 8 }).suspicious).toBe(false);
    const bad = run({ rejected: 40 });
    expect(bad.suspicious).toBe(true);
    expect(bad.allowReconcile).toBe(false);
  });

  it("advarer om uvanlig vekst uten å blokkere", () => {
    const verdict = run({ baseline: 100, records: 400, fetched: 400 });
    expect(verdict.suspicious).toBe(false);
    expect(verdict.allowReconcile).toBe(true);
    expect(verdict.warnings.join(" ")).toContain("3× forrige kjøring");
  });

  it("lar admin tvinge reconciliation når fallet er reelt", () => {
    const verdict = run({ baseline: 4800, records: 50, fetched: 50, force: true });
    expect(verdict.suspicious).toBe(true);
    expect(verdict.allowReconcile).toBe(true);
    expect(verdict.warnings.join(" ")).toContain("admin bekreftet");
  });

  it("kjører aldri reconciliation ved incremental", () => {
    expect(run({ mode: "incremental" }).allowReconcile).toBe(false);
  });

  it("bruker ikke prosentregning på små referansetall", () => {
    expect(run({ baseline: 5, records: 2, fetched: 2 }).suspicious).toBe(false);
  });
});
