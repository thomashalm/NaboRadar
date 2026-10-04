import { z } from "zod";
import { utm33ToWgs84Exact } from "@/lib/geo/utm";
import { iBoksen, MYR_KOMMUNER, MYR_PROVIDER, NATUR_INTERN } from "@/lib/multe/omrade";
import { fetchGml } from "@/lib/providers/gml";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import { readZipMember } from "@/lib/providers/zip-range";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import { n50ArchiveUrls } from "./n50-hytter";

/**
 * Myrflater fra Kartverkets N50 Kartdata, for Oslo og Marka. Internt researchlag (Utforsk data).
 *
 * KILDEVALG: N50 er åpent (CC BY 4.0) og kan lagres og vises. FKB-AR5 er det beste myrkartet,
 * men er ikke åpne data og brukes ikke. N50 er 1:50 000: små myrer mangler, og to av tre
 * registrerte multefunn i området ligger utenfor flatene (docs/research/multer-oslo.md).
 *
 * LEVERANSE: samme arkiv per kommune som hyttene (se n50-hytter.ts), filen «Arealdekke». Bare
 * objekttypen `Myr` leses. Koordinatene er UTM 33.
 *
 * IDENTITET: N50 har ingen stabil ID (`gml:id` genereres per uttrekk). Nøkkelen er kommune og
 * flatens tyngdepunkt avrundet til ti meter. Endrer Kartverket en flate, får den ny nøkkel og den
 * gamle markeres som fjernet — det er riktig for et kartlag uten egne opplysninger knyttet til.
 *
 * Synkes ikke etter tidsplan: kjøres for hånd med `npm run sync:area -- --provider=<id>`.
 */
const FEED = "https://nedlasting.geonorge.no/geonorge/ATOM-feeds/N50Kartdata_AtomFeedGML.xml";
const DATASETT = "https://kartkatalog.geonorge.no/metadata/n50-kartdata/ea192681-d039-42ec-b1bc-f3ce04c189ac";

const ring = z.array(z.tuple([z.number().finite(), z.number().finite()])).min(4);
const rawSchema = z.object({
  knr: z.string().regex(/^\d{4}$/),
  oppdateringsdato: z.string().nullable(),
  /** Ytterring først, så eventuelle hull. UTM 33, [øst, nord]. */
  ringer: z.array(ring).min(1),
});
type RawMyr = z.infer<typeof rawSchema>;

const tallpar = (posList: string): [number, number][] => {
  const tall = posList.trim().split(/\s+/).map(Number);
  const par: [number, number][] = [];
  for (let i = 0; i + 1 < tall.length; i += 2) par.push([tall[i]!, tall[i + 1]!]);
  return par;
};

/** Myrflatene i én kommunes arealdekkefil. Ren funksjon, slik at den kan testes uten nett. */
export function parseN50Myr(gml: string, knr: string): unknown[] {
  const flater: unknown[] = [];
  for (const block of gml.split("<gml:featureMember>")) {
    if (!/^\s*<app:Myr[\s>]/.test(block)) continue;
    const ytre = /<gml:exterior>[\s\S]*?<gml:posList>([^<]*)<\/gml:posList>/.exec(block);
    const hull = [...block.matchAll(/<gml:interior>[\s\S]*?<gml:posList>([^<]*)<\/gml:posList>/g)];
    flater.push({
      knr,
      oppdateringsdato: /<app:oppdateringsdato>([^<]*)<\/app:oppdateringsdato>/.exec(block)?.[1]?.trim() ?? null,
      ringer: [ytre?.[1], ...hull.map((m) => m[1])].filter((r): r is string => typeof r === "string").map(tallpar),
    });
  }
  return flater;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const tyngdepunkt = (ytre: [number, number][]): [number, number] => {
  const punkter = ytre.slice(0, -1);
  return [punkter.reduce((s, p) => s + p[0], 0) / punkter.length, punkter.reduce((s, p) => s + p[1], 0) / punkter.length];
};

export class KartverketN50MyrProvider implements AreaFeatureProvider {
  readonly id = MYR_PROVIDER;
  readonly name = "Myr i N50 Kartdata, Oslo og Marka";
  readonly owner = "Kartverket";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Creative Commons Navngivelse 4.0 (CC BY 4.0)", url: "https://creativecommons.org/licenses/by/4.0/" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = "Internt researchlag. Oslo og Marka. Synkes for hånd.";

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = { ...DEFAULT_RETRY_POLICY, timeoutMs: 120_000 },
    private readonly kommuner: readonly string[] = MYR_KOMMUNER,
  ) {}

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    const feed = await fetchGml(FEED, { retry: this.retry, signal: options.signal, fetchImpl: this.fetchImpl });
    const urls = n50ArchiveUrls(feed);
    for (const knr of this.kommuner) {
      const url = urls.get(knr);
      // En kommune som mangler er et brudd på forutsetningen, ikke et tomt svar: ellers ville
      // myrene der blitt markert som fjernet.
      if (!url) throw new Error(`N50-feeden har ikke kommune ${knr}`);
      const member = await readZipMember(url, (name) => /Arealdekke.*\.gml$/i.test(name), {
        retry: this.retry,
        signal: options.signal,
        fetchImpl: this.fetchImpl,
      });
      if (!member) throw new Error(`Fant ikke arealdekkefilen i N50-arkivet for kommune ${knr}`);
      yield { features: parseN50Myr(member.text, knr), documents: [] };
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];
    const brukt = new Map<string, number>();

    for (const feature of batch.features) {
      const parsed = rawSchema.safeParse(feature);
      if (!parsed.success) {
        rejected.push({ kind: "feature", externalId: null, reason: parsed.error.issues[0]?.path.join(".") + ": " + parsed.error.issues[0]?.message });
        continue;
      }
      const raw: RawMyr = parsed.data;
      const [øst, nord] = tyngdepunkt(raw.ringer[0]!);
      if (!iBoksen(utm33ToWgs84Exact([øst, nord]))) {
        skipped.push({ kind: "feature", externalId: null, reason: "utenfor Oslo og Marka" });
        continue;
      }
      const key = `${raw.knr}:${Math.round(øst / 10)}_${Math.round(nord / 10)}`;
      const nr = brukt.get(key) ?? 0;
      brukt.set(key, nr + 1);
      records.push({
        providerId: this.id,
        externalId: nr === 0 ? key : `${key}-${nr + 1}`,
        category: NATUR_INTERN,
        subtype: "myr",
        title: "Myr",
        geometry: { type: "Polygon", coordinates: raw.ringer.map((r) => r.map((p) => utm33ToWgs84Exact(p).map(round6) as [number, number])) },
        attributes: { municipality_number: raw.knr },
        sourceUrl: DATASETT,
        sourceUrlType: "provider_page",
        sourceUpdatedAt: raw.oppdateringsdato && /^\d{4}-\d{2}-\d{2}$/.test(raw.oppdateringsdato) ? `${raw.oppdateringsdato}T00:00:00Z` : null,
      });
    }
    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const feed = await fetchGml(FEED, { retry: this.retry, fetchImpl: this.fetchImpl });
      const mangler = this.kommuner.filter((k) => !n50ArchiveUrls(feed).has(k));
      return { ok: mangler.length === 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: mangler.length ? `Mangler i feeden: ${mangler.join(", ")}` : `${this.kommuner.length} kommuner i feeden` };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
