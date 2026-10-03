import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/types";
import { ELEVATION_BATCH, elevationFromZ, elevationsAt } from "@/lib/geo/elevation";
import { refreshHutElevations } from "@/lib/huts/elevation-sync";

type Punkt = { z: number | null; datakilde?: string };
const svar = (punkter: Punkt[]) =>
  new Response(JSON.stringify({ koordsys: 4258, punkter: punkter.map((p, i) => ({ datakilde: p.datakilde ?? "dtm1", terreng: "Skog", x: 10 + i, y: 60, z: p.z })) }));

describe("høyde fra Kartverkets høydemodell", () => {
  it("runder av til hele meter, med samme regel som før", () => {
    expect(elevationFromZ(1142.18)).toBe(1142);
    expect(elevationFromZ(432.5)).toBe(433);
    expect(elevationFromZ(2.74)).toBe(3);
    // Utenfor dekning: ingen verdi, aldri et gjettet tall.
    expect(elevationFromZ(null)).toBeNull();
    expect(elevationFromZ(-32767)).toBeNull();
  });

  it("slår opp mange punkter i ett kall, i samme rekkefølge, med datakilden", async () => {
    const fetchImpl = vi.fn(async () => svar([{ z: 1142.18 }, { z: null }, { z: 12.4, datakilde: "dtm10" }]));
    const høyder = await elevationsAt(
      [
        { lat: 61.92, lng: 8.23 },
        { lat: 60, lng: 4.5 },
        { lat: 59.9, lng: 10.7 },
      ],
      { fetchImpl },
    );
    expect(høyder).toEqual([
      { elevationM: 1142, source: "dtm1" },
      { elevationM: null, source: "dtm1" },
      { elevationM: 12, source: "dtm10" },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(String((fetchImpl.mock.calls[0] as unknown[])[0]))).toContain("punkter=[[8.23,61.92],[4.5,60],[10.7,59.9]]");
  });

  it("kaster ved feil, så ingenting lagres", async () => {
    await expect(elevationsAt([{ lat: 60, lng: 10 }], { fetchImpl: async () => new Response("{}") })).rejects.toThrow();
    await expect(elevationsAt([{ lat: 60, lng: 10 }, { lat: 61, lng: 10 }], { fetchImpl: async () => svar([{ z: 5 }]) })).rejects.toThrow();
    await expect(elevationsAt(Array.from({ length: ELEVATION_BATCH + 1 }, () => ({ lat: 60, lng: 10 })))).rejects.toThrow(RangeError);
  });
});

describe("høyden lagres etter synken", () => {
  function fakeDb(pending: number) {
    const rows = Array.from({ length: pending }, (_, i) => ({ id: `h${i}`, latitude: 60 + i / 1000, longitude: 10 }));
    const lagret: Record<string, unknown>[] = [];
    const db: Db = {
      kind: "pglite",
      rpc: vi.fn(async (fn: string, args: Record<string, unknown> = {}) => {
        if (fn === "huts_needing_elevation") return rows;
        if (fn === "set_hut_elevations") {
          const r = args.p_rows as Record<string, unknown>[];
          lagret.push(...r);
          return [r.length];
        }
        throw new Error(fn);
      }),
    } as unknown as Db;
    return { db, lagret };
  }

  it("går gjennom alle i bolker på ti og lagrer høyde og kilde", async () => {
    const { db, lagret } = fakeDb(120);
    const fetchImpl = vi.fn(async (url: string) => {
      const n = (JSON.parse(decodeURIComponent(url.split("punkter=")[1]!.split("&")[0]!)) as unknown[]).length;
      return svar(Array.from({ length: n }, () => ({ z: 700.4 })));
    });
    const r = await refreshHutElevations(db, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledTimes(12);
    expect(r).toEqual({ pending: 120, written: 120, failedBatches: 0, moved: 0 });
    expect(lagret[0]).toEqual({ id: "h0", lat: 60, lng: 10, elevation_m: 700, source: "dtm1" });
  });

  it("slår opp et punkt alene når kallet ga høydekurver i stedet for terrengmodellen", async () => {
    const { db, lagret } = fakeDb(3);
    const fetchImpl = vi.fn(async (url: string) => {
      const n = (JSON.parse(decodeURIComponent(url.split("punkter=")[1]!.split("&")[0]!)) as unknown[]).length;
      return n > 1 ? svar([{ z: 100 }, { z: 129, datakilde: "hoydekurver" }, { z: 300 }]) : svar([{ z: 106.09 }]);
    });
    await refreshHutElevations(db, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(lagret.map((x) => [x.elevation_m, x.source])).toEqual([[100, "dtm1"], [106, "dtm1"], [300, "dtm1"]]);
  });

  it("tar flere runder når køen er større enn ett API-svar (1 000 rader)", async () => {
    const alle = Array.from({ length: 1200 }, (_, i) => ({ id: `h${i}`, latitude: 60, longitude: 10 }));
    const lagret = new Set<string>();
    const db = {
      kind: "pglite",
      rpc: vi.fn(async (fn: string, args: Record<string, unknown> = {}) => {
        if (fn === "huts_needing_elevation") return alle.filter((r) => !lagret.has(r.id)).slice(0, Math.min(1000, args.p_limit as number));
        const r = args.p_rows as { id: string }[];
        r.forEach((x) => lagret.add(x.id));
        return [r.length];
      }),
    } as unknown as Db;
    const fetchImpl = async (url: string) => {
      const n = (JSON.parse(decodeURIComponent(url.split("punkter=")[1]!.split("&")[0]!)) as unknown[]).length;
      return svar(Array.from({ length: n }, () => ({ z: 10 })));
    };
    const r = await refreshHutElevations(db, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r).toMatchObject({ pending: 1200, written: 1200, failedBatches: 0 });
  });

  it("skriver ingenting for en bolk som feilet — forrige verdi står", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { db, lagret } = fakeDb(60);
    let kall = 0;
    const fetchImpl = async (url: string) => {
      kall += 1;
      if (kall === 1) return new Response("nede", { status: 400 });
      const n = (JSON.parse(decodeURIComponent(url.split("punkter=")[1]!.split("&")[0]!)) as unknown[]).length;
      return svar(Array.from({ length: n }, () => ({ z: 10 })));
    };
    const r = await refreshHutElevations(db, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r).toEqual({ pending: 60, written: 50, failedBatches: 1, moved: 0 });
    expect(lagret.map((x) => x.id)).toEqual(Array.from({ length: 50 }, (_, i) => `h${10 + i}`));
  });
});
