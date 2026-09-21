import { describe, expect, it } from "vitest";
import karlJohan from "../fixtures/kartverket/adresser-karl-johans-gate-1.json";
import sognsvannAddresses from "../fixtures/kartverket/adresser-sognsvann.json";
import majorstuenPlaces from "../fixtures/kartverket/stedsnavn-majorstuen.json";
import osloSPlaces from "../fixtures/kartverket/stedsnavn-oslo-s.json";
import sognsvannPlaces from "../fixtures/kartverket/stedsnavn-sognsvann.json";
import {
  normalizeAddressResponse,
  normalizePlaceResponse,
} from "@/lib/geocoding/kartverket/normalize";
import { toDisplayName } from "@/lib/format";

// Fixtures: ekte svar fra Kartverket, hentet 2026-09-21.

describe("normalisering av adresser", () => {
  it("mapper Karl Johans gate 1 i Oslo til SearchLocation", () => {
    const results = normalizeAddressResponse(karlJohan);
    const oslo = results.find((r) => r.location.municipalityNumber === "0301");
    expect(oslo?.location).toMatchObject({
      label: "Karl Johans gate 1",
      subtitle: "0154 Oslo · Oslo",
      type: "address",
      municipalityName: "Oslo",
      municipalityNumber: "0301",
    });
    expect(oslo?.location.latitude).toBeCloseTo(59.91138, 4);
    expect(oslo?.location.longitude).toBeCloseTo(10.7494, 4);
  });

  it("gir unike id-er", () => {
    const ids = normalizeAddressResponse(sognsvannAddresses).map((r) => r.location.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("kaster ved ugyldig struktur", () => {
    expect(() => normalizeAddressResponse({ foo: 1 })).toThrow();
    expect(() => normalizeAddressResponse("<html>502</html>")).toThrow();
  });

  it("hopper over enkeltadresser uten koordinater eller utenfor Norge", () => {
    const results = normalizeAddressResponse({
      metadata: { totaltAntallTreff: 3 },
      adresser: [
        { adressetekst: "Mangler punkt 1", kommunenummer: "0301", kommunenavn: "OSLO", postnummer: "0150", poststed: "OSLO" },
        {
          adressetekst: "Longyearbyen 1",
          kommunenummer: "2100",
          kommunenavn: "SVALBARD",
          postnummer: "9170",
          poststed: "LONGYEARBYEN",
          representasjonspunkt: { lat: 78.22, lon: 15.65 },
        },
        karlJohan.adresser[2],
      ],
    });
    expect(results.map((r) => r.location.label)).toEqual(["Karl Johans gate 1"]);
  });
});

describe("normalisering av stedsnavn", () => {
  it("mapper Sognsvann (Vann) med norske koordinatnøkler", () => {
    const vann = normalizePlaceResponse(sognsvannPlaces).find((r) => r.location.subtitle.startsWith("Vann"));
    expect(vann?.location).toMatchObject({
      id: "place:308554",
      label: "Sognsvann",
      subtitle: "Vann · Oslo",
      type: "place",
      latitude: 59.97499,
      longitude: 10.72891,
      municipalityNumber: "0301",
    });
    expect(vann!.boost).toBeGreaterThan(0);
  });

  it("gir relevante stedstyper høyere vekt enn andre", () => {
    const results = normalizePlaceResponse(majorstuenPlaces);
    const stasjon = results.find((r) => r.location.subtitle.startsWith("Stasjon"))!;
    const kirke = results.find((r) => r.location.subtitle.startsWith("Kirke"))!;
    expect(stasjon.boost).toBeGreaterThan(kirke.boost);
  });

  it("oversetter tekniske stedstyper til vanlig språk", () => {
    const vei = normalizePlaceResponse(sognsvannPlaces).find((r) => r.location.label === "Sognsvannsveien");
    expect(vei?.location.subtitle).toBe("Gate/vei · Oslo");
  });

  it("gir norsk skrivemåte høyere vekt enn samisk ved samme type", () => {
    const results = normalizePlaceResponse(osloSPlaces);
    const samisk = results.find((r) => r.location.label === "Oslo suohkan")!;
    const stasjon = results.find((r) => r.location.label === "Oslo sentralstasjon")!;
    expect(stasjon.boost).toBeGreaterThan(samisk.boost);
  });

  it("filtrerer bort havområder og offshore-installasjoner", () => {
    const results = normalizePlaceResponse({
      metadata: {},
      navn: [
        { stedsnummer: 1, skrivemåte: "Åsgard B", navneobjekttype: "Oljeinstallasjon", representasjonspunkt: { nord: 65.1, øst: 6.8 } },
        { stedsnummer: 2, skrivemåte: "Åsen", navneobjekttype: "Ås", kommuner: [], representasjonspunkt: { nord: 60.1, øst: 10.1 } },
      ],
    });
    expect(results.map((r) => r.location.label)).toEqual(["Åsen"]);
  });

  it("kaster ved ugyldig struktur", () => {
    expect(() => normalizePlaceResponse({ navn: "feil" })).toThrow();
    expect(() => normalizePlaceResponse(null)).toThrow();
  });
});

describe("toDisplayName", () => {
  it("normaliserer store bokstaver fra Kartverket", () => {
    expect(toDisplayName("OSLO")).toBe("Oslo");
    expect(toDisplayName("AURSKOG-HØLAND")).toBe("Aurskog-Høland");
    expect(toDisplayName("NORDRE FOLLO")).toBe("Nordre Follo");
    expect(toDisplayName("SANDE I VESTFOLD")).toBe("Sande i Vestfold");
    expect(toDisplayName("Oslo")).toBe("Oslo");
  });
});
