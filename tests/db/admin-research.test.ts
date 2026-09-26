import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;
const DRIFT = { role: "authenticated", email: "drift@example.com" };

/**
 * Research er interne data. Testene her handler nesten utelukkende om at de blir der.
 *
 * PGlite stubber rollene anon og authenticated, så vi kan bytte rolle og sette
 * request.jwt.claims akkurat som PostgREST gjør.
 */
describe("privat research", { timeout: 30_000 }, () => {
  let db: Db;
  let itemId: string;

  /** Kjører et uttrykk som en gitt rolle. Rulles alltid tilbake. "NEKTET" = feil fra Postgres. */
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
    // Sesjonsnivå, ikke «local»: alle db.rpc-kall under kjører som drift.
    await db.pg.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(DRIFT)]);
    const [nyId] = await db.rpc<string>("save_research_item", {
      p_id: null,
      p_fields: {
        category: "Datasenter / industri / tekniske anlegg",
        title: "Testfunn",
        latitude: 59.9139,
        longitude: 10.7522,
        municipality: "Oslo",
      },
    });
    itemId = nyId!;
  });

  it("lar drift opprette funn og lese dem tilbake", async () => {
    expect(itemId).toMatch(/^[0-9a-f-]{36}$/);
    const rader = await db.rpc<{ title: string }>("research_items", { p_search: null });
    expect(rader.map((r) => r.title)).toContain("Testfunn");
  });

  it("nekter anon å lese tabellene", async () => {
    expect(await som("anon", null, "select * from admin_research_items")).toBe("NEKTET");
    expect(await som("anon", null, "select * from admin_research_sources")).toBe("NEKTET");
  });

  it("nekter anon å kalle research-funksjonene", async () => {
    expect(await som("anon", null, "select * from public.research_items(null)")).toBe("NEKTET");
    expect(await som("anon", null, "select * from public.research_near(59.91,10.75,1000)")).toBe("NEKTET");
    expect(await som("anon", null, "select public.save_research_item(null, '{}'::jsonb)")).toBe("NEKTET");
    expect(await som("anon", null, `select public.add_research_source(null, '{}'::jsonb)`)).toBe("NEKTET");
  });

  it("gir innlogget ikke-admin null rader, ikke data", async () => {
    // Rollen har select, men RLS-policyen slipper bare is_admin() gjennom.
    const direkte = await som("authenticated", "tilfeldig@example.com", "select * from admin_research_items");
    expect(direkte).toEqual([]);
    expect(await som("authenticated", "tilfeldig@example.com", "select * from public.research_items(null)")).toEqual([]);
    expect(await som("authenticated", "tilfeldig@example.com", "select * from public.research_near(59.9139,10.7522,5000)")).toEqual([]);
  });

  it("nekter innlogget ikke-admin å skrive", async () => {
    expect(
      await som(
        "authenticated",
        "tilfeldig@example.com",
        `select public.save_research_item(null, '{"category":"x","title":"y"}'::jsonb)`,
      ),
    ).toBe("NEKTET");
  });

  it("lekker aldri research gjennom det offentlige oppslaget", async () => {
    // features_near leser area_features — en annen tabell. Research har ingen vei dit.
    const nær = await db.rpc<{ title: string }>("features_near", {
      lat: 59.9139,
      lng: 10.7522,
      radius_m: 10_000,
      categories: null,
      max_results: 1000,
    });
    expect(nær.map((r) => r.title)).not.toContain("Testfunn");
    const antall = await db.pg.query<{ n: number }>(
      "select count(*)::int as n from area_features where title = 'Testfunn'",
    );
    expect(antall.rows[0]!.n).toBe(0);
  });

  it("holder flere kilder per funn, med hovedkilden først", async () => {
    await db.rpc("add_research_source", {
      p_item_id: itemId,
      p_fields: { source_name: "Kilde A", primary_source: true, source_url: "https://example.no/a" },
    });
    await db.rpc("add_research_source", {
      p_item_id: itemId,
      p_fields: { source_name: "Kilde B", supports_claim: false },
    });
    const kilder = await db.rpc<{ source_name: string; primary_source: boolean }>("research_sources", {
      p_item_id: itemId,
    });
    expect(kilder).toHaveLength(2);
    expect(kilder[0]!.primary_source).toBe(true);
    const [item] = await db.rpc<{ source_count: number }>("research_items", { p_search: null });
    expect(Number(item!.source_count)).toBe(2);
  });

  it("avviser kilde-URL som ikke er http(s)", async () => {
    await expect(
      db.rpc("add_research_source", {
        p_item_id: itemId,
        p_fields: { source_name: "Rar", source_url: "javascript:alert(1)" },
      }),
    ).rejects.toThrow();
  });

  it("finner funn på kildenavn, ikke bare på tittel", async () => {
    const treff = await db.rpc<{ title: string }>("research_items", { p_search: "Kilde A" });
    expect(treff.map((r) => r.title)).toContain("Testfunn");
  });

  it("beholder felt som ikke sendes med i en oppdatering", async () => {
    await db.rpc("save_research_item", { p_id: itemId, p_fields: { interest_level: "high" } });
    const [rad] = await db.rpc<{ title: string; municipality: string; interest_level: string }>("research_items", {
      p_search: "Testfunn",
    });
    expect(rad!.title).toBe("Testfunn");
    expect(rad!.municipality).toBe("Oslo");
    expect(rad!.interest_level).toBe("high");
  });

  it("holder avviste funn ute av kartet", async () => {
    await db.rpc("save_research_item", { p_id: itemId, p_fields: { verification_status: "rejected" } });
    const nær = await db.rpc<{ title: string }>("research_near", { lat: 59.9139, lng: 10.7522, radius_m: 1000 });
    expect(nær.map((r) => r.title)).not.toContain("Testfunn");
    await db.rpc("save_research_item", { p_id: itemId, p_fields: { verification_status: "unverified" } });
    const etter = await db.rpc<{ title: string }>("research_near", { lat: 59.9139, lng: 10.7522, radius_m: 1000 });
    expect(etter.map((r) => r.title)).toContain("Testfunn");
  });

  it("setter interne standardverdier for et manuelt lead", async () => {
    const [rad] = await db.rpc<{ origin_type: string; sensitivity: string; confidence: string }>("research_items", {
      p_search: "Testfunn",
    });
    expect(rad!.origin_type).toBe("manual");
    expect(rad!.sensitivity).toBe("internal_only");
    expect(rad!.confidence).toBe("low");
  });

  /**
   * Regresjonstest for det geografiske oppslaget.
   *
   * Egne Hjems vei 5 ligger 33 m fra Ringstabekkveien 89 — to naboadresser på Bekkestua.
   * Koordinatene er Kartverkets representasjonspunkter, hentet gjennom samme adresse-API som
   * resten av NaboRadar bruker. Et funn med presis adresse skal dukke opp i adressesøket på
   * enhver radius vi tilbyr, og her på den minste.
   */
  it("finner et nabofunn fra et søkepunkt 33 m unna", async () => {
    const EGNE_HJEMS = { lat: 59.919488, lng: 10.597865 };
    const RINGSTABEKKVEIEN_89 = { lat: 59.919287, lng: 10.59829 };

    const [nytt] = await db.rpc<string>("save_research_item", {
      p_id: null,
      p_fields: {
        category: "Omsorg / bofellesskap",
        title: "Nabofunn",
        address: "Egne Hjems vei 5",
        municipality: "Bærum",
        latitude: EGNE_HJEMS.lat,
        longitude: EGNE_HJEMS.lng,
        verification_status: "investigated_not_confirmed",
        sensitivity: "internal_only",
      },
    });
    expect(nytt).toBeTruthy();

    for (const radius of [500, 1000, 3000]) {
      const nær = await db.rpc<{ title: string; distance_m: number }>("research_near", {
        lat: RINGSTABEKKVEIEN_89.lat,
        lng: RINGSTABEKKVEIEN_89.lng,
        radius_m: radius,
      });
      const treff = nær.find((r) => r.title === "Nabofunn");
      expect(treff, `skal finnes innen ${radius} m`).toBeDefined();
      expect(treff!.distance_m).toBeGreaterThan(25);
      expect(treff!.distance_m).toBeLessThan(45);
    }

    // internal_only og investigated_not_confirmed skal ikke filtrere noe bort — det er
    // standardtilstanden for et manuelt lead, og ville tømt adressesøket for alt nytt.
    const alle = await db.rpc<{ title: string; sensitivity: string }>("research_near", {
      lat: RINGSTABEKKVEIEN_89.lat,
      lng: RINGSTABEKKVEIEN_89.lng,
      radius_m: 500,
    });
    expect(alle.every((r) => r.sensitivity === "internal_only")).toBe(true);
  });

  it("sorterer nærmeste funn først", async () => {
    // Samme punkt som over, men med et funn lenger unna lagt til etterpå, så rekkefølgen
    // ikke kan komme av innsettingsrekkefølgen.
    await db.rpc("save_research_item", {
      p_id: null,
      p_fields: {
        category: "Infrastruktur / større prosjekter",
        title: "Lenger unna",
        latitude: 59.9295,
        longitude: 10.6109,
      },
    });
    const nær = await db.rpc<{ title: string; distance_m: number }>("research_near", {
      lat: 59.919287,
      lng: 10.59829,
      radius_m: 3000,
    });
    const avstander = nær.map((r) => Number(r.distance_m));
    expect(avstander).toEqual([...avstander].sort((a, b) => a - b));
    expect(nær[0]!.title).toBe("Nabofunn");
  });

  it("krever provider for importerte funn", async () => {
    await expect(
      db.rpc("save_research_item", {
        p_id: null,
        p_fields: { category: "Omsorg / bofellesskap", title: "Import uten kilde", origin_type: "imported" },
      }),
    ).rejects.toThrow();
  });
});
