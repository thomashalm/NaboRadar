/**
 * npm run alerts:check [-- --dry-run]
 *
 * Vurderer helsetilstanden, avgjør hva som skal varsles, sender én e-post per kjøring
 * og lagrer varslingstilstanden. Kjøres av GitHub Actions rett etter sync-worker.
 *
 * Uten RESEND_API_KEY/ALERT_EMAIL_TO logges det som ville blitt sendt, og jobben går OK.
 * Exit: 0 = ferdig (også når e-post ikke er satt opp), 1 = fatal feil eller mislykket utsending.
 */
import nextEnv from "@next/env";
import { buildAlertEmail } from "@/lib/alerts/email";
import { decideAlerts } from "@/lib/alerts/state";
import { readEmailConfig, sendAlertEmail } from "@/lib/alerts/transport";
import { getDbMode, getWriteDb } from "@/lib/db";
import { assessAll, type ProviderHealthRow } from "@/lib/sync/health";

nextEnv.loadEnvConfig(process.cwd());

const dryRun = process.argv.slice(2).includes("--dry-run");

async function main() {
  const db = await getWriteDb();
  if (!db) {
    console.error(getDbMode() === "supabase" ? "SUPABASE_SECRET_KEY mangler." : "Ingen database konfigurert.");
    process.exit(1);
  }

  const rows = await db.rpc<ProviderHealthRow>("provider_health");
  const now = new Date();
  const { actions, updates } = decideAlerts(assessAll(rows, now), now);

  if (actions.length === 0) {
    console.log("Ingenting å varsle om.");
  } else {
    for (const action of actions) console.log(`${action.kind.padEnd(8)} ${action.providerId} — ${action.stateLabel}`);
  }

  const email = buildAlertEmail(actions, process.env.ALERT_ADMIN_URL);
  let sent = false;

  if (email && dryRun) {
    console.log(`\n[dry-run] Emne: ${email.subject}\n\n${email.text}\n`);
  } else if (email) {
    const config = readEmailConfig();
    const result = await sendAlertEmail(email, config);
    if (result.status === "sent") {
      sent = true;
      console.log(`E-post sendt (${result.id}): ${email.subject}`);
    } else if (result.status === "disabled") {
      // Ikke en feil: varsling er ikke satt opp ennå.
      console.log(`E-post er ikke aktivert (${result.reason}). Ville sendt: ${email.subject}`);
    } else {
      console.error(`E-post feilet: ${result.error}`);
    }
    if (result.status === "failed") {
      // Tilstanden lagres uten «notified», slik at neste kjøring prøver igjen.
      await persist(db, updates, false);
      process.exit(1);
    }
  }

  await persist(db, updates, sent);
  process.exit(0);
}

/** `notified` settes kun når e-posten faktisk gikk ut — ellers varsler vi på nytt neste gang. */
async function persist(
  db: Awaited<ReturnType<typeof getWriteDb>>,
  updates: ReturnType<typeof decideAlerts>["updates"],
  sent: boolean,
) {
  for (const update of updates) {
    await db!.rpc("set_alert_state", {
      p_provider_id: update.providerId,
      p_state: update.state,
      p_streak: update.streak,
      p_notified: update.notified && sent,
    });
  }
  if (updates.length > 0) console.log(`Varslingstilstand oppdatert for ${updates.length} provider(e).`);
}

main().catch((error) => {
  console.error(`Fatal feil: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
