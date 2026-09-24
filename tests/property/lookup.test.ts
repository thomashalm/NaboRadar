import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { containsPoint, boundsOf } from "@/lib/property/geometry";
import { clearPropertyCache, lookupProperty } from "@/lib/property/lookup";

/**
 * Ekte WFS-svar fra Majorstuen, lagret under discovery. Klikkpunktet 59.92992, 10.71488 ligger
 * inne i teig 215/42 — og discovery viste at et lite bbox-søk ikke returnerer den teigen,
 * fordi filteret treffer representasjonspunktet. Derfor må oppslaget bruke buffer.
 */
const TEIGER = readFileSync("tests/fixtures/teiger-majorstuen.gml", "utf8");
const BYGNINGER = readFileSync("tests/fixtures/bygninger-majorstuen.gml", "utf8");
const KLIKK = { lat: 59.92992, lng: 10.71488 };

const tomFeatureCollection = `<?xml version='1.0' encoding='UTF-8'?>
<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" numberReturned="0"></wfs:FeatureCollection>`;

// Første adresse ligger utenfor teigen (verifisert mot fixturen), andre ligger inne i den.
const adresseSvar = JSON.stringify({
  adresser: [
    { adressetekst: "Sørkedalsveien 1C", representasjonspunkt: { lat: 59.92995, lon: 10.71375 } },
    { adressetekst: "Sørkedalsveien 3", representasjonspunkt: { lat: KLIKK.lat, lon: KLIKK.lng } },
  ],
});

interface FakeOptions {
  teigSvar?: (kall: number) => string;
  byggSvar?: string;
  adresse?: string;
  feilPå?: "teig" | "bygg" | "adresse";
}

/** Bygger et fetch som svarer som Geonorge, og teller kallene. */
function fakeFetch(options: FakeOptions = {}) {
  const kall: string[] = [];
  const impl = (async (input: string | URL) => {
    const url = String(input);
    kall.push(url);
    const feil = () => new Response("<html>502</html>", { status: 502 });

    if (url.includes("eiendomskart-teig")) {
      if (options.feilPå === "teig") return feil();
      const n = kall.filter((u) => u.includes("eiendomskart-teig")).length;
      return xml(options.teigSvar ? options.teigSvar(n) : TEIGER);
    }
    if (url.includes("bygningspunkt")) {
      if (options.feilPå === "bygg") return feil();
      return xml(options.byggSvar ?? BYGNINGER);
    }
    if (url.includes("adresser/v1/punktsok")) {
      if (options.feilPå === "adresse") return feil();
      return new Response(options.adresse ?? adresseSvar, { status: 200, headers: { "content-type": "application/json" } });
    }
    return feil();
  }) as unknown as typeof fetch;
  return { impl, kall };
}

const xml = (body: string) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

/** lookupProperty bruker global fetch; bytt den ut for testen. */
async function slåOpp(options: FakeOptions = {}, punkt = KLIKK) {
  const { impl, kall } = fakeFetch(options);
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return { resultat: await lookupProperty(punkt.lat, punkt.lng, { skipCache: true }), kall };
  } finally {
    globalThis.fetch = original;
  }
}

describe("eiendomsoppslag", () => {
  beforeEach(() => clearPropertyCache());

  it("finner teigen som faktisk inneholder klikkpunktet", async () => {
    const { resultat } = await slåOpp();
    expect(resultat.status).toBe("ok");
    if (resultat.status !== "ok") return;
    expect(resultat.property.matrikkelnummer.value).toBe("215/42");
    expect(resultat.property.matrikkelnummer.source).toBe("matrikkel-teig");
  });

  it("velger riktig polygon når svaret har flere kandidater", async () => {
    const { resultat } = await slåOpp();
    // Svaret inneholder 38/28, 215/32 og 215/42. Bare den siste omslutter punktet.
    expect(TEIGER).toContain("38/28");
    expect(TEIGER).toContain("215/32");
    if (resultat.status === "ok") expect(resultat.property.matrikkelnummer.value).toBe("215/42");
  });

  it("utvider bufferet når ingen kandidat traff — edge-caset fra discovery", async () => {
    const { resultat, kall } = await slåOpp({ teigSvar: (n) => (n === 1 ? tomFeatureCollection : TEIGER) });
    expect(resultat.status).toBe("ok");
    const teigKall = kall.filter((u) => u.includes("eiendomskart-teig"));
    expect(teigKall).toHaveLength(2);
    // Andre forsøk skal ha et større bbox enn første.
    const bbox = (u: string) => decodeURIComponent(new URL(u).searchParams.get("bbox") ?? "").split(",").map(Number);
    const [s1, , n1] = bbox(teigKall[0]!);
    const [s2, , n2] = bbox(teigKall[1]!);
    expect(n2! - s2!).toBeGreaterThan(n1! - s1!);
  });

  it("henter areal, kommune og type fra kilden", async () => {
    const { resultat } = await slåOpp();
    if (resultat.status !== "ok") throw new Error("forventet treff");
    expect(resultat.property.tomteareal?.value).toBeGreaterThan(0);
    expect(resultat.property.kommune?.value).toBe("OSLO");
    expect(resultat.property.matrikkelenhetstype?.value).toBe("Grunneiendom");
  });

  it("teller bygg som ligger inne i teigen, og oversetter bygningstypen", async () => {
    const { resultat } = await slåOpp();
    if (resultat.status !== "ok") throw new Error("forventet treff");
    const bygg = resultat.property.bygg.value;
    expect(resultat.property.bygg.source).toBe("matrikkel-bygningspunkt");
    for (const b of bygg) {
      expect(containsPoint(resultat.property.geometry, ...hentPunkt(b.bygningsnummer!))).toBe(true);
    }
    // Fixturen har typene 143 og 311 — begge skal oversettes, ingen skal gjettes.
    for (const b of bygg) if (b.typeCode) expect(b.typeLabel).toBeTruthy();
  });

  it("bruker adressen som ligger inne i teigen", async () => {
    const { resultat } = await slåOpp();
    if (resultat.status !== "ok") throw new Error("forventet treff");
    // Nærmeste adresse er ikke nødvendigvis riktig: vi tar den som ligger inne i teigen.
    expect(resultat.property.adresse?.value).toBe("Sørkedalsveien 3");
    expect(resultat.property.adresse?.source).toBe("kartverket-adresse");
  });

  it("gir «ingen eiendom» når ingen teig omslutter punktet", async () => {
    const { resultat } = await slåOpp({ teigSvar: () => tomFeatureCollection });
    expect(resultat.status).toBe("not-found");
  });

  it("tåler at kilden feiler, uten å kaste", async () => {
    const { resultat } = await slåOpp({ feilPå: "teig" });
    expect(resultat.status).toBe("error");
  });

  it("viser eiendommen selv om bygg eller adresse feiler", async () => {
    const utenBygg = await slåOpp({ feilPå: "bygg" });
    expect(utenBygg.resultat.status).toBe("ok");
    if (utenBygg.resultat.status === "ok") expect(utenBygg.resultat.property.bygg.value).toEqual([]);

    const utenAdresse = await slåOpp({ feilPå: "adresse" });
    expect(utenAdresse.resultat.status).toBe("ok");
    if (utenAdresse.resultat.status === "ok") expect(utenAdresse.resultat.property.adresse).toBeNull();
  });

  it("presenterer aldri eier, byggeår, bruksareal eller salgspris", async () => {
    const { resultat } = await slåOpp();
    const dump = JSON.stringify(resultat);
    expect(dump).not.toMatch(/hjemmelshaver|eiernavn|byggeår|byggeaar|bruksareal|kjøpesum|salgsdato|prisestimat/i);
  });

  it("henter ikke bygg eller adresse når ingen teig ble funnet", async () => {
    const { kall } = await slåOpp({ teigSvar: () => tomFeatureCollection });
    expect(kall.some((u) => u.includes("bygningspunkt"))).toBe(false);
    expect(kall.some((u) => u.includes("punktsok"))).toBe(false);
  });
});

describe("geometri", () => {
  it("bounds dekker hele flaten, med margin", () => {
    const geometry = { type: "Polygon" as const, coordinates: [[[10, 59], [11, 59], [11, 60], [10, 60], [10, 59]]] };
    expect(boundsOf(geometry)).toEqual([59, 10, 60, 11]);
    expect(boundsOf(geometry, 0.5)).toEqual([58.5, 9.5, 60.5, 11.5]);
  });

  it("punkt-i-polygon håndterer hull", () => {
    const medHull = {
      type: "Polygon" as const,
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
      ],
    };
    expect(containsPoint(medHull, 1, 1)).toBe(true);
    expect(containsPoint(medHull, 5, 5)).toBe(false);
    expect(containsPoint(medHull, 20, 20)).toBe(false);
  });
});

/** Henter bygningens punkt fra fixturen, slik at testen ikke antar noe om rekkefølge. */
function hentPunkt(bygningsnummer: string): [number, number] {
  const blokk = BYGNINGER.split("<app:Bygning ").find((b) => b.includes(`<app:bygningsnummer>${bygningsnummer}<`));
  const pos = blokk?.match(/<gml:pos>([^<]+)<\/gml:pos>/)?.[1] ?? "0 0";
  const [lat, lng] = pos.trim().split(/\s+/).map(Number);
  return [lng!, lat!];
}

describe("API-ruten", () => {
  beforeEach(() => clearPropertyCache());

  it("avviser posisjoner utenfor Norge uten å spørre kilden", async () => {
    const { GET } = await import("@/app/api/eiendom/route");
    const { impl, kall } = fakeFetch();
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    try {
      const svar = await GET(new Request("http://localhost/api/eiendom?lat=48.85&lng=2.29"));
      expect(svar.status).toBe(400);
      expect(kall).toEqual([]);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("svarer med eiendommen og måler tiden", async () => {
    const { GET } = await import("@/app/api/eiendom/route");
    const { impl } = fakeFetch();
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    try {
      const svar = await GET(new Request(`http://localhost/api/eiendom?lat=${KLIKK.lat}&lng=${KLIKK.lng}`));
      expect(svar.status).toBe(200);
      expect(svar.headers.get("server-timing")).toMatch(/^lookup;dur=\d+$/);
      const body = (await svar.json()) as { status: string; property?: { matrikkelnummer: { value: string } } };
      expect(body.status).toBe("ok");
      expect(body.property?.matrikkelnummer.value).toBe("215/42");
    } finally {
      globalThis.fetch = original;
    }
  });
});
