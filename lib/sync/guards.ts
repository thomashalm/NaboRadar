import type { SyncMode } from "@/lib/providers/types";

/**
 * Vakter mot «silent failures»: kilden svarer 200 OK, men med for lite eller for dårlige data.
 *
 * Skriving stoppes ikke — nye data er som regel riktige. Det som stoppes er
 * full reconciliation, altså det som markerer alt vi ikke så som fjernet fra kilden.
 * En kjøring som ikke kan stoles på markeres «suspicious», og teller da som feil
 * for stale-detektoren selv om den skrev data.
 */

export const SYNC_GUARDS = {
  /** Poster kan falle med inntil 30 % før en full sync regnes som mistenkelig. */
  maxRecordDropRatio: 0.3,
  /** Under dette referansetallet er prosentregning meningsløs. */
  minBaselineForDropCheck: 20,
  /** Andel avviste features som gir advarsel / som gjør kjøringen mistenkelig. */
  rejectRateWarning: 0.05,
  rejectRateSuspicious: 0.25,
  /** Uvanlig vekst gir advarsel (mulig duplisering), men blokkerer ingenting. */
  growthWarningFactor: 3,
} as const;

export interface RunAnomalyInput {
  fetched: number;
  rejected: number;
  /** Poster etter gruppering — det som faktisk skrives. */
  records: number;
  /** Poster ved siste kjøring vi stolte på. null = ingen historikk ennå. */
  baseline: number | null;
  mode: SyncMode;
  /** Admin har bekreftet at et fall er reelt, og vil ha reconciliation likevel. */
  force?: boolean;
}

export interface RunAnomalyVerdict {
  suspicious: boolean;
  /** Om full reconciliation (markering som fjernet fra kilden) skal kjøres. */
  allowReconcile: boolean;
  warnings: string[];
}

const percent = (value: number) => `${Math.round(value * 100)} %`;

/**
 * Vurderer tallene fra én kjøring. Ren funksjon — ingen I/O, slik at reglene kan testes.
 */
export function assessRun(input: RunAnomalyInput): RunAnomalyVerdict {
  const { fetched, rejected, records, baseline, mode } = input;
  const warnings: string[] = [];
  let suspicious = false;

  const hasHistory = baseline !== null && baseline > 0;

  if (fetched === 0) {
    if (hasHistory) {
      suspicious = true;
      warnings.push(`Kilden svarte uten data. Forrige kjøring ga ${baseline} poster.`);
    } else {
      warnings.push("Kilden svarte uten data, og vi har ingen historikk å sammenligne med.");
    }
  } else if (records === 0 && hasHistory) {
    suspicious = true;
    warnings.push(`Ingen poster kom gjennom validering. Forrige kjøring ga ${baseline} poster.`);
  } else if (hasHistory && baseline >= SYNC_GUARDS.minBaselineForDropCheck) {
    const drop = (baseline - records) / baseline;
    if (drop > SYNC_GUARDS.maxRecordDropRatio) {
      suspicious = true;
      warnings.push(
        `Antall poster falt ${percent(drop)} (${baseline} → ${records}). Grensen er ${percent(SYNC_GUARDS.maxRecordDropRatio)}.`,
      );
    } else if (records > baseline * SYNC_GUARDS.growthWarningFactor) {
      warnings.push(`Antall poster er mer enn ${SYNC_GUARDS.growthWarningFactor}× forrige kjøring (${baseline} → ${records}).`);
    }
  }

  if (fetched > 0) {
    const rejectRate = rejected / fetched;
    if (rejectRate >= SYNC_GUARDS.rejectRateSuspicious) {
      suspicious = true;
      warnings.push(`${percent(rejectRate)} av postene ble avvist i validering (${rejected} av ${fetched}).`);
    } else if (rejectRate >= SYNC_GUARDS.rejectRateWarning) {
      warnings.push(`${percent(rejectRate)} av postene ble avvist i validering (${rejected} av ${fetched}).`);
    }
  }

  let allowReconcile = mode === "full" && !suspicious;
  if (mode === "full" && suspicious && input.force) {
    allowReconcile = true;
    warnings.push("Reconciliation ble kjørt likevel fordi admin bekreftet at fallet er reelt.");
  } else if (mode === "full" && suspicious) {
    warnings.push("Reconciliation ble hoppet over: ingenting ble markert som fjernet fra kilden.");
  }

  return { suspicious, allowReconcile, warnings };
}
