import { z } from "zod";
import type { Geometry } from "geojson";
import { ArcgisClient, arcgisFeatureSchema } from "@/lib/providers/arcgis";
import { distanceToGeometry } from "@/lib/geo/distance";
import type { AreaLookup, LookupContext, LookupHit } from "./types";

/** Kortere budsjett enn sync: brukeren venter på svaret. */
const LOOKUP_RETRY = { timeoutMs: 5_000, maxRetries: 1, baseDelayMs: 200 };

const AKTSOMHET_SERVICE = "https://kart.nve.no/enterprise/rest/services/KvikkleireskredAktsomhet/MapServer";
const NETTANLEGG_SERVICE = "https://kart.nve.no/enterprise/rest/services/Nettanlegg4/MapServer";

/**
 * Aktsomhetsområde for kvikkleireskred (NVE, 2024) — 148 235 polygoner, derfor direkte oppslag.
 *
 * Svarer kun på om punktet ligger innenfor. Et treff betyr at kvikkleire KAN finnes og at NVE
 * krever geoteknisk vurdering ved tiltak, ikke at kvikkleire er påvist. Utenfor kartets dekning
 * sier vi ingenting.
 */
export class NveKvikkleireAktsomhetLookup implements AreaLookup {
  readonly id = "nve-kvikkleire-aktsomhet";
  readonly name = "Aktsomhetsområde for kvikkleireskred";
  readonly owner = "Norges vassdrags- og energidirektorat";
  readonly category = "grunnforhold" as const;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.client = new ArcgisClient(fetchImpl, LOOKUP_RETRY);
  }

  async run({ lat, lng, signal }: LookupContext): Promise<LookupHit[]> {
    const point = { lat, lng };
    const [inside, coverage] = await Promise.all([
      this.client.query(AKTSOMHET_SERVICE, 0, { point, returnGeometry: false, outFields: ["objectid"], signal }),
      this.client.query(AKTSOMHET_SERVICE, 1, { point, returnGeometry: false, outFields: ["dekningstatus"], signal }),
    ]);

    // Ingen dekning → ingen uttalelse. «Utenfor aktsomhetsområde» ville vært misvisende.
    if (coverage.length === 0) return [];
    if (inside.length === 0) return [];

    return [
      {
        subtype: "kvikkleire_aktsomhet",
        title: "Aktsomhetsområde for kvikkleireskred",
        attributes: { kilde: "NVE aktsomhetskart 2024" },
        distanceM: 0,
        contains: true,
      },
    ];
  }
}

const lineProps = z.object({
  spenning_kv: z.number().nullable(),
  eier: z.string().nullable(),
  navn: z.string().nullable(),
});

/**
 * Høyspent distribusjonsnett (NVE) — 141 401 linjer, derfor direkte oppslag innen radius.
 * Kun luftledninger NVE publiserer åpent. Jordkabler finnes ikke i datasettet, og vi
 * forsøker aldri å utlede dem.
 */
export class NveHoyspentDistribusjonLookup implements AreaLookup {
  readonly id = "nve-hoyspent-distribusjon";
  readonly name = "Høyspent distribusjonsnett";
  readonly owner = "Norges vassdrags- og energidirektorat";
  readonly category = "infrastruktur" as const;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.client = new ArcgisClient(fetchImpl, LOOKUP_RETRY);
  }

  async run({ lat, lng, radiusM, signal }: LookupContext): Promise<LookupHit[]> {
    const features = await this.client.query(NETTANLEGG_SERVICE, 2, {
      point: { lat, lng, distanceM: radiusM },
      outFields: Object.keys(lineProps.shape),
      geometryPrecision: 6,
      signal,
    });

    let nearest: { distanceM: number; props: z.infer<typeof lineProps> } | null = null;
    for (const raw of features) {
      const parsed = arcgisFeatureSchema.safeParse(raw);
      const props = parsed.success ? lineProps.safeParse(parsed.data.properties) : null;
      if (!parsed.success || !props?.success || !parsed.data.geometry) continue;
      const { distanceM } = distanceToGeometry({ lat, lng }, parsed.data.geometry as Geometry);
      if (!nearest || distanceM < nearest.distanceM) nearest = { distanceM, props: props.data };
    }
    if (!nearest) return [];

    return [
      {
        subtype: "hoyspent_distribusjon",
        title: "Høyspentledning (distribusjonsnett)",
        // 0 betyr «ikke registrert» hos NVE, ikke null volt.
        attributes: {
          spenningKv: nearest.props.spenning_kv !== null && nearest.props.spenning_kv > 0 ? nearest.props.spenning_kv : null,
          eier: nearest.props.eier,
        },
        distanceM: Math.round(nearest.distanceM),
        contains: false,
      },
    ];
  }
}
