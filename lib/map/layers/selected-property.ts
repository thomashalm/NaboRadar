import type { GeoJSONSource } from "maplibre-gl";
import type { AreaGeometry } from "@/types/area-feature";
import type { MapLayer } from "./types";

export const PROPERTY_COLOR = "#15171b";

const SOURCE = "selected-property";

export interface SelectedPropertyData {
  geometry: AreaGeometry | null;
}

/**
 * Valgt eiendomsteig. Tegnes øverst, men med lav fyllopasitet: grensen skal være tydelig
 * uten å skjule planområder, forurensningsflater eller markører under.
 */
export const selectedPropertyLayer: MapLayer<SelectedPropertyData> = {
  id: "selected-property",

  mount(map, data) {
    map.addSource(SOURCE, { type: "geojson", data: collection(data) });
    map.addLayer({
      id: "selected-property-fill",
      type: "fill",
      source: SOURCE,
      paint: { "fill-color": PROPERTY_COLOR, "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: "selected-property-line",
      type: "line",
      source: SOURCE,
      paint: { "line-color": PROPERTY_COLOR, "line-width": 3, "line-opacity": 0.9 },
    });
    // Tynn, lys linje under for kontrast mot mørke flater i bakgrunnskartet.
    map.addLayer(
      {
        id: "selected-property-halo",
        type: "line",
        source: SOURCE,
        paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.7 },
      },
      "selected-property-line",
    );
  },

  update(map, data) {
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(collection(data));
  },
};

function collection(data: SelectedPropertyData) {
  return {
    type: "FeatureCollection" as const,
    features: data.geometry ? [{ type: "Feature" as const, properties: {}, geometry: data.geometry }] : [],
  };
}
