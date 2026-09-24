"use client";

import type { AreaFactsResult, ContaminatedOverview } from "@/lib/facts/queries";
import { formatRadius } from "@/lib/format";
import type { AreaFact } from "@/types/area-feature";

interface AreaFactsProps {
  result: AreaFactsResult;
  radius: number;
  pending: boolean;
}

/**
 * «Hva bør du vite om området?» — registrerte forhold fra offentlige kilder.
 * All tekst kommer fra lib/facts/wording.ts. Ingen score, ingen vurdering.
 */
export function AreaFacts({ result, radius, pending }: AreaFactsProps) {
  const groups = result.status === "ok" ? result.groups : [];
  const contaminated = result.status === "ok" ? result.contaminated : null;
  const total = groups.reduce((sum, group) => sum + group.facts.length, 0);
  // Registreringer som ikke krever oppfølging gir ingen kort, men skal fortsatt være tilgjengelige.
  const hasContent = total > 0 || contaminated !== null;

  return (
    <section aria-labelledby="facts-heading" aria-busy={pending} className="mt-12">
      <h2 id="facts-heading" className="text-xl font-semibold tracking-tight">
        Hva bør du vite om området?
      </h2>
      <p className="mt-0.5 text-sm text-muted">
        Registrerte forhold innen {formatRadius(radius)}, fra offentlige kilder.
      </p>

      <div className={`mt-5 transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`}>
        {result.status === "unavailable" ? (
          <Notice>
            <p className="font-medium text-ink">Vi får ikke hentet områdedata akkurat nå.</p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 font-mono text-xs text-danger">Dev: {result.devReason}</p>
            )}
          </Notice>
        ) : !hasContent ? (
          <Notice>
            <p className="font-medium text-ink">Ingen registrerte forhold i kildene våre innen {formatRadius(radius)}.</p>
            <p className="mt-1 text-muted">
              Vi viser støysoner, kvikkleire, forurenset grunn, kraftanlegg og anlegg med utslippstillatelse. Flere
              kilder kommer.
            </p>
          </Notice>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">{group.label}</h3>
                {group.facts.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-3">
                    {group.facts.map((fact) => (
                      <li key={fact.id}>
                        <FactItem fact={fact} />
                      </li>
                    ))}
                  </ul>
                )}
                {group.category === "miljo" && contaminated && (
                  <>
                    {contaminated.noAttentionNote && (
                      <p className="mt-3 text-[15px] leading-relaxed text-muted">{contaminated.noAttentionNote}</p>
                    )}
                    <AllContaminated overview={contaminated} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {result.status === "ok" && result.unavailableSources.length > 0 && (
          <p className="mt-5 text-[13px] text-muted">
            Disse kildene svarte ikke akkurat nå: {result.unavailableSources.join(", ")}. Resten av oversikten er
            fullstendig.
          </p>
        )}

        {result.status === "ok" && result.sources.length > 0 && (
          <p className="mt-6 text-[13px] leading-relaxed text-muted">
            Kilder:{" "}
            {result.sources.map((source, index) => (
              <span key={source.name}>
                {index > 0 && " · "}
                {source.name} ({source.owner}, {source.licenseName})
              </span>
            ))}
            . NaboRadar vurderer ikke forholdene, og viser bare det kildene selv oppgir.
          </p>
        )}
      </div>
    </section>
  );
}

function FactItem({ fact }: { fact: AreaFact }) {
  return (
    <article className="rounded-2xl border border-line bg-surface px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[15px] leading-snug font-medium text-balance text-ink [overflow-wrap:anywhere]">{fact.headline}</h4>
        {fact.distanceLabel && (
          <span className={`shrink-0 text-sm ${fact.contains ? "font-medium text-ink" : "text-muted"}`}>
            {fact.distanceLabel}
          </span>
        )}
      </div>

      {fact.details.map((detail) => (
        <p key={detail} className="mt-1 text-[15px] leading-relaxed text-muted">
          {detail}
        </p>
      ))}

      {fact.caveat && <p className="mt-2 text-[13px] leading-relaxed text-muted">{fact.caveat}</p>}

      {fact.technical.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] font-medium text-muted hover:text-ink">Detaljer</summary>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{fact.technical.join(" · ")}</p>
        </details>
      )}

      <p className="mt-2 text-[13px] text-muted">
        Kilde: {fact.sourceName}
        {fact.sourceDateLabel ? ` · ${fact.sourceDateLabel}` : ""}
      </p>

      {fact.link && (
        <a
          href={fact.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex h-9 items-center text-[15px] font-medium text-accent hover:underline"
        >
          {fact.link.label} ↗
        </a>
      )}
    </article>
  );
}

/**
 * Alle registreringer med forurenset grunn i området, bak en utvidbar visning.
 * Antallet alene er misvisende i byer, så det står aldri i standardvisningen.
 */
function AllContaminated({ overview }: { overview: ContaminatedOverview }) {
  return (
    <details className="mt-3 rounded-2xl border border-line bg-surface px-5 py-4">
      <summary className="cursor-pointer text-[15px] font-medium text-ink">
        Se alle registreringer i området ({overview.total})
      </summary>

      <p className="mt-3 text-[15px] leading-relaxed text-ink">{overview.headline}</p>
      {overview.details.map((detail) => (
        <p key={detail} className="mt-1 text-[15px] leading-relaxed text-muted">
          {detail}
        </p>
      ))}

      <ul className="mt-3 divide-y divide-line border-t border-line">
        {overview.items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="min-w-0">
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[15px] text-accent hover:underline [overflow-wrap:anywhere]"
                >
                  {item.title} ↗
                </a>
              ) : (
                <span className="text-[15px] text-ink [overflow-wrap:anywhere]">{item.title}</span>
              )}
              <span className="block text-[13px] text-muted">{item.gradeLabel}</span>
            </span>
            <span className={`shrink-0 text-sm ${item.contains ? "font-medium text-ink" : "text-muted"}`}>
              {item.distanceLabel}
            </span>
          </li>
        ))}
      </ul>

      {overview.caveat && <p className="mt-3 text-[13px] leading-relaxed text-muted">{overview.caveat}</p>}
      <p className="mt-2 text-[13px] text-muted">Kilde: {overview.sourceName}</p>
    </details>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-[15px]">{children}</div>;
}
