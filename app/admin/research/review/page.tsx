import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin/session";
import { hentReviewKø, hentReviewMetrics } from "@/lib/admin/review";
import {
  HURTIGFILTRE,
  SIDESTØRRELSE,
  hurtigErAktiv,
  køHref,
  lesKøfilter,
  type Køfilter,
} from "@/lib/admin/review-queue-filters";
import {
  REVIEW_STATES,
  REVIEW_STATE_LABEL,
  type ReviewKøElement,
  grunnlinje,
  nårReview,
  sistKontrollert,
} from "@/lib/admin/review-types";
import {
  CATEGORY_SHORT,
  LEVELS,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  OPERATIONAL_STATUSES,
  RESEARCH_CATEGORIES,
} from "@/lib/admin/research-types";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { ReviewMerke } from "@/components/admin/ReviewMerke";

export const metadata: Metadata = { title: "Review-kø", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Review-køen.
 *
 * Arbeidslisten for research: «dette er de tolv tingene jeg bør undersøke nå», ikke «her er 216
 * databaseposter med datoer». Derfor er standardvisningen bare det som er aktuelt — forsinket,
 * forfalt og oppfølging — sortert etter hva som haster, ikke etter alder alene.
 *
 * Filtrering, sortering og paginering skjer i databasen. Køen skal tåle å vokse.
 */
export default async function ReviewKøPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Review-kø" state={session.state} />;

  const filter = lesKøfilter(await searchParams);

  const [metrics, kø] = await Promise.all([
    hentReviewMetrics(session.client).catch(() => null),
    hentReviewKø(session.client, filter).catch((error: unknown) => ({
      elementer: [] as ReviewKøElement[],
      totalt: 0,
      feil: error instanceof Error ? error.message : "ukjent feil",
    })),
  ]);
  const feil = "feil" in kø ? kø.feil : null;

  const sider = Math.max(1, Math.ceil(kø.totalt / SIDESTØRRELSE));
  const fra = kø.totalt === 0 ? 0 : (filter.side - 1) * SIDESTØRRELSE + 1;
  const til = Math.min(filter.side * SIDESTØRRELSE, kø.totalt);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <nav className="text-[13px] text-muted">
        <Link href="/admin/research" className="hover:underline">
          Research
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">Review-kø</span>
      </nav>

      <h1 className="mt-2 text-[26px] font-medium tracking-[-0.02em]">Review-kø</h1>

      {metrics && (
        <p className="mt-2 text-[15px] text-muted">
          {oppsummering([
            [metrics.due + metrics.overdue + metrics.needs_followup, "trenger review"],
            [metrics.overdue, "forsinket"],
            [metrics.planned_or_building_due, "planlagt eller under bygging"],
            [metrics.weak_high_interest_due, "svake high-interest-leads"],
            [metrics.due_soon, "snart klare"],
          ])}
        </p>
      )}

      {/* Hurtigfiltrene er køens egentlige inngang. Nedtrekkene ligger under, for finjustering. */}
      <div className="mt-5 flex flex-wrap gap-2">
        {HURTIGFILTRE.map((h) => {
          const aktiv = hurtigErAktiv(h, filter);
          return (
            <Link
              key={h.slug}
              href={køHref({ ...filter, ...h.filter, side: 1 })}
              aria-current={aktiv ? "true" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-[14px] ${
                aktiv ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink"
              }`}
            >
              {h.label}
            </Link>
          );
        })}
      </div>

      <details className="mt-4 rounded-2xl border border-line bg-surface px-5 py-4">
        <summary className="cursor-pointer text-[15px] font-medium text-ink">Flere filtre</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="state" value={filter.states.join(",")} />
          <label className="block sm:col-span-2">
            <span className="text-[13px] text-muted">Søk</span>
            <input
              type="search"
              name="q"
              defaultValue={filter.sok ?? ""}
              placeholder="Tittel, adresse, kommune"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
            />
          </label>
          <Velg
            navn="kategori"
            label="Kategori"
            verdi={filter.kategori}
            valg={RESEARCH_CATEGORIES.map((c) => ({ verdi: c, label: CATEGORY_SHORT[c] ?? c }))}
          />
          <label className="block">
            <span className="text-[13px] text-muted">Kommune</span>
            <input
              type="text"
              name="kommune"
              defaultValue={filter.kommune ?? ""}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
            />
          </label>
          <Velg
            navn="drift"
            label="Driftsstatus"
            verdi={filter.drift[0]}
            valg={OPERATIONAL_STATUSES.map((s) => ({ verdi: s, label: OPERATIONAL_LABEL[s] }))}
          />
          <Velg
            navn="state"
            label="Review-tilstand"
            verdi={filter.states.length === 1 ? filter.states[0] : undefined}
            valg={REVIEW_STATES.map((s) => ({ verdi: s, label: REVIEW_STATE_LABEL[s] }))}
            alleLabel="aktuelle nå"
          />
          <Velg
            navn="sikkerhet"
            label="Sikkerhet"
            verdi={filter.confidence[0]}
            valg={LEVELS.map((l) => ({ verdi: l, label: LEVEL_LABEL[l] }))}
          />
          <Velg
            navn="interesse"
            label="Interesse"
            verdi={filter.interesse[0]}
            valg={LEVELS.map((l) => ({ verdi: l, label: LEVEL_LABEL[l] }))}
          />
          <div className="flex items-end gap-3 sm:col-span-2">
            <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-surface">
              Bruk filtre
            </button>
            <Link href="/admin/research/review" className="text-[15px] font-medium text-accent hover:underline">
              Nullstill
            </Link>
          </div>
        </form>
      </details>

      {feil && (
        <p className="mt-6 rounded-2xl bg-danger-soft px-5 py-4 text-[15px] text-danger">
          Kunne ikke hente køen: {feil}
        </p>
      )}

      <p className="mt-6 text-[13px] text-muted">
        {kø.totalt === 0 ? "Ingenting i dette utvalget" : `Viser ${fra}–${til} av ${kø.totalt}`}
      </p>

      {kø.totalt === 0 && !feil && (
        <p className="mt-3 rounded-2xl border border-line bg-surface px-5 py-8 text-center text-[15px] text-muted">
          Ingenting trenger review i dette utvalget nå.
        </p>
      )}

      <ol className="mt-3 space-y-2.5">
        {kø.elementer.map((e) => (
          <Køkort key={e.id} element={e} />
        ))}
      </ol>

      {sider > 1 && (
        <nav className="mt-6 flex items-center justify-between text-[15px]">
          {filter.side > 1 ? (
            <Link href={køHref({ ...filter, side: filter.side - 1 })} className="font-medium text-accent hover:underline">
              Forrige
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Side {filter.side} av {sider}
          </span>
          {filter.side < sider ? (
            <Link href={køHref({ ...filter, side: filter.side + 1 })} className="font-medium text-accent hover:underline">
              Neste
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <Link href="/admin/research" className="mt-10 inline-block text-[15px] font-medium text-accent hover:underline">
        Til research
      </Link>
    </main>
  );
}

/** Ett køelement. Tittel, hvor, tilstand, grunn, og når det sist ble sett på. Ingenting mer. */
function Køkort({ element: e }: { element: ReviewKøElement }) {
  const sted = [e.address, e.city, e.municipality].filter(Boolean).join(", ");
  return (
    <li className="rounded-2xl border border-line bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReviewMerke state={e.review_state} />
        <span className="text-[12px] font-medium tracking-[0.04em] text-muted uppercase">
          {[CATEGORY_SHORT[e.category] ?? e.category, OPERATIONAL_LABEL[e.operational_status as never] ?? e.operational_status]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      <h2 className="mt-1.5 text-[17px] font-medium tracking-[-0.01em]">
        <Link href={`/admin/research/review/${e.id}`} className="text-ink hover:underline [overflow-wrap:anywhere]">
          {e.title}
        </Link>
      </h2>
      <p className="mt-0.5 text-[15px] text-muted">{sted || "Uten adresse"}</p>

      <p className="mt-2 text-[14px] text-ink">{grunnlinje(e.review_reasons)}</p>
      <p className="mt-0.5 text-[13px] text-muted">
        {[nårReview(e.days_until_review, e.review_state), sistKontrollert(e.days_since_review)].join(" · ")}
        {e.review_count > 0 && ` · kontrollert ${e.review_count} ${e.review_count === 1 ? "gang" : "ganger"}`}
      </p>
    </li>
  );
}

function Velg({
  navn,
  label,
  verdi,
  valg,
  alleLabel = "alle",
}: {
  navn: string;
  label: string;
  verdi?: string;
  valg: { verdi: string; label: string }[];
  alleLabel?: string;
}) {
  return (
    <label htmlFor={`f-${navn}`} className="block">
      <span className="text-[13px] text-muted">{label}</span>
      <select
        id={`f-${navn}`}
        name={navn}
        defaultValue={verdi ?? ""}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
      >
        <option value="">{alleLabel}</option>
        {valg.map((v) => (
          <option key={v.verdi} value={v.verdi}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** «23 trenger review · 7 forsinket · 6 planlagt». Utelater det som er null. */
function oppsummering(deler: [number, string][]): string {
  const vist = deler.filter(([n]) => n > 0).map(([n, t]) => `${n} ${t}`);
  return vist.length ? vist.join(" · ") : "Ingenting trenger review nå";
}

export type { Køfilter };
