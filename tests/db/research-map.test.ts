import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;
const DRIFT = { role: "authenticated", email: "drift@example.com" };

/**
 * research_map: filtrene og tilgangen.
 *
 * Tilgangen er den viktigste delen — dette er en ny funksjon som returnerer hele researchbasen,
 * og den må være like stengt som resten av admin-laget.
 */
describe("research_map", { timeout: 30_000 }, () => {
  let db: Db;

  async function som<T>(rolle: string, email: string | null, sql: string): Promise<T[] | "NEKTET"> {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(email ? { role: rolle, email } : { role: rolle }),
      ]);
      await db.pg.exec(`set local role ${rolle}`);
      return (await db.pg.query<T>(sql)).rows;
    } catch {
      return "NEKTET";
    } finally {
      await db.pg.exec("rollback");
    }
  }

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`insert into admin_users (email) values ('drift@example.com') on conflict do nothing`);
    await db.pg.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(DRIFT)]);
    const lag = (f: Record<string, unknown>) => db.rpc("save_research_item", { p_id: null, p_fields: f });
    await lag({ category: "Datasenter / industri / tekniske anlegg", subcategory: "Datasenter",
      title: "Aktivt datasenter", municipality: "Oslo", latitude: 59.9, longitude: 10.8,
      verification_status: "verified_public_source", operational_status: "active",
      confidence: "high", interest_level: "high" });
    await lag({ category: "Datasenter / industri / tekniske anlegg", subcategory: "Datasenter",
      title: "Planlagt datasenter", municipality: "Tysvær", latitude: 59.3, longitude: 5.4,
      verification_status: "partially_verified", operational_status: "planned",
      confidence: "medium", interest_level: "high" });
    await lag({ category: "Datasenter / industri / tekniske anlegg", subcategory: "Pukkverk",
      title: "Et pukkverk", municipality: "Bærum", latitude: 59.93, longitude: 10.52,
      verification_status: "verified_public_source", operational_status: "active",
      confidence: "high", interest_level: "medium" });
    await lag({ category: "Forsvar / militært", title: "Avvist funn", municipality: "Oslo",
      latitude: 59.91, longitude: 10.74, verification_status: "rejected" });
    await lag({ category: "Forsvar / militært", title: "Uten kartpunkt", municipality: "Oslo",
      verification_status: "verified_public_source" });
  });

  const kall = (args: Record<string, unknown> = {}) =>
    db.rpc<{ title: string }>("research_map", { p_only_with_coords: false, ...args });

  it("nekter anon", async () => {
    expect(await som("anon", null, "select * from public.research_map()")).toBe("NEKTET");
  });

  it("gir innlogget ikke-admin null rader", async () => {
    expect(await som("authenticated", "tilfeldig@example.com", "select * from public.research_map()")).toEqual([]);
  });

  it("gir admin alle funn", async () => {
    const rader = await kall();
    expect(rader.map((r) => r.title)).toContain("Aktivt datasenter");
    expect(rader.length).toBe(5);
  });

  it("filtrerer på kategori og underkategori", async () => {
    const rader = await kall({
      p_categories: ["Datasenter / industri / tekniske anlegg"],
      p_subcategories: ["Datasenter"],
    });
    expect(rader.map((r) => r.title).sort()).toEqual(["Aktivt datasenter", "Planlagt datasenter"]);
  });

  it("filtrerer på driftsstatus, sikkerhet og interesse", async () => {
    expect((await kall({ p_operational: ["planned"] })).map((r) => r.title)).toEqual(["Planlagt datasenter"]);
    expect((await kall({ p_confidence: ["high"] })).map((r) => r.title).sort()).toEqual([
      "Aktivt datasenter", "Et pukkverk",
    ]);
    // De to øvrige funnene har «medium» som standardverdi, så de er med her.
    expect((await kall({ p_interest: ["medium"] })).map((r) => r.title).sort()).toEqual([
      "Avvist funn",
      "Et pukkverk",
      "Uten kartpunkt",
    ]);
  });

  it("filtrerer på kommune og verifisering", async () => {
    expect((await kall({ p_municipality: "Tysvær" })).map((r) => r.title)).toEqual(["Planlagt datasenter"]);
    expect((await kall({ p_verification: ["rejected"] })).map((r) => r.title)).toEqual(["Avvist funn"]);
  });

  it("kan utelate funn uten koordinat", async () => {
    const medPunkt = await db.rpc<{ title: string }>("research_map", { p_only_with_coords: true });
    expect(medPunkt.map((r) => r.title)).not.toContain("Uten kartpunkt");
    expect((await kall()).map((r) => r.title)).toContain("Uten kartpunkt");
  });

  it("søker i tittel, kommune og kategori", async () => {
    expect((await kall({ p_search: "pukk" })).map((r) => r.title)).toEqual(["Et pukkverk"]);
    expect((await kall({ p_search: "Tysvær" })).map((r) => r.title)).toEqual(["Planlagt datasenter"]);
  });

  it("avgrenser til kartutsnittet når bbox er satt", async () => {
    const rader = await kall({ p_min_lat: 59.0, p_max_lat: 59.5, p_min_lng: 5.0, p_max_lng: 6.0 });
    expect(rader.map((r) => r.title)).toEqual(["Planlagt datasenter"]);
  });

  it("sorterer interesse før sikkerhet før tittel", async () => {
    const rader = await kall({ p_categories: ["Datasenter / industri / tekniske anlegg"] });
    // Begge høy interesse først, høy sikkerhet før medium, deretter middels interesse.
    expect(rader.map((r) => r.title)).toEqual(["Aktivt datasenter", "Planlagt datasenter", "Et pukkverk"]);
  });

  it("returnerer ikke beskrivelse, notater eller kilder", async () => {
    const [rad] = await db.rpc<Record<string, unknown>>("research_map", { p_only_with_coords: true });
    expect(Object.keys(rad!)).not.toContain("description");
    expect(Object.keys(rad!)).not.toContain("notes");
    expect(Object.keys(rad!)).toContain("source_count");
  });
});
