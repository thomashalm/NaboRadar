import { HVERDAG_CLUSTER } from "@/lib/area-chapters";
import { eventCountLabel, eventEmptyParts } from "@/lib/events/summary";
import { DEFAULT_ANNOUNCED_WITHIN_MONTHS } from "@/lib/geo/constants";
import type { AreaEventsResult } from "@/lib/events/queries";
import { assembleSection } from "@/lib/facts/assemble";
import type { AreaFactsResult } from "@/lib/facts/queries";

/**
 * «Området i korte trekk»: én linje per tema, øverst på resultatsiden.
 *
 * Oppsummeringen formulerer ingenting selv. Hver linje er den samme teksten som står på
 * seksjonen lenger ned — gruppens oppsummering fra formuleringsregisteret, eller tellingen av
 * plansaker — og den lenker dit. Derfor kan den ikke bli mer bastant enn kilden, og den kan ikke
 * si noe annet enn detaljene.
 *
 * Ingen score, ingen rangering, ingen «bra» eller «dårlig». Et tema uten svar står ikke her:
 * fravær av data er ikke et funn. `pending` sier at kilden ikke har svart ennå.
 */
export interface SummaryItem {
  id: string;
  /** Temaet, f.eks. «Støy». */
  label: string;
  /** Ferdig formulert linje. null mens kilden lastes. */
  text: string | null;
  /** Avgrensninger som hører til linjen, f.eks. radius og periode. */
  detail?: string;
  /** Ankeret til seksjonen. */
  href: string;
}

export interface SummaryInput {
  stored: AreaFactsResult | null;
  /** null mens oppslagene pågår. `"failed"` når de ikke kom — da venter vi ikke lenger. */
  lookups: AreaFactsResult | "failed" | null;
  events: AreaEventsResult | null;
  radius: number;
}

const TEMA: readonly { id: string; label: string; sectionId: string; cluster?: string; needsLookups: boolean }[] = [
  { id: "stoy", label: "Støy", sectionId: "stoy", needsLookups: true },
  { id: "grunnforhold", label: "Naturfare", sectionId: "grunnforhold", needsLookups: true },
  { id: "saker", label: "Planer", sectionId: "saker", needsLookups: false },
  { id: "skoler", label: "Skoler og barnehager", sectionId: "naeromradet", cluster: HVERDAG_CLUSTER, needsLookups: false },
  { id: "infrastruktur", label: "Infrastruktur", sectionId: "infrastruktur", needsLookups: true },
];

/** Ankeret en seksjon har på siden. Samme funksjon brukes der seksjonen rendres. */
export function sectionAnchor(id: string): string {
  return `om-${id}`;
}

export function buildAreaSummary({ stored, lookups, events, radius }: SummaryInput): SummaryItem[] {
  const items: SummaryItem[] = [];

  for (const tema of TEMA) {
    const href = `#${sectionAnchor(tema.id)}`;

    if (tema.id === "saker") {
      if (events === null) items.push({ id: tema.id, label: tema.label, text: null, href });
      else if (events.status === "ok" && events.dataUpdatedAt !== null) {
        if (events.events.length > 0) {
          const text = eventCountLabel(events.events, radius);
          items.push({ id: tema.id, label: tema.label, text, detail: `Siste ${DEFAULT_ANNOUNCED_WITHIN_MONTHS} måneder`, href });
        } else {
          const { headline, detail } = eventEmptyParts(radius);
          items.push({ id: tema.id, label: tema.label, text: headline, detail, href });
        }
      }
      continue;
    }

    const venter = stored === null || (tema.needsLookups && lookups === null);
    if (venter) {
      items.push({ id: tema.id, label: tema.label, text: null, href });
      continue;
    }
    // Svarte ikke en kilde seksjonen trenger, sier vi ingenting — seksjonen selv forklarer.
    if (tema.needsLookups && lookups === "failed") continue;
    const parts = [stored, ...(tema.needsLookups && lookups && lookups !== "failed" ? [lookups] : [])];
    if (parts.some((part) => part.status !== "ok")) continue;

    const group = assembleSection(parts, tema.sectionId, radius);
    const clusters = (group?.clusters ?? []).filter((c) => (tema.cluster ? c.id === tema.cluster : true));
    const text = clusters.map((c) => c.emptyNote?.text ?? c.summary).filter(Boolean).join(" · ");
    if (text) items.push({ id: tema.id, label: tema.label, text, href });
  }

  return items;
}
