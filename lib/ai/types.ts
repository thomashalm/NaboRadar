/**
 * AI-forklaring («Hva betyr dette?»). Ikke implementert i MVP; produktet fungerer uten.
 *
 * - Genereres on-demand når en bruker ber om det, aldri automatisk for alle events.
 * - Input: normalisert event + metadata for tillatte dokumenter. Aldri rawData ukritisk,
 *   aldri berørte parter.
 * - Caches per (eventId, contentHash): ny kildeversjon gir nytt sammendrag.
 * - Vises alltid tydelig merket som AI-generert, adskilt fra offentlige kildedata.
 */
export interface EventSummary {
  summary: string;
  whatIsHappening: string;
  importantDates: { date: string; label: string }[];
  /** Forsiktig formulert. Ingen påstander om boligverdi, utsikt, juss eller oppfordring til klage. */
  potentialRelevance: string;
}

export interface SummaryCacheKey {
  eventId: string;
  /** events.content_hash på tidspunktet sammendraget ble laget. */
  sourceVersion: string;
}
