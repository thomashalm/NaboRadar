import { REVIEW_STATE_LABEL, REVIEW_STATE_TONE, type ReviewState } from "@/lib/admin/review-types";

/**
 * Tilstandsmerket for review.
 *
 * Bare to toner roper: forsinket og oppfølging. Resten skal kunne stå i en liste uten å ta
 * oppmerksomhet fra tittelen — et freshness-signal, ikke et varsel.
 */
const KLASSE: Record<"varsel" | "aktiv" | "rolig" | "nøytral", string> = {
  varsel: "bg-danger-soft text-danger",
  aktiv: "bg-ink text-surface",
  rolig: "border border-line text-ink",
  nøytral: "border border-line text-muted",
};

export function ReviewMerke({ state, liten = false }: { state: ReviewState; liten?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full font-medium tracking-[0.02em] ${
        liten ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"
      } ${KLASSE[REVIEW_STATE_TONE[state]]}`}
    >
      {REVIEW_STATE_LABEL[state]}
    </span>
  );
}
