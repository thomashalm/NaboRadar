"use client";

import { useActionState, useState } from "react";
import {
  initialReviewState,
  registrerReviewAction,
  settReviewPlanAction,
  type ReviewFormState,
} from "@/app/admin/research/review/actions";
import { LEVELS, LEVEL_LABEL, OPERATIONAL_LABEL, OPERATIONAL_STATUSES } from "@/lib/admin/research-types";
import {
  REVIEW_MODES,
  REVIEW_MODE_LABEL,
  REVIEW_OUTCOMES,
  REVIEW_OUTCOME_HJELP,
  REVIEW_OUTCOME_LABEL,
  type ReviewOutcome,
} from "@/lib/admin/review-types";

/**
 * Skjemaet som avslutter en review.
 *
 * Utfallet velges først, fordi det bestemmer hva resten av skjemaet handler om: en statusendring
 * trenger ny status, en svekkelse trenger ny sikkerhet, en utsettelse trenger dato og begrunnelse.
 * Feltene vises etter valget i stedet for alle samtidig — ellers ser en «ingen endring» like
 * arbeidskrevende ut som en full oppdatering, og da blir den ikke registrert.
 *
 * Under ligger planoverstyringen, skilt fra reviewen med vilje: «dette skal sees på i januar» er
 * ikke det samme som «jeg har kontrollert det nå».
 */
export function ReviewSkjema({
  itemId,
  nåværendeStatus,
  nåværendeConfidence,
}: {
  itemId: string;
  nåværendeStatus: string;
  nåværendeConfidence: string;
}) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(
    registrerReviewAction,
    initialReviewState,
  );
  const [outcome, setOutcome] = useState<ReviewOutcome>("unchanged");

  const viserStatus = outcome === "status_changed" || outcome === "updated";
  const viserConfidence = outcome === "strengthened" || outcome === "weakened" || outcome === "updated";
  const viserOverstyring = outcome === "snoozed" || outcome === "reopened";

  return (
    <>
      <form action={action}>
        <input type="hidden" name="itemId" value={itemId} />

        <fieldset>
          <legend className="text-[13px] text-muted">Utfall</legend>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {REVIEW_OUTCOMES.map((o) => (
              <label
                key={o}
                className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 ${
                  outcome === o ? "border-ink" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="outcome"
                  value={o}
                  checked={outcome === o}
                  onChange={() => setOutcome(o)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-[15px] text-ink">{REVIEW_OUTCOME_LABEL[o]}</span>
                  <span className="block text-[13px] text-muted">{REVIEW_OUTCOME_HJELP[o]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {viserStatus && (
          <Velg
            navn="new_status"
            label="Ny driftsstatus"
            standard={nåværendeStatus}
            valg={OPERATIONAL_STATUSES.map((s) => ({ verdi: s, label: OPERATIONAL_LABEL[s] }))}
            feil={state.status === "error" ? state.felt?.new_status : undefined}
          />
        )}

        {viserConfidence && (
          <Velg
            navn="new_confidence"
            label="Ny sikkerhet"
            standard={nåværendeConfidence}
            valg={LEVELS.map((l) => ({ verdi: l, label: LEVEL_LABEL[l] }))}
            feil={state.status === "error" ? state.felt?.new_confidence : undefined}
          />
        )}

        <label className="mt-3 block">
          <span className="text-[13px] text-muted">Hva fant du?</span>
          <textarea
            name="summary"
            rows={3}
            placeholder="Kort: hva ble kontrollert, og hva konkluderte du. Står i historikken."
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="mt-3 block max-w-[14rem]">
          <span className="text-[13px] text-muted">Antall kilder kontrollert</span>
          <input
            type="number"
            name="sources_checked"
            min={0}
            max={999}
            defaultValue={0}
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
          />
        </label>

        {viserOverstyring && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] text-muted">
                {outcome === "snoozed" ? "Utsett til" : "Ny review-dato"}
              </span>
              <input
                type="date"
                name="next_review_at"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
              />
              {state.status === "error" && state.felt?.next_review_at && (
                <span className="mt-1 block text-[13px] text-danger">{state.felt.next_review_at}</span>
              )}
            </label>
            <label className="block">
              <span className="text-[13px] text-muted">Begrunnelse</span>
              <input
                type="text"
                name="review_mode_note"
                placeholder={outcome === "snoozed" ? "Hvorfor utsettes den?" : "Hvorfor gjenåpnes funnet?"}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
              />
              {state.status === "error" && state.felt?.review_mode_note && (
                <span className="mt-1 block text-[13px] text-danger">{state.felt.review_mode_note}</span>
              )}
            </label>
            {outcome === "snoozed" && (
              <p className="text-[13px] text-muted sm:col-span-2">
                Utsettelse er ikke en måte å skjule noe på. Den står som overstyring i køen til noen
                gjør reviewen.
              </p>
            )}
          </div>
        )}

        {state.status === "error" && (
          <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">{state.message}</p>
        )}
        {state.status === "ok" && (
          <p className="mt-3 rounded-xl border border-line px-4 py-3 text-[14px] text-ink">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-surface disabled:opacity-60"
        >
          {pending ? "Registrerer …" : "Registrer review"}
        </button>
      </form>

      <Planoverstyring itemId={itemId} />
    </>
  );
}

/** Endrer når noe skal sees på, uten å hevde at det er kontrollert. */
function Planoverstyring({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(
    settReviewPlanAction,
    initialReviewState,
  );

  return (
    <details className="mt-6 border-t border-line pt-4">
      <summary className="cursor-pointer text-[14px] font-medium text-ink">Endre planen uten å reviewe</summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="itemId" value={itemId} />
        <label className="block">
          <span className="text-[13px] text-muted">Modus</span>
          <select
            name="review_mode"
            defaultValue="policy"
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
          >
            {REVIEW_MODES.map((m) => (
              <option key={m} value={m}>
                {REVIEW_MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] text-muted">Dato</span>
          <input
            type="date"
            name="next_review_at"
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-muted">Begrunnelse</span>
          <input
            type="text"
            name="review_mode_note"
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
          />
        </label>
        <p className="text-[13px] text-muted sm:col-span-3">
          «Etter policy» gir datoen tilbake til intervallpolicyen. Alt annet krever begrunnelse, og
          vises som overstyrt i køen.
        </p>
        {state.status === "error" && (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger sm:col-span-3">{state.message}</p>
        )}
        {state.status === "ok" && (
          <p className="rounded-xl border border-line px-4 py-3 text-[14px] text-ink sm:col-span-3">{state.message}</p>
        )}
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-line px-5 py-2.5 text-[15px] font-medium text-ink disabled:opacity-60"
          >
            {pending ? "Lagrer …" : "Lagre plan"}
          </button>
        </div>
      </form>
    </details>
  );
}

function Velg({
  navn,
  label,
  standard,
  valg,
  feil,
}: {
  navn: string;
  label: string;
  standard: string;
  valg: { verdi: string; label: string }[];
  feil?: string;
}) {
  return (
    <label className="mt-3 block max-w-[20rem]">
      <span className="text-[13px] text-muted">{label}</span>
      <select
        name={navn}
        defaultValue={standard}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
      >
        {valg.map((v) => (
          <option key={v.verdi} value={v.verdi}>
            {v.label}
          </option>
        ))}
      </select>
      {feil && <span className="mt-1 block text-[13px] text-danger">{feil}</span>}
    </label>
  );
}
