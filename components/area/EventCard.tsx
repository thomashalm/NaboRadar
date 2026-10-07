import Link from "next/link";
import { forwardRef } from "react";
import { EVENT_CARD_DATE_LABELS } from "@/lib/events/labels";
import { formatDate, formatDistance } from "@/lib/format";
import { kortFormaal } from "@/lib/plans/formaal";
import { formaalFor, tiltakLabel } from "@/lib/plans/visning";
import type { AreaEvent } from "@/types/event";

interface EventCardProps {
  event: AreaEvent;
  href: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Ett kort per plansak: hva slags tiltak, tittelen, formålet slik dokumentene sier det, og
 * avstand og dato på én linje.
 *
 * Tiltakstypen og formålet er trukket ut under synk med faste regler (lib/plans). Formålet er et
 * sitat. Finnes det ikke, står tittelen alene: vi skriver ikke en erstatning. Tall fra fri tekst
 * vises ikke. Plantype, planområdets størrelse og dokumentene ligger på sakssiden.
 */
export const EventCard = forwardRef<HTMLElement, EventCardProps>(function EventCard(
  { event, href, selected, onSelect },
  ref,
) {
  const date = formatDate(event.announcedAt);
  const formaal = formaalFor(event);
  return (
    <article
      ref={ref}
      onClick={onSelect}
      className={`relative -mx-2 cursor-pointer scroll-mt-24 rounded-control px-2 py-4 transition-colors ${
        selected ? "bg-plan-soft" : "hover:bg-sunken"
      }`}
    >
      {/* Tiltakstypen og avstanden på én linje. Prikken er samme farge som planområdet i kartet. */}
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-muted">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-plan" />
          {tiltakLabel(event)}
        </span>
        <span className="shrink-0 text-subtle tabular-nums">{formatDistance(event.distanceM)}</span>
      </p>
      {/* H4: saken står under seksjonsoverskriften «Planer og saker» (H3). */}
      <h4 className="mt-1 text-[17px] leading-snug font-semibold tracking-[-0.012em] text-ink">
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
      </h4>
      {formaal && (
        // Ordrett fra saksdokumentet. Anførselstegnene sier at dette er kildens ord, ikke våre.
        <p className="type-support mt-1 [overflow-wrap:anywhere]">
          Formål: <span className="text-ink">«{kortFormaal(formaal)}»</span>
        </p>
      )}
      <p className="type-meta mt-1.5 flex flex-wrap items-center gap-x-2">
        {date && (
          <span>
            {EVENT_CARD_DATE_LABELS[event.type]} {date}
          </span>
        )}
        {event.earlier && event.earlier.count > 0 && (
          // Samme plan er varslet flere ganger. Vi viser det nyeste varselet og sier fra om resten.
          <span>
            {date ? "· " : ""}
            {event.earlier.count === 1 ? "Varslet én gang før" : `Varslet ${event.earlier.count} ganger før`}
            {formatDate(event.earlier.firstAnnouncedAt)
              ? `, første gang ${formatDate(event.earlier.firstAnnouncedAt)}`
              : ""}
          </span>
        )}
      </p>

      <Link href={href} onClick={(e) => e.stopPropagation()} className="link mt-1 inline-flex min-h-9 items-center text-[15px]">
        Se saken
        <span aria-hidden="true" className="ml-1">
          →
        </span>
      </Link>
    </article>
  );
});
