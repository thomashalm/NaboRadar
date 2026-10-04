import "server-only";
import { datasenterDataset } from "./datasenter";
import { forurensetGrunnDataset } from "./forurenset-grunn";
import { kraftnettDataset } from "./kraftnett";
import { kvikkleireDataset } from "./kvikkleire";
import { plansakerDataset } from "./plansaker";
import type { ExploreDataset } from "./types";

/**
 * Datasettene i Utforsk data.
 *
 * NYTT DATASETT: skriv en `ExploreDataset` (se types.ts) og legg den i listen under. Den trenger
 *   - `aliases`: ordene som velger datasettet i søket
 *   - `needsArea`: om datasettet er for stort til å vises for hele landet
 *   - `policy`: hvor datasettet kan vises utenfor admin (bare dokumentasjon, men obligatorisk)
 *   - `load`: henter objektene i et område og gjør dem til `ExploreFeature`
 * Lagres dataene i `area_features`, kan `load` bruke `explore_area_features` slik kvikkleire
 * gjør. Trenger objektene en ny farge, legges den til i lib/map/layers/explore.ts.
 * Siden, kartet, listen og detaljpanelet trenger ingen endring.
 */
export const EXPLORE_DATASETS: readonly ExploreDataset[] = [
  plansakerDataset,
  kvikkleireDataset,
  kraftnettDataset,
  forurensetGrunnDataset,
  datasenterDataset,
];

/** Høyst så mange datasett vises samtidig. Kontrollert research, ikke et GIS. */
export const MAX_LAG = 2;

export const datasetMedId = (id: string | undefined): ExploreDataset | null => EXPLORE_DATASETS.find((d) => d.id === id) ?? null;
