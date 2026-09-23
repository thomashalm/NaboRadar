import type { AlertEmail } from "./email";

/**
 * E-postutsending via Resend.
 *
 * Bevisst uten SDK: ett HTTP-kall trenger ingen ny avhengighet, og da er det også
 * lettere å bytte leverandør senere — bare denne filen må endres.
 *
 * Uten nøkkel er utsending slått av. Varslingsjobben skal kunne kjøre (og logge hva den
 * ville sendt) før e-post er satt opp, uten å feile.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "NaboRadar <alerts@naboradar.no>";

export type SendResult =
  | { status: "sent"; id: string }
  | { status: "disabled"; reason: string }
  | { status: "failed"; error: string };

export interface EmailConfig {
  apiKey: string;
  from: string;
  to: string[];
}

/** Leser konfigurasjonen fra miljøet. Nøkkelen returneres aldri til kallere utenfor denne filen. */
export function readEmailConfig(env: Record<string, string | undefined> = process.env): EmailConfig | { disabled: string } {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = (env.ALERT_EMAIL_TO ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (!apiKey) return { disabled: "RESEND_API_KEY er ikke satt" };
  if (to.length === 0) return { disabled: "ALERT_EMAIL_TO er ikke satt" };
  return { apiKey, from: env.ALERT_EMAIL_FROM?.trim() || DEFAULT_FROM, to };
}

export async function sendAlertEmail(
  email: AlertEmail,
  config: EmailConfig | { disabled: string },
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  if ("disabled" in config) return { status: "disabled", reason: config.disabled };

  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: config.from, to: config.to, subject: email.subject, text: email.text }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      // Resend svarer med json-feil; ta med status og en kort melding — aldri nøkkelen.
      const detail = await response.text().catch(() => "");
      return { status: "failed", error: `HTTP ${response.status}: ${detail.slice(0, 200)}` };
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { status: "sent", id: body.id ?? "ukjent" };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : "Ukjent feil" };
  }
}
