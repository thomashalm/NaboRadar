/**
 * npm run sync:status
 *
 * Helsetilstand per provider, med samme regler som /admin og varsling bruker.
 * Exit: 0 = alt OK, 2 = minst én kilde er kritisk (stale, feilende eller mistenkelig).
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { assessAll, criticalProviders, type ProviderHealthRow } from "@/lib/sync/health";

nextEnv.loadEnvConfig(process.cwd());

const SYMBOLS: Record<string, string> = { ok: "OK ", warning: "ADV", critical: "KRIT" };

async function main() {
  const db = await getWriteDb();
  if (!db) {
    console.error(getDbMode() === "supabase" ? "SUPABASE_SECRET_KEY mangler." : "Ingen database konfigurert.");
    process.exit(1);
  }

  const rows = await db.rpc<ProviderHealthRow>("provider_health");
  const health = assessAll(rows);

  for (const item of health) {
    const age = item.dataAgeHours === null ? "aldri" : `${Math.round(item.dataAgeHours)} t siden`;
    console.log(
      `${(SYMBOLS[item.severity] ?? "?").padEnd(5)} ${item.id.padEnd(26)} ${item.label.padEnd(20)} ` +
        `${String(item.row.active_records).padStart(7)} poster   ${age}`,
    );
    for (const reason of item.reasons.slice(0, 3)) console.log(`      ${reason}`);
  }

  const critical = criticalProviders(health);
  console.log(`\n${health.length} providere · ${critical.length} kritiske`);
  process.exit(critical.length > 0 ? 2 : 0);
}

main().catch((error) => {
  console.error(`Fatal feil: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
