"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PropertyLookupResult } from "@/lib/property/types";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import { buildAreaHref, buildEventHref, buildToolHref, type AreaBasePath, type AreaTool } from "@/lib/area-params";
import { EVENT_DATE_LABELS } from "@/lib/events/labels";
import type { AreaEventsResult } from "@/lib/events/queries";
import type { AreaFactsResult, AreaMapFeature } from "@/lib/facts/queries";
import { mergeFactResults } from "@/lib/facts/merge";
import { formatDate, formatDistance, formatRadius } from "@/lib/format";
import { radiusBounds } from "@/lib/geo/radius";
import type { MapTileConfig } from "@/lib/map/config";
import { areaPointsLayer, type AreaPoint } from "@/lib/map/layers/area-points";
import { areaShapesLayer, planAreasTonedLayer } from "@/lib/map/layers/area-shapes";
import { contaminatedSitesLayer } from "@/lib/map/layers/contaminated-sites";
import { boundsAround, mapChipLabel, mapTone } from "@/lib/map/presentation";
import type { FriluftPoint } from "@/lib/huts/map-points";
import { selectedPropertyLayer } from "@/lib/map/layers/selected-property";
import { internalFindingsLayer, type InternalMapFeature } from "@/lib/map/layers/internal-findings";
import { radiusLayer } from "@/lib/map/layers/radius";
import { bindLayer } from "@/lib/map/layers/types";
import type { AreaEvent, AreaSort } from "@/types/event";
import { findTheme, mapFocus, themeHref, themesFor } from "@/lib/area-themes";
import { PropertyCard, type PropertyState } from "./PropertyCard";
import { AreaPanel } from "./AreaPanel";
import { MapSelectionProvider } from "./map-selection";
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
  /**
   * Kildene kommer som løfter, ikke ferdige data. Siden rendres med adresse, radius og kart
   * med én gang, og hver seksjon fyller seg selv når kilden er ferdig — eller viser at den
   * ikke kunne hentes, uten å ta med seg resten av siden.
   */
  events: Promise<AreaEventsResult>;
  storedFacts: Promise<AreaFactsResult>;
  lookupFacts: Promise<AreaFactsResult>;
  tiles: MapTileConfig;
  /**
   * Skolekretsnotisen, rendret på serveren og sendt inn som ferdig innhold. Da ligger
   * teksten i HTML-en uten at denne klientkomponenten må kjenne til oppslaget.
   */
  skolekrets?: React.ReactNode;
  /** Spesialverktøyet søket kom fra (/tilfluktsrom, /skolekrets). Følger med når radius endres. */
  tool?: AreaTool;
  /** «Friluft i nærheten», rendret på serveren. Vises når temaet Friluft er valgt. */
  friluft?: React.ReactNode;
  /** Én linje om friluft til temaoversikten, rendret på serveren. */
  friluftSummary?: React.ReactNode;
  /** Hyttene som kartpunkter. Vises når temaet Friluft er valgt, og kan ligge langt utenfor radien. */
  friluftPoints?: Promise<FriluftPoint[]>;
  /**
   * Innhold som legges **over** resultatet, før de offentlige seksjonene.
   *
   * Brukes av admin til intern research. Den ligger først fordi den er grunnen til at en
   * operatør åpner admin-visningen i stedet for den offentlige — ikke fordi den er viktigere
   * enn resultatet, men fordi den er det som ikke finnes andre steder. Den offentlige siden
   * sender ingenting inn her.
   */
  leadSections?: React.ReactNode;
  /**
   * Innhold som legges under resultatet, etter de offentlige seksjonene.
   *
   * Sømmen som lar admin vise «samme resultat + noe mer» uten en egen implementasjon av
   * siden. Den offentlige /omrade sender ingenting inn her, og en endring i resultatvisningen
   * slår derfor gjennom begge steder av seg selv.
   */
  extraSections?: React.ReactNode;
  /**
   * Interne kartobjekt som legges på samme kart, med egen dempet markørstil.
   *
   * Samme kart, samme valgtilstand, samme MapSelectionProvider — så et trykk i en intern liste
   * oppfører seg som et trykk i en offentlig. Den offentlige siden sender ingenting hit.
   */
  internalFeatures?: readonly InternalMapFeature[];
  /**
   * Hvilken side denne visningen står på. Radius, sortering, «endre sted» og «tilbake» bygger
   * lenkene sine av den, slik at navigasjonen blir liggende der brukeren er. Uten den ville et
   * radiusklikk i /admin/adresse sendt operatøren ut på den offentlige siden — og dermed bort fra
   * den interne delen av resultatet.
   */
  basePath?: AreaBasePath;
}

type Stream<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "failed" };

/**
 * Følger ett løfte fra serveren. Tilstanden henger på løftet, slik at et nytt søk eller ny
 * radius viser lasting med en gang i stedet for gamle tall.
 */
function useStream<T>(promise: Promise<T>): Stream<T> {
  const [entry, setEntry] = useState<{ promise: Promise<T>; state: Stream<T> }>({
    promise,
    state: { status: "loading" },
  });

  useEffect(() => {
    let aktiv = true;
    promise.then(
      (data) => {
        if (aktiv) setEntry({ promise, state: { status: "ready", data } });
      },
      (error: unknown) => {
        console.error("[omrade] kilden feilet:", error);
        if (aktiv) setEntry({ promise, state: { status: "failed" } });
      },
    );
    return () => {
      aktiv = false;
    };
  }, [promise]);

  return entry.promise === promise ? entry.state : { status: "loading" };
}



const NO_EVENTS: AreaEvent[] = [];
const NO_SITES: AreaMapFeature[] = [];
const NO_HUTS: Promise<FriluftPoint[]> = Promise.resolve([]);
const NO_INTERNAL: readonly InternalMapFeature[] = [];
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
 * Zoomnivået et valgt internt punkt sentreres på når kartet står lenger ute.
 *
 * Research-funn er punkter, ikke flater, og velges nettopp for å se hvor de ligger. 16 er nivået
 * der enkelttomter og gatenavn er lesbare. Ligger punktet allerede i utsnittet på dette nivået
 * eller nærmere, flytter kartet seg ikke.
 */
const INTERNAL_FOCUS_ZOOM = 16;

/**
 * Resultatsiden: kart og feed deler valgt sak. Radius/sortering/sted endres via URL i en
 * transition — kartet beholdes, og feeden viser lastetilstand til nye data er klare.
 */
export function AreaExplorer({
  lat,
  lng,
  radius,
  label,
  urlLabel,
  sort,
  events: eventsPromise,
  storedFacts: storedFactsPromise,
  lookupFacts: lookupFactsPromise,
  tiles,
  skolekrets,
  tool,
  friluft,
  friluftSummary,
  friluftPoints,
  leadSections,
  extraSections,
  internalFeatures = NO_INTERNAL,
  basePath,
}: AreaExplorerProps) {
  const router = useRouter();
  const eventStream = useStream(eventsPromise);
  const storedStream = useStream(storedFactsPromise);
  const lookupStream = useStream(lookupFactsPromise);
  const hutStream = useStream(friluftPoints ?? NO_HUTS);


  const result: AreaEventsResult | null = eventStream.status === "ready" ? eventStream.data : null;

  // Delsvarene settes sammen etter hvert som de kommer. Har vi bare det ene, viser vi det.
  const facts: AreaFactsResult | null = useMemo(() => {
    const db = storedStream.status === "ready" ? storedStream.data : null;
    const oppslag = lookupStream.status === "ready" ? lookupStream.data : null;
    if (db && oppslag) return mergeFactResults(db, oppslag);
    return db ?? oppslag ?? null;
  }, [storedStream, lookupStream]);


  // «Kirkeveien 60, 0368 Oslo» deles i adresse og sted. Uten komma står navnet alene.
  const [gate, ...stedDeler] = label.split(", ");
  const sted = stedDeler.join(", ");

  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<{ id: string; from: "map" | "list" } | null>(null);
  const [property, setProperty] = useState<PropertyState>({ status: "idle" });
  /** Flater som lå under klikkpunktet. Eiendommen vant klikket, men planområdet nevnes i kortet. */
  const [covering, setCovering] = useState<readonly string[]>([]);
  const [zoom, setZoom] = useState(0);
  // Sortering navigerer, og saksgruppen bygges da på nytt. Tilstanden må derfor bo her.
  const [eventsExpanded, setEventsExpanded] = useState<boolean | null>(null);
  /*
   * Valgt tema ligger i URL-en (`tema=`), ikke i et anker: panelet bytter innhold, og ingenting
   * ruller. Nettleserens tilbakeknapp går til oversikten. Kom søket fra et spesialverktøy, åpner
   * siden på temaet brukeren spurte om; `tema=oversikt` er da veien tilbake til oversikten.
   */
  const pathname = usePathname() ?? "/omrade";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const temaParam = searchParams?.get("tema") ?? null;
  const verktoyTema = tool === "tilfluktsrom" ? "tilfluktsrom" : tool === "skolekrets" ? "skoler" : null;
  const themeId = temaParam ?? verktoyTema;
  const storedData = storedStream.status === "ready" ? storedStream.data : null;
  const theme = useMemo(() => findTheme(themesFor(storedData), themeId), [storedData, themeId]);
  const hrefForTheme = useCallback(
    (id: string | null) => themeHref(pathname, search, id ?? (verktoyTema ? "oversikt" : null)),
    [pathname, search, verktoyTema],
  );
  const selectTheme = useCallback(
    (id: string | null) => {
      window.history.pushState(null, "", hrefForTheme(id));
      setSelection(null);
    },
    [hrefForTheme],
  );
  const panelRef = useRef<HTMLDivElement>(null);
  // Nytt tema starter øverst i panelet. På mobil ligger panelet under kartet, og rulles akkurat
  // langt nok til at toppen av temaet er synlig — aldri nedover siden.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = 0;
    if (panel.getBoundingClientRect().top < 64) panel.scrollIntoView({ block: "start" });
  }, [themeId]);

  const propertyRequest = useRef<AbortController | null>(null);
  const propertyRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const events = result?.status === "ok" ? result.events : NO_EVENTS;
  const mapFeatures = facts?.status === "ok" ? facts.mapFeatures : NO_SITES;
  // Flater tegnes som flater, punkter som markører. Kategorien avgjør hvilket lag.
  const allSites = useMemo(() => mapFeatures.filter((f) => f.geometry.type !== "Point"), [mapFeatures]);
  const allPlaces = useMemo(() => mapFeatures.filter((f) => f.geometry.type === "Point"), [mapFeatures]);
  // Valget gjelder bare så lenge objektet finnes i gjeldende resultat.
  const selectedId =
    selection &&
    (events.some((e) => e.id === selection.id) ||
      mapFeatures.some((f) => f.id === selection.id) ||
      selection.id.startsWith("hytte:") ||
      internalFeatures.some((f) => f.id === selection.id))
      ? selection.id
      : null;

  const context = useMemo(
    () => ({ lat, lng, radius, label: urlLabel, sort, basePath, tool }),
    [lat, lng, radius, urlLabel, sort, basePath, tool],
  );
  const navigate = useCallback(
    (href: string) => startTransition(() => router.replace(href, { scroll: false })),
    [router],
  );
  const navigateToLocation = useCallback((href: string) => startTransition(() => router.push(href)), [router]);

  const propertyGeometry = property.status === "ok" ? property.property.geometry : null;

  // Kartet følger temaet: uten valg vises alt, med et tema bare det temaet eier (lib/area-themes.ts).
  const focus = useMemo(() => mapFocus(theme), [theme]);
  const sites = useMemo(
    () => (focus.categories ? allSites.filter((f) => focus.categories!.has(f.category)) : allSites),
    [allSites, focus],
  );
  const places = useMemo(
    () => (focus.categories ? allPlaces.filter((f) => focus.categories!.has(f.category)) : allPlaces),
    [allPlaces, focus],
  );
  const mapEvents = focus.plans ? events : NO_EVENTS;
  const tone = useMemo(() => mapTone(theme), [theme]);
  // Hyttene hører bare til temaet Friluft. De ligger ofte langt utenfor radien, og vises derfor
  // ikke i oversikten, der utsnittet er radien.
  const friluftValgt = theme?.source.kind === "friluft";
  const huts = useMemo(() => (friluftValgt && hutStream.status === "ready" ? hutStream.data : []), [friluftValgt, hutStream]);
  const points: AreaPoint[] = useMemo(
    () => [...places.map((p) => ({ id: p.id, center: p.center })), ...huts.map((h) => ({ id: h.id, center: h.center }))],
    [places, huts],
  );
  // Forurenset grunn (bare i admins visning) har sitt eget lag. Resten av flatene og linjene —
  // kvikkleiresoner og kraftlinjer — følger temaet.
  const contaminated = useMemo(() => sites.filter((f) => f.category === "miljo"), [sites]);
  const shapes = useMemo(() => sites.filter((f) => f.category !== "miljo"), [sites]);
  const visibleCount = points.length + sites.length + mapEvents.length;
  // Friluft bruker større radius enn resten av siden. Da må utsnittet romme hyttene.
  const hutBounds = useMemo(() => boundsAround([lng, lat], huts.map((h) => h.center)), [lng, lat, huts]);


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
      bindLayer(contaminatedSitesLayer, contaminated),
      bindLayer(areaShapesLayer, { shapes, tone }),
      bindLayer(planAreasTonedLayer, { events: mapEvents, tone }),
      bindLayer(areaPointsLayer, { points, tone }),
      // Interne funn ligger over de offentlige punktene, men i en markør som ikke kan forveksles.
      bindLayer(internalFindingsLayer, internalFeatures),
      // Valgt eiendom tegnes øverst, men med lav fyllopasitet.
      bindLayer(selectedPropertyLayer, { geometry: propertyGeometry }),
    ],
    [lat, lng, radius, mapEvents, contaminated, shapes, points, tone, internalFeatures, propertyGeometry],
  );

  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const intern = internalFeatures.find((f) => f.id === id);
      if (intern) {
        return {
          lngLat: intern.center,
          title: intern.title,
          lines: intern.lines,
          href: intern.href,
          linkLabel: intern.linkLabel,
          // Et punkt uten flate må zoomes inn på for å si noe om hvor det er.
          minZoom: INTERNAL_FOCUS_ZOOM,
        };
      }
      const hytte = huts.find((h) => h.id === id);
      if (hytte) return { lngLat: hytte.center, title: hytte.name, lines: hytte.lines, href: hytte.href, linkLabel: "Se hytta" };
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
    [events, mapFeatures, internalFeatures, huts, context],
  );

  /** Ids kartet faktisk tegner. En rad uten kartobjekt skal ikke se klikkbar ut. */
  const mapFeatureIds = useMemo(
    () => [...mapFeatures.map((f) => f.id), ...internalFeatures.map((f) => f.id)],
    [mapFeatures, internalFeatures],
  );
  /** Trykk i en liste velger samme objekt som et klikk i kartet ville gjort. */
  const velgFraListe = useCallback((id: string) => setSelection({ id, from: "list" }), []);

  // Valg fra kartet: vis kortet i lista (kun desktop — på mobil ville det scrollet kartet bort).
  useEffect(() => {
    if (selection?.from !== "map" || !selectedId) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selection, selectedId]);

  /**
   * Valg fra listen på mobil: hent kartet fram.
   *
   * På mobil ligger kartet over listen, og et trykk i en rad ville ellers uthevet en markør
   * brukeren ikke kan se. På desktop ligger kartet ved siden av og er alltid synlig.
   */
  useEffect(() => {
    if (selection?.from !== "list" || !selectedId) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    mapRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selection, selectedId]);

  const radiusHref = (r: number) => {
    const href = buildAreaHref({ ...context, radius: r });
    return temaParam ? `${href}&tema=${encodeURIComponent(temaParam)}` : href;
  };

  return (
    /*
     * Arbeidsflaten. Fra 1024 px: panel til venstre (ca. 40 %), kart til høyre, begge i én
     * skjermhøyde. Panelet ruller for seg; kartet står stille. Under 1024 px: adresse, kart og
     * panel under hverandre i vanlig sideflyt.
     */
    <main className="lg:grid lg:h-[calc(100dvh-4rem)] lg:min-h-[34rem] lg:grid-cols-[minmax(24rem,40%)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
      <header className="gutter border-line pt-5 pb-4 lg:col-start-1 lg:row-start-1 lg:border-r lg:border-b lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-ink [overflow-wrap:anywhere]">
              {gate}
            </h1>
            {sted && <p className="type-support">{sted}</p>}
          </div>
          <ChangeLocation radius={radius} onNavigate={navigateToLocation} basePath={basePath} />
        </div>
        <div className="mt-3">
          <RadiusPicker radius={radius} hrefFor={radiusHref} onNavigate={navigate} pending={pending} />
        </div>
      </header>

      <div
        ref={mapRef}
        className="gutter scroll-mt-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-full lg:p-0"
      >
        <div className="relative h-[44vh] min-h-72 overflow-hidden rounded-panel border border-line-strong/70 bg-sunken lg:h-full lg:rounded-none lg:border-0">
          <AreaMap
            tiles={tiles}
            title={`Kart over området innen ${formatRadius(radius)} fra ${label}${theme ? `, tema ${theme.label}` : ""}${mapEvents.length ? `, ${mapEvents.length} planområder` : ""}${sites.length ? `, ${sites.length} registrerte lokaliteter` : ""}${places.length ? `, ${places.length} steder` : ""}`}
            layers={layers}
            basemap="muted"
            fitBounds={hutBounds ?? radiusBounds(lat, lng, radius)}
            fitKey={`${lat},${lng},${radius},${hutBounds ? "friluft" : ""}`}
            selectedId={selectedId}
            onSelect={(id) => setSelection(id ? { id, from: "map" } : null)}
            onPropertyClick={handlePropertyClick}
            propertyLookupActive={zoom >= MIN_PROPERTY_ZOOM}
            onZoomChange={setZoom}
            popupFor={popupFor}
            onNavigate={(href) => router.push(href)}
          />
          {/* Hva kartet viser akkurat nå. Nøytral i oversikten; temafargen bare når et tema er valgt. */}
          <p className="pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-full bg-surface/90 py-1 pr-3 pl-2.5 text-[13px] text-muted shadow-[0_1px_2px_rgb(20_23_26/0.12)]">
            {theme && <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: theme.color }} />}
            <span className={`truncate ${theme ? "font-medium text-ink" : ""}`}>{mapChipLabel(theme, visibleCount, storedStream.status !== "loading" && lookupStream.status !== "loading" && hutStream.status !== "loading")}</span>
          </p>
          {zoom > 0 && zoom < MIN_PROPERTY_ZOOM && (
            <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-muted">
              <span className="rounded-full bg-surface/95 px-3 py-1.5 shadow-float">Zoom inn for å utforske eiendommer</span>
            </p>
          )}
        </div>
      </div>

      <div
        ref={panelRef}
        className="gutter scroll-mt-16 border-line pt-6 pb-12 lg:col-start-1 lg:row-start-2 lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:px-6 lg:pt-5 lg:pb-8"
      >
        <div ref={propertyRef} className={property.status === "idle" ? "" : "mb-6"}>
          <PropertyCard
            state={property}
            coveringPlans={coveringPlans}
            onClose={() => {
              setProperty({ status: "idle" });
              setCovering([]);
            }}
          />
        </div>
        <MapSelectionProvider selectedId={selectedId} onSelect={velgFraListe} ids={mapFeatureIds}>
          <AreaPanel
            storedFacts={storedFactsPromise}
            lookupFacts={lookupFactsPromise}
            events={eventsPromise}
            radius={radius}
            pending={pending}
            themeId={themeId}
            hrefForTheme={hrefForTheme}
            onSelectTheme={selectTheme}
            nearestShelterHref={buildToolHref({ ...context, tool: "tilfluktsrom" })}
            friluft={friluft}
            friluftSummary={friluftSummary}
            skolekrets={skolekrets}
            lead={leadSections}
            extra={extraSections}
            saker={
              <EventFeed
                events={eventsPromise}
                radius={radius}
                sort={sort}
                pending={pending}
                selectedId={selectedId}
                onSelect={(id) => setSelection({ id, from: "list" })}
                expanded={eventsExpanded}
                onExpandedChange={setEventsExpanded}
                hrefForEvent={(event) => buildEventHref(event.id, context)}
                hrefForSort={(s) => buildAreaHref({ ...context, sort: s })}
                hrefForRadius={(r) => buildAreaHref({ ...context, radius: r })}
                onNavigate={navigate}
                cardRefs={cardRefs}
              />
            }
          />
        </MapSelectionProvider>
      </div>
    </main>
  );
}
