import type { Kildedekning as Dekning, Tillit } from "@/lib/admin/area-research";

/**
 * Kildestatus og datadekning for områdekildene.
 *
 * Lå tidligere i adressevisningen som «Datakvalitet i området». Den hører hjemme her: den sier
 * noe om kildene våre, ikke om et bestemt sted, og den er det man trenger når man lurer på om
 * et tomt søkeresultat betyr «ingenting der» eller «kilden er utdatert».
 */

const TEKST: Record<Tillit, string> = { hoy: "HØY TILLIT", middels: "MIDDELS TILLIT", lav: "LAV TILLIT" };
const STIL: Record<Tillit, string> = {
  hoy: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  middels: "bg-amber-50 text-amber-900 ring-amber-600/20",
  lav: "bg-danger-soft text-danger ring-danger/20",
};

function alder(timer: number | null): string {
  if (timer === null) return "aldri hentet";
  if (timer < 1) return "under en time siden";
  if (timer < 48) return `${Math.round(timer)} timer siden`;
  return `${Math.round(timer / 24)} døgn siden`;
}

export function Kildedekning({ dekning }: { dekning: Dekning | null }) {
  return (
    <details className="mt-8 rounded-2xl border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-3.5">
        <span className="text-[15px] font-medium text-ink">Kildestatus og datadekning</span>
        {dekning && (
          <span
            className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] ring-1 ring-inset ${STIL[dekning.tillit]}`}
          >
            {TEKST[dekning.tillit]}
          </span>
        )}
        <span className="mt-0.5 block text-[13px] text-muted">
          Er et tomt søkeresultat sant, eller er kilden utdatert?
        </span>
      </summary>

      <div className="px-5 pb-4">
        {dekning === null ? (
          <p className="text-[15px] text-muted">Fikk ikke hentet kildestatus akkurat nå.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {dekning.kilder.map((k) => (
              <li key={k.providerId} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="text-[15px] text-ink">{k.navn}</span>
                  <span className="block text-[13px] text-muted">
                    {k.label} · {alder(k.alderTimer)}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted">
                  {k.objekter.toLocaleString("nb-NO")} objekter
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
