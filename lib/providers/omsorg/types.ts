/**
 * Kurert liste over omsorgstilbud. Fila i data/omsorgstilbud.json er bygget av
 * scripts/build-omsorg.ts og lest inn av provideren — ingen koordinater i UI-kode.
 *
 * Presis type lagres internt for kvalitetssikring og filtrering, men brukeren ser bare
 * «Omsorgstilbud». Vi kartlegger stedet, aldri menneskene som bruker det.
 */

/** Intern type. Vises aldri som hovedetikett i kart eller liste. */
export type OmsorgType =
  | "sykehjem"
  | "helsehus"
  | "dagsenter"
  | "omsorgssenter"
  | "rusbehandling"
  | "psykisk_helse"
  | "barnevern"
  | "akuttinstitusjon"
  | "behandling"
  | "annet";

export interface KuratertOmsorgstilbud {
  id: string;
  navn: string;
  internalType: OmsorgType;
  adresse: string;
  postnr: string | null;
  poststed: string | null;
  kommune: string | null;
  lng: number;
  lat: number;
  /** Hvem som driver stedet, når kilden oppgir det. Aldri en privatperson. */
  operator: string | null;
  status: "i drift" | "nedlagt" | "skjult";
  /** Den ansvarlige aktøren som publiserer stedet. */
  kilde: string;
  /** Siden hos den ansvarlige aktøren der stedet og adressen står. */
  kildeUrl: string;
  kildeType: "kommune" | "helsemyndighet" | "statlig_etat" | "institusjon";
  /** Hvor koordinaten kommer fra: kilden selv, eller Kartverkets adressepunkt. */
  koordinatKilde: "kilde" | "kartverket";
  verifisert: string;
}

export interface OmsorgDatasett {
  verifisert: string;
  kilder: { navn: string; url: string }[];
  steder: KuratertOmsorgstilbud[];
}
