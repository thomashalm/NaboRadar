import { z } from "zod";
import { utm33ToWgs84 } from "@/lib/geo/utm";
import { HUT_REFRESH_FN, HUT_SOURCE_CATEGORY, inHutBounds, type HutSourceAttributes } from "@/lib/huts/types";
import { fetchGml } from "@/lib/providers/gml";
import type {
  AreaFeatureProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "@/lib/providers/types";
import { readZipMember } from "@/lib/providers/zip-range";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { AreaAttributes, NormalizedAreaFeature } from "@/types/area-feature";

/**
 * Turisthytter fra Kartverkets N50 Kartdata — hovedkilden for hytter og koier.
 *
 * N50 har ingen egen objekttype for hytter. De er `Bygning` med bygningstype 956 og en
 * `Hytteinformasjon` med tre kodede felt: betjeningsgrad, hytteeier og tilgjengelighet
 * (låst/ulåst). 1 880 objekter i hele landet per oktober 2026. Lisens CC BY 4.0.
 *
 * LEVERANSE: det finnes ingen WFS. N50 leveres som ett zip-arkiv per kommune med alle temaene
 * i, listet i en ATOM-feed. Vi leser bare filen «BygningerOgAnlegg» ut av hvert arkiv, med
 * delforespørsler (lib/providers/zip-range.ts) — noen hundre kilobyte per kommune i stedet for
 * hele arkivet.
 *
 * IDENTITET: N50 har ingen stabil ID. `gml:id` genereres på nytt for hvert uttrekk — to
 * eksporter av Oslo samme natt hadde 0 av 13 224 felles. Nøkkelen er derfor kommune + navn,
 * med koordinat lagt til der to hytter i samme kommune heter det samme. Bytter en hytte navn,
 * får kildeposten ny nøkkel; det er `refresh_huts()` som da kjenner den igjen på posisjonen,
 * slik at den kanoniske hytta beholder sin ID. Se migrasjon 20261019000000.
 *
 * AVGRENSNING: to av kildens seks klasser tas ikke inn.
 *   - «Serveringshytte» er et betjent serveringssted (markastuer). Det er et spisested, ikke en
 *     hytte man bruker selv.
 *   - «Gapahuk» er en egen kategori vi ikke har bestemt oss for å bygge.
 * Begge havner i `skipped`, ikke `rejected`: det er vårt valg, ikke en feil i kilden.
 *
 * OVERNATTING følger av kildens egen definisjon av klassen, ikke av ordet «hytte»: betjent,
 * selvbetjent og ubetjent er overnattingshytter («sengene må ha madrasser»), mens en rastebu
 * er en «rastehytte/dagshytte/nødbu» der man kan sove «i et knipetak». Sengetall, sesong og
 * om hytta faktisk er åpen står ikke i N50, og settes ikke.
 */
/** Norge har 357 kommuner. En feed med vesentlig færre er ufullstendig. */
const MIN_MUNICIPALITIES = 340;

const FEED = "https://nedlasting.geonorge.no/geonorge/ATOM-feeds/N50Kartdata_AtomFeedGML.xml";
const DATASETT = "https://kartkatalog.geonorge.no/metadata/n50-kartdata/ea192681-d039-42ec-b1bc-f3ce04c189ac";

const rawSchema = z.object({
  knr: z.string().regex(/^\d{4}$/),
  navn: z.string().nullable(),
  betjeningsgrad: z.enum(["Betjent", "Selvbetjent", "Ubetjent", "Rastebu", "Serveringshytte", "Gapahuk"]),
  hytteeier: z.enum(["1", "2", "3", "4"]),
  // Kodelisten «Tilgjengelighet»: Låst = låst og krever forhåndsbooking, Ulåst = ulåst eller
  // åpnes med DNTs standardnøkkel, Udefinert = ikke aktuelt.
  tilgjengelighet: z.enum(["Låst", "Ulåst", "Udefinert"]).nullable(),
  oppdateringsdato: z.string().nullable(),
  easting: z.number().finite(),
  northing: z.number().finite(),
});
type RawHut = z.infer<typeof rawSchema>;

const TYPE: Record<string, Pick<HutSourceAttributes, "hut_type" | "overnight">> = {
  Betjent: { hut_type: "staffed_hut", overnight: "yes" },
  Selvbetjent: { hut_type: "self_service_hut", overnight: "yes" },
  Ubetjent: { hut_type: "unstaffed_hut", overnight: "yes" },
  Rastebu: { hut_type: "rest_cabin", overnight: "no" },
};

/** Kildens kodeliste «Hytteeier». 2 er «Andre»: uspesifisert, f.eks. et utmarkslag eller en speidergruppe. */
const EIER: Record<RawHut["hytteeier"], NonNullable<HutSourceAttributes["owner_kind"]>> = {
  "1": "dnt",
  "2": "other",
  "3": "fjellstyre",
  "4": "statskog",
};

const UTELATT = new Set(["Serveringshytte", "Gapahuk"]);

const tag = (xml: string, name: string): string | null => {
  const match = new RegExp(`<app:${name}>([^<]*)</app:${name}>`).exec(xml);
  const value = match?.[1]?.trim();
  return value ? decodeXml(value) : null;
};

const decodeXml = (value: string) =>
  value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Hytteobjektene i én kommunes bygningsfil. Ren funksjon, slik at den kan testes uten nett. */
export function parseN50Huts(gml: string, knr: string): unknown[] {
  const huts: unknown[] = [];
  for (const block of gml.split("<gml:featureMember>")) {
    if (!block.includes("<app:hytteinformasjon>")) continue;
    // Øst-koordinaten er negativ vest for sone 33 sin nullmeridian: hele Vestlandet. Leses ikke
    // fortegnet, mister hytta posisjonen og avvises.
    const pos = /<gml:pos>\s*(-?[\d.]+)\s+(-?[\d.]+)\s*<\/gml:pos>/.exec(block);
    huts.push({
      knr,
      navn: tag(block, "navn"),
      betjeningsgrad: tag(block, "betjeningsgrad"),
      hytteeier: tag(block, "hytteeier"),
      tilgjengelighet: tag(block, "tilgjengelighet"),
      oppdateringsdato: tag(block, "oppdateringsdato"),
      easting: pos ? Number(pos[1]) : null,
      northing: pos ? Number(pos[2]) : null,
    });
  }
  return huts;
}

/** Kommunenummer → arkivet i UTM 33, lest fra ATOM-feeden. */
export function n50ArchiveUrls(feed: string): Map<string, string> {
  const urls = new Map<string, string>();
  for (const match of feed.matchAll(/href="(https:\/\/[^"]*\/Basisdata_(\d{4})_[^"]*_25833_N50Kartdata_GML\.zip)"/g)) {
    urls.set(match[2]!, match[1]!);
  }
  return urls;
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export class KartverketN50HytterProvider implements AreaFeatureProvider {
  readonly id = "kartverket-n50-hytter";
  readonly name = "Turisthytter i N50 Kartdata";
  readonly owner = "Kartverket";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Creative Commons Navngivelse 4.0 (CC BY 4.0)", url: "https://creativecommons.org/licenses/by/4.0/" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = "Hele landet.";
  readonly postSyncFn = HUT_REFRESH_FN;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = { ...DEFAULT_RETRY_POLICY, timeoutMs: 60_000 },
    /** Bare disse kommunene. Uten: alle kommunene i feeden, altså hele landet. */
    private readonly municipalities: readonly string[] | null = null,
  ) {}

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    const feed = await fetchGml(FEED, { retry: this.retry, signal: options.signal, fetchImpl: this.fetchImpl });
    const urls = n50ArchiveUrls(feed);

    // Feeden er fasiten på hvilke kommuner som finnes. Er den kortere enn landet, er det feeden
    // som er ufullstendig — da stopper vi, ellers ville hyttene i resten blitt markert som fjernet.
    if (!this.municipalities && urls.size < MIN_MUNICIPALITIES) {
      throw new Error(`N50-feeden har bare ${urls.size} kommuner, ventet minst ${MIN_MUNICIPALITIES}`);
    }

    for (const knr of this.municipalities ?? [...urls.keys()].sort()) {
      const url = urls.get(knr);
      // En kommune som mangler i feeden er et brudd på forutsetningen, ikke et tomt svar: da
      // ville hyttene der blitt markert som fjernet.
      if (!url) throw new Error(`N50-feeden har ikke kommune ${knr}`);
      const member = await readZipMember(url, (name) => /BygningerOgAnlegg.*\.gml$/i.test(name), {
        retry: this.retry,
        signal: options.signal,
        fetchImpl: this.fetchImpl,
      });
      if (!member) throw new Error(`Fant ikke bygningsfilen i N50-arkivet for kommune ${knr}`);
      yield { features: parseN50Huts(member.text, knr), documents: [] };
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];
    const godkjent: { raw: RawHut; navn: string; point: [number, number]; key: string }[] = [];

    for (const feature of batch.features) {
      const parsed = rawSchema.safeParse(feature);
      if (!parsed.success) {
        const navn = (feature as { navn?: unknown } | null)?.navn;
        rejected.push({
          kind: "feature",
          externalId: typeof navn === "string" ? navn : null,
          reason: parsed.error.issues[0]?.path.join(".") + ": " + parsed.error.issues[0]?.message,
        });
        continue;
      }
      const raw = parsed.data;
      const navn = raw.navn?.trim() ?? "";
      const point = utm33ToWgs84([raw.easting, raw.northing]);
      const key = `${raw.knr}:${slug(navn)}`;

      if (UTELATT.has(raw.betjeningsgrad)) {
        skipped.push({ kind: "feature", externalId: key, reason: `${raw.betjeningsgrad} tas ikke inn` });
      } else if (!inHutBounds(point)) {
        skipped.push({ kind: "feature", externalId: key, reason: "koordinat utenfor Norge" });
      } else if (!navn) {
        // Uten navn har vi verken noe å vise eller noe å nøkle på.
        skipped.push({ kind: "feature", externalId: null, reason: "hytte uten navn" });
      } else {
        godkjent.push({ raw, navn, point, key });
      }
    }

    // To hytter i samme kommune med samme navn skilles på posisjonen, avrundet til ti meter.
    const antall = new Map<string, number>();
    for (const { key } of godkjent) antall.set(key, (antall.get(key) ?? 0) + 1);

    const records = godkjent.map(({ raw, navn, point, key }): NormalizedAreaFeature => {
      const unik = (antall.get(key) ?? 0) > 1;
      const attributes: HutSourceAttributes = {
        ...TYPE[raw.betjeningsgrad]!,
        owner_kind: EIER[raw.hytteeier],
        manager_name: null,
        locked: raw.tilgjengelighet === "Låst" ? true : raw.tilgjengelighet === "Ulåst" ? false : null,
        beds: null,
        municipality_number: raw.knr,
        kilde_betjeningsgrad: raw.betjeningsgrad,
        kilde_hytteeier: raw.hytteeier,
      };
      return {
        providerId: this.id,
        externalId: unik ? `${key}@${Math.round(raw.easting / 10)}_${Math.round(raw.northing / 10)}` : key,
        category: HUT_SOURCE_CATEGORY,
        subtype: attributes.hut_type!,
        title: navn,
        geometry: { type: "Point", coordinates: [round6(point[0]), round6(point[1])] },
        attributes: { ...attributes } satisfies AreaAttributes,
        sourceUrl: DATASETT,
        sourceUrlType: "provider_page",
        sourceUpdatedAt: toIsoDate(raw.oppdateringsdato),
      };
    });

    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const feed = await fetchGml(FEED, { retry: this.retry, fetchImpl: this.fetchImpl });
      const urls = n50ArchiveUrls(feed);
      const mangler = (this.municipalities ?? []).filter((knr) => !urls.has(knr));
      const forFå = !this.municipalities && urls.size < MIN_MUNICIPALITIES;
      return {
        ok: mangler.length === 0 && !forFå,
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        message: forFå
          ? `Bare ${urls.size} kommunearkiv i feeden`
          : mangler.length === 0
            ? `${urls.size} kommunearkiv i feeden`
            : `Mangler i feeden: ${mangler.join(", ")}`,
      };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/** `2025-01-04` → ISO-tidspunkt. Alt annet enn en gyldig dato gir null. */
function toIsoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
