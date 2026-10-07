import { z } from "zod";
import type { SearchLocation } from "@/lib/geocoding/types";

/**
 * Adressebasert dyplenke: `/omrade?adresse=Kirkeveien 60, 0368 Oslo`.
 *
 * Den vanlige resultat-URL-en krever koordinater, og det har ikke den som bare kjenner en adresse —
 * en nettleserutvidelse, delingsarket på iOS, en lenke i en e-post. Denne kontrakten lar dem sende
 * adressen som tekst. Serveren slår den opp i Kartverkets adresseregister og sender brukeren videre
 * til den kanoniske `/omrade?lat=…&lng=…&label=…`.
 *
 * Regelen er den samme som ellers: vi gjetter ikke. Videresending skjer bare når nøyaktig én
 * registrert adresse passer. Ellers får brukeren velge blant kandidatene, eller søke selv.
 */

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

export const ADDRESS_QUERY_MIN = 3;
export const ADDRESS_QUERY_MAX = 100;

export const addressQuerySchema = z.preprocess(
  firstValue,
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(ADDRESS_QUERY_MIN).max(ADDRESS_QUERY_MAX)),
);

export interface ParsedAddressQuery {
  /** Gate og husnummer, slik de sto i søket: «Kirkeveien 60». */
  street: string;
  postalCode: string | null;
}

/**
 * Deler «Kirkeveien 60, 0368 Oslo» i gatedel og postnummer. Poststedet trengs ikke for å matche.
 *
 * Fire sifre er bare et postnummer når de står etter et husnummer eller etter et komma — ellers
 * ville husnummeret i «Trondheimsveien 1234» blitt lest som postnummer.
 */
export function parseAddressQuery(query: string): ParsedAddressQuery {
  const match =
    /^(.*?\d+\s*[a-zæøå]?)\s*,?\s+(\d{4})(?:\s+\D.*)?$/i.exec(query) ?? /^([^,]+),\s*(\d{4})(?:\s+\D.*)?$/.exec(query);
  if (match?.[1] && match[2]) return { street: match[1].trim(), postalCode: match[2] };
  return { street: (query.split(",")[0] ?? query).trim(), postalCode: null };
}

/** «Storgata 1 B» og «storgata 1b» er samme adresse. */
export function normalizeStreet(value: string): string {
  return value
    .toLocaleLowerCase("nb-NO")
    .replace(/[.,]/g, " ")
    .replace(/(\d)\s+([a-zæøå])(?=$|\s)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

export type AddressMatch =
  | { kind: "match"; location: SearchLocation }
  | { kind: "candidates"; candidates: SearchLocation[] }
  | { kind: "none" };

const MAX_CANDIDATES = 5;

/**
 * Velger adressen søket peker på — hvis det bare er én.
 *
 * Stedsnavn regnes ikke med: lenken lover en adresse, og «Storgata» som stedsnavn er noe annet.
 */
export function resolveAddressMatch(query: string, results: readonly SearchLocation[]): AddressMatch {
  const addresses = results.filter((r) => r.type === "address");
  if (addresses.length === 0) return { kind: "none" };

  const { street, postalCode } = parseAddressQuery(query);
  const wanted = normalizeStreet(street);
  const exact = addresses.filter(
    (a) => normalizeStreet(a.label) === wanted && (postalCode === null || a.subtitle.startsWith(postalCode)),
  );

  const [only] = exact;
  if (exact.length === 1 && only) return { kind: "match", location: only };
  return { kind: "candidates", candidates: (exact.length > 1 ? exact : addresses).slice(0, MAX_CANDIDATES) };
}

/** Teksten resultatsiden viser som stedsnavn: «Kirkeveien 60, 0368 Oslo». */
export function addressLabel(location: SearchLocation): string {
  const postal = /^\d{4} [^·]+/.exec(location.subtitle)?.[0].trim();
  return postal ? `${location.label}, ${postal}` : location.label;
}

/** Lenken andre flater bygger. Holdes her, så kontrakten har ett hjem. */
export function buildAddressHref(address: string): string {
  return `/omrade?${new URLSearchParams({ adresse: address }).toString()}`;
}
