/**
 * npm run schools:classify [-- --limit=<n>]
 *
 * Henter primær næringskode fra Udirs register for skoler som er nye eller endret, og oppdaterer
 * hvilke enheter som vises i den offentlige skolelisten (lib/schools). Kjøres etter synken, og
 * for seg selv når skolesynken ikke går. Første kjøring henter alle skolene; senere bare noen få.
 * Exit-kode 1 ved fatal feil, 2 når noen enheter ikke svarte (de prøves igjen neste gang).
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { formatSchoolRefreshResult, refreshSchoolUnits } from "@/lib/schools/refresh";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const limit = Number(process.argv.slice(2).find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 5000);
  const db = await getWriteDb();
  if (!db) {
    console.error(getDbMode() === "supabase" ? "SUPABASE_SECRET_KEY mangler — krever skrivetilgang." : "Ingen database konfigurert.");
    process.exit(1);
  }
  const result = await refreshSchoolUnits(db, { limit, onProgress: (done, total) => process.stdout.write(`\r${done}/${total}`) });
  if (result.fetched + result.failed > 0) process.stdout.write("\n");
  console.log(formatSchoolRefreshResult(result));
  process.exit(result.failed > 0 ? 2 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
