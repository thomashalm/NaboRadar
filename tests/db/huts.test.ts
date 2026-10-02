import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { destinationPoint } from "@/lib/geo/radius";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

const N50 = "kartverket-n50-hytter";
const TRB = "kartverket-turrutebasen-hytter";
const ORIGIN = { lat: 60.0, lng: 10.6 };

interface Kildepost {
  external_id: string;
  title: string;
  /** Meter nord for origo. */
  nord?: number;
  hut_type?: string | null;
  owner_kind?: string | null;
  manager_name?: string | null;
  locked?: boolean | null;
  municipality_number?: string | null;
}

/**
 * Hytter og koier: fra kildeposter til kanoniske hytter (migrasjon 20261019000000).
 *
 * Det som testes er løftene modellen gir: én fysisk hytte er én rad med en ID som overlever at
 * kilden bytter nøkkel; to kilder for samme hytte blir én hytte; navnelikhet alene kobler
 * aldri; og ingenting er synlig utenfra før kategorien er publisert.
 */
describe("hytter og koier", { timeout: 60_000 }, () => {
  let db: Db;

  const post = (k: Kildepost) => ({
    external_id: k.external_id,
    category: "hytte_kilde",
    subtype: k.hut_type ?? "hytte",
    title: k.title,
    geometry: { type: "Point", coordinates: destinationPoint(ORIGIN.lat, ORIGIN.lng, k.nord ?? 0, 0) },
    attributes: {
      hut_type: k.hut_type === undefined ? "unstaffed_hut" : k.hut_type,
      owner_kind: k.owner_kind ?? null,
      manager_name: k.manager_name ?? null,
      locked: k.locked ?? null,
      overnight: null,
      beds: null,
      municipality_number: k.municipality_number ?? null,
    },
    source_url: null,
    source_url_type: null,
    source_updated_at: null,
    content_hash: JSON.stringify(k),
  });

  /** Én full sync av én kilde: skriv postene, marker resten som fjernet, og bygg hyttene på nytt. */
  async function sync(provider: string, poster: Kildepost[]) {
    const at = new Date().toISOString();
    await db.rpc("upsert_area_features", { p_provider_id: provider, p_features: poster.map(post), p_synced_at: at });
    await db.rpc("mark_area_features_removed", { p_provider_id: provider, p_run_synced_at: at, p_keep_external_ids: [] });
    const [tellere] = await db.rpc<Record<string, number>>("refresh_huts");
    return tellere!;
  }

  const hytter = async () =>
    (await db.pg.query<{ id: string; name: string; hut_type: string; owner_kind: string; manager_name: string | null; confidence: string; archived: boolean; review_reason: string | null; alt_names: string[]; kilder: number }>(
      `select h.id, h.name, h.hut_type, h.owner_kind, h.manager_name, h.confidence, h.archived_at is not null as archived,
              h.review_reason, h.alt_names,
              (select count(*)::int from hut_sources s join area_features f on f.id = s.feature_id
                where s.hut_id = h.id and f.removed_from_source_at is null) as kilder
       from huts h order by h.name, h.id`,
    )).rows;
  const hytte = async (navn: string) => (await hytter()).find((h) => h.name === navn);

  async function som<T>(rolle: string, sql: string, email?: string): Promise<T[] | "NEKTET"> {
    await db.pg.exec("begin");
    try {
      await db.pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(email ? { role: rolle, email } : { role: rolle })]);
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
  });

  describe("kobling og dedup", () => {
    it("oppretter én hytte per post fra hovedkilden", async () => {
      const t = await sync(N50, [
        { external_id: "0301:kobberhaug", title: "Kobberhaughytta", hut_type: "staffed_hut", owner_kind: "dnt", locked: false, municipality_number: "0301" },
        { external_id: "0301:smedmyr", title: "Smedmyrkoia", nord: 2000, owner_kind: "dnt", municipality_number: "0301" },
        { external_id: "0301:tomte", title: "Tømtehytta", nord: 5000, owner_kind: "dnt", municipality_number: "0301" },
        // To poster fra samme kilde tolv meter fra hverandre er to hytter, ikke én.
        { external_id: "0301:lilletomte", title: "Lille Tømtehytta", nord: 5012, owner_kind: "dnt", municipality_number: "0301" },
      ]);
      expect(t).toMatchObject({ created: 4, linked: 0 });
      expect((await hytter()).map((h) => h.name)).toEqual(["Kobberhaughytta", "Lille Tømtehytta", "Smedmyrkoia", "Tømtehytta"]);
      expect((await hytte("Kobberhaughytta"))!.confidence).toBe("medium");
    });

    it("kobler sekundærkilden til samme hytte i stedet for å lage en ny", async () => {
      const t = await sync(TRB, [
        { external_id: "uuid-kobberhaug", title: "Kobberhaughytta", hut_type: "staffed_hut", owner_kind: "dnt" },
        // Annen skrivemåte, samme sted: kobles på posisjon, og navnet tas vare på til søk.
        { external_id: "uuid-smedmyr", title: "Smedmyrkoia DNT", nord: 2003, manager_name: "DNT Oslo og Omegn" },
        // Samme navn 250 m unna: samme hytte, unøyaktig punkt i den ene kilden.
        { external_id: "uuid-tomte", title: "Tømtehytta", nord: 5250 },
      ]);
      expect(t).toMatchObject({ created: 0, linked: 3 });
      expect(await hytter()).toHaveLength(4);

      const kobberhaug = (await hytte("Kobberhaughytta"))!;
      expect(kobberhaug).toMatchObject({ kilder: 2, confidence: "high" });

      const smedmyr = (await hytte("Smedmyrkoia"))!;
      expect(smedmyr).toMatchObject({ kilder: 2, manager_name: "DNT Oslo og Omegn", alt_names: ["Smedmyrkoia DNT"] });
      // Hovedkilden vinner navn og eierkategori; sekundærkilden fyller det hovedkilden mangler.
      expect(smedmyr.owner_kind).toBe("dnt");

      expect((await hytte("Tømtehytta"))!.kilder).toBe(2);
      expect((await hytte("Lille Tømtehytta"))!.kilder).toBe(1);
    });

    it("kobler aldri på navn alene", async () => {
      await sync(TRB, [
        { external_id: "uuid-kobberhaug", title: "Kobberhaughytta", hut_type: "staffed_hut", owner_kind: "dnt" },
        { external_id: "uuid-smedmyr", title: "Smedmyrkoia DNT", nord: 2003, manager_name: "DNT Oslo og Omegn" },
        { external_id: "uuid-tomte", title: "Tømtehytta", nord: 5250 },
        // Samme navn som en eksisterende hytte, men ni kilometer unna: en annen hytte.
        { external_id: "uuid-annen-tomte", title: "Tømtehytta", nord: 14_000 },
      ]);
      const tomte = (await hytter()).filter((h) => h.name === "Tømtehytta");
      expect(tomte).toHaveLength(2);
      // Bare sekundærkilden kjenner den nye, så tilliten er lav — og den går til kontroll.
      expect(tomte.map((h) => h.confidence).sort()).toEqual(["high", "low"]);
      expect(tomte.find((h) => h.confidence === "low")!.review_reason).toBe("Finnes bare i en sekundærkilde");
    });

    it("kjenner igjen et navn som er begynnelsen på det andre, men bare på kort avstand", async () => {
      await db.pg.exec("begin");
      try {
        await sync(N50, [{ external_id: "x:snellingen", title: "Snellingen", nord: 40_000, owner_kind: "dnt" }]);
        const t = await sync(TRB, [
          { external_id: "uuid-snellingen", title: "Snellingen DNT hytta", nord: 40_110, hut_type: "self_service_hut" },
          { external_id: "uuid-snellingen-langt-unna", title: "Snellingen DNT hytta", nord: 41_000 },
        ]);
        expect(t).toMatchObject({ linked: 1, created: 1 });
        const snellingen = (await hytter()).filter((h) => h.name.startsWith("Snellingen") && !h.archived);
        expect(snellingen.map((h) => [h.name, h.kilder])).toEqual([["Snellingen", 2], ["Snellingen DNT hytta", 1]]);
        expect(snellingen[0]!.review_reason).toContain("uenige om hyttetype");
      } finally {
        await db.pg.exec("rollback");
      }
    });

    it("lar ikke en post uten type opprette en hytte", async () => {
      const før = (await hytter()).length;
      const t = await sync(TRB, [
        { external_id: "uuid-kobberhaug", title: "Kobberhaughytta", hut_type: "staffed_hut", owner_kind: "dnt" },
        { external_id: "uuid-smedmyr", title: "Smedmyrkoia DNT", nord: 2003, manager_name: "DNT Oslo og Omegn" },
        { external_id: "uuid-tomte", title: "Tømtehytta", nord: 5250 },
        { external_id: "uuid-annen-tomte", title: "Tømtehytta", nord: 14_000 },
        { external_id: "uuid-ullevalseter", title: "Ullevålseter", nord: 20_000, hut_type: null },
      ]);
      expect(t.unmatched).toBe(1);
      expect(await hytter()).toHaveLength(før);
    });

    it("flagger to hytter som ligger tett, uten å slå dem sammen", async () => {
      expect((await hytte("Lille Tømtehytta"))!.review_reason).toContain("Mulig dublett: Tømtehytta");
    });

    it("flagger at kildene er uenige om typen", async () => {
      await sync(N50, [
        { external_id: "0301:kobberhaug", title: "Kobberhaughytta", hut_type: "unstaffed_hut", owner_kind: "dnt", municipality_number: "0301" },
        { external_id: "0301:smedmyr", title: "Smedmyrkoia", nord: 2000, owner_kind: "dnt", municipality_number: "0301" },
        { external_id: "0301:tomte", title: "Tømtehytta", nord: 5000, owner_kind: "dnt", municipality_number: "0301" },
        { external_id: "0301:lilletomte", title: "Lille Tømtehytta", nord: 5012, owner_kind: "dnt", municipality_number: "0301" },
      ]);
      const kobberhaug = (await hytte("Kobberhaughytta"))!;
      expect(kobberhaug.review_reason).toContain("uenige om hyttetype");
      // Hovedkilden vinner feltet; uenigheten går til kontroll.
      expect(kobberhaug.hut_type).toBe("unstaffed_hut");
      expect(kobberhaug.confidence).toBe("medium");
    });
  });

  describe("identitet over tid", () => {
    it("beholder hyttas ID når kilden bytter nøkkel og navn", async () => {
      const før = (await hytte("Smedmyrkoia"))!.id;
      // N50 har ingen stabil ID: nøkkelen er avledet av navnet. Her har hytta fått nytt navn.
      const t = await sync(N50, [
        { external_id: "0301:kobberhaug", title: "Kobberhaughytta", hut_type: "staffed_hut", owner_kind: "dnt", municipality_number: "0301" },
        { external_id: "0301:smedmyrhytta", title: "Smedmyrhytta", nord: 2000, owner_kind: "dnt", municipality_number: "0301" },
        { external_id: "0301:tomte", title: "Tømtehytta", nord: 5000, owner_kind: "dnt", municipality_number: "0301" },
        { external_id: "0301:lilletomte", title: "Lille Tømtehytta", nord: 5012, owner_kind: "dnt", municipality_number: "0301" },
      ]);
      expect(t).toMatchObject({ created: 0, linked: 1 });
      const etter = (await hytte("Smedmyrhytta"))!;
      expect(etter.id).toBe(før);
      expect(etter.archived).toBe(false);
    });

    it("arkiverer en hytte uten aktiv kilde, og henter den tilbake når kilden gjør det", async () => {
      const full = [
        { external_id: "uuid-kobberhaug", title: "Kobberhaughytta", hut_type: "staffed_hut", owner_kind: "dnt" },
        { external_id: "uuid-smedmyr", title: "Smedmyrkoia DNT", nord: 2003, manager_name: "DNT Oslo og Omegn" },
        { external_id: "uuid-tomte", title: "Tømtehytta", nord: 5250 },
        { external_id: "uuid-annen-tomte", title: "Tømtehytta", nord: 14_000 },
      ];
      const id = (await hytter()).find((h) => h.name === "Tømtehytta" && h.confidence === "low")!.id;

      expect((await sync(TRB, full.slice(0, 3))).archived).toBe(1);
      const arkivert = (await hytter()).find((h) => h.id === id)!;
      expect(arkivert.archived).toBe(true);
      const offentlig = await db.pg.query(`select 1 from huts_public where id = $1`, [id]);
      expect(offentlig.rows).toHaveLength(0);

      expect((await sync(TRB, full)).restored).toBe(1);
      expect((await hytter()).find((h) => h.id === id)!.archived).toBe(false);
      expect(await hytter()).toHaveLength(5);
    });

    it("er idempotent", async () => {
      const før = JSON.stringify(await hytter());
      const [t] = await db.rpc<Record<string, number>>("refresh_huts");
      expect(t).toMatchObject({ created: 0, linked: 0, archived: 0, restored: 0 });
      expect(JSON.stringify(await hytter())).toBe(før);
    });
  });

  describe("offentlig leseflate", () => {
    const nær = `select name, distance_m from huts_near(${ORIGIN.lat}, ${ORIGIN.lng}, 30000, 50)`;

    it("gir ingen direkte tabelltilgang", async () => {
      for (const tabell of ["huts", "hut_sources", "huts_public"]) {
        expect(await som("anon", `select 1 from ${tabell} limit 1`)).toBe("NEKTET");
        expect(await som("authenticated", `select 1 from ${tabell} limit 1`, "drift@example.com")).toBe("NEKTET");
      }
    });

    it("stenger de interne funksjonene", async () => {
      expect(await som("anon", "select * from refresh_huts()")).toBe("NEKTET");
      expect(await som("authenticated", "select * from refresh_huts()", "drift@example.com")).toBe("NEKTET");
      expect(await som("anon", "select * from hut_review_queue()")).toBe("NEKTET");
    });

    it("viser ingenting før kategorien er publisert", async () => {
      expect(await som("anon", nær)).toEqual([]);
      expect(await som("anon", `select * from huts_in_bbox(10, 59, 11, 61)`)).toEqual([]);
      expect(await som("anon", `select * from huts_in_municipality('0301')`)).toEqual([]);
      expect(await som("anon", `select * from huts_search('kobberhaug')`)).toEqual([]);
      // Innlogget, men ikke admin: fortsatt ingenting.
      expect(await som("authenticated", nær, "noen@example.com")).toEqual([]);
    });

    it("lar admin se hyttene før publisering", async () => {
      const rader = (await som<{ name: string }>("authenticated", nær, "drift@example.com")) as { name: string }[];
      expect(rader.map((r) => r.name)).toContain("Kobberhaughytta");
      const kø = (await som<{ name: string }>("authenticated", "select name from hut_review_queue()", "drift@example.com")) as { name: string }[];
      expect(kø.map((r) => r.name)).toContain("Lille Tømtehytta");
      // Køen er tom for en innlogget som ikke er admin.
      expect(await som("authenticated", "select name from hut_review_queue()", "noen@example.com")).toEqual([]);
    });

    it("returnerer aldri kildepostene gjennom features_near", async () => {
      await db.pg.exec(`update area_feature_categories set is_public = true where category = 'hytte'`);
      const rader = (await som<{ category: string }>("anon", `select category from features_near(${ORIGIN.lat}, ${ORIGIN.lng}, 10000)`)) as { category: string }[];
      expect(rader.some((r) => r.category === "hytte_kilde")).toBe(false);
      expect(await som("anon", `select * from features_near(${ORIGIN.lat}, ${ORIGIN.lng}, 10000, array['hytte_kilde'])`)).toEqual([]);
    });

    describe("etter publisering", () => {
      it("radius: nærmest først, med avstand, og innenfor grensen", async () => {
        const rader = (await som<{ name: string; distance_m: number }>("anon", nær)) as { name: string; distance_m: number }[];
        // Fire, ikke fem: hytta som bare finnes i sekundærkilden er ikke bekreftet, og vises ikke.
        expect(rader.map((r) => r.name)).toEqual(["Kobberhaughytta", "Smedmyrhytta", "Tømtehytta", "Lille Tømtehytta"]);
        expect(rader[1]!.distance_m).toBeGreaterThan(1900);
        expect(rader[1]!.distance_m).toBeLessThan(2100);

        const innen3km = (await som<{ name: string }>("anon", `select name from huts_near(${ORIGIN.lat}, ${ORIGIN.lng}, 3000, 50)`)) as { name: string }[];
        expect(innen3km.map((r) => r.name)).toEqual(["Kobberhaughytta", "Smedmyrhytta"]);
        // Over 50 km er ikke «i nærheten», uansett hva kalleren ber om.
        expect(await som("anon", `select name from huts_near(${ORIGIN.lat}, ${ORIGIN.lng}, 60000, 50)`)).toEqual([]);
      });

      it("filtrerer på type og eier", async () => {
        const betjent = (await som<{ name: string }>("anon", `select name from huts_near(${ORIGIN.lat}, ${ORIGIN.lng}, 30000, 50, array['staffed_hut'])`)) as { name: string }[];
        expect(betjent.map((r) => r.name)).toEqual(["Kobberhaughytta"]);
        const dnt = (await som<{ name: string }>("anon", `select name from huts_near(${ORIGIN.lat}, ${ORIGIN.lng}, 30000, 50, null, array['dnt'])`)) as { name: string }[];
        expect(dnt).toHaveLength(4);
      });

      it("kartutsnitt: bare det som ligger i utsnittet, med totalantall", async () => {
        const sør = destinationPoint(ORIGIN.lat, ORIGIN.lng, 500, 180)[1];
        const nord = destinationPoint(ORIGIN.lat, ORIGIN.lng, 3000, 0)[1];
        const rader = (await som<{ name: string; total: string }>("anon", `select name, total from huts_in_bbox(10.5, ${sør}, 10.7, ${nord})`)) as { name: string; total: string }[];
        expect(rader.map((r) => r.name)).toEqual(["Kobberhaughytta", "Smedmyrhytta"]);
        expect(Number(rader[0]!.total)).toBe(2);
        // Kuttet liste sier fortsatt hvor mange som finnes.
        const kuttet = (await som<{ total: string }>("anon", `select total from huts_in_bbox(10, 59, 11, 61, null, null, 1)`)) as { total: string }[];
        expect(kuttet).toHaveLength(1);
        expect(Number(kuttet[0]!.total)).toBe(4);
        // Et utsnitt som er snudd eller utenfor kloden gir ingenting, ikke en feil.
        expect(await som("anon", `select * from huts_in_bbox(11, 61, 10, 59)`)).toEqual([]);
      });

      it("kommune og navnesøk", async () => {
        const oslo = (await som<{ name: string }>("anon", `select name from huts_in_municipality('0301')`)) as { name: string }[];
        expect(oslo).toHaveLength(4);
        expect(await som("anon", `select name from huts_in_municipality('5001')`)).toEqual([]);

        const treff = (await som<{ name: string }>("anon", `select name from huts_search('tømte')`)) as { name: string }[];
        expect(treff.map((r) => r.name)).toEqual(["Tømtehytta", "Lille Tømtehytta"]);
        // Søk treffer også navnet fra den andre kilden.
        const alt = (await som<{ name: string }>("anon", `select name from huts_search('Smedmyrkoia')`)) as { name: string }[];
        expect(alt.map((r) => r.name)).toEqual(["Smedmyrhytta"]);
        expect(await som("anon", `select name from huts_search('a')`)).toEqual([]);
      });

      it("viser en hytte fra sekundærkilden først når et menneske har bekreftet den", async () => {
        const antall = async () => ((await som<{ name: string }>("anon", `select name from huts_near(${ORIGIN.lat}, ${ORIGIN.lng}, 30000, 50)`)) as unknown[]).length;
        expect(await antall()).toBe(4);
        await db.pg.exec(`update huts set last_verified_at = now() where confidence = 'low'`);
        try {
          expect(await antall()).toBe(5);
        } finally {
          await db.pg.exec(`update huts set last_verified_at = null where confidence = 'low'`);
        }
      });

      it("lekker ikke kontrollfelt", async () => {
        const [rad] = (await som<Record<string, unknown>>("anon", `select * from huts_near(${ORIGIN.lat}, ${ORIGIN.lng}, 30000, 1)`)) as Record<string, unknown>[];
        expect(Object.keys(rad!)).not.toEqual(expect.arrayContaining(["review_reason", "confidence", "attributes", "alt_names"]));
      });
    });
  });
});
