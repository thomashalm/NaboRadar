import { z } from "zod";
import { ArcgisClient, arcgisFeatureSchema } from "@/lib/providers/arcgis";
import { fetchJson } from "@/lib/http";
import type { AreaLookup, LookupContext, LookupHit } from "./types";

const LOOKUP_RETRY = { timeoutMs: 6_000, maxRetries: 1, baseDelayMs: 200 };

const MDIR_STOY = "https://kart3.miljodirektoratet.no/arcgis/rest/services/stoy";
const NORSTOY_WFS = "https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows";
const AVINOR_WFS = "https://wfs.geonorge.no/skwms1/wfs.stoylufthavn";

/** Kildens Lden-kategorier → leselig dB-intervall. */
export function ldenInterval(category: string | null): string | null {
  const match = /^Lden(\d{2})(\d{2})$/.exec(category ?? "");
  if (match) return `${match[1]}–${match[2]} dB`;
  if (category === "LdenGreaterThan75") return "over 75 dB";
  return null;
}

const strategiskProps = z.object({
  category: z.string().nullable().optional(),
  stoyintervall: z.number().nullable().optional(),
  stoyenhet: z.string().nullable().optional(),
});

/**
 * Miljødirektoratets strategiske støykartlegging (EU-støydirektivet, kartlagt 2022).
 * Polygonene er ~300 MB nasjonalt og spørres derfor direkte, punkt-i-polygon.
 * Storbylagene (5) dekker Oslo; lag 7 dekker øvrige kartlagte veger.
 */
export class StrategiskStoyLookup implements AreaLookup {
  readonly id = "mdir-stoy-strategisk";
  readonly name = "Strategisk støykartlegging";
  readonly owner = "Miljødirektoratet";
  readonly category = "stoy" as const;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.client = new ArcgisClient(fetchImpl, LOOKUP_RETRY);
  }

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    const sources = [
      { service: `${MDIR_STOY}/stoykart_strategisk_veg/MapServer`, subtype: "stoy_strategisk_veg", title: "Beregnet veitrafikkstøy" },
      { service: `${MDIR_STOY}/stoykart_strategisk_bane/MapServer`, subtype: "stoy_strategisk_bane", title: "Beregnet banestøy" },
    ];

    const results = await Promise.all(
      sources.flatMap((source) =>
        // Lag 5 = storbyområder (bl.a. Oslo), lag 7 = øvrige kartlagte strekninger.
        [5, 7].map(async (layer) => {
          const features = await this.client.query(source.service, layer, {
            point: { lat, lng },
            returnGeometry: false,
            signal,
          });
          return features.map((raw) => ({ source, raw }));
        }),
      ),
    );

    const hits: LookupHit[] = [];
    const seen = new Set<string>();
    for (const { source, raw } of results.flat()) {
      const parsed = arcgisFeatureSchema.safeParse(raw);
      const props = parsed.success ? strategiskProps.safeParse(parsed.data.properties) : null;
      if (!parsed.success || !props?.success) continue;
      const p = props.data;
      const level = ldenInterval(p.category ?? null) ?? (p.stoyintervall !== null && p.stoyintervall !== undefined ? `${p.stoyintervall} dB eller mer` : null);
      const unit = (p.stoyenhet ?? "LDEN").toUpperCase();
      // Kun døgnnivået (Lden) i denne versjonen.
      if (unit !== "LDEN" || !level || seen.has(source.subtype)) continue;
      seen.add(source.subtype);
      hits.push({
        subtype: source.subtype,
        title: source.title,
        attributes: { niva: level, enhet: "Lden", kartlagtAar: 2022 },
        distanceM: 0,
        contains: true,
      });
    }
    return hits;
  }
}

const varselProps = z.object({
  STOYSONEKATEGORI: z.string().nullable().optional(),
  STOYKILDENAVN: z.string().nullable().optional(),
  BEREGNETAR: z.union([z.number(), z.string()]).nullable().optional(),
});

/**
 * Statens vegvesens støyvarselkart etter T-1442 (gul og rød sone).
 * Geonorge-WFS blokkerer punktfilter i URL (403), så vi bruker Vegvesenets egen
 * GeoServer med CQL og GeoJSON.
 */
export class StoyvarselVegLookup implements AreaLookup {
  readonly id = "svv-stoysone-veg";
  readonly name = "Støyvarselkart for veg (T-1442)";
  readonly owner = "Statens vegvesen";
  readonly category = "stoy" as const;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    const params = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeNames: "norstoy_1_0:Stoyvarselkart",
      outputFormat: "application/json",
      CQL_FILTER: `INTERSECTS(GEOM, SRID=4326;POINT(${lng} ${lat}))`,
    });
    const body = await fetchJson(`${NORSTOY_WFS}?${params.toString()}`, {
      timeoutMs: LOOKUP_RETRY.timeoutMs,
      retries: LOOKUP_RETRY.maxRetries,
      signal,
      fetchImpl: this.fetchImpl,
    });
    const parsed = z.object({ features: z.array(z.unknown()) }).safeParse(body);
    if (!parsed.success) return [];

    const zones = parsed.data.features
      .map((raw) => arcgisFeatureSchema.safeParse(raw))
      .flatMap((f) => (f.success ? [varselProps.safeParse(f.data.properties)] : []))
      .flatMap((p) => (p.success ? [p.data] : []));

    // Gul og rød sone er disjunkte, men vi tar den strengeste hvis begge skulle treffe.
    const red = zones.find((z) => z.STOYSONEKATEGORI === "R");
    const zone = red ?? zones[0];
    if (!zone?.STOYSONEKATEGORI) return [];

    return [
      {
        subtype: "stoysone_veg_t1442",
        title: "Støysone for veitrafikk",
        attributes: {
          sone: zone.STOYSONEKATEGORI === "R" ? "rod" : "gul",
          kilde: zone.STOYKILDENAVN ?? null,
          prognoseAar: zone.BEREGNETAR ? Number(zone.BEREGNETAR) : null,
        },
        distanceM: 0,
        contains: true,
      },
    ];
  }
}

/**
 * Avinors flystøysoner etter T-1442. Kilden leverer kun GML, og punktfilter er blokkert,
 * så vi henter en svært liten bbox rundt punktet og leser attributtene.
 */
export class FlystoyLookup implements AreaLookup {
  readonly id = "avinor-stoysone-fly";
  readonly name = "Flystøysoner (T-1442)";
  readonly owner = "Avinor";
  readonly category = "stoy" as const;
  /** ~2 m i hver retning. */
  private static readonly EPSILON = 0.00002;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    const e = FlystoyLookup.EPSILON;
    const params = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeNames: "app:Støy",
      bbox: `${lat - e},${lng - e},${lat + e},${lng + e},urn:ogc:def:crs:EPSG::4326`,
    });
    const response = await this.fetchImpl(`${AVINOR_WFS}?${params.toString()}`, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(LOOKUP_RETRY.timeoutMs)]) : AbortSignal.timeout(LOOKUP_RETRY.timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();

    const category = /<app:støysonekategori>([^<]+)</.exec(xml)?.[1]?.trim();
    if (!category) return [];
    const name = /<app:støykildenavn>([^<]+)</.exec(xml)?.[1]?.trim() ?? null;
    const year = /<app:beregnetÅr>(\d{4})</.exec(xml)?.[1];

    return [
      {
        subtype: "stoysone_fly_t1442",
        title: "Flystøysone",
        attributes: { sone: category === "R" ? "rod" : "gul", lufthavn: name, beregnetAar: year ? Number(year) : null },
        distanceM: 0,
        contains: true,
      },
    ];
  }
}
