import { z } from "zod";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import { ArcgisClient, arcgisFeatureSchema, arcgisTimestamp, arcgisYear } from "@/lib/providers/arcgis";
import { geometrySchema } from "@/lib/providers/mdir/shared";
import { hasDrawableArea, splitLargeMultiGeometry } from "@/lib/providers/geometry";
import { describeIssues } from "@/lib/providers/issues";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY } from "@/lib/sync/types";
import { toVerifiedNveUrl } from "./urls";

const SERVICE = "https://kart.nve.no/enterprise/rest/services/SkredKvikkleire2/MapServer";
const LAYER = 0;

/**
 * NVEs kartlagte kvikkleiresoner (NLOD).
 *
 * Kilden kaller dette «soner med potensiell fare (aktsomhetsområder)», ment for vurdering
 * på kommuneplannivå. Tre nivåer må holdes fra hverandre i presentasjonen:
 *  1. sonen (løsne- eller utløpsområde)
 *  2. om kvikkleire er PÅVIST eller bare MULIG (`kvikkleirestabilitetvurdering`)
 *  3. klassifisering: faregrad × konsekvens → risikoklasse (gjelder sonen, ikke eiendommen)
 *
 * Personvern: `bemerkning` inneholder i noen tilfeller gnr./bnr. og lagres ikke.
 */

export const STABILITET = {
  1: "paavist_lav_sikkerhet",
  2: "paavist_ikke_vurdert",
  3: "paavist_tilfredsstillende",
  4: "mulig",
  5: "ikke_fare",
} as const;

export const UNDERSOKELSE = {
  0: "ingen",
  1: "enkel",
  2: "supplerende",
  3: "sikringstiltak_utfort",
} as const;

export const KONSEKVENS = { 0: "ingen", 1: "mindre_alvorlig", 2: "alvorlig", 3: "meget_alvorlig" } as const;

const propertiesSchema = z.object({
  globalid: z.string().min(1),
  skredomrnavn: z.string().nullable(),
  objekttype: z.string().nullable(),
  faregrad: z.string().nullable(),
  konsekvens: z.number().nullable(),
  risiko: z.number().nullable(),
  kvikkleirestabilitetvurdering: z.number().nullable(),
  skredkvalkartlegging: z.number().nullable(),
  faregraddato: arcgisTimestamp,
  statusskredomr: z.number().nullable(),
  rapporturl: z.string().nullable(),
});

type Props = z.infer<typeof propertiesSchema>;

function codeOf<T extends Record<number, string>>(table: T, value: number | null): string | null {
  return value !== null && value in table ? table[value]! : null;
}

export class NveKvikkleireSonerProvider implements AreaFeatureProvider {
  readonly id = "nve-kvikkleire-soner";
  readonly name = "Kartlagte kvikkleiresoner";
  readonly owner = "Norges vassdrags- og energidirektorat";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD)", url: "https://data.norge.no/nlod/no/1.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;
  private readonly client: ArcgisClient;

  constructor(fetchImpl: typeof fetch = fetch, retry = DEFAULT_RETRY_POLICY) {
    this.client = new ArcgisClient(fetchImpl, retry);
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    // statusskredomr = 1 (gjeldende). Erstattede og fjernede soner hentes ikke.
    for await (const features of this.client.pages(SERVICE, LAYER, {
      where: "statusskredomr = 1",
      outFields: Object.keys(propertiesSchema.shape),
      geometryPrecision: 6,
      // Største sone har 125 000 hjørner (2,8 MB) og sprenger databasens statement timeout.
      // ~1,1 m generalisering gir 462 hjørner, godt innenfor presisjonen vi trenger.
      maxAllowableOffset: 0.00001,
      signal: options.signal,
    })) {
      yield { features, documents: [] };
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];

    for (const raw of batch.features) {
      const feature = arcgisFeatureSchema.safeParse(raw);
      const props = feature.success ? propertiesSchema.safeParse(feature.data.properties) : null;
      const geometry = feature.success ? geometrySchema.safeParse(feature.data.geometry) : null;
      if (!feature.success || !props?.success || !geometry?.success) {
        rejected.push({
          kind: "feature",
          externalId: null,
          reason: describeIssues(props?.error ?? geometry?.error ?? feature.error, "ugyldig kvikkleiresone"),
        });
        continue;
      }
      const p: Props = props.data;
      if (!hasDrawableArea(geometry.data)) {
        rejected.push({ kind: "feature", externalId: p.globalid, reason: "degenerert geometri (uten areal)" });
        continue;
      }
      const stabilitet = codeOf(STABILITET, p.kvikkleirestabilitetvurdering);

      // Store flerdelte soner deles i flere rader (se lib/providers/geometry.ts).
      const parts = splitLargeMultiGeometry(geometry.data);
      parts.forEach((part, index) => {
        records.push({
          providerId: this.id,
          externalId: parts.length === 1 ? p.globalid : `${p.globalid}#${index}`,
          category: "grunnforhold",
          // Soner uten fare er utredet og friskmeldt — egen subtype, aldri presentert som fare.
          subtype: stabilitet === "ikke_fare" || p.faregrad === "Ingen" ? "kvikkleire_utredet_uten_fare" : "kvikkleire_sone",
          title: p.skredomrnavn?.trim() || "Kvikkleiresone",
          geometry: part,
          attributes: {
            omradetype: p.objekttype === "UtlopOmr" ? "utlopsomrade" : "losneomrade",
            faregrad: p.faregrad,
            konsekvens: codeOf(KONSEKVENS, p.konsekvens),
            risikoklasse: p.risiko,
            stabilitet,
            undersokelse: codeOf(UNDERSOKELSE, p.skredkvalkartlegging),
            vurdertAar: arcgisYear(p.faregraddato),
          },
          sourceUrl: toVerifiedNveUrl(p.rapporturl),
          sourceUrlType: toVerifiedNveUrl(p.rapporturl) ? "report" : null,
          sourceUpdatedAt: null,
        });
      });
    }
    return { records, rejected };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const count = await this.client.count(SERVICE, LAYER, { where: "statusskredomr = 1" });
      return { ok: count > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: `${count} gjeldende soner` };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
