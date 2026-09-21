"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { formatRadius } from "@/lib/format";
import { circlePolygon, radiusBounds } from "@/lib/geo/radius";
import type { MapTileConfig } from "@/lib/map/config";

const ACCENT = "#2447d4";

const LOCALE_NB = {
  "Map.Title": "Kart",
  "NavigationControl.ZoomIn": "Zoom inn",
  "NavigationControl.ZoomOut": "Zoom ut",
  "NavigationControl.ResetBearing": "Tilbakestill retning",
  "AttributionControl.ToggleAttribution": "Vis kilder",
  "CooperativeGesturesHandler.WindowsHelpText": "Hold Ctrl og scroll for å zoome",
  "CooperativeGesturesHandler.MacHelpText": "Hold ⌘ og scroll for å zoome",
  "CooperativeGesturesHandler.MobileHelpText": "Bruk to fingre for å flytte kartet",
};

interface AreaMapProps {
  lat: number;
  lng: number;
  radiusM: number;
  label: string;
  tiles: MapTileConfig;
}

function radiusFeature(lat: number, lng: number, radiusM: number) {
  return { type: "Feature" as const, properties: {}, geometry: circlePolygon(lat, lng, radiusM) };
}

function centerFeature(lat: number, lng: number) {
  return { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [lng, lat] } };
}

function mapTitle(radiusM: number, label: string) {
  return `Kart over området innen ${formatRadius(radiusM)} fra ${label}`;
}

function fitPadding(container: HTMLElement) {
  return Math.round(Math.min(container.clientWidth, container.clientHeight) * 0.08) + 12;
}

export function AreaMap({ lat, lng, radiusM, label, tiles }: AreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const latest = useRef({ lat, lng, radiusM });
  useEffect(() => {
    latest.current = { lat, lng, radiusM };
  });

  // Opprett kartet én gang. MapLibre importeres dynamisk fordi den krever nettleser (window/WebGL).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let tileErrors = 0;

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
        bounds: radiusBounds(lat, lng, radiusM),
        fitBoundsOptions: { padding: fitPadding(container) },
        attributionControl: { compact: false },
        locale: LOCALE_NB,
        // På touch krever kartet to fingre, slik at siden fortsatt kan scrolles.
        cooperativeGestures: window.matchMedia("(pointer: coarse)").matches,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      map = instance;
      instance.touchZoomRotate.disableRotation();
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = instance;

      instance.on("load", () => {
        const map = instance;
        const current = latest.current;
        map.addSource("radius", { type: "geojson", data: radiusFeature(current.lat, current.lng, current.radiusM) });
        map.addSource("center", { type: "geojson", data: centerFeature(current.lat, current.lng) });
        map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": ACCENT, "fill-opacity": 0.07 } });
        map.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": ACCENT, "line-width": 2, "line-opacity": 0.85 } });
        map.addLayer({ id: "center-halo", type: "circle", source: "center", paint: { "circle-radius": 14, "circle-color": ACCENT, "circle-opacity": 0.16 } });
        map.addLayer({
          id: "center-dot",
          type: "circle",
          source: "center",
          paint: { "circle-radius": 7, "circle-color": ACCENT, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 },
        });
        setLoaded(true);
      });

      // Kartverket nede → vis melding i stedet for et tomt grått felt.
      instance.on("error", (event) => {
        if ("sourceId" in event && event.sourceId === "base") {
          tileErrors++;
          if (tileErrors >= 4) setTilesFailed(true);
        }
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // Kartet opprettes kun ved mount; endringer i posisjon håndteres i neste effekt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.tileUrl]);

  // Oppdater radius/punkt og zoom når brukeren endrer radius eller sted.
  // Merk: map.isStyleLoaded() er false mens fliser lastes, så vi bruker egen ready-state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const radiusSource = map.getSource("radius") as GeoJSONSource | undefined;
    const centerSource = map.getSource("center") as GeoJSONSource | undefined;
    if (!radiusSource || !centerSource) return;
    // MapLibre gir canvaset role="region"; hold beskrivelsen oppdatert for skjermlesere.
    map.getCanvas().setAttribute("aria-label", mapTitle(radiusM, label));
    radiusSource.setData(radiusFeature(lat, lng, radiusM));
    centerSource.setData(centerFeature(lat, lng));
    map.fitBounds(radiusBounds(lat, lng, radiusM), { padding: fitPadding(map.getContainer()), duration: 600 });
  }, [lat, lng, radiusM, label, loaded]);

  return (
    <div className="relative size-full overflow-hidden bg-[#eeeeec]">
      <div
        ref={containerRef}
        // Ikke `absolute`: MapLibre setter selv position: relative på containeren.
        className="h-full w-full"
      />
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-[#eeeeec]" aria-hidden="true" />
      )}
      {tilesFailed && (
        <div className="absolute inset-x-4 top-4 rounded-xl bg-surface/95 px-4 py-3 text-sm text-ink shadow-float" role="status">
          Kartet kunne ikke lastes akkurat nå. Prøv igjen litt senere.
        </div>
      )}
    </div>
  );
}
