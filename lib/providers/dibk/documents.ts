/**
 * Dokumenttyper fra DiBK plandokument som NaboRadar har lov til å hente og vise.
 *
 * Allowlist, ikke denylist: nye/ukjente typer blokkeres til noen har vurdert dem. Kilden har også
 * «Annet», «Planprogram», kart i SOSI/GML og sammensatte typer («Annet,Planinitiativ»); de er ikke
 * vurdert og hentes ikke.
 * Dokumenter hentes med server-side filter per type (`?dokumenttype=…`), slik at
 * poster som `beroerteParter.json` (berørte parter, dokumenttype = null) aldri forespørres.
 * isAllowedDocument() er et ekstra forsvarslag, og databasen har en CHECK-constraint i tillegg.
 */
export const DIBK_ALLOWED_DOCUMENT_TYPES = [
  "ref-data-as-pdf", // «Varsel om oppstart av planarbeid.pdf»
  "PlanomraadePdf", // kart over planavgrensning
  "ReferatOppstartsmoete", // referat fra oppstartsmøte
  // Lagt til 2026-10-03 (Planer og saker v2): dokumentene som sier hva saken gjelder. Begge er
  // offentlige saksdokumenter fra forslagsstiller, publisert av DiBK under samme lisens.
  "Planinitiativ", // forslagsstillers beskrivelse av formål, bebyggelse og virkninger
  "Planvarsel", // varselet om oppstart, som brev eller utfylt skjema
] as const;

export type DibkAllowedDocumentType = (typeof DIBK_ALLOWED_DOCUMENT_TYPES)[number];

const AFFECTED_PARTIES_PATTERN = /beroert|berørt|berort/i;

export function isAllowedDocument(doc: {
  dokumenttype: string | null;
  mimeType: string | null;
  tittel: string;
}): doc is { dokumenttype: DibkAllowedDocumentType; mimeType: string | null; tittel: string } {
  if (doc.dokumenttype === null) return false;
  if (!(DIBK_ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(doc.dokumenttype)) return false;
  if (AFFECTED_PARTIES_PATTERN.test(doc.tittel)) return false;
  if (doc.mimeType === "application/json") return false;
  return true;
}
