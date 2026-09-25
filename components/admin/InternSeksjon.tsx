import type { AreaResearch, Tillit } from "@/lib/admin/area-research";
import { tillitFor } from "@/lib/admin/area-research";
import { formatRadius } from "@/lib/format";

/**
 * Intern research under det offentlige resultatet.
 *
 * Samme visuelle språk som resten av siden — samme kort, samme utvidere, samme avstandskolonne
 * — men tydelig merket. Poenget med å bruke samme språk er at en operatør skal kunne lese
 * begge deler i ett blikk; poenget med merkingen er at de to aldri skal forveksles.
 */

const TILLIT_TEKST: Record<Tillit, string> = {
  hoy: "HØY TILLIT",
  middels: "MIDDELS TILLIT",
  lav: "LAV TILLIT",
};

const TILLIT_STIL: Record<Tillit, string> = {
  hoy: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  middels: "bg-amber-50 text-amber-900 ring-amber-600/20",
  lav: "bg-danger-soft text-danger ring-danger/20",
};

const KATEGORI_NAVN: Record<string, string> = {
  grunnforhold: "Grunnforhold",
  stoy: "Støy",
  miljo: "Forurenset grunn",
  infrastruktur: "Infrastruktur",
  industri: "Industri og anlegg",
  oppvekst: "Skoler og barnehager",
  helse: "Sykehus",
  servering: "Servering",
  omsorg: "Omsorgstilbud",
  skolekrets: "Skolekrets",
  tilfluktsrom: "Tilfluktsrom",
};

function Merkelapp({ children, stil }: { children: React.ReactNode; stil?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] ring-1 ring-inset ${
        stil ?? "bg-ink/5 text-muted ring-ink/10"
      }`}
    >
      {children}
    </span>
  );
}

export function InternSeksjon({ research }: { research: AreaResearch | null }) {
  return (
    <section className="mt-14 border-t-2 border-dashed border-line-strong pt-8" aria-labelledby="intern">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="intern" className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
          Intern research
        </h2>
        <Merkelapp stil="bg-accent-soft text-accent ring-accent/20">INTERN</Merkelapp>
      </div>
      <p className="mt-1 text-[13px] text-muted">
        Vises bare for innloggede driftsbrukere. Ikke en del av det offentlige resultatet.
      </p>

      {research === null ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
          Fikk ikke hentet den interne oversikten akkurat nå.
        </p>
      ) : (
        <Datakvalitet research={research} />
      )}
    </section>
  );
}

/**
 * Datakvalitet for dette søkepunktet.
 *
 * Den eneste research-seksjonen som er bygget, fordi den er den eneste som kan bygges på data
 * vi faktisk har. De øvrige kategoriene mangler både kilde og modell — se håndboken.
 */
function Datakvalitet({ research }: { research: AreaResearch }) {
  const tillit = tillitFor(research.dekning.flatMap((d) => d.kilder));

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-medium text-ink">Datakvalitet i området</h3>
        <Merkelapp stil={TILLIT_STIL[tillit]}>{TILLIT_TEKST[tillit]}</Merkelapp>
        <Merkelapp>{research.dekning.length} kategorier med treff</Merkelapp>
      </div>

      <details className="mt-3 rounded-2xl border border-line bg-surface">
        <summary className="cursor-pointer px-5 py-3.5">
          <span className="text-[15px] font-medium text-ink">
            {research.dekning.length} med treff · {research.tomme.length} uten, innen{" "}
            {formatRadius(research.radiusM)}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">
            Tomt betyr ikke nødvendigvis at det ikke finnes noe — se kildenes tilstand
          </span>
        </summary>

        <div className="px-5 pb-4">
          <ul className="mt-2 divide-y divide-line border-t border-line">
            {research.dekning.map((d) => (
              <li key={d.category} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="text-[15px] text-ink">{KATEGORI_NAVN[d.category] ?? d.category}</span>
                <span className="shrink-0 text-sm text-muted">{d.antall}</span>
              </li>
            ))}
          </ul>

          {research.tomme.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Uten treff her</h4>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                {research.tomme.map((c) => KATEGORI_NAVN[c] ?? c).join(" · ")}
              </p>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
