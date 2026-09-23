import { describe, expect, it, vi } from "vitest";
import realPage from "../fixtures/dibk/planomrade-majorstuen.json";
import { createFakeDibk, fakeDocument, fakeFeature, TEST_RETRY } from "../helpers/fake-dibk";
import { DibkPageError, DibkPlanningStartedProvider } from "@/lib/providers/dibk/planning-started";
import type { RawBatch } from "@/lib/providers/types";

async function collect(provider: DibkPlanningStartedProvider, options: Parameters<DibkPlanningStartedProvider["fetch"]>[0]) {
  const all: RawBatch = { features: [], documents: [] };
  for await (const batch of provider.fetch(options)) {
    all.features.push(...batch.features);
    all.documents.push(...batch.documents);
  }
  return all;
}

describe("DibkPlanningStartedProvider.fetch — full", () => {
  it("paginerer med maks 500 per side til siste side", async () => {
    const features = Array.from({ length: 1100 }, (_, i) => fakeFeature({ id: i + 1, arealplan: i + 1 }));
    const { fetchImpl, requests } = createFakeDibk({ features, documents: [] });
    const batch = await collect(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), { mode: "full" });

    expect(batch.features).toHaveLength(1100);
    const planPages = requests.filter((u) => u.pathname.endsWith("planomrade/items"));
    expect(planPages.map((u) => [u.searchParams.get("offset"), u.searchParams.get("limit")])).toEqual([
      ["0", "500"],
      ["500", "500"],
      ["1000", "500"],
    ]);
  });

  it("stopper når en side er akkurat full og neste er tom", async () => {
    const features = Array.from({ length: 500 }, (_, i) => fakeFeature({ id: i + 1, arealplan: i + 1 }));
    const { fetchImpl, requests } = createFakeDibk({ features, documents: [] });
    await collect(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), { mode: "full" });
    expect(requests.filter((u) => u.pathname.endsWith("planomrade/items"))).toHaveLength(2);
  });

  it("henter dokumenter KUN med dokumenttype fra allowlisten", async () => {
    const { fetchImpl, requests } = createFakeDibk({ features: [], documents: [] });
    await collect(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), { mode: "full" });
    const docRequests = requests.filter((u) => u.pathname.endsWith("plandokument/items"));
    expect(docRequests.map((u) => u.searchParams.get("dokumenttype")).sort()).toEqual([
      "PlanomraadePdf",
      "ReferatOppstartsmoete",
      "ref-data-as-pdf",
    ]);
    expect(docRequests.every((u) => u.searchParams.has("dokumenttype"))).toBe(true);
  });

  it("prøver på nytt ved 503 og lykkes", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      return calls === 1
        ? new Response("{}", { status: 503 })
        : new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    const provider = new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY);
    const pages = [];
    for await (const p of provider.pages("https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/planomrade/items")) pages.push(p);
    expect(calls).toBe(2);
  });

  it("gir opp etter timeout på alle forsøk", async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
        }),
    ) as unknown as typeof fetch;
    const provider = new DibkPlanningStartedProvider(fetchImpl, { timeoutMs: 20, maxRetries: 2, baseDelayMs: 1 });
    await expect(collect(provider, { mode: "full" })).rejects.toMatchObject({ name: "TimeoutError" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("prøver ikke på nytt ved 4xx", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 400 })) as unknown as typeof fetch;
    await expect(collect(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), { mode: "full" })).rejects.toThrow("HTTP 400");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("behandler en HTML-feilside som fatal (ingen delvis full sync)", async () => {
    const fetchImpl = vi.fn(async () => new Response("<!doctype html>500", { status: 200 })) as unknown as typeof fetch;
    await expect(collect(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), { mode: "full" })).rejects.toThrow();
    const jsonButWrong = vi.fn(async () => new Response(JSON.stringify({ foo: 1 }), { status: 200 })) as unknown as typeof fetch;
    await expect(collect(new DibkPlanningStartedProvider(jsonButWrong, TEST_RETRY), { mode: "full" })).rejects.toBeInstanceOf(DibkPageError);
  });
});

describe("DibkPlanningStartedProvider.fetch — incremental", () => {
  it("bruker CQL på oppdateringsdato og henter komplette grupper per arealplan", async () => {
    const features = [
      fakeFeature({ id: 1, arealplan: 10, updated: "2026-01-01T00:00:00Z" }),
      fakeFeature({ id: 2, arealplan: 20, updated: "2026-09-20T00:00:00Z" }),
      // Samme plan, eldre fragment — må likevel med, ellers mister vi et polygon.
      fakeFeature({ id: 3, arealplan: 20, updated: "2026-02-01T00:00:00Z" }),
    ];
    const documents = [
      fakeDocument({ id: 100, arealplan: 20, type: "PlanomraadePdf" }),
      fakeDocument({ id: 101, arealplan: 20, type: null, title: "beroerteParter.json", mimeType: "application/json" }),
      fakeDocument({ id: 102, arealplan: 10, type: "PlanomraadePdf" }),
    ];
    const { fetchImpl, requests } = createFakeDibk({ features, documents });
    const batch = await collect(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), {
      mode: "incremental",
      since: new Date("2026-09-01T00:00:00Z"),
    });

    expect(requests[0]!.searchParams.get("filter")).toBe("oppdateringsdato>'2026-09-01T00:00:00Z'");
    expect(batch.features.map((f) => (f as { id: number }).id).sort()).toEqual([2, 3]);
    expect(batch.documents.map((d) => (d as { id: number }).id)).toEqual([100]);

    const docRequests = requests.filter((u) => u.pathname.endsWith("plandokument/items"));
    expect(docRequests.length).toBeGreaterThan(0);
    expect(docRequests.every((u) => u.searchParams.get("arealplan") === "20" && u.searchParams.has("dokumenttype"))).toBe(true);
  });

  it("krever since", async () => {
    const { fetchImpl } = createFakeDibk({ features: [], documents: [] });
    await expect(collect(new DibkPlanningStartedProvider(fetchImpl, TEST_RETRY), { mode: "incremental" })).rejects.toThrow("since");
  });
});

describe("DibkPlanningStartedProvider.normalize", () => {
  const provider = new DibkPlanningStartedProvider();

  it("normaliserer ekte DiBK-features (fixture) uten avvisning", () => {
    const { records: events, rejected } = provider.normalize({ features: realPage.features, documents: [] });
    expect(rejected).toEqual([]);
    const hegdehaugsveien = events.find((e) => e.externalId === "2053")!;
    expect(hegdehaugsveien).toMatchObject({
      providerId: "dibk-planning-started",
      type: "planning_started",
      title: "Nedre del av Hegdehaugsveien",
      municipalityNumber: "0301",
      announcedAt: "2026-08-28",
      sourceUpdatedAt: "2026-08-28T08:35:39.598000+00:00",
      sourceUrl: "https://innsyn.pbe.oslo.kommune.no/saksinnsyn/casedet.asp?caseno=202602282",
      sourceUrlType: "municipal",
      attributes: { plantype: "Detaljregulering", planId: "2026/02282", proposerType: "Foretak" },
    });
    expect(hegdehaugsveien.geometry.type).toBe("Polygon");
  });

  it("avviser ugyldige features uten å stoppe resten, med kort årsak", () => {
    const good = fakeFeature({ id: 1, arealplan: 1 });
    const noGeometry = { ...fakeFeature({ id: 2, arealplan: 2 }), geometry: null };
    const badDate = fakeFeature({ id: 3, arealplan: 3, announced: "12.09.2026" });
    const blankName = fakeFeature({ id: 4, arealplan: 4, name: "   " });
    const { records: events, rejected } = provider.normalize({ features: [good, noGeometry, badDate, blankName, "tull"], documents: [] });

    expect(events.map((e) => e.externalId)).toEqual(["1"]);
    expect(rejected.map((r) => r.externalId)).toEqual(["2", "3", "4", null]);
    expect(rejected.every((r) => r.kind === "feature" && r.reason.length < 300)).toBe(true);
  });

  it("bruker DiBK-siden når link er tom eller fritekst — og gjetter aldri URL", () => {
    const { records: events } = provider.normalize({
      features: [
        fakeFeature({ id: 1, arealplan: 11, link: "" }),
        fakeFeature({ id: 2, arealplan: 12, link: "Se vedlegg" }),
        fakeFeature({ id: 3, arealplan: 13, link: "www.oslo.kommune.no/saksinnsyn." }),
        fakeFeature({ id: 4, arealplan: 14, link: "https://www.arealplaner.no/nesodden3212" }),
      ],
      documents: [],
    });
    const byId = Object.fromEntries(events.map((e) => [e.externalId, e]));
    for (const id of ["11", "12", "13"]) {
      expect(byId[id]).toMatchObject({
        sourceUrl: `https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/${id}?f=html`,
        sourceUrlType: "provider_page",
      });
    }
    expect(byId["14"]).toMatchObject({ sourceUrl: "https://www.arealplaner.no/nesodden3212", sourceUrlType: "municipal" });
  });

  it("knytter kun tillatte dokumenter til riktig plan og blokkerer berørte parter", () => {
    const { records: events } = provider.normalize({
      features: [fakeFeature({ id: 1, arealplan: 7 }), fakeFeature({ id: 2, arealplan: 8 })],
      documents: [
        fakeDocument({ id: 1, arealplan: 7, type: "ref-data-as-pdf", title: "Varsel om oppstart av planarbeid.pdf" }),
        fakeDocument({ id: 2, arealplan: 7, type: null, title: "beroerteParter.json", mimeType: "application/json" }),
        fakeDocument({ id: 3, arealplan: 7, type: "PlanomraadePdf", title: "Liste over berørte parter.pdf" }),
        fakeDocument({ id: 4, arealplan: 7, type: "Annet" }),
        fakeDocument({ id: 5, arealplan: 8, type: "ReferatOppstartsmoete" }),
      ],
    });
    const byId = Object.fromEntries(events.map((e) => [e.externalId, e]));
    expect(byId["7"]!.documents.map((d) => d.externalId)).toEqual(["1"]);
    expect(byId["8"]!.documents.map((d) => d.type)).toEqual(["ReferatOppstartsmoete"]);
    const everything = JSON.stringify(events);
    expect(everything).not.toMatch(/beroert|berørt/i);
  });

  it("avviser dokumenter med URL utenfor DiBK", () => {
    const doc = fakeDocument({ id: 9, arealplan: 7, type: "PlanomraadePdf" });
    doc.properties.referanseDokumentfil = "https://example.com/fil.pdf";
    const { records: events, rejected } = provider.normalize({ features: [fakeFeature({ id: 1, arealplan: 7 })], documents: [doc] });
    expect(events[0]!.documents).toEqual([]);
    expect(rejected).toEqual([{ kind: "document", externalId: "7", reason: "ugyldig dokument-URL" }]);
  });

  it("lagrer kun plan-metadata i rawData", () => {
    const { records: events } = provider.normalize({ features: [fakeFeature({ id: 5, arealplan: 9 })], documents: [] });
    expect(Object.keys(events[0]!.rawData).sort()).toEqual(["featureId", "properties"]);
    expect(JSON.stringify(events[0]!.rawData)).not.toContain("coordinates");
  });
});
