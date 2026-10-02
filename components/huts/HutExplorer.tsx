"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import type { HutApiResponse } from "@/app/api/hytter/route";
import type { LngLatBounds } from "@/lib/geo/bounds";
import { distanceMeters, radiusBounds } from "@/lib/geo/radius";
import { buildHutHref } from "@/lib/huts/href";
import type { Hut } from "@/lib/huts/queries";
import type { HutOwnerKind, HutType } from "@/lib/huts/types";
import { HUT_ATTRIBUTION, HUT_OWNER_FILTERS, HUT_SOURCE_NOTE, HUT_TYPE_FILTERS, hutSummaryLine } from "@/lib/huts/wording";
import { HutDetails } from "./HutDetails";
import type { MapTileConfig } from "@/lib/map/config";
import { hutsLayer, type HutMapFeature } from "@/lib/map/layers/huts";
import { bindLayer } from "@/lib/map/layers/types";

/** Fastlands-Norge. Brukes når siden åpnes uten et sted. */
const NORGE: LngLatBounds = [
  [4.0, 57.8],
  [31.5, 71.3],
];
/** Utsnittet rundt et sted siden åpnes med: stort nok til å vise de nærmeste hyttene. */
const START_RADIUS_M = 15_000;
/** Zoomnivået en valgt hytte vises på når kartet står lenger ute. */
const FOCUS_ZOOM = 11;
const LIST_LIMIT = 60;
const FETCH_DELAY_MS = 250;

interface HutExplorerProps {
  tiles: MapTileConfig;
  /** Stedet brukeren kom fra (adressen på områdesiden). Gir avstand og startutsnitt. */
  origin: { lat: number; lng: number } | null;
  /** Hytta som skal være valgt når siden åpnes. */
  initialHutId: string | null;
}

type Status = "loading" | "ready" | "failed";

/**
 * Utforsk hytter og koier i kart.
 *
 * Kartet spør etter hyttene i utsnittet hver gang det flyttes, med filtrene som er valgt.
 * Det samme oppslaget fungerer derfor fra ett dalføre til hele landet: serveren begrenser
 * antallet, og kartlaget klynger det som ligger tett.
 */
export function HutExplorer({ tiles, origin, initialHutId }: HutExplorerProps) {
  const [huts, setHuts] = useState<Hut[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [types, setTypes] = useState<HutType[]>([]);
  const [owners, setOwners] = useState<HutOwnerKind[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const [fit, setFit] = useState<{ bounds: LngLatBounds; key: string }>(() =>
    origin
      ? { bounds: radiusBounds(origin.lat, origin.lng, START_RADIUS_M), key: `sted:${origin.lat},${origin.lng}` }
      : { bounds: NORGE, key: "norge" },
  );

  const viewport = useRef<LngLatBounds | null>(null);
  const pendingSelect = useRef<string | null>(initialHutId);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    (bounds: LngLatBounds) => {
      const id = ++requestId.current;
      const query = new URLSearchParams({ bbox: [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]].map((v) => v.toFixed(5)).join(",") });
      for (const type of types) query.append("type", type);
      for (const owner of owners) query.append("eier", owner);

      fetch(`/api/hytter?${query.toString()}`)
        .then((response) => response.json() as Promise<HutApiResponse>)
        .then((body) => {
          // Et eldre svar skal ikke overskrive et nyere utsnitt.
          if (id !== requestId.current) return;
          if (!("huts" in body)) {
            setStatus("failed");
            return;
          }
          setHuts(body.huts);
          setTotal(body.total);
          setTruncated(body.truncated);
          setStatus("ready");
          const ventende = pendingSelect.current;
          if (ventende && body.huts.some((hut) => hut.id === ventende)) {
            pendingSelect.current = null;
            setSelectedId(ventende);
          }
        })
        .catch(() => {
          if (id === requestId.current) setStatus("failed");
        });
    },
    [types, owners],
  );

  const onViewportChange = useCallback(
    (bounds: LngLatBounds) => {
      viewport.current = bounds;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => load(bounds), FETCH_DELAY_MS);
    },
    [load],
  );

  // Nytt filter: spør på nytt for utsnittet kartet allerede står i.
  useEffect(() => {
    if (viewport.current) load(viewport.current);
  }, [load]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const withDistance = useMemo(
    () =>
      huts
        .map((hut) => ({ ...hut, distanceM: origin ? distanceMeters(origin, { lat: hut.lat, lng: hut.lng }) : null }))
        .sort((a, b) => (a.distanceM !== null && b.distanceM !== null ? a.distanceM - b.distanceM : a.name.localeCompare(b.name, "nb"))),
    [huts, origin],
  );

  const features = useMemo<HutMapFeature[]>(
    () => huts.map((hut) => ({ id: hut.id, type: hut.type, lng: hut.lng, lat: hut.lat })),
    [huts],
  );
  const layers = useMemo(() => [bindLayer(hutsLayer, features)], [features]);

  /** Popupen i kartet er kort: navn, én linje, og veien til detaljene. Resten står i panelet. */
  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const hut = withDistance.find((h) => h.id === id);
      if (!hut) return null;
      return {
        lngLat: [hut.lng, hut.lat],
        title: hut.name,
        lines: [hutSummaryLine(hut)],
        href: buildHutHref(hut),
        linkLabel: "Se hytta",
        minZoom: FOCUS_ZOOM,
      };
    },
    [withDistance],
  );

  const selected = useMemo(() => withDistance.find((hut) => hut.id === selectedId) ?? null, [withDistance, selectedId]);

  const goToHit = useCallback((hit: Hut) => {
    pendingSelect.current = hit.id;
    setFit({ bounds: radiusBounds(hit.lat, hit.lng, 3000), key: `treff:${hit.id}` });
  }, []);

  const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <main className="lg:grid lg:grid-cols-[minmax(22rem,28rem)_1fr]">
      <section className="px-5 pt-7 pb-5 sm:px-8 lg:px-10 lg:pt-10 lg:pb-16">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">Hytter og koier</h1>
        <p className="mt-2 text-[15px] text-muted">
          Turisthytter, ubetjente hytter og rastebuer. Flytt kartet for å se et annet område.
        </p>

        <HutSearch onSelect={goToHit} />

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Type</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {HUT_TYPE_FILTERS.map((filter) => (
              <Chip key={filter.value} active={types.includes(filter.value)} onClick={() => setTypes((nå) => toggle(nå, filter.value))}>
                {filter.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Eier</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {HUT_OWNER_FILTERS.map((filter) => (
              <Chip key={filter.value} active={owners.includes(filter.value)} onClick={() => setOwners((nå) => toggle(nå, filter.value))}>
                {filter.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <p className="mt-6 text-[15px] font-medium text-ink" role="status">
          {status === "loading" && "Henter hytter …"}
          {status === "failed" && "Vi får ikke hentet hyttene akkurat nå."}
          {status === "ready" &&
            (total === 0
              ? "Ingen hytter eller koier i dette utsnittet."
              : `${total} ${total === 1 ? "hytte eller koie" : "hytter og koier"} i utsnittet${truncated ? ` — viser ${huts.length}` : ""}`)}
        </p>

        {selected && (
          <section aria-label="Valgt hytte" className="mt-3 rounded-2xl border border-line-strong bg-surface px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{selected.name}</h2>
              <button type="button" onClick={() => setSelectedId(null)} className="text-[13px] text-muted hover:text-ink">
                Lukk
              </button>
            </div>
            <div className="mt-2">
              <HutDetails hut={selected} compact />
            </div>
            <Link href={buildHutHref(selected)} className="mt-2 inline-block text-[14px] font-medium text-accent hover:underline">
              Egen side for hytta
            </Link>
          </section>
        )}

        <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface empty:hidden">
          {withDistance.slice(0, LIST_LIMIT).map((hut) => (
            <li key={hut.id}>
              <button
                type="button"
                onClick={() => setSelectedId(hut.id)}
                aria-pressed={selectedId === hut.id}
                className={`block w-full px-4 py-2.5 text-left hover:bg-ink/[0.03] ${selectedId === hut.id ? "bg-ink/[0.04]" : ""}`}
              >
                <span className="block text-[15px] font-medium text-ink">{hut.name}</span>
                <span className="block text-[13px] text-muted">{hutSummaryLine(hut)}</span>
              </button>
            </li>
          ))}
        </ul>
        {withDistance.length > LIST_LIMIT && (
          <p className="mt-2 text-[13px] text-muted">Listen viser de {LIST_LIMIT} første. Zoom inn for å se resten.</p>
        )}

        <p className="mt-6 text-[13px] leading-snug text-muted">
          {HUT_SOURCE_NOTE} {HUT_ATTRIBUTION}.
        </p>
      </section>

      <div className="relative mx-5 mb-10 h-[60vh] min-h-80 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:sticky lg:top-16 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none lg:border-0 lg:border-l">
        <AreaMap
          tiles={tiles}
          title={`Kart over hytter og koier${total ? `, ${total} i utsnittet` : ""}`}
          layers={layers}
          fitBounds={fit.bounds}
          fitKey={fit.key}
          maxFitZoom={12}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onViewportChange={onViewportChange}
          popupFor={popupFor}
          onNavigate={(href) => router.push(href)}
        />
      </div>
    </main>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-[13px] font-medium ${
        active ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}

/** Navnesøk. Et treff flytter kartet dit og velger hytta. */
function HutSearch({ onSelect }: { onSelect: (hit: Hut) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hut[] | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/hytter?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<HutApiResponse>)
        .then((body) => setHits("hits" in body ? body.hits : []))
        .catch(() => {});
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  // Treffene gjelder bare så lenge søkeordet er langt nok; et tømt felt viser ingen liste.
  const synlige = q.trim().length < 2 ? null : hits;

  return (
    <div className="mt-5">
      <label htmlFor="hyttesok" className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        Søk etter hytte
      </label>
      <input
        id="hyttesok"
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Navn på hytte eller koie"
        autoComplete="off"
        className="mt-2 block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {synlige !== null && (
        <ul className="mt-1 divide-y divide-line rounded-xl border border-line bg-surface">
          {synlige.length === 0 && <li className="px-3.5 py-2 text-[13px] text-muted">Ingen treff.</li>}
          {synlige.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="block w-full px-3.5 py-2 text-left hover:bg-ink/[0.03]"
                onClick={() => {
                  onSelect(hit);
                  setQ("");
                }}
              >
                <span className="block text-[15px] text-ink">{hit.name}</span>
                <span className="block text-[13px] text-muted">{hutSummaryLine(hit)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
