"use client";

import { useActionState } from "react";
import {
  addResearchSourceAction,
  deleteResearchSourceAction,
  initialFormState,
  type FormState,
} from "@/app/admin/research/actions";
import { SOURCE_TYPES, SOURCE_TYPE_LABEL, type ResearchSource } from "@/lib/admin/research-types";

/**
 * Kildene bak ett funn.
 *
 * Flere kilder per funn er hele poenget: ett `source_url` ville tvunget oss til å velge én
 * kilde og kaste resten. En kilde som ble undersøkt og *ikke* fant noe er like verdifull —
 * den er det som gjør «undersøkt, ikke bekreftet» etterprøvbart senere. Derfor er «støtter
 * påstanden» et eget felt, og en ikke-støttende kilde vises som sådan i stedet for å skjules.
 */
export function ResearchSources({ itemId, sources }: { itemId: string; sources: ResearchSource[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        Kilder ({sources.length})
      </h2>

      {sources.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
          Ingen kilder ennå. Et funn uten kilde er en påstand.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sources.map((kilde) => (
            <Kilde key={kilde.id} itemId={itemId} kilde={kilde} />
          ))}
        </ul>
      )}

      <NyKilde itemId={itemId} />
    </section>
  );
}

function Kilde({ itemId, kilde }: { itemId: string; kilde: ResearchSource }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteResearchSourceAction, initialFormState);

  return (
    <li className="rounded-2xl border border-line bg-surface px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] font-medium tracking-[0.04em] text-muted uppercase">
          {[
            SOURCE_TYPE_LABEL[kilde.source_type],
            kilde.primary_source ? "HOVEDKILDE" : null,
            kilde.supports_claim ? null : "STØTTER IKKE PÅSTANDEN",
            kilde.source_date,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <form action={action}>
          <input type="hidden" name="sourceId" value={kilde.id} />
          <input type="hidden" name="itemId" value={itemId} />
          <button type="submit" disabled={pending} className="text-[13px] text-muted hover:text-danger hover:underline">
            {pending ? "Sletter …" : "Slett"}
          </button>
        </form>
      </div>
      <h3 className="mt-1 text-[16px] font-medium text-ink [overflow-wrap:anywhere]">{kilde.source_name}</h3>
      {kilde.publisher && <p className="text-[15px] text-muted">{kilde.publisher}</p>}
      {kilde.source_url && (
        <a
          href={kilde.source_url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 block text-[13px] text-accent hover:underline [overflow-wrap:anywhere]"
        >
          {kilde.source_url}
        </a>
      )}
      {kilde.excerpt_or_summary && (
        <p className="mt-2 border-l-2 border-line-strong pl-3 text-[15px] leading-relaxed text-ink">
          {kilde.excerpt_or_summary}
        </p>
      )}
      {kilde.notes && <p className="mt-2 text-[13px] text-muted">{kilde.notes}</p>}
      {state.status === "error" && <p className="mt-2 text-[13px] text-danger">{state.message}</p>}
    </li>
  );
}

const INPUT =
  "mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-accent";

function NyKilde({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addResearchSourceAction, initialFormState);
  const feil = state.status === "error" ? (state.felt ?? {}) : {};

  return (
    <details className="mt-4 rounded-2xl border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-3.5 text-[15px] font-medium text-ink">Legg til kilde</summary>
      <form action={action} className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <input type="hidden" name="itemId" value={itemId} />
        <label htmlFor="source_name" className="block sm:col-span-2">
          <span className="text-[13px] font-medium text-ink">Navn på kilden</span>
          <input id="source_name" name="source_name" className={INPUT} />
          {feil.source_name && <span className="mt-1 block text-[13px] text-danger">{feil.source_name}</span>}
        </label>
        <label htmlFor="source_url" className="block sm:col-span-2">
          <span className="text-[13px] font-medium text-ink">
            URL <span className="font-normal text-muted">valgfritt</span>
          </span>
          <input id="source_url" name="source_url" placeholder="https://" className={INPUT} />
          {feil.source_url && <span className="mt-1 block text-[13px] text-danger">{feil.source_url}</span>}
        </label>
        <label htmlFor="publisher" className="block">
          <span className="text-[13px] font-medium text-ink">
            Utgiver <span className="font-normal text-muted">valgfritt</span>
          </span>
          <input id="publisher" name="publisher" className={INPUT} />
        </label>
        <label htmlFor="source_type" className="block">
          <span className="text-[13px] font-medium text-ink">Kildetype</span>
          <select id="source_type" name="source_type" defaultValue="web" className={INPUT}>
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SOURCE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="source_date" className="block">
          <span className="text-[13px] font-medium text-ink">
            Dato på kilden <span className="font-normal text-muted">valgfritt</span>
          </span>
          <input id="source_date" name="source_date" placeholder="ÅÅÅÅ-MM-DD" className={INPUT} />
          {feil.source_date && <span className="mt-1 block text-[13px] text-danger">{feil.source_date}</span>}
        </label>
        <label htmlFor="excerpt_or_summary" className="block sm:col-span-2">
          <span className="text-[13px] font-medium text-ink">
            Utdrag eller sammendrag <span className="font-normal text-muted">valgfritt</span>
          </span>
          <textarea id="excerpt_or_summary" name="excerpt_or_summary" rows={3} className={INPUT} />
        </label>
        <label htmlFor="notes" className="block sm:col-span-2">
          <span className="text-[13px] font-medium text-ink">
            Notat <span className="font-normal text-muted">valgfritt</span>
          </span>
          <input id="notes" name="notes" className={INPUT} />
        </label>
        <div className="flex flex-wrap gap-5 sm:col-span-2">
          <label className="flex items-center gap-2 text-[15px] text-ink">
            <input type="checkbox" name="primary_source" className="size-4" />
            Hovedkilde
          </label>
          <label className="flex items-center gap-2 text-[15px] text-ink">
            <input type="checkbox" name="supports_claim" defaultChecked className="size-4" />
            Støtter påstanden
          </label>
        </div>
        {state.status === "error" && <p className="text-[15px] text-danger sm:col-span-2">{state.message}</p>}
        {state.status === "ok" && <p className="text-[15px] text-emerald-900 sm:col-span-2">{state.message}</p>}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-surface disabled:opacity-50"
          >
            {pending ? "Lagrer …" : "Legg til kilde"}
          </button>
        </div>
      </form>
    </details>
  );
}
