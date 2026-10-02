import { formatDate } from "@/lib/format";
import type { Hut } from "@/lib/huts/queries";
import { HUT_ACCESS_NOTE, hutFacts, hutNextStep, type HutLink } from "@/lib/huts/wording";

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
function Lenker({ lenker }: { lenker: HutLink[] }) {
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
 * Avstanden står allerede i raden over, med stedet den er målt fra, og gjentas ikke her. Må
 * hytta bestilles og vi ikke har en lenke, står det — heller enn at raden tier om neste steg.
 */
export function HutSummary({ hut }: { hut: Hut }) {
  const steg = hutNextStep(hut);
  return (
    <div className="space-y-3">
      <Fakta rader={hutFacts(hut, false)} compact />
      <Lenker lenker={steg.links} />
      {steg.links.length === 0 && steg.note && <p className="text-[13px] leading-snug text-muted">{steg.note}</p>}
    </div>
  );
}

/**
 * Hyttesiden: fakta, offisiell info og kilde, i den rekkefølgen.
 *
 * «Offisiell info» er neste steg, i fire tilstander (`hutNextStep`): bestillingslenke,
 * infoside, bare forvalter, eller ingenting kjent. Seksjonen vises ikke når den ikke har noe å
 * si — en ulåst hytte uten lenke får ingen tom boks og ingen oppfordring til å kontakte noen
 * vi ikke kan navngi.
 */
export function HutDetails({ hut }: { hut: Hut }) {
  const rader = hutFacts(hut, true);
  const steg = hutNextStep(hut);
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

      {(steg.links.length > 0 || steg.note) && (
        <section aria-labelledby="hytte-info">
          <h2 id="hytte-info" className={OVERSKRIFT}>
            Offisiell info
          </h2>
          <div className="mt-2.5 space-y-2.5">
            <Lenker lenker={steg.links} />
            {steg.kind === "manager_only" && steg.managerName && (
              <Fakta rader={[["Forvalter", steg.managerName]]} compact={false} />
            )}
            {steg.note && <p className="text-[14px] leading-snug text-ink">{steg.note}</p>}
          </div>
        </section>
      )}

      <section aria-labelledby="hytte-kilde">
        <h2 id="hytte-kilde" className={OVERSKRIFT}>
          Kilde
        </h2>
        <p className="mt-2.5 text-[13px] leading-snug text-muted">
          Kartverket, N50 Kartdata{oppdatert ? ` · oppdatert ${oppdatert}` : ""}.
          {hut.elevationM != null && " Høyden er terrenghøyden i kartpunktet, fra Kartverkets høydemodell."}
        </p>
      </section>
    </div>
  );
}
