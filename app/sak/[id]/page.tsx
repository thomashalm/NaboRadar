import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaShell } from "@/components/area/AreaShell";
import { EventDetailMap } from "@/components/event/EventDetailMap";
import { areaParamsSchema, buildAreaHref } from "@/lib/area-params";
import {
  DOCUMENT_TYPE_LABELS,
  EVENT_DATE_LABELS,
  EVENT_TYPE_LABELS,
  PROVIDER_SOURCE_NAMES,
  documentFormatLabel,
} from "@/lib/events/labels";
import { getEventDetail, type EventDetail } from "@/lib/events/queries";
import { formatArea, formatDate, formatDistance } from "@/lib/format";
import { getMapTileConfig } from "@/lib/map/config";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Søkekonteksten (hvor brukeren kom fra) er valgfri. Ugyldig kontekst ignoreres. */
async function readContext(searchParams: Props["searchParams"]) {
  const parsed = areaParamsSchema.safeParse(await searchParams);
  return parsed.success ? parsed.data : null;
}

/**
 * Saksidene er ekte, offentlig innhold med hver sin plansak, og de skal kunne finnes.
 *
 * Men URL-en bærer søkekonteksten (lat, lng, radius, label) slik at «tilbake» og avstand
 * virker, og hver variant ville ellers vært en egen side i indeksen. Canonical peker derfor
 * på saken uten kontekst.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getEventDetail(id);
  if (result.status !== "ok") return { title: "Sak", robots: { index: false, follow: true } };
  const { event } = result;
  // DiBK gir bare kommunenummer. «Varslet planoppstart i kommune 0301» leser dårlig i et
  // søkeresultat, så stedet nevnes bare når vi faktisk har et navn.
  const sted = event.municipalityName ? ` i ${event.municipalityName}` : "";
  return {
    title: event.title,
    description: `Varslet planoppstart${sted}. Se planområdet i kart, fakta fra Direktoratet for byggkvalitet og lenke til kilden.`,
    alternates: { canonical: `/sak/${id}` },
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { id } = await params;
  const context = await readContext(searchParams);
  const result = await getEventDetail(id, context ?? undefined);

  if (result.status === "not_found") notFound();

  const backHref = context
    ? buildAreaHref({
        lat: context.lat,
        lng: context.lng,
        radius: context.radius,
        label: context.label,
        sort: context.sortering,
        // `fra` er allowlistet i areaParamsSchema, så tilbake-lenken kan ikke peke ut av appen.
        basePath: context.fra,
      })
    : null;
  const backLabel = context?.label ?? "området";

  if (result.status === "unavailable") {
    return (
      <AreaShell>
        <main className="mx-auto max-w-2xl px-5 pt-12 pb-24 sm:px-8">
          {backHref && <BackLink href={backHref} label={backLabel} />}
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Vi får ikke hentet saken akkurat nå.</h1>
          <p className="mt-3 text-lg text-muted">Prøv igjen litt senere.</p>
          {process.env.NODE_ENV === "development" && (
            <p className="mt-6 rounded-lg bg-danger-soft px-3 py-2 font-mono text-xs text-danger">Dev: {result.devReason}</p>
          )}
        </main>
      </AreaShell>
    );
  }

  const event = result.event;
  const announced = formatDate(event.announcedAt);

  return (
    <AreaShell>
      <main className="mx-auto max-w-3xl px-5 pt-8 pb-24 sm:px-8 sm:pt-12">
        {backHref && <BackLink href={backHref} label={backLabel} />}

        <header className="mt-6">
          <p className="text-xs font-semibold tracking-[0.08em] text-plan uppercase">{EVENT_TYPE_LABELS[event.type]}</p>
          <h1 className="mt-2 text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-balance [overflow-wrap:anywhere] sm:text-[2.5rem]">
            {event.title}
          </h1>
          {announced && (
            <p className="mt-2 text-lg text-muted">
              {EVENT_DATE_LABELS[event.type]} {announced}
            </p>
          )}
          {event.removedFromSourceAt && (
            <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-[15px] text-ink ring-1 ring-line">
              Saken finnes ikke lenger i kilden (fjernet før {formatDate(event.removedFromSourceAt)}).
            </p>
          )}
        </header>

        <div className="mt-8 h-[46vh] min-h-72 overflow-hidden rounded-2xl border border-line sm:h-[26rem]">
          <EventDetailMap
            event={event}
            origin={context ? { lat: context.lat, lng: context.lng } : null}
            tiles={getMapTileConfig()}
          />
        </div>

        <AboutSection event={event} contextLabel={context ? backLabel : null} />
        <DocumentsSection event={event} />
        <SourceSection event={event} />
      </main>
    </AreaShell>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center gap-1.5 rounded-full text-[15px] font-medium text-accent hover:underline">
      <span aria-hidden="true">←</span> Tilbake til {label}
    </Link>
  );
}

function AboutSection({ event, contextLabel }: { event: EventDetail; contextLabel: string | null }) {
  const rows: [string, string][] = [];
  if (event.distanceM !== null && contextLabel) {
    rows.push([`Avstand fra ${contextLabel}`, event.distanceM < 1 ? "Omfatter stedet" : formatDistance(event.distanceM).replace(" unna", "")]);
  }
  if (event.attributes.plantype) rows.push(["Plantype", event.attributes.plantype]);
  if (event.municipalityName || event.municipalityNumber) {
    rows.push(["Kommunenummer", [event.municipalityNumber, event.municipalityName].filter(Boolean).join(" · ")]);
  }
  if (event.computedAreaM2) rows.push(["Beregnet planområde", `ca. ${formatArea(event.computedAreaM2)}`]);
  const announced = formatDate(event.announcedAt);
  if (announced) rows.push(["Varsel om planoppstart", announced]);
  const updated = formatDate(event.sourceUpdatedAt);
  if (updated) rows.push(["Sist oppdatert hos kilden", updated]);

  return (
    <section aria-labelledby="about-heading" className="mt-12">
      <div className="flex items-center gap-3">
        <h2 id="about-heading" className="text-xl font-semibold tracking-tight">
          Om saken
        </h2>
        <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line">
          Offentlige kildedata
        </span>
      </div>
      <dl className="mt-4 divide-y divide-line border-y border-line">
        {rows.map(([term, value]) => (
          <div key={term} className="grid grid-cols-1 gap-0.5 py-3.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="text-[15px] text-muted">{term}</dt>
            <dd className="text-[15px] text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Beregnet planområde er regnet ut av NaboRadar fra kartgrensen, og er ikke et offisielt oppgitt areal. Kilden oppgir
        ikke om planarbeidet fortsatt pågår.
      </p>
    </section>
  );
}

function DocumentsSection({ event }: { event: EventDetail }) {
  return (
    <section aria-labelledby="documents-heading" className="mt-12">
      <h2 id="documents-heading" className="text-xl font-semibold tracking-tight">
        Dokumenter
      </h2>
      {event.documents.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">Ingen dokumenter er publisert sammen med varselet i kilden.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {event.documents.map((doc) => {
            const format = documentFormatLabel(doc.mimeType);
            const date = formatDate(doc.documentDate);
            return (
              <li key={doc.id}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-3 hover:border-line-strong"
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-ink">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {[format, date, doc.title].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-accent">
                    Åpne<span className="sr-only"> (åpnes hos kilden i ny fane)</span> ↗
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SourceSection({ event }: { event: EventDetail }) {
  const owner = PROVIDER_SOURCE_NAMES[event.providerId] ?? "kilden";
  let host: string | null = null;
  try {
    host = event.sourceUrl ? new URL(event.sourceUrl).hostname.replace(/^www\./, "") : null;
  } catch {
    host = null;
  }
  return (
    <section aria-labelledby="source-heading" className="mt-12">
      <h2 id="source-heading" className="text-xl font-semibold tracking-tight">
        Kilde
      </h2>
      <p className="mt-3 text-[15px] text-muted">
        Varsel om planoppstart registrert hos {owner} (datasettet «Planlegging igangsatt», NLOD 2.0). Hentet av NaboRadar{" "}
        {formatDate(event.syncedAt)}.
      </p>
      {event.sourceUrl && (
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-medium text-white hover:bg-ink/85"
        >
          Se original informasjon
          <span className="text-white/70">{event.sourceUrlType === "provider_page" ? `hos ${owner}` : host ? `(${host})` : ""}</span>
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </section>
  );
}
