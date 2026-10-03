/**
 * npm run lookups:check
 *
 * Spør hver direkte oppslagskilde (flom, radon, stormflo, støy …) én gang mot et fast punkt og
 * lagrer utfallet i `lookup_source_status` (se migrasjon 20261031000000). Kjøres av sync-jobben
 * hvert 15. minutt, slik at /admin viser om en kilde har vært nede lenge.
 *
 * «OK» betyr at kilden svarte gyldig — også med «ingen treff». Feil er tidsavbrudd, HTTP-feil og
 * ugyldige svar, de samme som gir «svarte ikke» på /omrade. Exit-koden er alltid 0 når databasen
 * finnes: en kilde som er nede, er ikke en feil i syncen.
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { areaLookups } from "@/lib/facts/lookups";

nextEnv.loadEnvConfig(process.cwd());

/** Bjørvika i Oslo: lavt ved sjøen, i byen. Alle kildene dekker punktet. */
const PUNKT = { lat: 59.9054, lng: 10.7548, radiusM: 1000 };
const TIDSFRIST_MS = 15_000;

async function main() {
  const db = await getWriteDb();
  if (!db) {
    console.error(getDbMode() === "supabase" ? "SUPABASE_SECRET_KEY mangler." : "Ingen database konfigurert.");
    process.exit(1);
  }
  const utfall = await Promise.all(
    areaLookups.map(async (lookup) => {
      const start = Date.now();
      try {
        const hits = await lookup.run({ ...PUNKT, signal: AbortSignal.timeout(TIDSFRIST_MS) });
        return { lookup, ok: true, error: null, ms: Date.now() - start, hits: hits.length };
      } catch (error) {
        const melding = error instanceof Error ? `${error.name}: ${error.message}` : "ukjent feil";
        return { lookup, ok: false, error: melding, ms: Date.now() - start, hits: 0 };
      }
    }),
  );
  for (const u of utfall) {
    await db.rpc("record_lookup_check", { p_lookup_id: u.lookup.id, p_name: u.lookup.name, p_ok: u.ok, p_error: u.error });
    console.log(`${u.ok ? "OK  " : "FEIL"} ${u.lookup.id.padEnd(28)} ${String(u.ms).padStart(6)} ms${u.ok ? ` · ${u.hits} treff` : ` · ${u.error}`}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
