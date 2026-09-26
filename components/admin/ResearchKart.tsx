"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import { boundsFor, NORGE } from "@/lib/admin/kart-bounds";
import {
  KATEGORIGRUPPER,
  erStandard,
  gruppeFor,
  kartHref,
  SORTERINGER,
  type Kartfilter,
} from "@/lib/admin/research-map-filters";
import type { Kartpunkt, Kartresultat } from "@/lib/admin/research-map-query";
import {
  LEVELS,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  OPERATIONAL_STATUSES,
  VERIFICATION_LABEL,
  VERIFICATION_STATUSES,
} from "@/lib/admin/research-types";
import { bindLayer } from "@/lib/map/layers/types";
import { researchPointsLayer, type Researchpunkt } from "@/lib/map/layers/research-points";
import type { MapTileConfig } from "@/lib/map/config";

/**
 * Research-kartet: hele researchbasen utforsket geografisk.
 *
 * Kartet er hovedflaten, ikke et tillegg til en liste. Filtrene ligger i URL-en, så et utsnitt
 * kan bokmerkes og deles, og nettleserens fram og tilbake fungerer.
 *
 * Kartutsnittet følger *ikke* filtrene automatisk. Et kart som hopper hver gang man huker av en
 * boks er umulig å jobbe i; i stedet finnes «Vis alle treff» som eksplisitt handling.
 */

const SIDESTØRRELSE = 50;

export function ResearchKart({
  filter,
  resultat,
  tiles,
}: {
  filter: Kartfilter;
  resultat: Kartresultat;
  tiles: MapTileConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [valgt, setValgt] = useState<string | null>(null);
  const [vist, setVist] = useState(SIDESTØRRELSE);
  const [fitNøkkel, setFitNøkkel] = useState("start");
  const [mobilfane, setMobilfane] = useState<"kart" | "liste">("kart");
  const kartRef = useRef<HTMLDivElement>(null);

  const naviger = useCallback(
    (nytt: Kartfilter) => startTransition(() => router.replace(kartHref(nytt), { scroll: false })),
    [router],
  );
  const endre = useCallback(
    (delta: Partial<Kartfilter>) => {
      setVist(SIDESTØRRELSE);
      naviger({ ...filter, ...delta });
    },
    [filter, naviger],
  );

  const medPunkt = useMemo(
    () => resultat.punkter.filter((p): p is Kartpunkt & { latitude: number; longitude: number } =>
      p.latitude !== null && p.longitude !== null,
    ),
    [resultat.punkter],
  );

  const punkter = useMemo<Researchpunkt[]>(
    () => medPunkt.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude, interest: p.interest_level })),
    [medPunkt],
  );

  const lag = useMemo(() => [bindLayer(researchPointsLayer, punkter)], [punkter]);

  // Utsnittet settes ved oppstart og når «Vis alle treff» trykkes — ikke ved hvert filterbytte.
  const bounds = useMemo(
    () => (fitNøkkel === "start" ? NORGE : boundsFor(medPunkt.map((p) => ({ lat: p.latitude, lng: p.longitude })))),
    [fitNøkkel, medPunkt],
  );

  const popupFor = useCallback(
    (id: string): MapPopupContent | null => {
      const p = medPunkt.find((x) => x.id === id);
      if (!p) return null;
      return {
        lngLat: [p.longitude, p.latitude],
        title: p.title,
        lines: [
          [p.subcategory ?? p.category, p.address, p.municipality].filter(Boolean).join(" · "),
          `${LEVEL_LABEL[p.interest_level]} interesse · ${LEVEL_LABEL[p.confidence]} sikkerhet`,
          ...(p.operational_status !== "unknown" ? [OPERATIONAL_LABEL[p.operational_status]] : []),
          "INTERN",
        ],
        href: `/admin/research/${p.id}`,
        linkLabel: "Åpne funnet",
        minZoom: 13,
      };
    },
    [medPunkt],
  );

  const velgFraListe = useCallback((id: string) => {
    setValgt(id);
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setMobilfane("kart");
      kartRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  const gruppe = gruppeFor(filter.kategori);
  const overskrift = `${gruppe?.label ?? "Alle funn"} · ${resultat.totalt} treff`;

  return (
    <main className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(22rem,26rem)_1fr]">
      <div className="flex flex-col overflow-hidden border-line lg:border-r">
        <div className="border-b border-line px-5 py-4">
          <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Drift</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.03em]">Research-kart</h1>
          <p className="mt-1 text-[13px] text-muted">
            {overskrift} · {resultat.medPunkt} på kart
            {resultat.utenPunkt > 0 && ` · ${resultat.utenPunkt} uten koordinat`}
          </p>

          <Filtre filter={filter} resultat={resultat} endre={endre} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFitNøkkel(`fit-${Date.now()}`)}
              disabled={medPunkt.length === 0}
              className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-surface disabled:opacity-40"
            >
              Vis alle treff
            </button>
            {!erStandard(filter) && (
              <Link href="/admin/kart" className="text-[13px] text-muted hover:underline">
                Nullstill filtre
              </Link>
            )}
            <Link href="/admin" className="ml-auto text-[13px] font-medium text-accent hover:underline">
              Drift →
            </Link>
          </div>

          {/* Kart/liste-veksler på mobil. På desktop vises begge samtidig. */}
          <div className="mt-3 flex gap-1 rounded-full bg-ink/5 p-1 lg:hidden">
            {(["kart", "liste"] as const).map((fane) => (
              <button
                key={fane}
                type="button"
                onClick={() => setMobilfane(fane)}
                className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium capitalize ${
                  mobilfane === fane ? "bg-surface text-ink shadow-sm" : "text-muted"
                }`}
              >
                {fane}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-5 py-3 ${mobilfane === "liste" ? "" : "hidden lg:block"} ${
            pending ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Liste
            punkter={resultat.punkter}
            vist={vist}
            valgt={valgt}
            velg={velgFraListe}
            merk={() => setVist((n) => n + SIDESTØRRELSE)}
            feil={resultat.feil}
          />
        </div>
      </div>

      <div
        ref={kartRef}
        className={`relative h-[65vh] lg:h-auto ${mobilfane === "kart" ? "" : "hidden lg:block"}`}
      >
        <AreaMap
          tiles={tiles}
          title={`Kart over ${resultat.medPunkt} interne research-funn i Norge`}
          layers={lag}
          fitBounds={bounds}
          fitKey={fitNøkkel}
          maxFitZoom={13}
          selectedId={valgt}
          onSelect={setValgt}
          popupFor={popupFor}
          onNavigate={(href) => router.push(href)}
        />
        {medPunkt.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 px-8 text-center text-[15px] text-muted">
            <span className="rounded-2xl bg-surface/95 px-4 py-3">
              {resultat.totalt === 0
                ? "Ingen research-funn matcher disse filtrene."
                : `${resultat.totalt} funn matcher, men ingen har sikkert kartpunkt.`}
            </span>
          </p>
        )}
      </div>
    </main>
  );
}

function Liste({
  punkter,
  vist,
  valgt,
  velg,
  merk,
  feil,
}: {
  punkter: Kartpunkt[];
  vist: number;
  valgt: string | null;
  velg: (id: string) => void;
  merk: () => void;
  feil: string | null;
}) {
  if (feil) return <p className="rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">{feil}</p>;
  if (punkter.length === 0)
    return <p className="text-[14px] text-muted">Ingen research-funn matcher disse filtrene.</p>;

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {/* Bare de første radene rendres. Kartet viser alle punktene uansett. */}
        {punkter.slice(0, vist).map((p) => {
          const erValgt = valgt === p.id;
          const harPunkt = p.latitude !== null;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => harPunkt && velg(p.id)}
                aria-pressed={erValgt}
                disabled={!harPunkt}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  erValgt ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-ink/25"
                } ${harPunkt ? "cursor-pointer" : "cursor-default opacity-70"}`}
              >
                <p className="text-[14px] leading-snug font-medium text-ink [overflow-wrap:anywhere]">
                  {p.title}
                </p>
                <p className="text-[12px] text-muted [overflow-wrap:anywhere]">
                  {[p.subcategory ?? p.category, p.municipality].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">
                  {[
                    `${LEVEL_LABEL[p.interest_level]} interesse`,
                    `${LEVEL_LABEL[p.confidence]} sikkerhet`,
                    p.operational_status !== "unknown" ? OPERATIONAL_LABEL[p.operational_status] : null,
                    harPunkt ? null : "Uten kartpunkt",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {punkter.length > vist && (
        <button
          type="button"
          onClick={merk}
          className="mt-3 w-full rounded-lg border border-line py-2 text-[13px] font-medium text-accent hover:bg-accent-soft"
        >
          Vis flere ({punkter.length - vist} igjen)
        </button>
      )}
    </>
  );
}

function Filtre({
  filter,
  resultat,
  endre,
}: {
  filter: Kartfilter;
  resultat: Kartresultat;
  endre: (delta: Partial<Kartfilter>) => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <input
        type="search"
        defaultValue={filter.sok ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") endre({ sok: (e.target as HTMLInputElement).value.trim() || undefined });
        }}
        placeholder="Søk i tittel, adresse, kommune, kategori og notater"
        className="w-full rounded-full border border-line bg-surface px-4 py-2 text-[14px] outline-none focus:border-accent"
      />

      <div className="grid grid-cols-2 gap-2">
        <Velg
          label="Kategori"
          verdi={filter.kategori ?? ""}
          alle="Alle kategorier"
          valg={KATEGORIGRUPPER.map((g) => ({ v: g.slug, l: g.label }))}
          onChange={(v) => endre({ kategori: v || undefined, subkategori: undefined })}
        />
        <Velg
          label="Kommune"
          verdi={filter.kommune ?? ""}
          alle="Alle kommuner"
          valg={resultat.kommuner.map((k) => ({ v: k, l: k }))}
          onChange={(v) => endre({ kommune: v || undefined })}
        />
        {resultat.subkategorier.length > 1 && (
          <Velg
            label="Undertype"
            verdi={filter.subkategori ?? ""}
            alle="Alle undertyper"
            valg={resultat.subkategorier.map((s) => ({ v: s, l: s }))}
            onChange={(v) => endre({ subkategori: v || undefined })}
          />
        )}
        <Velg
          label="Sortering"
          verdi={filter.sortering}
          valg={SORTERINGER.map((s) => ({ v: s, l: s }))}
          onChange={(v) => endre({ sortering: v as Kartfilter["sortering"] })}
        />
      </div>

      <Sjekkrad
        label="Interesse"
        valg={LEVELS.map((l) => ({ v: l, l: LEVEL_LABEL[l] }))}
        aktive={filter.interesse}
        onChange={(v) => endre({ interesse: v as Kartfilter["interesse"] })}
      />
      <Sjekkrad
        label="Sikkerhet"
        valg={LEVELS.map((l) => ({ v: l, l: LEVEL_LABEL[l] }))}
        aktive={filter.confidence}
        onChange={(v) => endre({ confidence: v as Kartfilter["confidence"] })}
      />
      <Sjekkrad
        label="Status"
        valg={OPERATIONAL_STATUSES.map((o) => ({ v: o, l: OPERATIONAL_LABEL[o] }))}
        aktive={filter.drift}
        onChange={(v) => endre({ drift: v as Kartfilter["drift"] })}
      />

      <details className="text-[13px]">
        <summary className="cursor-pointer py-1 text-muted hover:text-ink">Flere filtre</summary>
        <div className="mt-1 flex flex-col gap-2">
          <Sjekkrad
            label="Verifisering"
            valg={VERIFICATION_STATUSES.map((v) => ({ v, l: VERIFICATION_LABEL[v] }))}
            aktive={filter.verifisering}
            onChange={(v) => endre({ verifisering: v as Kartfilter["verifisering"] })}
          />
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={filter.kandidat === true}
              onChange={(e) => endre({ kandidat: e.target.checked ? true : undefined })}
              className="size-4"
            />
            Kun kandidater for offentlig visning
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={filter.kunMedPunkt}
              onChange={(e) => endre({ kunMedPunkt: e.target.checked })}
              className="size-4"
            />
            Kun funn med kartpunkt
          </label>
        </div>
      </details>
    </div>
  );
}

function Velg({
  label,
  verdi,
  alle,
  valg,
  onChange,
}: {
  label: string;
  verdi: string;
  alle?: string;
  valg: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.04em] text-muted uppercase">{label}</span>
      <select
        value={verdi}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent"
      >
        {alle && <option value="">{alle}</option>}
        {valg.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Chips som slår en verdi av og på. Alle av betyr alle på — et tomt kart er ikke et svar. */
function Sjekkrad({
  label,
  valg,
  aktive,
  onChange,
}: {
  label: string;
  valg: { v: string; l: string }[];
  aktive: string[];
  onChange: (v: string[]) => void;
}) {
  const veksle = (v: string) => {
    const neste = aktive.includes(v) ? aktive.filter((x) => x !== v) : [...aktive, v];
    onChange(neste.length === 0 ? valg.map((o) => o.v) : neste);
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-[11px] tracking-[0.04em] text-muted uppercase">{label}</span>
      {valg.map((o) => {
        const på = aktive.includes(o.v);
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => veksle(o.v)}
            aria-pressed={på}
            className={`rounded-full px-2.5 py-1 text-[12px] ${
              på ? "bg-ink text-surface" : "bg-ink/5 text-muted hover:bg-ink/10"
            }`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
