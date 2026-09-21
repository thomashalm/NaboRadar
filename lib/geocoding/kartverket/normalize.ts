import { isWithinNorway } from "@/lib/area-params";
import { toDisplayName } from "@/lib/format";
import type { ScoredLocation } from "../types";
import {
  kartverketAddressResponseSchema,
  kartverketAddressSchema,
  kartverketPlaceResponseSchema,
  kartverketPlaceSchema,
} from "./schemas";

/** Stedstyper som ofte er det folk mener når de søker på et sted. */
const RELEVANT_PLACE_TYPES = new Set([
  "By",
  "Tettsted",
  "Tettbebyggelse",
  "Bydel",
  "Boligfelt",
  "Grend",
  "Bygdelag (bygd)",
  "Stasjon",
  "Holdeplass",
  "Vann",
  "Innsjø",
  "Park",
  "Friluftsområde",
  "Kommune",
  "Øy",
]);

/** Stedstyper som ikke gir mening som «rundt en adresse». */
const EXCLUDED_PLACE_TYPES = new Set([
  "Havområde",
  "Oljeinstallasjon",
  "Gass-/oljefelt i sjø",
  "Fiskeplass i sjø",
  "Grunne i sjø",
  "Skjær",
]);

/** Visningsnavn for stedstyper der Kartverkets betegnelse er teknisk. */
const PLACE_TYPE_LABELS: Record<string, string> = {
  Adressenavn: "Gate/vei",
  Tettbebyggelse: "Tettsted",
  Vegstrekning: "Vei",
  "Annen kulturdetalj": "Sted",
  "Bygdelag (bygd)": "Bygd",
};

function joinParts(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(" · ");
}

/** Validerer et Adresse-API-svar. Kaster ved ugyldig struktur; enkeltadresser som ikke validerer hoppes over. */
export function normalizeAddressResponse(data: unknown): ScoredLocation[] {
  const response = kartverketAddressResponseSchema.parse(data);
  const results: ScoredLocation[] = [];

  for (const raw of response.adresser) {
    const parsed = kartverketAddressSchema.safeParse(raw);
    if (!parsed.success) continue;
    const a = parsed.data;
    const { lat, lon } = a.representasjonspunkt;
    if (!isWithinNorway(lat, lon)) continue;

    const municipality = a.kommunenavn ? toDisplayName(a.kommunenavn) : null;
    const postal = [a.postnummer, a.poststed ? toDisplayName(a.poststed) : null]
      .filter(Boolean)
      .join(" ");

    results.push({
      location: {
        id: `address:${a.kommunenummer ?? "x"}-${a.adressekode ?? "x"}-${a.nummer ?? "x"}${a.bokstav ?? ""}-${lat.toFixed(5)},${lon.toFixed(5)}`,
        label: a.adressetekst,
        subtitle: joinParts([postal, municipality]),
        type: "address",
        latitude: lat,
        longitude: lon,
        municipalityName: municipality,
        municipalityNumber: a.kommunenummer,
      },
      boost: 0,
    });
  }
  return results;
}

/** Validerer et Stedsnavn-API-svar. Kaster ved ugyldig struktur; enkeltnavn som ikke validerer hoppes over. */
export function normalizePlaceResponse(data: unknown): ScoredLocation[] {
  const response = kartverketPlaceResponseSchema.parse(data);
  const results: ScoredLocation[] = [];

  for (const raw of response.navn) {
    const parsed = kartverketPlaceSchema.safeParse(raw);
    if (!parsed.success) continue;
    const p = parsed.data;
    const type = p.navneobjekttype ?? "";
    if (EXCLUDED_PLACE_TYPES.has(type)) continue;

    const { nord: lat, øst: lon } = p.representasjonspunkt;
    if (!isWithinNorway(lat, lon)) continue;

    const municipalities = (p.kommuner ?? []).map((k) => toDisplayName(k.kommunenavn));
    const first = p.kommuner?.[0];

    results.push({
      location: {
        id: `place:${p.stedsnummer}`,
        label: p.skrivemåte,
        subtitle: joinParts([PLACE_TYPE_LABELS[type] ?? type, municipalities.join(", ")]),
        type: "place",
        latitude: lat,
        longitude: lon,
        municipalityName: first ? toDisplayName(first.kommunenavn) : null,
        municipalityNumber: first?.kommunenummer ?? null,
      },
      boost: (RELEVANT_PLACE_TYPES.has(type) ? 10 : 0) + (p.språk === "Norsk" ? 2 : 0),
    });
  }
  return results;
}
