import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/**
 * To triggere kan fyre nesten samtidig — pg_cron og GitHubs egen schedule. Da skal samme
 * provider ikke kunne synkes to ganger. claim_next_due_sync stempler last_attempt_at i samme
 * setning som den velger, så den andre workeren ser ingenting forfalt.
 */
describe("krav på forfalt provider", { timeout: 30_000 }, () => {
  let db: Db;
  const provider = async (id: string) =>
    (await db.pg.query<Record<string, unknown>>("select * from providers where id = $1", [id])).rows[0]!;

  beforeAll(async () => {
    db = await createPgliteDb();
    // Alle andre providere settes som nylig kjørt, så testene styrer hva som er forfalt.
    await db.pg.query("update providers set last_attempt_at = now()");
  });

  const gjørForfalt = (id: string) =>
    db.pg.query("update providers set last_attempt_at = now() - interval '30 days' where id = $1", [id]);

  it("gir én provider av gangen, og stempler den med det samme", async () => {
    await gjørForfalt("mdir-forurenset-grunn");
    const før = await provider("mdir-forurenset-grunn");

    const [krav] = await db.rpc<{ provider_id: string; mode: string; reason: string }>("claim_next_due_sync");
    expect(krav!.provider_id).toBe("mdir-forurenset-grunn");
    expect(krav!.mode).toBe("full");
    expect(krav!.reason).toContain("forfalt");

    const etter = await provider("mdir-forurenset-grunn");
    expect(new Date(String(etter.last_attempt_at)).getTime()).toBeGreaterThan(
      new Date(String(før.last_attempt_at)).getTime(),
    );
  });

  it("gir ikke samme provider to ganger", async () => {
    await gjørForfalt("nve-nettanlegg");
    const [første] = await db.rpc<{ provider_id: string }>("claim_next_due_sync");
    expect(første!.provider_id).toBe("nve-nettanlegg");

    // Den andre workeren kommer et øyeblikk senere og finner ingenting.
    const andre = await db.rpc<{ provider_id: string }>("claim_next_due_sync");
    expect(andre).toEqual([]);
  });

  it("deler to forfalte providere mellom to workere, uten overlapp", async () => {
    await gjørForfalt("udir-skoler");
    await gjørForfalt("udir-barnehager");

    const [a] = await db.rpc<{ provider_id: string }>("claim_next_due_sync");
    const [b] = await db.rpc<{ provider_id: string }>("claim_next_due_sync");
    const tom = await db.rpc<{ provider_id: string }>("claim_next_due_sync");

    expect([a!.provider_id, b!.provider_id].sort()).toEqual(["udir-barnehager", "udir-skoler"]);
    expect(tom).toEqual([]);
  });

  it("lar providere som ikke er forfalt være i fred", async () => {
    expect(await db.rpc("claim_next_due_sync")).toEqual([]);
  });

  it("tar med en provider som feilet sist, men ikke en som er slått av", async () => {
    await db.pg.query(
      "update providers set status = 'error', last_attempt_at = now() - interval '30 days' where id = 'nve-kvikkleire-soner'",
    );
    await db.pg.query(
      "update providers set status = 'disabled', last_attempt_at = now() - interval '30 days' where id = 'mdir-industri-tillatelse'",
    );

    const tatt: string[] = [];
    for (;;) {
      const [rad] = await db.rpc<{ provider_id: string }>("claim_next_due_sync");
      if (!rad) break;
      tatt.push(rad.provider_id);
    }
    expect(tatt).toContain("nve-kvikkleire-soner");
    expect(tatt).not.toContain("mdir-industri-tillatelse");
  });

  it("lar sync_due være en ren lesespørring, uten å stemple", async () => {
    await gjørForfalt("dibk-planning-started");
    const før = await provider("dibk-planning-started");
    await db.rpc("sync_due");
    const etter = await provider("dibk-planning-started");
    expect(etter.last_attempt_at).toEqual(før.last_attempt_at);
  });
});
