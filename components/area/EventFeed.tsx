"use client";

import Link from "next/link";
import { Suspense, use, type RefObject } from "react";
import type { AreaEventsResult } from "@/lib/events/queries";
import { formatDate, formatRadius } from "@/lib/format";
import { SectionShell } from "./SectionShell";
import { DEFAULT_ANNOUNCED_WITHIN_MONTHS } from "@/lib/geo/constants";
import type { AreaEvent, AreaSort } from "@/types/event";
import { EventCard } from "./EventCard";

interface EventFeedProps {
  /** Kilden kommer som et løfte, slik at overskriften kan vises før dataene er klare. */
  events: Promise<AreaEventsResult>;
  radius: number;
  sort: AreaSort;
  pending: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hrefForEvent: (event: AreaEvent) => string;
  hrefForSort: (sort: AreaSort) => string;
  hrefForRadius: (radius: number) => string;
  onNavigate: (href: string) => void;
  cardRefs: RefObject<Map<string, HTMLElement>>;
  /**
   * Om saksgruppen er åpen. Tilstanden ligger hos kalleren, fordi sortering navigerer og
   * bygger denne delen av treet på nytt — ellers lukker gruppen seg når man bytter sortering.
   * null betyr «ikke rørt ennå»; da åpner gruppen seg selv når det er få saker.
   */
  expanded: boolean | null;
  onExpandedChange: (expanded: boolean) => void;
}

const MONTHS = DEFAULT_ANNOUNCED_WITHIN_MONTHS;
/** Hvor mange saker som vises når gruppen åpnes. Resten ligger bak «Se alle saker». */
const PREVIEW = 3;

function countLabel(n: number, radius: number) {
  if (n === 0) return "Ingen saker i området";
  return `${n} ${n === 1 ? "sak" : "saker"} innen ${formatRadius(radius)}`;
}

export function EventFeed(props: EventFeedProps) {
  const { pending } = props;

  return (
    // Samme ramme som de andre seksjonene: overskrift, innhold, detaljer bak utvider.
    <SectionShell label="Planer og saker" id="events-heading">
      {pending && (
        <p role="status" className="mb-3 flex items-center gap-2 text-sm text-muted">
          <span className="block size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
          Oppdaterer …
        </p>
      )}

      <div className={`transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`} aria-busy={pending}>
        {/* Samme høyde som den ferdige gruppen, så siden ikke hopper når dataene kommer. */}
        <Suspense fallback={<SectionSkeleton label="Henter plansaker …" />}>
          <EventFeedBody {...props} />
        </Suspense>
      </div>
    </SectionShell>
  );
}

function EventFeedBody(props: EventFeedProps) {
  const { events, radius, sort, selectedId, onSelect, hrefForEvent, hrefForSort, hrefForRadius, onNavigate, cardRefs, expanded, onExpandedChange } = props;
  const result = use(events);

  return (
    <>
        {result.status === "unavailable" ? (
          <Notice>
            <p className="font-medium text-ink">Vi får ikke hentet plansaker akkurat nå.</p>
            <p className="mt-1 text-muted">Kart og søk fungerer fortsatt. Prøv igjen litt senere.</p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 font-mono text-xs text-danger">
                Dev: {result.devReason}
              </p>
            )}
          </Notice>
        ) : result.dataUpdatedAt === null ? (
          <Notice>
            <p className="font-medium text-ink">Plandata er ikke hentet ennå.</p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-1 text-muted">
                Kjør <code className="font-mono text-sm">npm run sync:dibk</code> eller «Sync now» på{" "}
                <Link href="/dev" className="text-accent underline">/dev</Link>.
              </p>
            )}
          </Notice>
        ) : result.events.length === 0 ? (
          // Ingenting å vise er ikke et funn, og skal ikke ta plass som ett. Én linje, med
          // veien videre på samme linje.
          <p className="text-[15px] leading-relaxed text-muted">
            Ingen varslede planoppstarter innen {formatRadius(radius)} siste {MONTHS} måneder
            {radius < 3000 && (
              <>
                {" · "}
                <Link
                  href={hrefForRadius(3000)}
                  replace
                  scroll={false}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(hrefForRadius(3000));
                  }}
                  className="font-medium text-accent hover:underline"
                >
                  Se {formatRadius(3000)}
                </Link>
              </>
            )}
          </p>
        ) : (
          // Kompakt som gruppene i «Nærområdet»: antallet først, sakene når man åpner.
          <details
            className="rounded-2xl border border-line bg-surface"
            open={expanded ?? result.events.length <= PREVIEW}
            onToggle={(event) => onExpandedChange(event.currentTarget.open)}
          >
            <summary className="cursor-pointer px-5 py-3.5">
              <span className="text-[15px] font-medium text-ink">{countLabel(result.events.length, radius)}</span>
              <span className="mt-0.5 block text-[13px] text-muted">Planoppstart varslet siste {MONTHS} måneder</span>
            </summary>

            <div className="px-5 pb-4">
              {result.events.length > 1 && (
                <div className="mb-3 flex justify-end">
                  <SortToggle sort={sort} hrefForSort={hrefForSort} onNavigate={onNavigate} />
                </div>
              )}

              <EventList
                events={result.events.slice(0, PREVIEW)}
                hrefForEvent={hrefForEvent}
                selectedId={selectedId}
                onSelect={onSelect}
                cardRefs={cardRefs}
              />

              {result.events.length > PREVIEW && (
                <details className="mt-3">
                  <summary className="inline-flex h-9 cursor-pointer items-center text-[15px] font-medium text-accent">
                    Se alle saker ({result.events.length})
                  </summary>
                  <EventList
                    events={result.events.slice(PREVIEW)}
                    hrefForEvent={hrefForEvent}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    cardRefs={cardRefs}
                  />
                </details>
              )}
            </div>
          </details>
        )}

      {/*
        Kilde og metode ligger bak en utvider, ikke i hovedflyten.
        
        Kildelinjen sto tidligere rett under tomtilstanden, slik at «ingenting å vise» ble
        fulgt av to linjer teknisk tekst — mer plass til provenance enn til svaret. Forbeholdet
        om at kilden ikke sier om planarbeidet pågår gir dessuten bare mening når det finnes en
        sak å ta forbehold om.
      */}
      {result.status === "ok" && result.dataUpdatedAt && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-medium text-muted hover:text-ink">
            Kilde og metode
          </summary>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Kilde: Direktoratet for byggkvalitet (NLOD 2.0). Sist hentet {formatDate(result.dataUpdatedAt)}.
            {result.events.length > 0 &&
              " Kilden oppgir ikke om planarbeidet fortsatt pågår — datoen viser når oppstart ble varslet."}
          </p>
        </details>
      )}
    </>
  );
}

/** Rolig plassholder i samme form som den ferdige gruppen. */
export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[4.5rem] flex-col justify-center rounded-2xl border border-line bg-surface px-5 py-3.5"
    >
      <span className="text-[15px] font-medium text-muted">{label}</span>
      <span aria-hidden="true" className="mt-2 h-2 w-32 animate-pulse rounded-full bg-line" />
    </div>
  );
}

function EventList({
  events,
  hrefForEvent,
  selectedId,
  onSelect,
  cardRefs,
}: {
  events: AreaEvent[];
  hrefForEvent: (event: AreaEvent) => string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  cardRefs: RefObject<Map<string, HTMLElement>>;
}) {
  return (
    <ul className="mt-3 flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard
            ref={(el) => {
              if (el) cardRefs.current.set(event.id, el);
              else cardRefs.current.delete(event.id);
            }}
            event={event}
            href={hrefForEvent(event)}
            selected={event.id === selectedId}
            onSelect={() => onSelect(event.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-[15px]">{children}</div>;
}

function SortToggle({
  sort,
  hrefForSort,
  onNavigate,
}: {
  sort: AreaSort;
  hrefForSort: (sort: AreaSort) => string;
  onNavigate: (href: string) => void;
}) {
  const options: { value: AreaSort; label: string }[] = [
    { value: "distance", label: "Nærmest" },
    { value: "newest", label: "Nyeste" },
  ];
  return (
    <nav aria-label="Sortering" className="inline-flex rounded-full bg-canvas p-0.5 ring-1 ring-line">
      {options.map((option) => {
        const selected = option.value === sort;
        const href = hrefForSort(option.value);
        return (
          <Link
            key={option.value}
            href={href}
            replace
            scroll={false}
            aria-current={selected ? "true" : undefined}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              if (!selected) onNavigate(href);
            }}
            className={`flex h-9 items-center rounded-full px-3.5 text-sm font-medium ${
              selected ? "bg-surface text-ink shadow-float" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
