import { describe, expect, it } from "vitest";
import { buildNaboRadarUrl, hasHouseNumber, parseNorwegianAddress } from "@/chrome-extension/src/address";
import { extractFinnAddress, isFinnListingUrl } from "@/chrome-extension/src/extractors/finn";
import { parseHtml } from "../helpers/mini-dom";

/**
 * Fixturene er skrevet for hånd og viser formene en adresse kan ha i en side. De er ikke kopier av
 * Finn-annonser: utvidelsen leser bare siden brukeren selv har åpen, og testene henter aldri noe
 * fra Finn. Om Finn faktisk bruker en av formene, avgjøres i nettleseren (se README).
 */
const LISTING = "https://www.finn.no/realestate/homes/ad.html?finnkode=123456789";

const page = (head: string, body: string) => parseHtml(`<html><head>${head}</head><body>${body}</body></html>`);
const jsonLd = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

const RESIDENCE = {
  "@context": "https://schema.org",
  "@type": "SingleFamilyResidence",
  address: { "@type": "PostalAddress", streetAddress: "Eksempelveien 12B", postalCode: "0368", addressLocality: "Oslo" },
};
const BROKER = {
  "@type": "RealEstateAgent",
  name: "Eksempelmegler AS",
  address: { "@type": "PostalAddress", streetAddress: "Kontorgata 1", postalCode: "0150", addressLocality: "Oslo" },
};

describe("extractFinnAddress", () => {
  it("leser adressen fra JSON-LD", () => {
    expect(extractFinnAddress(page(jsonLd(RESIDENCE), "<h1>Lys treroms</h1>"), LISTING)).toEqual({
      addressLine: "Eksempelveien 12B",
      postalCode: "0368",
      city: "Oslo",
      fullAddress: "Eksempelveien 12B, 0368 Oslo",
      placeName: null,
      confidence: "high",
      source: "json-ld",
    });
  });

  it("finner JSON-LD i @graph og hopper over meglerens adresse", () => {
    const doc = page(jsonLd({ "@graph": [BROKER, { "@type": "Offer", seller: BROKER, itemOffered: RESIDENCE }] }), "");
    expect(extractFinnAddress(doc, LISTING)).toMatchObject({ fullAddress: "Eksempelveien 12B, 0368 Oslo", source: "json-ld" });
  });

  it("tar ikke meglerens adresse når den er den eneste i siden", () => {
    expect(extractFinnAddress(page(jsonLd(BROKER), "<h1>Lys treroms</h1>"), LISTING)).toMatchObject({
      fullAddress: null,
      confidence: "none",
    });
  });

  it("leser adressen fra et merket felt i DOM-en når JSON-LD mangler", () => {
    const doc = page("", '<h1>Lys treroms</h1><span data-testid="object-address">Eksempelveien 12 B, 0368 Oslo</span>');
    expect(extractFinnAddress(doc, LISTING)).toMatchObject({
      addressLine: "Eksempelveien 12 B",
      postalCode: "0368",
      city: "Oslo",
      confidence: "high",
      source: "semantic-attribute",
    });
  });

  it("setter sammen mikrodata i deler", () => {
    const doc = page(
      "",
      '<div><span itemprop="streetAddress">Eksempelveien 12</span> <span itemprop="postalCode">0368</span> <span itemprop="addressLocality">Oslo</span></div>',
    );
    expect(extractFinnAddress(doc, LISTING)).toMatchObject({ fullAddress: "Eksempelveien 12, 0368 Oslo", source: "semantic-attribute" });
  });

  it("foretrekker JSON-LD når både JSON-LD og DOM har adressen", () => {
    const doc = page(jsonLd(RESIDENCE), '<span data-testid="object-address">Eksempelveien 12B, 0368 Oslo</span>');
    expect(extractFinnAddress(doc, LISTING).source).toBe("json-ld");
  });

  it("senker sikkerheten når postnummeret mangler", () => {
    const utenPostnummer = { ...RESIDENCE, address: { "@type": "PostalAddress", streetAddress: "Eksempelveien 12B" } };
    expect(extractFinnAddress(page(jsonLd(utenPostnummer), ""), LISTING)).toEqual({
      addressLine: "Eksempelveien 12B",
      postalCode: null,
      city: null,
      fullAddress: "Eksempelveien 12B",
      placeName: null,
      confidence: "medium",
      source: "json-ld",
    });
  });

  it("svarer «fant ikke» når siden ikke har noen adresse", () => {
    const doc = page("<title>Lys treroms | FINN eiendom</title>", "<h1>Lys treroms</h1><p>Ta kontakt med megler for adresse. 0368 Oslo</p>");
    expect(extractFinnAddress(doc, LISTING)).toEqual({
      addressLine: null,
      postalCode: null,
      city: null,
      fullAddress: null,
      placeName: null,
      confidence: "none",
      source: "none",
    });
  });

  it("leser ikke sider som ikke er boligannonser", () => {
    const doc = page(jsonLd(RESIDENCE), "");
    for (const url of [
      "https://www.finn.no/realestate/homes/search.html?location=0.20061",
      "https://www.finn.no/car/used/ad.html?finnkode=123456789",
      "https://www.finn.no/",
      "https://finn.no.example.com/realestate/homes/ad.html?finnkode=123456789",
      "ikke en url",
    ]) {
      expect(extractFinnAddress(doc, url)).toMatchObject({ fullAddress: null, source: "not-listing-page" });
    }
  });

  it("faller tilbake til <address>, så tittelen, så CSS-klassen", () => {
    expect(extractFinnAddress(page("", "<address>Eksempelveien 12, 0368 Oslo</address>"), LISTING)).toMatchObject({
      source: "address-element",
      confidence: "medium",
    });
    expect(
      extractFinnAddress(page("<title>Eksempelveien 12, 0368 Oslo | FINN eiendom</title>", "<h1>Lys treroms</h1>"), LISTING),
    ).toMatchObject({ fullAddress: "Eksempelveien 12, 0368 Oslo", source: "text-pattern", confidence: "medium" });
    expect(
      extractFinnAddress(page("", '<div class="AdAddress__line">Eksempelveien 12, 0368 Oslo</div>'), LISTING),
    ).toMatchObject({ source: "css-selector", confidence: "low" });
  });

  it("kaller ikke et prosjektnavn med postnummer og sted for en gateadresse", () => {
    const forventet = {
      addressLine: null,
      postalCode: "5983",
      city: "Haugsvær",
      fullAddress: null,
      placeName: "Haugsvær Panorama",
      confidence: "none",
    };
    const prosjekt = { "@type": "Place", address: { "@type": "PostalAddress", streetAddress: "Haugsvær Panorama", postalCode: "5983", addressLocality: "Haugsvær" } };
    for (const doc of [
      page("", '<span data-testid="object-address">Haugsvær Panorama, 5983 Haugsvær</span>'),
      page(jsonLd(prosjekt), ""),
      page("", "<address>Haugsvær Panorama, 5983 Haugsvær</address>"),
      page("", '<div class="address">Haugsvær Panorama, 5983 Haugsvær</div>'),
    ]) {
      expect(extractFinnAddress(doc, "https://www.finn.no/realestate/project/ad.html?finnkode=123456789")).toMatchObject(forventet);
    }
    // Tittelen alene gir ikke engang et navn: fritekst må være en hel adresse.
    expect(extractFinnAddress(page("<title>Haugsvær Panorama, 5983 Haugsvær | FINN</title>", ""), LISTING)).toMatchObject({
      fullAddress: null,
      placeName: null,
    });
  });

  it("finner gateadressen i en senere kilde når den første bare har et prosjektnavn", () => {
    const doc = page("", '<span data-testid="object-address">Eksempel Panorama, 0368 Oslo</span><address>Eksempelveien 12, 0368 Oslo</address>');
    expect(extractFinnAddress(doc, LISTING)).toMatchObject({ fullAddress: "Eksempelveien 12, 0368 Oslo", placeName: null, source: "address-element" });
  });

  it("velger ikke mellom to ulike adresser i samme kilde", () => {
    const doc = page("", "<address>Eksempelveien 12, 0368 Oslo</address><address>Kontorgata 1, 0150 Oslo</address>");
    expect(extractFinnAddress(doc, LISTING).confidence).toBe("none");
  });

  it("tåler ødelagt JSON-LD og går videre til neste kilde", () => {
    const doc = page('<script type="application/ld+json">{ ikke json</script>', "<address>Eksempelveien 12, 0368 Oslo</address>");
    expect(extractFinnAddress(doc, LISTING).source).toBe("address-element");
  });
});

describe("isFinnListingUrl", () => {
  it("kjenner igjen annonsesider under /realestate/", () => {
    expect(isFinnListingUrl("https://www.finn.no/realestate/homes/ad.html?finnkode=123456789")).toBe(true);
    expect(isFinnListingUrl("https://www.finn.no/realestate/leisuresale/ad.html?finnkode=123456789")).toBe(true);
    expect(isFinnListingUrl("https://www.finn.no/realestate/homes/ad/123456789")).toBe(true);
    expect(isFinnListingUrl("http://www.finn.no/realestate/homes/ad.html?finnkode=123456789")).toBe(false);
    expect(isFinnListingUrl("https://www.finn.no/realestate/homes/ad.html?finnkode=abc")).toBe(false);
  });
});

describe("parseNorwegianAddress", () => {
  it("tolker vanlige skrivemåter", () => {
    expect(parseNorwegianAddress("Øvre Eksempelgate 3 A,  5003  Bergen")).toEqual({ addressLine: "Øvre Eksempelgate 3 A", postalCode: "5003", city: "Bergen" });
    expect(parseNorwegianAddress("Eksempelveien 12 0368 Oslo")).toEqual({ addressLine: "Eksempelveien 12", postalCode: "0368", city: "Oslo" });
    expect(parseNorwegianAddress("Eksempelveien 12, Oslo")).toEqual({ addressLine: "Eksempelveien 12", postalCode: null, city: "Oslo" });
    expect(parseNorwegianAddress("Fjellveien, 3580 Geilo")).toEqual({ addressLine: "Fjellveien", postalCode: "3580", city: "Geilo" });
  });

  it("avviser tekst som ikke er en adresse", () => {
    for (const text of ["0368 Oslo", "Oslo", "Lys treroms med balkong", "Prisantydning: 4 500 000 kr, 0368 Oslo", ""]) {
      expect(parseNorwegianAddress(text)).toBeNull();
    }
  });
});

describe("hasHouseNumber", () => {
  it("krever et husnummer til slutt i linjen", () => {
    for (const line of ["Storgata 1", "Storgata 12B", "Øvre Eksempelgate 3 A", "Storgata 1-3", "St. Olavs gate 21"]) {
      expect(hasHouseNumber(line), line).toBe(true);
    }
    for (const line of ["Haugsvær Panorama", "Fjellveien", "Felt B2 Panorama", "Storgata 0", "Trinn 2 Panorama", "12345"]) {
      expect(hasHouseNumber(line), line).toBe(false);
    }
  });
});

describe("buildNaboRadarUrl", () => {
  it("bygger adresselenken med trygg koding", () => {
    expect(buildNaboRadarUrl("https://naboradar.no", "Øvre Eksempelgate 3A, 5003 Bergen")).toBe(
      "https://naboradar.no/omrade?adresse=%C3%98vre+Eksempelgate+3A%2C+5003+Bergen",
    );
  });
});
