"use client";

import { useActionState } from "react";
import Link from "next/link";
import { reviewHutAction, reviewHutStatusAction, setHutContactAction, setHutOverridesAction, type HutActionState } from "@/app/admin/hytter/actions";
import { KILDENAVN, type HutContactRow, type HutReviewCase, type HutStatusRow } from "@/lib/admin/huts";
import { buildHutHref } from "@/lib/huts/href";
import { HUT_ACCESS_OVERRIDES, HUT_OWNER_OVERRIDES, HUT_TYPE_OVERRIDES, hutAccessKind } from "@/lib/huts/types";
import { HUT_NEXT_STEP_LABELS, HUT_OWNER_LABELS, HUT_TYPE_LABELS, hutNextStep, type HutNextStepKind } from "@/lib/huts/wording";
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

const STATUSFARGE: Record<HutNextStepKind, string> = {
  booking_link: "border-line text-muted",
  info_link: "border-line text-ink",
  manager_only: "border-plan/40 bg-plan-soft text-plan",
  unknown: "border-danger/40 bg-danger-soft text-danger",
};

/**
 * Kontaktopplysningene for én hytte: bestillingslenke, infoside og forvalter.
 *
 * Statusen er den samme som styrer hyttesiden (`hutNextStep`), så det som står her, er det
 * brukeren ser. Tomt felt fjerner opplysningen. Forvalterfeltet er for navnet en offisiell side
 * oppgir; står det tomt, brukes navnet fra Turrutebasen når det finnes.
 */
export function HytteKontakt({ hytte }: { hytte: HutContactRow }) {
  const [state, action, pending] = useActionState(setHutContactAction, initial);
  const felt = "mt-0.5 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px]";
  const steg = hutNextStep({
    access: hutAccessKind(hytte.locked, hytte.access_override),
    bookingUrl: hytte.booking_url,
    infoUrl: hytte.info_url,
    managerName: hytte.manager_name,
  });
  const kontrollert = hytte.links_verified_at ? new Date(hytte.links_verified_at).toLocaleDateString("nb-NO") : null;

  return (
    <li className="rounded-2xl border border-line bg-surface px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[15px] font-medium text-ink">
          <Link href={buildHutHref(hytte)} className="hover:underline">
            {hytte.name}
          </Link>
        </p>
        <span className={`rounded-full border px-2 py-0.5 text-[12px] font-medium ${STATUSFARGE[steg.kind]}`}>{HUT_NEXT_STEP_LABELS[steg.kind]}</span>
        {hytte.locked && <span className="rounded-full border border-line px-2 py-0.5 text-[12px] text-ink">Låst</span>}
        {(hytte.type_override || hytte.access_override || hytte.owner_override) && (
          <span className="rounded-full border border-line px-2 py-0.5 text-[12px] text-ink">Avviker fra Kartverket</span>
        )}
        {hytte.access_status === "closed" && (
          <span className="rounded-full border border-line px-2 py-0.5 text-[12px] text-ink">Midlertidig stengt</span>
        )}
        {!hytte.is_visible && <span className="text-[12px] text-muted">vises ikke før den er godkjent</span>}
      </div>
      <p className="mt-0.5 text-[13px] text-muted">
        {typeNavn(hytte.hut_type)} · {eierNavn(hytte.owner_kind)}
        {hytte.municipality_number ? ` · kommune ${hytte.municipality_number}` : ""}
        {hytte.manager_source ? ` · Turrutebasen: ${hytte.manager_source}` : ""}
        {kontrollert ? ` · kontrollert ${kontrollert}` : ""}
      </p>
      <form action={action} className="mt-2 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="hutId" value={hytte.id} />
        <label className="text-[13px] text-muted">
          Bestilling (en side der man faktisk bestiller)
          <input name="bookingUrl" type="url" defaultValue={hytte.booking_url ?? ""} placeholder="https://" className={felt} />
        </label>
        <label className="text-[13px] text-muted">
          Offisiell infoside
          <input name="infoUrl" type="url" defaultValue={hytte.info_url ?? ""} placeholder="https://" className={felt} />
        </label>
        <label className="text-[13px] text-muted">
          Forvalter (slik den offisielle siden oppgir)
          <input name="manager" defaultValue={hytte.manager_verified ?? ""} placeholder={hytte.manager_source ?? ""} maxLength={120} className={felt} />
        </label>
        <label className="text-[13px] text-muted">
          Notat: hvor ble dette kontrollert?
          <input name="note" defaultValue={hytte.contact_note ?? ""} maxLength={500} className={felt} />
        </label>
        <label className="text-[13px] text-muted sm:col-span-2">
          Andre navn (kommaskilt) — navnet forvalteren bruker når det ikke er Kartverkets
          <input name="aliases" defaultValue={hytte.aliases.join(", ")} className={felt} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className={knapp}>
            Lagre
          </button>
          <Melding state={state} />
        </div>
      </form>
      <HytteOverstyring hytte={hytte} />
    </li>
  );
}

const TILGANG_VALG: Record<(typeof HUT_ACCESS_OVERRIDES)[number], string> = {
  unlocked: "Ulåst",
  dnt_key: "DNT-nøkkel",
  code_lock: "Kodelås",
  special_key: "Spesialnøkkel",
  code_or_special_key: "Kodelås eller spesialnøkkel",
  locked_prebooking: "Låst – må bestilles på forhånd",
  not_public: "Ikke for allmennheten",
};

/**
 * Avvik fra Kartverket for én hytte: type, tilgang, status og en kort offentlig merknad.
 *
 * Kildens verdi står til venstre og endres aldri herfra. Det som lagres, ligger oppå — og
 * krever den offisielle siden som sier det, slik at den som kommer etter kan se hvorfor siden
 * avviker fra Kartverket.
 */
function HytteOverstyring({ hytte }: { hytte: HutContactRow }) {
  const [state, action, pending] = useActionState(setHutOverridesAction, initial);
  const felt = "mt-0.5 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px]";
  const aktiv = hytte.override_verified_at !== null;
  const kontrollert = hytte.override_verified_at ? new Date(hytte.override_verified_at).toLocaleDateString("nb-NO") : null;
  const kildeTilgang = hytte.locked === null ? "ikke oppgitt" : hytte.locked ? "Låst" : "Ulåst";

  return (
    <details className="mt-3 border-t border-line pt-2.5" open={aktiv}>
      <summary className="cursor-pointer text-[13px] font-medium text-ink">
        Avvik fra Kartverket{aktiv ? ` · kontrollert ${kontrollert}` : ""}
      </summary>
      <p className="mt-1.5 text-[13px] text-muted">
        Kilden sier: {typeNavn(hytte.hut_type).toLowerCase()} · {kildeTilgang.toLowerCase()}. Verdiene under vises i stedet. Tomt
        valg betyr at kilden gjelder.
      </p>
      <form action={action} className="mt-2 grid gap-2 sm:grid-cols-3">
        <input type="hidden" name="hutId" value={hytte.id} />
        <label className="text-[13px] text-muted">
          Type
          <select name="type" defaultValue={hytte.type_override ?? ""} className={felt}>
            <option value="">Som kilden ({typeNavn(hytte.hut_type).toLowerCase()})</option>
            {HUT_TYPE_OVERRIDES.map((type) => (
              <option key={type} value={type}>
                {HUT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-muted">
          Tilgang
          <select name="access" defaultValue={hytte.access_override ?? ""} className={felt}>
            <option value="">Som kilden ({kildeTilgang.toLowerCase()})</option>
            {HUT_ACCESS_OVERRIDES.map((kind) => (
              <option key={kind} value={kind}>
                {TILGANG_VALG[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-muted">
          Eier — bare når kildens kategori er feil
          <select name="owner" defaultValue={hytte.owner_override ?? ""} className={felt}>
            <option value="">Som kilden ({eierNavn(hytte.owner_kind).toLowerCase()})</option>
            {HUT_OWNER_OVERRIDES.map((kind) => (
              <option key={kind} value={kind}>
                {eierNavn(kind)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-muted">
          Status
          <select name="status" defaultValue={hytte.access_status} className={felt}>
            <option value="unknown">Ikke oppgitt</option>
            <option value="closed">Midlertidig stengt</option>
          </select>
        </label>
        <label className="text-[13px] text-muted">
          Hvis stengt: kontroller igjen om
          <select name="reviewDays" defaultValue="60" className={felt}>
            <option value="30">30 dager (kortvarig)</option>
            <option value="60">60 dager</option>
            <option value="90">90 dager (ubestemt tid)</option>
          </select>
        </label>
        <label className="text-[13px] text-muted sm:col-span-3">
          Offentlig merknad — én kort setning brukeren trenger, slik forvalteren oppgir det (vises på hyttesiden)
          <input name="publicNote" defaultValue={hytte.public_note ?? ""} maxLength={160} className={felt} />
        </label>
        <label className="text-[13px] text-muted sm:col-span-3">
          Kilde: den offisielle siden som sier dette (vises ikke offentlig)
          <input name="sourceUrl" type="url" defaultValue={hytte.override_source_url ?? ""} placeholder="https://" className={felt} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-3">
          <button type="submit" disabled={pending} className={knapp}>
            Lagre avvik
          </button>
          <Melding state={state} />
        </div>
      </form>
    </details>
  );
}

const dato = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("nb-NO") : "–");

/**
 * Én midlertidig stengt hytte som skal kontrolleres.
 *
 * Statusen er satt for hånd etter forvalterens side og oppheves aldri av seg selv. Her åpner
 * man siden igjen og velger ett av to: fortsatt stengt (ny dato), eller åpen igjen.
 */
export function HytteStatus({ hytte }: { hytte: HutStatusRow }) {
  const [state, action, pending] = useActionState(reviewHutStatusAction, initial);

  return (
    <li className="rounded-2xl border border-line bg-surface px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[15px] font-medium text-ink">
          <Link href={buildHutHref(hytte)} className="hover:underline">
            {hytte.name}
          </Link>
        </p>
        <span className={`rounded-full border px-2 py-0.5 text-[12px] font-medium ${hytte.overdue ? "border-plan/40 bg-plan-soft text-plan" : "border-line text-muted"}`}>
          {hytte.overdue ? "Skal kontrolleres nå" : `Kontrolleres ${dato(hytte.review_at)}`}
        </span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">
        Midlertidig stengt{hytte.manager_name ? ` · ${hytte.manager_name}` : ""} · sist kontrollert {dato(hytte.verified_at)}
      </p>
      {hytte.public_note && <p className="mt-1 text-[14px] text-ink">«{hytte.public_note}»</p>}
      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="hutId" value={hytte.id} />
        {hytte.source_url && (
          <a href={hytte.source_url} target="_blank" rel="noopener noreferrer" className={`${knapp} inline-flex items-center text-accent`}>
            Åpne forvalterens side
          </a>
        )}
        <select name="reviewDays" defaultValue="60" aria-label="Dager til neste kontroll" className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px]">
          <option value="30">ny kontroll om 30 dager</option>
          <option value="60">ny kontroll om 60 dager</option>
          <option value="90">ny kontroll om 90 dager</option>
        </select>
        <button type="submit" name="action" value="still_closed" disabled={pending} className={knapp}>
          Fortsatt stengt
        </button>
        <button type="submit" name="action" value="reopened" disabled={pending} className={knapp}>
          Åpen igjen
        </button>
        <Melding state={state} />
      </form>
    </li>
  );
}
