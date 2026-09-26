"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { AreaMap, type MapPopupContent } from "@/components/map/AreaMap";
import { boundsFor, NORGE } from "@/lib/admin/kart-bounds";
import {
  KATEGORIGRUPPER,
  antallAvanserte,
  avanserteChips,
  erStandard,
  gruppeFor,
  harUndertyper,
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
 * Kartet er hovedflaten. Førstebildet viser derfor bare det man navigerer med — søk, kategori og
 * kommune — og alt annet ligger bak «Filtre». Et kartverktøy som åpner med tolv valgknapper
 * gjør at man må bla forbi et skjema for å komme til kartet.
 *
 * Det man *har* valgt vises alltid, som chips man kan fjerne enkeltvis: skjulte filtre man ikke
 * ser er verre enn synlige man ikke trenger.
 *
 * Kartutsnittet følger ikke filtrene automatisk — et kart som hopper ved hver avkryssing er
 * umulig å jobbe i. «Vis alle treff» gjør det til en handling.
 */

const SIDESTØRRELSE = 40;

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
  const [fane, setFane] = useState<"kart" | "liste">("kart");
  const [filtreÅpne, setFiltreÅpne] = useState(false);
  const kartRef = useRef<HTMLDivElement>(null);

  const endre = useCallback(
    (delta: Partial<Kartfilter>) => {
      setVist(SIDESTØRRELSE);
      startTransition(() => router.replace(kartHref({ ...filter, ...delta }), { scroll: false }));
    },
    [filter, router],
  );

  const medPunkt = useMemo(
    () =>
      resultat.punkter.filter(
        (p): p is Kartpunkt & { latitude: number; longitude: number } =>
          p.latitude !== null && p.longitude !== null,
      ),
    [resultat.punkter],
  );
  const punkter = useMemo<Researchpunkt[]>(
    () => medPunkt.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude, interest: p.interest_level })),
    [medPunkt],
  );
  const lag = useMemo(() => [bindLayer(researchPointsLayer, punkter)], [punkter]);
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
          [p.subcategory ?? p.category, p.municipality].filter(Boolean).join(" · "),
          [
            `${LEVEL_LABEL[p.interest_level]} interesse`,
            `${LEVEL_LABEL[p.confidence]} sikkerhet`,
            p.operational_status !== "unknown" ? OPERATIONAL_LABEL[p.operational_status] : null,
          ]
            .filter(Boolean)
            .join(" · "),
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
    if (!window.matchMedia("(min-width: 1024px)").matches) setFane("kart");
  }, []);

  const gruppe = gruppeFor(filter.kategori);
  const chips = avanserteChips(filter);
  const antall = antallAvanserte(filter);

  return (
    <main className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[21rem_1fr]">
      <div className="flex min-h-0 flex-col border-line lg:border-r">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <nav className="text-[12px] text-muted">
            <Link href="/admin" className="hover:underline">
              Drift
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-ink">Research-kart</span>
          </nav>

          <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Research-kart</h1>
          {/* Én oppsummering, ikke tre konkurrerende tall. */}
          <p className="text-[14px] text-ink">
            {gruppe ? `${gruppe.label} · ` : ""}
            {resultat.totalt} treff · {resultat.medPunkt} på kart
          </p>
          {resultat.utenPunkt > 0 && (
            <p className="text-[12px] text-muted">{resultat.utenPunkt} uten koordinat</p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <input
              type="search"
              defaultValue={filter.sok ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") endre({ sok: (e.target as HTMLInputElement).value.trim() || undefined });
              }}
              placeholder="Søk i funn, adresse og kommune"
              className="w-full rounded-full border border-line bg-surface px-4 py-2 text-[14px] outline-none focus:border-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <Velg
                merkelapp="Kategori"
                verdi={filter.kategori ?? ""}
                alle="Alle kategorier"
                valg={KATEGORIGRUPPER.map((g) => ({ v: g.slug, l: g.label }))}
                onChange={(v) => endre({ kategori: v || undefined, subkategori: undefined })}
              />
              <Velg
                merkelapp="Kommune"
                verdi={filter.kommune ?? ""}
                alle="Alle kommuner"
                valg={resultat.kommuner.map((k) => ({ v: k, l: k }))}
                onChange={(v) => endre({ kommune: v || undefined })}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltreÅpne(true)}
                className="rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink/30"
              >
                Filtre{antall > 0 && ` (${antall})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFitNøkkel(`fit-${Date.now()}`);
                  setFane("kart");
                }}
                disabled={medPunkt.length === 0}
                className="rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-surface disabled:opacity-40"
              >
                Vis alle treff
              </button>
              {!erStandard(filter) && (
                <Link href="/admin/kart" className="ml-auto text-[13px] text-muted hover:underline">
                  Nullstill
                </Link>
              )}
            </div>

            {/* Bare når noe faktisk er aktivt — ingen tom chip-rad. */}
            {chips.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <li key={chip.id}>
                    <button
                      type="button"
                      onClick={() => endre(chip.fjern)}
                      className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2.5 py-1 text-[12px] text-ink hover:bg-ink/10"
                    >
                      {chip.label}
                      <span aria-hidden="true" className="text-muted">
                        ×
                      </span>
                      <span className="sr-only">Fjern filter</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-1 rounded-full bg-ink/5 p-1 lg:hidden">
              {(["kart", "liste"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFane(f)}
                  aria-pressed={fane === f}
                  className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium capitalize ${
                    fane === f ? "bg-surface text-ink shadow-sm" : "text-muted"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 ${
            fane === "liste" ? "" : "hidden lg:block"
          } ${pending ? "pointer-events-none opacity-50" : ""}`}
        >
          <Liste
            punkter={resultat.punkter}
            vist={vist}
            valgt={valgt}
            velg={velgFraListe}
            mer={() => setVist((n) => n + SIDESTØRRELSE)}
            feil={resultat.feil}
            nullstillbar={!erStandard(filter)}
          />
        </div>
      </div>

      <div ref={kartRef} className={`relative h-[70vh] lg:h-auto ${fane === "kart" ? "" : "hidden lg:block"}`}>
        <AreaMap
          tiles={tiles}
          title={`Kart over ${resultat.medPunkt} interne research-funn`}
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
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center px-8">
            <p className="pointer-events-auto rounded-2xl bg-surface/95 px-4 py-3 text-center text-[14px] text-muted">
              {resultat.totalt === 0
                ? "Ingen research-funn matcher filtrene."
                : `${resultat.totalt} funn matcher, men ingen har sikkert kartpunkt.`}
              {!erStandard(filter) && (
                <>
                  {" "}
                  <Link href="/admin/kart" className="font-medium text-accent hover:underline">
                    Nullstill filtre
                  </Link>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {filtreÅpne && (
        <Filterpanel
          filter={filter}
          resultat={resultat}
          endre={endre}
          lukk={() => setFiltreÅpne(false)}
        />
      )}
    </main>
  );
}

/**
 * De avanserte filtrene, i et panel som dekker skjermen på mobil og legger seg over sidebaren
 * på desktop. Kompakte avkryssinger, ikke rader med store piller — tolv mørke knapper var det
 * som gjorde førstebildet urolig.
 */
function Filterpanel({
  filter,
  resultat,
  endre,
  lukk,
}: {
  filter: Kartfilter;
  resultat: Kartresultat;
  endre: (delta: Partial<Kartfilter>) => void;
  lukk: () => void;
}) {
  const visUndertype = harUndertyper(filter.kategori) && resultat.subkategorier.length > 1;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        onClick={lukk}
        aria-label="Lukk filtre"
        className="absolute inset-0 bg-ink/40"
      />
      <div className="relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-surface sm:max-w-md sm:rounded-2xl">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
          <h2 className="text-[15px] font-semibold text-ink">Filtre</h2>
          <button type="button" onClick={lukk} className="text-[13px] text-muted hover:text-ink">
            Lukk
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {visUndertype && (
            <Bolk tittel="Undertype">
              <Velg
                merkelapp=""
                verdi={filter.subkategori ?? ""}
                alle="Alle undertyper"
                valg={resultat.subkategorier.map((s) => ({ v: s, l: s }))}
                onChange={(v) => endre({ subkategori: v || undefined })}
              />
            </Bolk>
          )}
          <Bolk tittel="Interesse">
            <Avkryssing
              valg={LEVELS.map((l) => ({ v: l, l: LEVEL_LABEL[l] }))}
              aktive={filter.interesse}
              onChange={(v) => endre({ interesse: v as Kartfilter["interesse"] })}
            />
          </Bolk>
          <Bolk tittel="Sikkerhet">
            <Avkryssing
              valg={LEVELS.map((l) => ({ v: l, l: LEVEL_LABEL[l] }))}
              aktive={filter.confidence}
              onChange={(v) => endre({ confidence: v as Kartfilter["confidence"] })}
            />
          </Bolk>
          <Bolk tittel="Status">
            <Avkryssing
              valg={OPERATIONAL_STATUSES.map((o) => ({ v: o, l: OPERATIONAL_LABEL[o] }))}
              aktive={filter.drift}
              onChange={(v) => endre({ drift: v as Kartfilter["drift"] })}
            />
          </Bolk>
          <Bolk tittel="Verifisering">
            <Avkryssing
              valg={VERIFICATION_STATUSES.map((v) => ({ v, l: VERIFICATION_LABEL[v] }))}
              aktive={filter.verifisering}
              onChange={(v) => endre({ verifisering: v as Kartfilter["verifisering"] })}
            />
          </Bolk>
          <Bolk tittel="Annet">
            <label className="flex items-center gap-2 py-1 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={filter.kandidat === true}
                onChange={(e) => endre({ kandidat: e.target.checked ? true : undefined })}
                className="size-4"
              />
              Kun kandidater for offentlig visning
            </label>
            <label className="flex items-center gap-2 py-1 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={filter.kunMedPunkt}
                onChange={(e) => endre({ kunMedPunkt: e.target.checked })}
                className="size-4"
              />
              Kun funn med kartpunkt
            </label>
          </Bolk>
          <Bolk tittel="Sortering">
            <Velg
              merkelapp=""
              verdi={filter.sortering}
              valg={SORTERINGER.map((s) => ({ v: s, l: s }))}
              onChange={(v) => endre({ sortering: v as Kartfilter["sortering"] })}
            />
          </Bolk>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={lukk}
            className="flex-1 rounded-full bg-ink px-4 py-2 text-[14px] font-medium text-surface"
          >
            Vis {resultat.totalt} treff
          </button>
          {!erStandard(filter) && (
            <Link href="/admin/kart" onClick={lukk} className="text-[13px] text-muted hover:underline">
              Nullstill
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Bolk({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line/70 py-2.5 last:border-0">
      <h3 className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">{tittel}</h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

/** Kompakt avkryssingsliste. Alle av betyr alle på — et tomt kart er ikke et svar. */
function Avkryssing({
  valg,
  aktive,
  onChange,
}: {
  valg: { v: string; l: string }[];
  aktive: string[];
  onChange: (v: string[]) => void;
}) {
  const veksle = (v: string) => {
    const neste = aktive.includes(v) ? aktive.filter((x) => x !== v) : [...aktive, v];
    onChange(neste.length === 0 ? valg.map((o) => o.v) : neste);
  };
  return (
    <div className="grid gap-x-4 sm:grid-cols-2">
      {valg.map((o) => (
        <label key={o.v} className="flex items-center gap-2 py-1 text-[14px] text-ink">
          <input type="checkbox" checked={aktive.includes(o.v)} onChange={() => veksle(o.v)} className="size-4" />
          {o.l}
        </label>
      ))}
    </div>
  );
}

function Velg({
  merkelapp,
  verdi,
  alle,
  valg,
  onChange,
}: {
  merkelapp: string;
  verdi: string;
  alle?: string;
  valg: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  const select = (
    <select
      value={verdi}
      onChange={(e) => onChange(e.target.value)}
      aria-label={merkelapp || undefined}
      className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[13px] text-ink outline-none focus:border-accent"
    >
      {alle && <option value="">{alle}</option>}
      {valg.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
  if (!merkelapp) return select;
  return (
    <label className="block">
      <span className="sr-only">{merkelapp}</span>
      {select}
    </label>
  );
}

/** Rolige kort: tittelen er det tydeligste, resten er sekundært. */
function Liste({
  punkter,
  vist,
  valgt,
  velg,
  mer,
  feil,
  nullstillbar,
}: {
  punkter: Kartpunkt[];
  vist: number;
  valgt: string | null;
  velg: (id: string) => void;
  mer: () => void;
  feil: string | null;
  nullstillbar: boolean;
}) {
  if (feil) return <p className="rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">{feil}</p>;
  if (punkter.length === 0)
    return (
      <p className="text-[14px] text-muted">
        Ingen research-funn matcher filtrene.
        {nullstillbar && (
          <>
            {" "}
            <Link href="/admin/kart" className="font-medium text-accent hover:underline">
              Nullstill filtre
            </Link>
          </>
        )}
      </p>
    );

  return (
    <>
      <ul className="flex flex-col gap-1">
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
                className={`w-full rounded-lg border-l-2 py-2 pr-2 pl-2.5 text-left transition-colors ${
                  erValgt ? "border-l-accent bg-accent-soft" : "border-l-transparent hover:bg-ink/[0.03]"
                } ${harPunkt ? "cursor-pointer" : "cursor-default"}`}
              >
                <p className="text-[14px] leading-snug font-medium text-ink [overflow-wrap:anywhere]">
                  {p.title}
                </p>
                <p className="text-[12px] text-muted [overflow-wrap:anywhere]">
                  {[p.subcategory ?? p.category, p.municipality].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  <Merke>{LEVEL_LABEL[p.interest_level]} interesse</Merke>
                  <Merke>{LEVEL_LABEL[p.confidence]} sikkerhet</Merke>
                  {p.operational_status !== "unknown" && (
                    <Merke>{OPERATIONAL_LABEL[p.operational_status]}</Merke>
                  )}
                  {!harPunkt && <Merke>Uten kartpunkt</Merke>}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {punkter.length > vist && (
        <button
          type="button"
          onClick={mer}
          className="mt-3 w-full rounded-lg border border-line py-2 text-[13px] font-medium text-accent hover:bg-accent-soft"
        >
          Vis flere ({punkter.length - vist} igjen)
        </button>
      )}
    </>
  );
}

function Merke({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-ink/[0.06] px-1.5 py-0.5 text-[11px] text-muted">
      {children}
    </span>
  );
}
