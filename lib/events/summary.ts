import { formatRadius } from "@/lib/format";
import { DEFAULT_ANNOUNCED_WITHIN_MONTHS } from "@/lib/geo/constants";

/**
 * «2 varslede planoppstarter innen 1 km». Er alle sakene planoppstarter — som i dag, med DiBK som
 * eneste kilde — sier linjen hva de er. Kommer det andre typer, faller den tilbake på «saker».
 */
export function eventCountLabel(events: readonly { type: string }[], radius: number): string {
  const n = events.length;
  if (n === 0) return "Ingen saker i området";
  const planoppstarter = events.every((e) => e.type === "planning_started");
  const ord = planoppstarter ? (n === 1 ? "varslet planoppstart" : "varslede planoppstarter") : n === 1 ? "sak" : "saker";
  return `${n} ${ord} innen ${formatRadius(radius)}`;
}

/**
 * Tomtilstanden. Sier nøyaktig hva som er kontrollert. «Ingen planer» ville vært feil: kilden har
 * bare varsler fra private forslagsstillere.
 */
export function eventEmptyLabel(radius: number): string {
  return `Ingen varslede planoppstarter fra private forslagsstillere innen ${formatRadius(radius)} siste ${DEFAULT_ANNOUNCED_WITHIN_MONTHS} måneder`;
}
