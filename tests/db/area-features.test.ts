import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { destinationPoint } from "@/lib/geo/radius";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

const ORIGIN = { lat: 59.92992, lng: 10.71488 };

/** Kvadrat med sentrum `distanceM` øst for origo. distanceM = 0 gir et kvadrat rundt origo. */
function square(distanceM: number, halfSideM = 100) {
  const [lng, lat] = distanceM === 0 ? [ORIGIN.lng, ORIGIN.lat] : destinationPoint(ORIGIN.lat, ORIGIN.lng, distanceM, 90);
  const dLat = halfSideM / 111_195;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  return {
    type: "Polygon",
    coordinates: [[[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]]],
  };
}

const row = (overrides: Record<string, unknown>) => ({
  external_id: "x",
  category: "grunnforhold",
  subtype: "kvikkleire_sone",
  title: "Sone",
  geometry: square(500),
  attributes: {},
  source_url: null,
  source_url_type: null,
  source_updated_at: null,
  content_hash: Math.random().toString(36),
  ...overrides,
});

describe("area_features og features_near", { timeout: 30_000 }, () => {
  let db: Db;

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.rpc("upsert_area_features", {
      p_provider_id: "nve-kvikkleire-soner",
      p_features: [
        row({ external_id: "inne", title: "Sone rundt punktet", geometry: square(0) }),
        row({ external_id: "naer", title: "Sone i nærheten", geometry: square(500) }),
        row({ external_id: "fjern", title: "Sone langt unna", geometry: square(2500) }),
      ],
      p_synced_at: new Date().toISOString(),
    });
    await db.rpc("upsert_area_features", {
      p_provider_id: "mdir-industri-tillatelse",
      p_features: [
        row({ external_id: "anlegg", category: "industri", subtype: "industrianlegg", title: "Anlegg", geometry: { type: "Point", coordinates: destinationPoint(ORIGIN.lat, ORIGIN.lng, 300, 0) } }),
      ],
      p_synced_at: new Date().toISOString(),
    });
  });

  const near = (radius: number, categories: string[] | null = null) =>
    db.rpc<{
      title: string;
      external_id: string;
      distance_m: number;
      contains: boolean;
      category: string;
      subtype: string;
      centroid: { type: string; coordinates: [number, number] } | null;
      geometry: { type: string; coordinates: unknown[] } | null;
    }>("features_near", {
      lat: ORIGIN.lat,
      lng: ORIGIN.lng,
      radius_m: radius,
      categories,
    });

  it("gir både avstand og om punktet ligger inne i objektet", async () => {
    const rows = await near(1000);
    const inside = rows.find((r) => r.title === "Sone rundt punktet")!;
    expect(inside.contains).toBe(true);
    expect(inside.distance_m).toBe(0);

    const nearby = rows.find((r) => r.title === "Sone i nærheten")!;
    expect(nearby.contains).toBe(false);
    expect(nearby.distance_m).toBeGreaterThan(350);
    expect(nearby.distance_m).toBeLessThan(450);
  });

  it("gir kildens ID, centroid og geometri, slik at objektet kan tegnes i kartet", async () => {
    const inside = (await near(1000)).find((r) => r.title === "Sone rundt punktet")!;
    expect(inside.external_id).toBe("inne");
    expect(inside.geometry?.type).toBe("Polygon");
    expect(inside.geometry?.coordinates).toHaveLength(1);
    expect(inside.centroid?.type).toBe("Point");
  });

  it("utelater geometrien for svært store objekter i stedet for å blåse opp svaret", async () => {
    // Ring med over 5 000 punkter — typisk for kvikkleiresoner, aldri for en lokalitet.
    const [lng0, lat0] = destinationPoint(ORIGIN.lat, ORIGIN.lng, 400, 90);
    const dLat = 100 / 111_195;
    const ring = Array.from({ length: 5001 }, (_, i) => {
      const angle = (i / 5000) * 2 * Math.PI;
      return [lng0 + (dLat * Math.cos(angle)) / Math.cos((lat0 * Math.PI) / 180), lat0 + dLat * Math.sin(angle)];
    });
    ring[5000] = ring[0]!;
    await db.rpc("upsert_area_features", {
      p_provider_id: "nve-nettanlegg",
      p_features: [row({ external_id: "stor", category: "infrastruktur", subtype: "kraftledning", title: "Stor flate", geometry: { type: "Polygon", coordinates: [ring] } })],
      p_synced_at: new Date().toISOString(),
    });
    const stor = (await near(1000)).find((r) => r.title === "Stor flate")!;
    expect(stor.geometry).toBeNull();
    expect(stor.centroid?.type).toBe("Point");
  });

  it("respekterer radius og sorterer nærmest først", async () => {
    const titles = (await near(1000)).map((r) => r.title);
    expect(titles).not.toContain("Sone langt unna");
    expect(titles[0]).toBe("Sone rundt punktet");
    expect((await near(3000)).map((r) => r.title)).toContain("Sone langt unna");
  });

  it("kan filtreres på kategori", async () => {
    expect((await near(1000, ["industri"])).map((r) => r.subtype)).toEqual(["industrianlegg"]);
    expect((await near(1000, ["grunnforhold"])).every((r) => r.category === "grunnforhold")).toBe(true);
  });

  it("holder områdefakta adskilt fra events", async () => {
    const [{ n }] = (await db.pg.query<{ n: number }>("select count(*)::int n from events")).rows as [{ n: number }];
    expect(n).toBe(0);
    const [{ m }] = (await db.pg.query<{ m: number }>("select count(*)::int m from area_features")).rows as [{ m: number }];
    expect(m).toBeGreaterThanOrEqual(4);
  });

  it("ekskluderer objekter som er fjernet fra kilden", async () => {
    const [removed] = await db.rpc<number>("mark_area_features_removed", {
      p_provider_id: "nve-kvikkleire-soner",
      p_run_synced_at: new Date(Date.now() + 60_000).toISOString(),
      p_keep_external_ids: ["inne", "naer"],
    });
    expect(removed).toBe(1);
    expect((await near(3000)).map((r) => r.title)).not.toContain("Sone langt unna");
  });

  it("oppdaterer bare når innholdet endres", async () => {
    const same = row({ external_id: "inne", title: "Sone rundt punktet", geometry: square(0), content_hash: "fast" });
    const first = await db.rpc<{ updated: number }>("upsert_area_features", { p_provider_id: "nve-kvikkleire-soner", p_features: [same], p_synced_at: new Date().toISOString() });
    expect(first[0]!.updated).toBe(1);
    const second = await db.rpc<{ unchanged: number }>("upsert_area_features", { p_provider_id: "nve-kvikkleire-soner", p_features: [same], p_synced_at: new Date().toISOString() });
    expect(second[0]!.unchanged).toBe(1);
  });

  it("teller ugyldig geometri som feil, ikke som krasj", async () => {
    const [result] = await db.rpc<{ failed: number; errors: { external_id: string }[] }>("upsert_area_features", {
      p_provider_id: "nve-kvikkleire-soner",
      p_features: [row({ external_id: "tom", geometry: { type: "Polygon", coordinates: [[[10, 59], [10, 59], [10, 59], [10, 59]]] } })],
      p_synced_at: new Date().toISOString(),
    });
    expect(result!.failed).toBe(1);
    expect(result!.errors[0]!.external_id).toBe("tom");
  });

  it("provider_overview teller områdefakta", async () => {
    const rows = await db.rpc<{ id: string; kind: string; active_features: number | string }>("provider_overview");
    const kvikkleire = rows.find((r) => r.id === "nve-kvikkleire-soner")!;
    expect(kvikkleire.kind).toBe("area_feature");
    expect(Number(kvikkleire.active_features)).toBe(2);
  });
});
