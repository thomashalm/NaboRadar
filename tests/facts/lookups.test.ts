import { describe, expect, it, vi } from "vitest";
import { distanceToGeometry } from "@/lib/geo/distance";
import { NveHoyspentDistribusjonLookup, NveKvikkleireAktsomhetLookup } from "@/lib/facts/lookups/nve";
import { FlystoyLookup, ldenInterval, StoyvarselVegLookup, StrategiskStoyLookup } from "@/lib/facts/lookups/stoy";

const CTX = { lat: 59.92992, lng: 10.71488, radiusM: 1000 };

function jsonFetch(handler: (url: string) => unknown) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const body = handler(String(input));
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
}

const fc = (features: unknown[]) => ({ type: "FeatureCollection", features });
const point = (properties: Record<string, unknown>) => ({ type: "Feature", geometry: null, properties });

describe("kvikkleire-aktsomhet (direkte oppslag)", () => {
  it("melder treff bare når punktet ligger innenfor OG kartet dekker området", async () => {
    const inside = new NveKvikkleireAktsomhetLookup(
      jsonFetch((url) => (url.includes("/1/query") ? fc([point({ dekningstatus: "grundigKartlagtMedFunn" })]) : fc([point({ objectid: 1 })]))),
    );
    const hits = await inside.run(CTX);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ subtype: "kvikkleire_aktsomhet", contains: true, distanceM: 0 });

    const outside = new NveKvikkleireAktsomhetLookup(
      jsonFetch((url) => (url.includes("/1/query") ? fc([point({ dekningstatus: "kartlagtUtenFunn" })]) : fc([]))),
    );
    expect(await outside.run(CTX)).toEqual([]);
  });

  it("sier ingenting når kartet ikke dekker området", async () => {
    // Uten dekning ville «utenfor aktsomhetsområde» vært misvisende.
    const noCoverage = new NveKvikkleireAktsomhetLookup(jsonFetch(() => fc([])));
    expect(await noCoverage.run(CTX)).toEqual([]);
  });
});

describe("høyspent distribusjonsnett (direkte oppslag)", () => {
  it("returnerer nærmeste linje med avstand", async () => {
    const lookup = new NveHoyspentDistribusjonLookup(
      jsonFetch(() =>
        fc([
          { type: "Feature", properties: { spenning_kv: 22, eier: "ELVIA AS", navn: null }, geometry: { type: "LineString", coordinates: [[10.7200, 59.9299], [10.7210, 59.9299]] } },
          { type: "Feature", properties: { spenning_kv: 11, eier: "ELVIA AS", navn: null }, geometry: { type: "LineString", coordinates: [[10.7600, 59.9299], [10.7610, 59.9299]] } },
        ]),
      ),
    );
    const [hit] = await lookup.run(CTX);
    expect(hit!.attributes.spenningKv).toBe(22);
    // ~0,0051° lengdegrad på 59,93° nord ≈ 285 m
    expect(hit!.distanceM).toBeGreaterThan(250);
    expect(hit!.distanceM).toBeLessThan(320);
    expect(hit!.contains).toBe(false);
  });

  it("gir ingen treff når ingen linjer finnes", async () => {
    expect(await new NveHoyspentDistribusjonLookup(jsonFetch(() => fc([]))).run(CTX)).toEqual([]);
  });
});

describe("strategisk støy", () => {
  it("oversetter kildens kategorier til dB-intervall", () => {
    expect(ldenInterval("Lden5559")).toBe("55–59 dB");
    expect(ldenInterval("LdenGreaterThan75")).toBe("over 75 dB");
    expect(ldenInterval("noe annet")).toBeNull();
  });

  it("tar med veg og bane, og hopper over Lnight", async () => {
    const lookup = new StrategiskStoyLookup(
      jsonFetch((url) => {
        if (url.includes("stoykart_strategisk_veg")) return fc([point({ category: "Lden5559" })]);
        if (url.includes("stoykart_strategisk_bane")) return fc([point({ stoyintervall: 70, stoyenhet: "LDEN" })]);
        return fc([]);
      }),
    );
    const hits = await lookup.run(CTX);
    expect(hits.map((h) => h.subtype).sort()).toEqual(["stoy_strategisk_bane", "stoy_strategisk_veg"]);
    expect(hits.find((h) => h.subtype === "stoy_strategisk_veg")!.attributes.niva).toBe("55–59 dB");
    expect(hits.every((h) => h.contains)).toBe(true);

    const nightOnly = new StrategiskStoyLookup(jsonFetch(() => fc([point({ stoyintervall: 65, stoyenhet: "LNIGHT" })])));
    expect(await nightOnly.run(CTX)).toEqual([]);
  });
});

describe("T-1442 støysoner", () => {
  it("velger rød sone når både gul og rød treffer", async () => {
    const lookup = new StoyvarselVegLookup(
      jsonFetch(() => ({ features: [point({ STOYSONEKATEGORI: "G", STOYKILDENAVN: "ERF-veger", BEREGNETAR: 2040 }), point({ STOYSONEKATEGORI: "R", STOYKILDENAVN: "ERF-veger", BEREGNETAR: 2040 })] })),
    );
    const [hit] = await lookup.run(CTX);
    expect(hit!.attributes.sone).toBe("rod");
    expect(hit!.attributes.prognoseAar).toBe(2040);
  });

  it("gir ingen treff utenfor sone", async () => {
    expect(await new StoyvarselVegLookup(jsonFetch(() => ({ features: [] }))).run(CTX)).toEqual([]);
  });

  it("leser flystøy fra GML-svaret", async () => {
    const gml = `<?xml version="1.0"?><wfs:FeatureCollection xmlns:wfs="x" xmlns:app="y">
      <app:Støy><app:støysonekategori>R</app:støysonekategori><app:støykildenavn>ENGM</app:støykildenavn><app:beregnetÅr>2022</app:beregnetÅr></app:Støy>
    </wfs:FeatureCollection>`;
    const fetchImpl = vi.fn(async () => new Response(gml, { status: 200 })) as unknown as typeof fetch;
    const [hit] = await new FlystoyLookup(fetchImpl).run({ lat: 60.1976, lng: 11.1004, radiusM: 1000 });
    expect(hit).toMatchObject({ subtype: "stoysone_fly_t1442", contains: true, attributes: { sone: "rod", lufthavn: "ENGM", beregnetAar: 2022 } });

    const empty = vi.fn(async () => new Response("<wfs:FeatureCollection xmlns:wfs='x'/>", { status: 200 })) as unknown as typeof fetch;
    expect(await new FlystoyLookup(empty).run(CTX)).toEqual([]);
  });

  it("kaster ved HTTP-feil, slik at kilden merkes som utilgjengelig", async () => {
    const failing = vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    await expect(new FlystoyLookup(failing).run(CTX)).rejects.toThrow();
  });
});

describe("distanceToGeometry", () => {
  const origin = { lat: 59.93, lng: 10.72 };

  it("gir 0 og contains når punktet er inne i polygonet", () => {
    const polygon = { type: "Polygon" as const, coordinates: [[[10.71, 59.92], [10.73, 59.92], [10.73, 59.94], [10.71, 59.94], [10.71, 59.92]]] };
    expect(distanceToGeometry(origin, polygon)).toEqual({ distanceM: 0, contains: true });
  });

  it("måler til kanten når punktet er utenfor", () => {
    const polygon = { type: "Polygon" as const, coordinates: [[[10.73, 59.92], [10.74, 59.92], [10.74, 59.94], [10.73, 59.94], [10.73, 59.92]]] };
    const { distanceM, contains } = distanceToGeometry(origin, polygon);
    expect(contains).toBe(false);
    // 0,01° lengdegrad på 59,93° ≈ 558 m
    expect(distanceM).toBeGreaterThan(520);
    expect(distanceM).toBeLessThan(600);
  });

  it("håndterer hull i polygonet", () => {
    const withHole = {
      type: "Polygon" as const,
      coordinates: [
        [[10.70, 59.91], [10.74, 59.91], [10.74, 59.95], [10.70, 59.95], [10.70, 59.91]],
        [[10.715, 59.925], [10.725, 59.925], [10.725, 59.935], [10.715, 59.935], [10.715, 59.925]],
      ],
    };
    expect(distanceToGeometry(origin, withHole).contains).toBe(false);
  });

  it("måler til punkt og linje", () => {
    expect(distanceToGeometry(origin, { type: "Point", coordinates: [10.72, 59.93] }).distanceM).toBeCloseTo(0, 1);
    const line = { type: "LineString" as const, coordinates: [[10.72, 59.94], [10.73, 59.94]] };
    expect(distanceToGeometry(origin, line).distanceM).toBeGreaterThan(1000);
  });
});
