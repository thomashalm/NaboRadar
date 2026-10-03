import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { enrichPlans, formatPlanEnrichmentResult, PLAN_PARSER_VERSION } from "@/lib/plans/enrich";

const SKJEMA = (hensikt: string) =>
  `Varsel om oppstart av planarbeid Hensikten med planarbeidet ${hensikt} Krav til konsekvensutredning Nei`;

const dok = (id: string, type: string, extra: Partial<{ url: string; mime_type: string | null }> = {}) => ({
  external_id: id,
  type,
  url: extra.url ?? `https://plandata.ft.dibk.no/services/download/planleggingigangsatt/x/${id}`,
  mime_type: extra.mime_type === undefined ? "application/pdf" : extra.mime_type,
  document_date: "2026-01-01",
});

/** Databasen svarer med køen og husker hva som ble lagret. PDF-innholdet er teksten bak URL-en. */
function oppsett(kø: unknown[], tekster: Record<string, string | null | "FEIL">) {
  const lagret: Record<string, unknown>[] = [];
  const hentet: string[] = [];
  const db: Db = {
    kind: "pglite",
    async rpc<T>(fn: string, args: Record<string, unknown> = {}) {
      if (fn === "events_for_enrichment") return kø as T[];
      if (fn === "upsert_event_enrichment") lagret.push(...(args.p_rows as Record<string, unknown>[]));
      return [] as T[];
    },
  };
  const fetchImpl = (async (input: string | URL) => {
    const url = String(input);
    hentet.push(url);
    const id = url.split("/").at(-1)!;
    if (tekster[id] === "FEIL") return new Response("nede", { status: 503 });
    return new Response(new TextEncoder().encode(tekster[id] ?? ""), { status: 200 });
  }) as unknown as typeof fetch;
  const readPdf = async (data: Uint8Array) => new TextDecoder().decode(data) || null;
  return { db, fetchImpl, readPdf, lagret, hentet };
}

describe("uttrekk av tiltakstype og formål under synk", () => {
  it("lagrer formål med dokumentreferanse, og tiltakstype fra tittel eller formål", async () => {
    const o = oppsett(
      [
        { event_id: "e1", title: "Furnesvegen 111", fingerprint: "f1", documents: [dok("d1", "Planinitiativ"), dok("kart", "PlanomraadePdf")] },
        { event_id: "e2", title: "Utneset masseuttak", fingerprint: "f2", documents: [] },
      ],
      { d1: "Formålet med planarbeidet er å legge til rette for etablering av dagligvareforretning og kontorarealer. Mer." },
    );
    const resultat = await enrichPlans(o.db, o);
    expect(resultat).toMatchObject({ pending: 2, processed: 2, withPurpose: 1, withType: 2, failedDownloads: 0 });
    expect(o.lagret).toEqual([
      {
        event_id: "e1",
        parser_version: PLAN_PARSER_VERSION,
        documents_fingerprint: "f1",
        measure_type: "naering",
        measure_type_source: "formaal",
        purpose: "å legge til rette for etablering av dagligvareforretning og kontorarealer",
        purpose_document_external_id: "d1",
        purpose_document_type: "Planinitiativ",
        purpose_method: "setning",
      },
      {
        event_id: "e2",
        parser_version: PLAN_PARSER_VERSION,
        documents_fingerprint: "f2",
        measure_type: "masseuttak",
        measure_type_source: "tittel",
        purpose: null,
        purpose_document_external_id: null,
        purpose_document_type: null,
        purpose_method: null,
      },
    ]);
    // Kartet er ikke et dokument formålet kan stå i, og lastes ikke ned.
    expect(o.hentet).toHaveLength(1);
  });

  it("lagrer aldri dokumenttekst eller tall fra fri tekst", async () => {
    const o = oppsett(
      [{ event_id: "e1", title: "Rådhusgata 18", fingerprint: "f", documents: [dok("d1", "Planinitiativ")] }],
      { d1: "Hjemmelshaver Ola Nordmann, telefon 99999999. Formålet med planarbeidet er å legge til rette for ca. 125 boenheter i 5 til 7 etasjer med næring i første etasje. Parkeringsnorm: 100 m2 BRA." },
    );
    await enrichPlans(o.db, o);
    const dump = JSON.stringify(o.lagret);
    expect(dump).not.toMatch(/Ola Nordmann|99999999|Parkeringsnorm|\b125\b|\b100\b/);
    expect(o.lagret[0]!.purpose).toBe("å legge til rette for […] boenheter i […] etasjer med næring i første etasje");
  });

  it("uten ren setning faller saken tilbake på tittelen, uten en generert erstatning", async () => {
    const o = oppsett(
      [{ event_id: "e1", title: "Groheim", fingerprint: "f", documents: [dok("d1", "Planvarsel"), dok("d2", "ReferatOppstartsmoete")] }],
      { d1: SKJEMA("Se vedlegg."), d2: null },
    );
    const resultat = await enrichPlans(o.db, o);
    expect(o.lagret[0]).toMatchObject({ measure_type: "annet", measure_type_source: null, purpose: null });
    expect(resultat.unreadable).toBe(1);
  });

  it("en feilet nedlasting lagres ikke som «uten formål»: saken prøves igjen", async () => {
    const o = oppsett(
      [
        { event_id: "e1", title: "Groheim", fingerprint: "f", documents: [dok("d1", "Planinitiativ")] },
        { event_id: "e2", title: "Vestheim industriområde", fingerprint: "g", documents: [dok("d2", "Planinitiativ"), dok("d3", "Planvarsel")] },
      ],
      { d1: "FEIL", d2: "FEIL", d3: SKJEMA("Formålet med planen er å legge til rette for ny industri og lager. Mer.") },
    );
    const resultat = await enrichPlans(o.db, o);
    expect(resultat.failedDownloads).toBe(2);
    // e1 mangler svar og ventes med. e2 fant formålet i et annet dokument og lagres.
    expect(o.lagret.map((r) => r.event_id)).toEqual(["e2"]);
    expect(formatPlanEnrichmentResult(resultat)).toContain("2 nedlastinger feilet");
  });

  it("laster bare ned PDF-er fra DiBK", async () => {
    const o = oppsett(
      [
        {
          event_id: "e1",
          title: "Groheim",
          fingerprint: "f",
          documents: [
            dok("d1", "Planinitiativ", { url: "https://example.com/x/d1" }),
            dok("d2", "Planinitiativ", { url: "http://plandata.ft.dibk.no/x/d2" }),
            dok("d3", "Planinitiativ", { mime_type: "application/json" }),
          ],
        },
      ],
      {},
    );
    await enrichPlans(o.db, o);
    expect(o.hentet).toEqual([]);
    expect(o.lagret).toHaveLength(1);
  });

  it("gjør ingenting når køen er tom", async () => {
    const o = oppsett([], {});
    const resultat = await enrichPlans(o.db, o);
    expect(resultat.pending).toBe(0);
    expect(o.lagret).toEqual([]);
    expect(formatPlanEnrichmentResult(resultat)).toContain("ingen nye eller endrede saker");
  });
});
