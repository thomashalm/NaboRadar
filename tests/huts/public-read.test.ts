import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Hyttesiden caches og er lik for alle. Den skal derfor aldri lese med brukerens cookies —
 * da kunne en admins visning blitt liggende i cachen — og alt den viser, skal komme fra
 * databasen eller et register med reserve.
 */
const cookieKlient = vi.fn(async () => {
  throw new Error("hyttesiden skal ikke lese med brukerens sesjon");
});
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: cookieKlient }));

const rad = {
  id: "a4fbf722-ecb9-4a3d-9614-e0c0b0d26f63",
  name: "Aursjobu",
  hut_type: "unstaffed_hut",
  owner_kind: "other",
  manager_name: "Skjåk Almenning",
  access_status: "unknown",
  locked: true,
  overnight: "yes",
  beds: null,
  booking_url: null,
  info_url: null,
  municipality_number: "3433",
  latitude: 61.925532,
  longitude: 8.234905,
  source_updated_at: null,
  last_seen_at: "2026-10-01T00:00:00Z",
  sources: ["kartverket-n50-hytter"],
  access_kind: "locked_prebooking",
  public_note: null,
  overridden: [],
};
const anonRpc = vi.fn(async (fn: string): Promise<unknown[]> => {
  if (fn === "get_hut") return [{ ...rad, terrain_elevation_m: 1142 }];
  if (fn === "huts_near") return [{ ...rad, distance_m: 0 }, { ...rad, id: "33e82363-0000-0000-0000-000000000000", name: "Sveinbu", distance_m: 9800 }];
  throw new Error(fn);
});
vi.mock("@/lib/db", () => ({ getDbMode: () => "supabase", getReadDb: async () => ({ kind: "supabase", rpc: anonRpc }) }));

// Kommuneregisteret svarer ikke: reserven skal gi kommune og fylke likevel.
vi.mock("@/lib/http", () => ({
  fetchJson: async () => {
    throw new Error("nede");
  },
}));

const { getHut } = await import("@/lib/huts/queries");

describe("hyttesiden leser anonymt og stabilt", () => {
  it("bruker aldri brukerens sesjon, og høyden kommer fra databasen", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const svar = await getHut("a4fbf722");
    expect(cookieKlient).not.toHaveBeenCalled();
    expect(svar.status).toBe("ok");
    if (svar.status !== "ok") return;
    expect(svar.hut.elevationM).toBe(1142);
    expect(svar.hut.municipalityName).toBe("Skjåk");
    expect(svar.hut.countyName).toBe("Innlandet");
    expect(svar.nearby.map((h) => h.name)).toEqual(["Sveinbu"]);
    expect(anonRpc.mock.calls.map((c) => c[0]).sort()).toEqual(["get_hut", "huts_near"]);
  });

  it("gir «unavailable» — ikke en halv side — når nabohyttene ikke kan hentes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    anonRpc.mockImplementation(async (fn: string) => {
      if (fn === "get_hut") return [{ ...rad, terrain_elevation_m: 1142 }];
      throw new Error("tidsavbrudd");
    });
    expect((await getHut("a4fbf722")).status).toBe("unavailable");
  });
});
