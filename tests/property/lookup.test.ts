import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { bygningstypeNavn } from "@/lib/property/bygningstype";
import snapshot from "@/lib/property/bygningstyper.json";
import { containsPoint, boundsOf } from "@/lib/property/geometry";
import { clearPropertyCache, lookupProperty } from "@/lib/property/lookup";

/**
 * Ekte svar fra Kartverket for klikkpunktet 59.92992, 10.71488 på Majorstuen (teig 215/42),
 * lagret 2026-10-03: Eiendom-API-et (`punkt/omrader`) og matrikkelkartets WMS (lagene `teiger`
 * og `bygning_symbol`). Bygningssvaret har 11 punkter i teigens utsnitt. Sju ligger inne i
 * teigen, og ett av dem (81357773) er revet (BR).
 */
const OMRADER = readFileSync("tests/fixtures/eiendom-omrader-majorstuen.json", "utf8");
const TEIG_GML = readFileSync("tests/fixtures/matrikkelkart-teig-majorstuen.gml", "utf8");
const BYGG_GML = readFileSync("tests/fixtures/matrikkelkart-bygg-majorstuen.gml", "utf8");
const KLIKK = { lat: 59.92992, lng: 10.71488 };

const INGEN_OMRADER = JSON.stringify({ type: "FeatureCollection", features: [] });
const TOM_GML = `<?xml version="1.0" encoding="UTF-8"?>\n<msGMLOutput xmlns:gml="http://www.opengis.net/gml">\n</msGMLOutput>`;
const WMS_UNNTAK = `<?xml version='1.0' encoding="UTF-8"?><ServiceExceptionReport version="1.3.0"><ServiceException code="LayerNotDefined">msWMSFeatureInfo(): Layer(s) specified in QUERY_LAYERS parameter is not offered.</ServiceException></ServiceExceptionReport>`;

// Første adresse ligger utenfor teigen (verifisert mot fixturen), andre ligger inne i den.
const adresseSvar = JSON.stringify({
  adresser: [
    { adressetekst: "Sørkedalsveien 1C", representasjonspunkt: { lat: 59.92995, lon: 10.71375 } },
    { adressetekst: "Sørkedalsveien 3", representasjonspunkt: { lat: KLIKK.lat, lon: KLIKK.lng } },
  ],
});

interface FakeOptions {
  omrader?: string;
  teigGml?: string;
  byggGml?: string;
  adresse?: string;
  feilPå?: "omrader" | "teig" | "bygg" | "adresse";
}

const erLag = (url: string, lag: string) => new URL(url).searchParams.get("LAYERS") === lag;

/** Bygger et fetch som svarer som Kartverket, og teller kallene. */
function fakeFetch(options: FakeOptions = {}) {
  const kall: string[] = [];
  const impl = (async (input: string | URL) => {
    const url = String(input);
    kall.push(url);
    const feil = () => new Response("<html>502</html>", { status: 502 });
    const json = (body: string) => new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    const gml = (body: string) => new Response(body, { status: 200, headers: { "content-type": "application/vnd.ogc.gml" } });

    if (url.includes("/eiendom/v1/punkt/omrader")) return options.feilPå === "omrader" ? feil() : json(options.omrader ?? OMRADER);
    if (url.includes("wms.matrikkelkart") && erLag(url, "teiger")) return options.feilPå === "teig" ? feil() : gml(options.teigGml ?? TEIG_GML);
    if (url.includes("wms.matrikkelkart") && erLag(url, "bygning_symbol")) return options.feilPå === "bygg" ? feil() : gml(options.byggGml ?? BYGG_GML);
    if (url.includes("adresser/v1/punktsok")) return options.feilPå === "adresse" ? feil() : json(options.adresse ?? adresseSvar);
    return feil();
  }) as unknown as typeof fetch;
  return { impl, kall };
}

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

  it("finner teigen som omslutter klikkpunktet, fra Eiendom-API-et", async () => {
    const { resultat, kall } = await slåOpp();
    expect(resultat.status).toBe("ok");
    if (resultat.status !== "ok") return;
    expect(resultat.property.matrikkelnummer.value).toBe("215/42");
    expect(resultat.property.matrikkelnummer.source).toBe("matrikkel-teig");
    expect(containsPoint(resultat.property.geometry, KLIKK.lng, KLIKK.lat)).toBe(true);
    // Matrikkel-WFS-ene brukes ikke lenger.
    expect(kall.some((u) => u.includes("wfs.geonorge.no"))).toBe(false);
  });

  it("spør Eiendom-API-et i EUREF89 med nord = breddegrad og øst = lengdegrad", async () => {
    const { kall } = await slåOpp();
    const url = new URL(kall.find((u) => u.includes("punkt/omrader"))!);
    expect(url.searchParams.get("nord")).toBe(String(KLIKK.lat));
    expect(url.searchParams.get("ost")).toBe(String(KLIKK.lng));
    expect(url.searchParams.get("koordsys")).toBe("4258");
    expect(url.searchParams.get("utkoordsys")).toBe("4258");
  });

  it("spør matrikkelkartet i EPSG:4326 med lat,lon og fin nok målestokk", async () => {
    const { kall } = await slåOpp();
    for (const lag of ["teiger", "bygning_symbol"]) {
      const url = new URL(kall.find((u) => u.includes("wms.matrikkelkart") && erLag(u, lag))!);
      expect(url.searchParams.get("CRS")).toBe("EPSG:4326");
      const [sør, vest, nord, øst] = url.searchParams.get("BBOX")!.split(",").map(Number);
      // Akserekkefølge: breddegrad først.
      expect(sør).toBeGreaterThan(59);
      expect(sør).toBeLessThan(61);
      expect(vest).toBeGreaterThan(10);
      expect(vest).toBeLessThan(11);
      expect(nord).toBeGreaterThan(sør!);
      // `bygning_symbol` svarer tomt grovere enn 1:2 000. MapServer regner fra bredden i grader.
      const målestokk = ((øst! - vest!) * 111_320) / (Number(url.searchParams.get("WIDTH")) * 0.00028);
      expect(målestokk).toBeLessThan(2_000);
    }
    const bygg = new URL(kall.find((u) => erLag(u, "bygning_symbol"))!);
    expect(bygg.searchParams.get("RADIUS")).toBe("bbox");
  });

  it("henter areal og kommune fra matrikkelkartet når teig-id-en er den samme", async () => {
    const { resultat } = await slåOpp();
    if (resultat.status !== "ok") throw new Error("forventet treff");
    expect(resultat.property.tomteareal?.value).toBeGreaterThan(0);
    expect(resultat.property.kommune?.value).toBe("OSLO");
    expect(resultat.property.id).toBe("291305462");
  });

  it("bruker ikke areal fra en annen teig enn den Eiendom-API-et ga", async () => {
    const { resultat } = await slåOpp({ teigGml: TEIG_GML.replace("<teigid>291305462</teigid>", "<teigid>1</teigid>") });
    if (resultat.status !== "ok") throw new Error("forventet treff");
    expect(resultat.property.tomteareal).toBeNull();
    expect(resultat.property.kommune).toBeNull();
    expect(resultat.property.matrikkelnummer.value).toBe("215/42");
  });

  it("teller bare bygg som ligger inne i teigen", async () => {
    const { resultat } = await slåOpp();
    if (resultat.status !== "ok") throw new Error("forventet treff");
    expect(resultat.property.bygg!.source).toBe("matrikkel-bygningspunkt");
    const nummer = resultat.property.bygg!.value.map((b) => b.bygningsnummer).sort();
    // Utsnittet har 11 bygningspunkter. Tre ligger inne i teigen, resten i naboteigene.
    expect(BYGG_GML.match(/<bygningsnummer>/g)).toHaveLength(11);
    expect(nummer).toEqual(["300163527", "300216214", "81814589"]);
  });

  it("teller ikke bygg som er revet, avlyst eller utgått", async () => {
    for (const status of ["BR", "BA", "BU", "BF"]) {
      const byggGml = BYGG_GML.replace(
        /(<bygningsnummer>81814589<\/bygningsnummer>[\s\S]*?<bygningsstatus>)TB/,
        `$1${status}`,
      );
      expect(byggGml).not.toBe(BYGG_GML);
      const { resultat } = await slåOpp({ byggGml });
      if (resultat.status !== "ok") throw new Error("forventet treff");
      expect(resultat.property.bygg!.value.map((b) => b.bygningsnummer)).not.toContain("81814589");
      expect(resultat.property.bygg!.value).toHaveLength(2);
    }
  });

  it("oversetter bygningstypen fra SSBs kodeliste og gjetter ikke ukjente koder", async () => {
    const { resultat } = await slåOpp({ byggGml: BYGG_GML.replace("<bygningstype>412</bygningstype>", "<bygningstype>000</bygningstype>") });
    if (resultat.status !== "ok") throw new Error("forventet treff");
    const bygg = resultat.property.bygg!.value;
    expect(bygg.find((b) => b.typeCode === "000")).toMatchObject({ typeLabel: null });
    expect(bygg.find((b) => b.typeCode === "181")?.typeLabel).toBe("Garasje, uthus, anneks knyttet til bolig");
  });

  it("bruker adressen som ligger inne i teigen", async () => {
    const { resultat } = await slåOpp();
    if (resultat.status !== "ok") throw new Error("forventet treff");
    // Nærmeste adresse er ikke nødvendigvis riktig: vi tar den som ligger inne i teigen.
    expect(resultat.property.adresse?.value).toBe("Sørkedalsveien 3");
    expect(resultat.property.adresse?.source).toBe("kartverket-adresse");
  });

  it("gir «ingen eiendom» bare når Eiendom-API-et svarer gyldig uten teig", async () => {
    const { resultat, kall } = await slåOpp({ omrader: INGEN_OMRADER });
    expect(resultat.status).toBe("not-found");
    // Ingen teig: da spør vi ikke etter bygg, areal eller adresse.
    expect(kall).toHaveLength(1);
  });

  it("hopper over anleggsprojeksjonsflater", async () => {
    const { resultat } = await slåOpp({ omrader: OMRADER.replace('"objekttype":"Teig"', '"objekttype":"Anleggsprojeksjonsflate"') });
    expect(resultat.status).toBe("not-found");
  });

  it("en teknisk feil er ikke «ingen eiendom»", async () => {
    expect((await slåOpp({ feilPå: "omrader" })).resultat.status).toBe("error");
    // 200 med noe annet enn det avtalte skjemaet er også en feil.
    expect((await slåOpp({ omrader: JSON.stringify({ errors: { message: "x" } }) })).resultat.status).toBe("error");
    expect((await slåOpp({ omrader: "<html>Bad gateway</html>" })).resultat.status).toBe("error");
  });

  it("avviser koordinater utenfor Norge (byttet akserekkefølge)", async () => {
    const byttet = JSON.parse(OMRADER) as { features: { geometry: { coordinates: number[][][] } }[] };
    for (const ring of byttet.features[0]!.geometry.coordinates) for (const punkt of ring) punkt.reverse();
    expect((await slåOpp({ omrader: JSON.stringify(byttet) })).resultat.status).toBe("error");
  });

  it("viser eiendommen med ukjent bygg når bygningsoppslaget feiler, aldri «ingen bygg»", async () => {
    for (const options of [{ feilPå: "bygg" as const }, { byggGml: WMS_UNNTAK }, { byggGml: "<html>500</html>" }]) {
      const { resultat } = await slåOpp(options);
      expect(resultat.status).toBe("ok");
      if (resultat.status === "ok") expect(resultat.property.bygg).toBeNull();
    }
  });

  it("et gyldig, tomt bygningssvar betyr ingen bygg", async () => {
    const { resultat } = await slåOpp({ byggGml: TOM_GML });
    if (resultat.status !== "ok") throw new Error("forventet treff");
    expect(resultat.property.bygg?.value).toEqual([]);
  });

  it("viser eiendommen uten areal eller adresse når de oppslagene feiler", async () => {
    const utenAreal = await slåOpp({ feilPå: "teig" });
    expect(utenAreal.resultat.status).toBe("ok");
    if (utenAreal.resultat.status === "ok") expect(utenAreal.resultat.property.tomteareal).toBeNull();

    const utenAdresse = await slåOpp({ feilPå: "adresse" });
    expect(utenAdresse.resultat.status).toBe("ok");
    if (utenAdresse.resultat.status === "ok") expect(utenAdresse.resultat.property.adresse).toBeNull();
  });

  it("presenterer aldri eier, byggeår, bruksareal eller salgspris", async () => {
    const { resultat } = await slåOpp();
    const dump = JSON.stringify(resultat);
    expect(dump).not.toMatch(/hjemmelshaver|eiernavn|byggeår|byggeaar|bruksareal|kjøpesum|salgsdato|prisestimat/i);
  });
});

describe("bygningstype (SSB KLASS 31, NS 3457)", () => {
  it("har kilde, versjon og dato i øyeblikksbildet", () => {
    expect(snapshot.kilde).toContain("KLASS 31");
    expect(snapshot.versjon).toBeTruthy();
    expect(snapshot.hentet).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(snapshot.koder).length).toBeGreaterThan(100);
  });

  it("kodene som var feil i den håndskrevne tabellen", () => {
    expect(bygningstypeNavn("719")).toBe("Sykehus");
    expect(bygningstypeNavn("613")).toBe("Barneskole");
    expect(bygningstypeNavn("641")).toBe("Museum, kunstgalleri");
    expect(bygningstypeNavn("642")).toBe("Bibliotek, mediatek");
    expect(bygningstypeNavn("612")).toBe("Barnehage");
    expect(bygningstypeNavn("611")).toBe("Lekepark");
    expect(bygningstypeNavn("143")).toBe("Store frittliggende boligbygg på 5 etasjer eller over");
    expect(bygningstypeNavn("144")).toBe("Store sammenbygde boligbygg på 2 etasjer");
    expect(bygningstypeNavn("145")).toBe("Store sammenbygde boligbygg på 3 og 4 etasjer");
    expect(bygningstypeNavn("146")).toBe("Store sammenbygde boligbygg på 5 etasjer og over");
    expect(bygningstypeNavn("181")).toBe("Garasje, uthus, anneks knyttet til bolig");
    expect(bygningstypeNavn("171")).toBe("Seterhus, sel, rorbu o.l.");
  });

  it("én representativ kode i hver hovedgruppe", () => {
    const forventet: Record<string, string> = {
      "111": "Enebolig",
      "131": "Rekkehus",
      "161": "Fritidsbygning (hytter, sommerhus o.l.)",
      "212": "Verkstedbygning",
      "231": "Lagerhall",
      "311": "Kontor- og administrasjonsbygning, rådhus",
      "322": "Butikkbygning",
      "412": "Jernbane- og T-banestasjon",
      "511": "Hotellbygning",
      "671": "Kirke, kapell",
    };
    for (const [kode, navn] of Object.entries(forventet)) expect(bygningstypeNavn(kode)).toBe(navn);
    for (const gruppe of "12345678") {
      expect(Object.keys(snapshot.koder).some((kode) => kode.startsWith(gruppe))).toBe(true);
    }
  });

  it("ukjent, tom eller manglende kode gir null", () => {
    expect(bygningstypeNavn("000")).toBeNull();
    expect(bygningstypeNavn("")).toBeNull();
    expect(bygningstypeNavn(null)).toBeNull();
  });

  it("ingen navn er tomme eller har overflødige mellomrom", () => {
    for (const navn of Object.values(snapshot.koder)) {
      expect(navn.length).toBeGreaterThan(2);
      expect(navn).toBe(navn.trim());
    }
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
