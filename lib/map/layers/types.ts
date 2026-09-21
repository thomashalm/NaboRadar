import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * Et datalag i kartet (radius, planområder — senere byggesaker, eiendommer, veiarbeid …).
 * AreaMap kjenner ikke til innholdet; den monterer lag, sender data og videreformidler klikk.
 * Nytt lag = ny MapLayer-implementasjon, ingen endring i kartkomponenten.
 */
export interface MapLayer<TData> {
  readonly id: string;
  /** Legger til kilder og MapLibre-lag. Kalles én gang etter at stilen er lastet. */
  mount(map: MapLibreMap, data: TData): void;
  /** Oppdaterer data uten å fjerne lagene. */
  update(map: MapLibreMap, data: TData): void;
  /** MapLibre-lag som kan klikkes. Klikk gir featureId via `idFromFeature`. */
  readonly interactiveLayerIds?: readonly string[];
  idFromFeature?(properties: Record<string, unknown>): string | null;
  /** Markér valgt objekt. `previousId` er forrige valgte (kartet holder tilstanden, ikke laget). */
  setSelected?(map: MapLibreMap, id: string | null, previousId: string | null): void;
}

/** Et lag sammen med dataene det skal vise. */
export interface LayerBinding<TData = unknown> {
  layer: MapLayer<TData>;
  data: TData;
}

export function bindLayer<TData>(layer: MapLayer<TData>, data: TData): LayerBinding<TData> {
  return { layer, data };
}
