export const DIBK_PLANNING_STARTED_BASE_URL =
  "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt";

/** Maks side-størrelse API-et respekterer (høyere verdier kappes stille). */
export const DIBK_PAGE_LIMIT = 500;

/** Stabil, verifisert (HTTP 200) HTML-side for en arealplan hos DiBK. */
export function dibkArealplanPageUrl(arealplan: number): string {
  return `${DIBK_PLANNING_STARTED_BASE_URL}/collections/arealplan/items/${arealplan}?f=html`;
}
