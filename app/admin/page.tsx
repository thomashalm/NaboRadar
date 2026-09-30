import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/LoginForm";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SyncButtons } from "@/components/admin/SyncButtons";
import {
  loadAdminOverview,
  type SchedulerStatus,
  type SyncRequestHistoryRow,
  type SyncRunRow,
} from "@/lib/admin/queries";
import { beskrivRequest, datoOgKlokke, feilErFortsattRelevant, trygtFeilutdrag } from "@/lib/sync/request-state";
import type { SyncRequestRow } from "@/lib/sync/health";
import { hentReviewMetrics } from "@/lib/admin/review";
import { getAdminSession } from "@/lib/admin/session";
import { formatDate } from "@/lib/format";
import type { ProviderHealth } from "@/lib/sync/health";

export const metadata: Metadata = { title: "Drift", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SEVERITY_STYLE = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-900 ring-amber-600/20",
  critical: "bg-danger-soft text-danger ring-danger/20",
} as const;

function dateTime(value: string | null): string {
  if (!value) return "aldri";
  return `${formatDate(value)} ${new Date(value).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;
}

function ageLabel(hours: number | null): string {
  if (hours === null) return "aldri";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} t`;
  return `${Math.round(hours / 24)} døgn`;
}

export default async function AdminPage() {
  const session = await getAdminSession();

  if (session.state === "unconfigured") {
    return (
      <Shell>
        <p className="mt-6 text-[15px] text-muted">Supabase er ikke konfigurert for denne installasjonen.</p>
      </Shell>
    );
  }
  if (session.state === "signed-out") {
    return (
      <Shell>
        <p className="mt-2 text-[15px] text-muted">Logg inn for å se driftsstatus.</p>
        <LoginForm />
      </Shell>
    );
  }
  if (session.state === "not-admin") {
    return (
      <Shell>
        <p className="mt-2 text-[15px] text-muted">Kontoen {session.email} har ikke tilgang til driftssidene.</p>
        <div className="mt-6">
          <SignOutButton email={session.email} />
        </div>
      </Shell>
    );
  }

  const { health, runs, requests, scheduler, errors } = await loadAdminOverview(session.client);
  /*
   * Køtallet hentes i samme runde som driftsstatusen og feiler stille. Admin-navigasjonen skal
   * ikke bli treg, og et manglende tall er bedre enn en side som ikke laster.
   */
  const reviewMetrics = await hentReviewMetrics(session.client).catch(() => null);
  const trengerReview = reviewMetrics
    ? reviewMetrics.due + reviewMetrics.overdue + reviewMetrics.needs_followup
    : null;
  const scheduled = health.filter((h) => h.state !== "not_scheduled" && h.state !== "inactive");
  const other = health.filter((h) => h.state === "not_scheduled" || h.state === "inactive");
  const critical = scheduled.filter((h) => h.severity === "critical");

  return (
    <Shell right={<SignOutButton email={session.email} />}>
      {errors.length > 0 && (
        <div className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <p className="mt-2 text-[15px] text-muted">
        {scheduled.length} synkede kilder ·{" "}
        {critical.length === 0 ? "ingen kritiske avvik nå" : `${critical.length} krever oppfølging`}
      </p>

      <section className="mt-8 flex flex-col gap-4">
        {scheduled.map((item) => (
          <ProviderCard key={item.id} item={item} requests={requests.get(item.id) ?? []} />
        ))}
      </section>

      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/admin/adresse" className="text-[15px] font-medium text-accent hover:underline">
          Adressesøk med intern research →
        </Link>
        <Link href="/admin/research" className="text-[15px] font-medium text-accent hover:underline">
          Research →
        </Link>
        <Link href="/admin/research/review" className="text-[15px] font-medium text-accent hover:underline">
          Review-kø{trengerReview ? ` · ${trengerReview}` : ""} →
        </Link>
        <Link href="/admin/kart" className="text-[15px] font-medium text-accent hover:underline">
          Research-kart →
        </Link>
        <Link href="/admin/datasenter" className="text-[15px] font-medium text-accent hover:underline">
          Datasentre →
        </Link>
      </p>

      <SchedulerCard scheduler={scheduler} />

      <h2 className="mt-12 text-lg font-semibold">Siste kjøringer</h2>
      <RunsTable runs={runs} />

      <h2 className="mt-12 text-lg font-semibold">Kilder uten tidsplan</h2>
      <p className="mt-1 text-sm text-muted">
        Spørres direkte per søk eller er ikke i bruk. Disse har ingen sync å overvåke.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {other.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs text-muted">{item.id}</span>
            <span>{item.label}</span>
            <span className="text-muted">{item.reasons[0] ?? ""}</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function ProviderCard({ item, requests }: { item: ProviderHealth; requests: SyncRequestHistoryRow[] }) {
  const row = item.row;
  const run = row.last_run;
  const suspicious = row.last_run_status === "suspicious";
  /*
   * En feilet manuell forespørsel vises bare når den er nyere enn siste vellykkede kjøring.
   * Ellers ville en gammel feil stått og lyst i ukevis etter at problemet var løst — den hører da
   * i historikken under «Manuelle oppdateringer». Den endrer aldri providerens helsestatus.
   */
  const feilet =
    row.last_failed_request && feilErFortsattRelevant(row.last_failed_request, row.last_success_at)
      ? row.last_failed_request
      : null;

  return (
    <article className="rounded-2xl border border-line bg-surface px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="text-[15px] font-medium">{row.name}</h3>
          <p className="font-mono text-xs text-muted">{row.id}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLE[item.severity]}`}>
          {item.label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Field label="Objekter">
          {Number(row.active_records).toLocaleString("nb-NO")}
          {Number(row.removed_records) > 0 && (
            <span className="text-muted"> (+{Number(row.removed_records).toLocaleString("nb-NO")} fjernet)</span>
          )}
        </Field>
        <Field label="Dataalder">{ageLabel(item.dataAgeHours)}</Field>
        <Field label="Sist vellykket">{dateTime(row.last_success_at)}</Field>
        <Field label="Sist forsøkt">{dateTime(row.last_attempt_at)}</Field>
      </dl>

      <p className="mt-3 text-[13px] text-muted">
        Tidsplan: hver {row.sync_interval_minutes! >= 60 ? `${Math.round(row.sync_interval_minutes! / 60)}. time` : `${row.sync_interval_minutes}. minutt`}
        {row.supports_incremental ? " (inkrementell)" : " (full)"} · full sync hver {row.full_sync_interval_hours} t · utdatert etter{" "}
        {row.stale_after_hours} t
      </p>

      {run && (
        <p className="mt-2 font-mono text-xs text-muted">
          siste: {run.mode}/{run.trigger} · {run.status} · fetched {run.fetched} · rejected {run.rejected} · poster {run.records} · ins{" "}
          {run.inserted} · upd {run.updated} · unch {run.unchanged} · rem {run.removed}
          {run.mode === "full" && !run.reconciled ? " · reconciliation hoppet over" : ""}
        </p>
      )}

      {item.reasons.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-[13px]">
          {item.reasons.map((reason) => (
            <li key={reason} className={item.severity === "critical" ? "text-danger" : "text-muted"}>
              {reason}
            </li>
          ))}
        </ul>
      )}

      {feilet && <FeiletForespørsel request={feilet} />}

      <div className="mt-4">
        <SyncButtons
          providerId={row.id}
          supportsIncremental={row.supports_incremental}
          pendingRequest={row.open_request}
          offerForce={suspicious}
        />
      </div>

      {requests.length > 0 && <Forespørselshistorikk requests={requests} />}
    </article>
  );
}

/**
 * En manuell oppdatering som feilet, og som ingen senere kjøring har rettet opp.
 *
 * Før lukket denne feilen seg selv i stillhet: provider_health() returnerte bare åpne
 * forespørsler, så kortet gikk rett tilbake til knappen og ingenting sa at forsøket hadde feilet.
 */
function FeiletForespørsel({ request }: { request: SyncRequestRow }) {
  const view = beskrivRequest(request);
  const feil = trygtFeilutdrag(request.error);
  return (
    <div className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
      <p className="font-medium">{view.tittel}</p>
      <p>{view.detalj}</p>
      {feil && <p className="mt-1">{feil}</p>}
    </div>
  );
}

/**
 * Historikken bak forespørslene, sammenklappet.
 *
 * Kortet skal fortsatt kunne leses av et menneske som bare vil vite om dataene er i orden, så
 * dette ligger bak en expander. Det er feilsøkingsinformasjon: hvem ba om hva, hvor lenge den lå
 * i kø, og hvilken kjøring den ble.
 */
function Forespørselshistorikk({ requests }: { requests: SyncRequestHistoryRow[] }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[13px] text-muted">Manuelle oppdateringer ({requests.length})</summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {requests.map((r) => {
          const view = beskrivRequest(r);
          const køMin =
            r.started_at !== null && r.started_at !== undefined
              ? Math.round((Date.parse(r.started_at) - Date.parse(r.requested_at)) / 60_000)
              : null;
          return (
            <li key={r.id} className="text-[13px] text-muted">
              <span className={view.varsler ? "text-danger" : undefined}>{view.tittel}</span>
              {" · "}
              {datoOgKlokke(r.requested_at)}
              {køMin !== null && ` · ${køMin} min i kø`}
              {r.requested_by && ` · ${r.requested_by}`}
              {r.sync_run_id && <span className="font-mono"> · kjøring {r.sync_run_id.slice(0, 8)}</span>}
              {r.run_status && ` (${r.run_status})`}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/**
 * Klokka, ikke kildene. Uten denne ser vi bare at en sync uteble, ikke om det var
 * scheduleren som stoppet — som er nettopp det som skjedde med GitHubs egen cron.
 */
function SchedulerCard({ scheduler }: { scheduler: SchedulerStatus | null }) {
  if (!scheduler) return null;
  const sist = scheduler.last_run ? new Date(scheduler.last_run) : null;
  const minutterSiden = scheduler.minutesSinceLastRun;
  // To tikk uten kjøring er noe annet enn en forsinkelse.
  const forsinket = minutterSiden !== null && minutterSiden > 35;

  return (
    <>
      <h2 className="mt-12 text-lg font-semibold">Scheduler</h2>
      <div className="mt-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm">
        <p className="text-[15px] font-medium text-ink">
          pg_cron · {scheduler.schedule} · {scheduler.active ? "aktiv" : "slått av"}
        </p>
        <p className="mt-1 text-muted">
          {sist
            ? `Sist utløst ${sist.toLocaleString("nb-NO")} (${minutterSiden} min siden)${
                scheduler.last_status ? ` · ${scheduler.last_status}` : ""
              }`
            : "Ikke utløst ennå."}
        </p>
        {scheduler.last_http_status !== null && (
          <p className="mt-1 text-muted">
            Siste svar fra GitHub: HTTP {scheduler.last_http_status}
            {scheduler.last_http_at ? ` · ${new Date(scheduler.last_http_at).toLocaleString("nb-NO")}` : ""}
          </p>
        )}
        {scheduler.last_message && <p className="mt-1 text-muted">{scheduler.last_message}</p>}
        {(!scheduler.active || forsinket) && (
          <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-danger">
            {scheduler.active
              ? "Klokka har ikke utløst på over to intervaller. GitHubs egen schedule er reserve."
              : "Cron-jobben er slått av. Bare GitHubs egen schedule utløser sync nå."}
          </p>
        )}
      </div>
    </>
  );
}

function RunsTable({ runs }: { runs: SyncRunRow[] }) {
  if (runs.length === 0) return <p className="mt-3 text-sm text-muted">Ingen kjøringer registrert ennå.</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="text-muted">
          <tr>
            <Th>Startet</Th>
            <Th>Provider</Th>
            <Th>Modus</Th>
            <Th>Start</Th>
            <Th>Status</Th>
            <Th>Hentet</Th>
            <Th>Avvist</Th>
            <Th>Poster</Th>
            <Th>Endret</Th>
            <Th>Fjernet</Th>
            <Th>Merknad</Th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-t border-line align-top">
              <Td>{dateTime(run.started_at)}</Td>
              <Td className="font-mono text-xs">{run.provider_id}</Td>
              <Td>{run.mode}</Td>
              <Td>{run.trigger}</Td>
              <Td className={run.status === "success" ? "" : "font-medium text-danger"}>{run.status}</Td>
              <Td>{run.fetched}</Td>
              <Td>{run.rejected}</Td>
              <Td>{run.records}</Td>
              <Td>
                {run.inserted}/{run.updated}
              </Td>
              <Td>{run.mode === "full" && !run.reconciled ? "–" : run.removed}</Td>
              <Td className="max-w-md whitespace-normal text-[13px] text-muted">
                {[...(run.warnings ?? []), run.error].filter(Boolean).join(" ")}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">NaboRadar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Drift</h1>
        </div>
        {right}
      </div>
      {children}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 font-medium">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}
