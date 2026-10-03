/**
 * npm run plans:enrich [-- --limit=<n>]
 *
 * Leser planinitiativ, varsel og referat for plansakene som mangler tiltakstype og formål, eller
 * der dokumentene eller reglene er endret (se lib/plans/enrich.ts). Kjøres etter synken. Saker
 * som allerede er lest, røres ikke.
 * Exit-kode 1 ved fatal feil, 2 når noen nedlastinger feilet (de prøves igjen neste gang).
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { enrichPlans, formatPlanEnrichmentResult } from "@/lib/plans/enrich";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const limit = Number(process.argv.slice(2).find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 300);
  const db = await getWriteDb();
  if (!db) {
    console.error(getDbMode() === "supabase" ? "SUPABASE_SECRET_KEY mangler — krever skrivetilgang." : "Ingen database konfigurert.");
    process.exit(1);
  }
  const result = await enrichPlans(db, {
    limit,
    pauseMs: 150,
    onProgress: (done, total) => process.stdout.write(`\r${done}/${total}`),
  });
  if (result.pending > 0) process.stdout.write("\n");
  console.log(formatPlanEnrichmentResult(result));
  process.exit(result.failedDownloads > 0 ? 2 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
