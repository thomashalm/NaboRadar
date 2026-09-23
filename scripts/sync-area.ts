/**
 * npm run sync:area [-- --provider=<id>]
 *
 * Synker områdefakta (forurenset grunn, industri, kvikkleiresoner, nettanlegg) til area_features.
 * Kilder som spørres direkte per søk (kvikkleire-aktsomhet, støy, distribusjonsnett) synkes ikke.
 * Exit-kode 1 ved fatal feil, 2 ved delvis feil.
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { areaFeatureProviders } from "@/lib/providers/area-registry";
import { formatSyncResult, runSync } from "@/lib/sync/run";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const only = process.argv.slice(2).find((a) => a.startsWith("--provider="))?.split("=")[1];
  const providers = only ? areaFeatureProviders.filter((p) => p.id === only) : areaFeatureProviders;
  if (providers.length === 0) {
    console.error(`Ukjent provider «${only}». Gyldige: ${areaFeatureProviders.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }

  const db = await getWriteDb();
  if (!db) {
    console.error(
      getDbMode() === "supabase"
        ? "SUPABASE_SECRET_KEY mangler — sync krever skrivetilgang."
        : "Ingen database konfigurert. Sett Supabase-variabler eller LOCAL_DATABASE=pglite i .env.local.",
    );
    process.exit(1);
  }

  console.log(`Sync områdefakta → ${db.kind}\n`);
  let worst = 0;
  for (const provider of providers) {
    const result = await runSync(provider, db, {
      mode: "full",
      onProgress: ({ phase, message }) =>
        process.stdout.write(`\r  ${provider.id.padEnd(26)} ${phase.padEnd(9)} ${message}`.padEnd(90)),
    });
    process.stdout.write("\r".padEnd(92) + "\r");
    console.log(formatSyncResult(result));
    console.log("");
    worst = Math.max(worst, result.status === "failed" ? 1 : result.status === "partial" ? 2 : 0);
  }
  process.exit(worst);
}

main().catch((error) => {
  console.error(`\nFatal feil: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
