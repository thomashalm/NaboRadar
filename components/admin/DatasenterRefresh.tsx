"use client";

import { useActionState } from "react";
import { avbrytRefresh, startRefresh, type Svar } from "@/app/admin/datasenter/actions";
import type { RefreshKjøring } from "@/lib/admin/datacenter-types";

const initial: Svar | null = null;

const STATUS_TEKST: Record<RefreshKjøring["status"], string> = {
  queued: "Ligger i kø",
  running: "Kontrolleres nå",
  completed: "Fullført",
  failed: "Feilet",
  cancelled: "Avbrutt",
};

const MODUS_TEKST: Record<RefreshKjøring["mode"], string> = {
  review_due: "Det som trenger review",
  full: "Full datasenter-refresh",
};

function klokkeslett(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * «Oppdater datasenterdata».
 *
 * To modi, ikke én knapp med en skjult regel: «det som trenger review» er den daglige, og «full»
 * er bevisst tyngre og skal velges. Antallet står på knappen før du trykker, slik at en full
 * kjøring over 66 anlegg ikke kan startes ved et uhell.
 */
export function DatasenterRefresh({
  antall,
  aktiv,
}: {
  antall: { review_due: number; full: number };
  aktiv: RefreshKjøring | null;
}) {
  const [start, startAction, startPending] = useActionState(startRefresh, initial);
  const [avbryt, avbrytAction, avbrytPending] = useActionState(avbrytRefresh, initial);

  if (aktiv && (aktiv.status === "queued" || aktiv.status === "running")) {
    const andel = aktiv.total > 0 ? Math.round((aktiv.checked / aktiv.total) * 100) : 0;
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[15px] font-medium text-ink">
            {STATUS_TEKST[aktiv.status]} · {MODUS_TEKST[aktiv.mode]}
          </p>
          <p className="text-[13px] text-muted">Lagt i kø {klokkeslett(aktiv.queued_at)}</p>
        </div>

        <p className="mt-3 text-[22px] font-medium tabular-nums text-ink">
          {aktiv.checked} / {aktiv.total}
          <span className="ml-2 text-[13px] font-normal text-muted">kontrollert</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${andel}%` }} />
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
          <div className="flex gap-1.5">
            <dt className="text-muted">Endret</dt>
            <dd className="tabular-nums text-ink">{aktiv.changed}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted">Uendret</dt>
            <dd className="tabular-nums text-ink">{aktiv.unchanged}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted">Hoppet over</dt>
            <dd className="tabular-nums text-ink">{aktiv.skipped}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted">Feil</dt>
            <dd className={`tabular-nums ${aktiv.failed > 0 ? "text-danger" : "text-ink"}`}>{aktiv.failed}</dd>
          </div>
        </dl>

        <form action={avbrytAction} className="mt-4">
          <input type="hidden" name="runId" value={aktiv.id} />
          <button
            type="submit"
            disabled={avbrytPending}
            className="rounded-full border border-line px-4 py-1.5 text-[13px] text-muted hover:text-ink disabled:opacity-50"
          >
            {avbrytPending ? "Avbryter …" : "Avbryt kjøringen"}
          </button>
        </form>
        {avbryt && !avbryt.ok && <p className="mt-2 text-[13px] text-danger">{avbryt.melding}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[15px] font-medium text-ink">Oppdater datasenterdata</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Oppretter en kø av anlegg som skal kontrolleres. Rører ingen providere, ingen planer og ingen
        andre researchkategorier.
      </p>

      <form action={startAction} className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          name="mode"
          value="review_due"
          disabled={startPending || antall.review_due === 0}
          className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-surface hover:opacity-90 disabled:opacity-40"
        >
          Oppdater det som trenger review ({antall.review_due})
        </button>
        <button
          type="submit"
          name="mode"
          value="full"
          disabled={startPending || antall.full === 0}
          className="rounded-full border border-line px-4 py-2 text-[13px] text-ink hover:bg-line/40 disabled:opacity-40"
        >
          Full datasenter-refresh ({antall.full})
        </button>
      </form>

      {start && <p className={`mt-3 text-[13px] ${start.ok ? "text-muted" : "text-danger"}`}>{start.melding}</p>}
      {antall.review_due === 0 && (
        <p className="mt-3 text-[13px] text-muted">Ingen anlegg trenger oppdatering akkurat nå.</p>
      )}
    </div>
  );
}
