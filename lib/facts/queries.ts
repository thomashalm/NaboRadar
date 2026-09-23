import { z } from "zod";
import { TtlCache } from "@/lib/cache";
import { getDbMode, getReadDb } from "@/lib/db";
import { formatDistance, formatRadius } from "@/lib/format";
import {
  AREA_CATEGORIES,
  AREA_CATEGORY_LABELS,
  type AreaCategory,
  type AreaFact,
  type AreaFeatureHit,
} from "@/types/area-feature";
import { areaLookups } from "./lookups";
import type { LookupHit } from "./lookups/types";
import { describeContaminatedSummary, describeFact, linkLabelFor, SOURCES, type SourceInfo } from "./wording";

/**
 * Setter sammen «Hva bør du vite om området?»:
 *  1. synkede fakta fra PostGIS (features_near)
 *  2. direkte oppslag mot kilder som er for store til synk (lib/facts/lookups)
 *
 * All tekst hentes fra formuleringsregisteret. Er en kilde nede, vises resten.
 */

const rowSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  category: z.enum(AREA_CATEGORIES),
  subtype: z.string(),
  title: z.string(),
  distance_m: z.number(),
  contains: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  source_url: z.string().nullable(),
  source_url_type: z.enum(["provider_page", "factsheet", "report"]).nullable(),
  source_updated_at: z.string().nullable(),
});

export interface AreaFactGroup {
  category: AreaCategory;
  label: string;
  facts: AreaFact[];
}

export type AreaFactsResult =
  | {
      status: "ok";
      groups: AreaFactGroup[];
      sources: SourceInfo[];
      /** Kilder som ikke svarte. Vises som en nøytral merknad. */
      unavailableSources: string[];
    }
  | { status: "unavailable"; devReason: string };

/** Direkte oppslag caches kort, slik at bytte av radius ikke gir nye kall mot kildene. */
const lookupCache = new TtlCache<LookupResult[]>(5 * 60 * 1000, 200);
const LOOKUP_BUDGET_MS = 8_000;

interface LookupResult {
  lookupId: string;
  category: AreaCategory;
  hits: LookupHit[];
}

function distanceLabel(distanceM: number | null, contains: boolean): string {
  if (contains) return "Ved søkepunktet";
  return distanceM === null ? "I området" : formatDistance(distanceM);
}

function sourceDateLabel(sourceUpdatedAt: string | null): string | null {
  if (!sourceUpdatedAt) return null;
  const year = new Date(sourceUpdatedAt).getUTCFullYear();
  return Number.isFinite(year) ? `Kildedata oppdatert ${year}` : null;
}

function toFact(input: {
  id: string;
  providerId: string;
  category: AreaCategory;
  subtype: string;
  title: string;
  attributes: AreaFeatureHit["attributes"];
  distanceM: number | null;
  contains: boolean;
  sourceUrl: string | null;
  sourceUrlType: AreaFeatureHit["sourceUrlType"];
  sourceUpdatedAt: string | null;
}): AreaFact | null {
  const text = describeFact({
    subtype: input.subtype,
    title: input.title,
    attributes: input.attributes,
    contains: input.contains,
  });
  if (!text) return null;
  const source = SOURCES[input.providerId];
  return {
    id: input.id,
    category: input.category,
    subtype: input.subtype,
    headline: text.headline,
    details: text.details,
    caveat: text.caveat,
    distanceLabel: distanceLabel(input.distanceM, input.contains),
    distanceM: input.distanceM,
    contains: input.contains,
    sourceName: source ? `${source.name} (${source.owner})` : input.providerId,
    sourceDateLabel: sourceDateLabel(input.sourceUpdatedAt),
    link: input.sourceUrl
      ? { href: input.sourceUrl, label: linkLabelFor(input.sourceUrlType, input.providerId) }
      : null,
  };
}

/** Forurenset grunn er svært tett i byer: én oppsummering + de mest relevante lokalitetene. */
function summarizeContaminated(hits: z.infer<typeof rowSchema>[], radiusM: number): AreaFact[] {
  if (hits.length === 0) return [];
  const order = ["ikkeAkseptabelForurensning", "ukjentPåvirkning", "akseptabelForurensning", "liteForurensning"];
  const counts = new Map<string, number>();
  for (const hit of hits) {
    const grade = typeof hit.attributes.paavirkningsgrad === "string" ? hit.attributes.paavirkningsgrad : "ukjentPåvirkning";
    counts.set(grade, (counts.get(grade) ?? 0) + 1);
  }

  const summaryText = describeContaminatedSummary({
    total: hits.length,
    byGrade: order.map((grade) => ({ grade, count: counts.get(grade) ?? 0 })),
    radiusLabel: formatRadius(radiusM),
  });
  const source = SOURCES["mdir-forurenset-grunn"]!;
  const summary: AreaFact = {
    id: "forurenset-grunn-summary",
    category: "miljo",
    subtype: "forurenset_grunn_summary",
    headline: summaryText.headline,
    details: summaryText.details,
    caveat: summaryText.caveat,
    distanceLabel: "",
    distanceM: null,
    contains: hits.some((h) => h.contains),
    sourceName: `${source.name} (${source.owner})`,
    sourceDateLabel: null,
    link: null,
  };

  // Fremhev bare lokaliteter der kilden sier at tiltak trengs, eller at forholdet er uavklart.
  const highlighted = hits
    .filter((h) => h.attributes.paavirkningsgrad === "ikkeAkseptabelForurensning" || h.contains)
    .slice(0, 3)
    .flatMap((h) => {
      const fact = toFact({
        id: h.id,
        providerId: h.provider_id,
        category: h.category,
        subtype: h.subtype,
        title: h.title,
        attributes: h.attributes,
        distanceM: h.distance_m,
        contains: h.contains,
        sourceUrl: h.source_url,
        sourceUrlType: h.source_url_type,
        sourceUpdatedAt: h.source_updated_at,
      });
      return fact ? [fact] : [];
    });

  return [summary, ...highlighted];
}

async function runLookups(lat: number, lng: number, radiusM: number): Promise<{ results: LookupResult[]; failed: string[] }> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${radiusM}`;
  const cached = lookupCache.get(key);
  if (cached) return { results: cached, failed: [] };

  const signal = AbortSignal.timeout(LOOKUP_BUDGET_MS);
  const settled = await Promise.allSettled(
    areaLookups.map(async (lookup) => ({
      lookupId: lookup.id,
      category: lookup.category,
      hits: await lookup.run({ lat, lng, radiusM, signal }),
    })),
  );

  const results: LookupResult[] = [];
  const failed: string[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") results.push(outcome.value);
    else {
      const lookup = areaLookups[index]!;
      failed.push(lookup.id);
      console.warn(`[facts] ${lookup.id} svarte ikke: ${outcome.reason instanceof Error ? outcome.reason.name : "ukjent"}`);
    }
  });

  // Bare komplette resultater caches.
  if (failed.length === 0) lookupCache.set(key, results);
  return { results, failed };
}

export async function getAreaFacts(params: { lat: number; lng: number; radius: number }): Promise<AreaFactsResult> {
  const { lat, lng, radius } = params;
  let rows: z.infer<typeof rowSchema>[] = [];
  let dbFailed: string | null = null;

  try {
    const db = await getReadDb();
    if (!db) throw new Error("ingen database");
    const raw = await db.rpc<unknown>("features_near", { lat, lng, radius_m: radius });
    rows = z.array(rowSchema).parse(raw);
  } catch (error) {
    dbFailed =
      getDbMode() === "none"
        ? "Ingen database konfigurert."
        : error instanceof Error
          ? `${error.name}: ${error.message}`.slice(0, 300)
          : "Ukjent feil";
    console.error("[facts] databasefeil:", dbFailed);
  }

  const { results: lookupResults, failed } = await runLookups(lat, lng, radius);
  if (dbFailed && lookupResults.length === 0) return { status: "unavailable", devReason: dbFailed };

  const facts: AreaFact[] = [];
  const usedSources = new Set<string>();

  // Samme objekt kan ligge som flere rader (oppdelte soner, kraftledninger i segmenter).
  // Vis ett faktum per (kilde, type, navn) — det nærmeste.
  const nearestRows = new Map<string, z.infer<typeof rowSchema>>();
  for (const row of rows) {
    if (row.subtype === "forurenset_grunn") continue;
    const key = `${row.provider_id}|${row.subtype}|${row.title}`;
    const current = nearestRows.get(key);
    if (!current || Number(row.contains) > Number(current.contains) || row.distance_m < current.distance_m) {
      nearestRows.set(key, row);
    }
  }

  const contaminated = rows.filter((r) => r.subtype === "forurenset_grunn");
  if (contaminated.length > 0) {
    facts.push(...summarizeContaminated(contaminated, radius));
    usedSources.add("mdir-forurenset-grunn");
  }

  for (const row of nearestRows.values()) {
    const fact = toFact({
      id: row.id,
      providerId: row.provider_id,
      category: row.category,
      subtype: row.subtype,
      title: row.title,
      attributes: row.attributes,
      distanceM: row.distance_m,
      contains: row.contains,
      sourceUrl: row.source_url,
      sourceUrlType: row.source_url_type,
      sourceUpdatedAt: row.source_updated_at,
    });
    if (!fact) continue;
    facts.push(fact);
    usedSources.add(row.provider_id);
  }

  for (const result of lookupResults) {
    for (const hit of result.hits) {
      const fact = toFact({
        id: `${result.lookupId}:${hit.subtype}`,
        providerId: result.lookupId,
        category: result.category,
        subtype: hit.subtype,
        title: hit.title,
        attributes: hit.attributes,
        distanceM: hit.distanceM,
        contains: hit.contains,
        sourceUrl: hit.sourceUrl ?? null,
        sourceUrlType: null,
        sourceUpdatedAt: hit.sourceUpdatedAt ?? null,
      });
      if (!fact) continue;
      facts.push(fact);
      usedSources.add(result.lookupId);
    }
  }

  const groups: AreaFactGroup[] = AREA_CATEGORIES.map((category) => ({
    category,
    label: AREA_CATEGORY_LABELS[category],
    facts: facts
      .filter((f) => f.category === category)
      .sort((a, b) => Number(b.contains) - Number(a.contains) || (a.distanceM ?? 0) - (b.distanceM ?? 0)),
  })).filter((group) => group.facts.length > 0);

  const unavailable = [...failed, ...(dbFailed ? ["database"] : [])]
    .map((id) => SOURCES[id]?.name ?? (id === "database" ? "lagrede kilder" : id))
    .filter((name, index, all) => all.indexOf(name) === index);

  return {
    status: "ok",
    groups,
    sources: [...usedSources].flatMap((id) => (SOURCES[id] ? [SOURCES[id]] : [])),
    unavailableSources: unavailable,
  };
}
