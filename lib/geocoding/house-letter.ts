/**
 * Husnummer og husbokstav skrives både «10 D» og «10D». Registeret har «10D».
 *
 * Kartverkets adressesøk tåler mellomrommet når bokstaven står sist («Kanebogåsen 10 D»), men gir
 * null treff når bokstaven følges av komma: «Kanebogåsen 10 D, 9411 Harstad». Det er formen en
 * adresse har når den kommer utenfra — fra en annonse, en lenke, et utklipp.
 *
 * Bare det plausible mønsteret slås sammen: et husnummer, mellomrom og én enkelt bokstav som
 * avslutter gatedelen — fulgt av komma, postnummer eller slutten av teksten. Alle andre mellomrom
 * står urørt. «Storgata 5 i Oslo» er ikke en husbokstav.
 */
const HOUSE_LETTER = /(\d{1,4})\s+([A-Za-zÆØÅæøå])(?=\s*,|\s+\d{4}(?:\s|$)|\s*$)/g;

export function joinHouseLetter(value: string): string {
  return value.replace(HOUSE_LETTER, "$1$2");
}
