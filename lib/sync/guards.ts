import type { SyncMode } from "@/lib/providers/types";

/**
 * Vakter mot «silent failures»: kilden svarer 200 OK, men med for lite eller for dårlige data.
 *
 * Skriving stoppes ikke — nye data er som regel riktige. Det som stoppes er
 * full reconciliation, altså det som markerer alt vi ikke så som fjernet fra kilden.
 * En kjøring som ikke kan stoles på markeres «suspicious», og teller da som feil
 * for stale-detektoren selv om den skrev data.
 *
 * VIKTIG: sammenligning mot forrige kjøring forutsetter at kjøringen er et komplett
 * snapshot av kilden. Det er bare full sync. En incremental sync henter kun det som er
 * endret siden sist, og «3 poster» er da et helt normalt svar — ikke et datafall.
 * Vakter som gir mening uansett modus (andel avviste) gjelder fortsatt.
 */

export const SYNC_GUARDS = {
  /** Poster kan falle med inntil 30 % før en full sync regnes som mistenkelig. */
  maxRecordDropRatio: 0.3,
  /** Under dette referansetallet er prosentregning meningsløs. */
  minBaselineForDropCheck: 20,
  /** Andel avviste features som gir advarsel / som gjør kjøringen mistenkelig. */
  rejectRateWarning: 0.05,
  rejectRateSuspicious: 0.25,
  /**
   * Under dette antallet hentede poster er prosentregning på avviste meningsløst:
   * én avvist av tre er 33 %, men sier ingenting. Da gir vi bare en nøytral merknad.
   */
  minFetchedForRateCheck: 20,
  /** Uvanlig vekst gir advarsel (mulig duplisering), men blokkerer ingenting. */
  growthWarningFactor: 3,
  /**
   * Andelen av en full sync som må gjenkjennes som poster vi hadde fra før.
   *
   * Under denne grensen har kilden byttet identitet på praktisk talt alt: like mange poster som
   * sist, men nesten ingen som matcher noe vi kjenner igjen. Da er det ID-ene som har endret seg,
   * ikke virkeligheten. Det er feilen som gikk ubemerket for DSB tilfluktsrom, der `lokalId` ble
   * generert på nytt for hvert uttrekk og hver full sync opprettet 556 nye rader og markerte 556
   * gamle som fjernet — med uendret antall aktive, så datafallvakten så ingenting.
   */
  minRecognisedRatio: 0.2,
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
  /**
   * Tellerne fra skrivingen, når de finnes. `matched` er poster som ble gjenkjent på ekstern ID —
   * altså `updated + unchanged`. Sammen med `inserted` avslører de om kilden har byttet identitet
   * på alt. Utelatt av kallere som ikke har skrevet ennå (og av tester som bare prøver datafall).
   */
  inserted?: number;
  matched?: number;
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
  /*
   * Mistenkelig og «ikke rydd» er ikke det samme.
   *
   * De opprinnelige vaktene handler om at kilden kan ha levert for lite; da er det riktig å la
   * alt stå. ID-churn er motsatt: dataene er der, men under nye ID-er. Lot vi reconciliation stå
   * av da, ville forrige generasjon blitt liggende aktiv ved siden av den nye, og brukerne fått
   * hvert tilfluktsrom to ganger. Derfor rydder vi, og roper høyt.
   */
  let blokkerReconcile = false;

  // Bare en full sync er et komplett snapshot og kan sammenlignes med forrige kjøring.
  const isSnapshot = mode === "full";
  const hasHistory = baseline !== null && baseline > 0;

  if (isSnapshot) {
    if (fetched === 0) {
      if (hasHistory) {
        suspicious = true;
        blokkerReconcile = true;
        warnings.push(`Kilden svarte uten data. Forrige fullstendige kjøring ga ${baseline} poster.`);
      } else {
        warnings.push("Kilden svarte uten data, og vi har ingen historikk å sammenligne med.");
      }
    } else if (records === 0 && hasHistory) {
      suspicious = true;
      blokkerReconcile = true;
      warnings.push(`Ingen poster kom gjennom validering. Forrige fullstendige kjøring ga ${baseline} poster.`);
    } else if (hasHistory && baseline >= SYNC_GUARDS.minBaselineForDropCheck) {
      const drop = (baseline - records) / baseline;
      if (drop > SYNC_GUARDS.maxRecordDropRatio) {
        suspicious = true;
        blokkerReconcile = true;
        warnings.push(
          `Antall poster falt ${percent(drop)} (${baseline} → ${records}). Grensen er ${percent(SYNC_GUARDS.maxRecordDropRatio)}.`,
        );
      } else if (records > baseline * SYNC_GUARDS.growthWarningFactor) {
        warnings.push(`Antall poster er mer enn ${SYNC_GUARDS.growthWarningFactor}× forrige kjøring (${baseline} → ${records}).`);
      }
    }
  }

  /*
   * ID-churn: like mye data som før, men nesten ingenting vi kjenner igjen.
   *
   * Dette fanger en feilklasse de andre vaktene er blinde for, fordi antallet aktive poster er
   * uendret: kilden har byttet ekstern ID på alt. Vi ser det på skrivetellerne — alt ble
   * `inserted`, ingenting `updated` eller `unchanged`.
   */
  if (isSnapshot && hasHistory && input.matched !== undefined && input.inserted !== undefined) {
    const skrevet = input.matched + input.inserted;
    const storNok = records >= SYNC_GUARDS.minBaselineForDropCheck && baseline >= SYNC_GUARDS.minBaselineForDropCheck;
    if (storNok && skrevet > 0 && input.matched / skrevet < SYNC_GUARDS.minRecognisedRatio) {
      suspicious = true;
      warnings.push(
        `Kilden gjenbruker ikke sine egne ID-er: ${input.inserted} av ${skrevet} poster er nye, bare ` +
          `${input.matched} ble gjenkjent, og forrige kjøring ga ${baseline}. Det ser ut som at ` +
          `ID-ene er byttet, ikke at objektene er det — sjekk hva provideren bruker som externalId.`,
      );
    }
  }

  // Andelen avviste sier noe om datakvaliteten i det kilden faktisk leverte, uansett modus —
  // men bare når utvalget er stort nok til at en andel betyr noe.
  if (rejected > 0 && fetched >= SYNC_GUARDS.minFetchedForRateCheck) {
    const rejectRate = rejected / fetched;
    if (rejectRate >= SYNC_GUARDS.rejectRateSuspicious) {
      suspicious = true;
      blokkerReconcile = true;
      warnings.push(`${percent(rejectRate)} av postene ble avvist i validering (${rejected} av ${fetched}).`);
    } else if (rejectRate >= SYNC_GUARDS.rejectRateWarning) {
      warnings.push(`${percent(rejectRate)} av postene ble avvist i validering (${rejected} av ${fetched}).`);
    }
  } else if (rejected > 0) {
    warnings.push(`${rejected} av ${fetched} poster ble avvist i validering.`);
  }

  let allowReconcile = mode === "full" && !blokkerReconcile;
  if (mode === "full" && blokkerReconcile && input.force) {
    allowReconcile = true;
    warnings.push("Reconciliation ble kjørt likevel fordi admin bekreftet at fallet er reelt.");
  } else if (mode === "full" && blokkerReconcile) {
    warnings.push("Reconciliation ble hoppet over: ingenting ble markert som fjernet fra kilden.");
  }

  return { suspicious, allowReconcile, warnings };
}
