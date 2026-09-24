import { describe, expect, it } from "vitest";
import { placeFacts } from "@/lib/facts/queries";
import { describeMapLines, describePlaceLine, SERVERING_CAVEAT } from "@/lib/facts/wording";
import { SykehusProvider } from "@/lib/providers/helse/sykehus";
import { OsloSkjenkebevillingProvider } from "@/lib/providers/oslo/skjenkebevilling";
import type { KuratertSykehus, SykehusDatasett } from "@/lib/providers/helse/types";

/**
 * Nye typer i «Nærområdet»: sykehus (kurert, verifisert mot to kilder) og steder med
 * skjenkebevilling (Næringsetaten i Oslo). Reglene som holder kvaliteten oppe er testet her:
 * hva som kommer inn, hva som holdes ute, og at tidene ikke blandes sammen.
 */

type Row = Parameters<typeof placeFacts>[0][number];

const punkt = (n: number) => ({ type: "Point" as const, coordinates: [10.7 + n / 10_000, 59.9] });

function row(overrides: Partial<Row> & { title: string; distance_m: number }): Row {
  return {
    id: `${overrides.title}-${overrides.distance_m}`,
    provider_id: "oslo-skjenkebevilling",
    external_id: `e${overrides.distance_m}`,
    category: "servering",
    subtype: "skjenkested",
    contains: false,
    attributes: {},
    source_url: null,
    source_url_type: null,
    source_updated_at: null,
    centroid: punkt(overrides.distance_m),
    geometry: punkt(overrides.distance_m),
    ...overrides,
  } as Row;
}

const skjenkested = (title: string, distance_m: number, attributes: Record<string, unknown> = {}) =>
  row({ title, distance_m, attributes: { stengetidInne: "03:30", ...attributes } as Row["attributes"] });

const sykehus = (title: string, distance_m: number, eierform = "offentlig") =>
  row({
    title,
    distance_m,
    category: "helse",
    subtype: "sykehus",
    provider_id: "helsenorge-sykehus",
    attributes: { eierform, adresse: "Diakonveien 12", poststed: "OSLO" },
  });

const cluster = (rows: Row[], id: string, radius = 1000, antall = {}) =>
  placeFacts(rows, radius, antall).clusters.find((c) => c.id === id);

describe("sykehus i Nærområdet", () => {
  it("vises som egen gruppe med antall", () => {
    const c = cluster([sykehus("Diakonhjemmet Sykehus", 950, "privat"), sykehus("Ullevål", 2000)], "helse")!;
    expect(c.label).toBe("Helse og omsorg");
    expect(c.summary).toBe("2 sykehus innen 1 km");
    expect(c.lists.map((l) => l.label)).toEqual(["Sykehus"]);
    expect(c.lists[0]!.items.map((i) => i.title)).toEqual(["Diakonhjemmet Sykehus", "Ullevål"]);
  });

  it("oppgir eierform slik kilden gjør, uten å vurdere den", () => {
    expect(describePlaceLine({ subtype: "sykehus", attributes: { eierform: "privat" } })).toBe("Sykehus, privat drift");
    expect(describePlaceLine({ subtype: "sykehus", attributes: { eierform: "offentlig" } })).toBe("Sykehus");
  });

  it("sier hva som er utelatt, slik at listen ikke leses som komplett helsetilbud", () => {
    const c = cluster([sykehus("Ahus", 500)], "helse")!;
    expect(c.caveat).toContain("Omsorgstilbud er steder der den ansvarlige myndigheten selv publiserer navn og adresse");
  });

  it("tar ikke med steder som er merket nedlagt i den kuraterte fila", () => {
    const sted: KuratertSykehus = {
      orgnr: "1",
      navn: "Nedlagt sykehus",
      adresse: "Gata 1",
      postnr: "0001",
      poststed: "OSLO",
      kommune: "Oslo",
      lng: 10.7,
      lat: 59.9,
      eierform: "offentlig",
      helseregion: null,
      naeringskode: "86.101",
      status: "nedlagt",
      verifisert: "2026-09-24",
    };
    const drift: KuratertSykehus = { ...sted, orgnr: "2", navn: "Sykehus i drift", status: "i drift" };
    const datasett: SykehusDatasett = { verifisert: "2026-09-24", kilder: [], steder: [sted, drift] };

    const resultat = new SykehusProvider(datasett).normalize({ features: datasett.steder, documents: [] });
    expect(resultat.records.map((r) => r.title)).toEqual(["Sykehus i drift"]);
    expect(resultat.skipped?.[0]?.reason).toContain("nedlagt");
    expect(resultat.rejected).toEqual([]);
  });

  it("bygger kun på den kuraterte fila, ikke på koordinater i UI-koden", () => {
    const provider = new SykehusProvider();
    const resultat = provider.normalize({ features: [{ orgnr: "1", navn: "Uten koordinat" }], documents: [] });
    expect(resultat.records).toEqual([]);
    expect(resultat.rejected[0]!.reason).toContain("koordinat");
  });
});

describe("skjenkebevillinger i Nærområdet", () => {
  const mange = Array.from({ length: 40 }, (_, i) => skjenkested(`Sted ${i + 1}`, (i + 1) * 10));

  it("samler stedene i en egen gruppe med antall", () => {
    const c = cluster([skjenkested("Bar A", 120), skjenkested("Bar B", 300)], "servering")!;
    expect(c.label).toBe("Servering og uteliv");
    expect(c.summary).toBe("2 steder med skjenkebevilling innen 1 km");
  });

  it("viser de tre nærmeste først, resten bak utvideren", () => {
    const liste = cluster(mange, "servering")!.lists[0]!;
    expect(liste.previewCount).toBe(3);
    expect(liste.items.slice(0, 3).map((i) => i.title)).toEqual(["Sted 1", "Sted 2", "Sted 3"]);
  });

  it("kutter listen, men bruker databasens antall i teksten", () => {
    // 532 steder i området, 40 hentet, 30 vist: teksten skal si 532.
    const c = cluster(mange, "servering", 1000, { servering: 532 })!;
    expect(c.summary).toBe("532 steder med skjenkebevilling innen 1 km");
    expect(c.lists[0]!.items).toHaveLength(30);
    expect(c.lists[0]!.total).toBe(532);
    expect(c.lists[0]!.toggleLabel).toBe("Se de 30 nærmeste av 532");
  });

  it("sier fra når kartet bare tegner de nærmeste", () => {
    expect(cluster(mange, "servering")!.caveat).toContain("Kartet viser de 30 nærmeste stedene");
    expect(cluster([skjenkested("Bar A", 120)], "servering")!.caveat).toBe(SERVERING_CAVEAT);
  });

  it("tegner ikke flere markører enn kartet tåler", () => {
    const resultat = placeFacts(mange, 1000);
    expect(resultat.mapFeatures).toHaveLength(30);
  });

  it("holder stengetid, skjenketid og åpningstid fra hverandre", () => {
    const linje = describePlaceLine({
      subtype: "skjenkested",
      attributes: { stengetidInne: "03:30", stengetidUte: "01:00" },
    });
    expect(linje).toBe("Tillatt stengetid inne 03:30 · ute 01:00");
    // Vi regner aldri om til skjenketid, og lover aldri faktisk åpningstid.
    expect(linje).not.toMatch(/skjenketid|åpningstid|åpent til/i);
    expect(SERVERING_CAVEAT).toContain("ikke skjenketid");
    expect(SERVERING_CAVEAT).toContain("faktiske åpningstid");
  });

  it("håndterer sted uten tider uten å finne på noe", () => {
    expect(describePlaceLine({ subtype: "skjenkested", attributes: {} })).toBe("Skjenkebevilling");
    expect(describePlaceLine({ subtype: "skjenkested", attributes: { stengetidUte: "22:00" } })).toBe("ute 22:00");
  });

  it("gir popup med navn, type, adresse og tid — fra samme register som listen", () => {
    expect(
      describeMapLines({
        subtype: "skjenkested",
        attributes: { adresse: "Stortings plass", poststed: "OSLO", stengetidInne: "03:30", stengetidUte: "01:00" },
      }),
    ).toEqual([
      "Sted med skjenkebevilling (Næringsetaten, Oslo kommune)",
      "Stortings plass, OSLO",
      "Tillatt stengetid inne 03:30 · ute 01:00",
    ]);
    expect(describeMapLines({ subtype: "sykehus", attributes: { eierform: "offentlig", adresse: "Diakonveien 12" } })).toEqual([
      "Sykehus (Helsenorge)",
      "Diakonveien 12",
    ]);
  });
});

describe("skjenkebevilling: normalisering fra kilden", () => {
  const provider = new OsloSkjenkebevillingProvider();
  const feature = (properties: Record<string, unknown>, koordinat: [number, number] = [597324.33616, 6643058.43339]) => ({
    properties,
    geometry: { type: "Point", coordinates: koordinat },
  });

  it("legger stedet på riktig sted i verden", () => {
    const { records } = provider.normalize({
      features: [feature({ DBID: "1282", OBJEKTNAVN: "Tostrup Friluftsservering", INNE_TID: "03:30" })],
      documents: [],
    });
    const [lng, lat] = records[0]!.geometry.coordinates as [number, number];
    // Stortings plass i Oslo. Kilden leverer UTM 32N, som må regnes om.
    expect(lng).toBeCloseTo(10.7405, 3);
    expect(lat).toBeCloseTo(59.9135, 3);
  });

  it("lagrer aldri hvem som har bevillingen", () => {
    const { records } = provider.normalize({
      features: [
        feature({ DBID: "1", OBJEKTNAVN: "Cafe Hjørnet", EIERNAVN: "Huimin Zhao", ORGNR: "999", INNE_TID: "01:00" }),
      ],
      documents: [],
    });
    const lagret = JSON.stringify(records[0]);
    expect(lagret).not.toContain("Huimin Zhao");
    expect(lagret).not.toContain("EIERNAVN");
    expect(Object.keys(records[0]!.attributes)).toEqual([
      "adresse",
      "postnr",
      "poststed",
      "stengetidInne",
      "stengetidUte",
      "uteservering",
    ]);
  });

  it("skiller inne- og utetid, og markerer uteservering fra kildens eget felt", () => {
    const { records } = provider.normalize({
      features: [
        feature({ DBID: "1", OBJEKTNAVN: "Med uteservering", INNE_TID: "03:30", UTE_TID: "01:00" }),
        feature({ DBID: "2", OBJEKTNAVN: "Uten uteservering", INNE_TID: "03:30", UTE_TID: "" }),
      ],
      documents: [],
    });
    expect(records[0]!.attributes).toMatchObject({ stengetidInne: "03:30", stengetidUte: "01:00", uteservering: true });
    expect(records[1]!.attributes).toMatchObject({ stengetidUte: null, uteservering: false });
  });

  it("avviser rader uten id, navn eller posisjon i stedet for å gjette", () => {
    const { records, rejected } = provider.normalize({
      features: [
        { properties: { DBID: "3", OBJEKTNAVN: "Uten geometri" }, geometry: null },
        feature({ DBID: "4" }),
      ],
      documents: [],
    });
    expect(records).toEqual([]);
    expect(rejected).toHaveLength(2);
  });
});
