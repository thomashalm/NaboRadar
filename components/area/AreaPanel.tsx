"use client";

import Link from "next/link";
import { Suspense, use, type CSSProperties } from "react";
import { Chevron } from "@/components/ui/Chevron";
import { ThemeIcon } from "./ThemeIcon";
import { useMapSelection } from "./map-selection";
import {
  buildOverview,
  clustersFor,
  findTheme,
  themeNeedsLookups,
  themesFor,
  type OverviewRow,
  type Theme,
} from "@/lib/area-themes";
import type { AreaEventsResult } from "@/lib/events/queries";
import { assembleSection } from "@/lib/facts/assemble";
import { mergeFactResults } from "@/lib/facts/merge";
import { noiseFloor, noiseScale, scalePosition, type NoiseFloor, type NoiseScale } from "@/lib/facts/noise-scale";
import type { AreaFactsResult, FactCluster, OverviewItem, SectionOverview } from "@/lib/facts/queries";
import { formatRadius } from "@/lib/format";
import { TILFLUKTSROM_NAERMESTE_LENKE } from "@/lib/facts/wording";
import type { AreaFact } from "@/types/area-feature";

/**
 * Venstrepanelet på resultatsiden: oversikten over temaene, eller ett valgt tema.
 *
 * Modellen er master/detail. Oversikten er temamenyen — én rad per tema, med hovedfunnet. Et
 * trykk bytter panelets innhold til temaet; ingenting ruller, og kartet ved siden av viser bare
 * det temaet eier. «Tilbake til oversikt» står alltid øverst i et tema.
 *
 * All tekst kommer fra formuleringsregisteret (lib/facts/wording.ts). Ingen score, ingen vurdering.
 */
export interface AreaPanelProps {
  storedFacts: Promise<AreaFactsResult>;
  lookupFacts: Promise<AreaFactsResult>;
  events: Promise<AreaEventsResult>;
  radius: number;
  pending: boolean;
  /** Valgt tema fra URL-en (`tema=`). null eller ukjent: oversikten. */
  themeId: string | null;
  hrefForTheme: (themeId: string | null) => string;
  onSelectTheme: (themeId: string | null) => void;
  /** Plansakene, ferdig satt opp med valg og sortering (EventFeed). */
  saker: React.ReactNode;
  /** «Friluft i nærheten», rendret på serveren. */
  friluft?: React.ReactNode;
  /** Én linje om friluft til oversikten, rendret på serveren. Tom når det ikke finnes noe. */
  friluftSummary?: React.ReactNode;
  /** Skolekretsen, rendret på serveren. Står øverst i «Skoler og barnehager». */
  skolekrets?: React.ReactNode;
  /** Samme søk, men med de nærmeste tilfluktsrommene vist også utenfor valgt radius. */
  nearestShelterHref?: string;
  /** Over oversikten. Bare admins visning sender noe inn her. */
  lead?: React.ReactNode;
  /** Under oversikten (admin). */
  extra?: React.ReactNode;
}

export function AreaPanel(props: AreaPanelProps) {
  const { pending } = props;
  return (
    <div aria-busy={pending} className={`transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`}>
      <Suspense fallback={<Overview {...props} rows={buildOverview({ stored: null, lookups: null, events: null, radius: props.radius })} />}>
        <PanelBody {...props} />
      </Suspense>
    </div>
  );
}

/** Databasen bestemmer hvilke temaer som finnes. Panelet venter på den, men bare på den. */
function PanelBody(props: AreaPanelProps) {
  const db = use(props.storedFacts);
  const theme = findTheme(themesFor(db), props.themeId);
  if (theme) return <ThemeDetail {...props} theme={theme} db={db} />;
  return (
    <Suspense fallback={<Overview {...props} rows={buildOverview({ stored: db, lookups: null, events: null, radius: props.radius })} />}>
      <OverviewWithEvents {...props} db={db} />
    </Suspense>
  );
}

function OverviewWithEvents(props: AreaPanelProps & { db: AreaFactsResult }) {
  const events = use(props.events);
  const { db, radius } = props;
  return (
    <Suspense fallback={<Overview {...props} rows={buildOverview({ stored: db, lookups: null, events, radius })} />}>
      <OverviewComplete {...props} events={events} />
    </Suspense>
  );
}

function OverviewComplete(props: Omit<AreaPanelProps, "events"> & { db: AreaFactsResult; events: AreaEventsResult }) {
  const lookups = use(props.lookupFacts);
  const { db, events, radius } = props;
  return (
    <Overview {...props} rows={buildOverview({ stored: db, lookups, events, radius })}>
      <Kildelinjer db={db} lookups={lookups} radius={radius} />
    </Overview>
  );
}

// ---------------------------------------------------------------------------------------------
// Oversikten
// ---------------------------------------------------------------------------------------------

type OverviewProps = Pick<AreaPanelProps, "hrefForTheme" | "onSelectTheme" | "friluftSummary" | "lead" | "extra"> & {
  rows: readonly OverviewRow[];
  children?: React.ReactNode;
};

/**
 * Temamenyen. De viktigste temaene først; resten under «Mer i området», så oversikten kan
 * brukes uten å rulle.
 */
function Overview({ rows, hrefForTheme, onSelectTheme, friluftSummary, lead, extra, children }: OverviewProps) {
  const viktigste = rows.filter((row) => row.theme.primary);
  const ovrige = rows.filter((row) => !row.theme.primary);
  const rad = (row: OverviewRow) => (
    <li key={row.theme.id}>
      <ThemeRow row={row} href={hrefForTheme(row.theme.id)} onSelect={() => onSelectTheme(row.theme.id)} />
    </li>
  );
  const friluftTema = themesFor(null).find((t) => t.source.kind === "friluft");
  return (
    <div>
      {lead && <div className="mb-6">{lead}</div>}
      <section aria-labelledby="korte-trekk">
        <h2 id="korte-trekk" className="type-h2 text-ink">
          Området i korte trekk
        </h2>
        <p className="type-meta mt-0.5">Velg et tema for å se detaljene og stedene i kartet.</p>
        <ul className="mt-3 flex flex-col gap-1">{viktigste.map(rad)}</ul>
      </section>

      {(ovrige.length > 0 || friluftSummary) && (
        <section aria-labelledby="mer-i-omradet" className="mt-6">
          <h2 id="mer-i-omradet" className="text-sm font-semibold text-subtle">
            Mer i området
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {ovrige.filter((row) => row.theme.id !== "tilfluktsrom").map(rad)}
            {friluftTema && friluftSummary && (
              // Raden finnes bare når serveren faktisk fant noe (data-finnes i oppsummeringen).
              <li className="hidden has-[[data-finnes]]:block">
                <ThemeRow
                  row={{ theme: friluftTema, text: "" }}
                  textNode={friluftSummary}
                  href={hrefForTheme(friluftTema.id)}
                  onSelect={() => onSelectTheme(friluftTema.id)}
                />
              </li>
            )}
            {ovrige.filter((row) => row.theme.id === "tilfluktsrom").map(rad)}
          </ul>
        </section>
      )}

      {children}
      {extra && <div className="mt-8">{extra}</div>}
      <p className="type-meta mt-5">NaboRadar viser det kildene oppgir, og vurderer ikke området.</p>
    </div>
  );
}

/**
 * Én rad i temamenyen: ikon, tema, hovedfunn og pil.
 *
 * En lenke, ikke en knapp: valgt tema ligger i URL-en, så raden kan åpnes i ny fane og deles.
 * Vanlig klikk bytter panelet uten å laste siden og uten å rulle.
 */
function ThemeRow({
  row,
  textNode,
  href,
  onSelect,
}: {
  row: OverviewRow;
  textNode?: React.ReactNode;
  href: string;
  onSelect: () => void;
}) {
  const { theme } = row;
  const style = { "--tema": theme.color } as CSSProperties;
  if (row.text === null) {
    return (
      <div role="status" style={style} className="flex min-h-16 items-center gap-3.5 rounded-control px-3 py-2.5">
        <ThemeIcon icon={theme.icon} muted />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-subtle">{theme.label}</p>
          <span className="sr-only">Henter {theme.label.toLowerCase()} …</span>
          <span aria-hidden="true" className="mt-2 block h-2 w-44 max-w-full animate-pulse rounded-full bg-line" />
        </div>
      </div>
    );
  }
  return (
    <a
      href={href}
      style={style}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onSelect();
      }}
      className="group flex min-h-16 items-center gap-3.5 rounded-control border border-transparent px-3 py-2.5 hover:border-line-strong hover:bg-surface hover:shadow-float focus-visible:border-(--tema) focus-visible:bg-surface active:bg-sunken"
    >
      <ThemeIcon icon={theme.icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-muted">{theme.label}</span>
        <span className="block text-[15px] leading-snug font-semibold text-ink [overflow-wrap:anywhere]">
          {textNode ?? row.text}
        </span>
        {row.detail && <span className="type-meta block">{row.detail}</span>}
      </span>
      <Chevron className="group-hover:text-(--tema)" />
    </a>
  );
}

// ---------------------------------------------------------------------------------------------
// Ett tema
// ---------------------------------------------------------------------------------------------

function ThemeDetail(props: AreaPanelProps & { theme: Theme; db: AreaFactsResult }) {
  const { theme, hrefForTheme, onSelectTheme } = props;
  const style = { "--tema": theme.color } as CSSProperties;
  return (
    <article style={style} aria-labelledby="tema-overskrift">
      <a
        href={hrefForTheme(null)}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onSelectTheme(null);
        }}
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[15px] font-medium text-muted hover:bg-sunken hover:text-ink"
      >
        <Chevron className="rotate-180" />
        Tilbake til oversikt
      </a>

      <header className="mt-2 flex items-center gap-3.5 border-b border-line pb-4">
        <ThemeIcon icon={theme.icon} size="lg" selected />
        <h2 id="tema-overskrift" className="type-h1 text-ink">
          {theme.label}
        </h2>
      </header>

      <div className="pt-5">
        <ThemeBody {...props} />
      </div>
    </article>
  );
}

function ThemeBody(props: AreaPanelProps & { theme: Theme; db: AreaFactsResult }) {
  const { theme } = props;
  if (theme.source.kind === "saker") return <>{props.saker}</>;
  if (theme.source.kind === "friluft") {
    return (
      <div className="empty:after:type-support empty:after:content-['Ingen_hytter_eller_koier_funnet_i_nærheten.']">
        {props.friluft}
      </div>
    );
  }
  return (
    <Suspense fallback={<Skeleton label={`Henter ${theme.label.toLowerCase()} …`} />}>
      <SectionDetail {...props} />
    </Suspense>
  );
}

/** Et tema som hentes fra områdefakta: hele seksjonen, eller én gruppe i Nærområdet. */
function SectionDetail({
  theme,
  db,
  lookupFacts,
  radius,
  skolekrets,
  nearestShelterHref,
}: AreaPanelProps & { theme: Theme; db: AreaFactsResult }) {
  if (theme.source.kind !== "section") return null;
  // use() kan stå i en betingelse; hvorvidt et tema har oppslag er dessuten fast.
  const lookups = themeNeedsLookups(theme) ? use(lookupFacts) : null;
  const deler = [db, ...(lookups ? [lookups] : [])];

  if (deler.some((del) => del.status !== "ok")) {
    return <p className="type-support">Kunne ikke hente {theme.label.toLowerCase()} akkurat nå.</p>;
  }

  const clusters = clustersFor(theme, deler, radius);
  // Løse funn og samlet oversikt hører til seksjonen som helhet, ikke til en gruppe i den.
  const hele = theme.source.clusterId ? null : assembleSection(deler, theme.source.sectionId, radius);
  const harInnhold = clusters.length > 0 || (hele && (hele.facts.length > 0 || hele.overview));

  return (
    <div className="flex flex-col gap-7">
      {theme.id === "skoler" && skolekrets && <div className="empty:hidden">{skolekrets}</div>}
      {!harInnhold && (
        <p className="type-support">
          Ingen registrerte forhold i kildene våre innen {formatRadius(radius)} for dette temaet.
        </p>
      )}
      {clusters.map((cluster) => (
        <ClusterBlock
          key={cluster.id}
          cluster={cluster}
          theme={theme}
          nearestShelterHref={nearestShelterHref}
        />
      ))}
      {hele && hele.facts.length > 0 && (
        <ul className="flex flex-col gap-5">
          {hele.facts.map((fact) => (
            <li key={fact.id}>
              <FactItem fact={fact} />
            </li>
          ))}
        </ul>
      )}
      {hele?.overview && (
        <div>
          {hele.overview.noAttentionNote && <p className="type-support">{hele.overview.noAttentionNote}</p>}
          <OverviewDetails overview={hele.overview} />
        </div>
      )}
    </div>
  );
}

/**
 * Én gruppe, åpen: hovedfunnet, en visualisering der den forklarer noe, og så funn, lister,
 * forbehold og kilde.
 */
function ClusterBlock({
  cluster,
  theme,
  nearestShelterHref,
}: {
  cluster: FactCluster;
  theme: Theme;
  nearestShelterHref?: string;
}) {
  if (cluster.emptyNote) {
    const gulv = theme.id === "stoy" ? noiseFloor(cluster.emptyNote.detail) : null;
    return (
      <section>
        <p className="text-[17px] leading-snug font-semibold text-ink">{cluster.emptyNote.text}</p>
        {cluster.emptyNote.detail && <p className="type-support mt-1">{cluster.emptyNote.detail}</p>}
        {gulv && <NoiseFloorFigure floor={gulv} />}
        {cluster.emptyNote.nearestLink && nearestShelterHref && (
          <Link href={nearestShelterHref} className="link mt-1 inline-flex min-h-11 items-center text-[15px]">
            {TILFLUKTSROM_NAERMESTE_LENKE} →
          </Link>
        )}
        <p className="type-meta mt-3">Kilde: {cluster.sourceName}</p>
      </section>
    );
  }

  const skalaer = cluster.facts.flatMap((fact) => {
    const scale = noiseScale(fact);
    return scale ? [{ fact, scale }] : [];
  });

  return (
    <section>
      {/* Gruppens eget navn står bare når det sier mer enn temaoverskriften rett over. */}
      {cluster.label !== theme.label && <h3 className="text-[17px] leading-snug font-semibold text-ink">{cluster.label}</h3>}
      <p className={cluster.label !== theme.label ? "type-support mt-1" : "text-[17px] leading-snug font-semibold text-ink"}>
        {cluster.summary}
      </p>

      {skalaer.map(({ fact, scale }) => (
        <NoiseScaleFigure
          key={fact.id}
          // Med én støykilde står navnet allerede rett over. Med flere må hver skala si hvilken den gjelder.
          title={skalaer.length > 1 ? (fact.compact?.headline ?? fact.headline) : "Beregnet støynivå (Lden)"}
          scale={scale}
        />
      ))}
      <NearestStats cluster={cluster} />

      <div className="mt-5">
        {cluster.facts.length > 0 && (
          <ul className="flex flex-col gap-5">
            {cluster.facts.map((fact) => (
              <li key={fact.id}>
                <FactItem fact={fact} />
              </li>
            ))}
          </ul>
        )}

        {cluster.lists.map((list) => (
          <div key={list.id} className="mt-5 first:mt-0">
            <h3 className="text-sm font-semibold text-muted">{list.label}</h3>
            <div className="mt-1">
              <PlaceRows items={list.items.slice(0, list.previewCount)} />
            </div>
            {list.toggleLabel && (
              <details className="disclosure">
                <summary className="link inline-flex min-h-11 items-center gap-1 text-[15px]">
                  {list.toggleLabel}
                  <Chevron className="size-3.5 text-accent" />
                </summary>
                <PlaceRows items={list.items.slice(list.previewCount)} />
              </details>
            )}
          </div>
        ))}

        {cluster.overview && (
          <div className="mt-4">
            <OverviewDetails overview={cluster.overview} />
          </div>
        )}
        <SourceBlock caveat={cluster.caveat} source={kilderStårAllerede(cluster) ? null : cluster.sourceName} />
      </div>
    </section>
  );
}

/**
 * Nøkkeltall for en gruppe med lister: hvor mange, og det nærmeste.
 *
 * Tallene er de samme som listene under bygger på (`total` og første rad, som er nærmest). Ingen
 * farge utover temaets, og ingen rangering.
 */
function NearestStats({ cluster }: { cluster: FactCluster }) {
  const lister = cluster.lists.filter((list) => list.items.length > 0);
  if (lister.length === 0) return null;
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2.5">
      {lister.map((list) => {
        const naermest = list.items[0]!;
        return (
          <div key={list.id} className="rounded-control border border-line bg-surface px-3.5 py-3">
            <dt className="text-sm font-medium text-muted">{list.label}</dt>
            <dd>
              <span className="block text-2xl leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums">
                {list.total}
              </span>
              <span className="type-meta block [overflow-wrap:anywhere]">
                Nærmest: {naermest.contains ? naermest.distanceLabel.toLowerCase() : naermest.distanceLabel}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Støyskalaen: det beregnede Lden-intervallet på en dB-akse, med grensene for gul og rød
 * støysone som referansemerker. Intervallet tegnes som et intervall — kilden oppgir ikke et punkt.
 */
function NoiseScaleFigure({ title, scale }: { title: string; scale: NoiseScale }) {
  const fra = scalePosition(scale, scale.from);
  const til = scalePosition(scale, scale.to === null ? scale.max : scale.to + 1);
  return (
    <figure className="mt-4 rounded-control border border-line bg-surface px-4 pt-3.5 pb-3">
      <figcaption className="text-sm font-medium text-muted">{title}</figcaption>
      <div role="img" aria-label={scale.description} className="relative mt-7 mb-7 h-2.5 rounded-full bg-sunken">
        <span
          className="absolute inset-y-0 rounded-full bg-(--tema)"
          style={{ left: `${fra}%`, width: `${Math.max(til - fra, 2)}%` }}
        />
        <span
          className="absolute -top-6 -translate-x-1/2 text-sm font-semibold whitespace-nowrap text-ink tabular-nums"
          style={{ left: `${(fra + til) / 2}%` }}
        >
          {scale.to === null ? `${scale.from}+ dB` : `${scale.from}–${scale.to} dB`}
        </span>
        {scale.marks.map((mark) => (
          <span key={mark.db} className="absolute -top-1 -bottom-1 w-px bg-ink/45" style={{ left: `${scalePosition(scale, mark.db)}%` }}>
            <span className="type-meta absolute top-full left-1/2 mt-1 -translate-x-1/2 text-xs whitespace-nowrap">
              {mark.label}
            </span>
          </span>
        ))}
      </div>
      <p className="type-meta text-xs">
        Skala {scale.min}–{scale.max} dB. Strekene er grensene i T-1442, til sammenligning — støykartet viser ikke
        støysoner.
      </p>
    </figure>
  );
}

/** Støykartet har ikke noe nivå for stedet: området under kartets laveste nivå, uten punkt. */
function NoiseFloorFigure({ floor }: { floor: NoiseFloor }) {
  const grense = scalePosition(floor, floor.below);
  return (
    <figure className="mt-4 rounded-control border border-line bg-surface px-4 pt-3.5 pb-3">
      <figcaption className="text-sm font-medium text-muted">Modellert støynivå (Lden)</figcaption>
      <div role="img" aria-label={floor.description} className="relative mt-7 mb-7 h-2.5 rounded-full bg-sunken">
        <span
          className="absolute inset-y-0 left-0 rounded-l-full bg-[color-mix(in_srgb,var(--tema)_45%,white)]"
          style={{ width: `${grense}%` }}
        />
        <span
          className="absolute -top-6 -translate-x-1/2 text-sm font-semibold whitespace-nowrap text-ink"
          style={{ left: `${grense / 2}%` }}
        >
          Under {floor.below} dB
        </span>
        <span className="absolute -top-1 -bottom-1 w-px bg-ink/45" style={{ left: `${grense}%` }}>
          <span className="type-meta absolute top-full left-1/2 mt-1 -translate-x-1/2 text-xs whitespace-nowrap">
            Kartet starter på {floor.below}
          </span>
        </span>
      </div>
      <p className="type-meta text-xs">
        Skala {floor.min}–{floor.max} dB. Kartet oppgir ikke et nivå under {floor.below} dB, så det tegnes ikke et punkt.
      </p>
    </figure>
  );
}

/** Forbehold og kilde, sist i et tema. Alltid samme sted og samme form. */
function SourceBlock({ caveat, source }: { caveat: string | null; source: string | null }) {
  if (!caveat && !source) return null;
  return (
    <div className="mt-5 border-t border-line pt-3">
      {caveat && <p className="type-meta whitespace-pre-line">{caveat}</p>}
      {source && <p className={`type-meta ${caveat ? "mt-2" : ""}`}>Kilde: {source}</p>}
    </div>
  );
}

function Skeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-12 flex-col justify-center gap-2">
      <span className="type-meta">{label}</span>
      <span aria-hidden="true" className="h-2 w-40 animate-pulse rounded-full bg-line" />
    </div>
  );
}

/** Kildelisten nederst kan først skrives når alle kildene har svart. */
function Kildelinjer({
  db,
  lookups,
  radius,
}: {
  db: AreaFactsResult;
  lookups: AreaFactsResult;
  radius: number;
}) {
  const samlet = mergeFactResults(db, lookups);
  if (samlet.status !== "ok") {
    return <Notice>Vi får ikke hentet områdedata akkurat nå.</Notice>;
  }
  if (samlet.groups.length === 0) {
    return <Notice>Ingen registrerte forhold i kildene våre innen {formatRadius(radius)}.</Notice>;
  }

  return (
    <div className="mt-6 border-t border-line pt-3">
      {samlet.unavailableSources.length > 0 && (
        <p className="type-meta mb-3">
          Disse kildene svarte ikke akkurat nå: {samlet.unavailableSources.join(", ")}. Resten av oversikten er
          fullstendig.
        </p>
      )}
      {samlet.sources.length > 0 && (
        /*
         * Samlet provenance, bak en utvider. Listen er komplett og ett trykk unna, men skal ikke
         * konkurrere visuelt med funnene.
         */
        <details className="disclosure">
          <summary className="flex min-h-11 items-center justify-between gap-3 text-[15px] font-medium text-ink">
            Kilder og metode ({samlet.sources.length})
            <Chevron />
          </summary>
          <ul className="mt-1 divide-y divide-line">
            {samlet.sources.map((source) => (
              <li key={source.name} className="py-3">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[15px] text-ink underline decoration-line-strong underline-offset-3 hover:decoration-ink"
                  >
                    {source.name}
                  </a>
                ) : (
                  <span className="text-[15px] text-ink">{source.name}</span>
                )}
                <span className="type-meta block">
                  {source.owner} · {source.licenseName}
                </span>
                {source.method && <span className="type-meta mt-0.5 block">{source.method}</span>}
              </li>
            ))}
          </ul>
          <p className="type-meta mt-3">
            Datasettene over er de som faktisk inngikk i dette resultatet. NaboRadar vurderer ikke forholdene eller
            stedene, og viser bare det kildene selv oppgir.
          </p>
        </details>
      )}
    </div>
  );
}

/**
 * Ett funn med full tekst. Ikke et kort: en tynn strek til venstre holder funnet sammen, og
 * resten er typografi. Kilden står alltid sist, på egen linje.
 */
function FactItem({ fact }: { fact: AreaFact }) {
  return (
    <article className="border-l-2 border-line pl-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[15px] leading-snug font-semibold text-balance text-ink [overflow-wrap:anywhere]">
          {fact.headline}
        </h4>
        {fact.distanceLabel && (
          <span className={`shrink-0 text-sm tabular-nums ${fact.contains ? "font-semibold text-ink" : "text-subtle"}`}>
            {fact.distanceLabel}
          </span>
        )}
      </div>

      {fact.details.map((detail) => (
        <p key={detail} className="type-support mt-1">
          {detail}
        </p>
      ))}

      {fact.caveat && <p className="type-meta mt-2">{fact.caveat}</p>}

      {fact.technical.length > 0 && (
        <details className="disclosure mt-1">
          <summary className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
            Detaljer
            <Chevron className="size-3.5" />
          </summary>
          <p className="type-meta">{fact.technical.join(" · ")}</p>
        </details>
      )}

      <p className="type-meta mt-2">
        Kilde: {fact.sourceName}
        {fact.sourceDateLabel ? ` · ${fact.sourceDateLabel}` : ""}
      </p>

      {fact.link && (
        <a
          href={fact.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="link mt-1 inline-flex min-h-9 items-center text-[15px]"
        >
          {fact.link.label} ↗
        </a>
      )}
    </article>
  );
}

/**
 * Rader i en kompakt gruppe: navn, kort undertekst og avstand.
 *
 * Når raden har et tilsvarende objekt i kartet, blir den en knapp som velger det: markøren
 * utheves, kartet panorerer hvis objektet ligger utenfor utsnittet, og popupen åpner seg —
 * samme tilstand som ved klikk direkte i kartet. Slike rader har en liten kartnål til høyre.
 *
 * Rader uten kartobjekt oppfører seg som vanlig tekst. En ekstern kildelenke ligger ved siden av
 * valget, slik at de to ikke konkurrerer om det samme trykket.
 */
function PlaceRows({ items }: { items: OverviewItem[] }) {
  const { selectedId, select, selectable } = useMapSelection();
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const kanVelges = selectable.has(item.id);
        const valgt = selectedId === item.id;
        return (
          <li
            key={item.id}
            className={`relative -mx-2 flex items-baseline justify-between gap-3 rounded-control px-2 py-2.5 ${
              valgt ? "bg-accent-soft" : kanVelges ? "hover:bg-sunken" : ""
            }`}
          >
            {/*
              Hele raden velger stedet i kartet, ikke bare tittelen. Knappen dekker raden i
              stedet for å pakke innholdet, fordi raden kan ha en kildelenke — en lenke inne i
              en knapp er ugyldig, og de to skal ikke konkurrere om det samme trykket.
            */}
            {kanVelges && (
              <button
                type="button"
                onClick={() => select(item.id)}
                aria-pressed={valgt}
                className="absolute inset-0 z-10 cursor-pointer rounded-control focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="sr-only">Vis {item.title} i kartet</span>
              </button>
            )}
            <span className="min-w-0">
              <span className={`text-[15px] text-ink [overflow-wrap:anywhere] ${valgt ? "font-semibold" : ""}`}>
                {item.title}
              </span>
              <span className="type-meta block">
                {item.subtitle}
                {item.href && (
                  <>
                    {" · "}
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link relative z-20 font-normal"
                    >
                      Kilde ↗
                    </a>
                  </>
                )}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 self-center">
              <span className={`text-sm tabular-nums ${item.contains ? "font-semibold text-ink" : "text-subtle"}`}>
                {item.distanceLabel}
              </span>
              {kanVelges && (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className={`size-3.5 ${valgt ? "text-accent" : "text-line-strong"}`}
                >
                  <path d="M8 14s-4.5-3.9-4.5-7.4a4.5 4.5 0 0 1 9 0C12.5 10.1 8 14 8 14Z" strokeLinejoin="round" />
                  <circle cx="8" cy="6.5" r="1.5" />
                </svg>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function kilderStårAllerede(cluster: FactCluster): boolean {
  const viste = new Set([
    ...cluster.facts.map((fact) => fact.sourceName),
    ...(cluster.overview ? cluster.overview.sourceName.split(" · ") : []),
  ]);
  return cluster.sourceName.split(" · ").every((kilde) => viste.has(kilde));
}

/**
 * Alt kilden har i området, bak en utvidbar visning. Samme komponent for alle seksjoner,
 * slik at en ny datatype ikke krever ny UI-logikk. Antallet står aldri i standardvisningen.
 */
function OverviewDetails({ overview }: { overview: SectionOverview }) {
  return (
    <details className="disclosure">
      <summary className="link inline-flex min-h-11 items-center gap-1 text-[15px]">
        {overview.toggleLabel} ({overview.total})
        <Chevron className="size-3.5 text-accent" />
      </summary>

      <p className="mt-1 text-[15px] leading-relaxed text-ink">{overview.headline}</p>
      {overview.details.map((detail) => (
        <p key={detail} className="type-support mt-1">
          {detail}
        </p>
      ))}

      <div className="mt-2">
        <PlaceRows items={overview.items} />
      </div>

      {overview.caveat && <p className="type-meta mt-3">{overview.caveat}</p>}
      <p className="type-meta mt-2">Kilde: {overview.sourceName}</p>
    </details>
  );
}

/** Hele oversikten mangler, eller er tom. Én rolig linje — ikke en advarsel. */
function Notice({ children }: { children: React.ReactNode }) {
  return <p className="type-support mt-6 border-t border-line pt-4 text-ink">{children}</p>;
}
