import { DibkPlanningStartedProvider } from "./dibk/planning-started";
import type { DataProvider } from "./types";
import {
  dibkRegulationProposalProvider,
  dibkRegulationProvider,
  osloBuildingCaseProvider,
} from "./unavailable";

/**
 * Alle kjente providers. Ny kilde = ny klasse som implementerer DataProvider + én linje her
 * + en rad i providers-tabellen (seed i migrasjonen).
 */
export const providers: readonly DataProvider[] = [
  new DibkPlanningStartedProvider(),
  dibkRegulationProvider,
  dibkRegulationProposalProvider,
  osloBuildingCaseProvider,
];

export function getProvider(id: string): DataProvider | undefined {
  return providers.find((p) => p.id === id);
}
