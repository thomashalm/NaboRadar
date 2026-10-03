import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { DsbTilfluktsromProvider, TILFLUKTSROM_NEDLASTING } from "@/lib/providers/dsb/tilfluktsrom";
import { runSync } from "@/lib/sync/run";
import { fakeDsbFetch, fakeRom } from "../helpers/fake-dsb";
import { TEST_RETRY } from "../helpers/fake-dibk";

type TestDb = Awaited<ReturnType<typeof createPgliteDb>>;

/**
 * Regresjon for DSB-identiteten.
 *
 * Feilen som skjedde: `lokalId` fra DSB er ny for hvert uttrekk, og med den som `externalId` ble
 * alle 556 tilfluktsrom opprettet på nytt og de 556 gamle markert som fjernet ved hver full sync.
 * Antallet aktive var uendret, så ingen vakt så det.
 *
 * Testen kjører to fulle syncer der alt om rommene er likt og bare lokalId og uttakstidspunkt er
 * nytt. Andre kjøring skal ikke skrive noe. Bruker vi igjen en ustabil kildeID, feiler den.
 */
describe("DSB tilfluktsrom: stabil identitet", { timeout: 30_000 }, () => {
  let db: TestDb;
  // 25 rom: over vakten sin nedre grense på 20, slik at churn-vakten er i spill.
  const rom = Array.from({ length: 25 }, (_, i) => fakeRom(700 + i));

  const sync = async (generasjon: number) => {
    const { fetchImpl } = fakeDsbFetch(rom, generasjon);
    return runSync(new DsbTilfluktsromProvider(fetchImpl, TEST_RETRY), db, { mode: "full" });
  };

  const rader = async () =>
    (
      await db.pg.query<{ external_id: string; aktiv: boolean; first_seen_at: string }>(
        `select external_id, removed_from_source_at is null as aktiv, first_seen_at
           from area_features where provider_id = 'dsb-tilfluktsrom' order by external_id`,
      )
    ).rows;

  beforeEach(async () => {
    db = await createPgliteDb();
  });

  it("bruker romnummeret som ekstern ID, ikke lokalId", async () => {
    const første = await sync(1);
    expect(første.status).toBe("success");
    expect(første.records).toBe(25);
    expect(første.inserted).toBe(25);

    const ider = (await rader()).map((r) => r.external_id);
    expect(ider).toEqual(rom.map((r) => String(r.romnr)).sort());
    // Ingen UUID-er igjen som identitet.
    expect(ider.some((id) => id.includes("-"))).toBe(false);
  });

  it("andre full sync med nye lokalId-er skriver ingenting", async () => {
    await sync(1);
    const før = await rader();

    const andre = await sync(2);

    expect(andre.status).toBe("success");
    expect(andre.records).toBe(25);
    expect(andre.inserted).toBe(0);
    expect(andre.updated).toBe(0);
    expect(andre.unchanged).toBe(25);
    expect(andre.removed).toBe(0);
    expect(andre.suspicious).toBe(false);

    const etter = await rader();
    expect(etter).toHaveLength(25);
    expect(etter.every((r) => r.aktiv)).toBe(true);
    // first_seen_at skal være den opprinnelige: rommene er ikke nye.
    expect(etter.map((r) => r.first_seen_at)).toEqual(før.map((r) => r.first_seen_at));
  });

  it("oppdaterer når et rom faktisk endrer seg", async () => {
    await sync(1);
    const endret = rom.map((r) => (r.romnr === 700 ? { ...r, plasser: 999 } : r));
    const { fetchImpl } = fakeDsbFetch(endret, 3);
    const andre = await runSync(new DsbTilfluktsromProvider(fetchImpl, TEST_RETRY), db, { mode: "full" });

    expect(andre.updated).toBe(1);
    expect(andre.unchanged).toBe(24);
    expect(andre.inserted).toBe(0);
    expect(andre.removed).toBe(0);
  });

  it("markerer et rom som er borte fra kilden, uten å røre resten", async () => {
    await sync(1);
    const { fetchImpl } = fakeDsbFetch(rom.slice(0, 24), 4);
    const andre = await runSync(new DsbTilfluktsromProvider(fetchImpl, TEST_RETRY), db, { mode: "full" });

    expect(andre.unchanged).toBe(24);
    expect(andre.inserted).toBe(0);
    expect(andre.removed).toBe(1);

    const etter = await rader();
    expect(etter.filter((r) => r.aktiv)).toHaveLength(24);
    expect(etter.filter((r) => !r.aktiv).map((r) => r.external_id)).toEqual(["724"]);
  });

  it("avviser et rom uten romnummer i stedet for å finne på en identitet", async () => {
    // Fjerner romnr fra det første rommet i fila.
    const { fetchImpl: uten } = fakeDsbFetch(rom, 1, (gml) => gml.replace("<app:romnr>700</app:romnr>", ""));

    const resultat = await runSync(new DsbTilfluktsromProvider(uten, TEST_RETRY), db, { mode: "full" });
    expect(resultat.records).toBe(24);
    expect(resultat.rejected).toBe(1);
    expect(resultat.errors.some((e) => e.includes("mangler romnr"))).toBe(true);
    // Det avviste rommet skal ikke ligge i basen under noen annen nøkkel.
    expect((await rader()).map((r) => r.external_id)).not.toContain("700");
  });

  /**
   * Kildebyttet 2026-10-04: syncen leser den landsdekkende nedlastingsfila. Et komplett uttrekk
   * får lov til å markere rom som fjernet — derfor må en fil vi ikke forstår aldri slippe
   * gjennom som «et uttrekk med null rom».
   */
  describe("fila valideres før noe skrives", () => {
    const ødelagt = async (endre: (gml: string) => string) => {
      await sync(1);
      const { fetchImpl } = fakeDsbFetch(rom, 2, endre);
      const resultat = await runSync(new DsbTilfluktsromProvider(fetchImpl, TEST_RETRY), db, { mode: "full" });
      return { resultat, etter: await rader() };
    };

    const urørt = (etter: Awaited<ReturnType<typeof rader>>) => {
      expect(etter).toHaveLength(25);
      expect(etter.every((r) => r.aktiv)).toBe(true);
    };

    it("tom fil er en feil, ikke null rom", async () => {
      const { resultat, etter } = await ødelagt((gml) => gml.replace(/<gml:featureMember>[\s\S]*<\/gml:featureMember>/, ""));
      expect(resultat.status).toBe("failed");
      expect(resultat.removed).toBe(0);
      expect(resultat.errors.join(" ")).toContain("ingen <Tilfluktsrom>");
      urørt(etter);
    });

    it("manglende nøkkelfelt stopper syncen", async () => {
      for (const felt of ["romnr", "plasser", "adresse"]) {
        const { resultat, etter } = await ødelagt((gml) => gml.replaceAll(new RegExp(`<app:${felt}>[^<]*</app:${felt}>`, "g"), ""));
        expect(resultat.status).toBe("failed");
        expect(resultat.errors.join(" ")).toContain(`«${felt}»`);
        urørt(etter);
      }
    });

    it("annet koordinatsystem stopper syncen", async () => {
      const { resultat, etter } = await ødelagt((gml) => gml.replaceAll("EPSG::25833", "EPSG::4326"));
      expect(resultat.status).toBe("failed");
      expect(resultat.errors.join(" ")).toContain("EPSG::25833");
      urørt(etter);
    });

    it("koordinater som ikke er meter i Norge stopper syncen", async () => {
      const { resultat, etter } = await ødelagt((gml) => gml.replaceAll(/<gml:pos>[^<]*<\/gml:pos>/g, "<gml:pos>59.91 10.75</gml:pos>"));
      expect(resultat.status).toBe("failed");
      expect(resultat.inserted + resultat.updated + resultat.removed).toBe(0);
      urørt(etter);
    });

    it("fil som ikke er XML, og arkiv uten GML, stopper syncen", async () => {
      const { resultat, etter } = await ødelagt(() => "<html>503 Service Unavailable</html>");
      expect(resultat.status).toBe("failed");
      urørt(etter);
    });

    it("nedlastingen feiler: ingenting skrives eller fjernes", async () => {
      await sync(1);
      const nede = (async () => new Response("feil", { status: 500 })) as typeof fetch;
      const resultat = await runSync(new DsbTilfluktsromProvider(nede, TEST_RETRY), db, { mode: "full" });
      expect(resultat.status).toBe("failed");
      urørt(await rader());
    });

    it("et komplett uttrekk der mange rom mangler markerer ikke blindt som fjernet", async () => {
      await sync(1);
      // 25 → 10 rom er et fall på 60 %, over grensen på 30 %. Avstemmingen hoppes over.
      const { fetchImpl } = fakeDsbFetch(rom.slice(0, 10), 2);
      const resultat = await runSync(new DsbTilfluktsromProvider(fetchImpl, TEST_RETRY), db, { mode: "full" });
      expect(resultat.reconciled).toBe(false);
      expect(resultat.removed).toBe(0);
      urørt(await rader());
    });

    it("leser bare nedlastingsfila — ikke WFS-en", async () => {
      const kall: string[] = [];
      const { fetchImpl } = fakeDsbFetch(rom, 1);
      const logg = (async (input: string | URL | Request, init?: RequestInit) => {
        kall.push(String(input));
        return fetchImpl(input, init);
      }) as typeof fetch;
      await runSync(new DsbTilfluktsromProvider(logg, TEST_RETRY), db, { mode: "full" });
      expect(new Set(kall)).toEqual(new Set([TILFLUKTSROM_NEDLASTING]));
      expect(kall.join(" ")).not.toContain("wfs.");
    });
  });
});
