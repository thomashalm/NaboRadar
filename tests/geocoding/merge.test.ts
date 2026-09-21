import { describe, expect, it } from "vitest";
import karlJohan from "../fixtures/kartverket/adresser-karl-johans-gate-1.json";
import majorstuenAddresses from "../fixtures/kartverket/adresser-majorstuen.json";
import sognsvannAddresses from "../fixtures/kartverket/adresser-sognsvann.json";
import majorstuenPlaces from "../fixtures/kartverket/stedsnavn-majorstuen.json";
import osloSPlaces from "../fixtures/kartverket/stedsnavn-oslo-s.json";
import sognsvannPlaces from "../fixtures/kartverket/stedsnavn-sognsvann.json";
import {
  normalizeAddressResponse,
  normalizePlaceResponse,
} from "@/lib/geocoding/kartverket/normalize";
import { mergeGeocodingResults, textRelevance } from "@/lib/geocoding/merge";
import type { ScoredLocation, SearchLocation } from "@/lib/geocoding/types";

function merge(addresses: unknown, places: unknown, query: string, limit = 8) {
  return mergeGeocodingResults(normalizeAddressResponse(addresses), normalizePlaceResponse(places), query, limit);
}

const emptyAddresses = { metadata: { totaltAntallTreff: 0 }, adresser: [] };
const emptyPlaces = { metadata: {}, navn: [] };

describe("rangering med ekte Kartverket-svar", () => {
  it("Sognsvann → innsjøen først, foran Sognsvannsveien-adresser", () => {
    const results = merge(sognsvannAddresses, sognsvannPlaces, "Sognsvann");
    expect(results[0]).toMatchObject({ label: "Sognsvann", subtitle: "Vann · Oslo", type: "place" });
    expect(results.findIndex((r) => r.type === "address")).toBeGreaterThan(0);
  });

  it("Majorstuen → Majorstuen stasjon/tettsted først", () => {
    const results = merge(majorstuenAddresses, majorstuenPlaces, "Majorstuen");
    expect(results[0]?.label).toBe("Majorstuen");
    expect(["Stasjon · Oslo", "Tettsted · Oslo"]).toContain(results[0]?.subtitle);
  });

  it("Oslo S → Oslo sentralstasjon først", () => {
    const results = merge(emptyAddresses, osloSPlaces, "Oslo S");
    expect(results[0]?.label).toBe("Oslo sentralstasjon");
  });

  it("Karl Johans gate 1 → eksakte adresser først, inkludert Oslo", () => {
    const results = merge(karlJohan, emptyPlaces, "Karl Johans gate 1");
    const exact = results.filter((r) => r.label === "Karl Johans gate 1");
    expect(exact.length).toBeGreaterThanOrEqual(3);
    expect(results.slice(0, exact.length).every((r) => r.label === "Karl Johans gate 1")).toBe(true);
    expect(exact.some((r) => r.subtitle === "0154 Oslo · Oslo")).toBe(true);
  });
});

function scored(label: string, type: SearchLocation["type"], boost = 0, lat = 60, lng = 10): ScoredLocation {
  return {
    location: { id: `${type}:${label}:${lat}`, label, subtitle: "", type, latitude: lat, longitude: lng, municipalityName: null, municipalityNumber: null },
    boost,
  };
}

describe("sammenslåingsregler", () => {
  it("adresse vinner over stedsnavn ved lik tekstrelevans", () => {
    const results = mergeGeocodingResults([scored("Storgata 1", "address")], [scored("Storgata 1", "place", 0, 61)], "Storgata 1", 8);
    expect(results.map((r) => r.type)).toEqual(["address", "place"]);
  });

  it("eksakt stedsnavn vinner over adresse som bare starter likt", () => {
    const results = mergeGeocodingResults([scored("Sognsvannsveien 10", "address")], [scored("Sognsvann", "place", 12)], "Sognsvann", 8);
    expect(results[0]?.type).toBe("place");
  });

  it("fjerner duplikater på samme navn og posisjon", () => {
    const results = mergeGeocodingResults([scored("Sted", "address")], [scored("Sted", "place", 0, 60.00001, 10.00001)], "Sted", 8);
    expect(results).toHaveLength(1);
  });

  it("respekterer limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => scored(`Vei ${i}`, "address", 0, 60 + i / 100));
    expect(mergeGeocodingResults(many, [], "Vei", 8)).toHaveLength(8);
  });

  it("textRelevance: eksakt > starter med > ord starter med > annet", () => {
    expect(textRelevance("Sognsvann", "sognsvann")).toBeGreaterThan(textRelevance("Sognsvannsveien", "sognsvann"));
    expect(textRelevance("Sognsvannsveien", "sognsv")).toBeGreaterThan(textRelevance("Nedre Sognsvannsvei", "sognsv"));
    expect(textRelevance("Nedre Sognsvannsvei", "sognsv")).toBeGreaterThan(textRelevance("Kringsjå", "sognsv"));
  });
});
