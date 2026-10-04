/**
 * Filtrene på research-oversikten, delt i de som alltid står framme og de som ligger bak
 * «Flere filtre».
 *
 * Oppdelingen er bare visning. Alle filtrene er vanlige URL-parametre og virker likt uansett
 * hvor de står — en lagret lenke med `?status=…` gir samme treff som før.
 */
export const STANDARDFILTRE = ["kommune", "kategori"] as const;
export const AVANSERTE_FILTRE = ["type", "status", "drift", "folsomhet", "sikkerhet", "interesse"] as const;

/** Hvor mange av filtrene bak «Flere filtre» som er i bruk. */
export function antallAvanserte(valgt: Record<string, string | undefined>): number {
  return AVANSERTE_FILTRE.filter((navn) => !!valgt[navn]).length;
}

/** «Flere filtre» eller «Flere filtre (2)». */
export function flereFiltreLabel(antall: number): string {
  return antall > 0 ? `Flere filtre (${antall})` : "Flere filtre";
}
