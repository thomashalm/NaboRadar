import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { createDbNoiseCacheStore, noiseCacheKey, snapshotFromHits, type NoiseSnapshot } from "@/lib/facts/noise-cache";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

const TOKEN = "test-token-som-er-lang-nok-0123456789abcdef";
const LAT = 59.92852;
const LNG = 10.71432;
const KEY = noiseCacheKey(LAT, LNG);

const TREFF: NoiseSnapshot = {
  roadState: "hit",
  railState: "no_hit",
  roadCoverage: "by",
  railCoverage: "by",
  roadResult: { niva: "60–64 dB", nedre: 60, ovre: 64, byomrade: true },
  railResult: null,
  sourceRoundRoad: 2022,
  sourceRoundRail: 2017,
};
const IKKE_DEKKET: NoiseSnapshot = {
  roadState: "not_covered",
  railState: "not_covered",
  roadCoverage: "ingen",
  railCoverage: "ingen",
  roadResult: null,
  railResult: null,
  sourceRoundRoad: 2022,
  sourceRoundRail: 2017,
};

/**
 * Støycachen i databasen (migrasjon 20261114000000): hvem som kan lese og skrive, og at en rad
 * bare kan bety et gyldig svar.
 */
describe("støycachen i databasen", { timeout: 120_000 }, () => {
  let db: Db;
  const store = (token?: string) => createDbNoiseCacheStore(async () => db, token);

  beforeAll(async () => {
    db = await createPgliteDb();
  });

  it("avviser all skriving før tokenet er satt opp", async () => {
    await expect(store(TOKEN).put(KEY, LAT, LNG, TREFF)).rejects.toThrow(/ikke tillatt/);
    expect(await store().get(KEY)).toBeNull();
  });

  it("lagrer et svar med riktig token og leser det tilbake uendret", async () => {
    await db.pg.query(`insert into public.app_write_tokens (name, token_sha256) values ('noise_cache', sha256(convert_to($1, 'UTF8')))`, [TOKEN]);
    const hentet = await store(TOKEN).put(KEY, LAT, LNG, TREFF);
    expect(hentet).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await store().get(KEY)).toEqual({ key: KEY, ...TREFF, fetchedAt: hentet });
  });

  it("avviser feil, kort og manglende token, og lar raden stå", async () => {
    const før = await store().get(KEY);
    await expect(store("feil-token-som-er-lang-nok-0123456789abcdef").put(KEY, LAT, LNG, IKKE_DEKKET)).rejects.toThrow(/ikke tillatt/);
    await expect(store("kort").put(KEY, LAT, LNG, IKKE_DEKKET)).rejects.toThrow(/ikke tillatt/);
    // Uten token prøver ikke webappen å skrive i det hele tatt.
    expect(await store().put(KEY, LAT, LNG, IKKE_DEKKET)).toBeNull();
    expect(await store().get(KEY)).toEqual(før);
  });

  it("lagrer gyldige negative svar, og oppdaterer raden når punktet hentes på nytt", async () => {
    const hentet = await store(TOKEN).put(KEY, LAT, LNG, IKKE_DEKKET);
    expect(await store().get(KEY)).toEqual({ key: KEY, ...IKKE_DEKKET, fetchedAt: hentet });
    const { rows } = await db.pg.query<{ n: number }>(`select count(*)::int as n from public.noise_cache`);
    expect(rows[0]!.n).toBe(1);
  });

  it("holder vei og bane fra hverandre: 2022 og 2017", async () => {
    await store(TOKEN).put(KEY, LAT, LNG, TREFF);
    const { rows } = await db.pg.query<{ source_round_road: number; source_round_rail: number }>(
      `select source_round_road, source_round_rail from public.noise_cache where cache_key = $1`,
      [KEY],
    );
    expect(rows[0]).toEqual({ source_round_road: 2022, source_round_rail: 2017 });
  });

  it("har ingen tilstand for kildefeil — en feil kan ikke lagres", async () => {
    const feil = { ...TREFF, roadState: "unavailable" } as unknown as NoiseSnapshot;
    await expect(store(TOKEN).put(KEY, LAT, LNG, feil)).rejects.toThrow();
    expect((await store().get(KEY))?.roadState).toBe("hit");
  });

  it("avviser rader som motsier seg selv", async () => {
    // Treff uten intervall, og «ikke dekket» med dekning.
    await expect(store(TOKEN).put(KEY, LAT, LNG, { ...TREFF, roadResult: null })).rejects.toThrow();
    await expect(store(TOKEN).put(KEY, LAT, LNG, { ...IKKE_DEKKET, roadCoverage: "by" })).rejects.toThrow();
  });

  it("lar ikke en rad legges på en annen nøkkel enn punktets egen", async () => {
    await expect(store(TOKEN).put("59.00000,10.00000", LAT, LNG, TREFF)).rejects.toThrow(/stemmer ikke/);
    await expect(store(TOKEN).put(noiseCacheKey(48.85, 2.35), 48.85, 2.35, TREFF)).rejects.toThrow();
  });

  it("bygger samme nøkkel i databasen som i koden, også med avsluttende nuller", async () => {
    for (const [lat, lng] of [[60, 5.3], [69.64921, 18.95508], [58.1, 7.99999]] as const) {
      const key = noiseCacheKey(lat, lng);
      await store(TOKEN).put(key, lat, lng, IKKE_DEKKET);
      expect((await store().get(key))?.key).toBe(key);
    }
  });

  it("er stengt for direkte lesing og skriving; bare de to funksjonene er åpne", async () => {
    const { rows } = await db.pg.query<{ t: string; rls: boolean; anon_select: boolean; anon_insert: boolean }>(
      `select c.relname as t, c.relrowsecurity as rls,
              has_table_privilege('anon', c.oid, 'select') as anon_select,
              has_table_privilege('anon', c.oid, 'insert') as anon_insert
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname in ('noise_cache', 'app_write_tokens') order by 1`,
    );
    expect(rows).toEqual([
      { t: "app_write_tokens", rls: true, anon_select: false, anon_insert: false },
      { t: "noise_cache", rls: true, anon_select: false, anon_insert: false },
    ]);
    const policies = await db.pg.query(`select 1 from pg_policies where tablename in ('noise_cache', 'app_write_tokens')`);
    expect(policies.rows).toHaveLength(0);
    const fn = await db.pg.query<{ proname: string; anon: boolean; definer: boolean }>(
      `select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, p.prosecdef as definer
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname like 'noise_cache_%' order by 1`,
    );
    expect(fn.rows).toEqual([
      { proname: "noise_cache_get", anon: true, definer: true },
      { proname: "noise_cache_put", anon: true, definer: true },
    ]);
  });

  it("lagrer aldri selve tokenet", async () => {
    const { rows } = await db.pg.query<{ rad: string }>(`select t::text as rad from public.app_write_tokens t`);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.rad).not.toContain(TOKEN);
  });

  it("tar imot svaret slik oppslaget faktisk gir det", async () => {
    const snapshot = snapshotFromHits([
      { subtype: "stoy_strategisk_status", title: "x", attributes: { vegDekning: "hoved", baneDekning: "ingen", vegTreff: false, baneTreff: false }, distanceM: 0, contains: true },
    ])!;
    const key = noiseCacheKey(61.83, 9.4);
    await store(TOKEN).put(key, 61.83, 9.4, snapshot);
    expect(await store().get(key)).toMatchObject({ roadState: "no_hit", railState: "not_covered", roadCoverage: "hoved", railCoverage: "ingen" });
  });
});
