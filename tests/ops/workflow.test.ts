import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/**
 * Kontrakten for den planlagte kjøringen. Workflowen er ops-kode og kan ikke kjøres i test,
 * så vi låser egenskapene som faktisk betyr noe: at den kan startes manuelt, at den bruker
 * den samme sync-koden som lokalt, at heartbeat bare sendes i riktig tilstand, og at ingen
 * hemmeligheter er skrevet inn i fila.
 */
const source = readFileSync(".github/workflows/sync.yml", "utf8");
/** Selve konfigurasjonen, uten kommentarlinjer (der vi forklarer hva vi IKKE gjør). */
const config = source
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("#"))
  .join("\n");
const workflow = parse(source) as {
  on: { schedule: { cron: string }[]; workflow_dispatch: { inputs: Record<string, unknown> } };
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: { sync: { env: Record<string, string>; steps: { name?: string; uses?: string; run?: string; if?: string }[] } };
};

const steps = workflow.jobs.sync.steps;
const step = (name: string) => steps.find((s) => s.name === name)!;

describe("sync-workflow", () => {
  it("kjører hvert 15. minutt og kan startes manuelt", () => {
    expect(workflow.on.schedule).toEqual([{ cron: "*/15 * * * *" }]);
    expect(Object.keys(workflow.on.workflow_dispatch.inputs)).toEqual(["provider", "mode", "force"]);
  });

  it("kjører én om gangen, uten å avbryte en pågående sync", () => {
    expect(workflow.concurrency.group).toBe("naboradar-sync");
    expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
  });

  it("bruker den samme Node-koden som lokalt, ikke en parallell implementasjon", () => {
    expect(step("Sync").run).toContain("npm run sync:worker");
    expect(step("Varsling").run).toContain("npm run alerts:check");
    expect(config).not.toMatch(/deno|edge function|supabase functions/i);
  });

  it("lar én provider feile uten å stoppe jobben, men stopper ved fatal feil", () => {
    const run = step("Sync").run!;
    expect(run).toContain('if [ "$code" -eq 1 ]');
    expect(run).toContain('if [ "$code" -eq 2 ]');
    // Exit 2 (provider-feil) skal ikke felle jobben — da ville heartbeat uteblitt.
    expect(run).not.toMatch(/exit 2/);
  });

  it("hopper over kjøringen når Supabase-secrets mangler, i stedet for å feile hvert kvarter", () => {
    const guard = step("Sjekk konfigurasjon").run!;
    expect(guard).toContain("SUPABASE_SECRET_KEY");
    expect(guard).toContain("configured=false");
    for (const name of ["Sync", "Varsling", "Heartbeat: kjøring OK"]) {
      expect(step(name).if, name).toContain("steps.config.outputs.configured == 'true'");
    }
  });

  it("sender heartbeat kun ved vellykket kjøring, og fail-ping ved feil", () => {
    expect(step("Heartbeat: kjøring OK").if).toContain("success()");
    expect(step("Heartbeat: kjøring OK").run).not.toContain("/fail");
    expect(step("Heartbeat: kjøring feilet").if).toContain("failure()");
    expect(step("Heartbeat: kjøring feilet").run).toContain("/fail");
  });

  it("hopper over heartbeat når hemmeligheten ikke er satt opp", () => {
    for (const name of ["Heartbeat: kjøring startet", "Heartbeat: kjøring OK", "Heartbeat: kjøring feilet"]) {
      expect(step(name).if).toContain("env.HEALTHCHECK_URL != ''");
    }
  });

  it("henter alle hemmeligheter fra GitHub Actions, ingen i klartekst", () => {
    const env = workflow.jobs.sync.env;
    expect(env.SUPABASE_SECRET_KEY).toBe("${{ secrets.SUPABASE_SECRET_KEY }}");
    expect(env.HEALTHCHECK_URL).toBe("${{ secrets.HEALTHCHECK_URL }}");
    expect(env.RESEND_API_KEY).toBe("${{ secrets.RESEND_API_KEY }}");
    expect(env.ALERT_EMAIL_TO).toBe("${{ secrets.ALERT_EMAIL_TO }}");
    // Ingen nøkler, tokens eller ping-URL-er skrevet inn i fila.
    expect(source).not.toMatch(/sb_secret|eyJ[A-Za-z0-9]|re_[A-Za-z0-9]{8}|hc-ping\.com\/[0-9a-f]/);
    // Heartbeat-URL-en skal aldri skrives til loggen.
    expect(source).not.toMatch(/echo .*HEALTHCHECK_URL/);
  });

  it("henter ikke inn noe fra Netlify", () => {
    expect(config).not.toMatch(/netlify/i);
  });
});
