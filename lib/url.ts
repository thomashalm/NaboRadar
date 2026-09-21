/**
 * Returnerer URL-en kun hvis den er en fullstendig http(s)-URL.
 * Vi legger aldri til protokoll eller reparerer fritekst («www.oslo.kommune.no/saksinnsyn.»).
 */
export function toSafeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
