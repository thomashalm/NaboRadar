import { describe, expect, it } from "vitest";
import { ALERT_RULES, decideAlerts } from "@/lib/alerts/state";
import { assessProvider, type ProviderHealthRow } from "@/lib/sync/health";

const NOW = new Date("2026-09-26T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const row = (over: Partial<ProviderHealthRow> = {}): ProviderHealthRow => ({
  id: "mdir-forurenset-grunn",
  name: "Forurenset grunn",
  kind: "area_feature",
  status: "active",
  status_reason: null,
  supports_incremental: false,
  sync_interval_minutes: 1440,
  full_sync_interval_hours: 24,
  stale_after_hours: 72,
  last_attempt_at: hoursAgo(1),
  last_sync_at: hoursAgo(1),
  last_success_at: hoursAgo(1),
  last_run_status: "success",
  last_error: null,
  consecutive_failures: 0,
  baseline_record_count: 15936,
  active_records: 15936,
  removed_records: 0,
  documents: 0,
  alert_state: "ok",
  alert_critical_streak: 0,
  alert_state_since: null,
  alert_notified_at: null,
  last_run: null,
  open_request: null,
  ...over,
});

/** Kritisk tilstand: data langt eldre enn kildens vindu. */
const critical = (over: Partial<ProviderHealthRow> = {}) => row({ last_success_at: hoursAgo(200), ...over });

const decide = (r: ProviderHealthRow, now = NOW) => decideAlerts([assessProvider(r, now)], now);

describe("varslingstilstand", () => {
  it("varsler ikke på første kritiske sjekk", () => {
    const { actions, updates } = decide(critical());
    expect(actions).toEqual([]);
    expect(updates[0]).toMatchObject({ state: "pending", streak: 1, notified: false });
  });

  it("varsler på andre påfølgende kritiske sjekk", () => {
    const { actions, updates } = decide(critical({ alert_state: "pending", alert_critical_streak: 1 }));
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ kind: "alert", providerId: "mdir-forurenset-grunn", state: "stale" });
    expect(updates[0]).toMatchObject({ state: "alerted", notified: true });
  });

  it("spammer ikke: ingen nye varsler før påminnelsen forfaller", () => {
    const base = critical({ alert_state: "alerted", alert_critical_streak: 5, alert_notified_at: hoursAgo(1) });
    expect(decide(base).actions).toEqual([]);
    expect(decide(row({ ...base, alert_notified_at: hoursAgo(ALERT_RULES.reminderAfterHours - 0.5) })).actions).toEqual([]);
  });

  it("sender påminnelse når tilstanden har vart i 12 timer", () => {
    const { actions, updates } = decide(
      critical({ alert_state: "alerted", alert_critical_streak: 5, alert_notified_at: hoursAgo(ALERT_RULES.reminderAfterHours) }),
    );
    expect(actions[0]!.kind).toBe("reminder");
    expect(updates[0]).toMatchObject({ state: "alerted", notified: true });
  });

  it("sender recovery når en varslet provider blir frisk", () => {
    const { actions, updates } = decide(row({ alert_state: "alerted", alert_critical_streak: 4, alert_notified_at: hoursAgo(3) }));
    expect(actions[0]).toMatchObject({ kind: "recovery", providerId: "mdir-forurenset-grunn" });
    expect(updates[0]).toMatchObject({ state: "ok", streak: 0, notified: false });
  });

  it("sender ikke recovery når det aldri ble sendt feilvarsel", () => {
    const { actions, updates } = decide(row({ alert_state: "pending", alert_critical_streak: 1 }));
    expect(actions).toEqual([]);
    expect(updates[0]).toMatchObject({ state: "ok", streak: 0 });
  });

  it("varsler ikke på warning", () => {
    // Én feilet kjøring med ferske data = warning.
    const warning = row({ consecutive_failures: 1, last_run_status: "failed", last_error: "HTTP 503" });
    expect(assessProvider(warning, NOW).severity).toBe("warning");
    expect(decide(warning).actions).toEqual([]);
  });

  it("varsler om mistenkelige kjøringer og kilder som aldri har levert", () => {
    const suspicious = row({
      last_run_status: "suspicious",
      consecutive_failures: 1,
      alert_state: "pending",
      alert_critical_streak: 1,
    });
    expect(decide(suspicious).actions[0]!.kind).toBe("alert");

    const never = row({ last_success_at: null, last_sync_at: null, alert_state: "pending", alert_critical_streak: 1 });
    const action = decide(never).actions[0]!;
    expect(action.state).toBe("never_synced");
    expect(action.dataAgeHours).toBeNull();
  });

  it("rører aldri kilder uten tidsplan eller deaktiverte kilder", () => {
    expect(decide(row({ sync_interval_minutes: null, last_success_at: null })).updates).toEqual([]);
    expect(decide(row({ status: "unsupported", last_success_at: null })).updates).toEqual([]);
  });

  it("samler flere providere i én beslutning", () => {
    const health = [
      assessProvider(critical({ id: "a", name: "A", alert_state: "pending", alert_critical_streak: 1 }), NOW),
      assessProvider(critical({ id: "b", name: "B", alert_state: "pending", alert_critical_streak: 1 }), NOW),
      assessProvider(row({ id: "c", name: "C", alert_state: "alerted", alert_notified_at: hoursAgo(2) }), NOW),
    ];
    const { actions } = decideAlerts(health, NOW);
    expect(actions.map((a) => [a.providerId, a.kind])).toEqual([
      ["a", "alert"],
      ["b", "alert"],
      ["c", "recovery"],
    ]);
  });

  it("tar ikke med rådata eller lange feilmeldinger i varselet", () => {
    const long = "x".repeat(900);
    const action = decide(critical({ alert_state: "pending", alert_critical_streak: 1, last_error: long })).actions[0]!;
    expect(action.reason.length).toBeLessThanOrEqual(200);
  });
});
