import type { Position } from "geojson";
import type { NormalizedDocument } from "@/types/document";
import type { EventGeometry, NormalizedEvent } from "@/types/event";

function polygonsOf(geometry: EventGeometry): Position[][][] {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function featureIdOf(event: NormalizedEvent): number {
  const id = (event.rawData as { featureId?: unknown }).featureId;
  return typeof id === "number" ? id : Number.MAX_SAFE_INTEGER;
}

/**
 * Slår sammen fragmenter med samme (providerId, externalId) til ett event.
 *
 * - Geometri: alle polygoner samles i én MultiPolygon (sortert på kildens feature-id → deterministisk)
 * - Skalarfelt: fra fragmentet med nyest sourceUpdatedAt (likt → lavest feature-id)
 * - sourceUpdatedAt: seneste av fragmentene
 * - Dokumenter: union på externalId
 * - rawData: { features: [...] } fra alle fragmentene
 *
 * Grupperer aldri på navn — samme plannavn brukes flere steder i landet.
 */
export function mergeFragments(fragments: NormalizedEvent[]): NormalizedEvent[] {
  const groups = new Map<string, NormalizedEvent[]>();
  for (const fragment of fragments) {
    const key = `${fragment.providerId}\u0000${fragment.externalId}`;
    const group = groups.get(key);
    if (group) group.push(fragment);
    else groups.set(key, [fragment]);
  }

  const merged: NormalizedEvent[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => featureIdOf(a) - featureIdOf(b));

    const primary = sorted.reduce((best, candidate) =>
      (candidate.sourceUpdatedAt ?? "") > (best.sourceUpdatedAt ?? "") ? candidate : best,
    );

    const polygons = sorted.flatMap((f) => polygonsOf(f.geometry));
    const geometry: EventGeometry =
      polygons.length > 0 ? { type: "MultiPolygon", coordinates: polygons } : primary.geometry;

    const documents = new Map<string, NormalizedDocument>();
    for (const fragment of sorted) for (const doc of fragment.documents) documents.set(doc.externalId, doc);

    merged.push({
      ...primary,
      geometry,
      sourceUpdatedAt: sorted.reduce<string | null>(
        (latest, f) => (f.sourceUpdatedAt && (!latest || f.sourceUpdatedAt > latest) ? f.sourceUpdatedAt : latest),
        null,
      ),
      documents: [...documents.values()].sort((a, b) => a.externalId.localeCompare(b.externalId, "en", { numeric: true })),
      rawData: { features: sorted.map((f) => f.rawData) },
    });
  }
  return merged;
}
