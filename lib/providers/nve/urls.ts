import { toSafeHttpUrl } from "@/lib/url";

/** NVE-verter vi aksepterer rapportlenker fra. */
const NVE_HOSTS = ["nve.no", "www.nve.no", "publikasjoner.nve.no", "veileder.nve.no", "veiledere.nve.no"];

/**
 * NVEs `rapporturl` mangler ofte protokoll («www.nve.no/…»).
 * Vi legger på https:// KUN når protokollen mangler OG verten er en kjent NVE-vert. Dette er en
 * eksplisitt, kildespesifikk regel, ikke generell URL-reparasjon (lib/url.ts er fortsatt streng).
 * En eksplisitt http-lenke skrives ikke om til https, den avvises.
 */
export function toVerifiedNveUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = toSafeHttpUrl(candidate);
  if (!url) return null;

  const { protocol, hostname } = new URL(url);
  if (protocol !== "https:") return null;
  return NVE_HOSTS.includes(hostname) ? url : null;
}
