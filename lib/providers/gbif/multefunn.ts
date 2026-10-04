import { z } from "zod";
import { fetchJson } from "@/lib/http";
import { MULTE_BOKS, MULTEFUNN_PROVIDER, NATUR_INTERN } from "@/lib/multe/omrade";
import type { AreaFeatureProvider, NormalizeResult, ProviderHealth, RawBatch, RejectedRecord, SyncOptions } from "@/lib/providers/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";

/**
 * Registrerte funn av multe (Rubus chamaemorus) i Oslo og Marka, fra GBIF. Internt researchlag.
 *
 * KILDE: GBIF samler Artsobservasjoner, museenes feltnotater og herbarier, ANO m.fl. Samme
 * registreringer som Artskart. Hver registrering har sin egen lisens.
 *
 * UTVALG (samme som researchen, docs/research/multer-oslo.md):
 *   - til stede (ikke fraværsregistreringer)
 *   - år 2000 eller senere
 *   - oppgitt presisjon på 100 m eller bedre
 *   - CC BY 4.0 eller CC0. CC BY-NC (det meste av iNaturalist) tas ikke inn.
 *   - ikke Pl@ntNet: artsbestemmelsen der er gjort automatisk fra et bilde, ikke av et menneske.
 *   - én registrering per rute på 100 m: den nyeste, og ved likt år den med lavest GBIF-nøkkel.
 *     Utvalget er dermed det samme hver gang kilden er den samme.
 *
 * PERSONVERN: observatør og finner lagres ikke. Stedsbeskrivelsen (fritekst) lagres heller ikke.
 *
 * ET FUNN ER EN OBSERVASJON, IKKE EN BESTAND. Det sier at noen så planten der den dagen.
 *
 * Synkes ikke etter tidsplan: kjøres for hånd med `npm run sync:area -- --provider=<id>`.
 */
const TAXON = 2998290;
const API = "https://api.gbif.org/v1/occurrence/search";
const SIDE = 300;
/** GBIF hadde 919 registreringer i boksen i oktober 2026. Vesentlig flere betyr at spørringen er feil. */
const MAKS = 5000;

/** «Pl@ntNet automatically identified occurrences». Automatisk artsbestemt, og tas ikke inn. */
const AUTOMATISK_BESTEMT = new Set(["14d5676a-2c54-4f94-9023-1e8dcd822aa0"]);

const rawSchema = z.object({
  key: z.number().int().positive(),
  decimalLatitude: z.number().finite(),
  decimalLongitude: z.number().finite(),
  occurrenceStatus: z.string().optional(),
  year: z.number().int().optional(),
  month: z.number().int().optional(),
  eventDate: z.string().optional(),
  coordinateUncertaintyInMeters: z.number().optional(),
  license: z.string().optional(),
  datasetName: z.string().optional(),
  datasetKey: z.string().optional(),
  /** Lagt på av `fetch`: datasettets navn hos GBIF. */
  datasetTitle: z.string().nullable().optional(),
  institutionCode: z.string().optional(),
  basisOfRecord: z.string().optional(),
  references: z.string().optional(),
});
type RawFunn = z.infer<typeof rawSchema>;

/** Lisensene vi tar inn. Alt annet — også ukjent — utelates. */
export function aapenLisens(license: string | undefined): "CC BY 4.0" | "CC0" | null {
  if (!license) return null;
  if (/creativecommons\.org\/licenses\/by\/4\.0/.test(license)) return "CC BY 4.0";
  if (/creativecommons\.org\/publicdomain\/zero\/1\.0/.test(license)) return "CC0";
  return null;
}

const BASIS: Record<string, string> = { HUMAN_OBSERVATION: "observasjon", PRESERVED_SPECIMEN: "herbariebelegg", MATERIAL_SAMPLE: "prøve", OBSERVATION: "observasjon", OCCURRENCE: "registrering" };
const rute = (r: RawFunn) => `${Math.round((r.decimalLatitude * 111_320) / 100)}:${Math.round((r.decimalLongitude * 55_800) / 100)}`;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export class GbifMultefunnProvider implements AreaFeatureProvider {
  readonly id = MULTEFUNN_PROVIDER;
  readonly name = "Registrerte multefunn, Oslo og Marka";
  readonly owner = "GBIF (Artsobservasjoner, museer m.fl.)";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Per registrering: CC BY 4.0 eller CC0", url: "https://creativecommons.org/licenses/by/4.0/" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = "Internt researchlag. Oslo og Marka. Synkes for hånd.";

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  private side(offset: number, limit: number, signal?: AbortSignal) {
    const params = new URLSearchParams({
      taxonKey: String(TAXON),
      country: "NO",
      decimalLatitude: `${MULTE_BOKS.minLat},${MULTE_BOKS.maxLat}`,
      decimalLongitude: `${MULTE_BOKS.minLng},${MULTE_BOKS.maxLng}`,
      limit: String(limit),
      offset: String(offset),
    });
    return fetchJson(`${API}?${params}`, { timeoutMs: 60_000, retries: 2, fetchImpl: this.fetchImpl, signal }) as Promise<{ results?: unknown[]; endOfRecords?: boolean; count?: number }>;
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    // Én bolk: tynningen til én per rute må se alle registreringene samtidig.
    const alle: unknown[] = [];
    for (let offset = 0; ; offset += SIDE) {
      const svar = await this.side(offset, SIDE, options.signal);
      if (!Array.isArray(svar.results)) throw new Error("GBIF svarte uten resultatliste");
      alle.push(...svar.results);
      if (svar.endOfRecords) break;
      if (alle.length > MAKS) throw new Error(`GBIF ga over ${MAKS} registreringer — spørringen er ikke avgrenset som ventet`);
    }
    // Datasettets navn hos GBIF («Norwegian Species Observation Service»). Registreringen har bare
    // nøkkelen; uten navnet vet vi ikke hvem som skal krediteres.
    const titler = new Map<string, string | null>();
    for (const r of alle) {
      const key = (r as { datasetKey?: unknown } | null)?.datasetKey;
      if (typeof key !== "string" || titler.has(key)) continue;
      try {
        const d = (await fetchJson(`https://api.gbif.org/v1/dataset/${key}`, { timeoutMs: 30_000, retries: 2, fetchImpl: this.fetchImpl, signal: options.signal })) as { title?: unknown };
        titler.set(key, typeof d.title === "string" ? d.title : null);
      } catch {
        titler.set(key, null);
      }
    }
    yield { features: alle.map((r) => ({ ...(r as object), datasetTitle: titler.get((r as { datasetKey?: string }).datasetKey ?? "") ?? null })), documents: [] };
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];
    const brukbare: { raw: RawFunn; lisens: "CC BY 4.0" | "CC0" }[] = [];

    for (const feature of batch.features) {
      const parsed = rawSchema.safeParse(feature);
      if (!parsed.success) {
        const key = (feature as { key?: unknown } | null)?.key;
        rejected.push({ kind: "feature", externalId: typeof key === "number" ? String(key) : null, reason: parsed.error.issues[0]?.path.join(".") + ": " + parsed.error.issues[0]?.message });
        continue;
      }
      const raw = parsed.data;
      const id = String(raw.key);
      const lisens = aapenLisens(raw.license);
      const hopp = (reason: string) => skipped.push({ kind: "feature", externalId: id, reason });
      if (raw.occurrenceStatus !== "PRESENT") hopp("ikke registrert som til stede");
      else if (raw.year === undefined || raw.year < 2000) hopp("fra før 2000 eller uten år");
      else if (raw.coordinateUncertaintyInMeters === undefined || raw.coordinateUncertaintyInMeters > 100) hopp("presisjon dårligere enn 100 m eller ikke oppgitt");
      else if (!lisens) hopp("lisensen er ikke CC BY 4.0 eller CC0");
      else if (raw.datasetKey && AUTOMATISK_BESTEMT.has(raw.datasetKey)) hopp("automatisk artsbestemt (Pl@ntNet)");
      else brukbare.push({ raw, lisens });
    }

    // Nyeste først, så lavest nøkkel: den første i hver rute er den vi beholder.
    brukbare.sort((a, b) => b.raw.year! - a.raw.year! || a.raw.key - b.raw.key);
    const ruter = new Map<string, { valgt: (typeof brukbare)[number]; antall: number }>();
    for (const funn of brukbare) {
      const r = ruter.get(rute(funn.raw));
      if (r) {
        r.antall++;
        skipped.push({ kind: "feature", externalId: String(funn.raw.key), reason: "flere funn i samme 100 m-rute" });
      } else ruter.set(rute(funn.raw), { valgt: funn, antall: 1 });
    }

    const records = [...ruter.values()].map(({ valgt: { raw, lisens }, antall }): NormalizedAreaFeature => ({
      providerId: this.id,
      externalId: String(raw.key),
      category: NATUR_INTERN,
      subtype: "multefunn",
      title: "Multe",
      geometry: { type: "Point", coordinates: [round6(raw.decimalLongitude), round6(raw.decimalLatitude)] },
      attributes: {
        aar: raw.year!,
        maaned: raw.month ?? null,
        // Bare datoen. Klokkeslett og intervaller i kilden sier ikke noe vi bruker.
        dato: raw.eventDate && /^\d{4}-\d{2}-\d{2}/.test(raw.eventDate) ? raw.eventDate.slice(0, 10) : null,
        presisjonM: Math.round(raw.coordinateUncertaintyInMeters!),
        // Hvem registreringen kommer fra (GBIF-datasettet), og prosjektet den er registrert i.
        datasett: raw.datasetTitle ?? null,
        prosjekt: raw.datasetName ?? null,
        institusjon: raw.institutionCode ?? null,
        type: BASIS[raw.basisOfRecord ?? ""] ?? null,
        lisens,
        funnIRuta: antall,
      },
      sourceUrl: `https://www.gbif.org/occurrence/${raw.key}`,
      sourceUrlType: "provider_page",
      sourceUpdatedAt: null,
    }));

    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      const svar = await this.side(0, 0);
      return { ok: typeof svar.count === "number" && svar.count > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: `${svar.count ?? 0} registreringer i GBIF for Oslo og Marka` };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}
