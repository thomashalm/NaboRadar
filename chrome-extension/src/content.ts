import type { ExtractedAddress } from "./address";
import { extractFinnAddress } from "./extractors/finn";

/**
 * Settes inn i fanen først når brukeren trykker på utvidelsen (activeTab). Skriptet leser siden
 * som allerede er åpen, og gjør ingen nettverkskall, lagrer ingenting og endrer ikke siden.
 */
declare global {
  var __naboradarExtract: (() => ExtractedAddress) | undefined;
}

globalThis.__naboradarExtract = () => extractFinnAddress(document, location.href);
