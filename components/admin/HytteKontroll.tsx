"use client";

import { useActionState } from "react";
import { reviewHutAction, setHutLinksAction, type HutActionState } from "@/app/admin/hytter/actions";
import { KILDENAVN, type HutLinkRow, type HutReviewCase } from "@/lib/admin/huts";
import { HUT_OWNER_LABELS, HUT_TYPE_LABELS } from "@/lib/huts/wording";
import type { HutOwnerKind, HutType } from "@/lib/huts/types";

const initial: HutActionState = { status: "idle" };

const typeNavn = (type: string | null) => (type ? (HUT_TYPE_LABELS[type as HutType] ?? type) : "uten type");
const eierNavn = (kind: string) => HUT_OWNER_LABELS[kind as HutOwnerKind] ?? (kind === "other" ? "andre" : "ukjent eier");

function Melding({ state }: { state: HutActionState }) {
  if (state.status === "idle") return null;
  return <p className={`text-[13px] ${state.status === "error" ? "text-danger" : "text-muted"}`}>{state.message}</p>;
}

const knapp = "h-9 rounded-lg border border-line px-3 text-[13px] font-medium disabled:opacity-50 hover:border-line-strong";

/**
 * Én sak i kontrollkøen.
 *
 * Skjermen viser det som trengs for å avgjøre saken — kildepostene og de nærmeste andre
 * hyttene — og tre utfall. Den er bevisst ikke et researchverktøy: en sak er enten en hytte
 * vi skal vise, noe vi ikke skal vise, eller en dublett.
 */
export function HytteSak({ sak }: { sak: HutReviewCase }) {
  const [state, action, pending] = useActionState(reviewHutAction, initial);

  return (
    <li className="rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[17px] font-semibold text-ink">{sak.name}</h3>
        <span className="text-[13px] text-muted">{sak.is_visible ? "Vises ved publisering" : "Vises ikke før den er godkjent"}</span>
      </div>
      <p className="mt-0.5 text-[14px] text-ink">{sak.review_reason}</p>
      <p className="mt-1 text-[13px] text-muted">
        {typeNavn(sak.hut_type)} · {eierNavn(sak.owner_kind)}
        {sak.manager_name ? ` · ${sak.manager_name}` : ""}
        {sak.municipality_number ? ` · kommune ${sak.municipality_number}` : ""} ·{" "}
        <a
          href={`https://norgeskart.no/#!?project=norgeskart&layers=1002&zoom=13&lat=${sak.latitude}&lon=${sak.longitude}&markerLat=${sak.latitude}&markerLon=${sak.longitude}&sok=${sak.latitude},${sak.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {sak.latitude.toFixed(5)}, {sak.longitude.toFixed(5)}
        </a>
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Kildeposter</p>
          <ul className="mt-1 text-[13px] text-ink">
            {(sak.sources ?? []).map((kilde) => (
              <li key={kilde.provider_id + kilde.external_id}>
                {KILDENAVN[kilde.provider_id] ?? kilde.provider_id}: «{kilde.title}», {typeNavn(kilde.hut_type).toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Nærmeste andre hytter</p>
          {(sak.nearby ?? []).length === 0 ? (
            <p className="mt-1 text-[13px] text-muted">Ingen innen 2 km.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-[13px] text-ink">
              {(sak.nearby ?? []).map((nabo) => (
                <li key={nabo.id} className="flex flex-wrap items-center gap-x-2">
                  <span>
                    {nabo.name} · {typeNavn(nabo.hut_type).toLowerCase()} · {nabo.distance_m} m
                  </span>
                  <form action={action}>
                    <input type="hidden" name="hutId" value={sak.id} />
                    <input type="hidden" name="action" value="merge" />
                    <input type="hidden" name="target" value={nabo.id} />
                    <button type="submit" disabled={pending} className="text-accent hover:underline disabled:opacity-50">
                      Slå sammen med denne
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="hutId" value={sak.id} />
        <input
          name="note"
          placeholder="Notat (valgfritt)"
          maxLength={500}
          className="h-9 min-w-48 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px]"
        />
        <button type="submit" name="action" value="approve" disabled={pending} className={knapp}>
          Godkjenn
        </button>
        <button type="submit" name="action" value="reject" disabled={pending} className={knapp}>
          Avvis
        </button>
      </form>
      <div className="mt-1">
        <Melding state={state} />
      </div>
    </li>
  );
}

/** Offisielle lenker for én hytte. Tomt felt fjerner lenken. */
export function HytteLenker({ hytte }: { hytte: HutLinkRow }) {
  const [state, action, pending] = useActionState(setHutLinksAction, initial);
  const felt = "mt-0.5 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px]";

  return (
    <li className="rounded-2xl border border-line bg-surface px-4 py-3.5 sm:px-5">
      <p className="text-[15px] font-medium text-ink">
        {hytte.name}{" "}
        <span className="text-[13px] font-normal text-muted">
          · {typeNavn(hytte.hut_type)} · {eierNavn(hytte.owner_kind)}
          {hytte.municipality_number ? ` · kommune ${hytte.municipality_number}` : ""}
        </span>
      </p>
      <form action={action} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="hutId" value={hytte.id} />
        <label className="text-[13px] text-muted">
          Bestilling (en side der man faktisk bestiller)
          <input name="bookingUrl" type="url" defaultValue={hytte.booking_url ?? ""} placeholder="https://" className={felt} />
        </label>
        <label className="text-[13px] text-muted">
          Offisiell infoside
          <input name="infoUrl" type="url" defaultValue={hytte.info_url ?? ""} placeholder="https://" className={felt} />
        </label>
        <button type="submit" disabled={pending} className={knapp}>
          Lagre
        </button>
      </form>
      <div className="mt-1">
        <Melding state={state} />
      </div>
    </li>
  );
}
