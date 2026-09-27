import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DISPATCH_INTERVAL_MIN,
  QUEUED_STUCK_MIN,
  RUNNING_STUCK_MIN,
  beskrivRequest,
  feilErFortsattRelevant,
  modeLabel,
  requestState,
  trygtFeilutdrag,
  varighet,
} from "@/lib/sync/request-state";

const NOW = new Date("2026-09-27T09:30:00Z");
const minutterSiden = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const request = (over: Partial<Parameters<typeof beskrivRequest>[0]> = {}) => ({
  mode: "full",
  status: "pending",
  requested_at: minutterSiden(5),
  started_at: null,
  finished_at: null,
  error: null,
  ...over,
});

/**
 * Tilstanden til en manuell forespørsel.
 *
 * Tersklene henger på dispatch-kadensen: scheduleren utløser workflowen hvert 15. minutt, så noen
 * minutter i kø er normalt. Testene her er grensene, fordi de er det eneste som skiller «venter på
 * klokka» fra «kjeden er nede» — og den forskjellen er hele poenget med å vise noe i det hele tatt.
 */
describe("tilstand for manuell sync-forespørsel", () => {
  describe("i kø", () => {
    it("5 minutter er helt normalt, og sier når den ventes startet", () => {
      const view = beskrivRequest(request({ requested_at: minutterSiden(5) }), NOW);
      expect(view.state).toBe("queued_recent");
      expect(view.tittel).toBe("Full oppdatering er lagt i kø");
      expect(view.detalj).toBe(`Forventet oppstart innen ${DISPATCH_INTERVAL_MIN} minutter`);
      expect(view.varsler).toBe(false);
    });

    it("20 minutter venter på neste kjøring, med klokkeslettet den ble lagt i kø", () => {
      const view = beskrivRequest(request({ requested_at: minutterSiden(20) }), NOW);
      expect(view.state).toBe("queued_waiting");
      expect(view.tittel).toBe("Venter på neste synk-kjøring");
      // Klokkeslett, ikke «starter snart»: systemet vet ikke når den faktisk plukkes.
      expect(view.detalj).toContain("lagt i kø");
      expect(view.varsler).toBe(false);
    });

    it("46 minutter ser fastlåst ut", () => {
      const view = beskrivRequest(request({ requested_at: minutterSiden(46) }), NOW);
      expect(view.state).toBe("queued_stuck");
      expect(view.tittel).toBe("Oppdateringen ser ut til å ha stoppet");
      expect(view.detalj).toContain("46 min");
      expect(view.varsler).toBe(true);
    });

    it("grensen er tre dispatch-kadenser", () => {
      expect(QUEUED_STUCK_MIN).toBe(3 * DISPATCH_INTERVAL_MIN);
      expect(requestState(request({ requested_at: minutterSiden(QUEUED_STUCK_MIN) }), NOW)).toBe("queued_waiting");
      expect(requestState(request({ requested_at: minutterSiden(QUEUED_STUCK_MIN + 1) }), NOW)).toBe("queued_stuck");
    });
  });

  describe("kjører", () => {
    it("viser at den kjører, og når den startet", () => {
      const view = beskrivRequest(
        request({ status: "running", requested_at: minutterSiden(20), started_at: minutterSiden(3) }),
        NOW,
      );
      expect(view.state).toBe("running");
      expect(view.tittel).toBe("Oppdaterer nå");
      expect(view.detalj).toContain("startet");
      expect(view.varsler).toBe(false);
    });

    it("ser fastlåst ut når den har kjørt lenger enn ryddejobben tillater", () => {
      const view = beskrivRequest(
        request({ status: "running", requested_at: minutterSiden(90), started_at: minutterSiden(RUNNING_STUCK_MIN + 5) }),
        NOW,
      );
      expect(view.state).toBe("running_stuck");
      expect(view.varsler).toBe(true);
      // Sier at databasen rydder den — vi lager ingen parallell timeout i UI-et.
      expect(view.detalj).toContain(`${RUNNING_STUCK_MIN} minutter`);
    });

    it("bruker samme grense som expire_stale_sync_requests i databasen", () => {
      const migrasjon = readFileSync("supabase/migrations/20260925000000_sync_reliability.sql", "utf8");
      expect(migrasjon).toContain("p_older_than interval default interval '30 minutes'");
      expect(RUNNING_STUCK_MIN).toBe(30);
    });
  });

  describe("avsluttet", () => {
    it("en feilet forespørsel er synlig med tidspunkt", () => {
      const view = beskrivRequest(
        request({ status: "failed", requested_at: minutterSiden(60), finished_at: minutterSiden(48), error: "Kilden svarte 500" }),
        NOW,
      );
      expect(view.state).toBe("failed");
      expect(view.tittel).toBe("Siste manuelle oppdatering feilet");
      expect(view.detalj).toMatch(/september/);
      expect(view.varsler).toBe(true);
    });

    it("en fullført forespørsel varsler ikke", () => {
      const view = beskrivRequest(request({ status: "done", finished_at: minutterSiden(2) }), NOW);
      expect(view.state).toBe("done");
      expect(view.varsler).toBe(false);
    });
  });

  it("skriver modus i vanlig språk, ikke som databaseverdi", () => {
    expect(modeLabel("full")).toBe("Full oppdatering");
    expect(modeLabel("incremental")).toBe("Oppdatering av endringer");
    // Ukjent modus skal ikke krasje, men heller ikke pynte på det vi ikke vet.
    expect(modeLabel("noe-nytt")).toContain("noe-nytt");
  });

  it("skriver varighet lesbart", () => {
    expect(varighet(12)).toBe("12 min");
    expect(varighet(72)).toBe("1 t 12 min");
    expect(varighet(120)).toBe("2 t");
    expect(varighet(60 * 49)).toBe("2 døgn");
  });

  /**
   * Punktet som gjør at kortet ikke blir rødt for alltid: en gammel feil skal ikke overskygge at
   * en senere kjøring gikk bra.
   */
  describe("gammel feil mot nyere suksess", () => {
    it("skjuler feilen når en senere sync har lykkes", () => {
      expect(feilErFortsattRelevant({ finished_at: minutterSiden(90), requested_at: minutterSiden(95) }, minutterSiden(75))).toBe(
        false,
      );
    });

    it("viser feilen når ingen senere sync har lykkes", () => {
      expect(feilErFortsattRelevant({ finished_at: minutterSiden(30), requested_at: minutterSiden(35) }, minutterSiden(75))).toBe(
        true,
      );
    });

    it("viser feilen når kilden aldri har lykkes", () => {
      expect(feilErFortsattRelevant({ finished_at: minutterSiden(30), requested_at: minutterSiden(35) }, null)).toBe(true);
    });
  });

  describe("feiltekst til UI", () => {
    it("tar første linje og kutter lange meldinger", () => {
      const lang = `Noe gikk galt: ${"x".repeat(400)}\n  at foo (bar.ts:1)\n  at baz`;
      const ut = trygtFeilutdrag(lang)!;
      expect(ut).not.toContain("at foo");
      expect(ut.length).toBeLessThanOrEqual(160);
    });

    it("fjerner det som ser ut som nøkler og tokens", () => {
      expect(trygtFeilutdrag("GET https://api.example.com/x?apikey=hemmelig123 feilet")).toContain("apikey=…");
      expect(trygtFeilutdrag("GET https://api.example.com/x?apikey=hemmelig123 feilet")).not.toContain("hemmelig123");
      expect(trygtFeilutdrag("Authorization: Bearer abc.def-ghi avvist")).not.toContain("abc.def-ghi");
    });

    it("gir null når det ikke er noen feil", () => {
      expect(trygtFeilutdrag(null)).toBeNull();
      expect(trygtFeilutdrag("")).toBeNull();
    });
  });
});

/**
 * Scheduleren: én primær trigger.
 *
 * pg_cron sender workflow_dispatch hvert 15. minutt. GitHubs egen schedule sto tidligere på samme
 * kadens, som ga to kjøringer per kvarter av samme worker. Den er nå en dokumentert daglig reserve.
 */
describe("scheduler-trigger", () => {
  const workflow = readFileSync(".github/workflows/sync.yml", "utf8");

  it("har ingen 15-minutters schedule i GitHub Actions", () => {
    expect(workflow).not.toContain('cron: "*/15');
    expect(workflow).not.toMatch(/cron:\s*"\*\/\d+ /);
  });

  it("har nøyaktig én schedule, og den er daglig", () => {
    const cronlinjer = [...workflow.matchAll(/^\s*- cron: "([^"]+)"/gm)].map((m) => m[1]!);
    expect(cronlinjer).toHaveLength(1);
    const [minutt, time] = cronlinjer[0]!.split(" ");
    expect(Number.isNaN(Number(minutt))).toBe(false);
    expect(Number.isNaN(Number(time))).toBe(false);
  });

  it("beholder workflow_dispatch, som er den primære inngangen", () => {
    expect(workflow).toContain("workflow_dispatch:");
  });

  it("pg_cron-jobben er fortsatt hvert 15. minutt", () => {
    const migrasjon = readFileSync("supabase/migrations/20261001020000_scheduler_portable.sql", "utf8");
    expect(migrasjon).toContain("'naboradar-sync-dispatch', '*/15 * * * *'");
    expect(DISPATCH_INTERVAL_MIN).toBe(15);
  });
});
