/**
 * Adressen til et søk i Utforsk data. Tilstanden ligger i URL-en, så et søk kan bokmerkes:
 * `q` (datasett og sted), `kommune` (valg ved flertydig sted), `utsnitt`, `lag` (det andre laget) og `analyse` («overlapp» når hovedlaget er filtrert mot det andre).
 */
export function utforskHref(input: { q: string; kommune?: string; utsnitt?: string; lag?: string; analyse?: string }): string {
  const params = new URLSearchParams({ q: input.q });
  if (input.kommune) params.set("kommune", input.kommune);
  if (input.utsnitt) params.set("utsnitt", input.utsnitt);
  if (input.lag) params.set("lag", input.lag);
  if (input.lag && input.analyse) params.set("analyse", input.analyse);
  return `/admin/research/utforsk?${params.toString()}`;
}
