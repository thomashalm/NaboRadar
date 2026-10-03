import { describe, expect, it, vi } from "vitest";
import { createLookupRunner } from "@/lib/facts/lookup-runner";
import type { AreaLookup, LookupHit } from "@/lib/facts/lookups/types";

const treff: LookupHit = { subtype: "radon_aktsomhet", title: "Radon", attributes: {}, distanceM: 0, contains: true };

function oppslag(id: string, oppførsel: () => Promise<LookupHit[]>): AreaLookup & { run: ReturnType<typeof vi.fn> } {
  return { id, name: id, owner: "test", category: "grunnforhold", run: vi.fn(oppførsel) } as never;
}

describe("direkte oppslag: cache og feil per kilde", () => {
  it("cacher kildene som svarte, selv om én feilet — neste besøk spør bare den som feilet", async () => {
    let tid = 0;
    const flom = oppslag("flom", async () => [treff]);
    const radon = oppslag("radon", async () => []);
    let nede = true;
    const stormflo = oppslag("stormflo", async () => {
      if (nede) throw new Error("HTTP 500");
      return [];
    });
    const runner = createLookupRunner([flom, radon, stormflo], { pauseMs: 30_000, now: () => tid });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const første = await runner.run(59.9, 10.7, 1000);
    expect(første.failed).toEqual(["stormflo"]);
    expect(første.results.map((r) => r.lookupId)).toEqual(["flom", "radon"]);

    // Innenfor pausen: ingen kall i det hele tatt, stormflo rapporteres fortsatt som «svarte ikke».
    tid = 10_000;
    const andre = await runner.run(59.9, 10.7, 1000);
    expect(andre.called).toEqual([]);
    expect(andre.failed).toEqual(["stormflo"]);
    expect(andre.results.map((r) => r.lookupId)).toEqual(["flom", "radon"]);
    expect(flom.run).toHaveBeenCalledTimes(1);

    // Etter pausen er bare den som feilet, spurt igjen — og nå svarer den.
    tid = 40_000;
    nede = false;
    const tredje = await runner.run(59.9, 10.7, 1000);
    expect(tredje.called).toEqual(["stormflo"]);
    expect(tredje.failed).toEqual([]);
    expect(tredje.results.map((r) => r.lookupId)).toEqual(["flom", "radon", "stormflo"]);
  });

  it("et tomt svar er «ingen treff»; en feil er «svarte ikke» — aldri omvendt", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const tom = oppslag("tom", async () => []);
    const feil = oppslag("feil", async () => {
      throw new Error("tidsavbrudd");
    });
    const { results, failed } = await createLookupRunner([tom, feil]).run(60, 10, 500);
    expect(results).toEqual([{ lookupId: "tom", category: "grunnforhold", hits: [] }]);
    expect(failed).toEqual(["feil"]);
  });

  it("holder visningsrekkefølgen uavhengig av hva som kom fra cachen", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let a = false;
    const først = oppslag("først", async () => {
      if (!a) throw new Error("x");
      return [];
    });
    const sist = oppslag("sist", async () => []);
    const runner = createLookupRunner([først, sist], { pauseMs: 0 });
    await runner.run(60, 10, 500);
    a = true;
    const { results } = await runner.run(60, 10, 500);
    expect(results.map((r) => r.lookupId)).toEqual(["først", "sist"]);
  });

  it("cacher per punkt og radius", async () => {
    const flom = oppslag("flom", async () => []);
    const runner = createLookupRunner([flom]);
    await runner.run(60, 10, 500);
    await runner.run(60, 10, 500);
    await runner.run(60, 10, 1000);
    await runner.run(61, 10, 500);
    expect(flom.run).toHaveBeenCalledTimes(3);
  });
});
