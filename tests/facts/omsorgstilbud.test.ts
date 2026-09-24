import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { placeFacts } from "@/lib/facts/queries";
import { describeMapLines, describePlaceLine, OMSORG_LABEL } from "@/lib/facts/wording";
import { OmsorgstilbudProvider } from "@/lib/providers/omsorg/omsorgstilbud";
import type { KuratertOmsorgstilbud, OmsorgDatasett } from "@/lib/providers/omsorg/types";

/**
 * Omsorgstilbud: sykehjem, behandlingssteder og institusjonsbaserte botilbud som den
 * ansvarlige myndigheten selv publiserer med navn og adresse.
 *
 * To ting testes hardt: at bare verifiserte steder kommer inn, og at brukeren aldri ser den
 * presise typen. Vi kartlegger stedet, aldri menneskene som bruker det.
 */

const datasett: OmsorgDatasett = JSON.parse(readFileSync("data/omsorgstilbud.json", "utf8"));

const sted = (overrides: Partial<KuratertOmsorgstilbud> = {}): KuratertOmsorgstilbud => ({
  id: "test-1",
  navn: "Et omsorgstilbud",
  internalType: "sykehjem",
  adresse: "Gata 1",
  postnr: "0001",
  poststed: "OSLO",
  kommune: "Oslo",
  lng: 10.7,
  lat: 59.9,
  operator: "Oslo kommune",
  status: "i drift",
  kilde: "Oslo kommune – sykehjem, helsehus og dagsentre",
  kildeUrl: "https://www.oslo.kommune.no/…",
  kildeType: "kommune",
  koordinatKilde: "kilde",
  verifisert: "2026-09-24",
  ...overrides,
});

const normaliser = (steder: KuratertOmsorgstilbud[]) =>
  new OmsorgstilbudProvider({ verifisert: "2026-09-24", kilder: [], steder }).normalize({
    features: steder,
    documents: [],
  });

describe("omsorgstilbud: hva som kommer inn", () => {
  it("viser et sted som er publisert av ansvarlig myndighet", () => {
    const { records } = normaliser([sted({ navn: "Abildsøhjemmet" })]);
    expect(records).toHaveLength(1);
    expect(records[0]!.title).toBe("Abildsøhjemmet");
    expect(records[0]!.category).toBe("omsorg");
    expect(records[0]!.subtype).toBe("omsorgstilbud");
  });

  it("viser ikke steder som er tatt ut eller skjult", () => {
    const { records, skipped } = normaliser([
      sted({ id: "nedlagt", status: "nedlagt" }),
      sted({ id: "skjult", status: "skjult" }),
      sted({ id: "drift" }),
    ]);
    expect(records.map((r) => r.externalId)).toEqual(["drift"]);
    expect(skipped?.map((s) => s.externalId).sort()).toEqual(["nedlagt", "skjult"]);
  });

  it("avviser rader uten koordinat i stedet for å gjette", () => {
    const { records, rejected } = normaliser([{ ...sted(), lat: undefined as unknown as number }]);
    expect(records).toEqual([]);
    expect(rejected[0]!.reason).toContain("koordinat");
  });

  it("beholder den presise typen i dataene", () => {
    const { records } = normaliser([sted({ internalType: "barnevern" }), sted({ id: "t2", internalType: "rusbehandling" })]);
    expect(records.map((r) => r.attributes.internalType)).toEqual(["barnevern", "rusbehandling"]);
  });
});

describe("omsorgstilbud: hva brukeren ser", () => {
  const omsorg = (navn: string, distance_m: number, attributes: Record<string, unknown> = {}) =>
    ({
      id: `${navn}-${distance_m}`,
      provider_id: "omsorgstilbud",
      external_id: navn,
      category: "omsorg",
      subtype: "omsorgstilbud",
      title: navn,
      distance_m,
      contains: false,
      attributes: { internalType: "barnevern", adresse: "Øvre Langåsvei 11", poststed: "OSLO", ...attributes },
      source_url: "https://www.oslo.kommune.no/…",
      source_url_type: "provider_page",
      source_updated_at: null,
      centroid: { type: "Point", coordinates: [10.75, 59.96] },
      geometry: { type: "Point", coordinates: [10.75, 59.96] },
    }) as unknown as Parameters<typeof placeFacts>[0][number];

  it("kaller alt «Omsorgstilbud», uansett intern type", () => {
    for (const internalType of ["barnevern", "akuttinstitusjon", "rusbehandling", "psykisk_helse", "sykehjem"]) {
      const linje = describePlaceLine({ subtype: "omsorgstilbud", attributes: { internalType, adresse: "Gata 1" } });
      expect(linje.startsWith(OMSORG_LABEL)).toBe(true);
      expect(linje).not.toMatch(/barnevern|rus|psykiat|akuttinstitusjon|sykehjem/i);
    }
  });

  it("viser navn, «Omsorgstilbud» og adresse i listen", () => {
    expect(describePlaceLine({ subtype: "omsorgstilbud", attributes: { adresse: "Øvre Langåsvei 11", poststed: "OSLO" } })).toBe(
      "Omsorgstilbud · Øvre Langåsvei 11, OSLO",
    );
  });

  it("gir popup med type, adresse og kilde — uten den sensitive undertypen", () => {
    const linjer = describeMapLines({
      subtype: "omsorgstilbud",
      attributes: {
        internalType: "akuttinstitusjon",
        adresse: "Øvre Langåsvei 11",
        poststed: "OSLO",
        kilde: "Oslo kommune – barnevernsinstitusjoner og -tiltak",
        kildeAktor: "Oslo kommune",
      },
    });
    expect(linjer).toEqual(["Omsorgstilbud", "Øvre Langåsvei 11, OSLO", "Kilde: Oslo kommune"]);
    // Verken den interne typen eller navnet på kommunens liste røper hva slags tilbud det er.
    expect(linjer.join(" ")).not.toMatch(/akuttinstitusjon|barnevern|rus|psykiat/i);
  });

  it("teller sykehus og omsorgstilbud hver for seg i «Helse og omsorg»", () => {
    const sykehus = {
      ...omsorg("Diakonhjemmet Sykehus", 900),
      category: "helse",
      subtype: "sykehus",
      attributes: { eierform: "privat" },
    } as Parameters<typeof placeFacts>[0][number];
    const rader = [sykehus, omsorg("A", 100), omsorg("B", 200), omsorg("C", 300)];

    const gruppe = placeFacts(rader, 1000).clusters.find((c) => c.id === "helse")!;
    expect(gruppe.label).toBe("Helse og omsorg");
    expect(gruppe.summary).toBe("1 sykehus · 3 omsorgstilbud innen 1 km");
    expect(gruppe.lists.map((l) => l.label)).toEqual(["Sykehus", "Omsorgstilbud"]);
  });

  it("viser maks tre omsorgstilbud før «Se alle», sortert på avstand", () => {
    const rader = [5, 1, 4, 2, 3].map((n) => omsorg(`Sted ${n}`, n * 100));
    const liste = placeFacts(rader, 1000).clusters.find((c) => c.id === "helse")!.lists[0]!;

    expect(liste.previewCount).toBe(3);
    expect(liste.items.map((i) => i.title)).toEqual(["Sted 1", "Sted 2", "Sted 3", "Sted 4", "Sted 5"]);
    expect(liste.toggleLabel).toBe("Se alle omsorgstilbud (5)");
    expect(liste.items[0]!.distanceLabel).toBe("100 m unna");
  });

  it("sier fra at dekningen er begrenset, så tomt ikke leses som ingenting", () => {
    const gruppe = placeFacts([omsorg("A", 100)], 1000).clusters.find((c) => c.id === "helse")!;
    expect(gruppe.caveat).toContain("foreløpig tilgjengelig i utvalgte områder");
  });

  it("tegner omsorgstilbud som markør i kartet", () => {
    const kart = placeFacts([omsorg("A", 100)], 1000).mapFeatures;
    expect(kart).toHaveLength(1);
    expect(kart[0]!.category).toBe("omsorg");
    expect(kart[0]!.lines[0]).toBe("Omsorgstilbud");
  });
});

describe("det kuraterte datasettet", () => {
  it("har en dokumentert offentlig kilde for hvert sted", () => {
    for (const s of datasett.steder) {
      expect(s.kildeUrl).toMatch(/^https:\/\//);
      expect(s.kilde.length).toBeGreaterThan(0);
      expect(s.verifisert).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["kommune", "helsemyndighet", "statlig_etat", "institusjon"]).toContain(s.kildeType);
    }
  });

  it("har husnummer i alle adresser, slik at ingen posisjon er utledet", () => {
    for (const s of datasett.steder) expect(s.adresse).toMatch(/\d/);
  });

  it("inneholder ingen fosterhjem, beredskapshjem eller administrasjonsbygg", () => {
    for (const s of datasett.steder) {
      expect(s.navn).not.toMatch(/fosterhjem|beredskapshjem/i);
      expect(s.adresse).not.toMatch(/administrasjonsbygg/i);
    }
  });

  it("inneholder ingen personopplysninger", () => {
    const felter = new Set(datasett.steder.flatMap((s) => Object.keys(s)));
    for (const forbudt of ["beboere", "pasienter", "barn", "kontaktperson", "epost", "telefon"]) {
      expect([...felter].join(" ")).not.toContain(forbudt);
    }
  });

  it("verifiserer Villa Krogh mot Oslo kommunes egen publisering", () => {
    // Stedet som i karttjenester heter «Korsvoll akuttinstitusjon for barn». Oslo kommune
    // publiserer det selv med navn, adresse og koordinat på sin egen side.
    const vk = datasett.steder.find((s) => s.navn.startsWith("Villa Krogh"))!;
    expect(vk).toBeDefined();
    expect(vk.internalType).toBe("akuttinstitusjon");
    expect(vk.adresse).toBe("Øvre Langåsvei 11");
    expect(vk.kildeUrl).toContain("oslo.kommune.no");
    expect(vk.kildeType).toBe("kommune");
    expect(vk.koordinatKilde).toBe("kilde");
    // Koordinaten er kommunens egen, og ligger på Korsvoll.
    expect(vk.lat).toBeCloseTo(59.9645, 3);
    expect(vk.lng).toBeCloseTo(10.7554, 3);
  });

  it("tar ikke inn ideelle institusjoner kommunen ikke publiserer adressen for", () => {
    // Sju oppføringer i kommunens barnevernsliste mangler adresse i den strukturerte kilden.
    for (const navn of ["Othilie", "Soldammen", "Hiimsmoen", "Lertrøa", "Vulubekken", "Sortatunet"]) {
      expect(datasett.steder.some((s) => s.navn.includes(navn))).toBe(false);
    }
  });
});
