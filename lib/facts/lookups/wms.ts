import { fetchGml } from "@/lib/providers/gml";
import type { HttpRetryPolicy } from "@/lib/sync/types";

/**
 * Punktoppslag mot en WMS med `GetFeatureInfo` — den samme spørringen etatenes egne
 * publikumskart gjør når man klikker i kartet (se ADR 015).
 *
 * TRE FELLER SOM ER HÅNDTERT HER, ETT STED:
 *
 * 1. Akserekkefølge. I WMS 1.3.0 er EPSG:4326 lat,lon, mens CRS:84 er lon,lat. Tjenestene støtter
 *    ikke det samme: stormflo tar CRS:84, Avinors flystøy bare EPSG:4326. Rekkefølgen bygges derfor
 *    eksplisitt per CRS, og testes.
 *
 * 2. Målestokk. Lag med `MaxScaleDenominator` svarer TOMT når forespørselen er i for grov
 *    målestokk — også der punktet ligger midt i en flate. Utsnittet er derfor ±0,00005° på 3×3
 *    piksler (målestokk ca. 1:7 000–1:14 000 i Norge), godt innenfor stormflolagenes 1:80 000.
 *
 * 3. Tomt svar er ikke det samme som feil. Bare et gyldig `msGMLOutput`-dokument kan bety «ingen
 *    treff». En `ServiceExceptionReport` (f.eks. et lag som har fått nytt navn), en HTML-feilside,
 *    en HTTP-feil eller et tidsavbrudd kastes, og blir «kilden svarte ikke» — aldri fravær.
 */

export type WmsCrs = "CRS:84" | "EPSG:4326";

/** Halv bredde på utsnittet rundt punktet, i grader. Se punkt 2 over. */
export const WMS_PUNKT_DELTA = 0.00005;
export const WMS_PUNKT_PIKSLER = 3;

export interface WmsPunktoppslag {
  url: string;
  layers: readonly string[];
  crs: WmsCrs;
  lat: number;
  lng: number;
  retry: HttpRetryPolicy;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/** BBOX i riktig akserekkefølge for CRS-et. */
export function wmsBbox(crs: WmsCrs, lat: number, lng: number, d = WMS_PUNKT_DELTA): string {
  return crs === "CRS:84"
    ? `${lng - d},${lat - d},${lng + d},${lat + d}`
    : `${lat - d},${lng - d},${lat + d},${lng + d}`;
}

export function wmsPunktUrl(q: Omit<WmsPunktoppslag, "retry" | "signal" | "fetchImpl">): string {
  const lag = q.layers.join(",");
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetFeatureInfo",
    LAYERS: lag,
    QUERY_LAYERS: lag,
    STYLES: "",
    CRS: q.crs,
    BBOX: wmsBbox(q.crs, q.lat, q.lng),
    WIDTH: String(WMS_PUNKT_PIKSLER),
    HEIGHT: String(WMS_PUNKT_PIKSLER),
    I: "1",
    J: "1",
    INFO_FORMAT: "application/vnd.ogc.gml",
    FEATURE_COUNT: "10",
  });
  return `${q.url}?${params.toString()}`;
}

/** Feltene i ett treff, med kildens egne navn. */
export type WmsFelt = Record<string, string>;

/**
 * Leser et MapServer-GML-svar: `<lag_layer><lag_feature>…</lag_feature></lag_layer>`. Lag uten
 * treff er ikke med i svaret. Kaster når svaret ikke er et gyldig `msGMLOutput`.
 */
export function lesWmsGml(xml: string): Map<string, WmsFelt[]> {
  if (/<ServiceExceptionReport\b/.test(xml)) {
    const melding = /<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/.exec(xml)?.[1]?.trim() ?? "ukjent";
    throw new Error(`WMS-feil: ${melding.slice(0, 160)}`);
  }
  if (!/<msGMLOutput\b[\s\S]*<\/msGMLOutput>|<msGMLOutput\b[^>]*\/>/.test(xml)) {
    throw new Error("WMS svarte ikke med GML");
  }
  const lag = new Map<string, WmsFelt[]>();
  for (const [, navn, innhold] of xml.matchAll(/<(\w+)_layer>([\s\S]*?)<\/\1_layer>/g)) {
    const treff: WmsFelt[] = [];
    for (const [, kropp] of innhold!.matchAll(/<\w+_feature>([\s\S]*?)<\/\w+_feature>/g)) {
      const felt: WmsFelt = {};
      for (const [, nøkkel, verdi] of kropp!.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) felt[nøkkel!] = verdi!.trim();
      treff.push(felt);
    }
    if (treff.length > 0) lag.set(navn!, treff);
  }
  return lag;
}

export async function wmsPunktoppslag(q: WmsPunktoppslag): Promise<Map<string, WmsFelt[]>> {
  const xml = await fetchGml(wmsPunktUrl(q), { retry: q.retry, signal: q.signal, fetchImpl: q.fetchImpl });
  return lesWmsGml(xml);
}
