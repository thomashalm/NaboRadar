import { describe, expect, it } from "vitest";
import { assessProvider, criticalProviders, type ProviderHealthRow } from "@/lib/sync/health";

const NOW = new Date("2026-09-25T12:00:00Z");
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
  last_attempt_at: hoursAgo(2),
  last_sync_at: hoursAgo(2),
  last_success_at: hoursAgo(2),
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

describe("helsevurdering per provider", () => {
  it("fersk og feilfri kilde er OK", () => {
    const health = assessProvider(row(), NOW);
    expect(health.state).toBe("ok");
    expect(health.severity).toBe("ok");
    expect(Math.round(health.dataAgeHours!)).toBe(2);
  });

  it("data eldre enn kildens eget vindu er kritisk", () => {
    const health = assessProvider(row({ last_success_at: hoursAgo(80) }), NOW);
    expect(health.state).toBe("stale");
    expect(health.severity).toBe("critical");
    expect(health.reasons[0]).toContain("Grensen for denne kilden");
  });

  it("advarer før grensen nås", () => {
    const health = assessProvider(row({ last_success_at: hoursAgo(60) }), NOW);
    expect(health.state).toBe("ok");
    expect(health.severity).toBe("warning");
    expect(health.reasons[0]).toContain("nærmer seg grensen");
  });

  it("en enkelt feilet kjøring med ferske data er advarsel, ikke krise", () => {
    const health = assessProvider(row({ consecutive_failures: 1, last_run_status: "failed", last_error: "HTTP 503" }), NOW);
    expect(health.state).toBe("failing");
    expect(health.severity).toBe("warning");
    expect(health.reasons.join(" ")).toContain("HTTP 503");
  });

  it("gjentatte feil er kritisk selv om dataene ennå ikke er utdaterte", () => {
    expect(assessProvider(row({ consecutive_failures: 3, last_run_status: "failed" }), NOW).severity).toBe("critical");
  });

  it("mistenkelig kjøring er kritisk selv om den skrev data", () => {
    const health = assessProvider(
      row({
        last_run_status: "suspicious",
        consecutive_failures: 1,
        last_run: {
          id: "r1", mode: "full", trigger: "scheduled", status: "suspicious", suspicious: true, reconciled: false,
          started_at: hoursAgo(2), completed_at: hoursAgo(2), fetched: 50, accepted: 50, rejected: 0, records: 50,
          inserted: 0, updated: 50, unchanged: 0, removed: 0, failed: 0,
          warnings: ["Antall poster falt 99 % (15936 → 50)."], error: null,
        },
      }),
      NOW,
    );
    expect(health.state).toBe("suspicious");
    expect(health.severity).toBe("critical");
    expect(health.reasons.join(" ")).toContain("15936 → 50");
  });

  it("kilde som aldri har levert data er kritisk", () => {
    const health = assessProvider(row({ last_success_at: null, last_sync_at: null, last_attempt_at: null }), NOW);
    expect(health.state).toBe("never_synced");
    expect(health.severity).toBe("critical");
  });

  it("kilder uten tidsplan og deaktiverte kilder varsles ikke", () => {
    expect(assessProvider(row({ sync_interval_minutes: null }), NOW).state).toBe("not_scheduled");
    expect(assessProvider(row({ status: "unsupported" }), NOW).state).toBe("inactive");
    const health = [
      assessProvider(row({ sync_interval_minutes: null, last_success_at: null }), NOW),
      assessProvider(row({ status: "disabled", last_success_at: null }), NOW),
    ];
    expect(criticalProviders(health)).toEqual([]);
  });
});
