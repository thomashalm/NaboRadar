import { describe, expect, it } from "vitest";
import { buildAlertEmail } from "@/lib/alerts/email";
import type { AlertAction } from "@/lib/alerts/state";
import { readEmailConfig, sendAlertEmail } from "@/lib/alerts/transport";

const action = (over: Partial<AlertAction> = {}): AlertAction => ({
  kind: "alert",
  providerId: "dibk-planning-started",
  providerName: "Planlegging igangsatt",
  state: "stale",
  stateLabel: "Utdaterte data",
  dataAgeHours: 51,
  lastSuccessAt: "2026-09-24T09:00:00Z",
  activeRecords: 1541,
  consecutiveFailures: 2,
  reason: "Siste data vi stolte på er 51 t gamle. Grensen for denne kilden er 24 t.",
  ...over,
});

describe("varsel-e-post", () => {
  it("er tom når det ikke er noe å si fra om", () => {
    expect(buildAlertEmail([])).toBeNull();
  });

  it("inneholder navn, tilstand, sist vellykket, dataalder og kort årsak", () => {
    const email = buildAlertEmail([action()])!;
    expect(email.subject).toContain("Planlegging igangsatt");
    expect(email.text).toContain("dibk-planning-started");
    expect(email.text).toContain("Utdaterte data");
    expect(email.text).toContain("2 døgn gamle data");
    expect(buildAlertEmail([action({ dataAgeHours: 30 })])!.text).toContain("30 timer gamle data");
    expect(buildAlertEmail([action({ dataAgeHours: null })])!.text).toContain("aldri levert data");
    expect(email.text).toContain(`1\u00a0541`);
    expect(email.text).toContain("Feil på rad:     2");
    expect(email.text).toContain("Grensen for denne kilden er 24 t");
  });

  it("samler flere providere i én e-post", () => {
    const email = buildAlertEmail([
      action(),
      action({ providerId: "nve-nettanlegg", providerName: "Nettanlegg" }),
      action({ kind: "recovery", providerId: "mdir-industri-tillatelse", providerName: "Industri" }),
    ])!;
    expect(email.subject).toBe("NaboRadar: 2 kilder trenger oppfølging");
    expect(email.text).toContain("Krever oppfølging");
    expect(email.text).toContain("Frisk igjen");
    expect(email.text).toContain("Nettanlegg");
  });

  it("har egen ordlyd for friskmelding alene", () => {
    expect(buildAlertEmail([action({ kind: "recovery" })])!.subject).toBe("NaboRadar: Planlegging igangsatt er frisk igjen");
    // Friskmelding skal ikke gjenta feilårsaken.
    expect(buildAlertEmail([action({ kind: "recovery" })])!.text).not.toContain("Årsak");
  });

  it("lenker til admin og sier hva varselet kommer fra", () => {
    expect(buildAlertEmail([action()])!.text).toContain("https://naboradar.no/admin");
    expect(buildAlertEmail([action()], "https://annen.example/admin")!.text).toContain("https://annen.example/admin");
  });

  it("inneholder aldri nøkler eller URL-er med token", () => {
    const text = buildAlertEmail([action(), action({ kind: "recovery" })])!.text;
    expect(text).not.toMatch(/sb_secret|service_role|RESEND|Bearer|hc-ping/i);
  });
});

describe("Resend-transport", () => {
  const email = { subject: "Emne", text: "Innhold" };

  it("er slått av uten nøkkel eller mottaker", async () => {
    expect(readEmailConfig({})).toEqual({ disabled: "RESEND_API_KEY er ikke satt" });
    expect(readEmailConfig({ RESEND_API_KEY: "x" })).toEqual({ disabled: "ALERT_EMAIL_TO er ikke satt" });

    const result = await sendAlertEmail(email, { disabled: "RESEND_API_KEY er ikke satt" });
    expect(result).toEqual({ status: "disabled", reason: "RESEND_API_KEY er ikke satt" });
  });

  it("leser mottakerliste og standard avsender", () => {
    const config = readEmailConfig({
      RESEND_API_KEY: "hemmelig",
      ALERT_EMAIL_TO: "en@example.no, to@example.no",
    });
    expect(config).toEqual({ apiKey: "hemmelig", from: "NaboRadar <alerts@naboradar.no>", to: ["en@example.no", "to@example.no"] });
  });

  it("sender én forespørsel til Resend med riktig innhold", async () => {
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({
        url,
        body: JSON.parse(String(init.body)),
        auth: new Headers(init.headers).get("authorization"),
      });
      return new Response(JSON.stringify({ id: "msg_1" }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await sendAlertEmail(email, { apiKey: "hemmelig", from: "a@b.no", to: ["c@d.no"] }, fake);
    expect(result).toEqual({ status: "sent", id: "msg_1" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect(calls[0]!.auth).toBe("Bearer hemmelig");
    expect(calls[0]!.body).toEqual({ from: "a@b.no", to: ["c@d.no"], subject: "Emne", text: "Innhold" });
  });

  it("melder feil uten å røpe nøkkelen", async () => {
    const fake = (async () => new Response("forbidden for key hemmelig", { status: 401 })) as unknown as typeof fetch;
    const result = await sendAlertEmail(email, { apiKey: "hemmelig", from: "a@b.no", to: ["c@d.no"] }, fake);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toContain("HTTP 401");
  });
});
