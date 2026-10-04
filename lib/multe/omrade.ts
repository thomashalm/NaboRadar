/**
 * Multefunn og myr: internt researchlag i admin (Utforsk data). Aldri offentlig.
 *
 * Bakgrunn og målinger: docs/research/multer-oslo.md. Konklusjonen der er at en habitatscore i
 * praksis blir et myrkart, så vi lagrer dataene — registrerte funn og åpne myrflater — og lar
 * kartet vise dem. Ingen score, ingen sannsynlighet.
 */

/** Dekningsområdet: boksen rundt Oslo og Marka som researchen brukte. Ikke nasjonalt. */
export const MULTE_BOKS = { minLng: 10.3, minLat: 59.78, maxLng: 11.1, maxLat: 60.3 } as const;
export const MULTE_DEKNING = "Oslo og Marka";

/** Upublisert kategori i area_feature_categories. Lese-RPC-ene for publikum gir den aldri. */
export const NATUR_INTERN = "natur_intern" as const;

export const MULTEFUNN_PROVIDER = "gbif-multefunn-oslomarka";
export const MYR_PROVIDER = "kartverket-n50-myr-oslomarka";
/** Tyttebær: samme område og samme utvalgsregler som multe. Se docs/research/tyttebaer-oslo.md. */
export const TYTTEBAERFUNN_PROVIDER = "gbif-tyttebaerfunn-oslomarka";

export const iBoksen = ([lng, lat]: readonly [number, number]) =>
  lng >= MULTE_BOKS.minLng && lng <= MULTE_BOKS.maxLng && lat >= MULTE_BOKS.minLat && lat <= MULTE_BOKS.maxLat;

/**
 * Kommunene som berører boksen (kommunenummer fra 2024). N50 leveres per kommune; flater med
 * tyngdepunkt utenfor boksen tas ikke inn.
 */
export const MYR_KOMMUNER: readonly string[] = [
  "0301", // Oslo
  "3201", // Bærum
  "3203", // Asker
  "3205", // Lillestrøm
  "3207", // Nordre Follo
  "3209", // Ullensaker
  "3212", // Nesodden
  "3214", // Frogn
  "3218", // Ås
  "3220", // Enebakk
  "3222", // Lørenskog
  "3224", // Rælingen
  "3230", // Gjerdrum
  "3232", // Nittedal
  "3234", // Lunner
  "3236", // Jevnaker
  "3238", // Nannestad
  "3305", // Ringerike
  "3310", // Hole
  "3312", // Lier
  "3446", // Gran
];
