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

  describe("incremental sammenlignes ikke med totalen fra forrige full sync", () => {
    it("DiBK: baseline 1541, incremental henter 3 endrede saker = helt normalt", () => {
      const verdict = run({ mode: "incremental", baseline: 1541, fetched: 3, records: 3, rejected: 0 });
      expect(verdict.suspicious).toBe(false);
      expect(verdict.warnings).toEqual([]);
    });

    it("samme tall som full sync er derimot mistenkelig", () => {
      const verdict = run({ mode: "full", baseline: 1541, fetched: 3, records: 3, rejected: 0 });
      expect(verdict.suspicious).toBe(true);
      expect(verdict.allowReconcile).toBe(false);
      expect(verdict.warnings.join(" ")).toContain("1541 → 3");
    });

    it("incremental uten endringer er ikke et datafall", () => {
      const verdict = run({ mode: "incremental", baseline: 1541, fetched: 0, records: 0 });
      expect(verdict.suspicious).toBe(false);
      expect(verdict.warnings).toEqual([]);
    });

    it("incremental markeres fortsatt ved høy andel avviste", () => {
      const verdict = run({ mode: "incremental", baseline: 1541, fetched: 100, rejected: 40, records: 60 });
      expect(verdict.suspicious).toBe(true);
      expect(verdict.warnings.join(" ")).toContain("40 % av postene ble avvist");
    });

    it("små utvalg gir merknad, ikke mistanke — én avvist av tre er ikke 33 % datakvalitetssvikt", () => {
      const verdict = run({ mode: "incremental", baseline: 1541, fetched: 3, rejected: 1, records: 2 });
      expect(verdict.suspicious).toBe(false);
      expect(verdict.warnings).toEqual(["1 av 3 poster ble avvist i validering."]);
    });
  });

  /**
   * ID-churn: feilklassen de andre vaktene er blinde for, fordi antallet er uendret.
   *
   * Dette skjedde for DSB tilfluktsrom: `lokalId` var ny for hvert uttrekk, så hver full sync
   * opprettet 556 rader og markerte 556 gamle som fjernet — med 556 aktive både før og etter.
   */
  describe("kilden bytter sine egne ID-er", () => {
    it("flagger en full sync der ingenting gjenkjennes", () => {
      const verdict = run({ baseline: 556, fetched: 556, records: 556, inserted: 556, matched: 0 });
      expect(verdict.suspicious).toBe(true);
      expect(verdict.warnings.join(" ")).toContain("gjenbruker ikke sine egne ID-er");
    });

    it("rydder likevel, slik at forrige generasjon ikke blir liggende aktiv ved siden av den nye", () => {
      // Motsatt av datafall: dataene er der, bare under nye ID-er. Da er duplikater verre enn å rydde.
      const verdict = run({ baseline: 556, fetched: 556, records: 556, inserted: 556, matched: 0 });
      expect(verdict.allowReconcile).toBe(true);
    });

    it("godtar en normal kjøring der alt gjenkjennes", () => {
      const verdict = run({ baseline: 556, fetched: 556, records: 556, inserted: 0, matched: 556 });
      expect(verdict.suspicious).toBe(false);
      expect(verdict.warnings).toEqual([]);
    });

    it("godtar reell vekst der de gamle fortsatt kjennes igjen", () => {
      const verdict = run({ baseline: 500, fetched: 560, records: 560, inserted: 60, matched: 500 });
      expect(verdict.suspicious).toBe(false);
    });

    it("flagger ikke den første kjøringen, der ingenting kan gjenkjennes", () => {
      const verdict = run({ baseline: null, fetched: 556, records: 556, inserted: 556, matched: 0 });
      expect(verdict.suspicious).toBe(false);
    });

    it("bruker ikke regelen på små datasett", () => {
      const verdict = run({ baseline: 10, fetched: 10, records: 10, inserted: 10, matched: 0 });
      expect(verdict.suspicious).toBe(false);
    });

    it("gjelder ikke incremental, som aldri er et komplett snapshot", () => {
      const verdict = run({ mode: "incremental", baseline: 556, fetched: 30, records: 30, inserted: 30, matched: 0 });
      expect(verdict.suspicious).toBe(false);
    });

    it("er av uten skrivetellere, slik at eldre kallere ikke endrer oppførsel", () => {
      const verdict = run({ baseline: 556, fetched: 556, records: 556 });
      expect(verdict.suspicious).toBe(false);
      expect(verdict.warnings).toEqual([]);
    });
  });

  it("bruker ikke prosentregning på små referansetall", () => {
    expect(run({ baseline: 5, records: 2, fetched: 2 }).suspicious).toBe(false);
  });
});
