import { describe, expect, it } from "vitest";
import { erStedsfunn, grupperFunn, sorterFunn } from "@/lib/admin/research-sort";
import type { NearbyResearch } from "@/lib/admin/research-types";

/**
 * Rekkefølgen funn vises i admin-adressesøket.
 *
 * Interesse slår sikkerhet, som slår avstand. Poenget er at et viktig funn to kilometer unna
 * skal komme før et middels interessant i nabogården — i admin leter man etter hva som er verdt
 * å vite, ikke etter hva som tilfeldigvis er nærmest.
 */
function funn(over: Partial<NearbyResearch> & { id: string }): NearbyResearch {
  return {
    item_type: "finding",
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: null,
    title: over.id,
    description: null,
    address: null,
    municipality: "Oslo",
    latitude: 59.9,
    longitude: 10.8,
    distance_m: 100,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting: null,
    notes: null,
    source_count: 1,
    public_candidate: false,
    ...over,
  };
}

describe("rekkefølge på research-funn", () => {
  it("setter interesse foran avstand", () => {
    const rader = sorterFunn([
      funn({ id: "nær-medium", interest_level: "medium", distance_m: 50 }),
      funn({ id: "fjern-høy", interest_level: "high", distance_m: 2500 }),
    ]);
    expect(rader.map((r) => r.id)).toEqual(["fjern-høy", "nær-medium"]);
  });

  it("bruker sikkerhet som andre kriterium", () => {
    const rader = sorterFunn([
      funn({ id: "lav-sikkerhet", interest_level: "high", confidence: "low", distance_m: 10 }),
      funn({ id: "høy-sikkerhet", interest_level: "high", confidence: "high", distance_m: 900 }),
    ]);
    expect(rader.map((r) => r.id)).toEqual(["høy-sikkerhet", "lav-sikkerhet"]);
  });

  it("bruker avstand som tredje kriterium", () => {
    const rader = sorterFunn([
      funn({ id: "fjern", interest_level: "high", confidence: "high", distance_m: 800 }),
      funn({ id: "nær", interest_level: "high", confidence: "high", distance_m: 30 }),
    ]);
    expect(rader.map((r) => r.id)).toEqual(["nær", "fjern"]);
  });

  it("setter gruppen med det beste funnet først", () => {
    const grupper = grupperFunn([
      funn({ id: "a", category: "Støy / nabobelastning", interest_level: "low" }),
      funn({ id: "b", category: "Forsvar / militært", interest_level: "high" }),
      funn({ id: "c", category: "Støy / nabobelastning", interest_level: "high", confidence: "low" }),
    ]);
    expect(grupper.map((g) => g.kategori)).toEqual(["Forsvar / militært", "Støy / nabobelastning"]);
    // Innen gruppen ligger det beste funnet først.
    expect(grupper[1]!.funn.map((f) => f.id)).toEqual(["c", "a"]);
  });

  it("lager ingen tomme grupper", () => {
    expect(grupperFunn([])).toEqual([]);
    expect(grupperFunn([funn({ id: "a" })]).every((g) => g.funn.length > 0)).toBe(true);
  });

  it("holder datakvalitet og kildesaker ute av adressevisningen", () => {
    expect(erStedsfunn(funn({ id: "sted" }))).toBe(true);
    expect(erStedsfunn(funn({ id: "datafeil", item_type: "data_issue" }))).toBe(false);
    expect(erStedsfunn(funn({ id: "kilde", category: "Kilder" }))).toBe(false);
    expect(erStedsfunn(funn({ id: "avvik", category: "Datakvalitetsavvik" }))).toBe(false);
  });
});
