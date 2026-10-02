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
import { HUT_ATTRIBUTION, HUT_OWNER_FILTERS, HUT_SOURCE_NOTE, HUT_TYPE_FILTERS, hutStatusBadge, hutSummaryLine } from "@/lib/huts/wording";
import { HutSummary } from "./HutDetails";
import type { MapTileConfig } from "@/lib/map/config";
import { hutFocusLayer, hutsLayer, type HutMapFeature } from "@/lib/map/layers/huts";
import { radiusLayer } from "@/lib/map/layers/radius";
import { bindLayer } from "@/lib/map/layers/types";

/** Fastlands-Norge. Brukes når siden åpnes uten et sted. */
const NORGE: LngLatBounds = [
  [4.0, 57.8],
  [31.5, 71.3],
];
/** Utsnittet rundt et sted siden åpnes med, når lenken hit ikke sier noe annet. */
const START_RADIUS_M = 15_000;
/** En hytte som ligger i selve utgangspunktet, er utgangspunktet — den får ingen avstand. */
const SAME_PLACE_M = 25;
/** Fra denne bredden står kartet ved siden av lista (Tailwind `lg`). */
const SIDE_BY_SIDE = "(min-width: 1024px)";
const LIST_LIMIT = 60;
const FETCH_DELAY_MS = 250;

interface HutExplorerProps {
  tiles: MapTileConfig;
  /** Punktet kartet åpnes rundt. */
  center: { lat: number; lng: number } | null;
  /**
   * Navnet på stedet `center` er, når brukeren kom fra et navngitt sted (en adresse eller en
   * hytte). Bare da vises avstander, og alltid med navnet: en avstand uten noe å måle fra,
   * sier ingenting. Kartutsnittet er aldri et utgangspunkt.
   */
  originName: string | null;
  /** Hvor langt ut fra `center` kartet viser fra start. */
  radiusM: number | null;
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
 *
 * Lista og kartet viser alltid det samme. Én hytte kan være valgt: raden er åpen med detaljene
 * rett under, og punktet er markert i kartet. Velges den i kartet, åpnes raden; velges raden,
 * markeres punktet. Flyttes kartet så hytta ikke lenger er i utsnittet, er den ikke valgt.
 */
export function HutExplorer({ tiles, center, originName, radiusM, initialHutId }: HutExplorerProps) {
  const origin = originName ? center : null;
  const [huts, setHuts] = useState<Hut[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [types, setTypes] = useState<HutType[]>([]);
  const [owners, setOwners] = useState<HutOwnerKind[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const [fit, setFit] = useState<{ bounds: LngLatBounds; key: string }>(() =>
    center
      ? { bounds: radiusBounds(center.lat, center.lng, radiusM ?? START_RADIUS_M), key: `sted:${center.lat},${center.lng}` }
      : { bounds: NORGE, key: "norge" },
  );

  const viewport = useRef<LngLatBounds | null>(null);
  const pendingSelect = useRef<string | null>(initialHutId);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  /** Settes når valget kommer fra kartet eller søket: da må raden letes fram i lista. */
  const scrollTo = useRef<string | null>(null);

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
            scrollTo.current = ventende;
            setSelectedId(ventende);
          } else {
            // Hytta som var valgt, er ikke lenger i utsnittet eller filteret: da er ingen valgt.
            // En åpen rad for en hytte kartet ikke viser, er et valg ingen kan se.
            setSelectedId((nå) => (nå && !body.huts.some((hut) => hut.id === nå) ? null : nå));
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
        .map((hut) => {
          const meter = origin ? distanceMeters(origin, { lat: hut.lat, lng: hut.lng }) : null;
          return { ...hut, distanceM: meter !== null && meter >= SAME_PLACE_M ? meter : null };
        })
        .sort((a, b) => (a.distanceM !== null && b.distanceM !== null ? a.distanceM - b.distanceM : a.name.localeCompare(b.name, "nb"))),
    [huts, origin],
  );

  const features = useMemo<HutMapFeature[]>(
    () => huts.map((hut) => ({ id: hut.id, type: hut.type, lng: hut.lng, lat: hut.lat })),
    [huts],
  );
  const layers = useMemo(
    () => [
      // Utgangspunktet og radien hyttene ble talt opp i, så «fra Storgata 1» kan ses i kartet.
      ...(origin ? [bindLayer(radiusLayer, { lat: origin.lat, lng: origin.lng, radiusM: radiusM ?? 0 })] : []),
      // Alle hyttene i utsnittet blir stående når én velges; den valgte tegnes i tillegg øverst,
      // utenfor klyngingen, så den aldri forsvinner inn i en klynge.
      bindLayer(hutsLayer, features),
      bindLayer(hutFocusLayer, features.find((hut) => hut.id === selectedId) ?? null),
    ],
    [features, origin, radiusM, selectedId],
  );

  /** Popupen i kartet er kort: navn, én linje, og veien til hyttesiden. Resten står i lista. */
  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const hut = withDistance.find((h) => h.id === id);
      if (!hut) return null;
      return {
        lngLat: [hut.lng, hut.lat],
        title: hut.name,
        lines: [hutSummaryLine(hut, originName ?? undefined)],
        href: buildHutHref(hut),
        linkLabel: "Se hyttesiden",
        // Ingen `minZoom`: kartet flytter seg bare når hytta er utenfor utsnittet, og zoomer
        // aldri. Utsnittet er også det lista viser, så et valg skal ikke bytte ut lista.
      };
    },
    [withDistance, originName],
  );

  // Lista viser de første, og alltid den valgte — også når den ligger lenger ned enn grensen.
  const listed = useMemo(() => {
    const første = withDistance.slice(0, LIST_LIMIT);
    const valgt = selectedId ? withDistance.find((hut) => hut.id === selectedId) : undefined;
    return valgt && !første.includes(valgt) ? [...første, valgt] : første;
  }, [withDistance, selectedId]);

  /** Valg i kartet: åpne raden og finn den fram i lista. Klikk utenfor et punkt lukker. */
  const selectFromMap = useCallback((id: string | null) => {
    scrollTo.current = id;
    setSelectedId(id);
  }, []);

  // Finn fram raden når valget kom fra kartet eller søket. Bare så langt som trengs
  // («nearest»), og bare når lista står ved siden av kartet: på smal skjerm ligger lista
  // under kartet, og å rulle dit ville tatt kartet brukeren nettopp trykket i, ut av syne.
  useEffect(() => {
    const id = scrollTo.current;
    if (!id || id !== selectedId) return;
    scrollTo.current = null;
    if (!window.matchMedia(SIDE_BY_SIDE).matches) return;
    const reduser = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rows.current.get(id)?.scrollIntoView({ block: "nearest", behavior: reduser ? "auto" : "smooth" });
  }, [selectedId, listed]);

  const goToHit = useCallback((hit: Hut) => {
    pendingSelect.current = hit.id;
    setFit({ bounds: radiusBounds(hit.lat, hit.lng, 3000), key: `treff:${hit.id}` });
  }, []);

  const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    // Smal skjerm: søk og filtre, så kartet, så lista. Bred skjerm: kartet står fast til høyre.
    <main className="lg:grid lg:grid-cols-[minmax(22rem,28rem)_1fr] lg:grid-rows-[auto_1fr]">
      <section className="px-5 pt-7 pb-5 sm:px-8 lg:col-start-1 lg:px-10 lg:pt-10 lg:pb-0">
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
      </section>

      <div className="relative mx-5 h-[52vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none lg:border-0 lg:border-l">
        <AreaMap
          tiles={tiles}
          title={`Kart over hytter og koier${total ? `, ${total} i utsnittet` : ""}`}
          layers={layers}
          fitBounds={fit.bounds}
          fitKey={fit.key}
          maxFitZoom={12}
          selectedId={selectedId}
          onSelect={selectFromMap}
          onViewportChange={onViewportChange}
          popupFor={popupFor}
          popupTakesFocus={false}
          onNavigate={(href) => router.push(href)}
        />
      </div>

      <section className="px-5 pt-5 pb-10 sm:px-8 lg:col-start-1 lg:px-10 lg:pb-16">
        <p className="text-[15px] font-medium text-ink" role="status">
          {status === "loading" && "Henter hytter …"}
          {status === "failed" && "Vi får ikke hentet hyttene akkurat nå."}
          {status === "ready" &&
            (total === 0
              ? "Ingen hytter eller koier i dette utsnittet."
              : `${total} ${total === 1 ? "hytte eller koie" : "hytter og koier"} i utsnittet${truncated ? ` — viser ${huts.length}` : ""}`)}
        </p>
        {originName && listed.length > 0 && (
          <p className="mt-0.5 text-[13px] text-muted">Nærmest {originName} først. Avstand i luftlinje.</p>
        )}

        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface empty:hidden">
          {listed.map((hut) => {
            const open = selectedId === hut.id;
            return (
              <li
                key={hut.id}
                ref={(node) => {
                  if (node) rows.current.set(hut.id, node);
                  else rows.current.delete(hut.id);
                }}
                className={`scroll-mt-20 scroll-mb-4 border-l-[3px] ${open ? "border-l-accent bg-accent-soft/40" : "border-l-transparent"}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(open ? null : hut.id)}
                  aria-expanded={open}
                  aria-controls={open ? `hytte-${hut.id}` : undefined}
                  className={`flex w-full items-center gap-3 py-2.5 pr-3.5 pl-[13px] text-left ${open ? "" : "hover:bg-ink/[0.03]"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] text-ink ${open ? "font-semibold" : "font-medium"}`}>{hut.name}</span>
                    <span className="block text-[13px] text-muted">{hutSummaryLine(hut, originName ?? undefined)}</span>
                    {hutStatusBadge(hut.accessStatus) && (
                      <span className="mt-0.5 block text-[13px] font-medium text-ink">{hutStatusBadge(hut.accessStatus)}</span>
                    )}
                  </span>
                  <Chevron open={open} />
                </button>
                {open && (
                  <div id={`hytte-${hut.id}`} className="pr-3.5 pb-3.5 pl-[13px]">
                    <HutSummary hut={hut} />
                    <Link href={buildHutHref(hut)} className="mt-3 inline-block text-[14px] font-medium text-accent hover:underline">
                      Se hyttesiden
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {withDistance.length > LIST_LIMIT && (
          <p className="mt-2 text-[13px] text-muted">Listen viser de {LIST_LIMIT} første. Zoom inn for å se resten.</p>
        )}

        <p className="mt-6 text-[13px] leading-snug text-muted">
          {HUT_SOURCE_NOTE} {HUT_ATTRIBUTION}.
        </p>
      </section>
    </main>
  );
}

/** Pilen som viser at raden kan åpnes, og at en åpen rad kan lukkes ved å trykke på den igjen. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
    >
      <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

/** Navnesøk. Et treff flytter kartet dit og velger hytta. Treffene har ingen avstand. */
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
