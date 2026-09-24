import Link from "next/link";
import { forwardRef } from "react";
import { EVENT_DATE_LABELS, EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { formatArea, formatDate, formatDistance } from "@/lib/format";
import type { AreaEvent } from "@/types/event";

interface EventCardProps {
  event: AreaEvent;
  href: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Viser kun det kilden faktisk sier: navn, type, dato, plantype — pluss avstand og
 * areal vi har beregnet selv (merket som beregnet). Ingen tolkning av hva som skal bygges.
 */
export const EventCard = forwardRef<HTMLElement, EventCardProps>(function EventCard(
  { event, href, selected, onSelect },
  ref,
) {
  const date = formatDate(event.announcedAt);
  const plantype = event.attributes.plantype;
  return (
    <article
      ref={ref}
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-2xl border bg-surface px-5 py-4 transition-colors ${
        selected ? "border-plan shadow-float ring-1 ring-plan" : "border-line hover:border-line-strong"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold tracking-[0.08em] text-plan uppercase">
          {EVENT_TYPE_LABELS[event.type]}
        </span>
        <span className="shrink-0 text-sm text-muted">{formatDistance(event.distanceM)}</span>
      </div>
      <h3 className="mt-1.5 text-[17px] leading-snug font-semibold tracking-tight text-ink">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          aria-pressed={selected}
          className="text-left [overflow-wrap:anywhere] focus-visible:outline-offset-4"
        >
          {event.title}
        </button>
      </h3>
      {date && (
        <p className="mt-1 text-[15px] text-muted">
          {EVENT_DATE_LABELS[event.type]} {date}
        </p>
      )}
      {(plantype || event.computedAreaM2) && (
        <p className="mt-0.5 text-[15px] text-muted">
          {[plantype, event.computedAreaM2 ? `Beregnet planområde: ${formatArea(event.computedAreaM2)}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {event.earlier && event.earlier.count > 0 && (
        // Samme plan er varslet flere ganger. Vi viser det nyeste varselet og sier fra om resten.
        <p className="mt-1 text-[13px] text-muted">
          {event.earlier.count === 1 ? "Varslet én gang før" : `Varslet ${event.earlier.count} ganger før`}
          {formatDate(event.earlier.firstAnnouncedAt) ? `, første gang ${formatDate(event.earlier.firstAnnouncedAt)}` : ""}
        </p>
      )}

      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="mt-3 inline-flex h-9 items-center rounded-full text-[15px] font-medium text-accent hover:underline"
      >
        Se saken
        <span aria-hidden="true" className="ml-1">
          →
        </span>
      </Link>
    </article>
  );
});
