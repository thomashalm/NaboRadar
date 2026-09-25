"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, MapLayerMouseEvent, Popup } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { LngLatBounds } from "@/lib/geo/bounds";
import { resolveMapClick, type MapClickHit } from "@/lib/map/click";
import { toSafeHttpUrl } from "@/lib/url";
import type { MapTileConfig } from "@/lib/map/config";
import type { LayerBinding } from "@/lib/map/layers/types";

const LOCALE_NB = {
  "Map.Title": "Kart",
  "NavigationControl.ZoomIn": "Zoom inn",
  "NavigationControl.ZoomOut": "Zoom ut",
  "NavigationControl.ResetBearing": "Tilbakestill retning",
  "AttributionControl.ToggleAttribution": "Vis kilder",
  "CooperativeGesturesHandler.WindowsHelpText": "Hold Ctrl og scroll for å zoome",
  "CooperativeGesturesHandler.MacHelpText": "Hold ⌘ og scroll for å zoome",
  "CooperativeGesturesHandler.MobileHelpText": "Bruk to fingre for å flytte kartet",
  "Popup.Close": "Lukk",
};

export interface MapPopupContent {
  lngLat: [number, number];
  title: string;
  lines: string[];
  href?: string;
  linkLabel?: string;
}

interface AreaMapProps {
  tiles: MapTileConfig;
  /** Beskrivelse for skjermlesere. */
  title: string;
  layers: readonly LayerBinding[];
  /** Kartet tilpasses disse grensene ved oppstart og når fitKey endres. */
  fitBounds: LngLatBounds;
  fitKey: string;
  maxFitZoom?: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /**
   * Klikk som skal slå opp eiendommen under punktet. Kalles når `propertyLookupActive` er
   * satt og klikket ikke traff en punktmarkør — også over en flate som et planområde, slik
   * at flaten ikke gjør huset uklikkbart. `covering` er flatene som lå over samme punkt.
   */
  onPropertyClick?: (position: { lat: number; lng: number }, covering: string[]) => void;
  /** Om zoomnivået er høyt nok til at eiendomsoppslag er aktivt. Se lib/map/click.ts. */
  propertyLookupActive?: boolean;
  /** Gjeldende zoomnivå, slik at kalleren kan slå av funksjoner som krever detaljnivå. */
  onZoomChange?: (zoom: number) => void;
  popupFor?: (id: string) => MapPopupContent | null;
  /** Klientnavigasjon for lenker i popup. */
  onNavigate?: (href: string) => void;
}

function fitPadding(container: HTMLElement) {
  return Math.round(Math.min(container.clientWidth, container.clientHeight) * 0.08) + 16;
}

function interactiveLayerIds(map: MapLibreMap, bindings: readonly LayerBinding[]): string[] {
  return bindings.flatMap((b) => [...(b.layer.interactiveLayerIds ?? [])]).filter((id) => map.getLayer(id));
}

/** Popup-innhold bygget med textContent — aldri HTML fra data. */
function popupElement(content: MapPopupContent, onNavigate?: (href: string) => void): HTMLElement {
  const root = document.createElement("div");
  root.className = "naboradar-popup";
  const title = document.createElement("p");
  title.className = "naboradar-popup-title";
  title.textContent = content.title;
  root.append(title);
  for (const line of content.lines) {
    const p = document.createElement("p");
    p.className = "naboradar-popup-line";
    p.textContent = line;
    root.append(p);
  }
  // Eneste stedet i appen der en URL fra en ekstern kilde settes rett på en DOM-node.
  // React sitt eget vern gjelder ikke her, så skjemaet sjekkes på nytt: databasen har
  // allerede CHECK på ^https?:// og normaliseringen kjører toSafeHttpUrl, men en lenke som
  // slipper gjennom begge skal fortsatt ikke kunne bli javascript:.
  const safeHref = content.href
    ? content.href.startsWith("/")
      ? content.href
      : toSafeHttpUrl(content.href)
    : null;
  if (safeHref) {
    const href = safeHref;
    // Interne lenker navigeres i appen; eksterne kilder åpnes i ny fane som ellers på siden.
    const internal = href.startsWith("/");
    const link = document.createElement("a");
    link.className = "naboradar-popup-link";
    link.href = href;
    link.textContent = content.linkLabel ?? "Se saken";
    if (!internal) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.addEventListener("click", (event) => {
      if (!internal || !onNavigate || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      onNavigate(href);
    });
    root.append(link);
  }
  return root;
}

/**
 * Generisk kart: Kartverket-fliser + vilkårlige datalag (MapLayer).
 * Kartet opprettes én gang og beholdes når data, radius eller valgt objekt endres.
 */
export function AreaMap(props: AreaMapProps) {
  const { tiles, title, layers, fitKey, selectedId = null } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mountedLayers = useRef(new Set<string>());
  const previousSelected = useRef<string | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const suppressPopupClose = useRef(false);
  const latestProps = useRef(props);
  const [loaded, setLoaded] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    latestProps.current = props;
  });

  // Opprett kartet én gang. MapLibre lastes dynamisk (krever window/WebGL).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let tileErrors = 0;
    const mounted = mountedLayers.current;

    (async () => {
      const container = containerRef.current;
      if (!container) return;
      const maplibregl = await import("maplibre-gl");
      if (cancelled) return;
      // Worker serveres fra public/ (se scripts/copy-maplibre-worker.mjs).
      maplibregl.setWorkerUrl(`/vendor/maplibre-gl-${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);

      const instance = new maplibregl.Map({
        container,
        style: {
          version: 8,
          sources: {
            base: {
              type: "raster",
              tiles: [tiles.tileUrl],
              tileSize: tiles.tileSize,
              maxzoom: tiles.maxZoom,
              attribution: tiles.attribution,
            },
          },
          layers: [{ id: "base", type: "raster", source: "base" }],
        },
        bounds: latestProps.current.fitBounds,
        fitBoundsOptions: { padding: fitPadding(container), maxZoom: latestProps.current.maxFitZoom ?? 16 },
        attributionControl: { compact: false },
        locale: LOCALE_NB,
        // På touch krever kartet to fingre, slik at siden fortsatt kan scrolles.
        cooperativeGestures: window.matchMedia("(pointer: coarse)").matches,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      map = instance;
      mapRef.current = instance;
      instance.touchZoomRotate.disableRotation();
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: "280px", offset: 12 });
      popup.on("close", () => {
        if (!suppressPopupClose.current) latestProps.current.onSelect?.(null);
      });
      popupRef.current = popup;

      instance.on("load", () => {
        setLoaded(true);
        latestProps.current.onZoomChange?.(instance.getZoom());
      });
      instance.on("zoomend", () => latestProps.current.onZoomChange?.(instance.getZoom()));

      // Klikk: punktmarkører først, så eiendom, så flater. Se lib/map/click.ts.
      instance.on("click", (event: MapLayerMouseEvent) => {
        const bindings = latestProps.current.layers;
        const ids = interactiveLayerIds(instance, bindings);
        const features = ids.length ? instance.queryRenderedFeatures(event.point, { layers: ids }) : [];
        const hits: MapClickHit[] = features.map((feature) => {
          const owner = bindings.find((b) => b.layer.interactiveLayerIds?.includes(feature.layer.id));
          return {
            layerId: feature.layer.id,
            kind: owner?.layer.markerLayerIds?.includes(feature.layer.id) ? "marker" : "area",
            id: owner?.layer.idFromFeature?.(feature.properties ?? {}) ?? null,
          };
        });

        const action = resolveMapClick({ hits, propertyLookupActive: latestProps.current.propertyLookupActive === true });
        if (action.type === "select") {
          latestProps.current.onSelect?.(action.id);
          return;
        }
        latestProps.current.onSelect?.(null);
        if (action.type === "property") {
          latestProps.current.onPropertyClick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng }, action.covering);
        }
      });
      instance.on("mousemove", (event) => {
        const ids = interactiveLayerIds(instance, latestProps.current.layers);
        const hit = ids.length > 0 && instance.queryRenderedFeatures(event.point, { layers: ids }).length > 0;
        instance.getCanvas().style.cursor = hit ? "pointer" : "";
      });

      // Kartverket nede → vis melding i stedet for et tomt grått felt.
      instance.on("error", (event) => {
        if ("sourceId" in event && event.sourceId === "base" && ++tileErrors >= 4) setTilesFailed(true);
      });
    })();

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      map?.remove();
      mapRef.current = null;
      mounted.clear();
    };
  }, [tiles.tileUrl, tiles.tileSize, tiles.maxZoom, tiles.attribution]);

  // Monter nye lag og oppdater data i eksisterende. Valgt tilstand settes på nytt etter dataendring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const { layer, data } of layers) {
      if (mountedLayers.current.has(layer.id)) layer.update(map, data);
      else {
        layer.mount(map, data);
        mountedLayers.current.add(layer.id);
      }
      layer.setSelected?.(map, previousSelected.current, null);
    }
  }, [layers, loaded]);

  // Tilpass utsnitt når området (radius/sted) endres.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.fitBounds(latestProps.current.fitBounds, {
      padding: fitPadding(map.getContainer()),
      maxZoom: latestProps.current.maxFitZoom ?? 16,
      duration: 500,
    });
  }, [fitKey, loaded]);

  // Valgt objekt: marker i alle lag, vis popup, og panorer hvis objektet er utenfor utsnittet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const { layer } of latestProps.current.layers) {
      layer.setSelected?.(map, selectedId, previousSelected.current);
    }
    previousSelected.current = selectedId;

    const popup = popupRef.current;
    suppressPopupClose.current = true;
    popup?.remove();
    suppressPopupClose.current = false;
    if (!selectedId || !popup) return;
    const content = latestProps.current.popupFor?.(selectedId);
    if (!content) return;
    popup.setLngLat(content.lngLat).setDOMContent(popupElement(content, latestProps.current.onNavigate)).addTo(map);
    if (!map.getBounds().contains(content.lngLat)) map.easeTo({ center: content.lngLat, duration: 400 });
  }, [selectedId, loaded]);

  // MapLibre gir canvaset role="region"; hold beskrivelsen oppdatert for skjermlesere.
  useEffect(() => {
    if (loaded) mapRef.current?.getCanvas().setAttribute("aria-label", title);
  }, [title, loaded]);

  return (
    <div className="relative size-full overflow-hidden bg-[#eeeeec]">
      {/* Ikke `absolute` på containeren: MapLibre setter selv position: relative. */}
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && <div className="pointer-events-none absolute inset-0 animate-pulse bg-[#eeeeec]" aria-hidden="true" />}
      {tilesFailed && (
        <div className="absolute inset-x-4 top-4 rounded-xl bg-surface/95 px-4 py-3 text-sm text-ink shadow-float" role="status">
          Kartet kunne ikke lastes akkurat nå. Prøv igjen litt senere.
        </div>
      )}
    </div>
  );
}
