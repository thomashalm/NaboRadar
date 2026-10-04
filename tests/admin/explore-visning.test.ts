import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { byggVisning } from "@/lib/admin/explore/visning";
import type { ExploreArea } from "@/lib/admin/explore/types";

/**
 * Utforsk data med to lag: hva URL-en blir til. Databasen er byttet ut med en klient som teller
 * kallene, og Kartverket med en fast flate.
 */
const flate: ExploreArea["polygon"] = { type: "Polygon", coordinates: [[[10.4, 59.8], [10.7, 59.8], [10.7, 60.0], [10.4, 60.0], [10.4, 59.8]]] };
const omrade = vi.fn(async (sted: { kind: "kommune" | "fylke"; name: string; county: string }): Promise<ExploreArea> => ({
  kind: sted.kind,
  name: sted.name,
  county: sted.county,
  box: { minLng: 10.4, minLat: 59.8, maxLng: 10.7, maxLat: 60.0 },
  polygon: flate,
}));

function klient(svar: Record<string, unknown[] | Error> = {}) {
  const kall: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      kall.push({ fn, args });
      const nokkel = fn === "explore_area_features" ? `${fn}:${args.p_provider_id}` : fn;
      const r = svar[nokkel] ?? [];
      return r instanceof Error ? { data: null, error: { message: r.message } } : { data: r, error: null };
    },
  } as unknown as SupabaseClient;
  return { client, kall };
}

const plansak = {
  id: "sak-1", title: "Detaljregulering for Storgata 1", type: "planning_started", municipality_number: "3201", announced_at: "2026-03-10",
  source_url: null, area_m2: 100, attributes: {}, documents: [],
  geometry: { type: "Polygon", coordinates: [[[10.5, 59.9], [10.51, 59.9], [10.51, 59.91], [10.5, 59.9]]] },
  center: { type: "Point", coordinates: [10.5, 59.9] }, total: 1,
};
const ledning = {
  id: "k-1", external_id: "e", title: "Kraftledning", subtype: "kraftledning", attributes: { spenningKv: 132 }, source_url: null, source_updated_at: null,
  geometry: { type: "LineString", coordinates: [[10.5, 59.9], [10.6, 59.95]] }, center: { type: "Point", coordinates: [10.55, 59.92] }, total: 1,
};

describe("byggVisning", () => {
  it("ett lag: søket velger datasettet, og de andre kan legges til", async () => {
    const { client, kall } = klient({ explore_events: [plansak] });
    const v = await byggVisning(client, { q: "planer Bærum" }, omrade as never);
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag.map((l) => l.dataset.id)).toEqual(["plansaker"]);
    expect(v.lag[0]!.features[0]).toMatchObject({ datasetId: "plansaker", datasetLabel: "Plansaker", place: "Bærum" });
    expect(v.leggTil.map((l) => l.id)).toEqual(["kvikkleire", "kraftnett", "forurenset-grunn", "datasenter", "multefunn", "myr"]);
    expect(v.leggTil[0]!.href).toBe("/admin/research/utforsk?q=plansaker+B%C3%A6rum&lag=kvikkleire");
    expect(kall.map((k) => k.fn)).toEqual(["explore_events"]);
    expect(kall[0]!.args).toMatchObject({ p_min_lng: 10.4, p_max_lat: 60.0, p_area: flate });
  });

  it("to lag: begge leses én gang for samme område, og hvert objekt vet hvilket lag det hører til", async () => {
    const { client, kall } = klient({ explore_events: [plansak], "explore_area_features:nve-nettanlegg": [ledning] });
    const v = await byggVisning(client, { q: "planer Bærum", lag: "kraftnett" }, omrade as never);
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag.map((l) => [l.dataset.id, l.features.length])).toEqual([["plansaker", 1], ["kraftnett", 1]]);
    expect(v.lag[1]!.features[0]).toMatchObject({ datasetId: "kraftnett", datasetLabel: "Kraftnett", title: "Kraftledning 132 kV" });
    // Ingen dobbelthenting, og samme flate til begge.
    expect(kall.map((k) => k.fn).sort()).toEqual(["explore_area_features", "explore_events"]);
    expect(kall[0]!.args.p_area).toBe(kall[1]!.args.p_area);
    // To er taket: ingenting mer å legge til.
    expect(v.leggTil).toEqual([]);
    // Fjernes hovedlaget, blir det andre hovedlag — med samme sted.
    expect(v.lag[0]!.fjernHref).toBe("/admin/research/utforsk?q=kraftnett+B%C3%A6rum");
    expect(v.lag[1]!.fjernHref).toBe("/admin/research/utforsk?q=plansaker+B%C3%A6rum");
  });

  it("lenkene siden lager, tolkes tilbake til samme datasett", async () => {
    const { client } = klient();
    const v = await byggVisning(client, { q: "planer Bærum" }, omrade as never);
    if (v.status !== "treff") throw new Error(v.status);
    for (const valg of v.leggTil) {
      const url = new URL(valg.href, "http://x");
      const neste = await byggVisning(client, { q: url.searchParams.get("q")!, lag: url.searchParams.get("lag")! }, omrade as never);
      if (neste.status !== "treff") throw new Error(`${valg.id}: ${neste.status}`);
      expect(neste.lag.map((l) => l.dataset.id)).toEqual(["plansaker", valg.id]);
      // Og tilbake: fjernes plansakene, står det andre igjen alene.
      const igjen = new URL(neste.lag[0]!.fjernHref, "http://x");
      const alene = await byggVisning(client, { q: igjen.searchParams.get("q")! }, omrade as never);
      expect(alene.status === "treff" && alene.lag.map((l) => l.dataset.id)).toEqual([valg.id]);
    }
  });

  it("samme datasett to ganger og ukjent lag gir ett lag", async () => {
    const { client, kall } = klient();
    for (const lag of ["plansaker", "radon", ""]) {
      const v = await byggVisning(client, { q: "planer Bærum", lag }, omrade as never);
      expect(v.status === "treff" && v.lag.length).toBe(1);
    }
    expect(kall).toHaveLength(3);
  });

  it("et tredje lag finnes ikke: URL-en har plass til ett ekstra", async () => {
    const { client } = klient();
    const v = await byggVisning(client, { q: "planer Bærum", lag: "kraftnett,kvikkleire" }, omrade as never);
    expect(v.status === "treff" && v.lag.length).toBe(1);
  });

  it("feil i ett lag stopper ikke det andre, og er ikke «ingen treff»", async () => {
    const { client } = klient({ explore_events: [plansak], "explore_area_features:nve-nettanlegg": new Error("statement timeout") });
    const v = await byggVisning(client, { q: "planer Bærum", lag: "kraftnett" }, omrade as never);
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag[0]!.features).toHaveLength(1);
    expect(v.lag[1]).toMatchObject({ feil: "statement timeout", features: [] });
  });

  it("datasenter for hele landet + kraftnett: kraftnettet leses ikke uten område", async () => {
    const { client, kall } = klient();
    const v = await byggVisning(client, { q: "datasenter", lag: "kraftnett" }, omrade as never);
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag[1]).toMatchObject({ trengerOmrade: true, features: [] });
    expect(kall.some((k) => k.fn === "explore_area_features")).toBe(false);
  });

  it("stort datasett uten sted ber om område i stedet for å laste landet", async () => {
    const { client, kall } = klient();
    for (const q of ["planer", "kraftnett", "forurenset grunn"]) expect((await byggVisning(client, { q }, omrade as never)).status).toBe("trenger_omrade");
    // Et utsnitt på over 80 km er også for stort.
    expect((await byggVisning(client, { q: "planer", utsnitt: "5,58,12,63" }, omrade as never)).status).toBe("trenger_omrade");
    expect(kall).toEqual([]);
  });

  it("taket sies fra om: totalen er større enn det som kom", async () => {
    const { client } = klient({ "explore_area_features:mdir-forurenset-grunn": [{ ...ledning, subtype: "forurenset_grunn", attributes: {}, geometry: plansak.geometry, total: 2899 }] });
    const v = await byggVisning(client, { q: "forurenset grunn Oslo" }, omrade as never);
    expect(v.status === "treff" && [v.lag[0]!.features.length, v.lag[0]!.total]).toEqual([1, 2899]);
  });

  describe("Finn overlapp", () => {
    const overlapprad = { ...plansak, hits: [{ id: "z1", external_id: "e", title: "Sone", subtype: "kvikkleire_sone", attributes: {} }], hit_count: 1, total: 1, area_total: 53, edge_only: 2 };
    const sone = { ...ledning, id: "z1", subtype: "kvikkleire_sone", title: "Sone", attributes: {}, geometry: plansak.geometry };

    it("to kompatible lag: valget finnes, og standard er «Vis sammen»", async () => {
      const { client, kall } = klient({ explore_events: [plansak] });
      const v = await byggVisning(client, { q: "planer Bærum", lag: "kvikkleire" }, omrade as never);
      if (v.status !== "treff") throw new Error(v.status);
      expect(v.analyse).toMatchObject({ stottet: true, aktiv: false, resultat: null });
      expect(v.analyse!.overlappHref).toBe("/admin/research/utforsk?q=plansaker+B%C3%A6rum&lag=kvikkleire&analyse=overlapp");
      expect(v.analyse!.visSammenHref).toBe("/admin/research/utforsk?q=plansaker+B%C3%A6rum&lag=kvikkleire");
      expect(kall.some((k) => k.fn === "explore_events_overlap")).toBe(false);
    });

    it("analyse=overlapp: hovedlaget leses filtrert i databasen, referanselaget er kontekst", async () => {
      const { client, kall } = klient({ explore_events_overlap: [overlapprad], "explore_area_features:nve-kvikkleire-soner": [sone] });
      const v = await byggVisning(client, { q: "planer Bærum", lag: "kvikkleire", analyse: "overlapp" }, omrade as never);
      if (v.status !== "treff") throw new Error(v.status);
      // Ett kall per lag: analysen erstatter den vanlige lesingen, den kommer ikke i tillegg.
      expect(kall.map((k) => k.fn).sort()).toEqual(["explore_area_features", "explore_events_overlap"]);
      expect(kall.find((k) => k.fn === "explore_events_overlap")!.args).toMatchObject({ p_ref: "kvikkleire", p_area: flate });
      expect(v.analyse!.resultat).toEqual({
        tittel: "Plansaker som overlapper kvikkleire",
        telling: "1 av 53 plansaker overlapper kartlagt kvikkleiresone.",
        kantnotat: "2 plansaker til har under 10 m² felles med en kartlagt kvikkleiresone og er ikke regnet med.",
      });
      // Resultatet er hovedlagets objekter. Referanselaget er dempet og uten egen liste.
      expect(v.lag[0]!.features[0]).toMatchObject({ datasetId: "plansaker", analysis: { heading: "Overlapper kvikkleire" } });
      expect(v.lag[0]!.kontekst).toBeUndefined();
      expect(v.lag[1]).toMatchObject({ kontekst: true });
      expect(v.lag[1]!.features[0]).toMatchObject({ muted: true });
      // Fjernes et lag, er analysen borte: den trenger to.
      expect(v.lag[1]!.fjernHref).toBe("/admin/research/utforsk?q=plansaker+B%C3%A6rum");
    });

    it("ingen treff sier hvor mange det ble lett blant", async () => {
      const { client } = klient({ explore_events_overlap: [], explore_events: [{ ...plansak, total: 39 }] });
      const v = await byggVisning(client, { q: "planer Bærum", lag: "kraftnett", analyse: "overlapp" }, omrade as never);
      if (v.status !== "treff") throw new Error(v.status);
      expect(v.analyse!.resultat!.telling).toBe("Ingen av 39 plansaker har kraftledning som krysser eller transformatorstasjon innenfor planområdet.");
      expect(v.lag[0]!.features).toEqual([]);
    });

    it("omvendt rekkefølge støttes ikke, men siden tilbyr å bytte hovedlag", async () => {
      const { client, kall } = klient();
      const v = await byggVisning(client, { q: "kvikkleire Bærum", lag: "plansaker", analyse: "overlapp" }, omrade as never);
      if (v.status !== "treff") throw new Error(v.status);
      expect(v.analyse).toMatchObject({ stottet: false, aktiv: false, grunn: "Finn overlapp går ut fra plansaker." });
      expect(v.analyse!.bytt!.href).toBe("/admin/research/utforsk?q=plansaker+B%C3%A6rum&lag=kvikkleire&analyse=overlapp");
      expect(kall.some((k) => k.fn === "explore_events_overlap")).toBe(false);
      expect(v.lag.every((l) => !l.kontekst)).toBe(true);
    });

    it("kombinasjoner uten analyse later ikke som: datasenter + kraftnett vises bare sammen", async () => {
      const { client, kall } = klient();
      const v = await byggVisning(client, { q: "datasenter Innlandet", lag: "kraftnett", analyse: "overlapp" }, omrade as never);
      if (v.status !== "treff") throw new Error(v.status);
      expect(v.analyse).toMatchObject({ stottet: false, aktiv: false, bytt: null, grunn: "Finn overlapp er ikke laget for datasenter mot kraftnett." });
      expect(kall.some((k) => k.fn === "explore_events_overlap")).toBe(false);
    });

    it("ett lag har ikke noe valg, og analyse i URL-en gjør ingenting", async () => {
      const { client, kall } = klient({ explore_events: [plansak] });
      const v = await byggVisning(client, { q: "planer Bærum", analyse: "overlapp" }, omrade as never);
      expect(v.status === "treff" && v.analyse).toBeNull();
      expect(kall.map((k) => k.fn)).toEqual(["explore_events"]);
    });

    it("feil i analysen er en feil, ikke «ingen overlapper»", async () => {
      const { client } = klient({ explore_events_overlap: new Error("statement timeout") });
      const v = await byggVisning(client, { q: "planer Bærum", lag: "kvikkleire", analyse: "overlapp" }, omrade as never);
      if (v.status !== "treff") throw new Error(v.status);
      expect(v.lag[0]).toMatchObject({ feil: "statement timeout" });
      expect(v.analyse!.resultat).toBeNull();
    });
  });

  describe("multefunn og myr", () => {
    const utenfor = vi.fn(async (sted: { kind: "kommune" | "fylke"; name: string; county: string }): Promise<ExploreArea> => ({
      kind: sted.kind, name: sted.name, county: sted.county, box: { minLng: 5.1, minLat: 60.2, maxLng: 5.7, maxLat: 60.6 }, polygon: null,
    }));
    const funn = { id: "f1", external_id: "1", title: "Multe", subtype: "multefunn", attributes: { aar: 2024, maaned: 7, presisjonM: 10, lisens: "CC BY 4.0" }, source_url: null, source_updated_at: null, geometry: { type: "Point", coordinates: [10.5, 59.9] }, center: { type: "Point", coordinates: [10.5, 59.9] }, total: 1 };
    const myr = { ...funn, id: "m1", subtype: "myr", title: "Myr", attributes: { municipality_number: "3201" }, geometry: plansak.geometry, area_m2: 12000, finds_500: 1, nearest_m: 0, nearest_id: "f1", nearest_year: 2024 };

    it("multer + myr: funnene er punkter, myrene flater med funn i nærheten — begge fra hver sin lesefunksjon", async () => {
      const { client, kall } = klient({ "explore_area_features:gbif-multefunn-oslomarka": [funn], explore_mires: [myr] });
      const v = await byggVisning(client, { q: "multer Bærum", lag: "myr" }, omrade as never);
      if (v.status !== "treff") throw new Error(v.status);
      expect(v.lag.map((l) => [l.dataset.id, l.features[0]?.style])).toEqual([["multefunn", "multefunn"], ["myr", "myr"]]);
      expect(v.lag[1]!.features[0]!.analysis!.items[0]!.id).toBe("f1");
      expect(kall.map((k) => k.fn).sort()).toEqual(["explore_area_features", "explore_mires"]);
      // Ingen analyse mellom disse to: myrpanelet har tallene selv.
      expect(v.analyse).toMatchObject({ stottet: false });
    });

    it("«multefunn» uten sted viser hele dekningsområdet, ikke hele landet", async () => {
      const { client, kall } = klient({ "explore_area_features:gbif-multefunn-oslomarka": [funn] });
      const v = await byggVisning(client, { q: "multefunn" }, omrade as never);
      expect(v.status === "treff" && v.lag[0]!.features.length).toBe(1);
      expect(kall[0]!.args).toMatchObject({ p_min_lng: 10.3, p_min_lat: 59.78, p_max_lng: 11.1, p_max_lat: 60.3, p_area: null });
      // Overskriften sier «Oslo og Marka», ikke «hele landet».
      expect(v.status === "treff" && v.lag[0]!.dataset.dekning).toBe("Oslo og Marka");
    });

    it("sted utenfor dekningen: sier det, og leser ingenting", async () => {
      const { client, kall } = klient();
      for (const q of ["multer Bergen", "myr Bergen"]) {
        const v = await byggVisning(client, { q }, utenfor as never);
        if (v.status !== "treff") throw new Error(v.status);
        expect(v.lag[0]).toMatchObject({ features: [], total: 0, utenforDekning: expect.stringContaining("dekker foreløpig bare Oslo og Marka") });
      }
      expect(kall).toEqual([]);
    });

    it("myr uten sted ber om område", async () => {
      const { client } = klient();
      expect((await byggVisning(client, { q: "myr" }, omrade as never)).status).toBe("trenger_omrade");
    });
  });
});
