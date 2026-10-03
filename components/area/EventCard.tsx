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
      className={`group relative cursor-pointer rounded-2xl border bg-surface px-5 py-4 transition-colors ${
        selected ? "border-plan shadow-float ring-1 ring-plan" : "border-line hover:border-line-strong"
      }`}
    >
      <span className="text-xs font-semibold tracking-[0.08em] text-plan uppercase">{tiltakLabel(event)}</span>
      {/* H4: kortet står under seksjonsoverskriften «Planer og saker» (H3). */}
      <h4 className="mt-1.5 text-[17px] leading-snug font-semibold tracking-tight text-ink">
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
        <p className="mt-1 text-[15px] leading-snug text-ink [overflow-wrap:anywhere]">
          <span className="text-muted">Formål: </span>«{kortFormaal(formaal)}»
        </p>
      )}
      <p className="mt-1 text-[15px] text-muted">
        {[formatDistance(event.distanceM), date ? `${EVENT_CARD_DATE_LABELS[event.type]} ${date}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
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
