"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import { buildAreaHref, buildEventHref } from "@/lib/area-params";
import { EVENT_DATE_LABELS } from "@/lib/events/labels";
import type { AreaEventsResult } from "@/lib/events/queries";
import type { AreaFactsResult } from "@/lib/facts/queries";
import { formatDate, formatDistance, formatRadius } from "@/lib/format";
import { radiusBounds } from "@/lib/geo/radius";
import type { MapTileConfig } from "@/lib/map/config";
import { planAreasLayer } from "@/lib/map/layers/plan-areas";
import { radiusLayer } from "@/lib/map/layers/radius";
import { bindLayer } from "@/lib/map/layers/types";
import type { AreaEvent, AreaSort } from "@/types/event";
import { AreaFacts } from "./AreaFacts";
import { ChangeLocation } from "./ChangeLocation";
import { EventFeed } from "./EventFeed";
import { RadiusPicker } from "./RadiusPicker";

interface AreaExplorerProps {
  lat: number;
  lng: number;
  radius: number;
  /** Visningsnavn (fra URL eller «Valgt punkt»). */
  label: string;
  /** Label slik den står i URL-en (kan mangle). */
  urlLabel?: string;
  sort: AreaSort;
  result: AreaEventsResult;
  facts: AreaFactsResult;
  tiles: MapTileConfig;
}

const NO_EVENTS: AreaEvent[] = [];

/**
 * Resultatsiden: kart og feed deler valgt sak. Radius/sortering/sted endres via URL i en
 * transition — kartet beholdes, og feeden viser lastetilstand til nye data er klare.
 */
export function AreaExplorer({ lat, lng, radius, label, urlLabel, sort, result, facts, tiles }: AreaExplorerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<{ id: string; from: "map" | "list" } | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const events = result.status === "ok" ? result.events : NO_EVENTS;
  // Valget gjelder bare så lenge saken finnes i gjeldende resultat.
  const selectedId = selection && events.some((e) => e.id === selection.id) ? selection.id : null;

  const context = useMemo(() => ({ lat, lng, radius, label: urlLabel, sort }), [lat, lng, radius, urlLabel, sort]);
  const navigate = useCallback(
    (href: string) => startTransition(() => router.replace(href, { scroll: false })),
    [router],
  );
  const navigateToLocation = useCallback((href: string) => startTransition(() => router.push(href)), [router]);

  const layers = useMemo(
    () => [bindLayer(radiusLayer, { lat, lng, radiusM: radius }), bindLayer(planAreasLayer, events)],
    [lat, lng, radius, events],
  );

  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const event = events.find((e) => e.id === id);
      if (!event) return null;
      const date = formatDate(event.announcedAt);
      return {
        lngLat: event.centroid.coordinates as [number, number],
        title: event.title,
        lines: [formatDistance(event.distanceM), date ? `${EVENT_DATE_LABELS[event.type]} ${date}` : null].filter(
          (l): l is string => l !== null,
        ),
        href: buildEventHref(event.id, context),
        linkLabel: "Se saken",
      };
    },
    [events, context],
  );

  // Valg fra kartet: vis kortet i lista (kun desktop — på mobil ville det scrollet kartet bort).
  useEffect(() => {
    if (selection?.from !== "map" || !selectedId) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selection, selectedId]);

  return (
    <main className="lg:grid lg:grid-cols-[minmax(24rem,30rem)_1fr] lg:grid-rows-[auto_1fr]">
      <section className="px-5 pt-7 pb-6 sm:px-8 lg:col-start-1 lg:row-start-1 lg:px-10 lg:pt-12">
        <p className="text-[15px] font-medium text-muted">Dette skjer innen {formatRadius(radius)} fra</p>
        <h1 className="mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
          {label}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-3 sm:gap-x-3">
          <RadiusPicker radius={radius} hrefFor={(r) => buildAreaHref({ ...context, radius: r })} onNavigate={navigate} />
          <ChangeLocation radius={radius} onNavigate={navigateToLocation} />
        </div>
      </section>

      <div className="mx-5 h-[48vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none lg:border-0 lg:border-l">
        <AreaMap
          tiles={tiles}
          title={`Kart over området innen ${formatRadius(radius)} fra ${label}${events.length ? `, ${events.length} planområder` : ""}`}
          layers={layers}
          fitBounds={radiusBounds(lat, lng, radius)}
          fitKey={`${lat},${lng},${radius}`}
          selectedId={selectedId}
          onSelect={(id) => setSelection(id ? { id, from: "map" } : null)}
          popupFor={popupFor}
          onNavigate={(href) => router.push(href)}
        />
      </div>

      <div className="px-5 pt-8 pb-16 sm:px-8 lg:col-start-1 lg:row-start-2 lg:px-10 lg:pt-4">
        <EventFeed
          result={result}
          radius={radius}
          sort={sort}
          pending={pending}
          selectedId={selectedId}
          onSelect={(id) => setSelection({ id, from: "list" })}
          hrefForEvent={(event) => buildEventHref(event.id, context)}
          hrefForSort={(s) => buildAreaHref({ ...context, sort: s })}
          hrefForRadius={(r) => buildAreaHref({ ...context, radius: r })}
          onNavigate={navigate}
          cardRefs={cardRefs}
        />
        <AreaFacts result={facts} radius={radius} pending={pending} />
      </div>
    </main>
  );
}
