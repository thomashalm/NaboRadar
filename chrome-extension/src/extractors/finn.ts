import {
  cleanText,
  hasHouseNumber,
  isCity,
  isAddressLine,
  isPostalCode,
  jsonLdAddresses,
  notFound,
  onlyDistinct,
  parseNorwegianAddress,
  toExtracted,
  type AddressParts,
  type DocumentLike,
  type ElementLike,
  type ExtractedAddress,
} from "../address";

/**
 * Adapter for boligannonser på Finn.no.
 *
 * Rekkefølgen går fra det som er ment for maskiner til det som bare er utseende: JSON-LD,
 * semantiske attributter, `<address>`, adressetekst i tittel og overskrifter, og til slutt
 * CSS-klasser. Hvert trinn svarer bare når det finner nøyaktig én adresse. Ellers går vi videre,
 * og når ingenting er igjen er svaret «fant ikke» — aldri en gjetning.
 */

/** Selve annonsesidene under /realestate/. Søk, kart og forsider er ikke annonser. */
export function isFinnListingUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname !== "finn.no" && !parsed.hostname.endsWith(".finn.no")) return false;
  if (!parsed.pathname.startsWith("/realestate/")) return false;
  if (/\/search(\.html)?$/.test(parsed.pathname)) return false;
  const finnkode = parsed.searchParams.get("finnkode");
  if (finnkode !== null) return /^\d+$/.test(finnkode);
  return /\/ad(\.html)?\/\d+\/?$/.test(parsed.pathname) || /\/\d{6,}\/?$/.test(parsed.pathname);
}

const all = (doc: DocumentLike, selector: string): ElementLike[] => Array.from(doc.querySelectorAll(selector));
const textOf = (el: ElementLike | undefined): string => cleanText(el?.textContent);

function parsedTexts(texts: readonly string[]): AddressParts[] {
  return texts.map(parseNorwegianAddress).filter((p): p is AddressParts => p !== null);
}

function fromJsonLd(doc: DocumentLike): ExtractedAddress | null {
  const found = jsonLdAddresses(doc);
  const address = onlyDistinct(found);
  if (!address) return null;
  return toExtracted(address, "json-ld", found.some((f) => f.onPlace) ? "high" : "medium");
}

function fromSemanticAttributes(doc: DocumentLike): ExtractedAddress | null {
  const marked = parsedTexts(
    all(doc, '[data-testid="object-address"], [data-testid*="address" i], [itemprop="address"]').map(textOf),
  );
  const whole = onlyDistinct(marked);
  if (whole) return toExtracted(whole, "semantic-attribute", "high");

  // Mikrodata i deler. Bare når hver del står nøyaktig én gang — ellers kan de høre til ulike adresser.
  const streets = all(doc, '[itemprop="streetAddress"]').map(textOf);
  const postals = all(doc, '[itemprop="postalCode"]').map(textOf);
  const cities = all(doc, '[itemprop="addressLocality"]').map(textOf);
  const [street] = streets;
  if (streets.length !== 1 || postals.length > 1 || cities.length > 1 || !street || !isAddressLine(street)) return null;
  const [postal = ""] = postals;
  const [city = ""] = cities;
  return toExtracted(
    { addressLine: street, postalCode: isPostalCode(postal) ? postal : null, city: isCity(city) ? city : null },
    "semantic-attribute",
    "high",
  );
}

function fromAddressElement(doc: DocumentLike): ExtractedAddress | null {
  const address = onlyDistinct(parsedTexts(all(doc, "address").map(textOf)));
  return address ? toExtracted(address, "address-element", "medium") : null;
}

/** Tittelen kan være «Storgata 1, 0155 Oslo | FINN eiendom». Hvert ledd prøves for seg. */
const SEGMENT_SEPARATORS = /\s+[|–—·-]\s+|\n/;

function fromTextPattern(doc: DocumentLike): ExtractedAddress | null {
  const texts = [
    ...all(doc, "title, h1, h2").map(textOf),
    ...all(doc, 'meta[property="og:title"], meta[name="twitter:title"]').map((el) => cleanText(el.getAttribute("content"))),
    ...all(doc, 'a[href*="kart"], a[href*="map"]').map(textOf),
  ];
  const segments = texts.flatMap((t) => t.split(SEGMENT_SEPARATORS)).map(cleanText).filter(Boolean);
  // Fritekst må være en hel adresse med husnummer og postnummer for å telle.
  const complete = parsedTexts(segments).filter((p) => p.postalCode && hasHouseNumber(p.addressLine ?? ""));
  const address = onlyDistinct(complete);
  return address ? toExtracted(address, "text-pattern", "medium") : null;
}

function fromCssSelector(doc: DocumentLike): ExtractedAddress | null {
  const address = onlyDistinct(parsedTexts(all(doc, '[class*="address" i], [id*="address" i]').map(textOf)));
  return address ? toExtracted(address, "css-selector", "low") : null;
}

const STRATEGIES = [fromJsonLd, fromSemanticAttributes, fromAddressElement, fromTextPattern, fromCssSelector];

export function extractFinnAddress(doc: DocumentLike, url: string): ExtractedAddress {
  if (!isFinnListingUrl(url)) return notFound("not-listing-page");
  // Et navn uten husnummer er ikke en adresse, men en senere kilde kan ha den. Finnes den ikke,
  // får brukeren se navnet og stedet — uten lenke til NaboRadar.
  let placeOnly: ExtractedAddress | null = null;
  for (const strategy of STRATEGIES) {
    const result = strategy(doc);
    if (result && result.confidence !== "none") return result;
    if (result?.placeName) placeOnly ??= result;
  }
  return placeOnly ?? notFound();
}
