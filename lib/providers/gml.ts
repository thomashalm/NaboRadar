import { XMLParser } from "fast-xml-parser";
import { fetchJson } from "@/lib/http";
import type { HttpRetryPolicy } from "@/lib/sync/types";

/**
 * Minimal WFS-klient for kilder som bare tilbyr GML.
 *
 * Flere offentlige datasett (Utdanningsdirektoratet, DSB) ligger på Geonorge-WFS uten
 * GeoJSON-utgang. Elementene er nøstet — `adressenavn` finnes både under besøksadresse og
 * postadresse — så vi parser faktisk XML i stedet for å lete med regulære uttrykk.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  // Fjern app:/gml:-prefikser, ellers må alle oppslag skrive dem ut.
  transformTagName: (tag) => tag.replace(/^[a-zA-Z0-9]+:/, ""),
  parseTagValue: false,
  trimValues: true,
});

export type GmlFeature = Record<string, unknown>;

/** Punktet fra <gml:pos>. WFS-en svarer med lat lon når vi ber om EPSG:4326. */
export function gmlPoint(feature: GmlFeature, path = "posisjon"): [number, number] | null {
  const node = feature[path] as { Point?: { pos?: string } } | undefined;
  const pos = node?.Point?.pos;
  if (typeof pos !== "string") return null;
  const [lat, lng] = pos.trim().split(/\s+/).map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lng!, lat!] : null;
}

/** Leser en nøstet verdi, f.eks. nested(f, "besøksadresse", "Besøksadresse", "adressenavn"). */
export function nested(feature: GmlFeature, ...path: string[]): string | null {
  let current: unknown = feature;
  for (const key of path) {
    if (current === null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" && current.trim() ? current.trim() : null;
}

export const asNumber = (value: unknown): number | null => {
  const n = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Flategeometri fra GML. WFS-en svarer med lat lon når vi ber om EPSG:4326, mens
 * GeoJSON krever lon lat — så koordinatparene snus her, ett sted.
 */
export function gmlPolygon(feature: GmlFeature, path: string, les: CoordinateReader = LAT_LON): GeoPolygon | null {
  const node = feature[path];
  if (node === null || typeof node !== "object") return null;

  const polygons = collectPolygons(node as Record<string, unknown>, les);
  if (polygons.length === 0) return null;
  return polygons.length === 1
    ? { type: "Polygon", coordinates: polygons[0]! }
    : { type: "MultiPolygon", coordinates: polygons.map((p) => p) };
}

export type GeoPolygon =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

/** Én flate = ytre ring først, så eventuelle hull. */
function collectPolygons(node: Record<string, unknown>, les: CoordinateReader): number[][][][] {
  const ut: number[][][][] = [];
  const polygonNodes = asArray(node.Polygon ?? (node.MultiSurface as Record<string, unknown> | undefined)?.surfaceMember);
  for (const raw of polygonNodes) {
    const polygon = (raw as Record<string, unknown>).Polygon ?? raw;
    const rings: number[][][] = [];
    const ytre = ringOf((polygon as Record<string, unknown>).exterior, les);
    if (ytre) rings.push(ytre);
    for (const hull of asArray((polygon as Record<string, unknown>).interior)) {
      const ring = ringOf(hull, les);
      if (ring) rings.push(ring);
    }
    if (rings.length > 0) ut.push(rings);
  }
  return ut;
}

/** Geonorge svarer lat lon når vi ber om EPSG:4326. Andre tjenester bruker andre akser. */
export type CoordinateReader = (a: number, b: number) => [number, number];

const LAT_LON: CoordinateReader = (lat, lon) => [lon, lat];

function ringOf(node: unknown, les: CoordinateReader): number[][] | null {
  const raw = (node as { LinearRing?: { posList?: unknown } } | undefined)?.LinearRing?.posList;
  // Har elementet attributter — MapServer setter srsDimension på posList — legger parseren
  // teksten under #text i stedet for å gi en streng. Begge formene er gyldig GML.
  const pos = typeof raw === "string" ? raw : (raw as { "#text"?: unknown } | undefined)?.["#text"];
  if (typeof pos !== "string") return null;
  const tall = pos.trim().split(/\s+/).map(Number);
  const ring: number[][] = [];
  for (let i = 0; i + 1 < tall.length; i += 2) ring.push(les(tall[i]!, tall[i + 1]!));
  return ring.length >= 4 ? ring : null;
}

const asArray = (value: unknown): unknown[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);

export interface WfsBboxQuery {
  baseUrl: string;
  typeName: string;
  /** [sørLat, vestLng, nordLat, østLng] — WFS-en forventer lat før lng for EPSG:4326. */
  bbox: [number, number, number, number];
  count?: number;
  signal?: AbortSignal;
  retry: HttpRetryPolicy;
}

/** Ett bbox-oppslag. Brukes av eiendomsoppslaget, som spør per klikk og ikke synker. */
export async function wfsBbox(options: WfsBboxQuery): Promise<GmlFeature[]> {
  const [sør, vest, nord, øst] = options.bbox;
  const url =
    `${options.baseUrl}?` +
    new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeNames: `app:${options.typeName}`,
      count: String(options.count ?? 60),
      srsName: "urn:ogc:def:crs:EPSG::4326",
      bbox: `${sør},${vest},${nord},${øst},urn:ogc:def:crs:EPSG::4326`,
    });
  const xml = await fetchXml(url, { ...options, pageSize: undefined } as unknown as WfsPageOptions);
  return featuresFrom(xml, options.typeName);
}

export interface WfsPageOptions {
  baseUrl: string;
  typeName: string;
  pageSize?: number;
  signal?: AbortSignal;
  retry: HttpRetryPolicy;
  /**
   * Erstatning for fetch, til tester.
   *
   * Uten denne gikk providernes injiserte fetch i gulvet: konstruktøren tok imot en, men
   * wfsPages brukte alltid global fetch — så en test mot en falsk WFS traff i stedet den
   * ekte tjenesten uten å si fra.
   */
  fetchImpl?: typeof fetch;
}

/** Henter alle features for én typeName, side for side. */
export async function* wfsPages(options: WfsPageOptions): AsyncGenerator<GmlFeature[]> {
  const pageSize = options.pageSize ?? 1000;
  for (let startIndex = 0; ; startIndex += pageSize) {
    const url =
      `${options.baseUrl}?` +
      new URLSearchParams({
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: `app:${options.typeName}`,
        count: String(pageSize),
        startIndex: String(startIndex),
        srsName: "urn:ogc:def:crs:EPSG::4326",
      });

    const xml = await fetchXml(url, options);
    const features = featuresFrom(xml, options.typeName);
    if (features.length > 0) yield features;
    if (features.length < pageSize) return;
  }
}

/**
 * Samme, men for WFS 1.1-tjenester som svarer med <gml:featureMember> i stedet for <member>.
 * MapServer (Oslo kommune) gjør det slik, og gir dessuten geometrien i sitt eget koordinat-
 * system i stedet for det vi ba om — så kalleren må selv si hvordan aksene skal leses.
 */
export function gmlFeatureMembers(xml: string, typeName: string): GmlFeature[] {
  const parsed = parser.parse(xml) as { FeatureCollection?: { featureMember?: unknown } };
  const members = parsed.FeatureCollection?.featureMember;
  const list = members === undefined ? [] : Array.isArray(members) ? members : [members];
  return list
    .map((m) => (m as Record<string, GmlFeature>)[typeName])
    .filter((f): f is GmlFeature => f !== undefined && typeof f === "object");
}

/** Plukker ut features av én type fra en WFS FeatureCollection. */
function featuresFrom(xml: string, typeName: string): GmlFeature[] {
  const parsed = parser.parse(xml) as { FeatureCollection?: { member?: unknown } };
  const members = parsed.FeatureCollection?.member;
  const list = members === undefined ? [] : Array.isArray(members) ? members : [members];
  return list
    .map((m) => (m as Record<string, GmlFeature>)[typeName])
    .filter((f): f is GmlFeature => f !== undefined && typeof f === "object");
}

/** GML er XML, ikke JSON, så vi kan ikke bruke fetchJson direkte — men vi vil ha samme retry. */
async function fetchXml(url: string, options: WfsPageOptions): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return response;
}

/**
 * Henter XML med samme timeout, backoff og 4xx-regel som resten av kodebasen.
 *
 * fetchJson er bygget for JSON, men er der all retry-logikken bor. Vi gjenbruker den ved å
 * pakke teksten som JSON underveis, i stedet for å ha to sett med retry-regler.
 */
export async function fetchGml(
  url: string,
  options: { retry: HttpRetryPolicy; signal?: AbortSignal; fetchImpl?: typeof fetch },
): Promise<string> {
  const underliggende = options.fetchImpl ?? fetch;
  const text = await fetchJson(url, {
    timeoutMs: options.retry.timeoutMs,
    retries: options.retry.maxRetries,
    baseDelayMs: options.retry.baseDelayMs,
    signal: options.signal,
    fetchImpl: async (input, init) => {
      const response = await underliggende(input, init);
      if (!response.ok) return response;
      const body = await response.text();
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  if (typeof text !== "string") throw new Error("WFS svarte ikke med XML");
  return text;
}

async function fetchWithRetry(url: string, options: WfsPageOptions): Promise<string> {
  return fetchGml(url, { retry: options.retry, signal: options.signal, fetchImpl: options.fetchImpl });
}
