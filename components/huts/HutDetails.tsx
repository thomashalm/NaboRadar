import { formatDate } from "@/lib/format";
import type { Hut } from "@/lib/huts/queries";
import { HUT_OWNER_LABELS, HUT_TYPE_LABELS, formatHutDistance, hutDetailLines, hutLinks } from "@/lib/huts/wording";

/**
 * Det vi vet om én hytte, og veien videre til den som driver den.
 *
 * Bare felt med innhold vises. Det finnes ingen rad for pris, ledighet, sesong eller
 * sengeplasser: kildene våre har dem ikke, og NaboRadar gjør ingen bestilling — lenkene går
 * til den offisielle siden.
 */
export function HutDetails({ hut, compact = false }: { hut: Hut; compact?: boolean }) {
  const rader: [string, string][] = [];
  const type = HUT_TYPE_LABELS[hut.type];
  if (type) rader.push(["Type", type]);
  const eier = HUT_OWNER_LABELS[hut.ownerKind];
  if (eier) rader.push(["Eier", eier]);
  if (hut.managerName) rader.push(["Forvalter", hut.managerName]);
  for (const linje of hutDetailLines({ ...hut, managerName: null })) {
    rader.push([linje === "Låst" || linje === "Ulåst" ? "Dør" : "Bruk", linje]);
  }
  if (hut.municipalityName) rader.push(["Kommune", hut.municipalityName]);
  if (hut.distanceM != null) rader.push(["Avstand", formatHutDistance(hut.distanceM)]);

  const lenker = hutLinks(hut);
  const oppdatert = formatDate(hut.sourceUpdatedAt);

  return (
    <div>
      <dl className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 ${compact ? "text-[13px]" : "text-[15px]"}`}>
        {rader.map(([navn, verdi]) => (
          <div key={navn + verdi} className="contents">
            <dt className="text-muted">{navn}</dt>
            <dd className="text-ink">{verdi}</dd>
          </div>
        ))}
      </dl>

      {lenker.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
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
      )}

      <p className="mt-3 text-[13px] leading-snug text-muted">
        Kilde: Kartverket{oppdatert ? ` · oppdatert ${oppdatert}` : ""}.
        {lenker.length > 0
          ? " Bestilling og oppdatert informasjon finner du hos den som driver hytta."
          : " Sjekk åpningstider, nøkkel og bestilling hos den som driver hytta."}
      </p>
    </div>
  );
}
