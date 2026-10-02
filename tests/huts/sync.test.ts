import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { HUT_REFRESH_FN, HUT_SOURCE_CATEGORY } from "@/lib/huts/types";
import type { AreaFeatureProvider, RawBatch } from "@/lib/providers/types";
import { runSync } from "@/lib/sync/run";
import type { NormalizedAreaFeature } from "@/types/area-feature";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/** En hyttekilde som leverer det testen ber om. */
function kilde(navn: string[], opts: { feil?: boolean } = {}): AreaFeatureProvider {
  return {
    id: "kartverket-n50-hytter",
    name: "Test",
    owner: "Test",
    recordKind: "area_feature",
    license: null,
    defaultStatus: "active",
    statusReason: null,
    postSyncFn: HUT_REFRESH_FN,
    async *fetch(): AsyncIterable<RawBatch> {
      if (opts.feil) throw new Error("kilden er nede");
      yield { features: navn, documents: [] };
    },
    normalize(batch) {
      const records = (batch.features as string[]).map((n, i): NormalizedAreaFeature => ({
        providerId: "kartverket-n50-hytter",
        externalId: `0301:${n.toLowerCase()}`,
        category: HUT_SOURCE_CATEGORY,
        subtype: "unstaffed_hut",
        title: n,
        geometry: { type: "Point", coordinates: [10.6 + i * 0.05, 60] },
        attributes: { hut_type: "unstaffed_hut", owner_kind: "dnt", municipality_number: "0301" },
        sourceUrl: null,
        sourceUrlType: null,
        sourceUpdatedAt: null,
      }));
      return { records, rejected: [] };
    },
    async healthCheck() {
      return { ok: true, checkedAt: new Date().toISOString(), latencyMs: 1, message: null };
    },
  };
}

describe("sync av en hyttekilde", { timeout: 60_000 }, () => {
  let db: Db;
  const aktive = async () =>
    (await db.pg.query<{ name: string }>(`select name from huts where archived_at is null order by name`)).rows.map((r) => r.name);

  beforeAll(async () => {
    db = await createPgliteDb();
  });

  it("bygger hyttene i samme kjøring som kildepostene skrives", async () => {
    const resultat = await runSync(kilde(["Alfa", "Bravo", "Charlie"]), db, { mode: "full" });
    expect(resultat).toMatchObject({ status: "success", inserted: 3 });
    expect(await aktive()).toEqual(["Alfa", "Bravo", "Charlie"]);
  });

  it("arkiverer hytta når kilden ikke lenger har den", async () => {
    const resultat = await runSync(kilde(["Alfa", "Bravo"]), db, { mode: "full" });
    expect(resultat).toMatchObject({ status: "success", removed: 1 });
    expect(await aktive()).toEqual(["Alfa", "Bravo"]);
  });

  it("rører ikke hyttene når kjøringen feiler", async () => {
    const resultat = await runSync(kilde([], { feil: true }), db, { mode: "full" });
    expect(resultat.status).toBe("failed");
    expect(await aktive()).toEqual(["Alfa", "Bravo"]);
  });

  it("rører ikke hyttene når kilden plutselig svarer tomt", async () => {
    // Vakten stopper oppryddingen: et tomt svar er en feil hos kilden, ikke et land uten hytter.
    const resultat = await runSync(kilde([]), db, { mode: "full" });
    expect(resultat).toMatchObject({ suspicious: true, reconciled: false });
    expect(await aktive()).toEqual(["Alfa", "Bravo"]);
  });
});
