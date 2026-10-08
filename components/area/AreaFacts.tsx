"use client";

import Link from "next/link";
import { Suspense, use } from "react";
import { Chevron } from "@/components/ui/Chevron";
import { DeepLinkTarget } from "./DeepLinkTarget";
import { useMapSelection } from "./map-selection";
import { buildChapters, HVERDAG_CLUSTER, type Chapter, type ChapterPart } from "@/lib/area-chapters";
import { sectionAnchor } from "@/lib/area-summary";
import { assembleSection } from "@/lib/facts/assemble";
import { mergeFactResults } from "@/lib/facts/merge";
import type { AreaFactsResult, FactCluster, OverviewItem, SectionOverview } from "@/lib/facts/queries";
import { combineStates } from "@/lib/facts/section-state";
import { formatRadius } from "@/lib/format";
import { TILFLUKTSROM_NAERMESTE_LENKE } from "@/lib/facts/wording";
import { AREA_SECTIONS, PUBLIC_AREA_SECTIONS, sectionWaitsForLookups, type AreaFact } from "@/types/area-feature";
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
  /** Skolekretsnotisen, rendret på serveren. Står først i «Hverdagen». */
  skolekrets?: React.ReactNode;
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
  skolekrets,
  nearestShelterHref,
}: AreaFactsProps) {
  return (
    <div aria-busy={pending} className={`transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`}>
      <Suspense fallback={<AlleSkjeletter />}>
        <FactsBody
          storedFacts={storedFacts}
          lookupFacts={lookupFacts}
          radius={radius}
          saker={saker}
          friluft={friluft}
          skolekrets={skolekrets}
          nearestShelterHref={nearestShelterHref}
        />
      </Suspense>
    </div>
  );
}

/**
 * Ett kapittel: overskrift, eventuelt én linje, og seksjonene.
 *
 * Kapittelet vet ikke på forhånd om det får innhold — seksjonene strømmer inn hver for seg, og
 * noen faller bort. Det viser seg derfor bare når minst én seksjon (`data-section`) finnes i det.
 */
function ChapterShell({ chapter, children }: { chapter: Pick<Chapter, "id" | "label" | "lead">; children: React.ReactNode }) {
  const headingId = `kapittel-${chapter.id}`;
  return (
    <section aria-labelledby={headingId} className="hidden border-t border-ink/15 pt-6 has-[[data-section]]:block">
      {/* Den lille streken i aksentfargen er kapittelmerket — samme farge som lenker og valg. */}
      <h2 id={headingId} className="type-h2 flex items-center gap-2.5 text-ink">
        <span aria-hidden="true" className="h-4 w-1 rounded-full bg-accent" />
        {chapter.label}
      </h2>
      {chapter.lead && <p className="type-meta mt-1">{chapter.lead}</p>}
      <div className={SEKSJONER}>{children}</div>
    </section>
  );
}

/**
 * Seksjonene i et kapittel: lik luft over og under hver, og en tynn linje mellom dem. Rytmen
 * settes her og ikke i seksjonene, fordi de ligger i innpakninger av ulik dybde (anker, Suspense).
 */
const SEKSJONER = "flex flex-col divide-y divide-line *:py-4 *:last:pb-0";

/** Mens vi venter på den første kilden: kapitlene i standardrekkefølge, med rolige plassholdere. */
function AlleSkjeletter() {
  const { chapters } = buildChapters(PUBLIC_AREA_SECTIONS.map((section) => section.id));
  return (
    <div className="flex flex-col gap-9">
      {chapters.map((chapter) => (
        <ChapterShell key={chapter.id} chapter={chapter}>
          {chapter.parts.map((part) =>
            part.kind === "saker" ? (
              <SectionShell key="saker" label="Planer og saker">
                <SectionSkeleton label="Henter plansaker …" />
              </SectionShell>
            ) : part.kind === "section" && part.clusters !== "hverdag" ? (
              <SectionShell key={part.sectionId} label={SECTION_LABELS[part.sectionId] ?? part.sectionId}>
                <SectionSkeleton label="Henter data …" />
              </SectionShell>
            ) : null,
          )}
        </ChapterShell>
      ))}
    </div>
  );
}

/**
 * Databasen bestemmer hvilke seksjoner som finnes, så resten av siden venter på den — men bare
 * på den. Seksjoner som også trenger et direkte oppslag får sin egen venteboks.
 */
function FactsBody({
  storedFacts,
  lookupFacts,
  radius,
  saker,
  friluft,
  skolekrets,
  nearestShelterHref,
}: {
  storedFacts: Promise<AreaFactsResult>;
  lookupFacts: Promise<AreaFactsResult>;
  radius: number;
  saker: React.ReactNode;
  friluft?: React.ReactNode;
  skolekrets?: React.ReactNode;
  nearestShelterHref?: string;
}) {
  const db = use(storedFacts);
  const order = db.status === "ok" ? db.order : PUBLIC_AREA_SECTIONS.map((section) => section.id);
  const { lifted, chapters } = buildChapters(order);

  const seksjon = (sectionId: string, clusters?: "hverdag" | "ovrige") => {
    const key = `${sectionId}:${clusters ?? ""}`;
    return sectionWaitsForLookups(sectionId) ? (
      <Suspense
        key={key}
        fallback={
          <SectionShell label={SECTION_LABELS[sectionId] ?? sectionId}>
            <SectionSkeleton label="Henter data …" />
          </SectionShell>
        }
      >
        <FactSection sectionId={sectionId} db={db} lookupFacts={lookupFacts} radius={radius} />
      </Suspense>
    ) : (
      <FactSection
        key={key}
        sectionId={sectionId}
        clusters={clusters}
        db={db}
        radius={radius}
        nearestShelterHref={nearestShelterHref}
      />
    );
  };

  const del = (part: ChapterPart) => {
    switch (part.kind) {
      case "saker":
        return (
          <div key="saker" id={sectionAnchor("saker")} className="scroll-mt-24 outline-none">
            {saker}
          </div>
        );
      case "skolekrets":
        // Notisen finnes bare for noen adresser. En tom innpakning skal ikke etterlate en linje.
        return skolekrets ? <div key="skolekrets" className="empty:hidden">{skolekrets}</div> : null;
      case "friluft":
        return friluft ? <div key="friluft" className="empty:hidden">{friluft}</div> : null;
      case "section":
        return seksjon(part.sectionId, part.clusters);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-9">
        {lifted.length > 0 && <div className={SEKSJONER}>{lifted.map((sectionId) => seksjon(sectionId))}</div>}
        {chapters.map((chapter) => (
          <ChapterShell key={chapter.id} chapter={chapter}>
            {chapter.parts.map(del)}
          </ChapterShell>
        ))}
      </div>
      <Suspense fallback={null}>
        <Kildelinjer db={db} lookupFacts={lookupFacts} radius={radius} />
      </Suspense>
    </>
  );
}

/** Seksjonene oppsummeringen øverst lenker til. «Skoler og barnehager» er en gruppe i Nærområdet. */
function ankerFor(sectionId: string, clusters?: "hverdag" | "ovrige"): string | undefined {
  if (sectionId === "naeromradet") return clusters === "hverdag" ? sectionAnchor("skoler") : undefined;
  return sectionAnchor(sectionId);
}

/** Én seksjon, satt sammen av de kildene den faktisk bruker. */
function FactSection({
  sectionId,
  clusters,
  db,
  lookupFacts,
  radius,
  nearestShelterHref,
}: {
  sectionId: string;
  /** Bare for Nærområdet: hvilken del av gruppene som hører til dette kapittelet. */
  clusters?: "hverdag" | "ovrige";
  db: AreaFactsResult;
  /** Satt bare for seksjoner som faktisk bruker et direkte oppslag. */
  lookupFacts?: Promise<AreaFactsResult>;
  radius: number;
  nearestShelterHref?: string;
}) {
  // use() kan stå i en betingelse; hvorvidt en seksjon har oppslag er dessuten fast.
  const lookups = lookupFacts ? use(lookupFacts) : null;
  const deler = [db, ...(lookups ? [lookups] : [])];
  const state = combineStates(deler.map((d) => (d.status === "ok" ? "klar" : "feilet")));
  const hele = assembleSection(deler, sectionId, radius);
  // Kapitlene deler Nærområdet i to. Løse kort og oversikt følger «øvrige», så de står ett sted.
  const samlet =
    hele && clusters
      ? {
          ...hele,
          clusters: hele.clusters.filter((c) => (c.id === HVERDAG_CLUSTER) === (clusters === "hverdag")),
          facts: clusters === "hverdag" ? [] : hele.facts,
          overview: clusters === "hverdag" ? null : hele.overview,
        }
      : hele;

  const label = SECTION_LABELS[sectionId] ?? sectionId;
  const anker = ankerFor(sectionId, clusters);
  // Seksjonene med stabilt anker i URL-en. Ankeret står også på feilmeldingen: en lenke til
  // #tilfluktsrom skal lande på forklaringen, ikke øverst på siden.
  const ramme = (innhold: React.ReactNode) =>
    ANKERSEKSJONER.has(sectionId) ? (
      <DeepLinkTarget id={sectionId}>{innhold}</DeepLinkTarget>
    ) : (
      // Får fokus når brukeren kommer fra oppsummeringen. Det er en posisjon, ikke en kontroll.
      <div id={anker} className="scroll-mt-24 outline-none">
        {innhold}
      </div>
    );

  if (state === "feilet") {
    // Én melding per seksjon, også når kapitlene deler den i to.
    if (clusters === "hverdag") return null;
    return ramme(
      <SectionShell label={label}>
        <p className="type-support">Kunne ikke hente {label.toLowerCase()} akkurat nå.</p>
      </SectionShell>,
    );
  }
  if (!samlet || (samlet.clusters.length === 0 && samlet.facts.length === 0 && !samlet.overview)) return null;

  // Gruppene bærer navnet sitt selv. Da trenger ikke seksjonen en egen overskrift over.
  const bareGrupper = samlet.clusters.length > 0 && samlet.facts.length === 0 && !samlet.overview;

  return ramme(
    <SectionShell label={samlet.label} intro={bareGrupper ? null : samlet.intro} hideLabel={bareGrupper}>
      <div className="flex flex-col gap-5">
        {samlet.clusters.map((cluster) =>
          cluster.emptyNote ? (
            <EmptyNote
              key={cluster.id}
              // Noen grupper bruker selve meldingen som navn. Da står seksjonsnavnet over, ikke meldingen to ganger.
              label={cluster.label === cluster.emptyNote.text ? samlet.label : cluster.label}
              text={cluster.emptyNote.text}
              detail={cluster.emptyNote.detail}
              href={cluster.emptyNote.nearestLink ? nearestShelterHref : undefined}
            />
          ) : (
            <ClusterDetails key={cluster.id} cluster={cluster} />
          ),
        )}
        {samlet.facts.length > 0 && (
          <ul className="flex flex-col gap-5">
            {samlet.facts.map((fact) => (
              <li key={fact.id}>
                <FactItem fact={fact} />
              </li>
            ))}
          </ul>
        )}
        {samlet.overview && (
          <>
            {samlet.overview.noAttentionNote && <p className="type-support">{samlet.overview.noAttentionNote}</p>}
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
function EmptyNote({
  label,
  text,
  detail,
  href,
}: {
  label: string;
  text: string;
  detail?: string | null;
  href?: string;
}) {
  return (
    <div>
      <h3 className="type-h3 text-ink">{label}</h3>
      <p className="type-support mt-0.5">{text}</p>
      {detail && <p className="type-meta mt-1">{detail}</p>}
      {href && (
        <Link href={href} className="link mt-1 inline-flex min-h-11 items-center text-[15px]">
          {TILFLUKTSROM_NAERMESTE_LENKE} →
        </Link>
      )}
    </div>
  );
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
    return <Notice>Vi får ikke hentet områdedata akkurat nå.</Notice>;
  }
  if (samlet.groups.length === 0) {
    return <Notice>Ingen registrerte forhold i kildene våre innen {formatRadius(radius)}.</Notice>;
  }

  return (
    <div className="mt-9 border-t border-ink/15 pt-4">
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

/**
 * En gruppe: navn, én oppsummerende linje, og detaljene bak utvideren.
 *
 * Dette er grunnmønsteret på resultatsiden. Støy, naturfare, infrastruktur og hver stedstype i
 * nærområdet er alle én slik rad — lukket sier den hovedsaken, åpen viser den funnene, listene,
 * forbeholdet og kilden. Slik kan mange like steder finnes i området uten å fylle siden.
 */
function ClusterDetails({ cluster }: { cluster: FactCluster }) {
  return (
    <details open={cluster.defaultOpen || undefined} className="disclosure">
      <summary className="-mx-2 flex items-start gap-3 rounded-control px-2 py-1.5 hover:bg-sunken">
        <span className="min-w-0 flex-1">
          <h3 className="type-h3 text-ink">{cluster.label}</h3>
          <span className="type-support mt-0.5 block">{cluster.summary}</span>
        </span>
        <Chevron className="mt-1.5" />
      </summary>

      <div className="pt-4 pb-1">
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
          <div key={list.id} className="mt-4 first:mt-0">
            <h4 className="text-sm font-semibold text-muted">{list.label}</h4>
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

        {cluster.caveat && <p className="type-meta mt-4 whitespace-pre-line">{cluster.caveat}</p>}
        {cluster.overview && (
          <div className="mt-4">
            <OverviewDetails overview={cluster.overview} />
          </div>
        )}
        {/*
          Funnene og oversikten oppgir sin egen kilde. Står alle gruppens kilder allerede der,
          skal de ikke stå én gang til nederst.
        */}
        {!kilderStårAllerede(cluster) && <p className="type-meta mt-3">Kilde: {cluster.sourceName}</p>}
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
  return <p className="type-support mt-10 border-t border-line pt-5 text-ink">{children}</p>;
}
