/**
 * Eksempelsøkene i tomtilstanden til Utforsk data. De er vanlige søk — et trykk gjør det samme
 * som å skrive teksten — og testes mot registeret, så et eksempel aldri peker på et datasett
 * eller et sted som ikke finnes.
 */
export const EKSEMPELSOK: readonly string[] = ["Planer Oslo", "Kvikkleire Trondheim", "Kraftnett Bærum", "Datasenter"];

/** Én kombinasjon, for å vise at to lag går an. Aktiveres med vanlige lenker, ikke med syntaks. */
export const EKSEMPELKOMBINASJON = { tekst: "Planer + kvikkleire", q: "Planer Trondheim", lag: "kvikkleire" } as const;
