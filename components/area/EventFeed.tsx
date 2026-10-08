"use client";

import { STATUS_FORBEHOLD } from "@/lib/plans/visning";
import Link from "next/link";
import { Suspense, use, type RefObject } from "react";
import type { AreaEventsResult } from "@/lib/events/queries";
import { eventCountLabel, eventEmptyParts } from "@/lib/events/summary";
import { Chevron } from "@/components/ui/Chevron";
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
const SEKSJON = "Planer og saker";
const Overskrift = () => <h3 className="type-h3 text-ink">{SEKSJON}</h3>;
/** Kilden har bare varselet. Hva som skjedde etterpå, står ikke der. */
export { STATUS_FORBEHOLD };
/** Hvor mange saker som vises når gruppen åpnes. Resten ligger bak «Se alle saker». */
const PREVIEW = 3;

export function EventFeed(props: EventFeedProps) {
  const { pending } = props;

  return (
    // Samme ramme som de andre seksjonene: overskrift, innhold, detaljer bak utvider.
    // Raden bærer overskriften selv, som gruppene ellers på siden.
    <SectionShell label={SEKSJON} hideLabel>
      {pending && (
        <p role="status" className="type-meta mb-3 flex items-center gap-2">
          <span className="block size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
          Oppdaterer …
        </p>
      )}

      <div className={`transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`} aria-busy={pending}>
        {/* Samme høyde som den ferdige gruppen, så siden ikke hopper når dataene kommer. */}
        <Suspense
          fallback={
            <>
              <Overskrift />
              <SectionSkeleton label="Henter plansaker …" />
            </>
          }
        >
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
            <Overskrift />
            <p className="type-support mt-0.5">Vi får ikke hentet plansaker akkurat nå.</p>
            <p className="type-meta mt-0.5">Kart og søk fungerer fortsatt. Prøv igjen litt senere.</p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 font-mono text-xs text-danger">
                Dev: {result.devReason}
              </p>
            )}
          </Notice>
        ) : result.dataUpdatedAt === null ? (
          <Notice>
            <Overskrift />
            <p className="type-support mt-0.5">Plandata er ikke hentet ennå.</p>
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
          // Sier nøyaktig hva som er kontrollert. «Ingen planer» ville vært feil: kilden har bare
          // varsler fra private forslagsstillere. Resten står i «Kilde og metode».
          // To linjer: hva som ikke ble funnet, og avgrensningene under. Ingen av dem er tatt bort.
          <div>
            <Overskrift />
            <p className="type-support mt-0.5 text-ink">{eventEmptyParts(radius).headline}</p>
            <p className="type-meta">{eventEmptyParts(radius).detail}</p>
            {radius < 3000 && (
              <>
                <Link
                  href={hrefForRadius(3000)}
                  replace
                  scroll={false}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(hrefForRadius(3000));
                  }}
                  className="link inline-flex min-h-11 items-center text-[15px]"
                >
                  Se innen {formatRadius(3000)} →
                </Link>
              </>
            )}
          </div>
        ) : (
          // Antallet først, sakene når man åpner — samme mønster som gruppene ellers på siden.
          <details
            className="disclosure"
            open={expanded ?? result.events.length <= PREVIEW}
            onToggle={(event) => onExpandedChange(event.currentTarget.open)}
          >
            <summary className="-mx-2 flex items-start gap-3 rounded-control px-2 py-1.5 hover:bg-sunken">
              <span className="min-w-0 flex-1">
                <Overskrift />
                <span className="type-support mt-0.5 block">
                  {eventCountLabel(result.events, radius)} · siste {MONTHS} måneder
                </span>
              </span>
              <Chevron className="mt-1.5" />
            </summary>

            <div className="pt-3">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                {/* Én gang for hele lista, ikke på hver sak. */}
                <p className="type-meta max-w-prose flex-1 basis-64">{STATUS_FORBEHOLD}</p>
                {result.events.length > 1 && (
                  <SortToggle sort={sort} hrefForSort={hrefForSort} onNavigate={onNavigate} />
                )}
              </div>

              <EventList
                events={result.events.slice(0, PREVIEW)}
                hrefForEvent={hrefForEvent}
                selectedId={selectedId}
                onSelect={onSelect}
                cardRefs={cardRefs}
              />

              {result.events.length > PREVIEW && (
                <details className="disclosure">
                  <summary className="link inline-flex min-h-11 items-center gap-1 text-[15px]">
                    Se alle saker ({result.events.length})
                    <Chevron className="size-3.5 text-accent" />
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
        <details className="disclosure mt-2">
          <summary className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
            Kilde og metode
            <Chevron className="size-3.5" />
          </summary>
          <div className="type-meta flex flex-col gap-1.5">
            <p>
              Kilde: Direktoratet for byggkvalitet, «Planlegging igangsatt» (NLOD 2.0). Sist hentet{" "}
              {formatDate(result.dataUpdatedAt)}.
            </p>
            <p>
              Kilden har varsler om planoppstart fra private forslagsstillere, fra mai 2024. Kommunale og statlige planer
              er ikke komplett dekket, og vedtatte planer og byggesaker er ikke med. At vi ikke finner noe, betyr derfor
              ikke at ingenting planlegges.
            </p>
            {result.events.length > 0 && (
              <p>
                Tiltakstypen er lest av sakens tittel og formål med faste regler. Formålet er sitert ordrett fra
                planinitiativet eller varselet; tall og mengder er utelatt og markert med […]. Sakene er sortert etter
                om stedet ligger i planområdet, avstand, type tiltak, planområdets størrelse og dato.
              </p>
            )}
          </div>
        </details>
      )}
    </>
  );
}

/** Rolig plassholder i samme form som den ferdige raden. */
export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-12 flex-col justify-center gap-2">
      <span className="type-meta">{label}</span>
      <span aria-hidden="true" className="h-2 w-40 animate-pulse rounded-full bg-line" />
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
    <ul className="mt-2 divide-y divide-line">
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
  return <div className="text-[15px] leading-relaxed">{children}</div>;
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
    // «distance» er relevansrekkefølgen: i planområdet og nærmest først (lib/plans/visning.ts).
    { value: "distance", label: "Mest relevant" },
    { value: "newest", label: "Nyeste" },
  ];
  return (
    <nav aria-label="Sortering" className="inline-flex shrink-0 rounded-control bg-sunken p-0.5">
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
            className={`flex h-9 items-center rounded-[0.625rem] px-3 text-sm font-medium ${
              selected ? "bg-surface text-ink shadow-[0_1px_2px_rgb(20_23_26/0.12)]" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
