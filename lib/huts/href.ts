/** Lenke til hyttekartet, sentrert på et punkt og eventuelt med én hytte valgt. */
export function buildHutMapHref(params: { lat: number; lng: number; hutId?: string }): string {
  const query = new URLSearchParams({ lat: params.lat.toFixed(5), lng: params.lng.toFixed(5) });
  if (params.hutId) query.set("hytte", params.hutId);
  return `/hytter?${query.toString()}`;
}
