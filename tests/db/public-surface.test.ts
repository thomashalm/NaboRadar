import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

const ORIGIN = { lat: 59.9139, lng: 10.7522 };

/**
 * Den offentlige leseflaten (migrasjon 20261018000000).
 *
 * To løfter: offentlig lesing går bare gjennom RPC-ene, og en kategori er usynlig til den er
 * publisert. Det første gjør at grensene på radius og antall faktisk er grenser. Det andre gjør
 * at et datasett kan importeres og kvalitetssikres før noen ser det.
 */
describe("offentlig leseflate", { timeout: 30_000 }, () => {
  let db: Db;

  /** Kjører et uttrykk som en gitt rolle. Rulles alltid tilbake. "NEKTET" = feil fra Postgres. */
  async function som<T>(rolle: string, sql: string): Promise<T[] | "NEKTET"> {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: rolle })]);
      await db.pg.exec(`set local role ${rolle}`);
      return (await db.pg.query<T>(sql)).rows;
    } catch {
      return "NEKTET";
    } finally {
      await db.pg.exec("rollback");
    }
  }

  const punkt = (externalId: string, category: string, subtype: string) => ({
    external_id: externalId,
    category,
    subtype,
    title: `Test ${externalId}`,
    geometry: { type: "Point", coordinates: [ORIGIN.lng, ORIGIN.lat] },
    attributes: {},
    source_url: null,
    source_url_type: null,
    source_updated_at: null,
    content_hash: externalId,
  });

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.pg.exec(`
      insert into area_feature_categories (category, domain, label) values ('testhytte', 'friluft', 'Testhytter');
      insert into events (provider_id, external_id, type, title, geom, content_hash, raw_data)
      values ('dibk-planning-started', 'p1', 'planning_started', 'Testplan',
              extensions.st_multi(extensions.st_buffer(extensions.st_setsrid(extensions.st_makepoint(10.7522, 59.9139), 4326), 0.001)),
              'h', '{"features": []}'::jsonb);
    `);
    await db.rpc("upsert_area_features", {
      p_provider_id: "mdir-industri-tillatelse",
      p_features: [punkt("anlegg", "industri", "industrianlegg"), punkt("hytte", "testhytte", "ubetjent")],
      p_synced_at: new Date().toISOString(),
    });
  });

  describe("ingen direkte tabelltilgang", () => {
    for (const tabell of ["area_features", "events", "event_documents", "providers", "area_feature_categories"]) {
      it(`nekter anon og authenticated å lese ${tabell}`, async () => {
        expect(await som("anon", `select 1 from ${tabell} limit 1`)).toBe("NEKTET");
        expect(await som("authenticated", `select 1 from ${tabell} limit 1`)).toBe("NEKTET");
      });
    }

    it("nekter anon å lese rådata fra plansaker", async () => {
      expect(await som("anon", "select raw_data from events")).toBe("NEKTET");
    });
  });

  describe("RPC-ene virker fortsatt for anon", () => {
    it("features_near og features_count_near", async () => {
      const rader = await som<{ external_id: string }>("anon", `select * from features_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500)`);
      expect(rader).not.toBe("NEKTET");
      expect((rader as { external_id: string }[]).map((r) => r.external_id)).toContain("anlegg");
      const antall = await som<{ category: string; antall: number }>("anon", `select * from features_count_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500)`);
      expect((antall as { category: string }[]).map((r) => r.category)).toEqual(["industri"]);
    });

    it("events_within, get_event og data_status", async () => {
      const saker = await som<{ id: string; title: string }>("anon", `select * from events_within(${ORIGIN.lat}, ${ORIGIN.lng}, 500)`);
      expect(saker).not.toBe("NEKTET");
      const sak = (saker as { id: string; title: string }[])[0]!;
      expect(sak.title).toBe("Testplan");
      const detalj = await som<Record<string, unknown>>("anon", `select * from get_event('${sak.id}')`);
      expect(detalj).not.toBe("NEKTET");
      // Rådata er aldri en del av svaret.
      expect(Object.keys((detalj as Record<string, unknown>[])[0]!)).not.toContain("raw_data");
      expect(await som("anon", "select * from data_status()")).not.toBe("NEKTET");
    });
  });

  describe("upubliserte kategorier", () => {
    const hytter = (kategorier: string) =>
      som<{ external_id: string }>("anon", `select * from features_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500, ${kategorier})`);

    it("en ny kategori er upublisert som standard", async () => {
      const [rad] = (await db.pg.query<{ is_public: boolean }>(`select is_public from area_feature_categories where category = 'testhytte'`)).rows;
      expect(rad!.is_public).toBe(false);
    });

    it("returneres ikke, verken med null eller når kategorien spørres etter direkte", async () => {
      expect(((await hytter("null")) as { external_id: string }[]).map((r) => r.external_id)).not.toContain("hytte");
      expect(await hytter("array['testhytte']")).toEqual([]);
      const antall = await som<{ category: string }>("anon", `select * from features_count_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500, array['testhytte'])`);
      expect(antall).toEqual([]);
    });

    it("blir synlig når kategorien publiseres", async () => {
      await db.pg.exec(`update area_feature_categories set is_public = true where category = 'testhytte'`);
      try {
        expect(((await hytter("array['testhytte']")) as { external_id: string }[]).map((r) => r.external_id)).toEqual(["hytte"]);
      } finally {
        await db.pg.exec(`update area_feature_categories set is_public = false where category = 'testhytte'`);
      }
    });

    it("admin får upubliserte kategorier fra de samme lese-RPC-ene, andre innloggede får dem ikke", async () => {
      const somBruker = async (email: string) => {
        await db.pg.exec("begin");
        try {
          await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "authenticated", email })]);
          await db.pg.exec("set local role authenticated");
          const nær = await db.pg.query<{ external_id: string }>(`select * from features_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500, array['testhytte'])`);
          const antall = await db.pg.query<{ category: string }>(`select * from features_count_near(${ORIGIN.lat}, ${ORIGIN.lng}, 500, array['testhytte'])`);
          return { nær: nær.rows.map((r) => r.external_id), antall: antall.rows.map((r) => r.category) };
        } finally {
          await db.pg.exec("rollback");
        }
      };
      await db.pg.exec(`insert into admin_users (email) values ('drift@example.com') on conflict do nothing`);
      expect(await somBruker("drift@example.com")).toEqual({ nær: ["hytte"], antall: ["testhytte"] });
      expect(await somBruker("annen@example.com")).toEqual({ nær: [], antall: [] });
    });

    it("forurenset grunn (miljo) er avpublisert: beholdt i basen, ikke i den offentlige leseflaten", async () => {
      const [rad] = (await db.pg.query<{ is_public: boolean }>(`select is_public from area_feature_categories where category = 'miljo'`)).rows;
      expect(rad!.is_public).toBe(false);
      // Alle andre kategorier fra den opprinnelige listen er fortsatt publisert.
      const publiserte = (await db.pg.query<{ category: string }>(`select category from area_feature_categories where is_public order by 1`)).rows.map((r) => r.category);
      for (const kategori of ["grunnforhold", "stoy", "infrastruktur", "industri", "tilfluktsrom", "oppvekst", "helse", "servering", "omsorg", "skolekrets"]) {
        expect(publiserte).toContain(kategori);
      }
      expect(publiserte).not.toContain("miljo");
    });

    it("en kategori som ikke står i registeret, kan ikke skrives", async () => {
      const [resultat] = await db.rpc<{ inserted: number; failed: number }>("upsert_area_features", {
        p_provider_id: "mdir-industri-tillatelse",
        p_features: [punkt("ukjent", "finnes_ikke", "x")],
        p_synced_at: new Date().toISOString(),
      });
      expect(resultat).toMatchObject({ inserted: 0, failed: 1 });
    });
  });

  describe("interne research-funksjoner", () => {
    it("er stengt for authenticated", async () => {
      const id = "00000000-0000-0000-0000-000000000000";
      expect(await som("authenticated", `select datacenter_search_plan('${id}')`)).toBe("NEKTET");
      expect(await som("authenticated", `select research_review_interval_for('${id}')`)).toBe("NEKTET");
    });
  });
});
