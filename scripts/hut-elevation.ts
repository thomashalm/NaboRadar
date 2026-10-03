/**
 * npm run huts:elevation [-- --limit=<n>]
 *
 * Lagrer terrenghøyden for hyttene som mangler den for posisjonen sin (se
 * lib/huts/elevation-sync.ts). Brukes til første backfill og ved behov — til vanlig gjør
 * hyttesynken dette selv. Hytter som allerede har høyde for posisjonen sin, røres ikke.
 * Exit-kode 1 ved fatal feil, 2 når noen kall feilet (de prøves igjen neste gang).
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { formatHutElevationResult, refreshHutElevations } from "@/lib/huts/elevation-sync";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const limit = Number(process.argv.slice(2).find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 5000);
  const db = await getWriteDb();
  if (!db) {
    console.error(getDbMode() === "supabase" ? "SUPABASE_SECRET_KEY mangler — krever skrivetilgang." : "Ingen database konfigurert.");
    process.exit(1);
  }
  const result = await refreshHutElevations(db, {
    limit,
    pauseMs: 200,
    onBatch: (done, total) => process.stdout.write(`\r${done}/${total}`),
  });
  if (result.pending > 0) process.stdout.write("\n");
  console.log(formatHutElevationResult(result));
  process.exit(result.failedBatches > 0 ? 2 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
