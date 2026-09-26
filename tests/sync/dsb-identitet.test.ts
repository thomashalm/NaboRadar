import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { DsbTilfluktsromProvider } from "@/lib/providers/dsb/tilfluktsrom";
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
    const { fetchImpl } = fakeDsbFetch(rom, 1);
    // Fjerner romnr fra det første rommet i svaret.
    const uten: typeof fetchImpl = async (input, init) => {
      const svar = await fetchImpl(input, init);
      const xml = (await svar.text()).replace("<app:romnr>700</app:romnr>", "");
      return new Response(xml, { status: 200, headers: { "content-type": "application/xml" } });
    };

    const resultat = await runSync(new DsbTilfluktsromProvider(uten, TEST_RETRY), db, { mode: "full" });
    expect(resultat.records).toBe(24);
    expect(resultat.rejected).toBe(1);
    expect(resultat.errors.some((e) => e.includes("mangler romnr"))).toBe(true);
    // Det avviste rommet skal ikke ligge i basen under noen annen nøkkel.
    expect((await rader()).map((r) => r.external_id)).not.toContain("700");
  });
});
