import { createHash } from "node:crypto";
import type { NormalizedEvent } from "@/types/event";

/** JSON med sorterte nøkler — samme innhold gir alltid samme streng. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/**
 * sha256 av stabil JSON. Kalleren er ansvarlig for at innholdet kun inneholder kildedata —
 * lokale felt (synced_at, id, removed_from_source_at) skal aldri være med, ellers ville
 * hver sync gitt «updated».
 */
export function hashContent(content: unknown): string {
  return createHash("sha256").update(stableStringify(content)).digest("hex");
}

/**
 * Hash av relevant kildeinnhold i et normalisert event.
 * NormalizedEvent inneholder bare kildeavledede felt, så modellen kan ikke inneholde lokale felt.
 */
export function contentHash(event: NormalizedEvent): string {
  return hashContent({
    v: 1,
    type: event.type,
    title: event.title,
    geometry: event.geometry,
    municipalityNumber: event.municipalityNumber,
    municipalityName: event.municipalityName,
    announcedAt: event.announcedAt,
    sourceUpdatedAt: event.sourceUpdatedAt,
    sourceUrl: event.sourceUrl,
    sourceUrlType: event.sourceUrlType,
    attributes: event.attributes,
    documents: [...event.documents].sort((a, b) => a.externalId.localeCompare(b.externalId)),
    rawData: event.rawData,
  });
}
