"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { sjekkAktsomhetAction } from "@/app/admin/research/utforsk/actions";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import { NORGE } from "@/lib/admin/kart-bounds";
import { AKTSOMHET_TEKST, type Aktsomhet } from "@/lib/admin/explore/aktsomhet";
import { utforskHref } from "@/lib/admin/explore/href";
import type { ExploreFeature, LngLatBox } from "@/lib/admin/explore/types";
import type { LngLatBounds } from "@/lib/geo/bounds";
import type { MapTileConfig } from "@/lib/map/config";
import { EXPLORE_COLOR, exploreLayer } from "@/lib/map/layers/explore";
import { bindLayer } from "@/lib/map/layers/types";

export interface DatasettInfo {
  id: string;
  label: string;
  description: string;
  unit: { one: string; many: string };
  needsArea: boolean;
  pointCheck: "kvikkleire_aktsomhet" | null;
}

/** Ett aktivt lag: datasettet, treffene og hvordan laget fjernes. */
export interface Lagvisning {
  dataset: DatasettInfo;
  features: ExploreFeature[];
  /** Hvor mange som finnes i området. Større enn `features.length` når svaret er kuttet. */
  total: number;
  /** Laget kunne ikke hentes. Det andre laget vises likevel. */
  feil: string | null;
  /** Laget er for stort uten sted eller utsnitt. */
  trengerOmrade: boolean;
  fjernHref: string;
}

/** Hva siden har kommet fram til. Hver tilstand har sin egen, ærlige melding. */
export type UtforskVisning =
  | { status: "tom" }
  | { status: "ukjent_datasett" }
  | { status: "ukjent_sted"; dataset: DatasettInfo; tekst: string }
  | { status: "flertydig_sted"; dataset: DatasettInfo; tekst: string; valg: { nummer: string; navn: string; fylke: string }[] }
  | { status: "trenger_omrade"; dataset: DatasettInfo; utsnitt: LngLatBox | null; maksKm: number }
  | { status: "feil"; dataset: DatasettInfo; melding: string }
  | {
      status: "treff";
      omrade: { kind: "kommune" | "fylke" | "utsnitt"; navn: string | null; fylke: string | null; box: LngLatBox } | null;
      /** Ett eller to lag. Det første er hovedlaget fra søket. */
      lag: Lagvisning[];
      /** Datasettene som kan legges til som lag nummer to. Tom når to lag er aktive. */
      leggTil: { id: string; label: string; href: string }[];
      /** Adressen for «Søk i kartutsnittet», med `__UTSNITT__` der utsnittet skal stå. */
      utsnittHref: string;
      maksKm: number;
    };

/** Hvor mange rader listen viser om gangen. Kartet tegner alle. */
const LISTE_SIDE = 60;

type Punktsjekk =
  | { status: "laster"; lat: number; lng: number }
  | { status: "ok"; lat: number; lng: number; aktsomhet: Aktsomhet }
  | { status: "feil"; lat: number; lng: number; melding: string };

const boks = (b: LngLatBox): LngLatBounds => [
  [b.minLng, b.minLat],
  [b.maxLng, b.maxLat],
];

/**
 * Utforsk data: søk, kart og liste for ett datasett om gangen.
 *
 * Kartet er hovedflaten. Listen viser de samme treffene, og de to deler valgt objekt: et trykk
 * i kartet eller i listen åpner samme detaljpanel. Komponenten henter ikke data selv — siden
 * gjør det på serveren — bortsett fra aktsomhetssjekken for ett punkt.
 */
export function Datautforsker({
  q,
  tiles,
  forslag,
  visning,
}: {
  q: string;
  tiles: MapTileConfig;
  forslag: { id: string; label: string; description: string }[];
  visning: UtforskVisning;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [valgt, setValgt] = useState<string | null>(null);
  const [vist, setVist] = useState<Record<string, number>>({});
  const [punkt, setPunkt] = useState<Punktsjekk | null>(null);
  /** Flere objekter under samme trykk. Brukeren velger hvilket. */
  const [underMarkor, setUnderMarkor] = useState<string[]>([]);
  const [utsnitt, setUtsnitt] = useState<LngLatBounds | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const lagene = visning.status === "treff" ? visning.lag : INGEN_LAG;
  // Ett kartlag for alle objektene. Hovedlaget tegnes sist, og ligger dermed øverst.
  const features = useMemo(() => [...lagene].reverse().flatMap((l) => l.features), [lagene]);
  const datasett = visning.status === "treff" ? lagene.map((l) => l.dataset) : "dataset" in visning ? [visning.dataset] : [];
  const valgtFeature = features.find((f) => f.id === valgt) ?? null;
  const punktsjekk = datasett.some((d) => d.pointCheck === "kvikkleire_aktsomhet");
  const kreverOmrade = datasett.some((d) => d.needsArea);

  const lag = useMemo(() => [bindLayer(exploreLayer, features)], [features]);

  // Kartet følger området søket gjelder. Uten område: treffene, ellers hele landet.
  const fitBounds: LngLatBounds = useMemo(() => {
    if (visning.status === "treff" && visning.omrade) return boks(visning.omrade.box);
    if (visning.status === "trenger_omrade" && visning.utsnitt) return boks(visning.utsnitt);
    if (features.length > 0) {
      const lng = features.map((f) => f.center[0]);
      const lat = features.map((f) => f.center[1]);
      return [
        [Math.min(...lng) - 0.2, Math.min(...lat) - 0.1],
        [Math.max(...lng) + 0.2, Math.max(...lat) + 0.1],
      ];
    }
    return NORGE;
  }, [visning, features]);
  // Kartet flytter seg når området endres, ikke når lag legges til, fjernes eller byttes: da
  // skal brukeren bli stående der hun så. Uten område følger kartet hovedlagets treff.
  const fitKey =
    visning.status === "treff"
      ? visning.omrade
        ? `omrade|${visning.omrade.navn ?? JSON.stringify(visning.omrade.box)}`
        : `lag|${visning.lag[0]?.dataset.id}`
      : `${visning.status}|${q}`;

  const velg = useCallback((id: string | null) => {
    setValgt(id);
    setUnderMarkor([]);
    if (id) setPunkt(null);
  }, []);

  /** Trykk i listen: samme valg som i kartet, og panelet hentes fram. */
  const velgFraListe = useCallback(
    (id: string) => {
      velg(id);
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    [velg],
  );

  // minZoom: et valgt objekt skal kunne ses. En sone er noen hundre meter, og forsvinner på
  // kommunenivå — kartet zoomer derfor inn til den når den velges.
  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const f = features.find((x) => x.id === id);
      return f ? { lngLat: f.center, title: f.title, lines: [lagOgType(f), f.summary].filter((l): l is string => !!l), minZoom: f.geometry.type === "Point" ? 12 : 13 } : null;
    },
    [features],
  );

  /**
   * Trykk i kartflaten. Ligger ett objekt under punktet, velges det. Ligger flere der — to lag
   * oppå hverandre — får brukeren velge. Ligger ingen der, og et av lagene er kvikkleire, sjekkes
   * punktet mot NVEs aktsomhetskart, som vi ikke har som flater.
   */
  const trykkIKart = useCallback(
    (position: { lat: number; lng: number }, covering: string[]) => {
      const unike = [...new Set(covering)];
      if (unike.length === 1) {
        velg(unike[0]!);
        return;
      }
      setValgt(null);
      setPunkt(null);
      setUnderMarkor(unike);
      if (unike.length > 1 || !punktsjekk) return;

      setPunkt({ status: "laster", ...position });
      void sjekkAktsomhetAction(position.lat, position.lng).then((svar) =>
        setPunkt((nå) =>
          nå && nå.lat === position.lat && nå.lng === position.lng
            ? svar.status === "ok"
              ? { status: "ok", ...position, aktsomhet: svar.aktsomhet }
              : { status: "feil", ...position, melding: svar.melding }
            : nå,
        ),
      );
    },
    [velg, punktsjekk],
  );

  const utsnittKm = utsnitt
    ? (utsnitt[1][0] - utsnitt[0][0]) * 111.32 * Math.cos((((utsnitt[0][1] + utsnitt[1][1]) / 2) * Math.PI) / 180)
    : null;
  const maksKm = visning.status === "treff" || visning.status === "trenger_omrade" ? visning.maksKm : 0;
  const kanSøkeIUtsnitt = kreverOmrade && utsnitt !== null && utsnittKm !== null && utsnittKm <= maksKm;
  const søkIUtsnitt = () => {
    const hoved = datasett[0];
    if (!utsnitt || !hoved) return;
    const verdi = [utsnitt[0][0], utsnitt[0][1], utsnitt[1][0], utsnitt[1][1]].map((n) => n.toFixed(4)).join(",");
    const mal = visning.status === "treff" ? visning.utsnittHref : utforskHref({ q: hoved.label.toLowerCase(), utsnitt: "__UTSNITT__" });
    startTransition(() => router.replace(mal.replace("__UTSNITT__", encodeURIComponent(verdi)), { scroll: false }));
  };

  return (
    // Mobil: søk, kart, så panel og liste. Desktop: søk og liste i venstre kolonne, kartet til høyre.
    <main className="flex flex-col lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(22rem,26rem)_1fr] lg:grid-rows-[auto_minmax(0,1fr)]">
      <div className="order-1 px-5 pt-8 sm:px-8 lg:order-none lg:col-start-1 lg:row-start-1">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Drift</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Utforsk data</h1>
        <p className="mt-2 text-[15px] text-muted">Søk i NaboRadars kartlag og registre.</p>

        <form className="mt-5" role="search" action="/admin/research/utforsk">
          <label htmlFor="utforsk-q" className="sr-only">
            Søk i datasett
          </label>
          <input
            id="utforsk-q"
            type="search"
            name="q"
            defaultValue={q}
            autoComplete="off"
            placeholder={'Søk etter f.eks. "kvikkleire Oslo" eller "datasenter"'}
            className="w-full rounded-full border border-line bg-surface px-5 py-3.5 text-[16px] text-ink outline-none focus:border-accent"
          />
        </form>

        <div className={`mt-5 ${pending ? "opacity-50" : ""}`}>
          <Status visning={visning} forslag={forslag} />
        </div>

        {visning.status === "treff" && <Lagrad lag={visning.lag} leggTil={visning.leggTil} />}

        {kreverOmrade && (visning.status === "treff" || visning.status === "trenger_omrade") && (
          <div className="mt-3">
            <button
              type="button"
              onClick={søkIUtsnitt}
              disabled={!kanSøkeIUtsnitt || pending}
              className="rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-medium text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Søk i kartutsnittet
            </button>
            {!kanSøkeIUtsnitt && utsnitt && (
              <span className="ml-3 text-[13px] text-muted">Zoom inn til utsnittet er under {maksKm} km bredt.</span>
            )}
          </div>
        )}

      </div>

      <div className="order-3 flex flex-col px-5 pb-10 sm:px-8 lg:order-none lg:col-start-1 lg:row-start-2 lg:overflow-y-auto">
        <div ref={panelRef} className="mt-5 scroll-mt-4">
          {valgtFeature ? (
            <Detaljpanel feature={valgtFeature} lukk={() => setValgt(null)} />
          ) : underMarkor.length > 1 ? (
            <Velgpanel features={underMarkor.flatMap((id) => features.find((f) => f.id === id) ?? [])} velg={velg} lukk={() => setUnderMarkor([])} />
          ) : punkt ? (
            <Punktpanel punkt={punkt} lukk={() => setPunkt(null)} />
          ) : null}
        </div>

        {lagene.map((lag) => (
          <Lagliste
            key={lag.dataset.id}
            lag={lag}
            visOverskrift={lagene.length > 1}
            vist={vist[lag.dataset.id] ?? LISTE_SIDE}
            valgt={valgt}
            velg={velgFraListe}
            mer={() => setVist((n) => ({ ...n, [lag.dataset.id]: (n[lag.dataset.id] ?? LISTE_SIDE) + LISTE_SIDE }))}
          />
        ))}

        <Link href="/admin/research" className="mt-8 text-[15px] font-medium text-accent hover:underline">
          Til research
        </Link>
      </div>

      <div className="relative order-2 mx-5 mt-5 h-[55vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:mx-8 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:m-0 lg:h-auto lg:rounded-none lg:border-0 lg:border-l">
        <AreaMap
          tiles={tiles}
          title={datasett.length > 0 ? `Kart over ${datasett.map((d) => d.label.toLowerCase()).join(" og ")}, ${features.length} objekter` : "Kart over Norge"}
          layers={lag}
          fitBounds={fitBounds}
          fitKey={fitKey}
          maxFitZoom={14}
          selectedId={valgt}
          onSelect={velg}
          onPropertyClick={trykkIKart}
          propertyLookupActive
          onViewportChange={setUtsnitt}
          popupFor={popupFor}
          popupTakesFocus={false}
        />
        {punktsjekk && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[13px] text-muted">
            <span className="rounded-full bg-surface/90 px-3 py-1.5">Trykk i kartet for å sjekke aktsomhetsområde i et punkt</span>
          </p>
        )}
      </div>
    </main>
  );
}

const INGEN_LAG: Lagvisning[] = [];

/** «Plansaker · Varslet planoppstart». Er laget og typen samme ord, står det én gang. */
const lagOgType = (f: ExploreFeature) => (f.datasetLabel.toLowerCase() === f.kind.toLowerCase() ? f.datasetLabel : `${f.datasetLabel} · ${f.kind}`);

/** De aktive lagene som brikker med ×, og «Legg til lag» når det er plass til ett til. */
function Lagrad({ lag, leggTil }: { lag: Lagvisning[]; leggTil: { id: string; label: string; href: string }[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {lag.map((l) => (
        <span key={l.dataset.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pr-0.5 pl-3 text-[14px] text-ink">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: farge(l) }} />
          {l.dataset.label}
          <Link href={l.fjernHref} aria-label={`Fjern laget ${l.dataset.label}`} className="grid size-8 place-items-center rounded-full text-[16px] leading-none text-muted hover:bg-ink/[0.06] hover:text-ink">
            ×
          </Link>
        </span>
      ))}
      {leggTil.length > 0 && (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border border-dashed border-line-strong px-3 py-1.5 text-[14px] font-medium text-ink hover:border-ink [&::-webkit-details-marker]:hidden">
            + Legg til lag
          </summary>
          <ul className="absolute z-20 mt-1.5 min-w-48 rounded-xl border border-line bg-surface py-1.5 shadow-pop">
            {leggTil.map((d) => (
              <li key={d.id}>
                <Link href={d.href} className="block px-4 py-2 text-[14px] text-ink hover:bg-ink/[0.04]">
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Fargen laget har i kartet: den første objekttypen, ellers datasettets egen. */
const LAGFARGE: Record<string, keyof typeof EXPLORE_COLOR> = {
  plansaker: "plansak",
  kvikkleire: "kvikkleire_sone",
  kraftnett: "kraftledning",
  "forurenset-grunn": "forurenset_grunn",
  datasenter: "datasenter",
};
const farge = (lag: Lagvisning) => EXPLORE_COLOR[lag.features[0]?.style ?? LAGFARGE[lag.dataset.id] ?? "datasenter"];

/** Treffene i ett lag: telling, eventuell melding og listen. */
function Lagliste({
  lag,
  visOverskrift,
  vist,
  valgt,
  velg,
  mer,
}: {
  lag: Lagvisning;
  visOverskrift: boolean;
  vist: number;
  valgt: string | null;
  velg: (id: string) => void;
  mer: () => void;
}) {
  const { features, total, dataset } = lag;
  return (
    <section className="mt-4" aria-label={dataset.label}>
      {visOverskrift && (
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: farge(lag) }} />
          {dataset.label} · {tellTekst(lag)}
        </h3>
      )}
      {lag.feil && <p className="mt-2 rounded-xl bg-danger-soft px-3 py-2 text-[14px] text-danger">Kunne ikke hente {dataset.label.toLowerCase()}: {lag.feil}</p>}
      {lag.trengerOmrade && (
        <p className="mt-2 rounded-xl border border-dashed border-line-strong px-3 py-2 text-[14px] text-ink">
          {dataset.label} er for stort til å vises for hele landet. Legg til et sted i søket, eller zoom inn og søk i kartutsnittet.
        </p>
      )}
      {/* Aldri kuttet i stillhet: nås taket, står det her. */}
      {features.length < total && (
        <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-[14px] text-ink">
          Viser de første {features.length.toLocaleString("nb-NO")} av {total.toLocaleString("nb-NO")} treff. Zoom inn eller avgrens området.
        </p>
      )}
      {features.length > 0 && (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {features.slice(0, vist).map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => velg(f.id)}
                aria-pressed={valgt === f.id}
                className={`flex w-full items-start gap-3 px-2 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  valgt === f.id ? "bg-accent-soft" : "hover:bg-ink/[0.03]"
                }`}
              >
                <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: EXPLORE_COLOR[f.style] }} />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-ink [overflow-wrap:anywhere]">{f.title}</span>
                  <span className="block text-[13px] text-muted">{[f.kind, f.place].filter(Boolean).join(" · ")}</span>
                  {f.summary && <span className="block text-[13px] text-muted">{f.summary}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {features.length > vist && (
        <button type="button" onClick={mer} className="mt-3 text-[15px] font-medium text-accent hover:underline">
          Vis flere ({features.length - vist} til)
        </button>
      )}
    </section>
  );
}

/** Antallet i laget. Et lag som ikke er lest, har ikke «0» — det har ikke noe tall. */
const tellTekst = (lag: Lagvisning) =>
  lag.feil
    ? `${lag.dataset.unit.many} ikke hentet`
    : lag.trengerOmrade
      ? `${lag.dataset.unit.many} ikke vist`
      : `${lag.total.toLocaleString("nb-NO")} ${lag.total === 1 ? lag.dataset.unit.one : lag.dataset.unit.many}`;

/** Flere objekter under samme trykk i kartet. Ett panel om gangen: brukeren velger. */
function Velgpanel({ features, velg, lukk }: { features: ExploreFeature[]; velg: (id: string) => void; lukk: () => void }) {
  return (
    <section aria-label="Flere objekter her" className="rounded-2xl border border-line bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-medium text-ink">{features.length} objekter under punktet. Hvilket vil du se?</h2>
        <button type="button" onClick={lukk} aria-label="Lukk" className="shrink-0 rounded-full px-2 text-[18px] leading-none text-muted hover:text-ink">
          ×
        </button>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {features.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => velg(f.id)} className="flex w-full items-start gap-3 py-2 text-left hover:bg-ink/[0.03]">
              <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: EXPLORE_COLOR[f.style] }} />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-ink [overflow-wrap:anywhere]">{f.title}</span>
                <span className="block text-[13px] text-muted">{lagOgType(f)}</span>
                {f.summary && <span className="block text-[13px] text-muted">{f.summary}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Datasettene det går an å søke i, som lenker. */
function Forslagsliste({ forslag }: { forslag: { id: string; label: string; description: string }[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {forslag.map((d) => (
        <li key={d.id}>
          <Link href={`/admin/research/utforsk?q=${encodeURIComponent(d.label.toLowerCase())}`} className="text-[15px] font-medium text-accent hover:underline">
            {d.label}
          </Link>
          <span className="block text-[13px] text-muted">{d.description}</span>
        </li>
      ))}
    </ul>
  );
}

/** Overskrift, telling og meldinger over listen. */
function Status({ visning, forslag }: { visning: UtforskVisning; forslag: { id: string; label: string; description: string }[] }) {
  switch (visning.status) {
    case "tom":
      return (
        <div>
          <p className="text-[15px] text-ink">Skriv hva du vil finne, og gjerne hvor.</p>
          <Forslagsliste forslag={forslag} />
        </div>
      );
    case "ukjent_datasett":
      return (
        <div>
          <p className="rounded-2xl border border-dashed border-line-strong px-4 py-3 text-[15px] text-ink">Fant ikke et datasett som matcher søket.</p>
          <p className="mt-3 text-[13px] text-muted">Datasettene du kan søke i:</p>
          <Forslagsliste forslag={forslag} />
        </div>
      );
    case "ukjent_sted":
      return (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-3 text-[15px] text-ink">
          Fant ingen kommune eller fylke som heter «{visning.tekst}». Søk på {visning.dataset.label.toLowerCase()} og et kommune- eller fylkesnavn.
        </p>
      );
    case "flertydig_sted":
      return (
        <div>
          <p className="text-[15px] text-ink">Flere kommuner heter «{visning.tekst}». Hvilken mener du?</p>
          <ul className="mt-2 space-y-1.5">
            {visning.valg.map((v) => (
              <li key={v.nummer}>
                <Link
                  href={`/admin/research/utforsk?${new URLSearchParams({ q: `${visning.dataset.label.toLowerCase()} ${v.navn}`, kommune: v.nummer })}`}
                  className="text-[15px] font-medium text-accent hover:underline"
                >
                  {v.navn}, {v.fylke}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    case "trenger_omrade":
      return (
        <div>
          <h2 className="text-[17px] font-medium text-ink">{visning.dataset.label}</h2>
          <p className="mt-1 text-[15px] text-ink">
            Datasettet er for stort til å vises for hele landet. Legg til en kommune eller et fylke i søket, eller zoom inn i kartet og søk i
            kartutsnittet.
          </p>
          <p className="mt-2 text-[13px] text-muted">{visning.dataset.description}</p>
        </div>
      );
    case "feil":
      return <p className="rounded-2xl bg-danger-soft px-4 py-3 text-[15px] text-danger">{visning.melding}</p>;
    case "treff": {
      const sted = visning.omrade?.kind === "utsnitt" ? "kartutsnittet" : visning.omrade?.navn;
      const hoved = visning.lag[0]!;
      return (
        <div>
          <h2 className="text-[17px] font-medium text-ink">{[visning.lag.map((l) => l.dataset.label).join(" + "), sted ?? "hele landet"].join(" · ")}</h2>
          {visning.lag.length === 1 ? (
            <p className="mt-0.5 text-[15px] text-ink">
              {hoved.feil ? "" : hoved.total === 0 ? `Ingen ${hoved.dataset.unit.many} ${sted ? `i ${sted}` : "registrert"}.` : tellTekst(hoved)}
            </p>
          ) : (
            <p className="mt-0.5 text-[15px] text-ink">{visning.lag.map((l) => `${tellTekst(l)}`).join(" · ")}</p>
          )}
          {visning.lag.length === 1 && <p className="mt-2 text-[13px] text-muted">{hoved.dataset.description}</p>}
        </div>
      );
    }
  }
}

function Detaljpanel({ feature, lukk }: { feature: ExploreFeature; lukk: () => void }) {
  return (
    <section aria-label="Detaljer" className="rounded-2xl border border-line bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Datasettet står først: med to lag i kartet er det det første man må vite. */}
          <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-[0.04em] text-muted uppercase">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: EXPLORE_COLOR[feature.style] }} />
            {lagOgType(feature)}
          </p>
          <h2 className="mt-0.5 text-[17px] font-medium text-ink [overflow-wrap:anywhere]">{feature.title}</h2>
        </div>
        <button type="button" onClick={lukk} aria-label="Lukk detaljer" className="shrink-0 rounded-full px-2 text-[18px] leading-none text-muted hover:text-ink">
          ×
        </button>
      </div>
      {feature.notice && <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-[13px] text-ink">{feature.notice}</p>}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
        {feature.details.map((rad) => (
          <div key={rad.label} className="contents">
            <dt className="text-muted">{rad.label}</dt>
            <dd className="text-ink [overflow-wrap:anywhere]">{rad.value}</dd>
          </div>
        ))}
      </dl>
      {feature.links && feature.links.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3">
          {feature.links.map((lenke) => (
            <li key={lenke.url}>
              <a href={lenke.url} target="_blank" rel="noopener noreferrer" className="text-[14px] text-accent hover:underline [overflow-wrap:anywhere]">
                {lenke.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
      {feature.explanation && <p className="mt-3 text-[13px] leading-relaxed text-muted">{feature.explanation}</p>}
      <p className="mt-3 text-[13px] text-muted">
        Kilde:{" "}
        {feature.sourceUrl ? (
          <a href={feature.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {feature.sourceName} ↗
          </a>
        ) : (
          feature.sourceName
        )}
      </p>
      {feature.href && (
        <Link href={feature.href} className="mt-2 inline-flex h-9 items-center text-[15px] font-medium text-accent hover:underline">
          {feature.hrefLabel ?? "Åpne"} →
        </Link>
      )}
    </section>
  );
}

function Punktpanel({ punkt, lukk }: { punkt: Punktsjekk; lukk: () => void }) {
  const tekst = punkt.status === "ok" ? AKTSOMHET_TEKST[punkt.aktsomhet] : null;
  return (
    <section aria-label="Punkt i kartet" aria-live="polite" className="rounded-2xl border border-line bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium tracking-[0.04em] text-muted uppercase">Punkt i kartet · ingen objekter her</p>
          <h2 className="mt-0.5 text-[17px] font-medium text-ink">
            {punkt.status === "laster" ? "Sjekker aktsomhetskartet …" : punkt.status === "feil" ? "Kunne ikke sjekke aktsomhetskartet" : tekst!.tittel}
          </h2>
        </div>
        <button type="button" onClick={lukk} aria-label="Lukk" className="shrink-0 rounded-full px-2 text-[18px] leading-none text-muted hover:text-ink">
          ×
        </button>
      </div>
      {punkt.status === "ok" && <p className="mt-2 text-[14px] leading-relaxed text-ink">{tekst!.tekst}</p>}
      {punkt.status === "feil" && <p className="mt-2 text-[14px] text-danger">{punkt.melding}</p>}
      <p className="mt-3 text-[13px] text-muted">
        {punkt.lat.toFixed(5)}, {punkt.lng.toFixed(5)} · Kilde: Aktsomhetskart for kvikkleireskred (NVE)
      </p>
    </section>
  );
}
