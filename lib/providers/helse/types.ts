/**
 * Kurert sykehusliste. Fila i data/sykehus.json er bygget av scripts/build-sykehus.ts og
 * lest inn av provideren — ingen koordinater i UI-kode, og hver rad bærer sin egen
 * verifisering. Et sted som legges ned settes til «nedlagt» i stedet for å slettes, slik at
 * historikken består og listen ikke blir en evig sannhet.
 */
export interface KuratertSykehus {
  orgnr: string;
  navn: string;
  adresse: string;
  postnr: string;
  poststed: string | null;
  kommune: string | null;
  lng: number;
  lat: number;
  eierform: "offentlig" | "privat";
  helseregion: string | null;
  /** Næringskoden som ble bekreftet i Enhetsregisteret. */
  naeringskode: string;
  status: "i drift" | "nedlagt";
  /** Dato listen sist ble verifisert mot kildene (YYYY-MM-DD). */
  verifisert: string;
}

export interface SykehusDatasett {
  verifisert: string;
  kilder: { navn: string; url: string }[];
  steder: KuratertSykehus[];
}
