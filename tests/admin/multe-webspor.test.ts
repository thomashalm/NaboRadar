import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { multeWebsporDataset, sirkel, WEBSPOR_FORBEHOLD, websporFeature } from "@/lib/admin/explore/multe-webspor";
import { tolkSok } from "@/lib/admin/explore/parse";
import { EXPLORE_DATASETS } from "@/lib/admin/explore/registry";
import { byggVisning } from "@/lib/admin/explore/visning";
import { EXPLORE_COLOR } from "@/lib/map/layers/explore";
import { iBoksen } from "@/lib/multe/omrade";
import { MULTE_WEBSPOR } from "@/lib/multe/web-spor";

/**
 * Multe: web-spor. Anekdoter fra nettet, vist i admin — aldri som artsfunn, aldri offentlig.
 * Dataene er en fil (lib/multe/web-spor.ts); researchen er docs/research/multer-web-discovery.md.
 */
const kommuner = new Map([["0301", { name: "Oslo", county: "Oslo" }], ["3305", { name: "Ringerike", county: "Buskerud" }]]);
const tolk = (sok: string) => tolkSok(sok, EXPLORE_DATASETS, kommuner);
const spor = (id: string) => MULTE_WEBSPOR.find((s) => s.id === id)!;
const feature = (id: string) => websporFeature(spor(id));

function klient(erAdmin: unknown, svar: Record<string, unknown[]> = {}) {
  const kall: string[] = [];
  const client = {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      kall.push(fn);
      if (fn === "is_admin") return erAdmin instanceof Error ? { data: null, error: { message: erAdmin.message } } : { data: erAdmin, error: null };
      return { data: svar[fn === "explore_area_features" ? `${fn}:${args?.p_provider_id}` : fn] ?? [], error: null };
    },
  } as unknown as SupabaseClient;
  return { client, kall };
}

describe("søk", () => {
  it("«multe web» og «multe web-spor» velger web-sporene, ikke de registrerte funnene", () => {
    for (const sok of ["multe web", "multe web-spor", "Multe: web-spor", "multe webspor", "multer web-spor", "web-spor", "multespor"]) expect(tolk(sok).dataset?.id, sok).toBe("multe-webspor");
    expect(tolk("multe web-spor Ringerike")).toMatchObject({ dataset: { id: "multe-webspor" }, sted: { status: "ok", sted: { number: "3305" } } });
    // De registrerte funnene har fortsatt sine egne ord.
    for (const sok of ["multe", "multer", "multefunn", "multer Oslo"]) expect(tolk(sok).dataset?.id, sok).toBe("multefunn");
  });

  it("er et eget datasett med egen farge, og aldri offentlig", () => {
    expect(multeWebsporDataset).toMatchObject({ id: "multe-webspor", label: "Multe: web-spor", needsArea: false, policy: { openMap: "nei", omrade: "nei" } });
    expect(multeWebsporDataset.description).toContain(WEBSPOR_FORBEHOLD);
    expect(multeWebsporDataset.description).toContain("ikke et funnsted");
    expect(EXPLORE_COLOR.multe_webspor).not.toBe(EXPLORE_COLOR.multefunn);
    expect(EXPLORE_COLOR.multe_webspor).not.toBe(EXPLORE_COLOR.myr);
  });
});

describe("dataene", () => {
  it("er få, unike og innenfor dekningsområdet", () => {
    expect(MULTE_WEBSPOR.length).toBeGreaterThanOrEqual(12);
    expect(MULTE_WEBSPOR.length).toBeLessThanOrEqual(20);
    expect(new Set(MULTE_WEBSPOR.map((s) => s.id)).size).toBe(MULTE_WEBSPOR.length);
    for (const s of MULTE_WEBSPOR) expect(iBoksen(s.senter), s.id).toBe(true);
  });

  it("ingen spor er et punkt: kildene navngir steder, ikke planter", () => {
    for (const s of MULTE_WEBSPOR) {
      expect(["approximate_area", "broad_area"], s.id).toContain(s.geotype);
      expect(s.radiusM, s.id).toBeGreaterThanOrEqual(500);
      expect(websporFeature(s).geometry.type).toBe("Polygon");
    }
  });

  it("hver omtale har kilde, lenke og sammendrag; datoer er gyldige", () => {
    for (const s of MULTE_WEBSPOR) {
      expect(s.omtaler.length, s.id).toBeGreaterThan(0);
      for (const o of s.omtaler) {
        expect(o.kildeUrl, s.id).toMatch(/^https:\/\/(www\.)?(tur1\.net|kjentmannsmerket\.org|skiforeningen\.no|lapp-is\.blogspot\.com)\//);
        expect(o.kilde.length && o.sammendrag.length, s.id).toBeGreaterThan(0);
        if (o.dato) {
          expect(o.dato, s.id).toMatch(/^20\d\d-\d\d-\d\d$/);
          expect(Number(o.dato.slice(0, 4))).toBe(o.aar);
        }
      }
    }
  });

  it("teller uavhengige kilder konservativt: aldri flere enn ulike nettsteder i omtalene", () => {
    for (const s of MULTE_WEBSPOR) {
      const nettsteder = new Set(s.omtaler.map((o) => new URL(o.kildeUrl).hostname));
      expect(s.uavhengigeKilder, s.id).toBeGreaterThanOrEqual(1);
      expect(s.uavhengigeKilder, s.id).toBeLessThanOrEqual(nettsteder.size);
    }
    // Tre omtaler, tre nettsteder — men to kan være samme person. Da er det to.
    expect(spor("klekkenputten-tvetjerna")).toMatchObject({ uavhengigeKilder: 2 });
    expect(spor("klekkenputten-tvetjerna").omtaler).toHaveLength(3);
    // Samme blogg i to år er én kilde.
    expect(spor("retthelltjernet-bureheim")).toMatchObject({ uavhengigeKilder: 1 });
    expect(MULTE_WEBSPOR.filter((s) => s.uavhengigeKilder > 1).map((s) => s.id)).toEqual(["klekkenputten-tvetjerna"]);
  });

  it("shortlisten følger researchen: Klekkenputten–Tvetjerna først, ingen score", () => {
    const rangert = MULTE_WEBSPOR.filter((s) => s.anbefaltRang).sort((a, b) => a.anbefaltRang! - b.anbefaltRang!);
    expect(rangert[0]!.id).toBe("klekkenputten-tvetjerna");
    expect(rangert.find((s) => s.anbefaltRang === 2)!.id).toBe("rudskampen-raabjorn");
    expect(rangert.find((s) => s.anbefaltRang === 3)!.id).toBe("haklokroktjern");
    expect(new Set(rangert.map((s) => s.anbefaltRang))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(JSON.stringify(MULTE_WEBSPOR)).not.toMatch(/score|sannsynlighet|probability|confidence/i);
  });

  it("har ingen personopplysninger: ikke navn, brukernavn, e-post eller profiler", () => {
    const alt = JSON.stringify(MULTE_WEBSPOR) + JSON.stringify(MULTE_WEBSPOR.map(websporFeature));
    expect(alt).not.toMatch(/@|brukernavn|profil|\/members?\/|\/user\/|facebook|instagram/i);
    // Kilder er nettsteder. Ingen «av Fornavn Etternavn», og ingen navn fra forumtrådene.
    for (const s of MULTE_WEBSPOR) for (const o of s.omtaler) expect(o.kilde, s.id).toMatch(/blogg|forum|Skiforeningen|Kjentmannsmerket/);
    expect(alt).not.toMatch(/Memento|Konemor|skrevet av|foto:/i);
  });
});

describe("panelet", () => {
  it("Klekkenputten–Tvetjerna: tre omtaler med dato, to uavhengige kilder, kandidat #1", () => {
    const f = feature("klekkenputten-tvetjerna");
    expect(f).toMatchObject({ title: "Klekkenputten–Tvetjerna", kind: "Rapportert multefunn", style: "multe_webspor", place: "Ringerike", sourceUrl: null });
    expect(f.summary).toBe("Multer omtalt 21. august 2026 · 2 uavhengige nettkilder · kandidat #1");
    expect(f.notice).toBe("Anekdotisk nettkilde – ikke artsregistrering. Internt researchlag. Ikke offentlig.");
    const rad = Object.fromEntries(f.details.map((d) => [d.label, d.value]));
    expect(rad).toMatchObject({
      Signal: "Konkret funn",
      Geografi: "Omtrentlig område – ikke eksakt funnsted (sirkel med radius 1 km)",
      Rapportert: "2020, 2026",
      Nettkilder: "2 uavhengige nettkilder",
      "Registrerte multefunn innen 1 km": "0",
      "Nærmeste registrerte multefunn": "1,1 km",
      "Myr innen 1 km": "252 daa",
      "Sist verifisert": "5. oktober 2026",
    });
    expect(rad["Research-kandidat"]).toMatch(/^#1 – /);
    expect(rad.Kildekvalitet).toBe("Høy (researchprioritet, ikke en sannhetsvurdering)");
    expect(f.analysis).toMatchObject({ label: "Omtaler i nettkilder", heading: "3 omtaler, 2 uavhengige nettkilder" });
    // Nyeste først, hver med sin dato og sitt stadium.
    expect(f.analysis!.items.map((i) => i.title)).toEqual(["Multer omtalt 21. august 2026", "Umodne multer omtalt 23. juli 2026", "Umodne multer omtalt 18. juli 2020"]);
    expect(f.analysis!.lines.join(" ")).toContain("kan være samme person");
    expect(f.analysis!.note).toContain("ikke et råd om når bærene er modne");
    expect(f.links).toHaveLength(3);
  });

  it("Rudskampen og Haklokroktjern: dato, stadium og kilde som i researchen", () => {
    const r = feature("rudskampen-raabjorn");
    expect(r.summary).toBe("Modne multer omtalt 1. august 2023 · kandidat #2");
    expect(r.analysis!.lines[0]).toBe("Rapportert med modne bær: 1. august 2023.");
    expect(r).toMatchObject({ sourceName: "Kjentmannsmerkets forum", sourceUrl: "https://www.kjentmannsmerket.org/forum/postene-2022-24/multefest-pa-rudskampen-20-39/" });
    expect(r.details.find((d) => d.label === "Merknad")!.value).toContain("Naturreservat");

    const h = feature("haklokroktjern");
    expect(h.summary).toBe("Multer omtalt 5. august 2022 · kandidat #3");
    expect(Object.fromEntries(h.details.map((d) => [d.label, d.value]))).toMatchObject({ Kommune: "Oslo", Nettkilder: "1 nettkilde", "Registrerte multefunn innen 1 km": "0", "Nærmeste registrerte multefunn": "4,7 km", "Myr innen 1 km": "49 daa" });
    // Modenhet som kilden ikke oppgir, blir ikke «modne».
    expect(h.analysis!.lines.join(" ")).not.toContain("Rapportert med modne bær");
  });

  it("stedstips og historisk omtale kalles ikke funn", () => {
    expect(feature("jordmyrane")).toMatchObject({ kind: "Stedstips om multer", summary: "Stedstips, udatert · kandidat #6" });
    expect(feature("blekksjoflaga")).toMatchObject({ kind: "Historisk omtale av multer" });
    expect(feature("blekksjoflaga").details.find((d) => d.label === "Geografi")!.value).toMatch(/^Bredt område – ikke eksakt funnsted/);
    expect(feature("retthelltjernet-bureheim").details.find((d) => d.label === "Nettkilder")!.value).toBe("1 nettkilde (2 omtaler fra samme kilde)");
  });

  it("alle spor sier at de er anekdoter og at geografien er omtrentlig", () => {
    for (const f of MULTE_WEBSPOR.map(websporFeature)) {
      expect(f.notice, f.id).toContain(WEBSPOR_FORBEHOLD);
      expect(f.explanation, f.id).toContain("ikke et funnsted");
      expect(f.details.find((d) => d.label === "Geografi")!.value, f.id).toContain("ikke eksakt funnsted");
      expect(f.kind, f.id).not.toBe("Registrert funn");
    }
  });

  it("sirkelen er lukket, har riktig radius og ligger rundt stedet", () => {
    const flate = sirkel([10.4339, 60.1537], 1000);
    const ring = flate.coordinates[0]!;
    expect(ring).toHaveLength(49);
    expect(ring[0]).toEqual(ring.at(-1));
    const nord = Math.max(...ring.map(([, lat]) => lat!));
    expect((nord - 60.1537) * 111_320).toBeCloseTo(1000, -1);
  });
});

describe("tilgang", () => {
  it("admin får sporene; ikke-admin og ikke innlogget får ingenting", async () => {
    const admin = await multeWebsporDataset.load(klient(true).client, null);
    expect(admin).toMatchObject({ total: MULTE_WEBSPOR.length, error: null });
    expect(admin.features[0]!.title).toBe("Klekkenputten–Tvetjerna");

    // Innlogget uten adminrolle: is_admin() svarer false.
    expect(await multeWebsporDataset.load(klient(false).client, null)).toEqual({ features: [], total: 0, error: "Krever innlogging som admin." });
    // Ikke innlogget: anon har ikke lov til å kalle is_admin(), og får en feil.
    expect(await multeWebsporDataset.load(klient(new Error("permission denied for function is_admin")).client, null)).toEqual({ features: [], total: 0, error: "Krever innlogging som admin." });
    expect(await multeWebsporDataset.load(klient(null).client, null)).toMatchObject({ features: [], total: 0 });
  });

  it("leser ikke fra databasen: sporene kan ikke komme ut gjennom features_near eller en annen RPC", async () => {
    const { client, kall } = klient(true);
    await multeWebsporDataset.load(client, null);
    expect(kall).toEqual(["is_admin"]);
    // Ingen migrasjon nevner dem, og ingen provider leverer dem.
    const sql = execSync("cat supabase/migrations/*.sql", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    expect(sql).not.toMatch(/web-?spor|webspor/i);
    expect(readFileSync("lib/providers/area-registry.ts", "utf8")).not.toMatch(/web-?spor|webspor/i);
  });

  it("bare Utforsk data i admin kjenner dataene", () => {
    const treff = execSync(`grep -rlE "multe/web-spor|MULTE_WEBSPOR|multeWebsporDataset" app components lib || true`, { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
    expect(treff).toEqual(["lib/admin/explore/multe-webspor.ts", "lib/admin/explore/registry.ts", "lib/multe/web-spor.ts"]);
    // Registeret brukes bare av adminsiden og visningen.
    const brukere = execSync(`grep -rlE "explore/registry" app components lib || true`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    for (const fil of brukere) expect(fil, fil).toMatch(/^(app\/admin\/|lib\/admin\/)/);
    for (const fil of ["lib/multe/web-spor.ts", "lib/admin/explore/multe-webspor.ts"]) expect(readFileSync(fil, "utf8")).toMatch(/^import "server-only";/);
    const side = readFileSync("app/admin/research/utforsk/page.tsx", "utf8");
    expect(side).toMatch(/session\.state !== "admin"\) return <IkkeTilgang/);
    expect(side).toMatch(/robots: \{ index: false, follow: false \}/);
    for (const fil of ["app/omrade/page.tsx", "app/sitemap.ts", "app/robots.ts"]) expect(readFileSync(fil, "utf8")).not.toMatch(/web-?spor|webspor|admin\/explore/i);
  });
});

describe("sammen med de andre lagene", () => {
  const area = { kind: "kommune" as const, name: "Ringerike", county: "Buskerud", box: { minLng: 10.3, minLat: 60.0, maxLng: 10.6, maxLat: 60.3 }, polygon: null };
  const omrade = vi.fn(async () => area);
  const punkt = { type: "Point", coordinates: [10.44, 60.1] };
  const funn = { id: "f1", external_id: "1", title: "Multe", subtype: "multefunn", attributes: { aar: 2023, maaned: 6, presisjonM: 10, lisens: "CC BY 4.0" }, source_url: null, source_updated_at: null, geometry: punkt, center: punkt, total: 1 };
  const myr = { ...funn, id: "m1", subtype: "myr", title: "Myr", attributes: { municipality_number: "3305" }, geometry: sirkel([10.44, 60.1], 100), area_m2: 31000, finds_500: 1, nearest_m: 0, nearest_id: "f1", nearest_year: 2023 };

  it("web-spor + myr: sirkler og myrflater i samme kart, hver med sitt datasett", async () => {
    const { client, kall } = klient(true, { explore_mires: [myr] });
    const v = await byggVisning(client, { q: "multe web-spor Ringerike", lag: "myr" }, omrade as never);
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag.map((l) => [l.dataset.id, l.features[0]?.style, l.feil])).toEqual([["multe-webspor", "multe_webspor", null], ["myr", "myr", null]]);
    // Bare sporene i Ringerike-utsnittet, kandidatene først.
    expect(v.lag[0]!.features.map((f) => f.title).slice(0, 2)).toEqual(["Klekkenputten–Tvetjerna", "Atjern og Langbru"]);
    expect(v.lag[0]!.features.every((f) => f.datasetLabel === "Multe: web-spor")).toBe(true);
    expect(kall.sort()).toEqual(["explore_mires", "is_admin"]);
    // Ingen «Finn overlapp»: sirklene er omtrentlige, og en overlappsanalyse ville late som noe annet.
    expect(v.analyse).toMatchObject({ stottet: false });
  });

  it("web-spor + registrerte multefunn: to lag som ikke blandes", async () => {
    const { client } = klient(true, { "explore_area_features:gbif-multefunn-oslomarka": [funn] });
    const v = await byggVisning(client, { q: "multe web", lag: "multefunn" });
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag.map((l) => [l.dataset.label, l.total])).toEqual([["Multe: web-spor", MULTE_WEBSPOR.length], ["Multe: registrerte funn", 1]]);
    expect(v.lag[0]!.features.every((f) => f.style === "multe_webspor" && f.geometry.type === "Polygon")).toBe(true);
    expect(v.lag[1]!.features[0]).toMatchObject({ style: "multefunn", kind: "Registrert funn", geometry: { type: "Point" } });
    // Og den andre veien: funnene som hovedlag, web-sporene lagt til.
    const omvendt = await byggVisning(client, { q: "multefunn", lag: "multe-webspor" });
    if (omvendt.status !== "treff") throw new Error(omvendt.status);
    expect(omvendt.lag.map((l) => l.dataset.id)).toEqual(["multefunn", "multe-webspor"]);
    expect(omvendt.lag[0]!.fjernHref).toBe("/admin/research/utforsk?q=multe+web-spor");
  });

  it("ikke-admin: laget sier at det krever admin, og viser ingen spor", async () => {
    const v = await byggVisning(klient(false).client, { q: "multe web-spor" });
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag[0]).toMatchObject({ features: [], total: 0, feil: "Krever innlogging som admin." });
  });

  it("sted utenfor Oslo og Marka: sier at laget ikke dekker det", async () => {
    const bergen = vi.fn(async () => ({ ...area, name: "Bergen", box: { minLng: 5.1, minLat: 60.2, maxLng: 5.7, maxLat: 60.6 } }));
    const { client, kall } = klient(true);
    const v = await byggVisning(client, { q: "multe web-spor Ringerike" }, bergen as never);
    if (v.status !== "treff") throw new Error(v.status);
    expect(v.lag[0]!.utenforDekning).toBe("Multe: web-spor dekker foreløpig bare Oslo og Marka.");
    expect(kall).toEqual([]);
  });
});
