/**
 * npm run sync:dibk [-- --mode=full|incremental]
 *
 * Kjører sentral sync av DiBK «Planlegging igangsatt» mot databasen appen er konfigurert for
 * (hosted Supabase med SUPABASE_SECRET_KEY, eller lokal PGlite med LOCAL_DATABASE=pglite).
 * Exit-kode 1 ved fatal feil, 2 ved delvis feil (noen rader kunne ikke skrives).
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { DibkPlanningStartedProvider } from "@/lib/providers/dibk/planning-started";
import { formatSyncResult, runSync } from "@/lib/sync/run";

nextEnv.loadEnvConfig(process.cwd());

function parseMode(argv: string[]): "full" | "incremental" {
  const arg = argv.find((a) => a.startsWith("--mode="))?.split("=")[1] ?? "full";
  if (arg !== "full" && arg !== "incremental") {
    console.error(`Ukjent --mode=${arg}. Bruk full eller incremental.`);
    process.exit(1);
  }
  return arg;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const db = await getWriteDb();
  if (!db) {
    console.error(
      getDbMode() === "supabase"
        ? "SUPABASE_SECRET_KEY mangler — sync krever skrivetilgang."
        : "Ingen database konfigurert. Sett Supabase-variabler eller LOCAL_DATABASE=pglite i .env.local.",
    );
    process.exit(1);
  }

  console.log(`Sync ${mode} → ${db.kind}`);
  const result = await runSync(new DibkPlanningStartedProvider(), db, {
    mode,
    onProgress: ({ phase, message }) => process.stdout.write(`\r  ${phase.padEnd(9)} ${message}`.padEnd(80)),
  });
  process.stdout.write("\n\n");
  console.log(formatSyncResult(result));
  process.exit(result.status === "failed" ? 1 : result.status === "partial" ? 2 : 0);
}

main().catch((error) => {
  console.error(`\nFatal feil: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
