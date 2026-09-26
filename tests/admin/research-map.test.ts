import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { internalFeatureFra, internalFeatures } from "@/lib/admin/research-map";
import { internalFindingsLayer } from "@/lib/map/layers/internal-findings";
import type { NearbyResearch } from "@/lib/admin/research-types";

/**
 * Research-funn på admin-kartet.
 *
 * Søkepunktet er Ringstabekkveien 89 og funnet ligger i Egne Hjems vei 5, 33 m unna — to
 * naboadresser på Bekkestua. Koordinatene er Kartverkets representasjonspunkter.
 */
const EGNE_HJEMS: NearbyResearch = {
  id: "a607dcb4-9c27-4dd8-b77b-63a31ea038fd",
  category: "Omsorg / bofellesskap",
  subcategory: null,
  title: "Mulig omsorgsrelatert virksomhet",
  description: null,
  address: "Egne Hjems vei 5",
  municipality: "Bærum",
  latitude: 59.919488,
  longitude: 10.597865,
  distance_m: 32.7,
  verification_status: "investigated_not_confirmed",
  operational_status: "unknown",
  sensitivity: "internal_only",
  confidence: "low",
  interest_level: "medium",
  source_count: 4,
};

describe("research som kartobjekt", () => {
  it("legger funnet inn i internalFeatures med koordinat i kartrekkefølge", () => {
    const features = internalFeatures([EGNE_HJEMS]);
    expect(features).toHaveLength(1);
    const feature = features[0]!;
    expect(feature.id).toBe(EGNE_HJEMS.id);
    // GeoJSON er [lng, lat]. Byttet rekkefølge ville plassert punktet i Sibir.
    expect(feature.center).toEqual([10.597865, 59.919488]);
  });

  it("gir popupen alt som skal stå der", () => {
    const feature = internalFeatureFra(EGNE_HJEMS)!;
    expect(feature.title).toBe("Mulig omsorgsrelatert virksomhet");
    const tekst = feature.lines.join(" | ");
    expect(tekst).toContain("Egne Hjems vei 5");
    expect(tekst).toContain("Omsorg");
    // formatDistance runder til nærmeste tier: 32,7 m → «30 m unna».
    expect(tekst).toContain("30 m unna");
    expect(tekst).toContain("Undersøkt, ikke bekreftet");
    expect(tekst).toContain("LAV SIKKERHET");
    expect(tekst).toContain("INTERN");
    expect(feature.href).toBe(`/admin/research/${EGNE_HJEMS.id}`);
    expect(feature.linkLabel).toBe("Åpne funnet");
  });

  it("later ikke som et funn uten koordinat kan velges i kartet", () => {
    const utenPunkt = { ...EGNE_HJEMS, latitude: null, longitude: null } as unknown as NearbyResearch;
    expect(internalFeatureFra(utenPunkt)).toBeNull();
    expect(internalFeatures([utenPunkt, EGNE_HJEMS])).toHaveLength(1);
  });
});

describe("markering i kartlaget", () => {
  /** Minimal kartstubbe: laget trenger bare getSource og setFeatureState. */
  function stubMap() {
    const setFeatureState = vi.fn();
    return { map: { getSource: () => ({}), setFeatureState } as unknown as MapLibreMap, setFeatureState };
  }

  it("flytter markeringen til det nye funnet og fjerner den fra det gamle", () => {
    const { map, setFeatureState } = stubMap();
    internalFindingsLayer.setSelected!(map, "nytt", "gammelt");
    expect(setFeatureState).toHaveBeenCalledWith(
      { source: "internal-findings", id: "gammelt" },
      { selected: false },
    );
    expect(setFeatureState).toHaveBeenCalledWith({ source: "internal-findings", id: "nytt" }, { selected: true });
  });

  it("rører ikke det valgte funnet når det velges på nytt", () => {
    const { map, setFeatureState } = stubMap();
    internalFindingsLayer.setSelected!(map, "samme", "samme");
    expect(setFeatureState).toHaveBeenCalledTimes(1);
    expect(setFeatureState).toHaveBeenCalledWith({ source: "internal-findings", id: "samme" }, { selected: true });
  });

  it("fjerner markeringen når ingenting er valgt", () => {
    const { map, setFeatureState } = stubMap();
    internalFindingsLayer.setSelected!(map, null, "gammelt");
    expect(setFeatureState).toHaveBeenCalledTimes(1);
    expect(setFeatureState).toHaveBeenCalledWith(
      { source: "internal-findings", id: "gammelt" },
      { selected: false },
    );
  });

  it("er klikkbart som punktmarkør, så det vinner over eiendomsoppslaget", () => {
    // Uten markerLayerIds ville et klikk på ringen blitt tolket som et klikk i tom kartflate.
    expect(internalFindingsLayer.markerLayerIds).toContain("internal-findings-ring");
    expect(internalFindingsLayer.interactiveLayerIds).toContain("internal-findings-ring");
    expect(internalFindingsLayer.idFromFeature!({ featureId: EGNE_HJEMS.id })).toBe(EGNE_HJEMS.id);
  });
});

describe("kartlaget er gyldig MapLibre-stil", () => {
  /**
   * Et ugyldig paint-uttrykk kaster i MapLibre og river med seg hele kartet, ikke bare laget.
   * Uttrykkene her bruker feature-state, som ikke kan evalueres i node — men de kan valideres
   * mot stil-spesifikasjonen, og det fanger skrivefeil og feil argumenttyper.
   */
  it("har gyldige paint-uttrykk i alle tre lagene", async () => {
    const { validateStyleMin } = await import("@maplibre/maplibre-gl-style-spec");
    const lag: Record<string, unknown>[] = [];
    const fakeMap = {
      addSource: () => {},
      addLayer: (spec: Record<string, unknown>) => lag.push(spec),
    } as unknown as MapLibreMap;

    internalFindingsLayer.mount(fakeMap, internalFeatures([EGNE_HJEMS]));
    expect(lag.map((l) => l.id)).toEqual([
      "internal-findings-halo",
      "internal-findings-ring",
      "internal-findings-core",
    ]);

    const feil = validateStyleMin({
      version: 8,
      sources: { "internal-findings": { type: "geojson", data: { type: "FeatureCollection", features: [] } } },
      layers: lag as never,
    } as never);
    expect(feil.map((f) => `${f.message} (${f.identifier ?? ""})`)).toEqual([]);
  });
});
