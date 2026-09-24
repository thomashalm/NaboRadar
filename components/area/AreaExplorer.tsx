"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PropertyLookupResult } from "@/lib/property/types";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import { buildAreaHref, buildEventHref } from "@/lib/area-params";
import { EVENT_DATE_LABELS } from "@/lib/events/labels";
import type { AreaEventsResult } from "@/lib/events/queries";
import type { AreaFactsResult, AreaMapFeature } from "@/lib/facts/queries";
import { formatDate, formatDistance, formatRadius } from "@/lib/format";
import { radiusBounds } from "@/lib/geo/radius";
import type { MapTileConfig } from "@/lib/map/config";
import { contaminatedSitesLayer } from "@/lib/map/layers/contaminated-sites";
import { selectedPropertyLayer } from "@/lib/map/layers/selected-property";
import { nearbyPlacesLayer } from "@/lib/map/layers/nearby-places";
import { planAreasLayer } from "@/lib/map/layers/plan-areas";
import { radiusLayer } from "@/lib/map/layers/radius";
import { bindLayer } from "@/lib/map/layers/types";
import type { AreaEvent, AreaSort } from "@/types/event";
import { PropertyCard, type PropertyState } from "./PropertyCard";
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
const NO_SITES: AreaMapFeature[] = [];
/**
 * Eiendomsoppslag krever at brukeren faktisk ser enkelttomter.
 *
 * Målt i kartpanelet: zoom 14 gir 4,7 m per piksel, så en tomt på 20×30 m er 4×6 piksler —
 * nok til å treffe. På zoom 13 er den 2×3 piksler, og klikket blir gjetning. Nivået nås ved
 * 500 m-søk og ved ett zoom-trinn fra standardradien. Under det viser vi et diskret hint i
 * stedet for å spørre kilden om noe brukeren ikke kan ha ment.
 */
const MIN_PROPERTY_ZOOM = 14;

/**
 * Resultatsiden: kart og feed deler valgt sak. Radius/sortering/sted endres via URL i en
 * transition — kartet beholdes, og feeden viser lastetilstand til nye data er klare.
 */
export function AreaExplorer({ lat, lng, radius, label, urlLabel, sort, result, facts, tiles }: AreaExplorerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<{ id: string; from: "map" | "list" } | null>(null);
  const [property, setProperty] = useState<PropertyState>({ status: "idle" });
  /** Flater som lå under klikkpunktet. Eiendommen vant klikket, men planområdet nevnes i kortet. */
  const [covering, setCovering] = useState<readonly string[]>([]);
  const [zoom, setZoom] = useState(0);
  const propertyRequest = useRef<AbortController | null>(null);
  const propertyRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const events = result.status === "ok" ? result.events : NO_EVENTS;
  const mapFeatures = facts.status === "ok" ? facts.mapFeatures : NO_SITES;
  // Flater tegnes som flater, punkter som markører. Kategorien avgjør hvilket lag.
  const sites = useMemo(() => mapFeatures.filter((f) => f.geometry.type !== "Point"), [mapFeatures]);
  const places = useMemo(() => mapFeatures.filter((f) => f.geometry.type === "Point"), [mapFeatures]);
  // Valget gjelder bare så lenge objektet finnes i gjeldende resultat.
  const selectedId =
    selection && (events.some((e) => e.id === selection.id) || mapFeatures.some((f) => f.id === selection.id))
      ? selection.id
      : null;

  const context = useMemo(() => ({ lat, lng, radius, label: urlLabel, sort }), [lat, lng, radius, urlLabel, sort]);
  const navigate = useCallback(
    (href: string) => startTransition(() => router.replace(href, { scroll: false })),
    [router],
  );
  const navigateToLocation = useCallback((href: string) => startTransition(() => router.push(href)), [router]);

  const propertyGeometry = property.status === "ok" ? property.property.geometry : null;

  /** Klikk i tomt kartområde: finn eiendommen under punktet. Markører har allerede forrang. */
  const lookupProperty = useCallback(async (position: { lat: number; lng: number }) => {
    propertyRequest.current?.abort();
    const controller = new AbortController();
    propertyRequest.current = controller;
    setProperty({ status: "loading" });

    try {
      const response = await fetch(`/api/eiendom?lat=${position.lat}&lng=${position.lng}`, {
        signal: controller.signal,
      });
      const result = (await response.json()) as PropertyLookupResult;
      if (controller.signal.aborted) return;
      setProperty(
        result.status === "ok"
          ? { status: "ok", property: result.property }
          : result.status === "not-found"
            ? { status: "not-found" }
            : { status: "error" },
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") setProperty({ status: "error" });
    }
  }, []);

  /** Kartet har allerede avgjort at eiendommen vant klikket, se lib/map/click.ts. */
  const handlePropertyClick = useCallback(
    (position: { lat: number; lng: number }, coveringIds: string[]) => {
      setCovering(coveringIds);
      void lookupProperty(position);
    },
    [lookupProperty],
  );

  const coveringPlans = useMemo(
    () =>
      covering.flatMap((id) => {
        const event = events.find((e) => e.id === id);
        return event ? [{ id, title: event.title, href: buildEventHref(event.id, context) }] : [];
      }),
    [covering, events, context],
  );

  // På mobil ligger kortet under kartet. Rull det fram når en ny eiendom velges.
  useEffect(() => {
    if (property.status === "idle") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    propertyRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [property]);

  const layers = useMemo(
    () => [
      bindLayer(radiusLayer, { lat, lng, radiusM: radius }),
      // Lokaliteter tegnes under planområdene, som er hovedinnholdet.
      bindLayer(contaminatedSitesLayer, sites),
      bindLayer(planAreasLayer, events),
      bindLayer(nearbyPlacesLayer, places),
      // Valgt eiendom tegnes øverst, men med lav fyllopasitet.
      bindLayer(selectedPropertyLayer, { geometry: propertyGeometry }),
    ],
    [lat, lng, radius, events, sites, places, propertyGeometry],
  );

  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const place = mapFeatures.find((f) => f.id === id);
      if (place) {
        // Teksten er ferdig formulert i formuleringsregisteret — kartet finner aldri på noe eget.
        return {
          lngLat: place.center,
          title: place.title,
          lines: [place.contains ? "Søkepunktet ligger innenfor lokaliteten" : place.distanceLabel, ...place.lines],
          href: place.href ?? undefined,
          linkLabel: place.href ? "Se kilden" : undefined,
        };
      }
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
    [events, mapFeatures, context],
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
          <RadiusPicker
            radius={radius}
            hrefFor={(r) => buildAreaHref({ ...context, radius: r })}
            onNavigate={navigate}
            pending={pending}
          />
          <ChangeLocation radius={radius} onNavigate={navigateToLocation} />
        </div>
      </section>

      <div className="relative mx-5 h-[48vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none lg:border-0 lg:border-l">
        <AreaMap
          tiles={tiles}
          title={`Kart over området innen ${formatRadius(radius)} fra ${label}${events.length ? `, ${events.length} planområder` : ""}${sites.length ? `, ${sites.length} registrerte lokaliteter med forurenset grunn` : ""}${places.length ? `, ${places.length} anlegg med utslippstillatelse` : ""}`}
          layers={layers}
          fitBounds={radiusBounds(lat, lng, radius)}
          fitKey={`${lat},${lng},${radius}`}
          selectedId={selectedId}
          onSelect={(id) => setSelection(id ? { id, from: "map" } : null)}
          onPropertyClick={handlePropertyClick}
          propertyLookupActive={zoom >= MIN_PROPERTY_ZOOM}
          onZoomChange={setZoom}
          popupFor={popupFor}
          onNavigate={(href) => router.push(href)}
        />
        {zoom > 0 && zoom < MIN_PROPERTY_ZOOM && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[13px] text-muted">
            <span className="rounded-full bg-surface/90 px-3 py-1.5">Zoom inn for å utforske eiendommer</span>
          </p>
        )}
      </div>

      <div className="px-5 pt-8 pb-16 sm:px-8 lg:col-start-1 lg:row-start-2 lg:px-10 lg:pt-4">
        <div ref={propertyRef} className={property.status === "idle" ? "" : "mb-8"}>
          <PropertyCard
            state={property}
            coveringPlans={coveringPlans}
            onClose={() => {
              setProperty({ status: "idle" });
              setCovering([]);
            }}
          />
        </div>
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
