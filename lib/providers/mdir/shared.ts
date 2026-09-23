import { z } from "zod";
import type { AreaGeometry } from "@/types/area-feature";

/** GeoJSON-geometri slik ArcGIS leverer den (f=geojson). Validerer bare struktur, ikke innhold. */
export const geometrySchema = z
  .object({
    type: z.enum(["Point", "Polygon", "MultiPolygon", "LineString", "MultiLineString"]),
    coordinates: z.array(z.unknown()).min(1),
  })
  .transform((g) => g as unknown as AreaGeometry);
