import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { getResearchItem } from "@/lib/admin/research";
import { hentReviewHistorikk, hentReviewStatus } from "@/lib/admin/review";
import {
  REVIEW_MODE_LABEL,
  REVIEW_OUTCOME_LABEL,
  forklarNesteReview,
  grunnlinje,
  nårReview,
  sistKontrollert,
} from "@/lib/admin/review-types";
import {
  CATEGORY_SHORT,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  SOURCE_TYPE_LABEL,
  VERIFICATION_LABEL,
} from "@/lib/admin/research-types";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { ReviewMerke } from "@/components/admin/ReviewMerke";
import { ReviewSkjema } from "@/components/admin/ReviewSkjema";

export const metadata: Metadata = { title: "Review", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Review-panelet for ett funn.
 *
 * Alt man trenger for å gjøre kontrollen på én side: hva vi mener i dag, hvor ferskt det er,
 * hvilke kilder det hviler på, hva tidligere reviews konkluderte — og skjemaet som avslutter
 * reviewen.
 *
 * Panelet gjør ikke researchen. Det organiserer den: selve kontrollen er fortsatt discovery,
 * verifisering og oppfølging mot kildene, og forslagene i «Hva du bør søke etter» er ment som
 * en huskeliste, ikke som et svar.
 */
export default async function ReviewPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Review" state={session.state} />;

  const { id } = await params;
  const [funn, status, historikk] = await Promise.all([
    getResearchItem(session.client, id),
    hentReviewStatus(session.client, id).catch(() => null),
    hentReviewHistorikk(session.client, id).catch(() => []),
  ]);
  if (!funn) notFound();
  const { item, sources } = funn;

  const primær = sources.filter((s) => s.primary_source && s.supports_claim);
  const søkeforslag = forslag(item.title, item.municipality, item.operational_status);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <nav className="text-[13px] text-muted">
        <Link href="/admin/research" className="hover:underline">
          Research
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/admin/research/review" className="hover:underline">
          Review-kø
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">Review</span>
      </nav>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {status && <ReviewMerke state={status.review_state} />}
        <span className="text-[12px] font-medium tracking-[0.04em] text-muted uppercase">
          {[CATEGORY_SHORT[item.category] ?? item.category, item.subcategory].filter(Boolean).join(" · ")}
        </span>
      </div>
      <h1 className="mt-1.5 text-[26px] font-medium tracking-[-0.02em] [overflow-wrap:anywhere]">{item.title}</h1>
      <p className="mt-1 text-[15px] text-muted">
        {[item.address, item.city, item.municipality].filter(Boolean).join(", ") || "Uten adresse"}
        {item.latitude === null && " · uten koordinat"}
      </p>

      {/* Dagens informasjon */}
      <Seksjon tittel="Dagens informasjon">
        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          <Rad navn="Driftsstatus" verdi={OPERATIONAL_LABEL[item.operational_status]} />
          <Rad navn="Verifisering" verdi={VERIFICATION_LABEL[item.verification_status]} />
          <Rad navn="Sikkerhet" verdi={LEVEL_LABEL[item.confidence]} />
          <Rad navn="Interesse" verdi={LEVEL_LABEL[item.interest_level]} />
          <Rad navn="Kilder" verdi={`${item.source_count} (${primær.length} primær)`} />
          <Rad navn="Kan publiseres" verdi={item.public_candidate ? "vurdert som kandidat" : "nei"} />
        </dl>
        {item.why_interesting && <p className="mt-3 text-[15px] text-ink">{item.why_interesting}</p>}
        {item.notes && <p className="mt-2 text-[15px] text-muted">{item.notes}</p>}
      </Seksjon>

      {/* Freshness */}
      <Seksjon tittel="Freshness">
        {status ? (
          <>
            <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <Rad navn="Sist verifisert" verdi={status.last_verified_at ? dato(status.last_verified_at) : "aldri"} />
              <Rad navn="Sist review" verdi={status.last_reviewed_at ? dato(status.last_reviewed_at) : "aldri"} />
              <Rad navn="Neste review" verdi={status.next_review_at ? dato(status.next_review_at) : "ingen planlagt"} />
              <Rad navn="Planlagt av" verdi={REVIEW_MODE_LABEL[status.review_mode]} />
              <Rad navn="Antall reviews" verdi={String(status.review_count)} />
              <Rad
                navn="Nyeste kilde"
                verdi={status.newest_source_date ? dato(status.newest_source_date) : "ukjent dato"}
              />
            </dl>
            <p className="mt-3 text-[14px] text-ink">{forklarNesteReview(status)}</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {[nårReview(status.days_until_review, status.review_state), sistKontrollert(status.days_since_review)].join(
                " · ",
              )}
            </p>
            <p className="mt-2 text-[14px] text-ink">Grunn: {grunnlinje(status.review_reasons, 8).toLowerCase()}</p>
            {status.review_mode !== "policy" && status.review_mode_note && (
              <p className="mt-2 rounded-xl border border-line px-4 py-3 text-[14px] text-ink">
                Policyen er overstyrt: {status.review_mode_note}
              </p>
            )}
          </>
        ) : (
          <p className="text-[15px] text-muted">Kunne ikke hente review-status.</p>
        )}
      </Seksjon>

      {/* Kilder */}
      <Seksjon tittel={`Kilder (${sources.length})`}>
        {sources.length === 0 ? (
          <p className="text-[15px] text-muted">Ingen kilder. Et funn uten kilde er et lead.</p>
        ) : (
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.id} className="text-[15px]">
                <span className="text-ink">
                  {s.source_url ? (
                    <a href={s.source_url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                      {s.source_name}
                    </a>
                  ) : (
                    s.source_name
                  )}
                </span>
                <span className="text-muted">
                  {" · "}
                  {[
                    s.publisher,
                    SOURCE_TYPE_LABEL[s.source_type],
                    s.source_date ? dato(s.source_date) : null,
                    s.primary_source ? "primærkilde" : null,
                    s.supports_claim ? null : "støtter ikke påstanden",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      {/* Tidligere reviews */}
      <Seksjon tittel={`Tidligere reviews (${historikk.length})`}>
        {historikk.length === 0 ? (
          <p className="text-[15px] text-muted">Aldri kontrollert.</p>
        ) : (
          <ul className="space-y-2.5">
            {historikk.map((h) => (
              <li key={h.id} className="text-[14px]">
                <p className="text-ink">
                  {REVIEW_OUTCOME_LABEL[h.outcome]}
                  {h.changed && h.previous_status !== h.new_status && (
                    <span className="text-muted">
                      {" · "}
                      {OPERATIONAL_LABEL[h.previous_status as never] ?? h.previous_status} →{" "}
                      {OPERATIONAL_LABEL[h.new_status as never] ?? h.new_status}
                    </span>
                  )}
                  {h.changed && h.previous_confidence !== h.new_confidence && (
                    <span className="text-muted">
                      {" · sikkerhet "}
                      {h.previous_confidence} → {h.new_confidence}
                    </span>
                  )}
                </p>
                <p className="text-[13px] text-muted">
                  {[
                    dato(h.reviewed_at),
                    h.reviewed_by ?? "ukjent",
                    h.run_label,
                    h.sources_checked ? `${h.sources_checked} kilder kontrollert` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {h.summary && <p className="mt-0.5 text-[14px] text-ink">{h.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      {/* Huskelisten for selve researchen */}
      <Seksjon tittel="Hva du bør søke etter">
        <p className="text-[14px] text-muted">
          Review-systemet organiserer arbeidet, det gjør det ikke. Kontrollen er fortsatt discovery,
          verifisering og oppfølging mot kildene.
        </p>
        <ul className="mt-2 space-y-1 text-[14px] text-ink">
          {søkeforslag.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Seksjon>

      <Seksjon tittel="Avslutt reviewen">
        <ReviewSkjema
          itemId={item.id}
          nåværendeStatus={item.operational_status}
          nåværendeConfidence={item.confidence}
        />
      </Seksjon>

      <Link
        href={`/admin/research/${item.id}`}
        className="mt-8 inline-block text-[15px] font-medium text-accent hover:underline"
      >
        Åpne full research-detalj
      </Link>
      <br />
      <Link href="/admin/research/review" className="mt-2 inline-block text-[15px] font-medium text-accent hover:underline">
        Tilbake til køen
      </Link>
    </main>
  );
}

function Seksjon({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-[13px] font-medium tracking-[0.04em] text-muted uppercase">{tittel}</h2>
      <div className="mt-2.5 rounded-2xl border border-line bg-surface px-5 py-4">{children}</div>
    </section>
  );
}

function Rad({ navn, verdi }: { navn: string; verdi: string }) {
  return (
    <div className="flex justify-between gap-4 sm:block">
      <dt className="text-[13px] text-muted">{navn}</dt>
      <dd className="text-[15px] text-ink">{verdi}</dd>
    </div>
  );
}

/**
 * Søkeforslagene. Statusavhengige med vilje: et anlegg under bygging sjekkes for åpning og
 * forsinkelse, et planlagt prosjekt for vedtak og klage.
 */
function forslag(tittel: string, kommune: string | null, status: string): string[] {
  const navn = tittel.split(",")[0]!.trim();
  const sted = kommune ? ` ${kommune}` : "";
  const felles = [
    `«${navn}» siste nytt`,
    `«${navn}»${sted} — operatør eller eier, og om navnet er endret`,
    `Lokalavis for${sted || " kommunen"} de siste tolv månedene`,
  ];
  if (status === "under_construction") {
    return [...felles, `«${navn}» åpning, ferdigstillelse, forsinkelse, kapasitet`, "Operatørens egne pressemeldinger"];
  }
  if (status === "planned") {
    return [
      ...felles,
      `«${navn}» reguleringsplan, vedtak, klage, konsesjon`,
      `Kommunens postliste og planregister for${sted || " kommunen"}`,
    ];
  }
  if (status === "unknown") {
    return [...felles, `«${navn}» i Enhetsregisteret og i kommunens planregister`, "Om anlegget finnes fysisk i kart"];
  }
  return [...felles, `«${navn}» utvidelse, tillatelse, eierskifte, nedleggelse`, "Gjeldende tillatelse hos myndigheten"];
}

function dato(verdi: string): string {
  return new Date(verdi).toLocaleDateString("nb-NO", { dateStyle: "medium" });
}
