import { describe, expect, it, vi } from "vitest";
import karlJohan from "../fixtures/kartverket/adresser-karl-johans-gate-1.json";
import sognsvannAddresses from "../fixtures/kartverket/adresser-sognsvann.json";
import sognsvannPlaces from "../fixtures/kartverket/stedsnavn-sognsvann.json";
import {
  buildSearchTerm,
  KARTVERKET_ADDRESS_URL,
  KARTVERKET_PLACE_URL,
  KartverketGeocodingProvider,
} from "@/lib/geocoding/kartverket/provider";
import { GeocodingUnavailableError } from "@/lib/geocoding/types";

type Handler = (url: string) => Response | Promise<Response>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function fakeFetch(address: Handler, place: Handler) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith(KARTVERKET_ADDRESS_URL)) return address(url);
    if (url.startsWith(KARTVERKET_PLACE_URL)) return place(url);
    throw new Error(`uventet URL ${url}`);
  }) as unknown as typeof fetch;
}

// Unngå støy fra forventede advarsler.
vi.spyOn(console, "warn").mockImplementation(() => {});

describe("KartverketGeocodingProvider", () => {
  it("slår sammen adresser og stedsnavn", async () => {
    const provider = new KartverketGeocodingProvider(fakeFetch(() => json(sognsvannAddresses), () => json(sognsvannPlaces)));
    const { results, sources } = await provider.searchDetailed("Sognsvann");
    expect(sources).toEqual({ address: "ok", place: "ok" });
    expect(results[0]?.label).toBe("Sognsvann");
    expect(results.some((r) => r.type === "address")).toBe(true);
  });

  it("returnerer stedsnavn når adresse-API feiler (500)", async () => {
    const provider = new KartverketGeocodingProvider(fakeFetch(() => json({}, 500), () => json(sognsvannPlaces)));
    const { results, sources } = await provider.searchDetailed("Sognsvann");
    expect(sources).toEqual({ address: "error", place: "ok" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.type === "place")).toBe(true);
  });

  it("returnerer adresser når stedsnavn-API gir ugyldig svar", async () => {
    const provider = new KartverketGeocodingProvider(fakeFetch(() => json(karlJohan), () => new Response("<html>502</html>", { status: 200 })));
    const { results, sources } = await provider.searchDetailed("Karl Johans gate 1");
    expect(sources.place).toBe("error");
    expect(results[0]?.label).toBe("Karl Johans gate 1");
  });

  it("kaster GeocodingUnavailableError når begge feiler", async () => {
    const provider = new KartverketGeocodingProvider(
      fakeFetch(
        () => {
          throw new TypeError("fetch failed");
        },
        () => json({}, 503),
      ),
    );
    await expect(provider.search("Sognsvann")).rejects.toBeInstanceOf(GeocodingUnavailableError);
  });

  it("prøver på nytt én gang ved 5xx, men ikke ved 4xx", async () => {
    let addressCalls = 0;
    let placeCalls = 0;
    const provider = new KartverketGeocodingProvider(
      fakeFetch(
        () => (++addressCalls === 1 ? json({}, 502) : json(sognsvannAddresses)),
        () => {
          placeCalls++;
          return json({}, 400);
        },
      ),
    );
    const { sources } = await provider.searchDetailed("Sognsvann");
    expect(addressCalls).toBe(2);
    expect(placeCalls).toBe(1);
    expect(sources).toEqual({ address: "ok", place: "error" });
  });

  it("cacher komplette svar, men ikke delvise", async () => {
    const ok = fakeFetch(() => json(sognsvannAddresses), () => json(sognsvannPlaces));
    const provider = new KartverketGeocodingProvider(ok);
    await provider.search("Sognsvann");
    const second = await provider.searchDetailed("  sognsvann ");
    expect(second.cached).toBe(true);
    expect(ok).toHaveBeenCalledTimes(2);

    const partial = fakeFetch(() => json({}, 500), () => json(sognsvannPlaces));
    const partialProvider = new KartverketGeocodingProvider(partial);
    await partialProvider.search("Sognsvann");
    await partialProvider.search("Sognsvann");
    // 2 søk × (2 adresseforsøk + 1 stedsnavn) — ingenting servert fra cache.
    expect(partial).toHaveBeenCalledTimes(6);
  });
});

describe("buildSearchTerm", () => {
  it("bruker prefikssøk for ord, eksakt søk når siste ord har husnummer", () => {
    expect(buildSearchTerm("sognsv")).toBe("sognsv*");
    expect(buildSearchTerm("Karl Johans gate 1")).toBe("Karl Johans gate 1");
    expect(buildSearchTerm("Sognsveien 220B")).toBe("Sognsveien 220B");
  });

  it("fjerner brukerens egne jokertegn og ekstra mellomrom", () => {
    expect(buildSearchTerm("  oslo**  s ")).toBe("oslo s*");
  });
});
