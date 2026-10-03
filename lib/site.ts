/** Kontaktadressen som står i bunnteksten og på personvernsiden. */
export const KONTAKT_EPOST = "kontakt@naboradar.no";

/** Driftssidene er et internt verktøy og har ingen bunntekst. */
const UTEN_FOOTER = ["/admin", "/dev"];

export function footerVises(sti: string): boolean {
  return !UTEN_FOOTER.some((prefiks) => sti === prefiks || sti.startsWith(`${prefiks}/`));
}
