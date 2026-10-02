"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import { radiusBounds } from "@/lib/geo/radius";
import { buildHutHref } from "@/lib/huts/href";
import type { HutOwnerKind, HutType } from "@/lib/huts/types";
import { hutSummaryLine } from "@/lib/huts/wording";
import type { MapTileConfig } from "@/lib/map/config";
import { hutFocusLayer, hutsLayer } from "@/lib/map/layers/huts";
import { bindLayer } from "@/lib/map/layers/types";

export interface HutMapPoint {
  id: string;
  name: string;
  type: HutType;
  ownerKind: HutOwnerKind;
  lat: number;
  lng: number;
  /** Avstand fra hytta siden handler om. Bare satt på naboene. */
  distanceM?: number | null;
}

/** Utsnittet rundt hytta: minst så mye at den kan plasseres i terrenget, aldri mer enn dette. */
const MIN_RADIUS_M = 2_500;
const MAX_RADIUS_M = 10_000;
/** Så mange av naboene utsnittet strekker seg etter. Resten vises når kartet flyttes. */
const NEIGHBOURS_IN_VIEW = 3;

/** Radien kartet åpnes med: stor nok til de nærmeste naboene, men ikke så stor at hytta blir et punkt. */
export function hutMapRadius(neighbours: readonly { distanceM?: number | null }[]): number {
  const avstander = neighbours.map((n) => n.distanceM).filter((m): m is number => typeof m === "number").sort((a, b) => a - b);
  const ytterst = avstander[Math.min(NEIGHBOURS_IN_VIEW, avstander.length) - 1];
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, (ytterst ?? 0) * 1.15));
}

/**
 * Kartet på hyttesiden: hytta, tydelig markert, og de samme nabohyttene som står i lista
 * «Andre hytter i nærheten».
 *
 * Et trykk på en nabo viser navn og type med lenke til hyttesiden. Siden byttes ikke før
 * brukeren selv følger lenken.
 */
export function HutPointMap({ hut, neighbours, tiles }: { hut: HutMapPoint; neighbours: readonly HutMapPoint[]; tiles: MapTileConfig }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const alle = useMemo(() => [hut, ...neighbours], [hut, neighbours]);
  const layers = useMemo(
    () => [
      bindLayer(hutsLayer, alle.map(({ id, type, lat, lng }) => ({ id, type, lat, lng }))),
      bindLayer(hutFocusLayer, { id: hut.id, type: hut.type, lat: hut.lat, lng: hut.lng }),
    ],
    [alle, hut],
  );

  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const valgt = alle.find((h) => h.id === id);
      if (!valgt) return null;
      const linje = hutSummaryLine({ ...valgt, distanceM: null });
      // Hytta siden handler om, lenker ikke til seg selv.
      if (valgt.id === hut.id) return { lngLat: [valgt.lng, valgt.lat], title: valgt.name, lines: [linje] };
      return { lngLat: [valgt.lng, valgt.lat], title: valgt.name, lines: [linje], href: buildHutHref(valgt), linkLabel: "Se hyttesiden" };
    },
    [alle, hut.id],
  );

  return (
    <AreaMap
      tiles={tiles}
      title={`Kart over ${hut.name}${neighbours.length > 0 ? ` og ${neighbours.length} andre hytter i nærheten` : ""}`}
      layers={layers}
      fitBounds={radiusBounds(hut.lat, hut.lng, hutMapRadius(neighbours))}
      fitKey={hut.id}
      maxFitZoom={13}
      selectedId={selectedId}
      onSelect={setSelectedId}
      popupFor={popupFor}
      onNavigate={(href) => router.push(href)}
    />
  );
}
