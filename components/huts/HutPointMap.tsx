"use client";

import { useMemo } from "react";
import { AreaMap } from "@/components/map/AreaMap";
import { radiusBounds } from "@/lib/geo/radius";
import type { MapTileConfig } from "@/lib/map/config";
import { hutsLayer } from "@/lib/map/layers/huts";
import { bindLayer } from "@/lib/map/layers/types";

/** Kart over én hytte, med et par kilometer rundt så den kan plasseres i terrenget. */
export function HutPointMap({ hut, tiles }: { hut: { id: string; name: string; type: string; lat: number; lng: number }; tiles: MapTileConfig }) {
  const layers = useMemo(() => [bindLayer(hutsLayer, [{ id: hut.id, type: hut.type, lat: hut.lat, lng: hut.lng }])], [hut]);
  return (
    <AreaMap
      tiles={tiles}
      title={`Kart over ${hut.name}`}
      layers={layers}
      fitBounds={radiusBounds(hut.lat, hut.lng, 2500)}
      fitKey={hut.id}
      maxFitZoom={13}
    />
  );
}
