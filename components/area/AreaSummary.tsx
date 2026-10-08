"use client";

import type { SummaryItem } from "@/lib/area-summary";
import { Chevron } from "@/components/ui/Chevron";

/**
 * «Området i korte trekk»: én rad per tema, rett under adressen.
 *
 * Linjene er de samme som står på seksjonene lenger ned (lib/area-summary.ts). Hele raden er en
 * lenke: den ruller til seksjonen, åpner den og flytter fokus dit.
 *
 * Ikonet sier hvilket tema raden gjelder — ikke om funnet er bra eller dårlig. Alle ikonene har
 * samme farge. Ingen haker, ingen varseltrekanter, ingen score.
 */
export function AreaSummary({ items }: { items: readonly SummaryItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="korte-trekk" className="mt-7">
      <h2 id="korte-trekk" className="type-h2 text-ink">
        Området i korte trekk
      </h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <li key={item.id}>
            {item.text === null ? (
              <div role="status" className="flex min-h-16 items-center gap-3.5 py-2.5">
                <TemaIkon id={item.id} dempet />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-subtle">{item.label}</p>
                  <span className="sr-only">Henter {item.label.toLowerCase()} …</span>
                  <span aria-hidden="true" className="mt-2 block h-2 w-44 max-w-full animate-pulse rounded-full bg-line" />
                </div>
              </div>
            ) : (
              <a
                href={item.href}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  if (goToSection(item.href.slice(1))) event.preventDefault();
                }}
                className="group -mx-2 flex min-h-16 items-center gap-3.5 rounded-control px-2 py-2.5 hover:bg-accent-tint focus-visible:bg-accent-tint"
              >
                <TemaIkon id={item.id} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-subtle">{item.label}</span>
                  <span className="block text-[15px] leading-snug font-medium text-ink [overflow-wrap:anywhere]">
                    {item.text}
                  </span>
                  {item.detail && <span className="type-meta block">{item.detail}</span>}
                </span>
                <Chevron className="rotate-90 group-hover:text-accent" />
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="type-meta mt-2.5">Hentet fra seksjonene under. NaboRadar vurderer ikke området.</p>
    </section>
  );
}

/**
 * Ruller til en seksjon, åpner den og gir den fokus.
 *
 * Gjort for hånd i stedet for å overlate det til nettleserens ankerhopp: seksjonene strømmer inn
 * etter at siden er lastet, topplinjen er fast, og et hopp alene åpner ikke utvideren brukeren
 * kom for å lese. Finnes ikke målet ennå, får lenken oppføre seg som en vanlig lenke.
 */
export function goToSection(id: string, doc: Document = document): boolean {
  const target = doc.getElementById(id);
  if (!target) return false;
  target.querySelector("details")?.setAttribute("open", "");
  const rolig = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "start", behavior: rolig ? "auto" : "smooth" });
  // Fokus uten ny rulling: tastaturbrukere fortsetter fra seksjonen, ikke fra toppen.
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (typeof history !== "undefined") history.replaceState(history.state, "", `#${id}`);
  return true;
}

const IKONER: Record<string, React.ReactNode> = {
  stoy: (
    <>
      <path d="M4 9.5v5h3l4 3.5v-12L7 9.5H4Z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" />
    </>
  ),
  grunnforhold: (
    <>
      <path d="m3 18 6-10 3.5 5.5L15 10l6 8H3Z" />
    </>
  ),
  saker: (
    <>
      <path d="M6 3.5h8l4 4V20.5H6v-17Z" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  skoler: (
    <>
      <path d="m2.5 9.5 9.5-5 9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 12v4.5c1.5 1.3 3.4 2 5.5 2s4-.7 5.5-2V12" />
    </>
  ),
  infrastruktur: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />,
};

export function TemaIkon({ id, dempet = false }: { id: string; dempet?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-control ${
        dempet ? "bg-sunken text-subtle" : "bg-accent-soft text-accent"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        {IKONER[id] ?? <circle cx="12" cy="12" r="3" />}
      </svg>
    </span>
  );
}
