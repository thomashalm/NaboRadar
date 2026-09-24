"use client";

import type { AreaFactsResult, FactCluster, OverviewItem, SectionOverview } from "@/lib/facts/queries";
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
  // En seksjon kan ha bare en utvidbar oversikt — f.eks. registreringer som ikke krever oppfølging.
  const hasContent = groups.length > 0;

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
              <div key={group.sectionId}>
                <h3 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">{group.label}</h3>
                {group.intro && <p className="mt-1 text-[13px] text-muted">{group.intro}</p>}
                {group.clusters.map((cluster) => (
                  <ClusterDetails key={cluster.id} cluster={cluster} />
                ))}
                {group.facts.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-3">
                    {group.facts.map((fact) => (
                      <li key={fact.id}>
                        <FactItem fact={fact} />
                      </li>
                    ))}
                  </ul>
                )}
                {group.overview && (
                  <>
                    {group.overview.noAttentionNote && (
                      <p className="mt-3 text-[15px] leading-relaxed text-muted">{group.overview.noAttentionNote}</p>
                    )}
                    <OverviewDetails overview={group.overview} />
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

/** Kompakte rader: navn, kort undertekst og avstand. Samme markup i grupper og oversikter. */
function PlaceRows({ items }: { items: OverviewItem[] }) {
  return (
    <ul className="mt-2 divide-y divide-line border-t border-line">
      {items.map((item) => (
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
            <span className="block text-[13px] text-muted">{item.subtitle}</span>
          </span>
          <span className={`shrink-0 text-sm ${item.contains ? "font-medium text-ink" : "text-muted"}`}>
            {item.distanceLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * En gruppe av relaterte stedstyper, f.eks. «Skoler og barnehager». Standardvisningen er
 * bare navn og antall; listene ligger bak utvideren, og hver undertype viser de nærmeste
 * få før resten. Slik kan mange like steder finnes i området uten å fylle siden.
 */
function ClusterDetails({ cluster }: { cluster: FactCluster }) {
  return (
    <details className="mt-3 rounded-2xl border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-3.5">
        <span className="text-[15px] font-medium text-ink">{cluster.label}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{cluster.summary}</span>
      </summary>

      <div className="px-5 pb-4">
        {cluster.facts.length > 0 && (
          <ul className="mt-1 flex flex-col gap-3">
            {cluster.facts.map((fact) => (
              <li key={fact.id}>
                <FactItem fact={fact} />
              </li>
            ))}
          </ul>
        )}

        {cluster.lists.map((list) => (
          <div key={list.id} className="mt-3">
            <h5 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">{list.label}</h5>
            <PlaceRows items={list.items.slice(0, list.previewCount)} />
            {list.toggleLabel && (
              <details className="mt-1">
                <summary className="inline-flex h-9 cursor-pointer items-center text-[15px] font-medium text-accent">
                  {list.toggleLabel}
                </summary>
                <PlaceRows items={list.items.slice(list.previewCount)} />
              </details>
            )}
          </div>
        ))}

        {cluster.caveat && <p className="mt-3 text-[13px] leading-relaxed text-muted">{cluster.caveat}</p>}
        {cluster.overview && <OverviewDetails overview={cluster.overview} />}
        {/* Oversikten oppgir sin egen kilde; da skal den ikke stå to ganger. */}
        {cluster.sourceName !== cluster.overview?.sourceName && (
          <p className="mt-2 text-[13px] text-muted">Kilde: {cluster.sourceName}</p>
        )}
      </div>
    </details>
  );
}

/**
 * Alt kilden har i området, bak en utvidbar visning. Samme komponent for alle seksjoner,
 * slik at en ny datatype ikke krever ny UI-logikk. Antallet står aldri i standardvisningen.
 */
function OverviewDetails({ overview }: { overview: SectionOverview }) {
  return (
    <details className="mt-3 rounded-2xl border border-line bg-surface px-5 py-4">
      <summary className="cursor-pointer text-[15px] font-medium text-ink">
        {overview.toggleLabel} ({overview.total})
      </summary>

      <p className="mt-3 text-[15px] leading-relaxed text-ink">{overview.headline}</p>
      {overview.details.map((detail) => (
        <p key={detail} className="mt-1 text-[15px] leading-relaxed text-muted">
          {detail}
        </p>
      ))}

      <PlaceRows items={overview.items} />

      {overview.caveat && <p className="mt-3 text-[13px] leading-relaxed text-muted">{overview.caveat}</p>}
      <p className="mt-2 text-[13px] text-muted">Kilde: {overview.sourceName}</p>
    </details>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-[15px]">{children}</div>;
}
