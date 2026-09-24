import { describe, expect, it } from "vitest";
import { resolveMapClick, type MapClickHit } from "@/lib/map/click";
import { contaminatedSitesLayer } from "@/lib/map/layers/contaminated-sites";
import { nearbyPlacesLayer } from "@/lib/map/layers/nearby-places";
import { planAreasLayer } from "@/lib/map/layers/plan-areas";

/**
 * Torgveien 15 lå inne i et «Planoppstart»-polygon, og klikk på huset åpnet plansaken
 * i stedet for eiendommen. Flaten dekker hele kvartalet og fanget klikket først.
 */

const plan = (id = "plan-1"): MapClickHit => ({ layerId: "plan-areas-fill", kind: "area", id });
const forurenset = (id = "lok-1"): MapClickHit => ({ layerId: "contaminated-sites-fill", kind: "area", id });
const planPunkt = (id = "plan-2"): MapClickHit => ({ layerId: "plan-points", kind: "marker", id });
const skole = (id = "skole-1"): MapClickHit => ({ layerId: "nearby-places-dot", kind: "marker", id });

describe("klikkprioritet i kartet", () => {
  it("lar eiendommen vinne over planområdet når eiendomsoppslag er aktivt", () => {
    expect(resolveMapClick({ hits: [plan()], propertyLookupActive: true })).toEqual({
      type: "property",
      covering: ["plan-1"],
    });
  });

  it("lar planområdet være klikkflate når eiendomsoppslag ikke er aktivt", () => {
    expect(resolveMapClick({ hits: [plan()], propertyLookupActive: false })).toEqual({
      type: "select",
      id: "plan-1",
    });
  });

  it("gir punktmarkører forrang foran eiendommen", () => {
    // Markøren ligger over flaten i tegnerekkefølgen, slik den gjør i kartet.
    const hits = [skole(), plan()];
    expect(resolveMapClick({ hits, propertyLookupActive: true })).toEqual({ type: "select", id: "skole-1" });
    expect(resolveMapClick({ hits, propertyLookupActive: false })).toEqual({ type: "select", id: "skole-1" });
  });

  it("beholder popup for plansaker uten flate — de er markører, ikke bakgrunn", () => {
    expect(resolveMapClick({ hits: [planPunkt(), plan()], propertyLookupActive: true })).toEqual({
      type: "select",
      id: "plan-2",
    });
  });

  it("slår opp eiendom uten overlapp som før", () => {
    expect(resolveMapClick({ hits: [], propertyLookupActive: true })).toEqual({ type: "property", covering: [] });
  });

  it("fjerner valget ved tomt klikk når eiendomsoppslag ikke er aktivt", () => {
    expect(resolveMapClick({ hits: [], propertyLookupActive: false })).toEqual({ type: "clear" });
  });

  it("tar med alle flatene under punktet, slik at kortet kan lenke til saken", () => {
    const action = resolveMapClick({ hits: [plan(), forurenset(), plan("plan-3")], propertyLookupActive: true });
    expect(action).toEqual({ type: "property", covering: ["plan-1", "lok-1", "plan-3"] });
  });

  it("hopper over objekter laget ikke kjenner igjen", () => {
    const ukjent: MapClickHit = { layerId: "nearby-places-dot", kind: "marker", id: null };
    expect(resolveMapClick({ hits: [ukjent, plan()], propertyLookupActive: false })).toEqual({
      type: "select",
      id: "plan-1",
    });
    expect(resolveMapClick({ hits: [ukjent], propertyLookupActive: false })).toEqual({ type: "clear" });
  });
});

describe("lagene oppgir hva som er markør og hva som er flate", () => {
  it("regner punktlagene som markører", () => {
    expect(nearbyPlacesLayer.markerLayerIds).toEqual(["nearby-places-dot"]);
    // Plansaker uten flate tegnes som punkt og skal fortsatt kunne trykkes.
    expect(planAreasLayer.markerLayerIds).toEqual(["plan-points"]);
  });

  it("regner store flater som bakgrunn", () => {
    expect(planAreasLayer.markerLayerIds).not.toContain("plan-areas-fill");
    expect(contaminatedSitesLayer.markerLayerIds ?? []).toEqual([]);
    // Flatene er fortsatt klikkbare — de taper bare mot eiendom når man er zoomet inn.
    expect(contaminatedSitesLayer.interactiveLayerIds).toContain("contaminated-sites-fill");
  });
});
