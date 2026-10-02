import { formatDate } from "@/lib/format";
import type { Hut } from "@/lib/huts/queries";
import { HUT_ACCESS_NOTE, hutFacts, hutLinks } from "@/lib/huts/wording";

const OVERSKRIFT = "text-xs font-semibold tracking-[0.08em] text-muted uppercase";

/** Faktaradene. Bare felt med innhold: kildene har verken pris, ledighet, sesong eller senger. */
function Fakta({ rader, compact }: { rader: [string, string][]; compact: boolean }) {
  return (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 ${compact ? "text-[13px]" : "text-[15px]"}`}>
      {rader.map(([navn, verdi]) => (
        <div key={navn} className="contents">
          <dt className="text-muted">{navn}</dt>
          <dd className="text-ink">{verdi}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Lenkene til den som driver hytta. NaboRadar gjør ingen bestilling selv. */
function Lenker({ hut }: { hut: Hut }) {
  const lenker = hutLinks(hut);
  if (lenker.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {lenker.map((lenke) => (
        <a
          key={lenke.kind}
          href={lenke.href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            lenke.kind === "booking"
              ? "inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-[14px] font-medium text-white hover:opacity-90"
              : "inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-[14px] font-medium text-ink hover:border-line-strong"
          }
        >
          {lenke.label}
        </a>
      ))}
    </div>
  );
}

/**
 * Kortversjonen som åpnes under raden i hyttekartet: fakta og veien videre.
 *
 * Avstanden står allerede i raden over, med stedet den er målt fra, og gjentas ikke her.
 * Forbeholdet om åpningstider står heller ikke her — det står én gang under lista og på
 * hyttesiden.
 */
export function HutSummary({ hut }: { hut: Hut }) {
  return (
    <div className="space-y-3">
      <Fakta rader={hutFacts(hut, false)} compact />
      <Lenker hut={hut} />
    </div>
  );
}

/** Hyttesiden: fakta, offisiell info og kilde, i den rekkefølgen. */
export function HutDetails({ hut }: { hut: Hut }) {
  const rader = hutFacts(hut, true);
  const harLenker = hutLinks(hut).length > 0;
  const oppdatert = formatDate(hut.sourceUpdatedAt);

  return (
    <div className="space-y-7">
      <section aria-labelledby="hytte-fakta">
        <h2 id="hytte-fakta" className={OVERSKRIFT}>
          Fakta
        </h2>
        <div className="mt-2.5">
          <Fakta rader={rader} compact={false} />
        </div>
        {hut.locked !== null && <p className="mt-2.5 text-[13px] leading-snug text-muted">{HUT_ACCESS_NOTE}</p>}
      </section>

      {harLenker && (
        <section aria-labelledby="hytte-info">
          <h2 id="hytte-info" className={OVERSKRIFT}>
            Offisiell info
          </h2>
          <div className="mt-2.5">
            <Lenker hut={hut} />
          </div>
          <p className="mt-2.5 text-[13px] leading-snug text-muted">
            Bestilling, priser og oppdatert informasjon finner du hos den som driver hytta.
          </p>
        </section>
      )}

      <section aria-labelledby="hytte-kilde">
        <h2 id="hytte-kilde" className={OVERSKRIFT}>
          Kilde
        </h2>
        <p className="mt-2.5 text-[13px] leading-snug text-muted">
          Kartverket, N50 Kartdata{oppdatert ? ` · oppdatert ${oppdatert}` : ""}.
          {hut.elevationM != null && " Høyden er terrenghøyden i kartpunktet, fra Kartverkets høydemodell."}
          {!harLenker && " Sjekk åpningstider, nøkkel og bestilling hos den som driver hytta."}
        </p>
      </section>
    </div>
  );
}
