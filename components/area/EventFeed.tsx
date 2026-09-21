"use client";

import Link from "next/link";
import type { RefObject } from "react";
import type { AreaEventsResult } from "@/lib/events/queries";
import { formatDate, formatRadius } from "@/lib/format";
import { DEFAULT_ANNOUNCED_WITHIN_MONTHS } from "@/lib/geo/constants";
import type { AreaEvent, AreaSort } from "@/types/event";
import { EventCard } from "./EventCard";

interface EventFeedProps {
  result: AreaEventsResult;
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
}

const MONTHS = DEFAULT_ANNOUNCED_WITHIN_MONTHS;

function countLabel(n: number) {
  if (n === 0) return "Ingen saker i området";
  return n === 1 ? "1 sak i området" : `${n} saker i området`;
}

export function EventFeed(props: EventFeedProps) {
  const { result, radius, sort, pending, selectedId, onSelect, hrefForEvent, hrefForSort, hrefForRadius, onNavigate, cardRefs } = props;

  return (
    <section aria-labelledby="events-heading" aria-busy={pending} className="relative">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h2 id="events-heading" className="text-xl font-semibold tracking-tight">
            {result.status === "ok" ? countLabel(result.events.length) : "Saker i området"}
          </h2>
          <p className="mt-0.5 text-sm text-muted">Planoppstart varslet siste {MONTHS} måneder</p>
        </div>
        {result.status === "ok" && result.events.length > 1 && (
          <SortToggle sort={sort} hrefForSort={hrefForSort} onNavigate={onNavigate} />
        )}
      </div>

      {pending && (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted">
          <span className="block size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
          Oppdaterer …
        </p>
      )}

      <div className={`mt-5 transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`}>
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
          <Notice>
            <p className="font-medium text-ink">
              Ingen planoppstarter funnet i dette området de siste {MONTHS} månedene.
            </p>
            {radius < 3000 && (
              <Link
                href={hrefForRadius(3000)}
                replace
                scroll={false}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(hrefForRadius(3000));
                }}
                className="mt-3 inline-flex h-10 items-center rounded-full bg-ink px-4 text-[15px] font-medium text-white hover:bg-ink/85"
              >
                Prøv {formatRadius(3000)}
              </Link>
            )}
          </Notice>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.events.map((event) => (
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
        )}
      </div>

      {result.status === "ok" && result.dataUpdatedAt && (
        <p className="mt-6 text-[13px] leading-relaxed text-muted">
          Kilde: Direktoratet for byggkvalitet (NLOD 2.0). Sist hentet {formatDate(result.dataUpdatedAt)}. Kilden
          oppgir ikke om planarbeidet fortsatt pågår — datoen viser når oppstart ble varslet.
        </p>
      )}
    </section>
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
