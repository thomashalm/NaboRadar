import { DIBK_PAGE_LIMIT } from "@/lib/providers/dibk/constants";

/**
 * Minimal falsk DiBK OGC API for tester. Oppfører seg som verifisert i discovery:
 * offset/limit (maks 500), property-filter (arealplan, dokumenttype) og CQL oppdateringsdato>'…'.
 */

export interface FakeFeatureInput {
  id: number;
  arealplan: number;
  name?: string;
  /** Senter for et lite kvadratisk polygon (lon, lat). */
  center?: [number, number];
  sizeDeg?: number;
  announced?: string | null;
  updated?: string | null;
  link?: string | null;
  kommunenummer?: string;
}

export function fakeFeature(input: FakeFeatureInput) {
  const [x, y] = input.center ?? [10.75, 59.91];
  const d = input.sizeDeg ?? 0.001;
  return {
    type: "Feature",
    id: input.id,
    geometry: {
      type: "Polygon",
      coordinates: [[[x - d, y - d], [x + d, y - d], [x + d, y + d], [x - d, y + d], [x - d, y - d]]],
    },
    properties: {
      identifikasjon: { lokalId: `lok-${input.id}`, navnerom: "test", versjonId: "v1" },
      arealplan: input.arealplan,
      førsteDigitaliseringsdato: null,
      nasjonalArealplanId: { planid: "2026/1", kommunenummer: input.kommunenummer ?? "0301" },
      plannavn: input.name ?? `Plan ${input.arealplan}`,
      plantype: "Detaljregulering",
      kunngjøringsdatoVarselOmPlanoppstart: input.announced === undefined ? "2026-05-01" : input.announced,
      forslagsstillertype: "Foretak",
      lovreferanse: null,
      oppdateringsdato: input.updated === undefined ? "2026-05-01T10:00:00+00:00" : input.updated,
      link: input.link === undefined ? "" : input.link,
      linkArealplan: "",
      linkPlandokumenter: "",
    },
  };
}

export function fakeDocument(input: { id: number; arealplan: number; type: string | null; title?: string; mimeType?: string }) {
  return {
    type: "Feature",
    geometry: null,
    id: input.id,
    properties: {
      referanseDokumentfil: `https://plandata.ft.dibk.no/services/download/planleggingigangsatt/x/${input.id}`,
      sjekksum: "abc",
      sjekksumAlgoritme: "SHA-256",
      tittel: input.title ?? `Dokument ${input.id}.pdf`,
      mimeType: input.mimeType ?? "application/pdf",
      dokumenttype: input.type,
      dokumentetsDato: "2026-05-01",
      arealplan: input.arealplan,
    },
  };
}

export interface FakeDibkState {
  features: ReturnType<typeof fakeFeature>[];
  documents: ReturnType<typeof fakeDocument>[];
}

function page(items: unknown[], url: URL) {
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), DIBK_PAGE_LIMIT);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const features = items.slice(offset, offset + limit);
  return { type: "FeatureCollection", features, numberMatched: items.length, numberReturned: features.length, links: [] };
}

/** Returnerer fetch-implementasjon + logg over forespurte URL-er. */
export function createFakeDibk(state: FakeDibkState) {
  const requests: URL[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requests.push(url);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

    if (url.pathname.endsWith("/collections/planomrade/items")) {
      let items = state.features;
      const arealplan = url.searchParams.get("arealplan");
      if (arealplan) items = items.filter((f) => String(f.properties.arealplan) === arealplan);
      const filter = url.searchParams.get("filter");
      if (filter) {
        const match = /^oppdateringsdato>'(.+)'$/.exec(filter);
        if (!match) return json({ error: "bad filter" }, 500);
        const since = Date.parse(match[1]!);
        items = items.filter((f) => f.properties.oppdateringsdato !== null && Date.parse(f.properties.oppdateringsdato) > since);
      }
      return json(page(items, url));
    }

    if (url.pathname.endsWith("/collections/plandokument/items")) {
      let items = state.documents;
      const type = url.searchParams.get("dokumenttype");
      if (type) items = items.filter((d) => d.properties.dokumenttype === type);
      const arealplan = url.searchParams.get("arealplan");
      if (arealplan) items = items.filter((d) => String(d.properties.arealplan) === arealplan);
      return json(page(items, url));
    }

    return json({ error: "not found" }, 404);
  }) as typeof fetch;

  return { fetchImpl, requests };
}

/** Rask retry-policy for tester. */
export const TEST_RETRY = { timeoutMs: 200, maxRetries: 2, baseDelayMs: 1 };
