import { z } from "zod";
import { ArcgisClient, arcgisFeatureSchema } from "@/lib/providers/arcgis";
import { fetchJson } from "@/lib/http";
import { lufthavnNavn } from "@/lib/facts/lufthavner";
import type { AreaLookup, LookupContext, LookupHit } from "./types";
import { wmsPunktoppslag } from "./wms";

const LOOKUP_RETRY = { timeoutMs: 6_000, maxRetries: 1, baseDelayMs: 200 };

const MDIR_STOY = "https://kart3.miljodirektoratet.no/arcgis/rest/services/stoy";
const NORSTOY_WFS = "https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows";
/**
 * Geonorges WMS for «Støysoner Avinors lufthavner». Fram til 2026-10-03 brukte vi WFS-en
 * `wfs.stoylufthavn`, som da var nede; WMS-en ga samme sone som Avinors eget støysonekart i
 * 200 av 200 kontrollpunkter. Se ADR 015.
 */
const AVINOR_WMS = "https://wms.geonorge.no/skwms1/wms.stoylufthavn";
const AVINOR_LAG = "stoylufthavn_wms";

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
 * Avinors flystøysoner etter T-1442 (gul og rød sone), som punktoppslag mot Geonorges WMS.
 *
 * Tjenesten tar bare EPSG:4326 — der er aksene lat,lon i WMS 1.3.0 (se ./wms.ts). Sonene er
 * adskilte flater (gul er en ring rundt rød), men vi tar den strengeste om begge skulle treffe.
 *
 * `stoykildenavn` er ICAO-koden; navnet slås opp i lib/facts/lufthavner.ts. `beregnetar` er
 * beregningsåret etter SOSI-spesifikasjonen — året trafikkgrunnlaget gjelder, ofte et prognoseår,
 * ikke når beregningen ble gjort. Mangler det, oppgir vi ikke noe år.
 */
export class FlystoyLookup implements AreaLookup {
  readonly id = "avinor-stoysone-fly";
  readonly name = "Flystøysoner (T-1442)";
  readonly owner = "Avinor";
  readonly category = "stoy" as const;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    // Kaster ved feil og ugyldig svar: da vet vi ikke om punktet er i en sone.
    const treff = await wmsPunktoppslag({
      url: AVINOR_WMS,
      layers: [AVINOR_LAG],
      crs: "EPSG:4326",
      lat,
      lng,
      retry: { timeoutMs: LOOKUP_RETRY.timeoutMs, maxRetries: LOOKUP_RETRY.maxRetries, baseDelayMs: LOOKUP_RETRY.baseDelayMs },
      signal,
      fetchImpl: this.fetchImpl,
    });
    // Svaret navngir blokken etter det underliggende laget («stoylufthavn_layer»), ikke etter
    // WMS-lagnavnet vi spør med. Vi spør bare om ett lag, så alle blokkene i svaret er våre.
    const soner = [...treff.values()].flat().filter((f) => f.stoysonekategori === "R" || f.stoysonekategori === "G");
    if (soner.length === 0) return [];

    const sone = soner.find((f) => f.stoysonekategori === "R") ?? soner[0]!;
    const aar = /^\d{4}$/.test(sone.beregnetar ?? "") ? Number(sone.beregnetar) : null;
    return [
      {
        subtype: "stoysone_fly_t1442",
        title: "Flystøysone",
        attributes: { sone: sone.stoysonekategori === "R" ? "rod" : "gul", lufthavn: lufthavnNavn(sone.stoykildenavn), beregnetAar: aar },
        distanceM: 0,
        contains: true,
      },
    ];
  }
}
