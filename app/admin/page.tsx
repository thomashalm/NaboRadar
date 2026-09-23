import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SyncButtons } from "@/components/admin/SyncButtons";
import { loadAdminOverview, type SyncRunRow } from "@/lib/admin/queries";
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

  const { health, runs, errors } = await loadAdminOverview(session.client);
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
          <ProviderCard key={item.id} item={item} />
        ))}
      </section>

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

function ProviderCard({ item }: { item: ProviderHealth }) {
  const row = item.row;
  const run = row.last_run;
  const suspicious = row.last_run_status === "suspicious";

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

      <div className="mt-4">
        <SyncButtons
          providerId={row.id}
          supportsIncremental={row.supports_incremental}
          pendingRequest={row.open_request ? { mode: row.open_request.mode, status: row.open_request.status } : null}
          offerForce={suspicious}
        />
      </div>
    </article>
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
