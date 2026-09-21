import "server-only";
import { KartverketGeocodingProvider } from "./kartverket/provider";

/** Én instans per serverprosess, slik at in-memory-cachen deles mellom forespørsler. */
export const geocoder = new KartverketGeocodingProvider();

/** Minste søkelengde. Kortere søk gir tusenvis av treff og mye unødvendig trafikk. */
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;
