"use client";

import { useMemo } from "react";
import { AreaMap } from "@/components/map/AreaMap";
import { geometryBounds, type LngLatBounds } from "@/lib/geo/bounds";
import type { MapTileConfig } from "@/lib/map/config";
import { planAreasLayer } from "@/lib/map/layers/plan-areas";
import { radiusLayer } from "@/lib/map/layers/radius";
import { bindLayer, type LayerBinding } from "@/lib/map/layers/types";
import type { AreaEvent } from "@/types/event";

interface EventDetailMapProps {
  event: Pick<AreaEvent, "id" | "title" | "geometry" | "centroid">;
  /** Søkepunktet fra konteksten, hvis siden ble åpnet fra et område. */
  origin?: { lat: number; lng: number } | null;
  tiles: MapTileConfig;
}

/** Planområdet i fokus. Søkepunktet vises som referanse, men styrer ikke zoom. */
export function EventDetailMap({ event, origin, tiles }: EventDetailMapProps) {
  const layers = useMemo(() => {
    const list: LayerBinding[] = [bindLayer(planAreasLayer, [event])];
    if (origin) list.unshift(bindLayer(radiusLayer, { lat: origin.lat, lng: origin.lng, radiusM: 0 }));
    return list;
  }, [event, origin]);

  const bounds: LngLatBounds = geometryBounds(event.geometry) ?? [
    [event.centroid.coordinates[0]! - 0.01, event.centroid.coordinates[1]! - 0.005],
    [event.centroid.coordinates[0]! + 0.01, event.centroid.coordinates[1]! + 0.005],
  ];

  return (
    <AreaMap
      tiles={tiles}
      title={`Kart over planområdet for ${event.title}`}
      layers={layers}
      fitBounds={bounds}
      fitKey={event.id}
      maxFitZoom={17}
      selectedId={event.id}
    />
  );
}
