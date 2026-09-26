import {
  CATEGORY_SHORT,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  VERIFICATION_LABEL,
  type NearbyResearch,
} from "./research-types";
import { formatDistance } from "@/lib/format";
import type { InternalMapFeature } from "@/lib/map/layers/internal-findings";

/**
 * Et research-funn som kartobjekt.
 *
 * Popup-teksten formuleres her og sendes ferdig inn i kartet, av samme grunn som ellers i
 * prosjektet: kartet skal aldri sette sammen tekst selv. Ren funksjon, så den kan testes uten
 * kart og uten database.
 *
 * Alle funn fra `research_near` har koordinat — funksjonen filtrerer bort dem uten. Sjekken
 * gjentas her fordi typen tillater null, og et punkt uten koordinat ville blitt tegnet i
 * Atlanterhavet i stedet for å bli utelatt.
 */

/** Zoomnivå der en adresse er tydelig: enkelttomter er lesbare, og nabolaget er med. */
export const RESEARCH_FOCUS_ZOOM = 16;

export function internalFeatureFra(funn: NearbyResearch): InternalMapFeature | null {
  if (funn.latitude === null || funn.longitude === null) return null;
  return {
    id: funn.id,
    title: funn.title,
    center: [funn.longitude, funn.latitude],
    lines: [
      funn.address ?? "Uten adresse",
      // formatDistance sier «30 m unna» selv, så avstanden trenger ingen ekstra innpakning.
      `${CATEGORY_SHORT[funn.category] ?? funn.category} · ${formatDistance(funn.distance_m)}`,
      `${VERIFICATION_LABEL[funn.verification_status]} · ${OPERATIONAL_LABEL[funn.operational_status]}`,
      `${LEVEL_LABEL[funn.confidence].toUpperCase()} SIKKERHET · INTERN`,
    ],
    href: `/admin/research/${funn.id}`,
    linkLabel: "Åpne funnet",
  };
}

/** Kartobjektene for en liste funn. Funn uten koordinat faller ut i stedet for å feile. */
export function internalFeatures(funn: readonly NearbyResearch[]): InternalMapFeature[] {
  return funn.flatMap((f) => {
    const feature = internalFeatureFra(f);
    return feature ? [feature] : [];
  });
}
