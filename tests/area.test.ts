import { describe, expect, it } from "vitest";
import { areaParamsSchema, buildAreaHref } from "@/lib/area-params";
import { formatRadius } from "@/lib/format";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M } from "@/lib/geo/constants";
import { circlePolygon, distanceMeters, radiusBounds } from "@/lib/geo/radius";

const SOGNSVANN = { lat: 59.97499, lng: 10.72891 };
const OSLO_S = { lat: 59.91067, lng: 10.75226 };
const MAJORSTUEN = { lat: 59.92992, lng: 10.71488 };

describe("/omrade query-parametre", () => {
  it("godtar gyldige parametre", () => {
    expect(areaParamsSchema.parse({ lat: "59.97499", lng: "10.72891", radius: "3000", label: "Sognsvann" })).toEqual({
      lat: 59.97499,
      lng: 10.72891,
      radius: 3000,
      label: "Sognsvann",
      sortering: "distance",
      // Uten fra i URL-en hører konteksten til den offentlige siden.
      fra: "/omrade",
    });
  });

  it("avviser manglende, ikke-numeriske og uendelige koordinater", () => {
    expect(areaParamsSchema.safeParse({}).success).toBe(false);
    expect(areaParamsSchema.safeParse({ lat: "abc", lng: "10.7" }).success).toBe(false);
    expect(areaParamsSchema.safeParse({ lat: "Infinity", lng: "10.7" }).success).toBe(false);
    expect(areaParamsSchema.safeParse({ lat: "", lng: "" }).success).toBe(false);
    expect(areaParamsSchema.safeParse({ lat: "5e1", lng: "10.7" }).success).toBe(false);
  });

  it("avviser koordinater utenfor Norge", () => {
    expect(areaParamsSchema.safeParse({ lat: "48.85", lng: "2.35" }).success).toBe(false); // Paris
    expect(areaParamsSchema.safeParse({ lat: "78.22", lng: "15.65" }).success).toBe(false); // Svalbard
  });

  it("bruker første verdi når en parameter gjentas", () => {
    expect(areaParamsSchema.parse({ lat: ["59.9", "0"], lng: "10.7" }).lat).toBe(59.9);
  });

  it("runder koordinater til 5 desimaler", () => {
    expect(areaParamsSchema.parse({ lat: "59.974991234", lng: "10.728911111" })).toMatchObject({ lat: 59.97499, lng: 10.72891 });
  });

  it("faller tilbake til standard radius ved ugyldig eller manglende verdi", () => {
    for (const radius of [undefined, "", "750", "-1000", "999999", "abc"]) {
      expect(areaParamsSchema.parse({ lat: "59.9", lng: "10.7", radius }).radius).toBe(DEFAULT_RADIUS_M);
    }
  });

  it("renser label for kontrolltegn og for lange verdier", () => {
    expect(areaParamsSchema.parse({ lat: "59.9", lng: "10.7", label: "  Oslo\u0000 S \n" }).label).toBe("Oslo S");
    expect(areaParamsSchema.parse({ lat: "59.9", lng: "10.7", label: "x".repeat(500) }).label).toBeUndefined();
    expect(areaParamsSchema.parse({ lat: "59.9", lng: "10.7", label: "   " }).label).toBeUndefined();
  });

  it("buildAreaHref gir en URL som parses tilbake til samme verdier", () => {
    const href = buildAreaHref({ ...SOGNSVANN, radius: 3000, label: "Sognsvann & co" });
    expect(href.startsWith("/omrade?")).toBe(true);
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(areaParamsSchema.parse(params)).toEqual({
      ...SOGNSVANN,
      radius: 3000,
      label: "Sognsvann & co",
      sortering: "distance",
      fra: "/omrade",
    });
  });

  it("sortering=nyeste gir newest, alt annet nærmest først", () => {
    expect(areaParamsSchema.parse({ lat: "59.9", lng: "10.7", sortering: "nyeste" }).sortering).toBe("newest");
    expect(areaParamsSchema.parse({ lat: "59.9", lng: "10.7", sortering: "tull" }).sortering).toBe("distance");
    const href = buildAreaHref({ ...SOGNSVANN, radius: 1000, sort: "newest" });
    expect(new URL(href, "http://x").searchParams.get("sortering")).toBe("nyeste");
  });
});

describe("radiusverdier", () => {
  it("MVP-valgene er 500 m, 1 km og 3 km med 1 km som standard", () => {
    expect(RADIUS_OPTIONS_M).toEqual([500, 1000, 3000]);
    expect(DEFAULT_RADIUS_M).toBe(1000);
    expect(RADIUS_OPTIONS_M.map(formatRadius)).toEqual(["500 m", "1 km", "3 km"]);
  });
});

describe("radiusgeometri", () => {
  it.each([
    ["Sognsvann", SOGNSVANN, 3000],
    ["Majorstuen", MAJORSTUEN, 1000],
    ["Oslo S", OSLO_S, 500],
  ])("%s: alle punkter i sirkelen ligger %d m fra sentrum", (_name, center, radius) => {
    const ring = circlePolygon(center.lat, center.lng, radius).coordinates[0]!;
    expect(ring[0]).toEqual(ring.at(-1)); // lukket ring
    for (const [lng, lat] of ring) {
      expect(distanceMeters(center, { lat: lat!, lng: lng! })).toBeCloseTo(radius, 3);
    }
  });

  it("sirkelen er bredere i lengdegrader enn i breddegrader på 60° nord", () => {
    const [[west, south], [east, north]] = radiusBounds(SOGNSVANN.lat, SOGNSVANN.lng, 1000);
    const widthDeg = east - west;
    const heightDeg = north - south;
    // cos(60°) ≈ 0.5 → omtrent dobbelt så mange lengdegrader per meter.
    expect(widthDeg / heightDeg).toBeGreaterThan(1.9);
    expect(widthDeg / heightDeg).toBeLessThan(2.1);
  });

  it("bounds omslutter sirkelen", () => {
    const [[west, south], [east, north]] = radiusBounds(OSLO_S.lat, OSLO_S.lng, 3000);
    for (const [lng, lat] of circlePolygon(OSLO_S.lat, OSLO_S.lng, 3000).coordinates[0]!) {
      expect(lng!).toBeGreaterThanOrEqual(west - 1e-9);
      expect(lng!).toBeLessThanOrEqual(east + 1e-9);
      expect(lat!).toBeGreaterThanOrEqual(south - 1e-9);
      expect(lat!).toBeLessThanOrEqual(north + 1e-9);
    }
  });

  it("haversine stemmer med uavhengig flat-projeksjon over korte avstander (Oslo S – Majorstuen)", () => {
    const metersPerDegLat = 111_195;
    const dy = (MAJORSTUEN.lat - OSLO_S.lat) * metersPerDegLat;
    const dx = (MAJORSTUEN.lng - OSLO_S.lng) * metersPerDegLat * Math.cos((((OSLO_S.lat + MAJORSTUEN.lat) / 2) * Math.PI) / 180);
    const planar = Math.hypot(dx, dy); // ≈ 2 989 m
    expect(distanceMeters(OSLO_S, MAJORSTUEN)).toBeCloseTo(planar, -1);
  });
});
