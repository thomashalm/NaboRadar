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
  type AreaGeometry,
} from "@/types/area-feature";
import { areaLookups } from "./lookups";
import type { LookupHit } from "./lookups/types";
import {
  describeContaminatedSummary,
  describeFact,
  linkLabelFor,
  PAAVIRKNINGSGRAD_SHORT,
  SOURCES,
  type SourceInfo,
} from "./wording";

/**
 * Setter sammen «Hva bør du vite om området?»:
 *  1. synkede fakta fra PostGIS (features_near)
 *  2. direkte oppslag mot kilder som er for store til synk (lib/facts/lookups)
 *
 * All tekst hentes fra formuleringsregisteret. Er en kilde nede, vises resten.
 */

/** Geometrien fra features_near. Struktur valideres, innhold ikke. */
const geometrySchema = z
  .object({
    type: z.enum(["Point", "Polygon", "MultiPolygon", "LineString", "MultiLineString"]),
    coordinates: z.array(z.unknown()).min(1),
  })
  .transform((g) => g as unknown as AreaGeometry);

const rowSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  external_id: z.string(),
  category: z.enum(AREA_CATEGORIES),
  subtype: z.string(),
  title: z.string(),
  distance_m: z.number(),
  contains: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  source_url: z.string().nullable(),
  source_url_type: z.enum(["provider_page", "factsheet", "report"]).nullable(),
  source_updated_at: z.string().nullable(),
  centroid: geometrySchema.nullable(),
  geometry: geometrySchema.nullable(),
});

type FactRow = z.infer<typeof rowSchema>;

/** Én rad i «Se alle registreringer i området». */
export interface ContaminatedListItem {
  id: string;
  title: string;
  distanceLabel: string;
  gradeLabel: string;
  contains: boolean;
  href: string | null;
}

/** Den utvidbare oversikten over alle registreringer med forurenset grunn i området. */
export interface ContaminatedOverview {
  total: number;
  headline: string;
  details: string[];
  caveat: string | null;
  sourceName: string;
  items: ContaminatedListItem[];
}

/** Lokalitet som skal tegnes som flate i kartet. */
export interface AreaMapFeature {
  id: string;
  title: string;
  geometry: AreaGeometry;
  /** Punkt inne i flaten, brukt til å plassere popup. */
  center: [number, number];
  contains: boolean;
  distanceLabel: string;
  gradeLabel: string | null;
}

export interface AreaFactGroup {
  category: AreaCategory;
  label: string;
  facts: AreaFact[];
}

export type AreaFactsResult =
  | {
      status: "ok";
      groups: AreaFactGroup[];
      /** Alle registreringer med forurenset grunn, bak «Se alle registreringer i området». */
      contaminated: ContaminatedOverview | null;
      /** Lokaliteter med geometri, tegnet som flater i kartet. */
      mapFeatures: AreaMapFeature[];
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
  externalId?: string | null;
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
    externalId: input.externalId ?? null,
  });
  if (!text) return null;
  const source = SOURCES[input.providerId];
  return {
    id: input.id,
    category: input.category,
    subtype: input.subtype,
    headline: text.headline,
    details: text.details,
    technical: text.technical ?? [],
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

/**
 * Forurenset grunn: konkrete lokaliteter, nærmeste først.
 *
 * Standardvisningen er et lite antall kort. Lokaliteter kilden mener trenger tiltak tas med
 * selv om de ikke er blant de nærmeste. Resten ligger i den utvidbare oversikten, og alt som
 * har flate tegnes i kartet.
 */
const CONTAMINATED_CARDS = 4;
const CONTAMINATED_ATTENTION_CARDS = 2;
const NEEDS_ACTION = "ikkeAkseptabelForurensning";

const byRelevance = (a: FactRow, b: FactRow) => Number(b.contains) - Number(a.contains) || a.distance_m - b.distance_m;

/** Centroiden fra PostGIS som [lng, lat]. */
const toLngLat = (centroid: AreaGeometry | null): [number, number] => {
  const position = centroid?.type === "Point" ? centroid.coordinates : null;
  return position && position.length >= 2 ? [position[0]!, position[1]!] : [0, 0];
};

const gradeOf = (row: FactRow): string =>
  typeof row.attributes.paavirkningsgrad === "string" ? row.attributes.paavirkningsgrad : "ukjentPåvirkning";

function contaminatedFacts(rows: FactRow[], radiusM: number) {
  const sorted = [...rows].sort(byRelevance);
  const nearest = sorted.slice(0, CONTAMINATED_CARDS);
  const needsAction = sorted
    .slice(CONTAMINATED_CARDS)
    .filter((row) => gradeOf(row) === NEEDS_ACTION)
    .slice(0, CONTAMINATED_ATTENTION_CARDS);

  const facts = [...nearest, ...needsAction].flatMap((row) => {
    const fact = toFact({
      id: row.id,
      providerId: row.provider_id,
      externalId: row.external_id,
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
    return fact ? [fact] : [];
  });

  const source = SOURCES["mdir-forurenset-grunn"]!;
  const summary = describeContaminatedSummary({
    total: sorted.length,
    byGrade: [NEEDS_ACTION, "ukjentPåvirkning", "akseptabelForurensning", "liteForurensning"].map((grade) => ({
      grade,
      count: sorted.filter((row) => gradeOf(row) === grade).length,
    })),
    radiusLabel: formatRadius(radiusM),
  });

  const overview: ContaminatedOverview = {
    total: sorted.length,
    headline: summary.headline,
    details: summary.details,
    caveat: summary.caveat,
    sourceName: `${source.name} (${source.owner})`,
    items: sorted.map((row) => ({
      id: row.id,
      title: row.title,
      distanceLabel: distanceLabel(row.distance_m, row.contains),
      gradeLabel: PAAVIRKNINGSGRAD_SHORT[gradeOf(row)] ?? "uten oppgitt grad",
      contains: row.contains,
      href: row.source_url,
    })),
  };

  // Bare flater kan tegnes; punkter og linjer finnes ikke i dette laget.
  const mapFeatures: AreaMapFeature[] = sorted.flatMap((row) =>
    row.geometry && row.centroid?.type === "Point" && (row.geometry.type === "Polygon" || row.geometry.type === "MultiPolygon")
      ? [
          {
            id: row.id,
            title: row.title,
            geometry: row.geometry,
            center: toLngLat(row.centroid),
            contains: row.contains,
            distanceLabel: distanceLabel(row.distance_m, row.contains),
            gradeLabel: PAAVIRKNINGSGRAD_SHORT[gradeOf(row)] ?? null,
          },
        ]
      : [],
  );

  return { facts, overview, mapFeatures };
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
  let rows: FactRow[] = [];
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
  const nearestRows = new Map<string, FactRow>();
  for (const row of rows) {
    if (row.subtype === "forurenset_grunn") continue;
    const key = `${row.provider_id}|${row.subtype}|${row.title}`;
    const current = nearestRows.get(key);
    if (!current || Number(row.contains) > Number(current.contains) || row.distance_m < current.distance_m) {
      nearestRows.set(key, row);
    }
  }

  const contaminatedRows = rows.filter((r) => r.subtype === "forurenset_grunn");
  let contaminated: ContaminatedOverview | null = null;
  let mapFeatures: AreaMapFeature[] = [];
  if (contaminatedRows.length > 0) {
    const result = contaminatedFacts(contaminatedRows, radius);
    facts.push(...result.facts);
    contaminated = result.overview;
    mapFeatures = result.mapFeatures;
    usedSources.add("mdir-forurenset-grunn");
  }

  for (const row of nearestRows.values()) {
    const fact = toFact({
      id: row.id,
      providerId: row.provider_id,
      externalId: row.external_id,
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
    contaminated,
    mapFeatures,
    sources: [...usedSources].flatMap((id) => (SOURCES[id] ? [SOURCES[id]] : [])),
    unavailableSources: unavailable,
  };
}
