/** Lenke til hyttekartet, sentrert på et punkt og eventuelt med én hytte valgt. */
export function buildHutMapHref(params: { lat: number; lng: number; hutId?: string }): string {
  const query = new URLSearchParams({ lat: params.lat.toFixed(5), lng: params.lng.toFixed(5) });
  if (params.hutId) query.set("hytte", params.hutId);
  return `/hytter?${query.toString()}`;
}

/** Navnet slik det står i adressen. Bare pynt: oppslaget skjer på ID-en. */
export function hutSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/æ/g, "ae")
      .replace(/ø/g, "o")
      .replace(/å/g, "a")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "hytte"
  );
}

/**
 * Fast adresse for én hytte: /hytter/kobberhaughytta-3f2a9c1e.
 *
 * De åtte siste tegnene er starten på hyttas uuid, som aldri endres. Navnet foran kan endres
 * uten at lenken brekker — en gammel lenke med gammelt navn treffer fortsatt samme hytte.
 */
export function buildHutHref(hut: { id: string; name: string }): string {
  return `/hytter/${hutSlug(hut.name)}-${hut.id.slice(0, 8)}`;
}

/** ID-delen av en hytteadresse, eller null når adressen ikke har en. */
export function hutRefFromSlug(slug: string): string | null {
  return /(?:^|-)([0-9a-f]{8})$/.exec(slug)?.[1] ?? null;
}
