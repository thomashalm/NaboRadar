/**
 * npm run sync:worker [-- --provider=<id> --mode=full|incremental --force --requests-only --due-only]
 *
 * Kjører forespørsler fra /admin og providere som er forfalt etter tidsplanen.
 * Dette er kommandoen en scheduler skal kalle. Én provider som feiler stopper ikke de andre.
 *
 * Exit: 0 = alt bra, 2 = minst én kilde feilet eller så mistenkelig ut, 1 = fatal feil.
 */
import nextEnv from "@next/env";
import { getDbMode, getWriteDb } from "@/lib/db";
import { formatSyncResult } from "@/lib/sync/run";
import { exitCodeFor, knownSyncProviderIds, runProvidersNow, runSyncWorker } from "@/lib/sync/worker";

nextEnv.loadEnvConfig(process.cwd());

function arg(name: string): string | undefined {
  return process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}
const flag = (name: string) => process.argv.slice(2).includes(`--${name}`);

async function main() {
  const providerIds = arg("provider")?.split(",").filter(Boolean);
  const rawMode = arg("mode");
  if (rawMode && rawMode !== "full" && rawMode !== "incremental") {
    console.error(`Ugyldig --mode=${rawMode}. Bruk full eller incremental.`);
    process.exit(1);
  }
  const modeArg: "full" | "incremental" | undefined = rawMode === "full" || rawMode === "incremental" ? rawMode : undefined;
  for (const id of providerIds ?? []) {
    if (!knownSyncProviderIds.includes(id)) {
      console.error(`Ukjent provider «${id}». Gyldige: ${knownSyncProviderIds.join(", ")}`);
      process.exit(1);
    }
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

  const log = (line: string) => console.log(line);
  console.log(`Sync-worker → ${db.kind}\n`);

  // Med --provider og --mode kjøres providerne direkte, uten å vente på tidsplanen.
  const outcome =
    providerIds && modeArg
      ? await runProvidersNow(db, providerIds, { mode: modeArg, force: flag("force"), log })
      : await runSyncWorker(db, {
          providerIds,
          mode: modeArg,
          force: flag("force"),
          skipDue: flag("requests-only"),
          skipRequests: flag("due-only"),
          log,
        });

  console.log("");
  for (const result of outcome.results) console.log(`${formatSyncResult(result)}\n`);
  for (const failure of outcome.failures) console.error(`FEIL ${failure.providerId}: ${failure.message}`);
  if (outcome.results.length === 0 && outcome.failures.length === 0) console.log("Ingenting å gjøre nå.");

  process.exit(exitCodeFor(outcome));
}

main().catch((error) => {
  console.error(`\nFatal feil: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
