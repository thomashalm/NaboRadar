import { afterEach, describe, expect, it, vi } from "vitest";

const svar = (z: number | null) => new Response(JSON.stringify({ koordsys: 4258, punkter: [{ datakilde: "dtm1", terreng: "Skog", x: 10.66, y: 60.03, z }] }));

async function last() {
  vi.resetModules();
  return (await import("@/lib/geo/elevation")).elevationAt;
}

describe("høyde fra Kartverkets høydemodell", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runder av til hele meter og spør bare én gang per punkt", async () => {
    const fetchMock = vi.fn(async (url: string) => (url ? svar(432.62) : svar(null)));
    vi.stubGlobal("fetch", fetchMock);
    const elevationAt = await last();
    expect(await elevationAt(60.0360956, 10.6636515)).toBe(433);
    expect(await elevationAt(60.0360956, 10.6636515)).toBe(433);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("koordsys=4258&nord=60.0360956&ost=10.6636515");
  });

  it("gir ingen høyde når tjenesten ikke har en — aldri et gjettet tall", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => svar(null)));
    expect(await (await last())(60, 10)).toBeNull();
    // Utenfor dekning svarer tjenesten med en stor negativ plassholder.
    vi.stubGlobal("fetch", vi.fn(async () => svar(-32767)));
    expect(await (await last())(60, 10)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nede", { status: 503 })));
    expect(await (await last())(60, 10)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
    expect(await (await last())(60, 10)).toBeNull();
  });
});
