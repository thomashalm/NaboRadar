/**
 * Bakgrunnskart konfigureres via miljøvariabler, slik at kilden kan byttes
 * (Kartverket innfører nye topografiske bakgrunnskart i 2026) uten kodeendring.
 * UI-kode skal kun lese kartkilde herfra.
 */
export interface MapTileConfig {
  /** XYZ-mal med {z}/{x}/{y}. */
  tileUrl: string;
  attribution: string;
  tileSize: number;
  maxZoom: number;
}

const DEFAULT_TILE_URL =
  "https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png";
const DEFAULT_ATTRIBUTION = "© Kartverket";

export function getMapTileConfig(): MapTileConfig {
  return {
    tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL,
    attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || DEFAULT_ATTRIBUTION,
    tileSize: 256,
    maxZoom: 18,
  };
}
