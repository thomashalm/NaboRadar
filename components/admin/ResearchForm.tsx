"use client";

import { useActionState } from "react";
import { initialFormState, saveResearchItemAction, type FormState } from "@/app/admin/research/actions";
import {
  ITEM_TYPES,
  ITEM_TYPE_LABEL,
  LEVELS,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  OPERATIONAL_STATUSES,
  RESEARCH_CATEGORIES,
  SENSITIVITIES,
  SENSITIVITY_LABEL,
  VERIFICATION_LABEL,
  VERIFICATION_STATUSES,
  type ResearchItem,
} from "@/lib/admin/research-types";

/**
 * Skjemaet for et research-funn. Samme skjema oppretter og redigerer.
 *
 * Feltene står i den rekkefølgen en undersøkelse faktisk går: hva tror vi dette er, hvor er
 * det, hvor sikre er vi, og hvorfor bryr vi oss. Statusfeltene har ingen «pen» standardverdi —
 * et nytt funn er uverifisert og internt til noen har gjort arbeidet.
 */
export function ResearchForm({ item }: { item?: ResearchItem }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveResearchItemAction, initialFormState);
  const feil = state.status === "error" ? (state.felt ?? {}) : {};

  return (
    <form action={action} className="mt-6 space-y-6">
      {item && <input type="hidden" name="id" value={item.id} />}

      <Bolk tittel="Hva">
        <Velg navn="item_type" label="Type" verdi={item?.item_type ?? "lead"}>
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t}>
              {ITEM_TYPE_LABEL[t]}
            </option>
          ))}
        </Velg>
        <Velg navn="category" label="Kategori" verdi={item?.category} feil={feil.category}>
          {RESEARCH_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Velg>
        <Felt navn="subcategory" label="Underkategori" verdi={item?.subcategory} valgfri />
        <Felt navn="title" label="Tittel" verdi={item?.title} feil={feil.title} bredt />
        <Tekstfelt navn="description" label="Beskrivelse" verdi={item?.description} valgfri />
      </Bolk>

      <Bolk tittel="Hvor">
        <Felt navn="address" label="Adresse" verdi={item?.address} valgfri bredt />
        <Felt navn="postal_code" label="Postnummer" verdi={item?.postal_code} feil={feil.postal_code} valgfri />
        <Felt navn="city" label="Sted" verdi={item?.city} valgfri />
        <Felt navn="municipality" label="Kommune" verdi={item?.municipality} valgfri />
        <Felt
          navn="latitude"
          label="Breddegrad"
          verdi={item?.latitude ?? null}
          feil={feil.latitude}
          valgfri
          hint="Uten koordinat vises funnet ikke i adressesøket"
        />
        <Felt navn="longitude" label="Lengdegrad" verdi={item?.longitude ?? null} valgfri />
      </Bolk>

      <Bolk tittel="Hvor sikkert">
        <Velg navn="verification_status" label="Verifisering" verdi={item?.verification_status ?? "unverified"}>
          {VERIFICATION_STATUSES.map((v) => (
            <option key={v} value={v}>
              {VERIFICATION_LABEL[v]}
            </option>
          ))}
        </Velg>
        <Velg navn="operational_status" label="Driftsstatus" verdi={item?.operational_status ?? "unknown"}>
          {OPERATIONAL_STATUSES.map((o) => (
            <option key={o} value={o}>
              {OPERATIONAL_LABEL[o]}
            </option>
          ))}
        </Velg>
        <Velg navn="confidence" label="Sikkerhet i funnet" verdi={item?.confidence ?? "low"}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </Velg>
        <Velg navn="interest_level" label="Interessenivå" verdi={item?.interest_level ?? "medium"}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </Velg>
        <Velg
          navn="sensitivity"
          label="Følsomhet"
          verdi={item?.sensitivity ?? "internal_only"}
          hint="Research publiseres aldri automatisk, uansett hva som står her"
        >
          {SENSITIVITIES.map((s) => (
            <option key={s} value={s}>
              {SENSITIVITY_LABEL[s]}
            </option>
          ))}
        </Velg>
        <Felt navn="reason_not_public" label="Grunn til å ikke publisere" verdi={item?.reason_not_public} valgfri bredt />
      </Bolk>

      <Bolk tittel="Hvorfor">
        <Tekstfelt navn="why_interesting" label="Hvorfor interessant" verdi={item?.why_interesting} valgfri />
        <Tekstfelt navn="notes" label="Notater" verdi={item?.notes} valgfri />
      </Bolk>

      {state.status === "error" && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] text-danger">{state.message}</p>
      )}
      {state.status === "ok" && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[15px] text-emerald-900">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-surface disabled:opacity-50"
      >
        {pending ? "Lagrer …" : item ? "Lagre endringer" : "Opprett funn"}
      </button>
    </form>
  );
}

function Bolk({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">{tittel}</legend>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const INPUT =
  "mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-accent";

function Etikett({
  navn,
  label,
  valgfri,
  hint,
  feil,
  bredt,
  children,
}: {
  navn: string;
  label: string;
  valgfri?: boolean;
  hint?: string;
  feil?: string;
  bredt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={navn} className={`block ${bredt ? "sm:col-span-2" : ""}`}>
      <span className="text-[13px] font-medium text-ink">
        {label}
        {valgfri && <span className="ml-1.5 font-normal text-muted">valgfritt</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-muted">{hint}</span>}
      {feil && <span className="mt-1 block text-[13px] text-danger">{feil}</span>}
    </label>
  );
}

function Felt({
  navn,
  label,
  verdi,
  ...rest
}: {
  navn: string;
  label: string;
  verdi?: string | number | null;
  valgfri?: boolean;
  hint?: string;
  feil?: string;
  bredt?: boolean;
}) {
  return (
    <Etikett navn={navn} label={label} {...rest}>
      <input id={navn} name={navn} defaultValue={verdi ?? ""} className={INPUT} />
    </Etikett>
  );
}

function Tekstfelt({
  navn,
  label,
  verdi,
  ...rest
}: {
  navn: string;
  label: string;
  verdi?: string | null;
  valgfri?: boolean;
  hint?: string;
  feil?: string;
}) {
  return (
    <Etikett navn={navn} label={label} bredt {...rest}>
      <textarea id={navn} name={navn} rows={3} defaultValue={verdi ?? ""} className={INPUT} />
    </Etikett>
  );
}

function Velg({
  navn,
  label,
  verdi,
  children,
  ...rest
}: {
  navn: string;
  label: string;
  verdi?: string;
  hint?: string;
  feil?: string;
  children: React.ReactNode;
}) {
  return (
    <Etikett navn={navn} label={label} {...rest}>
      <select id={navn} name={navn} defaultValue={verdi} className={INPUT}>
        {children}
      </select>
    </Etikett>
  );
}
