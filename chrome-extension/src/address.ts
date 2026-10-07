/**
 * Felles adressetyper og -tolkning for utvidelsen. Ingenting her kjenner Finn — nettstedene har
 * hver sin adapter under `extractors/`.
 *
 * All kode i utvidelsen er offentlig for den som installerer den. Det skal aldri ligge nøkler,
 * interne nettadresser eller annet her som ikke tåler det.
 */

export type AddressConfidence = "high" | "medium" | "low" | "none";

export type AddressSource =
  | "json-ld"
  | "semantic-attribute"
  | "address-element"
  | "text-pattern"
  | "css-selector"
  | "not-listing-page"
  | "none";

export interface ExtractedAddress {
  /** Gate og husnummer: «Storgata 1B». */
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  /** Det som sendes til NaboRadar: «Storgata 1B, 0155 Oslo». */
  fullAddress: string | null;
  /**
   * Et navn som sto der adressen skulle stått, uten husnummer: «Haugsvær Panorama». Vises for
   * seg, sammen med postnummer og sted. Det er ikke en adresse og sendes aldri til NaboRadar.
   */
  placeName: string | null;
  confidence: AddressConfidence;
  source: AddressSource;
}

export const NOT_FOUND_MESSAGE = "Fant ikke adressen automatisk.";
export const NO_STREET_ADDRESS_MESSAGE = "Fant ikke en entydig gateadresse i annonsen.";

/** Det lille av DOM-et ekstraksjonen trenger. Et ekte `Document` oppfyller det. */
export interface ElementLike {
  textContent: string | null;
  getAttribute(name: string): string | null;
}
export interface DocumentLike {
  querySelectorAll(selectors: string): ArrayLike<ElementLike>;
}

export interface AddressParts {
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
}

export function notFound(source: "none" | "not-listing-page" = "none"): ExtractedAddress {
  return {
    addressLine: null,
    postalCode: null,
    city: null,
    fullAddress: null,
    placeName: null,
    confidence: "none",
    source,
  };
}

export function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/[\u0000-\u001f\u007f ]/g, " ").replace(/\s+/g, " ").trim();
}

const LETTER = "A-Za-zÆØÅæøåÉéÈèÜüÖöÄä";
const LINE_OK = new RegExp(`^[${LETTER}0-9][${LETTER}0-9.'’/\\- ]{1,79}$`);
const CITY_OK = new RegExp(`^[${LETTER}][${LETTER}.\\- ]{1,39}$`);

export function isAddressLine(value: string): boolean {
  return LINE_OK.test(value) && new RegExp(`[${LETTER}]{2}`).test(value) && value.split(" ").length <= 7;
}
export function isPostalCode(value: string): boolean {
  return /^\d{4}$/.test(value);
}
export function isCity(value: string): boolean {
  return CITY_OK.test(value) && value.split(" ").length <= 4;
}
/**
 * Slutter linjen med et husnummer? «Storgata 1», «Storgata 12 B», «Storgata 1-3».
 *
 * Uten husnummer kan vi ikke skille en gate fra et prosjektnavn — «Haugsvær Panorama, 5983
 * Haugsvær» har samme form som en adresse. Da er det ikke en gateadresse.
 */
export function hasHouseNumber(addressLine: string): boolean {
  return new RegExp(`[${LETTER}.'’]\\s+[1-9]\\d{0,3}(\\s?[${LETTER}])?(\\s?[-/]\\s?[1-9]\\d{0,3}(\\s?[${LETTER}])?)?$`).test(
    addressLine.trim(),
  );
}

/**
 * Tolker fritekst som en norsk adresse. Hele teksten må være adressen — en adresse midt i en
 * setning godtas ikke, for da vet vi ikke hvor gatenavnet begynner.
 *
 * Godtar «Storgata 1, 0155 Oslo», «Storgata 1 0155 Oslo», «Storgata 1, Oslo» og
 * «Fjellveien, 3580 Geilo». Et postnummer alene er ikke en adresse.
 */
export function parseNorwegianAddress(text: string): AddressParts | null {
  const value = cleanText(text);
  const withPostal =
    /^(.+?)\s*,\s*(\d{4})\s+(\D+)$/.exec(value) ?? /^(.+?\d+\s?[A-Za-z]?)\s+(\d{4})\s+(\D+)$/.exec(value);
  if (withPostal) {
    const [, line = "", postalCode = "", city = ""] = withPostal;
    return isAddressLine(line) && isCity(city) ? { addressLine: line, postalCode, city } : null;
  }
  const withoutPostal = /^(.+?\d+\s?[A-Za-z]?)\s*,\s*(\D+)$/.exec(value);
  if (withoutPostal) {
    const [, line = "", city = ""] = withoutPostal;
    return isAddressLine(line) && isCity(city) ? { addressLine: line, postalCode: null, city } : null;
  }
  return null;
}

export function composeFullAddress(parts: AddressParts): string | null {
  if (!parts.addressLine) return null;
  const place = [parts.postalCode, parts.city].filter(Boolean).join(" ");
  return place ? `${parts.addressLine}, ${place}` : parts.addressLine;
}

const STEP_DOWN: Record<AddressConfidence, AddressConfidence> = {
  high: "medium",
  medium: "low",
  low: "low",
  none: "none",
};

/**
 * Sikkerheten er kildens utgangspunkt, senket ett trinn når postnummer eller poststed mangler.
 *
 * Uten husnummer er det ingen gateadresse: linjen returneres som `placeName`, med
 * sikkerhet «none» og uten `fullAddress`.
 */
export function toExtracted(parts: AddressParts, source: AddressSource, base: AddressConfidence): ExtractedAddress {
  const { addressLine, postalCode, city } = parts;
  if (!addressLine) return notFound();
  if (!hasHouseNumber(addressLine)) return { ...notFound(), postalCode, city, placeName: addressLine, source };
  const confidence = postalCode && city ? base : STEP_DOWN[base];
  return { addressLine, postalCode, city, fullAddress: composeFullAddress(parts), placeName: null, confidence, source };
}

function addressKey(parts: AddressParts): string {
  return [parts.addressLine, parts.postalCode, parts.city]
    .map((p) => (p ?? "").toLocaleLowerCase("nb-NO").replace(/\s+/g, ""))
    .join("|");
}

/**
 * Én kilde kan gi flere adresser — annonsen og meglerkontoret, for eksempel. Er de ulike, vet vi
 * ikke hvilken som er boligen, og da svarer kilden ingenting.
 */
export function onlyDistinct(candidates: readonly AddressParts[]): AddressParts | null {
  const distinct = new Map(candidates.filter((c) => c.addressLine).map((c) => [addressKey(c), c]));
  return distinct.size === 1 ? ([...distinct.values()][0] ?? null) : null;
}

// ---------------------------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------------------------

/** Eiere av en `address` som ikke er boligen: megleren, kontoret, utgiveren. */
const ORGANIZATION_TYPES = new Set([
  "Organization",
  "Corporation",
  "LocalBusiness",
  "RealEstateAgent",
  "Person",
  "Brand",
  "WebSite",
]);
/** Egenskaper som peker bort fra boligen. Vi går ikke inn i dem. */
const SKIPPED_PROPERTIES = new Set(["seller", "broker", "provider", "author", "publisher", "offeredBy", "agent", "brand"]);
/** Eiere der `address` er boligens adresse. */
const PLACE_TYPES = new Set([
  "Place",
  "Accommodation",
  "Residence",
  "House",
  "Apartment",
  "SingleFamilyResidence",
  "ApartmentComplex",
  "RealEstateListing",
]);

export interface JsonLdAddress extends AddressParts {
  /** Sto adressen på en node som er et sted eller en bolig? */
  onPlace: boolean;
}

function typesOf(node: Record<string, unknown>): string[] {
  const type = node["@type"];
  return (Array.isArray(type) ? type : [type]).filter((t): t is string => typeof t === "string");
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? cleanText(String(value)) : "";
}

function fromPostalAddress(value: unknown): AddressParts | null {
  if (typeof value === "string") return parseNorwegianAddress(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const node = value as Record<string, unknown>;
  const street = text(node.streetAddress);
  const postalCode = text(node.postalCode);
  const city = text(node.addressLocality);
  if (!street) return null;
  // Noen legger hele adressen i streetAddress.
  if (!isAddressLine(street)) return parseNorwegianAddress(street);
  return {
    addressLine: street,
    postalCode: isPostalCode(postalCode) ? postalCode : null,
    city: isCity(city) ? city : null,
  };
}

function collectJsonLd(value: unknown, found: JsonLdAddress[], depth: number): void {
  if (depth > 8 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLd(item, found, depth + 1);
    return;
  }
  const node = value as Record<string, unknown>;
  const types = typesOf(node);
  if (types.some((t) => ORGANIZATION_TYPES.has(t))) return;

  if ("address" in node) {
    const parts = fromPostalAddress(node.address);
    if (parts) found.push({ ...parts, onPlace: types.some((t) => PLACE_TYPES.has(t)) });
  }
  for (const [key, child] of Object.entries(node)) {
    if (key === "address" || SKIPPED_PROPERTIES.has(key)) continue;
    collectJsonLd(child, found, depth + 1);
  }
}

/** Adresser i sidens JSON-LD, uten meglerens og utgiverens. Ugyldig JSON hoppes over. */
export function jsonLdAddresses(doc: DocumentLike): JsonLdAddress[] {
  const found: JsonLdAddress[] = [];
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      collectJsonLd(JSON.parse(script.textContent ?? ""), found, 0);
    } catch {
      // Ødelagt JSON-LD er ikke vårt problem — neste kilde får prøve.
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Dyplenke
// ---------------------------------------------------------------------------------------------

/**
 * NaboRadars adressebaserte dyplenke. Kontrakten eies av `lib/area-address.ts` i NaboRadar:
 * `/omrade?adresse=<gate nr, postnr sted>`. Serveren slår opp adressen og gjetter aldri.
 */
export function buildNaboRadarUrl(baseUrl: string, fullAddress: string): string {
  const url = new URL("/omrade", baseUrl);
  url.searchParams.set("adresse", fullAddress);
  return url.toString();
}
