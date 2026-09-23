import type { AlertAction } from "./state";

/**
 * Bygger varsel-e-posten. Alt innhold kommer herfra, slik at vi vet nøyaktig hva som sendes ut:
 * providernavn, tilstand, sist vellykkede sync, dataalder og en kort årsak.
 * Aldri nøkler, URL-er med token, payloads eller rådata.
 */

export interface AlertEmail {
  subject: string;
  text: string;
}

const ADMIN_URL_FALLBACK = "https://naboradar.no/admin";

const KIND_HEADING: Record<AlertAction["kind"], string> = {
  alert: "Krever oppfølging",
  reminder: "Fortsatt nede",
  recovery: "Frisk igjen",
};

function ageLabel(hours: number | null): string {
  if (hours === null) return "aldri levert data";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min gamle data`;
  if (hours < 48) return `${Math.round(hours)} timer gamle data`;
  return `${Math.round(hours / 24)} døgn gamle data`;
}

function timestamp(iso: string | null): string {
  if (!iso) return "aldri";
  return new Date(iso).toLocaleString("nb-NO", { timeZone: "Europe/Oslo", dateStyle: "short", timeStyle: "short" });
}

function subjectFor(problems: AlertAction[], recoveries: AlertAction[]): string {
  if (problems.length === 0) {
    return recoveries.length === 1
      ? `NaboRadar: ${recoveries[0]!.providerName} er frisk igjen`
      : `NaboRadar: ${recoveries.length} kilder er friske igjen`;
  }
  const prefix = problems.every((p) => p.kind === "reminder") ? "fortsatt nede" : "trenger oppfølging";
  return problems.length === 1
    ? `NaboRadar: ${problems[0]!.providerName} ${prefix} (${problems[0]!.stateLabel.toLowerCase()})`
    : `NaboRadar: ${problems.length} kilder ${prefix}`;
}

function block(action: AlertAction): string {
  const lines = [
    `${action.providerName} (${action.providerId})`,
    `  Tilstand:        ${action.stateLabel}`,
    `  Sist vellykket:  ${timestamp(action.lastSuccessAt)} — ${ageLabel(action.dataAgeHours)}`,
    `  Objekter i drift: ${action.activeRecords.toLocaleString("nb-NO")}`,
  ];
  if (action.consecutiveFailures > 0) lines.push(`  Feil på rad:     ${action.consecutiveFailures}`);
  if (action.kind !== "recovery") lines.push(`  Årsak:           ${action.reason}`);
  return lines.join("\n");
}

/** Én e-post per worker-kjøring. Null når det ikke er noe å si fra om. */
export function buildAlertEmail(actions: AlertAction[], adminUrl = ADMIN_URL_FALLBACK): AlertEmail | null {
  if (actions.length === 0) return null;

  const problems = actions.filter((a) => a.kind !== "recovery");
  const recoveries = actions.filter((a) => a.kind === "recovery");
  const sections: string[] = [];

  for (const kind of ["alert", "reminder", "recovery"] as const) {
    const group = actions.filter((a) => a.kind === kind);
    if (group.length === 0) continue;
    sections.push(`${KIND_HEADING[kind]}\n${"-".repeat(KIND_HEADING[kind].length)}\n\n${group.map(block).join("\n\n")}`);
  }

  const text = [
    ...sections,
    `Detaljer og manuell kjøring: ${adminUrl}`,
    "Dette varselet kommer fra NaboRadars sync-worker. Kilder som spørres direkte per søk overvåkes ikke her.",
  ].join("\n\n");

  return { subject: subjectFor(problems, recoveries), text };
}
