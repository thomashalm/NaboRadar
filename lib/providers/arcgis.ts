import { z } from "zod";
import { fetchJson } from "@/lib/http";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";

/**
 * Felles klient for ArcGIS REST MapServer (Miljødirektoratet og NVE).
 * Brukes både til sync (paginert uttrekk) og direkte oppslag (punkt / radius).
 */

export const arcgisFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.unknown().nullable(),
  properties: z.record(z.string(), z.unknown()),
});

const arcgisPageSchema = z.object({
  type: z.literal("FeatureCollection").optional(),
  features: z.array(z.unknown()).default([]),
  exceededTransferLimit: z.boolean().optional(),
  error: z.object({ message: z.string() }).loose().optional(),
});

export type ArcgisFeature = z.infer<typeof arcgisFeatureSchema>;

/** Én treffrad fra `identify`. `layerName` er kildens eget lagnavn, f.eks. «Flomsone_200arsflom». */
const identifyResultSchema = z.object({
  layerId: z.number(),
  layerName: z.string(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

const identifySchema = z.object({
  results: z.array(identifyResultSchema).default([]),
  error: z.object({ message: z.string() }).loose().optional(),
});

export type IdentifyResult = z.infer<typeof identifyResultSchema>;

export class ArcgisError extends Error {
  constructor(url: string, reason: string) {
    super(`ArcGIS-feil (${new URL(url).pathname}): ${reason}`);
    this.name = "ArcgisError";
  }
}

/**
 * ArcGIS leverer datofelt som millisekunder siden epoch — men enkelte lag (og enkelte rader
 * i samme lag) gir ISO-streng. Begge deler godtas.
 */
export function arcgisDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(/^\d+$/.test(value.trim()) ? Number(value) : value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

/** Tidsstempelfelt fra ArcGIS: tall eller streng. */
export const arcgisTimestamp = z.union([z.number(), z.string()]).nullable();

export function arcgisYear(value: unknown): number | null {
  const iso = arcgisDate(value);
  return iso ? Number(iso.slice(0, 4)) : null;
}

export interface ArcgisQuery {
  where?: string;
  outFields?: string[];
  returnGeometry?: boolean;
  /** Antall desimaler i geometrien. 6 ≈ 0,1 m og halverer ofte payload. */
  geometryPrecision?: number;
  /**
   * Generaliser geometrien (i outSR-enheter). 0.00001° ≈ 1,1 m.
   * Nødvendig for kilder med ekstremt detaljerte polygoner.
   */
  maxAllowableOffset?: number;
  /** Punktspørring: hent objekter som treffer punktet, eller innen `distanceM`. */
  point?: { lat: number; lng: number; distanceM?: number };
  pageSize?: number;
  signal?: AbortSignal;
}

function buildParams(query: ArcgisQuery, extra: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams({
    f: "geojson",
    outSR: "4326",
    outFields: (query.outFields ?? ["*"]).join(","),
    returnGeometry: String(query.returnGeometry ?? true),
    where: query.where ?? "1=1",
    ...extra,
  });
  if (query.geometryPrecision !== undefined) params.set("geometryPrecision", String(query.geometryPrecision));
  if (query.maxAllowableOffset !== undefined) params.set("maxAllowableOffset", String(query.maxAllowableOffset));
  if (query.point) {
    params.set("geometry", `${query.point.lng},${query.point.lat}`);
    params.set("geometryType", "esriGeometryPoint");
    params.set("inSR", "4326");
    params.set("spatialRel", "esriSpatialRelIntersects");
    if (query.point.distanceM !== undefined) {
      params.set("distance", String(query.point.distanceM));
      params.set("units", "esriSRUnit_Meter");
    }
  }
  return params;
}

export class ArcgisClient {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = DEFAULT_RETRY_POLICY,
  ) {}

  private async request(url: string, signal?: AbortSignal): Promise<z.infer<typeof arcgisPageSchema>> {
    const body = await fetchJson(url, {
      timeoutMs: this.retry.timeoutMs,
      retries: this.retry.maxRetries,
      baseDelayMs: this.retry.baseDelayMs,
      signal,
      fetchImpl: this.fetchImpl,
    });
    const parsed = arcgisPageSchema.safeParse(body);
    if (!parsed.success) throw new ArcgisError(url, "uventet svarformat");
    // ArcGIS svarer 200 med { error: { message } } ved feil.
    if (parsed.data.error) throw new ArcgisError(url, parsed.data.error.message);
    return parsed.data;
  }

  /** Ett oppslag (punkt eller radius). Brukes av direkte oppslag. */
  async query(serviceUrl: string, layer: number, query: ArcgisQuery): Promise<unknown[]> {
    const url = `${serviceUrl}/${layer}/query?${buildParams(query, {}).toString()}`;
    return (await this.request(url, query.signal)).features;
  }

  /**
   * Paginert uttrekk av et helt lag. `orderByFields=objectid` gir stabil rekkefølge,
   * slik at ingen objekter hoppes over eller dubleres mellom sidene.
   */
  async *pages(serviceUrl: string, layer: number, query: ArcgisQuery = {}): AsyncGenerator<unknown[]> {
    const pageSize = query.pageSize ?? 1000;
    for (let offset = 0, page = 0; page < 500; page++) {
      const params = buildParams(query, {
        resultOffset: String(offset),
        resultRecordCount: String(pageSize),
        orderByFields: "objectid",
      });
      const { features } = await this.request(`${serviceUrl}/${layer}/query?${params.toString()}`, query.signal);
      if (features.length > 0) yield features;
      if (features.length < pageSize) return;
      offset += features.length;
    }
    throw new ArcgisError(`${serviceUrl}/${layer}/query`, "for mange sider");
  }

  /**
   * `identify`: hvilke av flere lag inneholder punktet — i **én** forespørsel.
   *
   * Finnes fordi naturfare-tjenestene bruker ett lag per nivå: NVEs flomsoner har ett lag per
   * gjentaksintervall, og et `query`-kall per lag ville gitt ti forespørsler for ett adressesøk.
   * `identify` svarer på alle samtidig, og `layerName` følger med — så nivået kan leses av
   * lagnavnet framfor av et attributt som ikke alltid er satt.
   */
  async identify(
    serviceUrl: string,
    layers: number[],
    input: { lat: number; lng: number; toleranceM?: number; signal?: AbortSignal },
  ): Promise<IdentifyResult[]> {
    // 200 m vindu over 200 piksler ⇒ ett piksel ≈ én meter, slik at tolerance kan leses som meter.
    const halvGrad = 0.001;
    const params = new URLSearchParams({
      f: "json",
      geometry: JSON.stringify({ x: input.lng, y: input.lat }),
      geometryType: "esriGeometryPoint",
      sr: "4326",
      layers: `all:${layers.join(",")}`,
      tolerance: String(Math.max(0, Math.round(input.toleranceM ?? 0))),
      mapExtent: [input.lng - halvGrad, input.lat - halvGrad, input.lng + halvGrad, input.lat + halvGrad].join(","),
      imageDisplay: "200,200,96",
      returnGeometry: "false",
    });
    const url = `${serviceUrl}/identify?${params.toString()}`;
    const body = await fetchJson(url, {
      timeoutMs: this.retry.timeoutMs,
      retries: this.retry.maxRetries,
      baseDelayMs: this.retry.baseDelayMs,
      signal: input.signal,
      fetchImpl: this.fetchImpl,
    });
    const parsed = identifySchema.safeParse(body);
    if (!parsed.success) throw new ArcgisError(url, "uventet identify-svar");
    if (parsed.data.error) throw new ArcgisError(url, parsed.data.error.message);
    return parsed.data.results;
  }

  /** Antall objekter i et lag (eller innen punkt/radius). */
  async count(serviceUrl: string, layer: number, query: ArcgisQuery = {}): Promise<number> {
    const params = buildParams({ ...query, returnGeometry: false }, { returnCountOnly: "true", f: "json" });
    const url = `${serviceUrl}/${layer}/query?${params.toString()}`;
    const body = await fetchJson(url, { timeoutMs: this.retry.timeoutMs, retries: 1, signal: query.signal, fetchImpl: this.fetchImpl });
    const parsed = z.object({ count: z.number().int() }).safeParse(body);
    if (!parsed.success) throw new ArcgisError(url, "mangler count");
    return parsed.data.count;
  }
}
