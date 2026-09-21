import type { NormalizedDocument } from "@/types/document";
import type { NormalizedEvent } from "@/types/event";
import { fetchJson } from "@/lib/http";
import { toSafeHttpUrl } from "@/lib/url";
import { DEFAULT_RETRY_POLICY } from "@/lib/sync/types";
import type {
  DataProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "../types";
import { DIBK_PAGE_LIMIT, DIBK_PLANNING_STARTED_BASE_URL, dibkArealplanPageUrl } from "./constants";
import { DIBK_ALLOWED_DOCUMENT_TYPES, isAllowedDocument } from "./documents";
import {
  featureCollectionPageSchema,
  plandokumentFeatureSchema,
  planomradeFeatureSchema,
  type PlandokumentFeature,
} from "./schema";

/** Sikkerhetsgrense mot uendelig paginering hvis API-et oppfører seg uventet. */
const MAX_PAGES = 200;
/** Parallelle kall ved incremental sync (per arealplan). */
const INCREMENTAL_CONCURRENCY = 4;

const PLANOMRADE_URL = `${DIBK_PLANNING_STARTED_BASE_URL}/collections/planomrade/items`;
const PLANDOKUMENT_URL = `${DIBK_PLANNING_STARTED_BASE_URL}/collections/plandokument/items`;

export class DibkPageError extends Error {
  constructor(url: string, reason: string) {
    super(`Ugyldig side fra DiBK (${new URL(url).pathname.split("/").slice(-2).join("/")}): ${reason}`);
    this.name = "DibkPageError";
  }
}

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.map(String).join(".") || "(rot)"}: ${issue.message}`)
    .join("; ");
}

/** Leser arealplan-ID fra en rå feature uten å stole på resten av strukturen. */
function peekArealplan(raw: unknown): string | null {
  const value = (raw as { properties?: { arealplan?: unknown } } | null)?.properties?.arealplan;
  return typeof value === "number" && Number.isInteger(value) ? String(value) : null;
}

/** Dokument-URL må være https hos DiBK (verifisert nedlastingstjeneste). */
function toVerifiedDocumentUrl(value: string): string | null {
  const url = toSafeHttpUrl(value);
  if (!url) return null;
  const { protocol, hostname } = new URL(url);
  return protocol === "https:" && (hostname === "dibk.no" || hostname.endsWith(".dibk.no")) ? url : null;
}

/**
 * DiBK «Planlegging igangsatt» — collection `planomrade` + tillatte `plandokument`.
 *
 * - full: alle planomrade-sider + alle dokumenter av tillatte typer (server-side filter per type)
 * - incremental: planomrade med CQL `oppdateringsdato > since`, deretter komplette grupper
 *   (`?arealplan=`) og tillatte dokumenter for de berørte planene
 *
 * Dokumenter hentes KUN med `dokumenttype=<allowlist>`, slik at berørte parter aldri forespørres.
 */
export class DibkPlanningStartedProvider implements DataProvider {
  readonly id = "dibk-planning-started";
  readonly name = "Planlegging igangsatt";
  readonly owner = "Direktoratet for byggkvalitet";
  readonly eventTypes = ["planning_started"] as const;
  readonly license = {
    name: "Norsk lisens for offentlige data (NLOD) 2.0",
    url: "https://data.norge.no/nlod/no/2.0",
  };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry = DEFAULT_RETRY_POLICY,
  ) {}

  private get(url: string, signal?: AbortSignal) {
    return fetchJson(url, {
      timeoutMs: this.retry.timeoutMs,
      retries: this.retry.maxRetries,
      baseDelayMs: this.retry.baseDelayMs,
      signal,
      fetchImpl: this.fetchImpl,
    });
  }

  /** Henter alle sider for en items-URL. Ugyldig side er fatal (vi kan ikke vite hva som mangler). */
  async *pages(baseUrl: string, signal?: AbortSignal): AsyncGenerator<unknown[]> {
    for (let page = 0, offset = 0; page < MAX_PAGES; page++) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const url = `${baseUrl}${separator}f=json&limit=${DIBK_PAGE_LIMIT}&offset=${offset}`;
      const parsed = featureCollectionPageSchema.safeParse(await this.get(url, signal));
      if (!parsed.success) throw new DibkPageError(url, describeIssues(parsed.error));
      const { features } = parsed.data;
      if (features.length > 0) yield features;
      if (features.length < DIBK_PAGE_LIMIT) return;
      offset += features.length;
    }
    throw new DibkPageError(baseUrl, `mer enn ${MAX_PAGES} sider`);
  }

  private async collect(baseUrl: string, signal?: AbortSignal): Promise<unknown[]> {
    const all: unknown[] = [];
    for await (const page of this.pages(baseUrl, signal)) all.push(...page);
    return all;
  }

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    const { signal } = options;

    if (options.mode === "full") {
      for await (const features of this.pages(PLANOMRADE_URL, signal)) yield { features, documents: [] };
      for (const type of DIBK_ALLOWED_DOCUMENT_TYPES) {
        for await (const documents of this.pages(`${PLANDOKUMENT_URL}?dokumenttype=${encodeURIComponent(type)}`, signal)) {
          yield { features: [], documents };
        }
      }
      return;
    }

    if (!options.since) throw new Error("Incremental sync krever «since»");
    const since = options.since.toISOString().replace(/\.\d{3}Z$/, "Z");
    const filter = encodeURIComponent(`oppdateringsdato>'${since}'`);
    const changed = await this.collect(`${PLANOMRADE_URL}?filter=${filter}`, signal);

    const arealplanIds = [...new Set(changed.map(peekArealplan).filter((id): id is string => id !== null))];
    // Ugyldige endrede features uten arealplan sendes videre, slik at de telles som avvist.
    const orphans = changed.filter((raw) => peekArealplan(raw) === null);
    if (orphans.length > 0) yield { features: orphans, documents: [] };

    // Hent komplette grupper, slik at ingen polygoner mangler når sync-laget slår sammen.
    for (let i = 0; i < arealplanIds.length; i += INCREMENTAL_CONCURRENCY) {
      const chunk = arealplanIds.slice(i, i + INCREMENTAL_CONCURRENCY);
      const batches = await Promise.all(
        chunk.map(async (id) => {
          const [features, ...documentLists] = await Promise.all([
            this.collect(`${PLANOMRADE_URL}?arealplan=${id}`, signal),
            ...DIBK_ALLOWED_DOCUMENT_TYPES.map((type) =>
              this.collect(`${PLANDOKUMENT_URL}?arealplan=${id}&dokumenttype=${encodeURIComponent(type)}`, signal),
            ),
          ]);
          return { features, documents: documentLists.flat() };
        }),
      );
      for (const batch of batches) yield batch;
    }
  }

  normalize(batch: RawBatch): NormalizeResult {
    const rejected: RejectedRecord[] = [];
    const documentsByPlan = new Map<number, NormalizedDocument[]>();

    for (const raw of batch.documents) {
      const parsed = plandokumentFeatureSchema.safeParse(raw);
      if (!parsed.success) {
        rejected.push({ kind: "document", externalId: peekArealplan(raw), reason: describeIssues(parsed.error) });
        continue;
      }
      const doc = parsed.data;
      // Andre forsvarslag etter server-side filteret: aldri berørte parter eller ukjente typer.
      if (!isAllowedDocument(doc.properties)) continue;
      const normalized = this.normalizeDocument(doc);
      if (!normalized) {
        rejected.push({ kind: "document", externalId: String(doc.properties.arealplan), reason: "ugyldig dokument-URL" });
        continue;
      }
      const list = documentsByPlan.get(doc.properties.arealplan) ?? [];
      list.push(normalized);
      documentsByPlan.set(doc.properties.arealplan, list);
    }

    const events: NormalizedEvent[] = [];
    for (const raw of batch.features) {
      const parsed = planomradeFeatureSchema.safeParse(raw);
      if (!parsed.success) {
        rejected.push({ kind: "feature", externalId: peekArealplan(raw), reason: describeIssues(parsed.error) });
        continue;
      }
      const { id: featureId, geometry, properties: p } = parsed.data;
      const title = p.plannavn.trim().replace(/\s+/g, " ");
      if (!title) {
        rejected.push({ kind: "feature", externalId: String(p.arealplan), reason: "plannavn mangler" });
        continue;
      }
      const municipalUrl = toSafeHttpUrl(p.link);

      events.push({
        providerId: this.id,
        externalId: String(p.arealplan),
        type: "planning_started",
        title,
        geometry,
        municipalityNumber: p.nasjonalArealplanId.kommunenummer,
        municipalityName: null, // DiBK leverer ikke kommunenavn
        announcedAt: p.kunngjøringsdatoVarselOmPlanoppstart,
        sourceUpdatedAt: p.oppdateringsdato,
        sourceUrl: municipalUrl ?? dibkArealplanPageUrl(p.arealplan),
        sourceUrlType: municipalUrl ? "municipal" : "provider_page",
        attributes: {
          plantype: p.plantype,
          planId: p.nasjonalArealplanId.planid,
          proposerType: p.forslagsstillertype,
        },
        documents: documentsByPlan.get(p.arealplan) ?? [],
        rawData: {
          featureId,
          // Kun plan-metadata. Geometri lagres separat; dokumentinnhold og berørte parter aldri.
          properties: {
            plannavn: p.plannavn,
            plantype: p.plantype,
            kunngjøringsdatoVarselOmPlanoppstart: p.kunngjøringsdatoVarselOmPlanoppstart,
            oppdateringsdato: p.oppdateringsdato,
            nasjonalArealplanId: p.nasjonalArealplanId,
            forslagsstillertype: p.forslagsstillertype,
            lovreferanse: p.lovreferanse,
            link: p.link,
            identifikasjon: p.identifikasjon,
          },
        },
      });
    }

    return { events, rejected };
  }

  private normalizeDocument(doc: PlandokumentFeature): NormalizedDocument | null {
    const url = toVerifiedDocumentUrl(doc.properties.referanseDokumentfil);
    if (!url || !doc.properties.dokumenttype) return null;
    return {
      externalId: String(doc.id),
      type: doc.properties.dokumenttype,
      title: doc.properties.tittel.trim(),
      url,
      mimeType: doc.properties.mimeType,
      documentDate: doc.properties.dokumentetsDato,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    const checkedAt = new Date().toISOString();
    try {
      const parsed = featureCollectionPageSchema.safeParse(
        await fetchJson(`${PLANOMRADE_URL}?f=json&limit=1`, { timeoutMs: 10_000, fetchImpl: this.fetchImpl }),
      );
      return {
        ok: parsed.success,
        checkedAt,
        latencyMs: Math.round(performance.now() - started),
        message: parsed.success ? `${parsed.data.numberMatched ?? "?"} planområder i kilden` : "Uventet svarformat",
      };
    } catch (error) {
      return {
        ok: false,
        checkedAt,
        latencyMs: Math.round(performance.now() - started),
        message: error instanceof Error ? error.name : "Ukjent feil",
      };
    }
  }
}
