/**
 * Kildedokument knyttet til et event, f.eks. «Varsel om oppstart av planarbeid.pdf».
 * Vi lagrer kun metadata og lenke — aldri innholdet.
 */
export interface NormalizedDocument {
  /** Stabil ID i kilden. */
  externalId: string;
  /** Kildens egen dokumenttype. Må være på providerens allowlist. */
  type: string;
  title: string;
  url: string;
  mimeType: string | null;
  /** YYYY-MM-DD */
  documentDate: string | null;
}

export interface EventDocument extends NormalizedDocument {
  id: string;
  eventId: string;
}
