import { describe, expect, it } from "vitest";
import {
  addressLabel,
  addressQuerySchema,
  buildAddressHref,
  parseAddressQuery,
  resolveAddressMatch,
} from "@/lib/area-address";
import type { SearchLocation } from "@/lib/geocoding/types";

const address = (label: string, subtitle: string, id = `${label}|${subtitle}`): SearchLocation => ({
  id,
  label,
  subtitle,
  type: "address",
  latitude: 59.93,
  longitude: 10.72,
  municipalityName: "Oslo",
  municipalityNumber: "0301",
});
const place = (label: string): SearchLocation => ({ ...address(label, "Bydel · Oslo"), type: "place" });

describe("/omrade?adresse= — spørringen", () => {
  it("rydder kontrolltegn og mellomrom, og avviser for korte og for lange verdier", () => {
    expect(addressQuerySchema.parse("  Kirkeveien\u000060,\n0368  Oslo ")).toBe("Kirkeveien 60, 0368 Oslo");
    expect(addressQuerySchema.parse(["Kirkeveien 60", "annet"])).toBe("Kirkeveien 60");
    expect(addressQuerySchema.safeParse("ab").success).toBe(false);
    expect(addressQuerySchema.safeParse("a".repeat(101)).success).toBe(false);
    expect(addressQuerySchema.safeParse(undefined).success).toBe(false);
  });

  it("skiller gate og postnummer", () => {
    expect(parseAddressQuery("Kirkeveien 60, 0368 Oslo")).toEqual({ street: "Kirkeveien 60", postalCode: "0368" });
    expect(parseAddressQuery("Storgata 1 B 0155 Oslo")).toEqual({ street: "Storgata 1 B", postalCode: "0155" });
    expect(parseAddressQuery("Fjellveien, 3580 Geilo")).toEqual({ street: "Fjellveien", postalCode: "3580" });
    expect(parseAddressQuery("Kirkeveien 60, Oslo")).toEqual({ street: "Kirkeveien 60", postalCode: null });
  });

  it("leser ikke et firesifret husnummer som postnummer", () => {
    expect(parseAddressQuery("Trondheimsveien 1234")).toEqual({ street: "Trondheimsveien 1234", postalCode: null });
  });
});

describe("/omrade?adresse= — valg av treff", () => {
  it("velger adressen når nøyaktig én passer", () => {
    const riktig = address("Kirkeveien 60", "0368 Oslo · Oslo");
    const treff = resolveAddressMatch("Kirkeveien 60, 0368 Oslo", [place("Kirkeveien"), address("Kirkeveien 60A", "0368 Oslo · Oslo"), riktig]);
    expect(treff).toEqual({ kind: "match", location: riktig });
  });

  it("ser bort fra mellomrom og store bokstaver i husnummeret", () => {
    const riktig = address("Storgata 1B", "0155 Oslo · Oslo");
    expect(resolveAddressMatch("storgata 1 b, 0155 Oslo", [riktig])).toEqual({ kind: "match", location: riktig });
  });

  it("velger ikke når samme adresse finnes flere steder og postnummeret mangler", () => {
    const kandidater = [address("Storgata 1", "0155 Oslo · Oslo"), address("Storgata 1", "9008 Tromsø · Tromsø")];
    expect(resolveAddressMatch("Storgata 1", kandidater)).toEqual({ kind: "candidates", candidates: kandidater });
  });

  it("velger ikke en annen adresse enn den som ble spurt etter", () => {
    const nabo = address("Kirkeveien 62", "0368 Oslo · Oslo");
    expect(resolveAddressMatch("Kirkeveien 60, 0368 Oslo", [nabo])).toEqual({ kind: "candidates", candidates: [nabo] });
    expect(resolveAddressMatch("Kirkeveien 60, 0455 Oslo", [address("Kirkeveien 60", "0368 Oslo · Oslo")]).kind).toBe("candidates");
  });

  it("regner ikke stedsnavn som adresser", () => {
    expect(resolveAddressMatch("Kirkeveien 60", [place("Kirkeveien 60")])).toEqual({ kind: "none" });
    expect(resolveAddressMatch("Kirkeveien 60", [])).toEqual({ kind: "none" });
  });

  it("viser høyst fem kandidater", () => {
    const mange = Array.from({ length: 8 }, (_, i) => address(`Storgata ${i + 2}`, "0155 Oslo · Oslo"));
    const treff = resolveAddressMatch("Storgata 1, 0155 Oslo", mange);
    expect(treff.kind === "candidates" && treff.candidates.length).toBe(5);
  });
});

describe("/omrade?adresse= — lenker og etikett", () => {
  it("bygger etiketten av adresse og poststed", () => {
    expect(addressLabel(address("Kirkeveien 60", "0368 Oslo · Oslo"))).toBe("Kirkeveien 60, 0368 Oslo");
    expect(addressLabel(address("Kirkeveien 60", "Oslo"))).toBe("Kirkeveien 60");
  });

  it("bygger adresselenken", () => {
    expect(buildAddressHref("Kirkeveien 60, 0368 Oslo")).toBe("/omrade?adresse=Kirkeveien+60%2C+0368+Oslo");
  });
});
