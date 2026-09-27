/**
 * Tilstanden til en manuell sync-forespørsel, i vanlig språk.
 *
 * Ett sted, fordi alternativet er `if (pending && alder > 45)` spredt i komponenter. Rene
 * funksjoner uten database: alt utledes av tidsstemplene på forespørselen, så tilstanden kan
 * ikke komme ut av takt med virkeligheten og trenger ingen jobb som holder den oppdatert.
 *
 * Tersklene henger på dispatch-kadensen. Scheduleren utløser workflowen hvert 15. minutt, så en
 * forespørsel som er noen minutter gammel er helt normal — den venter bare på klokka. Har den
 * ligget i tre kadenser, er det noe annet enn venting.
 */

/** Hvor ofte scheduleren utløser sync-workflowen. Se pg_cron-jobben naboradar-sync-dispatch. */
export const DISPATCH_INTERVAL_MIN = 15;
/** Over dette er forespørselen ikke «nettopp lagt i kø» lenger, men venter på neste kjøring. */
export const QUEUED_WAITING_MIN = DISPATCH_INTERVAL_MIN;
/** Tre kadenser uten at noen har plukket den. Da er det sannsynligvis kjeden, ikke klokka. */
export const QUEUED_STUCK_MIN = 45;
/**
 * Samme grense som `expire_stale_sync_requests()` bruker i databasen. UI-et lager ingen egen
 * timeout — det leser tidsstemplene og sier det samme som ryddejobben vil gjøre.
 */
export const RUNNING_STUCK_MIN = 30;

export type RequestState =
  /** Nettopp lagt i kø. Neste dispatch tar den. */
  | "queued_recent"
  /** Har ventet mer enn én kadens. Fortsatt normalt, men verdt å nevne. */
  | "queued_waiting"
  /** Tre kadenser uten å bli plukket. Ser fastlåst ut. */
  | "queued_stuck"
  | "running"
  /** Kjører lenger enn ryddejobben tillater. */
  | "running_stuck"
  | "failed"
  | "done"
  | "cancelled";

export interface SyncRequestLike {
  mode: string;
  status: string;
  requested_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
}

export interface RequestView {
  state: RequestState;
  /** Hovedlinjen: hva som skjer, i vanlig språk. */
  tittel: string;
  /** Underlinjen: når, eller hvor lenge. */
  detalj: string;
  /** Om noe ser galt ut. Styrer tone, ikke providerens helsestatus. */
  varsler: boolean;
  /** Minutter siden forespørselen ble lagt i kø. */
  alderMin: number;
}

const MIN_MS = 60_000;

export const MODE_LABEL: Record<string, string> = {
  full: "Full oppdatering",
  incremental: "Oppdatering av endringer",
};

/** «Full oppdatering», eller modusnavnet som det står hvis vi ikke kjenner det. */
export function modeLabel(mode: string): string {
  return MODE_LABEL[mode] ?? `Oppdatering (${mode})`;
}

/** «09:20» i norsk tid. */
export function klokke(iso: string): string {
  return new Date(iso).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

/** «27. september 09:42». */
export function datoOgKlokke(iso: string): string {
  return new Date(iso).toLocaleString("nb-NO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

/** «12 min», «1 t 12 min», «2 døgn». Varighet, ikke klokkeslett. */
export function varighet(minutter: number): string {
  const m = Math.max(0, Math.round(minutter));
  if (m < 60) return `${m} min`;
  const timer = Math.floor(m / 60);
  if (timer < 24) {
    const rest = m % 60;
    return rest === 0 ? `${timer} t` : `${timer} t ${rest} min`;
  }
  const døgn = Math.floor(timer / 24);
  return `${døgn} døgn`;
}

export function requestState(request: SyncRequestLike, now = new Date()): RequestState {
  const alderMin = (now.getTime() - Date.parse(request.requested_at)) / MIN_MS;

  if (request.status === "running") {
    const kjørtMin = request.started_at ? (now.getTime() - Date.parse(request.started_at)) / MIN_MS : alderMin;
    return kjørtMin > RUNNING_STUCK_MIN ? "running_stuck" : "running";
  }
  if (request.status === "pending") {
    if (alderMin > QUEUED_STUCK_MIN) return "queued_stuck";
    if (alderMin > QUEUED_WAITING_MIN) return "queued_waiting";
    return "queued_recent";
  }
  if (request.status === "failed") return "failed";
  if (request.status === "cancelled") return "cancelled";
  return "done";
}

/**
 * Tilstanden som to linjer tekst.
 *
 * Merk hva den *ikke* sier: at jobben «starter snart» når systemet ikke vet det. En forespørsel
 * som er lagt i kø venter på neste dispatch, og det er det vi skriver — med klokkeslettet, slik
 * at den som leser kan se selv hvor lenge det har gått.
 */
export function beskrivRequest(request: SyncRequestLike, now = new Date()): RequestView {
  const state = requestState(request, now);
  const alderMin = Math.round((now.getTime() - Date.parse(request.requested_at)) / MIN_MS);
  const mode = modeLabel(request.mode);

  switch (state) {
    case "queued_recent":
      return {
        state,
        tittel: `${mode} er lagt i kø`,
        detalj: `Forventet oppstart innen ${DISPATCH_INTERVAL_MIN} minutter`,
        varsler: false,
        alderMin,
      };
    case "queued_waiting":
      return {
        state,
        tittel: "Venter på neste synk-kjøring",
        detalj: `${mode}, lagt i kø ${klokke(request.requested_at)}`,
        varsler: false,
        alderMin,
      };
    case "queued_stuck":
      return {
        state,
        tittel: "Oppdateringen ser ut til å ha stoppet",
        detalj: `Lagt i kø for ${varighet(alderMin)} siden, og ingen kjøring har tatt den`,
        varsler: true,
        alderMin,
      };
    case "running":
      return {
        state,
        tittel: "Oppdaterer nå",
        detalj: request.started_at ? `${mode}, startet ${klokke(request.started_at)}` : mode,
        varsler: false,
        alderMin,
      };
    case "running_stuck":
      return {
        state,
        tittel: "Oppdateringen ser ut til å ha stoppet",
        detalj: request.started_at
          ? `Startet ${klokke(request.started_at)} og kjører fortsatt. Ryddes automatisk etter ${RUNNING_STUCK_MIN} minutter.`
          : "Kjører uten starttidspunkt",
        varsler: true,
        alderMin,
      };
    case "failed":
      return {
        state,
        tittel: "Siste manuelle oppdatering feilet",
        detalj: datoOgKlokke(request.finished_at ?? request.requested_at),
        varsler: true,
        alderMin,
      };
    case "cancelled":
      return {
        state,
        tittel: "Manuell oppdatering ble avbrutt",
        detalj: datoOgKlokke(request.finished_at ?? request.requested_at),
        varsler: false,
        alderMin,
      };
    default:
      return {
        state,
        tittel: `${mode} er fullført`,
        detalj: datoOgKlokke(request.finished_at ?? request.requested_at),
        varsler: false,
        alderMin,
      };
  }
}

/**
 * Om en feilet forespørsel fortsatt er verdt å vise på kortet.
 *
 * En gammel feil skal ikke stå og lyse når en senere kjøring har lykkes. Da hører den i
 * historikken, ikke i hovedbildet. Dette er også grunnen til at feilen aldri endrer providerens
 * helsestatus: den sier noe om én forespørsel, ikke om dataene.
 */
export function feilErFortsattRelevant(
  request: { finished_at?: string | null; requested_at: string },
  lastSuccessAt: string | null,
): boolean {
  if (!lastSuccessAt) return true;
  const feilet = Date.parse(request.finished_at ?? request.requested_at);
  return feilet > Date.parse(lastSuccessAt);
}

/** Kort, trygg feiltekst til UI. Ingen stacktrace, ingen URL-er med nøkler. */
export function trygtFeilutdrag(error: string | null | undefined, maks = 160): string | null {
  if (!error) return null;
  const førsteLinje = error.split("\n")[0]!.trim();
  // Alt som ser ut som en hemmelighet eller et token i en URL fjernes framfor å vises.
  const vasket = førsteLinje
    .replace(/(apikey|api_key|token|key|secret|password|bearer)=[^\s&]+/gi, "$1=…")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer …");
  return vasket.length > maks ? `${vasket.slice(0, maks - 1)}…` : vasket;
}
