"use client";

import { formatArea } from "@/lib/format";
import { PROPERTY_SOURCES, type PropertyDetails } from "@/lib/property/types";

export type PropertyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; property: PropertyDetails }
  | { status: "not-found" }
  | { status: "error" };

/**
 * Eiendomskortet. Viser kun åpne matrikkeldata vi faktisk har tilgang til.
 *
 * Eier, byggeår, bruksareal og salgsopplysninger er bevisst ikke med: de krever avtale med
 * Kartverket (se docs/eiendom-discovery.md). Vi lager ingen tomme plassholdere for dem — bare
 * én diskret linje om at mer kommer.
 */
export function PropertyCard({ state, onClose }: { state: PropertyState; onClose: () => void }) {
  if (state.status === "idle") return null;

  return (
    <section aria-live="polite" className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-float">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold">Eiendom</h3>
        <button
          type="button"
          onClick={onClose}
          className="-my-1 -mr-2 h-9 touch-manipulation rounded-lg px-2 text-[13px] font-medium text-muted hover:text-ink"
        >
          Lukk
        </button>
      </div>

      {state.status === "loading" && (
        <p className="mt-2 inline-flex items-center gap-2 text-[15px] text-muted">
          <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
          Henter eiendomsdata …
        </p>
      )}

      {state.status === "not-found" && (
        <p className="mt-2 text-[15px] text-muted">Fant ingen registrert eiendom på dette punktet.</p>
      )}

      {state.status === "error" && (
        <p className="mt-2 text-[15px] text-muted">
          Vi får ikke hentet eiendomsdata akkurat nå. Resten av kartet fungerer som normalt.
        </p>
      )}

      {state.status === "ok" && <Details property={state.property} />}
    </section>
  );
}

function Details({ property }: { property: PropertyDetails }) {
  const bygg = property.bygg.value;
  const typer = [...new Set(bygg.map((b) => b.typeLabel).filter((t): t is string => t !== null))];
  const kilder = [...new Set([property.matrikkelnummer.source, property.bygg.source, property.adresse?.source].filter(Boolean))];

  return (
    <>
      <p className="mt-1 text-[17px] leading-snug font-medium text-ink [overflow-wrap:anywhere]">
        {property.adresse?.value ?? `Matrikkel ${property.matrikkelnummer.value}`}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2.5 text-[15px]">
        <Field label="Matrikkelnummer">
          {property.matrikkelnummer.value}
          {property.kommune && <span className="text-muted"> · {property.kommune.value}</span>}
        </Field>
        {property.tomteareal && <Field label="Tomteareal">{formatArea(property.tomteareal.value)}</Field>}
        {property.matrikkelenhetstype && <Field label="Type">{property.matrikkelenhetstype.value}</Field>}
        <Field label="Bygg på eiendommen">
          {bygg.length === 0 ? "Ingen registrert" : bygg.length}
          {typer.length > 0 && <span className="block text-[13px] text-muted">{typer.join(" · ")}</span>}
        </Field>
      </dl>

      {property.flagg.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-[13px] text-muted">
          {property.flagg.map((flagg) => (
            <li key={flagg.value}>{flagg.value} — registrert i matrikkelen</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[13px] text-muted">
        Kilde: {kilder.map((id) => PROPERTY_SOURCES[id!].name).join(" · ")} (Kartverket, CC BY 4.0)
      </p>
      <p className="mt-1.5 text-[13px] text-muted">Flere eiendomsdata kommer når datatilgang er på plass.</p>
    </>
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
