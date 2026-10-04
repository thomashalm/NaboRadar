import "server-only";
import { datasenterDataset } from "./datasenter";
import { kvikkleireDataset } from "./kvikkleire";
import type { ExploreDataset } from "./types";

/**
 * Datasettene i Utforsk data.
 *
 * NYTT DATASETT: skriv en `ExploreDataset` (se types.ts) og legg den i listen under. Den trenger
 *   - `aliases`: ordene som velger datasettet i søket
 *   - `needsArea`: om datasettet er for stort til å vises for hele landet
 *   - `load`: henter objektene i et område og gjør dem til `ExploreFeature`
 * Lagres dataene i `area_features`, kan `load` bruke `explore_area_features` slik kvikkleire
 * gjør. Trenger objektene en ny farge, legges den til i lib/map/layers/explore.ts.
 * Siden, kartet, listen og detaljpanelet trenger ingen endring.
 */
export const EXPLORE_DATASETS: readonly ExploreDataset[] = [kvikkleireDataset, datasenterDataset];
