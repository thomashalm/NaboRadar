import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import {
  getAreaFacts,
  NEAREST_SHELTER_COUNT,
  NEAREST_SHELTER_RADIUS_M,
  shelterFacts,
  shelterFactsOutsideRadius,
} from "@/lib/facts/queries";
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
    // Slik fila har det: øst og nord i UTM 33.
    posisjon: { Point: { pos: "242485.0000218585 6593925.999916838", "@srsName": "urn:ogc:def:crs:EPSG::25833" } },
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

  it("regner om nøyaktig også langt fra sone 33", () => {
    // Kaigaten 8 i Vardø (romnr 1681), 31° øst. Den korte rekkeutviklingen bommet med 42 m her.
    const vardo = feature({ romnr: "1681", posisjon: { Point: { pos: "1097495.4329697369 7887147.414813985" } } });
    const [lng, lat] = provider.normalize({ features: [vardo], documents: [] }).records[0]!.geometry.coordinates as [number, number];
    // Posisjonen Geonorges WFS ga for samme rom i EPSG:4326.
    expect(lng).toBeCloseTo(31.102779, 5);
    expect(lat).toBeCloseTo(70.37256, 5);
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

/**
 * Regresjon: Langmyrgrenda 26C, Oslo (2026-10-03).
 *
 * Søk fra /tilfluktsrom ga en resultatside uten noe om tilfluktsrom. Dataene var riktige — alle
 * 556 rom i databasen var identiske med Sivilforsvarets uttrekk samme dag. Nærmeste rom,
 * Bentsegt 21-25, ligger 3 287 m unna: utenfor 1 km, og utenfor 3 km også. Seksjonen falt bort
 * fordi «ingen innen radius» ble behandlet som «ingenting å vise».
 */
describe("ingen rom innen radius", () => {
  const LANGMYRGRENDA = { lat: 59.96646, lng: 10.74715 };
  const naermeste = [rom("Bentsegt 21-25", 3287, 250), rom("Kingosgt 17", 4063, 260), rom("Vøyensvingen 4", 4087, 300)];

  /** Databasen slik den svarer for Langmyrgrenda: tomt innen radius, tre rom innen 10 km. */
  function db(svar: { naermeste?: Row[]; feilPaaNaermeste?: boolean } = {}) {
    const kall: { radius: number; categories: unknown; max: unknown }[] = [];
    const impl: Db = {
      kind: "supabase",
      async rpc<T>(fn: string, args: Record<string, unknown> = {}) {
        if (fn !== "features_near") return [] as T[];
        const radius = args.radius_m as number;
        kall.push({ radius, categories: args.categories, max: args.max_results });
        const bareTilfluktsrom = JSON.stringify(args.categories) === JSON.stringify(["tilfluktsrom"]);
        if (!bareTilfluktsrom) return [] as T[];
        if (svar.feilPaaNaermeste) throw new Error("timeout");
        return (svar.naermeste ?? naermeste).filter((r) => r.distance_m <= radius) as unknown as T[];
      },
    };
    return { impl, kall };
  }

  const seksjon = async (params: { radius: number; nearestShelters?: boolean }, database = db()) => {
    const svar = await getAreaFacts({ ...LANGMYRGRENDA, sources: "db", db: database.impl, ...params });
    if (svar.status !== "ok") throw new Error("forventet ok");
    return { svar, cluster: svar.groups.find((g) => g.sectionId === "tilfluktsrom")?.clusters[0] ?? null };
  };

  it("spesialverktøyet viser de nærmeste rommene, merket som utenfor radius", async () => {
    const { svar, cluster } = await seksjon({ radius: 1000, nearestShelters: true });
    expect(cluster!.summary).toBe("Ingen offentlige tilfluktsrom innen 1 km");
    expect(cluster!.emptyNote).toBeUndefined();
    expect(cluster!.defaultOpen).toBe(true);
    expect(cluster!.lists[0]!.label).toBe("Nærmeste offentlige tilfluktsrom – utenfor 1 km");
    expect(cluster!.lists[0]!.items.map((i) => [i.title, i.distanceLabel, i.subtitle])).toEqual([
      ["Bentsegt 21-25", "3,3 km unna", "Dimensjonert for 250 personer"],
      ["Kingosgt 17", "4,1 km unna", "Dimensjonert for 260 personer"],
      ["Vøyensvingen 4", "4,1 km unna", "Dimensjonert for 300 personer"],
    ]);
    expect(cluster!.caveat).toBe(TILFLUKTSROM_CAVEAT);
    expect(cluster!.sourceName).toContain("Sivilforsvaret");
    expect(svar.sources.map((k) => k.name)).toContain("Offentlige tilfluktsrom");
    // Kartet er zoomet til valgt radius. Rom utenfor tegnes ikke som om de lå innenfor.
    expect(svar.mapFeatures).toEqual([]);
  });

  it("gjelder også 3 km: nærmeste rom ligger 3,3 km unna", async () => {
    const { cluster } = await seksjon({ radius: 3000, nearestShelters: true });
    expect(cluster!.summary).toBe("Ingen offentlige tilfluktsrom innen 3 km");
    expect(cluster!.lists[0]!.label).toBe("Nærmeste offentlige tilfluktsrom – utenfor 3 km");
  });

  it("/omrade følger valgt radius: sier at ingen ligger innenfor, og lenker til de nærmeste", async () => {
    const { cluster } = await seksjon({ radius: 1000 });
    expect(cluster!.emptyNote).toEqual({ text: "Ingen offentlige tilfluktsrom innen 1 km.", nearestLink: true });
    // Rommene listes ikke — /omrade later ikke som om noe 3 km unna ligger innen 1 km.
    expect(cluster!.lists).toEqual([]);
    expect(JSON.stringify(cluster)).not.toContain("Bentsegt");
  });

  it("sier aldri «ingen tilfluktsrom» uten radius", async () => {
    for (const nearestShelters of [true, false]) {
      const { cluster } = await seksjon({ radius: 1000, nearestShelters });
      expect(JSON.stringify(cluster)).not.toMatch(/Ingen (offentlige )?tilfluktsrom(?! innen)/);
    }
  });

  it("bruker samme lesefunksjon med 10 km og tre treff — ingen egen datavei", async () => {
    const database = db();
    await seksjon({ radius: 1000, nearestShelters: true }, database);
    expect(database.kall.filter((k) => JSON.stringify(k.categories) === JSON.stringify(["tilfluktsrom"]))).toEqual([
      { radius: NEAREST_SHELTER_RADIUS_M, categories: ["tilfluktsrom"], max: NEAREST_SHELTER_COUNT },
    ]);
    expect(NEAREST_SHELTER_RADIUS_M).toBe(10_000);
  });

  it("bygd uten rom innen 10 km: verktøyet sier det, /omrade viser ingen seksjon", async () => {
    const tom = () => db({ naermeste: [] });
    const verktoy = await seksjon({ radius: 1000, nearestShelters: true }, tom());
    expect(verktoy.cluster!.emptyNote).toEqual({ text: "Ingen offentlige tilfluktsrom innen 10 km.", nearestLink: false });
    expect((await seksjon({ radius: 1000 }, tom())).cluster).toBeNull();
  });

  it("teknisk feil leses ikke som «ingen rom», og tar ikke resten av siden med seg", async () => {
    for (const nearestShelters of [true, false]) {
      const { svar, cluster } = await seksjon({ radius: 1000, nearestShelters }, db({ feilPaaNaermeste: true }));
      expect(svar.status).toBe("ok");
      expect(cluster!.emptyNote).toEqual({ text: "Kunne ikke hente tilfluktsrom akkurat nå.", nearestLink: false });
      expect(JSON.stringify(cluster)).not.toMatch(/Ingen/);
    }
  });

  it("rom innen radius vises som før, og åpnes når søket kom fra verktøyet", () => {
    expect(shelterFacts([rom("A", 100)], 1000)!.cluster.defaultOpen).toBe(false);
    expect(shelterFacts([rom("A", 100)], 1000, true)!.cluster.defaultOpen).toBe(true);
    expect(shelterFactsOutsideRadius([], 1000, false)).toBeNull();
  });
});
