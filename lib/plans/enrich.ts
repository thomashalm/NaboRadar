import type { Db } from "@/lib/db";
import { FORMAAL_DOKUMENTTYPER, finnFormaalIDokumenter, type DokumentTekst } from "./formaal";
import { pdfTekst } from "./pdf-text";
import { klassifiserTiltak } from "./tiltakstype";

/**
 * Versjonen av reglene i lib/plans (tiltakstype.ts og formaal.ts). Øk den når et mønster, et
 * filter eller prioriteringen endres: da leses alle saker på nytt ved neste kjøring.
 */
export const PLAN_PARSER_VERSION = 2;

/** Et dokument over denne størrelsen lastes ikke ned. Planinitiativer er sjelden over noen MB. */
const MAKS_BYTES = 30 * 1024 * 1024;
const NEDLASTING_TIMEOUT_MS = 45_000;
/** Dokumenter per sak vi leser. Flere enn dette er vedlegg og gjentatte varsler. */
const MAKS_DOKUMENTER_PER_SAK = 6;
const SAMTIDIGE_SAKER = 4;

interface KøRad {
  event_id: string;
  title: string;
  fingerprint: string;
  documents: { external_id: string; type: string; url: string; mime_type: string | null; document_date: string | null }[];
}

export interface PlanEnrichmentResult {
  /** Saker som manglet uttrekk eller var endret. */
  pending: number;
  processed: number;
  withPurpose: number;
  withType: number;
  /** Dokumenter som ikke kunne lastes ned. Saken får likevel tiltakstype fra tittelen. */
  failedDownloads: number;
  /** Dokumenter uten tekstlag (skannet) eller som ikke kunne leses. */
  unreadable: number;
}

export interface PlanEnrichmentOptions {
  limit?: number;
  batchSize?: number;
  fetchImpl?: typeof fetch;
  /** Leser tekstlaget. Byttes ut i tester. */
  readPdf?: (data: Uint8Array) => Promise<string | null>;
  pauseMs?: number;
  onProgress?: (done: number, total: number) => void;
}

const erDibk = (url: string) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (hostname === "dibk.no" || hostname.endsWith(".dibk.no"));
  } catch {
    return false;
  }
};

/**
 * Trekker ut tiltakstype og formål for plansakene som mangler det, og lagrer resultatet.
 *
 * Kjøres etter synken. Dokumentene lastes ned fra DiBK, tekstlaget leses, og teksten kastes igjen
 * når setningen er funnet: bare tiltakstypen, formålssetningen og en referanse til dokumentet
 * lagres. Feiler en nedlasting, lagres ikke saken, og den prøves igjen ved neste kjøring.
 */
export async function enrichPlans(db: Db, options: PlanEnrichmentOptions = {}): Promise<PlanEnrichmentResult> {
  const { limit = 300, batchSize = 20, fetchImpl = fetch, readPdf = pdfTekst, pauseMs = 0 } = options;
  const kø = await db.rpc<KøRad>("events_for_enrichment", { p_parser_version: PLAN_PARSER_VERSION, p_limit: limit });
  const result: PlanEnrichmentResult = { pending: kø.length, processed: 0, withPurpose: 0, withType: 0, failedDownloads: 0, unreadable: 0 };

  /** Leser én sak. null betyr «prøv igjen senere»: en nedlasting feilet og vi fant ikke formålet. */
  const les = async (sak: KøRad): Promise<Record<string, unknown> | null> => {
    const tekster: DokumentTekst[] = [];
    let nedlastingFeilet = false;

    const aktuelle = sak.documents
      .filter((d) => (FORMAAL_DOKUMENTTYPER as readonly string[]).includes(d.type) && d.mime_type === "application/pdf" && erDibk(d.url))
      .slice(0, MAKS_DOKUMENTER_PER_SAK);
    for (const dokument of aktuelle) {
      try {
        const response = await fetchImpl(dokument.url, { signal: AbortSignal.timeout(NEDLASTING_TIMEOUT_MS) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const lengde = Number(response.headers.get("content-length") ?? 0);
        if (lengde > MAKS_BYTES) continue;
        const data = new Uint8Array(await response.arrayBuffer());
        if (data.byteLength > MAKS_BYTES) continue;
        const text = await readPdf(data);
        if (text) tekster.push({ id: dokument.external_id, type: dokument.type, date: dokument.document_date, text });
        else result.unreadable++;
      } catch {
        nedlastingFeilet = true;
        result.failedDownloads++;
      }
      if (pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }

    const formaal = finnFormaalIDokumenter(tekster);
    // Uten formål og med en feilet nedlasting vet vi ikke om dokumentet hadde svaret. Prøv igjen.
    if (!formaal && nedlastingFeilet) return null;

    const tiltak = klassifiserTiltak({ title: sak.title, formaal: formaal?.formaal });
    result.processed++;
    if (formaal) result.withPurpose++;
    if (tiltak.type !== "annet") result.withType++;
    return {
      event_id: sak.event_id,
      parser_version: PLAN_PARSER_VERSION,
      documents_fingerprint: sak.fingerprint,
      measure_type: tiltak.type,
      measure_type_source: tiltak.kilde,
      purpose: formaal?.formaal ?? null,
      purpose_document_external_id: formaal?.documentId ?? null,
      purpose_document_type: formaal?.documentType ?? null,
      purpose_method: formaal?.metode ?? null,
    };
  };

  for (let start = 0; start < kø.length; start += batchSize) {
    const gruppe = kø.slice(start, start + batchSize);
    const rader: Record<string, unknown>[] = [];
    // Noen få saker om gangen: rask nok til 1 500 saker, uten å belaste DiBKs nedlastingstjeneste.
    for (let i = 0; i < gruppe.length; i += SAMTIDIGE_SAKER) {
      const lest = await Promise.all(gruppe.slice(i, i + SAMTIDIGE_SAKER).map(les));
      rader.push(...lest.filter((rad): rad is Record<string, unknown> => rad !== null));
    }
    if (rader.length > 0) await db.rpc("upsert_event_enrichment", { p_rows: rader });
    options.onProgress?.(Math.min(start + batchSize, kø.length), kø.length);
  }
  return result;
}

export function formatPlanEnrichmentResult(r: PlanEnrichmentResult): string {
  if (r.pending === 0) return "Plansaker: ingen nye eller endrede saker å lese.";
  return [
    `Plansaker: ${r.processed} av ${r.pending} lest`,
    `${r.withPurpose} med formål`,
    `${r.withType} med tiltakstype`,
    r.unreadable > 0 ? `${r.unreadable} dokumenter uten tekstlag` : null,
    r.failedDownloads > 0 ? `${r.failedDownloads} nedlastinger feilet (prøves igjen)` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
