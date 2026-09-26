import { describe, expect, it } from "vitest";
import { shelterFacts } from "@/lib/facts/queries";
import {
  describeMapLines,
  describeTilfluktsromLine,
  describeTilfluktsromSummary,
  TILFLUKTSROM_CAVEAT,
  TILFLUKTSROM_LABEL,
} from "@/lib/facts/wording";
import { DsbTilfluktsromProvider } from "@/lib/providers/dsb/tilfluktsrom";

/**
 * Offentlige tilfluktsrom fra Sivilforsvaret/DSB.
 *
 * Det som testes hardest er ordlyden. Kilden oppgir rommets dimensjonering, ikke ledige
 * plasser, og et rom i nærheten er ikke en anvisning om hvor noen skal gå.
 */

type Row = Parameters<typeof shelterFacts>[0][number];

const punkt = (n: number) => ({ type: "Point" as const, coordinates: [10.7 + n / 10_000, 59.9] });

const rom = (navn: string, distance_m: number, plasser: number | null = 400): Row =>
  ({
    id: `rom-${navn}`,
    provider_id: "dsb-tilfluktsrom",
    external_id: navn,
    category: "tilfluktsrom",
    subtype: "offentlig_tilfluktsrom",
    title: navn,
    distance_m,
    contains: false,
    attributes: { sted: navn, romnummer: 776, plasser },
    source_url: "https://kartkatalog.geonorge.no/metadata/tilfluktsrom-offentlige/dbae9aae-10e7-4b75-8d67-7f0e8828f3d8",
    source_url_type: "provider_page",
    source_updated_at: "2026-09-24T23:40:59.369Z",
    centroid: punkt(distance_m),
    geometry: punkt(distance_m),
  }) as unknown as Row;

describe("tilfluktsrom som seksjon", () => {
  it("ligger i sin egen seksjon, ikke i Nærområdet", () => {
    const { cluster } = shelterFacts([rom("Torget 6", 300)], 1000)!;
    expect(cluster.sectionId).toBe("tilfluktsrom");
  });

  it("oppsummerer antall innen radius", () => {
    expect(shelterFacts([rom("A", 100)], 1000)!.cluster.summary).toBe("1 offentlig tilfluktsrom innen 1 km");
    expect(shelterFacts([rom("A", 100), rom("B", 200)], 500)!.cluster.summary).toBe(
      "2 offentlige tilfluktsrom innen 500 m",
    );
  });

  it("sorterer nærmest først", () => {
    const { cluster } = shelterFacts([rom("Fjern", 900), rom("Nær", 120), rom("Midt", 400)], 1000)!;
    expect(cluster.lists[0]!.items.map((i) => i.title)).toEqual(["Nær", "Midt", "Fjern"]);
  });

  it("viser tre før «Se alle»", () => {
    const mange = [1, 2, 3, 4, 5].map((n) => rom(`Rom ${n}`, n * 100));
    const liste = shelterFacts(mange, 1000)!.cluster.lists[0]!;
    expect(liste.previewCount).toBe(3);
    expect(liste.total).toBe(5);
    expect(liste.toggleLabel).toContain("5");
  });

  it("gir ingenting uten treff — seksjonen faller bort", () => {
    expect(shelterFacts([], 1000)).toBeNull();
  });

  it("tegner hvert rom i kartet", () => {
    const { mapFeatures } = shelterFacts([rom("A", 100), rom("B", 200)], 1000)!;
    expect(mapFeatures).toHaveLength(2);
    expect(mapFeatures[0]!.category).toBe("tilfluktsrom");
  });

  it("holder to rom med samme stedsnavn fra hverandre", () => {
    // Deduplisering på tittel ville slått dem sammen. Hvert rom har sin egen lokalId.
    const a = { ...rom("Torget 6", 100), id: "a", external_id: "a" } as Row;
    const b = { ...rom("Torget 6", 250), id: "b", external_id: "b" } as Row;
    expect(shelterFacts([a, b], 1000)!.cluster.lists[0]!.items).toHaveLength(2);
  });
});

describe("kapasitet og manglende felter", () => {
  it("skriver «dimensjonert for», ikke «ledige plasser»", () => {
    expect(describeTilfluktsromLine({ plasser: 620 })).toBe("Dimensjonert for 620 personer");
  });

  it("utelater kapasitet når kilden ikke oppgir den", () => {
    // Ett av 556 rom har plasser = 0 i kilden. Det betyr ikke at rommet er fullt.
    expect(describeTilfluktsromLine({ plasser: null })).toBe(TILFLUKTSROM_LABEL);
    expect(describeTilfluktsromLine({})).toBe(TILFLUKTSROM_LABEL);
  });

  it("finner ikke på areal, type eller status — kilden har dem ikke", () => {
    const linjer = describeMapLines({
      subtype: "offentlig_tilfluktsrom",
      attributes: { sted: "Torget 6", plasser: 390, romnummer: 777 },
    });
    expect(linjer).toEqual(["Offentlig tilfluktsrom (Sivilforsvaret)", "Torget 6", "Dimensjonert for 390 personer"]);
    expect(linjer.join(" ")).not.toMatch(/areal|m²|type|status/i);
  });

  it("gir ingen tomme felter når metadata mangler", () => {
    const linjer = describeMapLines({ subtype: "offentlig_tilfluktsrom", attributes: {} });
    expect(linjer).toEqual(["Offentlig tilfluktsrom (Sivilforsvaret)"]);
  });
});

describe("ordlyden", () => {
  const alt = [
    TILFLUKTSROM_LABEL,
    TILFLUKTSROM_CAVEAT,
    describeTilfluktsromLine({ plasser: 620 }),
    describeTilfluktsromSummary({ total: 3, radiusLabel: "1 km" }),
  ].join(" ");

  it("lover aldri plass, og gir aldri en anvisning", () => {
    for (const forbudt of [/ledige plasser/i, /garantert/i, /her får du plass/i, /du skal gå til/i, /nærmeste tilfluktsrom er/i]) {
      expect(alt).not.toMatch(forbudt);
    }
  });

  it("sier at avstanden er luftlinje og ikke en rute", () => {
    expect(TILFLUKTSROM_CAVEAT).toContain("luftlinje");
    expect(TILFLUKTSROM_CAVEAT).toContain("ikke som anbefalt rute");
  });

  it("viser til myndighetenes varsling i stedet for å gi råd selv", () => {
    expect(TILFLUKTSROM_CAVEAT).toContain("følg råd og varsling fra");
  });

  it("er ikke alarmistisk", () => {
    for (const ord of [/krig/i, /angrep/i, /evakuer/i, /fare/i, /akutt/i]) expect(TILFLUKTSROM_CAVEAT).not.toMatch(ord);
  });
});

describe("normalisering fra DSB", () => {
  const provider = new DsbTilfluktsromProvider();
  const feature = (over: Record<string, unknown> = {}) => ({
    lokalId: "3acdde2d-1124-42a1-9961-4be701f81c1b",
    romnr: "776",
    plasser: "400",
    adresse: "Trimv. 09 - Borre Idrettspark (off)",
    posisjon: { Point: { pos: "59.404915 10.462108" } },
    datauttaksdato: "2026-09-24T23:40:59.369",
    ...over,
  });

  /**
   * Denne testen sa tidligere at `lokalId` var «stabil ekstern id». Det var den ikke: DSB
   * genererer den på nytt for hvert uttrekk, og to uttrekk et døgn fra hverandre hadde 0 av 556
   * ID-er felles. Identiteten er romnummeret. Se tests/sync/dsb-identitet.test.ts for
   * reconciliation-beviset.
   */
  it("bruker romnummeret som ekstern id, ikke den flyktige lokalId", () => {
    const { records } = provider.normalize({ features: [feature()], documents: [] });
    expect(records[0]!.externalId).toBe("776");
    expect(records[0]!.category).toBe("tilfluktsrom");
    expect(records[0]!.subtype).toBe("offentlig_tilfluktsrom");
    // Romnummeret ligger også i attributtene, som før.
    expect(records[0]!.attributes.romnummer).toBe(776);
  });

  it("holder uttrekkstidspunktet utenfor innholdet", () => {
    // datauttaksdato er når uttrekket ble kjørt, ikke når rommet ble endret. Tas den med i
    // innholdshashen, blir hver sync 556 «updated» uten at noe er endret.
    const { records } = provider.normalize({ features: [feature()], documents: [] });
    expect(records[0]!.sourceUpdatedAt).toBeNull();
  });

  it("gir samme eksterne id når kilden bytter lokalId", () => {
    const a = provider.normalize({ features: [feature()], documents: [] });
    const b = provider.normalize({
      features: [feature({ lokalId: "ny-uuid-hver-gang", datauttaksdato: "2026-09-25T23:40:59.001" })],
      documents: [],
    });
    expect(b.records[0]!.externalId).toBe(a.records[0]!.externalId);
  });

  it("legger rommet på riktig sted", () => {
    const { records } = provider.normalize({ features: [feature()], documents: [] });
    const [lng, lat] = records[0]!.geometry.coordinates as [number, number];
    expect(lat).toBeCloseTo(59.4049, 3);
    expect(lng).toBeCloseTo(10.4621, 3);
  });

  it("lagrer plasser som tall, og null når kilden oppgir 0", () => {
    expect(provider.normalize({ features: [feature()], documents: [] }).records[0]!.attributes.plasser).toBe(400);
    expect(
      provider.normalize({ features: [feature({ plasser: "0" })], documents: [] }).records[0]!.attributes.plasser,
    ).toBeNull();
  });

  it("avviser rader uten romnummer eller posisjon i stedet for å gjette", () => {
    const { records, rejected } = provider.normalize({
      features: [feature({ romnr: null }), feature({ posisjon: null })],
      documents: [],
    });
    expect(records).toEqual([]);
    expect(rejected).toHaveLength(2);
    expect(rejected[0]!.reason).toContain("romnr");
  });

  it("godtar en rad som mangler lokalId, siden den ikke er identiteten", () => {
    const { records, rejected } = provider.normalize({ features: [feature({ lokalId: null })], documents: [] });
    expect(rejected).toEqual([]);
    expect(records[0]!.externalId).toBe("776");
  });
});
