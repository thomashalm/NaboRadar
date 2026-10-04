import type { ExploreDataset } from "./types";

/**
 * Tolker søket i Utforsk data: «kvikkleire Oslo» → datasettet kvikkleire, stedet «Oslo».
 *
 * Deterministisk og eksplisitt, uten AI: datasettet velges av en liste med ord (aliases i
 * registeret), og resten av søket er stedet. Stedet slås opp i Kartverkets kommuneregister.
 * Et sted som ikke finnes der, er ukjent — vi gjetter ikke på nærmeste treff.
 */

export interface Sted {
  kind: "kommune" | "fylke";
  /** Kommunenummer (fire siffer) eller fylkesnummer (to siffer). */
  number: string;
  name: string;
  county: string;
}

export type StedTolkning =
  | { status: "ingen" }
  | { status: "ok"; sted: Sted }
  /** Flere kommuner heter det samme (Herøy, Våler). Brukeren må velge. */
  | { status: "flertydig"; tekst: string; valg: Sted[] }
  | { status: "ukjent"; tekst: string };

export interface Tolkning {
  dataset: ExploreDataset | null;
  /** Det som sto igjen etter datasettordet. */
  stedTekst: string;
  sted: StedTolkning;
}

/** Små bokstaver, uten tegnsetting og doble mellomrom. Æ, ø og å beholdes. */
export const normaliser = (tekst: string): string =>
  tekst
    .toLowerCase()
    .replace(/[.,;:!?"'()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Småord mellom datasett og sted: «kvikkleire i Oslo», «datasenter, Bærum kommune». */
const FYLLORD = /^(i|på|ved|for|kommune|fylke)\s+|\s+(kommune|fylke)$/g;

export function tolkSok(
  sok: string,
  datasets: readonly ExploreDataset[],
  kommuner: ReadonlyMap<string, { name: string; county: string }>,
  /** Valgt kommunenummer når søket var flertydig. */
  valgtNummer?: string,
): Tolkning {
  const tekst = normaliser(sok);
  if (!tekst) return { dataset: null, stedTekst: "", sted: { status: "ingen" } };

  // Lengste alias først, så «data center» vinner over et kortere ord som deler starten.
  let dataset: ExploreDataset | null = null;
  let rest = tekst;
  const kandidater = datasets.flatMap((d) => d.aliases.map((alias) => ({ d, alias }))).sort((a, b) => b.alias.length - a.alias.length);
  for (const { d, alias } of kandidater) {
    const treff = new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).exec(tekst);
    if (!treff) continue;
    dataset = d;
    rest = `${tekst.slice(0, treff.index)} ${tekst.slice(treff.index + treff[0].length)}`.replace(/\s+/g, " ").trim();
    break;
  }

  let stedTekst = rest;
  for (let forrige = ""; forrige !== stedTekst; ) {
    forrige = stedTekst;
    stedTekst = stedTekst.replace(FYLLORD, "").trim();
  }
  if (!stedTekst) return { dataset, stedTekst: "", sted: { status: "ingen" } };

  return { dataset, stedTekst, sted: tolkSted(stedTekst, kommuner, valgtNummer) };
}

/** Sammenligningsform for stedsnavn: «Bærum», «bærum» og «Baerum» er ikke det samme — bare store/små bokstaver jevnes ut. */
const navn = (tekst: string) => tekst.toLowerCase().trim();

export function tolkSted(
  tekst: string,
  kommuner: ReadonlyMap<string, { name: string; county: string }>,
  valgtNummer?: string,
): StedTolkning {
  const sokt = navn(tekst);
  // Samiske og kvenske parallellnavn står som «Trøndelag - Trööndelage». Hver del er et gyldig navn.
  const deler = (fullt: string) => fullt.split(" - ").map(navn);

  const treff: Sted[] = [];
  for (const [number, info] of kommuner) {
    if (deler(info.name).includes(sokt)) treff.push({ kind: "kommune", number, name: info.name, county: info.county });
  }
  if (treff.length === 1) return { status: "ok", sted: treff[0]! };
  if (treff.length > 1) {
    const valgt = treff.find((s) => s.number === valgtNummer);
    return valgt ? { status: "ok", sted: valgt } : { status: "flertydig", tekst, valg: treff };
  }

  // Fylke. Fylkesnummeret er de to første sifrene i kommunenumrene.
  for (const [number, info] of kommuner) {
    if (deler(info.county).includes(sokt)) {
      return { status: "ok", sted: { kind: "fylke", number: number.slice(0, 2), name: info.county, county: info.county } };
    }
  }
  return { status: "ukjent", tekst };
}
