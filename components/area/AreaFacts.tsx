"use client";

import Link from "next/link";
import { Suspense, use } from "react";
import { DeepLinkTarget } from "./DeepLinkTarget";
import { useMapSelection } from "./map-selection";
import {
  grunnforholdCluster,
  infrastrukturCluster,
  stoyCluster,
} from "@/lib/facts/clusters";
import { mergeFactResults } from "@/lib/facts/merge";
import type {
  AreaFactGroup,
  AreaFactsResult,
  FactCluster,
  OverviewItem,
  SectionOverview,
} from "@/lib/facts/queries";
import { combineStates } from "@/lib/facts/section-state";
import { formatRadius } from "@/lib/format";
import { TILFLUKTSROM_NAERMESTE_LENKE } from "@/lib/facts/wording";
import {
  AREA_SECTIONS,
  PUBLIC_AREA_SECTIONS,
  SAKER_SECTION_ID,
  sectionWaitsForLookups,
  type AreaFact,
} from "@/types/area-feature";
import { SectionSkeleton } from "./EventFeed";
import { SectionShell } from "./SectionShell";

/** Overskriftene brukes også før dataene finnes, så de må stå her og ikke bare i svaret. */
const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  AREA_SECTIONS.map((section) => [section.id, section.label]),
);

interface AreaFactsProps {
  /**
   * Kildene kommer som løfter. Databasen svarer på 0,1–1,8 s og bestemmer rekkefølgen — den
   * kan løfte en seksjon (i admins visning: forurenset grunn under søkepunktet). De direkte oppslagene bruker opptil
   * fem sekunder, og seksjonene deres venter for seg.
   */
  storedFacts: Promise<AreaFactsResult>;
  lookupFacts: Promise<AreaFactsResult>;
  radius: number;
  pending: boolean;
  /**
   * Plansaker. De kommer fra en annen kilde enn områdefakta, men står i samme rekkefølge som
   * resten — derfor sendes de inn hit i stedet for å ligge i en egen blokk over siden.
   */
  saker: React.ReactNode;
  /**
   * «Friluft i nærheten». Rendret på serveren og sendt inn ferdig, som skolekretsnotisen.
   * Står sist blant seksjonene, før kildelinjen: det er noe som finnes i nærheten, ikke et
   * forhold ved adressen, og har sin egen radius.
   */
  friluft?: React.ReactNode;
  /** Samme søk, men med de nærmeste tilfluktsrommene vist også utenfor valgt radius. */
  nearestShelterHref?: string;
}

/**
 * «Hva bør du vite om området?» — registrerte forhold fra offentlige kilder.
 * All tekst kommer fra lib/facts/wording.ts. Ingen score, ingen vurdering.
 */
export function AreaFacts({
  storedFacts,
  lookupFacts,
  radius,
  pending,
  saker,
  friluft,
  nearestShelterHref,
}: AreaFactsProps) {
  return (
    <section
      aria-labelledby="facts-heading"
      aria-busy={pending}
      className="mt-9"
    >
      {/*
        Bare for skjermlesere. Seksjonene under er H3, og hovedinnholdet trenger en H2 over dem.
        Synlig sa den det samme som adressen og radiusvelgeren rett over.
      */}
      <h2 id="facts-heading" className="sr-only">
        Funn i området
      </h2>

      <div
        className={`mt-4 transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`}
      >
        <Suspense fallback={<AlleSkjeletter />}>
          <FactsBody
            storedFacts={storedFacts}
            lookupFacts={lookupFacts}
            radius={radius}
            saker={saker}
            friluft={friluft}
            nearestShelterHref={nearestShelterHref}
          />
        </Suspense>
      </div>
    </section>
  );
}

/** Mens vi venter på den første kilden: én rolig linje per seksjon, i standardrekkefølge. */
function AlleSkjeletter() {
  return (
    <div className="flex flex-col gap-7">
      {PUBLIC_AREA_SECTIONS.map((section) => (
        <SectionShell key={section.id} label={section.label}>
          <SectionSkeleton label="Henter data …" />
        </SectionShell>
      ))}
    </div>
  );
}

/**
 * Databasen bestemmer rekkefølgen, så resten av siden venter på den — men bare på den.
 * Seksjoner som også trenger et direkte oppslag får sin egen venteboks.
 */
function FactsBody({
  storedFacts,
  lookupFacts,
  radius,
  saker,
  friluft,
  nearestShelterHref,
}: {
  storedFacts: Promise<AreaFactsResult>;
  lookupFacts: Promise<AreaFactsResult>;
  radius: number;
  saker: React.ReactNode;
  friluft?: React.ReactNode;
  nearestShelterHref?: string;
}) {
  const db = use(storedFacts);
  const order =
    db.status === "ok" ? db.order : PUBLIC_AREA_SECTIONS.map((section) => section.id);

  return (
    <>
      <div className="flex flex-col gap-7">
        {order.map((sectionId) =>
          sectionId === SAKER_SECTION_ID ? (
            <div key={sectionId}>{saker}</div>
          ) : sectionWaitsForLookups(sectionId) ? (
            <Suspense
              key={sectionId}
              fallback={
                <SectionShell label={SECTION_LABELS[sectionId] ?? sectionId}>
                  <SectionSkeleton label="Henter data …" />
                </SectionShell>
              }
            >
              <FactSection
                sectionId={sectionId}
                db={db}
                lookupFacts={lookupFacts}
                radius={radius}
              />
            </Suspense>
          ) : (
            <FactSection
              key={sectionId}
              sectionId={sectionId}
              db={db}
              radius={radius}
              nearestShelterHref={nearestShelterHref}
            />
          ),
        )}
        {friluft}
      </div>
      <Suspense fallback={null}>
        <Kildelinjer db={db} lookupFacts={lookupFacts} radius={radius} />
      </Suspense>
    </>
  );
}

/** Én seksjon, satt sammen av de kildene den faktisk bruker. */
function FactSection({
  sectionId,
  db,
  lookupFacts,
  radius,
  nearestShelterHref,
}: {
  sectionId: string;
  db: AreaFactsResult;
  /** Satt bare for seksjoner som faktisk bruker et direkte oppslag. */
  lookupFacts?: Promise<AreaFactsResult>;
  radius: number;
  nearestShelterHref?: string;
}) {
  // use() kan stå i en betingelse; hvorvidt en seksjon har oppslag er dessuten fast.
  const lookups = lookupFacts ? use(lookupFacts) : null;
  const deler = [db, ...(lookups ? [lookups] : [])];
  const state = combineStates(
    deler.map((del) => (del.status === "ok" ? "klar" : "feilet")),
  );

  const group = deler
    .flatMap((del) => (del.status === "ok" ? del.groups : []))
    .filter((g) => g.sectionId === sectionId)
    .reduce<AreaFactGroup | null>(
      (samlet, del) =>
        samlet === null
          ? del
          : {
              ...samlet,
              facts: [...samlet.facts, ...del.facts].sort(
                (a, b) =>
                  Number(b.contains) - Number(a.contains) ||
                  (a.distanceM ?? 0) - (b.distanceM ?? 0),
              ),
              clusters: [...samlet.clusters, ...del.clusters],
              overview: samlet.overview ?? del.overview,
            },
      null,
    );

  // Grunnforhold og infrastruktur får kilder fra begge hold, så gruppen bygges her — når
  // delene er slått sammen. Ellers ville seksjonen fått én gruppe per kilde.
  const samlet = group ? byggGruppe(sectionId, group, radius) : null;

  const label = SECTION_LABELS[sectionId] ?? sectionId;
  // Seksjonene med stabilt anker. Ankeret står også på feilmeldingen: en lenke til
  // #tilfluktsrom skal lande på forklaringen, ikke øverst på siden.
  const ramme = (innhold: React.ReactNode) =>
    ANKERSEKSJONER.has(sectionId) ? <DeepLinkTarget id={sectionId}>{innhold}</DeepLinkTarget> : innhold;

  if (state === "feilet") {
    return ramme(
      <SectionShell label={label}>
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
          Kunne ikke hente {label.toLowerCase()} akkurat nå.
        </p>
      </SectionShell>,
    );
  }
  if (!samlet) return null;

  return ramme(
    <SectionShell label={samlet.label} intro={samlet.intro}>
      <div className="flex flex-col gap-3">
        {samlet.clusters.map((cluster) =>
          cluster.emptyNote ? (
            <EmptyNote
              key={cluster.id}
              text={cluster.emptyNote.text}
              detail={cluster.emptyNote.detail}
              href={cluster.emptyNote.nearestLink ? nearestShelterHref : undefined}
            />
          ) : (
            // Er gruppen hele seksjonen, gjentar vi ikke navnet. Undertypene i Nærområdet
            // trenger sitt eget navn, fordi seksjonen rommer flere av dem.
            <ClusterDetails
              key={cluster.id}
              cluster={cluster}
              showLabel={cluster.label !== samlet.label}
            />
          ),
        )}
        {samlet.facts.length > 0 && (
          <ul className="flex flex-col gap-3">
            {samlet.facts.map((fact) => (
              <li key={fact.id}>
                <FactItem fact={fact} />
              </li>
            ))}
          </ul>
        )}
        {samlet.overview && (
          <>
            {samlet.overview.noAttentionNote && (
              <p className="text-[15px] leading-relaxed text-muted">
                {samlet.overview.noAttentionNote}
              </p>
            )}
            <OverviewDetails overview={samlet.overview} />
          </>
        )}
      </div>
    </SectionShell>,
  );
}

/** Seksjonene som har et stabilt anker i URL-en. Skolekrets har sitt i SkolekretsNotis. */
const ANKERSEKSJONER: ReadonlySet<string> = new Set(["tilfluktsrom"]);

/**
 * Ingen offentlige tilfluktsrom innen valgt radius: én linje, og lenken til de nærmeste.
 *
 * Ikke en utvider — det er ingenting å åpne. Lenken går til samme søk i spesialverktøyets
 * visning, der de nærmeste rommene står, merket som utenfor radius.
 */
function EmptyNote({ text, detail, href }: { text: string; detail?: string | null; href?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-3.5 text-[15px]">
      <p className="text-ink">{text}</p>
      {detail && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{detail}</p>}
      {href && (
        <Link href={href} className="mt-1 inline-flex h-9 items-center font-medium text-accent hover:underline">
          {TILFLUKTSROM_NAERMESTE_LENKE} →
        </Link>
      )}
    </div>
  );
}

/** Seksjoner hvis gruppe bygges av de ferdige faktaene, ikke av delsvarene hver for seg. */
const BYGGES_AV_FAKTA: Record<
  string,
  (facts: AreaFact[], radiusM: number) => FactCluster | null
> = {
  grunnforhold: grunnforholdCluster,
  infrastruktur: infrastrukturCluster,
  stoy: stoyCluster,
};

function byggGruppe(
  sectionId: string,
  group: AreaFactGroup,
  radiusM: number,
): AreaFactGroup {
  const bygg = BYGGES_AV_FAKTA[sectionId];
  if (!bygg || group.facts.length === 0) return group;
  const cluster = bygg(group.facts, radiusM);
  return cluster
    ? { ...group, facts: [], clusters: [...group.clusters, cluster] }
    : group;
}

/** Kildelisten nederst kan først skrives når alle kildene har svart. */
function Kildelinjer({
  db,
  lookupFacts,
  radius,
}: {
  db: AreaFactsResult;
  lookupFacts: Promise<AreaFactsResult>;
  radius: number;
}) {
  const samlet = mergeFactResults(db, use(lookupFacts));
  if (samlet.status !== "ok") {
    return (
      <Notice>
        <p className="font-medium text-ink">
          Vi får ikke hentet områdedata akkurat nå.
        </p>
      </Notice>
    );
  }
  if (samlet.groups.length === 0) {
    return (
      <Notice>
        <p className="font-medium text-ink">
          Ingen registrerte forhold i kildene våre innen {formatRadius(radius)}.
        </p>
      </Notice>
    );
  }

  return (
    <>
      {samlet.unavailableSources.length > 0 && (
        <p className="mt-5 text-[13px] text-muted">
          Disse kildene svarte ikke akkurat nå:{" "}
          {samlet.unavailableSources.join(", ")}. Resten av oversikten er
          fullstendig.
        </p>
      )}
      {samlet.sources.length > 0 && (
        /*
         * Samlet provenance, bak en utvider.
         *
         * Listen sto tidligere som et avsnitt rett under siste seksjon, og var da den lengste
         * sammenhengende teksten på siden — den konkurrerte visuelt med selve funnene. Den er
         * fortsatt komplett og ett trykk unna; det er rekkefølgen som er endret, ikke innholdet.
         */
        <details className="mt-8 rounded-2xl border border-line bg-surface">
          <summary className="cursor-pointer px-5 py-3.5 text-[13px] font-medium text-muted hover:text-ink">
            Kilder og metode ({samlet.sources.length})
          </summary>
          <div className="px-5 pb-4">
            <ul className="divide-y divide-line border-t border-line">
              {samlet.sources.map((source) => (
                <li
                  key={source.name}
                  className="py-2.5 text-[13px] leading-relaxed"
                >
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      {source.name}
                    </a>
                  ) : (
                    <span className="text-ink">{source.name}</span>
                  )}
                  <span className="block text-muted">
                    {source.owner} · {source.licenseName}
                  </span>
                  {source.method && (
                    <span className="mt-0.5 block text-muted">
                      {source.method}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Datasettene over er de som faktisk inngikk i dette resultatet.
              NaboRadar vurderer ikke forholdene eller stedene, og viser bare
              det kildene selv oppgir.
            </p>
          </div>
        </details>
      )}
    </>
  );
}

function FactItem({ fact }: { fact: AreaFact }) {
  return (
    <article className="rounded-2xl border border-line bg-surface px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[15px] leading-snug font-medium text-balance text-ink [overflow-wrap:anywhere]">
          {fact.headline}
        </h4>
        {fact.distanceLabel && (
          <span
            className={`shrink-0 text-sm ${fact.contains ? "font-medium text-ink" : "text-muted"}`}
          >
            {fact.distanceLabel}
          </span>
        )}
      </div>

      {fact.details.map((detail) => (
        <p key={detail} className="mt-1 text-[15px] leading-relaxed text-muted">
          {detail}
        </p>
      ))}

      {fact.caveat && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {fact.caveat}
        </p>
      )}

      {fact.technical.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] font-medium text-muted hover:text-ink">
            Detaljer
          </summary>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {fact.technical.join(" · ")}
          </p>
        </details>
      )}

      <p className="mt-2 text-[13px] text-muted">
        Kilde: {fact.sourceName}
        {fact.sourceDateLabel ? ` · ${fact.sourceDateLabel}` : ""}
      </p>

      {fact.link && (
        <a
          href={fact.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex h-9 items-center text-[15px] font-medium text-accent hover:underline"
        >
          {fact.link.label} ↗
        </a>
      )}
    </article>
  );
}

/** Kompakte rader: navn, kort undertekst og avstand. Samme markup i grupper og oversikter. */
/**
 * Rader i en kompakt gruppe.
 *
 * Når raden har et tilsvarende objekt i kartet, blir den en knapp som velger det: markøren
 * utheves, kartet panorerer hvis objektet ligger utenfor utsnittet, og popupen åpner seg —
 * samme tilstand som ved klikk direkte i kartet. Mekanismen er generell og gjelder alle
 * gruppene, ikke bare én type.
 *
 * Rader uten kartobjekt oppfører seg som før. En ekstern kildelenke ligger ved siden av
 * valget, slik at de to ikke konkurrerer om det samme trykket.
 */
function PlaceRows({ items }: { items: OverviewItem[] }) {
  const { selectedId, select, selectable } = useMapSelection();
  return (
    <ul className="mt-2 divide-y divide-line border-t border-line">
      {items.map((item) => {
        const kanVelges = selectable.has(item.id);
        const valgt = selectedId === item.id;
        return (
          <li
            key={item.id}
            className={`relative flex items-baseline justify-between gap-3 py-2.5 ${
              valgt ? "bg-accent-soft" : kanVelges ? "hover:bg-ink/[0.03]" : ""
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
                className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <span className="sr-only">Vis {item.title} i kartet</span>
              </button>
            )}
            <span className="min-w-0">
              <span
                className={`text-[15px] text-ink [overflow-wrap:anywhere] ${valgt ? "font-medium" : ""}`}
              >
                {item.title}
              </span>
              <span className="block text-[13px] text-muted">
                {item.subtitle}
                {item.href && (
                  <>
                    {" · "}
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-20 text-accent hover:underline"
                    >
                      Kilde ↗
                    </a>
                  </>
                )}
              </span>
            </span>
            <span className="flex shrink-0 items-baseline gap-1.5">
              <span
                className={`text-sm ${item.contains ? "font-medium text-ink" : "text-muted"}`}
              >
                {item.distanceLabel}
              </span>
              {/*
                Diskret markør for at raden hører til et punkt i kartet. Den er alltid til
                stede for rader som kan velges, men nesten usynlig til man er på den — nok til
                å skille dem fra radene uten kartobjekt, uten å bli et ikonbatteri.
              */}
              {kanVelges && (
                <span
                  aria-hidden="true"
                  className={`text-[13px] transition-colors ${valgt ? "text-accent" : "text-line-strong"}`}
                >
                  ›
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * En gruppe av relaterte stedstyper, f.eks. «Skoler og barnehager». Standardvisningen er
 * bare navn og antall; listene ligger bak utvideren, og hver undertype viser de nærmeste
 * få før resten. Slik kan mange like steder finnes i området uten å fylle siden.
 */
function ClusterDetails({
  cluster,
  showLabel = true,
}: {
  cluster: FactCluster;
  showLabel?: boolean;
}) {
  return (
    <details open={cluster.defaultOpen || undefined} className="rounded-2xl border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-3.5">
        {showLabel ? (
          <>
            <span className="text-[15px] font-medium text-ink">
              {cluster.label}
            </span>
            <span className="mt-0.5 block text-[13px] text-muted">
              {cluster.summary}
            </span>
          </>
        ) : (
          // Seksjonsoverskriften står rett over; da bærer oppsummeringen linjen alene.
          <span className="text-[15px] font-medium text-ink">
            {cluster.summary}
          </span>
        )}
      </summary>

      <div className="px-5 pb-4">
        {cluster.facts.length > 0 && (
          <ul className="mt-1 flex flex-col gap-3">
            {cluster.facts.map((fact) => (
              <li key={fact.id}>
                <FactItem fact={fact} />
              </li>
            ))}
          </ul>
        )}

        {cluster.lists.map((list) => (
          <div key={list.id} className="mt-3">
            <h5 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
              {list.label}
            </h5>
            <PlaceRows items={list.items.slice(0, list.previewCount)} />
            {list.toggleLabel && (
              <details className="mt-1">
                <summary className="inline-flex h-9 cursor-pointer items-center text-[15px] font-medium text-accent">
                  {list.toggleLabel}
                </summary>
                <PlaceRows items={list.items.slice(list.previewCount)} />
              </details>
            )}
          </div>
        ))}

        {cluster.caveat && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            {cluster.caveat}
          </p>
        )}
        {cluster.overview && (
          <div className="mt-3">
            <OverviewDetails overview={cluster.overview} />
          </div>
        )}
        {/*
          Kortene og oversikten oppgir sin egen kilde. Står alle gruppens kilder allerede der,
          skal de ikke stå én gang til nederst.
        */}
        {!kilderStårAllerede(cluster) && (
          <p className="mt-2 text-[13px] text-muted">
            Kilde: {cluster.sourceName}
          </p>
        )}
      </div>
    </details>
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
    <details className="rounded-2xl border border-line bg-surface px-5 py-4">
      <summary className="cursor-pointer text-[15px] font-medium text-ink">
        {overview.toggleLabel} ({overview.total})
      </summary>

      <p className="mt-3 text-[15px] leading-relaxed text-ink">
        {overview.headline}
      </p>
      {overview.details.map((detail) => (
        <p key={detail} className="mt-1 text-[15px] leading-relaxed text-muted">
          {detail}
        </p>
      ))}

      <PlaceRows items={overview.items} />

      {overview.caveat && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          {overview.caveat}
        </p>
      )}
      <p className="mt-2 text-[13px] text-muted">
        Kilde: {overview.sourceName}
      </p>
    </details>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-[15px]">
      {children}
    </div>
  );
}
