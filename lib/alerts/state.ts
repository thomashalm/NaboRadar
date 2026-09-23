import type { HealthState, ProviderHealth } from "@/lib/sync/health";

/**
 * Tilstandsmaskin for varsling utenfor systemet.
 *
 * Reglene er laget for å unngå støy: en enkelt forbigående feil skal ikke gi e-post,
 * og en kilde som er nede i tre dager skal ikke gi tre dager med e-post.
 *
 *   ok ──(1. kritiske sjekk)──▶ pending ──(2. kritiske sjekk)──▶ alerted ──(frisk)──▶ ok
 *                                  │                                │
 *                                  └────(frisk, ingen e-post)───────┘ (påminnelse hver 12. time)
 *
 * Recovery-e-post sendes kun fra «alerted» — har vi aldri varslet, har vi ingenting å friskmelde.
 */

export const ALERT_RULES = {
  /** Antall påfølgende kritiske sjekker før første varsel. */
  requiredCriticalChecks: 2,
  /** Timer mellom påminnelser så lenge tilstanden varer. */
  reminderAfterHours: 12,
} as const;

export type AlertState = "ok" | "pending" | "alerted";
export type AlertActionKind = "alert" | "reminder" | "recovery";

export interface AlertAction {
  kind: AlertActionKind;
  providerId: string;
  providerName: string;
  state: HealthState;
  stateLabel: string;
  /** Timer siden siste data vi stolte på. */
  dataAgeHours: number | null;
  lastSuccessAt: string | null;
  activeRecords: number;
  consecutiveFailures: number;
  /** Kort, menneskelesbar årsak. Aldri payloads eller hemmeligheter. */
  reason: string;
}

export interface AlertStateUpdate {
  providerId: string;
  state: AlertState;
  streak: number;
  /** Settes først når e-posten faktisk er sendt. */
  notified: boolean;
}

export interface AlertDecision {
  actions: AlertAction[];
  updates: AlertStateUpdate[];
}

const HOUR_MS = 3_600_000;
const MAX_REASON_LENGTH = 200;

const toAction = (kind: AlertActionKind, health: ProviderHealth): AlertAction => ({
  kind,
  providerId: health.id,
  providerName: health.name,
  state: health.state,
  stateLabel: health.label,
  dataAgeHours: health.dataAgeHours,
  lastSuccessAt: health.row.last_success_at,
  activeRecords: Number(health.row.active_records),
  consecutiveFailures: health.row.consecutive_failures,
  reason: (health.reasons[0] ?? health.label).slice(0, MAX_REASON_LENGTH),
});

/**
 * Avgjør hva som skal sendes og hvilken tilstand som skal lagres.
 * Ren funksjon — ingen I/O, ingen sideeffekter.
 */
export function decideAlerts(health: ProviderHealth[], now: Date): AlertDecision {
  const actions: AlertAction[] = [];
  const updates: AlertStateUpdate[] = [];

  for (const item of health) {
    // Kilder uten tidsplan og deaktiverte kilder varsles aldri.
    if (item.state === "not_scheduled" || item.state === "inactive") continue;

    const state = (item.row.alert_state ?? "ok") as AlertState;
    const streak = item.row.alert_critical_streak ?? 0;
    const notifiedAt = item.row.alert_notified_at;
    const critical = item.severity === "critical";

    if (!critical) {
      if (state === "alerted") {
        actions.push(toAction("recovery", item));
        updates.push({ providerId: item.id, state: "ok", streak: 0, notified: false });
      } else if (state !== "ok" || streak !== 0) {
        // Var «pending» — aldri varslet, så ingen friskmelding å sende.
        updates.push({ providerId: item.id, state: "ok", streak: 0, notified: false });
      }
      continue;
    }

    const nextStreak = streak + 1;

    if (state === "alerted") {
      const hoursSinceNotice = notifiedAt === null ? Infinity : (now.getTime() - Date.parse(notifiedAt)) / HOUR_MS;
      const due = hoursSinceNotice >= ALERT_RULES.reminderAfterHours;
      if (due) actions.push(toAction("reminder", item));
      updates.push({ providerId: item.id, state: "alerted", streak: nextStreak, notified: due });
      continue;
    }

    if (nextStreak >= ALERT_RULES.requiredCriticalChecks) {
      actions.push(toAction("alert", item));
      updates.push({ providerId: item.id, state: "alerted", streak: nextStreak, notified: true });
    } else {
      // Første kritiske sjekk: vent på bekreftelse før vi varsler.
      updates.push({ providerId: item.id, state: "pending", streak: nextStreak, notified: false });
    }
  }

  return { actions, updates };
}
